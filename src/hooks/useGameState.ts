import { useState, useCallback, useEffect, useRef } from 'react'; // useRef を追加
import { GameState, Direction, Robot, Position, Card, RobotColor, Board, GamePhase } from '../types/game'; // Board, GamePhase をインポート
import { generateBoardFromPattern } from '../utils/boardGenerator';
import { createCompositeBoardPattern } from '../utils/boardRotation';
import BoardLoader from '../utils/boardLoader';
import { CardDeck } from '../utils/cardGenerator';
import { calculatePath } from '../utils/robotMovement';
import { SYMBOL_MAP } from '../utils/constants'; // SYMBOL_MAP をインポート

// アニメーション中のロボット情報 (GamePage.tsx と同様の構造)
interface MovingRobotInfo {
  color: RobotColor; // アニメーション対象のロボットの色を追加
  path: Position[]; // 移動経路全体
  startTime: number;
  segmentDuration: number; // 1セグメントあたりのアニメーション時間 (ms)
  currentSegment: number; // 現在アニメーション中のセグメントインデックス (0から開始)
}

export const useGameState = (mode: 'single' | 'multi') => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const loader = BoardLoader.getInstance();
    const selectedBoards = loader.getRandomGameBoards();

    const compositeBoard = createCompositeBoardPattern(
      selectedBoards[0],
      selectedBoards[1],
      selectedBoards[2],
      selectedBoards[3]
    );

    const board = generateBoardFromPattern(compositeBoard);
    // 初期位置を保存
    board.robots = board.robots.map(robot => ({
      ...robot,
      initialPosition: { ...robot.position }
    }));

    return {
      board,
      phase: 'waiting',
      moveHistory: [],
      singlePlayer: {
        moveCount: 0,
        score: 0,
        completedCards: 0,
        declaredMoves: 0,
        maxDeclaredMoves: 0, // 初期値は0のまま
        timer: 60,
        isDeclarationPhase: false,
      }
    };
  });

  const [cardDeck, setCardDeck] = useState(() => new CardDeck(gameState.board));
  // アニメーション状態の型を変更
  const [movingRobots, setMovingRobots] = useState<Record<RobotColor, MovingRobotInfo | null>>({} as Record<RobotColor, MovingRobotInfo | null>);
  const [goalAchievedInAnimation, setGoalAchievedInAnimation] = useState(false); // アニメーション完了後のゴール状態
  const animationFrameRef = useRef<number | null>(null);
  const prevGameStateRef = useRef<GameState>(gameState); // 前回の gameState を保持

  // タイマーの制御
  useEffect(() => {
    let interval: number | undefined;

    if (gameState.singlePlayer.isDeclarationPhase &&
        gameState.singlePlayer.timer > 0 &&
        gameState.singlePlayer.declaredMoves > 0) { // declaredMoves > 0 の場合のみタイマー開始
      interval = window.setInterval(() => {
        setGameState(prev => {
          if (prev.singlePlayer.timer <= 1) {
            clearInterval(interval); // タイマー停止
            return {
              ...prev,
              phase: 'solution', // 正しいフェーズ名 'solution' に修正
              singlePlayer: {
                ...prev.singlePlayer,
                timer: 0,
                isDeclarationPhase: false,
                // maxDeclaredMoves は declareMoves で設定されるのでここでは不要
              }
            };
          }
          return {
            ...prev,
            singlePlayer: {
              ...prev.singlePlayer,
              timer: prev.singlePlayer.timer - 1
            }
          };
        });
      }, 1000);
    } else if (interval) {
      // declaredMoves が 0 になった場合などにタイマーをクリア
      clearInterval(interval);
    }

    return () => {
      if (interval !== undefined) {
        clearInterval(interval);
      }
    };
  }, [
    gameState.singlePlayer.isDeclarationPhase,
    gameState.singlePlayer.timer,
    gameState.singlePlayer.declaredMoves // declaredMoves も依存配列に追加
  ]);

  // requestAnimationFrame ベースのアニメーションループ (GamePage.tsx から移植・調整)
  useEffect(() => {
    const animate = (now: number) => {
      let activeAnimationsExist = false;
      let boardNeedsUpdate = false;
      const nextMovingRobotsState: Record<RobotColor, MovingRobotInfo | null> = {} as Record<RobotColor, MovingRobotInfo | null>; // キャストを追加
      const updatedRobotPositions: Partial<Record<RobotColor, Position>> = {};

      const currentBoard = gameState.board;

      for (const color in movingRobots) {
        const robotColor = color as RobotColor;
        const moveInfo = movingRobots[robotColor];

        if (!moveInfo) continue;

        activeAnimationsExist = true;

        const totalElapsedTime = now - moveInfo.startTime;
        const segmentElapsedTime = totalElapsedTime - (moveInfo.currentSegment * moveInfo.segmentDuration);
        const progress = Math.min(segmentElapsedTime / moveInfo.segmentDuration, 1);

        const startSegmentPos = moveInfo.path[moveInfo.currentSegment];
        const endSegmentPos = moveInfo.path[moveInfo.currentSegment + 1];

        const currentX = startSegmentPos.x + (endSegmentPos.x - startSegmentPos.x) * progress;
        const currentY = startSegmentPos.y + (endSegmentPos.y - startSegmentPos.y) * progress;

        updatedRobotPositions[robotColor] = { x: currentX, y: currentY };
        boardNeedsUpdate = true;

        if (progress >= 1) {
          const nextSegment = moveInfo.currentSegment + 1;
          if (nextSegment >= moveInfo.path.length - 1) {
            nextMovingRobotsState[robotColor] = null; // アニメーション完了
            updatedRobotPositions[robotColor] = moveInfo.path[moveInfo.path.length - 1]; // 最終位置に確定
            console.log(`[Animate SP] Robot ${robotColor} finished animation.`);
            // アニメーション完了時の処理は moveRobot で行うため、ここでは何もしない
          } else {
            nextMovingRobotsState[robotColor] = { ...moveInfo, currentSegment: nextSegment };
          }
        } else {
          nextMovingRobotsState[robotColor] = moveInfo;
        }
      }

      if (boardNeedsUpdate) {
        setGameState(prev => {
          const nextRobots = prev.board.robots.map(robot => {
            if (updatedRobotPositions[robot.color]) {
              if (robot.position.x !== updatedRobotPositions[robot.color]!.x || robot.position.y !== updatedRobotPositions[robot.color]!.y) {
                 return { ...robot, position: updatedRobotPositions[robot.color]! };
              }
            }
            return robot;
          });
           const boardActuallyChanged = prev.board.robots.some((r, i) => r !== nextRobots[i]);
           return boardActuallyChanged ? { ...prev, board: { ...prev.board, robots: nextRobots } } : prev;
        });
      }

       const finalNextMovingRobots = Object.entries(nextMovingRobotsState)
           .filter(([, info]) => info !== null)
           .reduce((acc, [key, info]) => {
               acc[key as RobotColor] = info;
               return acc;
           }, {} as Record<RobotColor, MovingRobotInfo | null>);

       if (JSON.stringify(movingRobots) !== JSON.stringify(finalNextMovingRobots)) {
          setMovingRobots(finalNextMovingRobots);
       }


      if (activeAnimationsExist && Object.keys(finalNextMovingRobots).length > 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
        // アニメーション完了後の状態リセットは moveRobot で行うため削除
        // if (goalAchievedInAnimation) { ... }
      }
    };

    const activeMovingRobots = Object.values(movingRobots).some(info => info !== null);
    if (activeMovingRobots) {
       if (!animationFrameRef.current) {
           animationFrameRef.current = requestAnimationFrame(animate);
       }
    } else if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [movingRobots, gameState.board]); // goalAchievedInAnimation を削除


  // 手数を宣言
  const declareMoves = useCallback((moves: number) => {
    setGameState(prev => {
      if (prev.phase !== 'declaration' || !prev.singlePlayer.isDeclarationPhase) return prev;
      return {
        ...prev,
        singlePlayer: {
          ...prev.singlePlayer,
          declaredMoves: moves,
          timer: 60, // タイマーリセットはしない方針
        }
      };
    });
  }, []);

  // ゴール判定
  const checkGoal = useCallback((robot: Robot): boolean => {
    if (!gameState.currentCard) return false;
    const cell = gameState.board.cells[robot.position.y][robot.position.x];
    console.log('[CheckGoal SP] Checking:', { // ログ有効化
      robotColor: robot.color, robotPos: robot.position,
      cardColor: gameState.currentCard.color, cardPos: gameState.currentCard.position,
      isTargetCell: cell.isTarget, cellSymbol: cell.targetSymbol, cardSymbol: gameState.currentCard.symbol
    });

    if (!cell.isTarget) {
      console.log('[CheckGoal SP] Not a target cell'); // ログ有効化
      return false;
    }

    // カードの位置と一致するかチェック
    if (robot.position.x !== gameState.currentCard.position.x ||
        robot.position.y !== gameState.currentCard.position.y) {
      console.log('[CheckGoal SP] Not at card position'); // ログ有効化
      return false;
    }

    // 色とシンボルが一致するかチェック (Vortex ('colors'/null) も考慮)
    const isCorrectColor = gameState.currentCard.color === null || robot.color === gameState.currentCard.color;
    // TargetSymbol は string 型なので直接比較
    const isCorrectSymbol = cell.targetSymbol === SYMBOL_MAP[gameState.currentCard.symbol]; // SYMBOL_MAP を使って比較

    console.log('[CheckGoal SP] Result:', { isCorrectColor, isCorrectSymbol }); // ログ有効化
    return isCorrectColor && isCorrectSymbol;
  }, [gameState.board, gameState.currentCard]);

  // 次のカードを引く
  const drawNextCard = useCallback(() => {
    const card = cardDeck.drawNext();
    if (card) {
      setGameState(prev => {
        const resetRobots = prev.board.robots.map(robot => ({
            ...robot,
            position: robot.initialPosition ? { ...robot.initialPosition } : robot.position
        }));
        return {
          ...prev,
          board: { ...prev.board, robots: resetRobots },
          currentCard: card,
          phase: 'declaration',
          moveHistory: [],
          singlePlayer: {
            ...prev.singlePlayer,
            moveCount: 0,
            declaredMoves: 0,
            maxDeclaredMoves: 0,
            timer: 60,
            isDeclarationPhase: true
          }
        };
      });
    } else {
      setGameState(prev => ({ ...prev, phase: 'finished' }));
    }
    return card;
  }, [cardDeck]);

  // ロボットを移動
  const moveRobot = useCallback((robotColor: RobotColor, direction: Direction) => {
    if (movingRobots[robotColor]) return; // アニメーション中は無視

    setGameState(prev => {
      if (prev.phase !== 'solution') return prev;

      const robot = prev.board.robots.find(r => r.color === robotColor);
      if (!robot) return prev;

      const path = calculatePath(prev.board, robot, direction);
      if (path.length <= 1) return prev; // 移動なし

      const finalPosition = path[path.length - 1];
      const newMoveCount = prev.singlePlayer.moveCount + 1;
      const movedRobot = { ...robot, position: finalPosition };
      const isGoal = checkGoal(movedRobot);
      const declaredMoves = prev.singlePlayer.declaredMoves;

      console.log('[MoveRobot SP]', {
          color: robotColor, from: robot.position, to: finalPosition,
          moves: newMoveCount, declared: declaredMoves, isGoal
      });

      // アニメーション開始
      setMovingRobots(prevMoving => ({
        ...prevMoving,
        [robotColor]: {
          color: robotColor,
          path: path,
          startTime: performance.now(),
          segmentDuration: 50,
          currentSegment: 0,
        }
      }));

      // 状態更新ロジック
      let nextPhase: GamePhase = prev.phase; // nextPhase の型を GamePhase と明示
      let nextScore = prev.singlePlayer.score;
      let nextCompletedCards = prev.singlePlayer.completedCards;
      let nextDeclaredMoves = declaredMoves;
      let nextMaxDeclaredMoves = prev.singlePlayer.maxDeclaredMoves;
      let nextIsDeclarationPhase = prev.singlePlayer.isDeclarationPhase;
      let nextMoveCount = newMoveCount;
      let resetBoard = false; // ボードリセットフラグ

      // 宣言手数がある場合のみ判定
      if (declaredMoves > 0) {
        if (isGoal && newMoveCount === declaredMoves) {
          // 宣言手数ぴったりでゴール！ -> 成功
          console.log('[MoveRobot SP] Goal Success!');
          nextScore += 1;
          nextCompletedCards += 1;
          nextPhase = 'waiting'; // 次のラウンドへ
          resetBoard = true;
        } else if ((!isGoal) && newMoveCount >= declaredMoves) {
          // 宣言手数に達したがゴールしていない、または宣言手数を超えた -> 失敗
          console.log('[MoveRobot SP] Failed (moves reached or exceeded without goal)');
          nextPhase = 'waiting'; // 次のラウンドへ
          resetBoard = true;
        }
        // 宣言手数内でゴールしたが手数が足りない場合は、まだ移動を続ける (phase は solution のまま)
      }

      // 状態を更新
      const nextSinglePlayerState = {
        ...prev.singlePlayer,
        score: nextScore,
        completedCards: nextCompletedCards,
        declaredMoves: resetBoard ? 0 : nextDeclaredMoves, // リセット時のみ0
        maxDeclaredMoves: resetBoard ? 0 : nextMaxDeclaredMoves,
        isDeclarationPhase: resetBoard ? false : nextIsDeclarationPhase,
        moveCount: resetBoard ? 0 : nextMoveCount, // リセット時のみ0
      };

      // ボードリセットが必要な場合はロボットを初期位置に戻す
      const nextRobots = resetBoard
        ? prev.board.robots.map(r => ({ ...r, position: r.initialPosition ?? r.position }))
        : prev.board.robots; // リセットしない場合はそのまま

      return {
        ...prev,
        phase: nextPhase,
        // アニメーション中のため、ボードのロボット位置はここでは更新しない
        // board: { ...prev.board, robots: nextRobots }, // ← アニメーション useEffect で更新
        moveHistory: [...prev.moveHistory, finalPosition], // 移動履歴は更新
        singlePlayer: nextSinglePlayerState,
      };
    });
  }, [checkGoal, movingRobots]); // movingRobots を依存配列に追加

  // gameState が変更されたときにログ出力 (デバッグ用)
  useEffect(() => {
    console.log('[GameState SP Updated]', gameState);
    prevGameStateRef.current = gameState;
  }, [gameState]);


  return {
    gameState,
    moveRobot,
    declareMoves,
    drawNextCard,
    remainingCards: cardDeck.getRemaining(),
    totalCards: cardDeck.getTotalCards(),
  };
};

export default useGameState;