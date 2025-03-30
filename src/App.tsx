import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TitlePage from './pages/TitlePage';
import SinglePlayerPage from './pages/SinglePlayerPage';
import BoardTestPage from './pages/BoardTestPage';
import OnlinePage from './pages/OnlinePage'; // コメント解除
import CreateRoomPage from './pages/CreateRoomPage'; // コメント解除
import JoinRoomPage from './pages/JoinRoomPage'; // コメント解除
import GamePage from './pages/GamePage'; // コメント解除

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TitlePage />} />
        <Route path="/single" element={<SinglePlayerPage />} />
        <Route path="/test-boards" element={<BoardTestPage />} />
        {/* オンラインプレイ機能のルートを有効化 */}
        <Route path="/online" element={<OnlinePage />} />
        <Route path="/create-room" element={<CreateRoomPage />} />
        <Route path="/join-room" element={<JoinRoomPage />} />
        <Route path="/game/:roomId" element={<GamePage />} />
      </Routes>
    </Router>
  );
}

export default App;
