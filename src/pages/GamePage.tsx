import { FC, useEffect, useState, useRef } from 'react'; // useState, useRefを追加
import { useParams, useNavigate } from 'react-router-dom';
import GameBoard from '../components/GameBoard/GameBoard';
import useGameStore from '../stores/gameStore'; // useGameStoreをインポート
import GameInfo from '../components/GameInfo'; // GameInfo をインポート
import { DeclarationCardList } from '../components/DeclarationCard'; // DeclarationCardListをインポート
import GameResultDisplay from '../components/GameResultDisplay'; // GameResultDisplayをインポート
import { Player } from '../types/player'; // Player型をインポート
// Direction と Card['color'] (CardColorの代わり) をインポート
import { RobotColor, Position, GamePhase, Direction, Card, Board } from '../types/game'; // Board をインポート
import { calculatePath } from '../utils/robotMovement'; // calculatePathをインポート

// レイアウト定数 (SinglePlayerPageから移植・調整)
const LEFT_SIDEBAR_WIDTH = 288; // 左サイドバーの幅 (仮、Tailwindのcol-span-1とgap-6から推測) - grid-cols-4 gap-6 -> 1/4幅 - gap分
const RIGHT_SIDEBAR_WIDTH = 288; // 右サイドバーの幅 (仮)
const DECLARATION_HEIGHT = 140; // 宣言エリアの高さ (仮) - GamePageでは未使用だが念のため
const BOARD_SCALE_FACTOR = 0.9; // ボードのスケーリング係数 (調整)

// アニメーション中のロボット情報
interface MovingRobotInfo {
  path: Position[]; // 移動経路全体
  startTime: number;
  segmentDuration: number; // 1セグメントあたりのアニメーション時間 (ms)
  currentSegment: number; // 現在アニメーション中のセグメントインデックス (0から開始)
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
  // movingRobots の型を変更
  const [movingRobots, setMovingRobots] = useState<Record<RobotColor, MovingRobotInfo | null>>({} as Record<RobotColor, MovingRobotInfo | null>); // 初期値をキャスト
  const prevGameRef = useRef(game); // 前回の game state を保持
  const animationFrameRef = useRef<number | null>(null); // 型を number | null に変更し、初期値を null に
  const containerRef = useRef<HTMLDivElement>(null); // ボードコンテナの参照

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

  // game state が変更された際の処理 (アニメーションの直接トリガーは削除し、初期表示や状態リセットに利用)
  useEffect(() => {
    const prevGame = prevGameRef.current;

    // 初回ロード時やゲームリセット時に displayedBoard を設定
    // prevGame が null (初回) または currentCard が null から値ありに変わった場合 (ラウンド開始)
    if (game && (!prevGame || (!prevGame.currentCard && game.currentCard)) && generatedBoard) {
      console.log('[Effect game] Initializing or resetting displayedBoard for new round.');
      setDisplayedBoard({
        ...generatedBoard,
        robots: generatedBoard.robots.map(robot => ({
          ...robot,
          position: game.robotPositions?.[robot.color] ?? robot.position,
        })),
      });
      setMovingRobots({} as Record<RobotColor, MovingRobotInfo | null>); // アニメーション状態もリセット (キャスト追加)
    }
    // サーバーからの状態更新で、アニメーション中でないロボットの位置を直接更新 (同期ずれ補正)
    else if (game && game.robotPositions && displayedBoard) {
        let boardChanged = false;
        const nextRobots = displayedBoard.robots.map(robot => {
            const serverPos = game.robotPositions?.[robot.color];
            // アニメーション中でなく、サーバーの位置と異なれば更新
            if (serverPos && !movingRobots[robot.color] && (robot.position.x !== serverPos.x || robot.position.y !== serverPos.y)) {
                console.log(`[Effect game] Syncing robot ${robot.color} to server position`, serverPos);
                boardChanged = true;
                return { ...robot, position: serverPos };
            }
            return robot;
        });
        if (boardChanged) {
            setDisplayedBoard(prev => prev ? { ...prev, robots: nextRobots } : null);
        }
    }


    // 現在の game state を次回の比較用に保存
    prevGameRef.current = game;

  }, [game, generatedBoard]); // displayedBoard を依存配列から削除


  // アニメーションループ (経路ベースに修正)
  useEffect(() => {
    const animate = (now: number) => {
      let activeAnimationsExist = false; // ループ継続フラグ
      let boardNeedsUpdate = false; // displayedBoard 更新フラグ
      const nextMovingRobots: Record<RobotColor, MovingRobotInfo | null> = {} as Record<RobotColor, MovingRobotInfo | null>; // 次のフレームの movingRobots 状態 (キャスト追加)
      const updatedRobotPositions: Partial<Record<RobotColor, Position>> = {}; // このフレームで更新されたロボットの位置

      for (const color in movingRobots) {
        const robotColor = color as RobotColor;
        const moveInfo = movingRobots[robotColor];

        if (!moveInfo) continue; // null の場合はスキップ

        activeAnimationsExist = true; // 有効なアニメーション情報がある

        const totalElapsedTime = now - moveInfo.startTime;
        // 現在のセグメント内での経過時間
        const segmentElapsedTime = totalElapsedTime - (moveInfo.currentSegment * moveInfo.segmentDuration);
        const progress = Math.min(segmentElapsedTime / moveInfo.segmentDuration, 1);

        const startSegmentPos = moveInfo.path[moveInfo.currentSegment];
        const endSegmentPos = moveInfo.path[moveInfo.currentSegment + 1]; // 次のセグメントの開始位置が現在の終了位置

        // 線形補間 (Lerp) で中間位置を計算
        const currentX = startSegmentPos.x + (endSegmentPos.x - startSegmentPos.x) * progress;
        const currentY = startSegmentPos.y + (endSegmentPos.y - startSegmentPos.y) * progress;

        updatedRobotPositions[robotColor] = { x: currentX, y: currentY };
        boardNeedsUpdate = true; // 位置が変わるのでボード更新が必要

        // 現在のセグメントのアニメーションが完了したか？
        if (progress >= 1) {
          // 次のセグメントへ
          const nextSegment = moveInfo.currentSegment + 1;
          // パスの終点に達したか？ (path の最後の要素のインデックスは path.length - 1)
          if (nextSegment >= moveInfo.path.length - 1) {
            // アニメーション完了 -> movingRobots から削除
            nextMovingRobots[robotColor] = null; // null を設定して削除マーク
            // 最終位置に確定させる
            updatedRobotPositions[robotColor] = moveInfo.path[moveInfo.path.length - 1];
            console.log(`[Animate] Robot ${robotColor} finished animation at`, updatedRobotPositions[robotColor]);
          } else {
            // 次のセグメントのアニメーションへ
            nextMovingRobots[robotColor] = {
              ...moveInfo,
              currentSegment: nextSegment,
              // startTime は変えずに currentSegment を進める
            };
            console.log(`[Animate] Robot ${robotColor} moved to segment ${nextSegment}`);
          }
        } else {
          // まだ現在のセグメントのアニメーション中
          nextMovingRobots[robotColor] = moveInfo;
        }
      }

      // displayedBoard を更新 (変更があった場合のみ)
      if (boardNeedsUpdate) {
        setDisplayedBoard(prevBoard => {
          if (!prevBoard) return null;
          const nextRobots = prevBoard.robots.map(robot => {
            if (updatedRobotPositions[robot.color]) {
              // わずかでも位置が変わっていれば更新
              if (robot.position.x !== updatedRobotPositions[robot.color]!.x || robot.position.y !== updatedRobotPositions[robot.color]!.y) {
                 return { ...robot, position: updatedRobotPositions[robot.color]! };
              }
            }
            return robot;
          });
          // 実際に robots 配列の内容が変わったかチェック
          const boardActuallyChanged = prevBoard.robots.some((r, i) => r !== nextRobots[i]);
          return boardActuallyChanged ? { ...prevBoard, robots: nextRobots } : prevBoard;
        });
      }

      // movingRobots state を更新
      // 完了したロボット (null) をフィルタリングし、残りをセット
      const finalNextMovingRobots = Object.entries(nextMovingRobots)
          .filter(([, info]) => info !== null)
          .reduce((acc, [key, info]) => {
              acc[key as RobotColor] = info;
              return acc;
          }, {} as Record<RobotColor, MovingRobotInfo | null>);

      // 前回の movingRobots と比較して変更があるかチェック (無限ループ防止)
      if (JSON.stringify(movingRobots) !== JSON.stringify(finalNextMovingRobots)) {
         setMovingRobots(finalNextMovingRobots);
      }


      // まだアクティブなアニメーションがあれば次のフレームを要求
      if (activeAnimationsExist && Object.keys(finalNextMovingRobots).length > 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        console.log("[Animate] All animations finished.");
        animationFrameRef.current = null;
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

  // GameBoardから方向を受け取り、パスを計算してアニメーションを開始し、storeのアクションを呼ぶ
  const handleRobotMove = (robotColor: RobotColor, direction: Direction) => {
    // displayedBoard (現在表示中のボード状態) と game が存在するかチェック
    // アニメーションは displayedBoard の状態から開始する
    if (!displayedBoard || !game || !currentPlayer) return;
    // すでにそのロボットがアニメーション中なら何もしない
    if (movingRobots[robotColor]) return;

    // displayedBoard から現在のロボット情報を取得
    const robot = displayedBoard.robots.find(r => r.color === robotColor);
    if (!robot) {
      console.error(`[GamePage] Robot with color ${robotColor} not found in displayedBoard.`);
      return;
    }

    // displayedBoard を使ってパスを計算 (アニメーションの開始位置は表示上の位置)
    const path = calculatePath(displayedBoard, robot, direction);

    if (path.length > 1) { // 移動があった場合のみ
      const segmentDuration = 50; // 1セル移動する時間 (ms) - 好みに応じて調整

      // アニメーション状態を更新
      setMovingRobots(prev => ({
        ...prev,
        [robotColor]: {
          path: path,
          startTime: performance.now(),
          segmentDuration: segmentDuration,
          currentSegment: 0,
        }
      }));

      // サーバーにも移動を通知 (アニメーションと並行して実行)
      storeMoveRobot(robotColor, path);
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
  // playersInfo をオブジェクトから配列に変換
  // game.playersInfo がなくても currentRoom.players からリストを生成するように修正
  const playersArray = currentRoom?.players
    ? Object.values(currentRoom.players).map((player) => ({
        id: player.id,
        name: player.name, // currentRoom.players に name がある前提 (Player 型に含まれるはず)
        connected: player.connected,
        isHost: player.isHost,
        roomId: player.roomId,
        // スコアは game state があればそこから、なければ 0
        score: game?.playerStates?.[player.id]?.score ?? 0,
      }))
    : []; // currentRoom.players がなければ空配列

  // ボードのスケーリング計算 (SinglePlayerPageから移植・調整)
  const getBoardScale = () => {
    // displayedBoard またはコンテナがない場合はデフォルトスケール
    // game ではなく displayedBoard の有無で判断する
    if (!displayedBoard || !containerRef.current) return 1;

    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;

    // GameBoardの基本サイズ (40px * board.size)
    const baseSize = displayedBoard.size * 40;

    // padding (p-4) を考慮に入れる必要があるかもしれないが、一旦無視
    const scaleX = containerWidth / baseSize;
    const scaleY = containerHeight / baseSize;

    // 最小のスケールを採用し、最大1倍、係数をかける
    return Math.min(scaleX, scaleY, 1) * BOARD_SCALE_FACTOR;
  };

  const scale = getBoardScale();
  // --- ここまで ---


  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-800">
              ルーム: {currentRoom?.name} {/* ルームIDの代わりにルーム名を表示 */}
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
              {/* マージした playersArray を使用 */}
              {playersArray.map((player) => ( // 型推論に任せるか、明示的な型 (Playerに近いもの) を定義
                <div
                  key={player.id}
                  className={`flex justify-between items-center p-2 rounded ${
                    // game が存在する かつ 手番プレイヤーの場合に強調
                    game && player.id === game.currentPlayer ? 'bg-blue-100 ring-2 ring-blue-300' : 'bg-gray-50'
                  } ${
                    !player.connected ? 'opacity-50' : '' // マージされた connected を使用
                  }`}
                >
                  <span className="flex items-center">
                     <span className={`w-2 h-2 rounded-full mr-2 ${player.connected ? 'bg-green-500' : 'bg-gray-400'}`}></span> {/* マージされた connected を使用 */}
                    {player.name} {/* マージされた name を使用 */}
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
                  <span className="font-bold">{player.score}pt</span> {/* マージされた score を使用 */}
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
                        {/* game.playersInfo を直接参照する方がシンプル */}
                        <span>{game?.playersInfo?.[decl.playerId]?.name ?? '不明'}</span>
                        <span>{decl.moves === null ? '考え中...' : `${decl.moves}手`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
          </div>

          {/* メインエリア - ゲームボードと宣言 */}
          {/* ref を追加し、flex-grow を削除してコンテナがサイズを持つようにする */}
          <div ref={containerRef} className="col-span-2 bg-white rounded-lg shadow p-4 flex flex-col items-center justify-center">
            {/* GameBoard を含む div にスケールを適用 */}
            {/* flex-grow を削除し、基本サイズとスケールを設定 */}
            <div
              className="relative" // スケーリングの基点用
              style={{
                width: displayedBoard ? `${displayedBoard.size * 40}px` : '640px', // 基本サイズ指定 (16*40)
                height: displayedBoard ? `${displayedBoard.size * 40}px` : '640px',
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
                transition: 'transform 0.3s ease-out' // スムーズなスケーリング変化のため
              }}
            >
              {/* displayedBoard が存在するなら GameBoard を表示 */}
              {displayedBoard ? (
                <GameBoard
                  board={displayedBoard} // アニメーション状態を含むボードを渡す
                  onRobotMove={handleRobotMove}
                  // isPlayerTurn は game state と接続状態から判断
                  isPlayerTurn={isConnected && game?.phase === 'solution' && game?.currentPlayer === currentPlayer?.id}
                />
              ) : (
                // ローディング表示も中央に配置
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">ボード情報を読み込み中...</div>
              )}
            </div>
             {/* 宣言カードリスト (game が存在する場合) */}
             {game && game.phase === 'declaration' && (
              <div className="mt-4 pt-4 border-t w-full"> {/* w-full を追加 */}
                <DeclarationCardList
                  selectedNumber={(() => {
                    const currentMoves = currentPlayer?.id ? game.declarations?.[currentPlayer.id]?.moves : undefined;
                    return typeof currentMoves === 'number' ? currentMoves : null;
                  })()}
                  maxNumber={99} // 仮の最大手数
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
            {/* GameInfo コンポーネントを使用 (game と currentRoom が存在する場合) */}
            {game && currentRoom && (
              <div className="bg-white rounded-lg shadow p-4">
                 <GameInfo
                   scores={game.playerStates ? Object.fromEntries(Object.entries(game.playerStates).map(([id, state]) => [id, state.score])) : {}} // playerStates から scores を抽出
                   players={game.playersInfo ?? {}} // game.playersInfo を渡す (存在しない場合は空オブジェクト)
                   moveCount={game.moveHistory?.length ?? 0} // moveHistory から手数を計算 (存在しない場合は0)
                   declaredMoves={currentPlayer?.id ? game.declarations?.[currentPlayer.id]?.moves ?? 0 : 0} // 自分の宣言手数を取得
                   timer={game.timer}
                   isDeclarationPhase={game.phase === 'declaration'}
                   currentCard={game.currentCard ?? undefined} // currentCard が null の場合は undefined を渡す
                   remainingCards={game.remainingCards}
                   onDrawCard={handleDrawCard} // handleDrawCard を渡す
                   phase={game.phase}
                 />
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
                {/* カードをめくるボタン (ホスト用, waiting フェーズ) */}
                {currentRoom.hostId === currentPlayer?.id && game && game.phase === 'waiting' && (
                  <button
                    className="btn btn-primary w-full disabled:opacity-50"
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
                 currentPlayer={currentPlayer} // currentPlayer を渡す
                 currentRoom={currentRoom} // currentRoom を渡す
               />
             )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default GamePage;