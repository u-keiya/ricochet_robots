import { FC, useEffect, useState, useRef } from 'react'; // useState, useRefを追加
import { useParams, useNavigate } from 'react-router-dom';
import GameBoard from '../components/GameBoard/GameBoard';
import useGameStore from '../stores/gameStore'; // useGameStoreをインポート
import { DeclarationCardList } from '../components/DeclarationCard'; // DeclarationCardListをインポート
import GameResultDisplay from '../components/GameResultDisplay'; // GameResultDisplayをインポート
import { Player } from '../types/player'; // Player型をインポート
// Direction と Card['color'] (CardColorの代わり) をインポート
import { RobotColor, Position, GamePhase, Direction, Card, Board } from '../types/game'; // Board をインポート
import { calculatePath } from '../utils/robotMovement'; // calculatePathをインポート

// アニメーション中のロボット情報
interface MovingRobotInfo {
  startPos: Position;
  endPos: Position;
  startTime: number;
  duration: number; // アニメーション時間 (ms)
}
// --- ヘルパー関数 ---
const getPhaseText = (phase: GamePhase): string => {
  switch (phase) {
    case 'waiting': return '待機中';
    case 'declaration': return '宣言フェーズ';
    case 'solution': return '解法提示フェーズ';
    case 'finished': return 'ゲーム終了';
    default: return phase;
  }
};

const getTargetColorClass = (color: Card['color']): string => { // Card['color'] を使用
  switch (color) {
    case 'red': return 'text-red-600';
    case 'blue': return 'text-blue-600';
    case 'green': return 'text-green-600';
    case 'yellow': return 'text-yellow-600';
    case 'colors': return 'bg-gradient-to-r from-red-500 via-blue-500 to-green-500 text-transparent bg-clip-text'; // 仮の多色表示
    default: return 'text-gray-600';
  }
};
// --- ここまで ---


const GamePage: FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  // useGameStoreから必要な状態とアクションを取得
  const {
    game,
    generatedBoard, // generatedBoard を取得
    currentRoom,
    currentPlayer,
    startGame,
    declareMoves: storeDeclareMoves, // 名前衝突を避ける
    moveRobot: storeMoveRobot,       // 名前衝突を避ける
    drawCard, // drawCard アクションを取得
    leaveRoom,
    isConnected,
    isConnecting, // isConnecting を追加
    connectionError,
  } = useGameStore();

  // 表示用ボード状態とアニメーション状態
  const [displayedBoard, setDisplayedBoard] = useState<Board | null>(null);
  const [movingRobots, setMovingRobots] = useState<Record<RobotColor, MovingRobotInfo>>({} as Record<RobotColor, MovingRobotInfo>); // 型アサーションで初期化
  const prevGameRef = useRef(game); // 前回の game state を保持
  const animationFrameRef = useRef<number | null>(null); // 型を number | null に変更し、初期値を null に

  // roomIdがない、または接続エラーがあればオンラインページに戻る
  useEffect(() => {
    if (!isConnected || connectionError) {
      console.error('Not connected or connection error, navigating back.');
      navigate('/online');
    }
    // TODO: ルームが存在しない場合の処理 (currentRoomがnullになったら?)
  }, [isConnected, connectionError, navigate]);

  // generatedBoard が変更されたら displayedBoard を初期化
  useEffect(() => {
    if (generatedBoard) {
      setDisplayedBoard(generatedBoard);
    }
  }, [generatedBoard]);

  // game state (特に robotPositions) が変更されたらアニメーションを開始
  useEffect(() => {
    const prevGame = prevGameRef.current;
    // game または prevGame が null、または robotPositions がなければ何もしない
    if (!game || !prevGame || !game.robotPositions || !prevGame.robotPositions) {
      prevGameRef.current = game; // 現在の game state を保存
      // game が null でなく、displayedBoard がまだ設定されていない場合は初期設定
      if (game && !displayedBoard && generatedBoard) {
         setDisplayedBoard({
           ...generatedBoard,
           robots: generatedBoard.robots.map(robot => ({
             ...robot,
             position: game.robotPositions?.[robot.color] ?? robot.position,
           })),
         });
      }
      return;
    }

    const newMovingRobots: Record<RobotColor, MovingRobotInfo> = {} as Record<RobotColor, MovingRobotInfo>; // 型アサーションで初期化
    const animationDuration = 150; // アニメーション時間 (ms)
    let boardNeedsUpdate = false;

    // 各ロボットの位置変更をチェック
    for (const color in game.robotPositions) {
      const robotColor = color as RobotColor;
      const currentPos = game.robotPositions[robotColor];
      const prevPos = prevGame.robotPositions?.[robotColor];

      // 位置が変更されているか、または displayedBoard の位置と異なる場合
      if (prevPos && (currentPos.x !== prevPos.x || currentPos.y !== prevPos.y)) {
         // displayedBoard の現在の表示位置を取得
         const displayedRobot = displayedBoard?.robots.find(r => r.color === robotColor);
         const startPos = displayedRobot?.position ?? prevPos; // 表示中の位置を開始点に

        // すでにアニメーション中なら、それをキャンセルして新しいアニメーションを開始
        // (サーバーからの更新が連続した場合に対応)
        newMovingRobots[robotColor] = {
          startPos: startPos,
          endPos: currentPos,
          startTime: performance.now(),
          duration: animationDuration,
        };
        boardNeedsUpdate = true;
      }
    }

    if (boardNeedsUpdate) {
      setMovingRobots(prev => ({ ...prev, ...newMovingRobots }));
    }

    // 現在の game state を次回の比較用に保存
    prevGameRef.current = game;

  }, [game, generatedBoard, displayedBoard]); // displayedBoard も依存配列に追加


  // アニメーションループ
  useEffect(() => {
    const animate = (now: number) => {
      let activeAnimations = false;
      let boardChanged = false;

      setDisplayedBoard(prevBoard => {
        if (!prevBoard) return null;

        const nextRobots = prevBoard.robots.map(robot => {
          const moveInfo = movingRobots[robot.color];
          if (!moveInfo) return robot; // アニメーション対象外

          activeAnimations = true; // まだアニメーション中のロボットがある
          const elapsedTime = now - moveInfo.startTime;
          const progress = Math.min(elapsedTime / moveInfo.duration, 1);

          // 線形補間 (Lerp) で中間位置を計算
          const currentX = moveInfo.startPos.x + (moveInfo.endPos.x - moveInfo.startPos.x) * progress;
          const currentY = moveInfo.startPos.y + (moveInfo.endPos.y - moveInfo.startPos.y) * progress;

          // わずかな変化でも更新するようにする
          if (robot.position.x !== currentX || robot.position.y !== currentY) {
             boardChanged = true;
             return {
               ...robot,
               position: { x: currentX, y: currentY },
             };
          }
          return robot; // 位置が変わらなければ元のロボットオブジェクトを返す
        });

        // ボードの状態が実際に変更された場合のみ新しいオブジェクトを返す
        return boardChanged ? { ...prevBoard, robots: nextRobots } : prevBoard;
      });

      // アニメーションが完了したロボットを movingRobots から削除
      setMovingRobots(currentMoving => {
        const nextMoving: Record<RobotColor, MovingRobotInfo> = {} as Record<RobotColor, MovingRobotInfo>; // 型アサーションで初期化
        let changed = false;
        for (const color in currentMoving) {
          const robotColor = color as RobotColor;
          const info = currentMoving[robotColor];
          const elapsedTime = now - info.startTime;
          if (elapsedTime < info.duration) {
            nextMoving[robotColor] = info; // まだアニメーション中
          } else {
            changed = true; // このロボットのアニメーションが完了
            // 完了時は最終位置に確定させる (補間誤差対策)
             setDisplayedBoard(prevBoard => {
               if (!prevBoard) return null;
               const finalRobots = prevBoard.robots.map(r => {
                 if (r.color === robotColor) {
                   // 最終位置が異なる場合のみ更新
                   if (r.position.x !== info.endPos.x || r.position.y !== info.endPos.y) {
                     return { ...r, position: info.endPos };
                   }
                 }
                 return r;
               });
               // displayedBoard の robots 配列が実際に変更されたかチェック
               const boardActuallyChanged = prevBoard.robots.some((r, i) => r !== finalRobots[i]);
               return boardActuallyChanged ? { ...prevBoard, robots: finalRobots } : prevBoard;
             });
          }
        }
        // movingRobots state が実際に変更された場合のみ更新
        return changed ? nextMoving : currentMoving;
      });


      // まだアクティブなアニメーションがあれば次のフレームを要求
      if (activeAnimations) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null; // null を代入
      }
    };

    // movingRobots にアニメーション対象があればループを開始
    if (Object.keys(movingRobots).length > 0) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    // クリーンアップ関数
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null; // null を代入
      }
    };
  }, [movingRobots]); // movingRobots が変更されたら再実行

  // --- アクションハンドラーを gameStore に接続 ---
  const handleStartGame = () => {
    startGame(); // gameStoreのアクションを呼び出す
  };

  // handleFlipCard はサーバー側で自動で行われる想定のため削除

  const handleDeclareMoves = (moves: number) => {
    storeDeclareMoves(moves); // gameStoreのアクションを呼び出す
  };

  // GameBoardから方向を受け取り、パスを計算してstoreのアクションを呼ぶ
  const handleRobotMove = (robotColor: RobotColor, direction: Direction) => { // 引数を direction に変更
    // generatedBoard と game、currentPlayer が存在するかチェック
    if (!generatedBoard || !game || !currentPlayer) return;

    // generatedBoard からロボット情報を取得
    const robot = generatedBoard.robots.find(r => r.color === robotColor);
    if (!robot) {
      console.error(`[GamePage] Robot with color ${robotColor} not found in generatedBoard.`);
      return;
    }

    // generatedBoard を使ってパスを計算
    const path = calculatePath(generatedBoard, robot, direction);

    if (path.length > 1) { // 移動があった場合のみ送信
       storeMoveRobot(robotColor, path); // 計算したパスを渡す
    }
  };

  const handleDrawCard = () => { // drawCard ハンドラーを追加
    drawCard();
  };


  const handleLeaveRoom = () => {
    leaveRoom();
    navigate('/online'); // 退室後はオンラインページへ
  };
  // --- ここまで ---

  // --- UI表示のための準備 ---
  // 接続状態のチェック
  if (isConnecting) {
    return <div className="p-4 text-center">サーバーに接続中...</div>;
  }
  if (!isConnected || connectionError) {
    return <div className="p-4 text-center text-red-600">サーバーに接続できませんでした。({connectionError || '不明なエラー'})</div>;
  }
  // currentRoom がない場合はローディング表示 (接続後)
  if (!currentRoom) {
    // TODO: もっと良いローディング表示/エラー表示
    return <div className="p-4 text-center">ルーム情報を読み込み中...</div>;
  }
  // players をオブジェクトから配列に変換
  const playersArray = Object.values(currentRoom.players);
  // --- ここまで ---


  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-800">
              ルーム: {decodeURIComponent(roomId || '')}
            </h1>
            <button
              className="btn bg-gray-300 text-gray-700 hover:bg-gray-400 disabled:opacity-50"
              onClick={handleLeaveRoom}
              disabled={!isConnected} // 未接続時は無効
            >
              退室
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-4 gap-6">
          {/* 左サイドバー - プレイヤー情報 */}
          {/* 左サイドバー - プレイヤー情報 */}
          {/* 左サイドバー - プレイヤー情報 */}
          <div className="col-span-1 bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-bold mb-4">プレイヤー</h2>
            <div className="space-y-2">
              {/* playersArray を使用 */}
              {playersArray.map((player: Player) => (
                <div
                  key={player.id}
                  className={`flex justify-between items-center p-2 rounded ${
                    // game が存在する かつ 手番プレイヤーの場合に強調
                    game && player.id === game.currentPlayer ? 'bg-blue-100 ring-2 ring-blue-300' : 'bg-gray-50'
                  } ${
                    !player.connected ? 'opacity-50' : '' // 非接続プレイヤーを薄く表示
                  }`}
                >
                  <span className="flex items-center">
                     <span className={`w-2 h-2 rounded-full mr-2 ${player.connected ? 'bg-green-500' : 'bg-gray-400'}`}></span> {/* 接続状態表示 */}
                    {player.name}
                    {player.id === currentRoom.hostId && ' (Host)'} {/* ホスト表示 */}
                    {player.id === currentPlayer?.id && ' (You)'} {/* 自分を表示 */}
                    {/* 解答権順序の表示 (playingフェーズかつdeclarationOrderが存在する場合) */}
                    {game && game.phase === 'solution' && game.declarationOrder && game.declarationOrder.includes(player.id) && (
                      <span className="ml-2 text-xs text-gray-500">
                        (解答権: {game.declarationOrder.indexOf(player.id) + 1})
                      </span>
                    )}
                  </span>
                  {/* game が存在するならスコア表示 */}
                  <span className="font-bold">{game && game.playerStates[player.id] !== undefined ? `${game.playerStates[player.id].score}pt` : '0pt'}</span>
                </div>
              ))}
            </div>
             {/* 宣言表示 (game が存在する場合) */}
             {game && (game.phase === 'declaration' || game.phase === 'solution') ? (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="text-md font-semibold mb-2">宣言</h3>
                  <div className="space-y-1 text-sm">
                    {/* game.declarations が存在する場合 */}
                    {game.declarations && Object.values(game.declarations).map(decl => ( // Use Object.values() here
                      <div key={decl.playerId} className="flex justify-between">
                        {/* playersArray を使用して find */}
                        <span>{playersArray.find((p: Player) => p.id === decl.playerId)?.name ?? '不明'}</span>
                        <span>{decl.moves === null ? '考え中...' : `${decl.moves}手`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
          </div>

          {/* メインエリア - ゲームボードと宣言 */}
          <div className="col-span-2 bg-white rounded-lg shadow p-4 flex flex-col">
            <div className="aspect-square flex items-center justify-center flex-grow">
              {/* displayedBoard が存在するなら GameBoard を表示 */}
              {displayedBoard ? (
                <GameBoard
                  board={displayedBoard} // アニメーション状態を含むボードを渡す
                  onRobotMove={handleRobotMove}
                  // isPlayerTurn は game state と接続状態から判断
                  isPlayerTurn={isConnected && game?.phase === 'solution' && game?.currentPlayer === currentPlayer?.id}
                />
              ) : (
                <div className="text-gray-500">ボード情報を読み込み中...</div>
              )}
            </div>
             {/* 宣言カードリスト (game が存在する場合) */}
             {game && game.phase === 'declaration' && (
              <div className="mt-4 pt-4 border-t">
                <DeclarationCardList
                  selectedNumber={(() => {
                    const currentMoves = currentPlayer?.id ? game.declarations?.[currentPlayer.id]?.moves : undefined;
                    return typeof currentMoves === 'number' ? currentMoves : null;
                  })()}
                  maxNumber={30} // 仮の最大手数
                  onSelect={handleDeclareMoves}
                  // 宣言済み、または未接続なら無効化
                  isDisabled={!isConnected || game.declarations?.[currentPlayer?.id ?? '']?.moves != null}
                  className="mt-2"
                />
              </div>
            )}
          </div>

          {/* 右サイドバー - ゲーム情報と操作 */}
          <div className="col-span-1 space-y-4">
            {/* ラウンド情報 (game が存在する場合) */}
            {game && (
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-bold mb-2">ゲーム情報</h2>
                <div className="text-sm space-y-1">
                  <p>フェーズ: {getPhaseText(game.phase)}</p>
                  <p>残り時間: {game.timer}秒</p>
                  <p>残りカード: {game.remainingCards} / {game.totalCards}</p>
                  {game.currentCard && (
                    <div className="mt-2 p-2 border rounded flex items-center justify-center space-x-2">
                      <span className={`font-bold text-xl ${getTargetColorClass(game.currentCard.color)}`}>
                        {game.currentCard.symbol}
                      </span>
                      <span>({game.currentCard.color})</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ゲームコントロール */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-bold mb-2">操作</h2>
              <div className="space-y-2">
                {/* ゲームスタートボタン (ホスト用, gameがnull) */}
                {currentRoom.hostId === currentPlayer?.id && !game && (
                  <button
                    className="btn btn-primary w-full disabled:opacity-50"
                    onClick={handleStartGame}
                    disabled={!isConnected} // 未接続時は無効
                  >
                    ゲームスタート
                  </button>
                )}
                {/* カードをめくるボタン (宣言フェーズで、まだカードがめくられていない場合) */}
                {currentRoom.hostId === currentPlayer?.id && game && game.phase === 'waiting' && !game.currentCard && (
                  <button
                    className="btn btn-secondary w-full disabled:opacity-50"
                    onClick={handleDrawCard}
                    disabled={!isConnected} // 未接続時は無効
                  >
                    カードをめくる ({game.remainingCards} 枚)
                  </button>
                )}
              </div>
            </div>

             {/* ゲーム結果表示 (game が存在する場合) */}
             {game && game.phase === 'finished' && (
               <GameResultDisplay
                 players={playersArray} // playersArray を渡す
                 onLeaveRoom={handleLeaveRoom} // handleLeaveRoom を渡す
               />
             )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default GamePage;