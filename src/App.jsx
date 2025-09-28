import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import HomePage from './components/HomePage';
import CreateRoom from './components/CreateRoom';
import JoinRoom from './components/JoinRoom';
import RetroBoard from './components/RetroBoard';
import { SimpleRoomProvider } from './context/SimpleRoomContext';

function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <SimpleRoomProvider>
        <Router>
          <div className="min-h-screen bg-white">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/create-room" element={<CreateRoom />} />
              <Route path="/join-room" element={<JoinRoom />} />
              <Route path="/room/:roomId" element={<RetroBoard />} />
            </Routes>
          </div>
        </Router>
      </SimpleRoomProvider>
    </DndProvider>
  );
}

export default App
