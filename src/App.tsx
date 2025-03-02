import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TitlePage from './pages/TitlePage';
import SinglePlayerPage from './pages/SinglePlayerPage';
// import OnlinePage from './pages/OnlinePage';
// import CreateRoomPage from './pages/CreateRoomPage';
// import JoinRoomPage from './pages/JoinRoomPage';
// import GamePage from './pages/GamePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TitlePage />} />
        <Route path="/single" element={<SinglePlayerPage />} />
        {/* オンラインプレイ機能は後で実装 */}
        {/* <Route path="/online" element={<OnlinePage />} /> */}
        {/* <Route path="/create-room" element={<CreateRoomPage />} /> */}
        {/* <Route path="/join-room" element={<JoinRoomPage />} /> */}
        {/* <Route path="/game/:roomId" element={<GamePage />} /> */}
      </Routes>
    </Router>
  );
}

export default App;
