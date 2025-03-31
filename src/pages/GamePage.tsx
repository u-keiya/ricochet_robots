import { FC, useEffect } from 'react'; // useEffectを追加
import { useParams, useNavigate } from 'react-router-dom';
import GameBoard from '../components/GameBoard/GameBoard';
import useGameStore from '../stores/gameStore'; // useGameStoreをインポート
import { DeclarationCardList } from '../components/DeclarationCard'; // DeclarationCardListをインポート
import GameResultDisplay from '../components/GameResultDisplay'; // GameResultDisplayをインポート
import { Player } from '../types/player'; // Player型をインポート
// Direction と Card['color'] (CardColorの代わり) をインポート
import { RobotColor, Position, GamePhase, Direction, Card } from '../types/game';
import { calculatePath } from '../utils/robotMovement'; // calculatePathをインポート

// --- ヘルパー関数 ---
const getPhaseText = (phase: GamePhase): string => {
  switch (phase) {
    case 'waiting': return '待機中';
    case 'declaration': return '宣言フェーズ';
    case 'playing': return '解法提示フェーズ';
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
    currentRoom,
    currentPlayer,
    startGame,
    declareMoves: storeDeclareMoves, // 名前衝突を避ける
    moveRobot: storeMoveRobot,       // 名前衝突を避ける
    leaveRoom,
    isConnected,
    connectionError,
  } = useGameStore();

  // roomIdがない、または接続エラーがあればオンラインページに戻る
  useEffect(() => {
    if (!isConnected || connectionError) {
      console.error('Not connected or connection error, navigating back.');
      navigate('/online');
    }
    // TODO: ルームが存在しない場合の処理 (currentRoomがnullになったら?)
  }, [isConnected, connectionError, navigate]);

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
    if (!game?.board || !currentPlayer) return; // ボードやプレイヤー情報がない場合は何もしない

    const robot = game.board.robots.find(r => r.color === robotColor);
    if (!robot) return;

    // パスを計算
    const path = calculatePath(game.board, robot, direction);

    if (path.length > 1) { // 移動があった場合のみ送信
       storeMoveRobot(robotColor, path); // 計算したパスを渡す
    }
  };


  const handleLeaveRoom = () => {
    leaveRoom();
    navigate('/online'); // 退室後はオンラインページへ
  };
  // --- ここまで ---

  // --- UI表示のための準備 ---
  // currentRoom がない場合はローディング表示
  if (!currentRoom) {
    // TODO: もっと良いローディング表示/エラー表示
    return <div className="p-4">ルーム情報を読み込み中...</div>;
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
              className="btn bg-gray-300 text-gray-700 hover:bg-gray-400"
              onClick={handleLeaveRoom} // 修正
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
                    game && player.id === game.currentPlayerTurn ? 'bg-blue-100 ring-2 ring-blue-300' : 'bg-gray-50'
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
                    {game && game.phase === 'playing' && game.declarationOrder && game.declarationOrder.includes(player.id) && (
                      <span className="ml-2 text-xs text-gray-500">
                        (解答権: {game.declarationOrder.indexOf(player.id) + 1})
                      </span>
                    )}
                  </span>
                  {/* game が存在するならスコア表示 */}
                  <span className="font-bold">{game && game.scores[player.id] !== undefined ? `${game.scores[player.id]}pt` : '0pt'}</span>
                </div>
              ))}
            </div>
             {/* 宣言表示 (game が存在する場合) */}
             {game && (game.phase === 'declaration' || game.phase === 'playing') ? (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="text-md font-semibold mb-2">宣言</h3>
                  <div className="space-y-1 text-sm">
                    {/* game.declarations が存在する場合 */}
                    {game.declarations && game.declarations.map(decl => (
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
              {/* game と game.board が存在するなら GameBoard を表示 */}
              {game && game.board ? (
                <GameBoard
                  board={game.board}
                  onRobotMove={handleRobotMove}
                  // 自分のターンか、かつ playing フェーズか
                  isPlayerTurn={game.phase === 'playing' && game.currentPlayerTurn === currentPlayer?.id}
                />
              ) : (
                <div className="text-gray-500">ボードを待っています...</div>
              )}
            </div>
             {/* 宣言カードリスト (game が存在する場合) */}
             {game && game.phase === 'declaration' && (
              <div className="mt-4 pt-4 border-t">
                <DeclarationCardList
                  selectedNumber={game.declarations?.find(d => d.playerId === currentPlayer?.id)?.moves ?? null}
                  maxNumber={30} // 仮の最大手数
                  onSelect={handleDeclareMoves}
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

            {/* ゲームコントロール (ホスト用, game が null でも表示) */}
            {currentRoom.hostId === currentPlayer?.id && (!game || game.phase === 'waiting') && (
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-bold mb-2">操作</h2>
                <div className="space-y-2">
                  <button
                    className="btn btn-primary w-full"
                    onClick={handleStartGame}
                    // disabled={currentRoom.players.length < 2} // プレイヤー数チェックはサーバー側で行う想定
                  >
                    ゲームスタート
                  </button>
                  {/* カードめくりボタンは削除 */}
                </div>
              </div>
            )}
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