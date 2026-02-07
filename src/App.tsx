import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import BroadcastRoom from './pages/BroadcastRoom';
import ViewerRoom from './pages/ViewerRoom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/broadcast/:roomId" element={<BroadcastRoom />} />
        <Route path="/view/:roomId" element={<ViewerRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
