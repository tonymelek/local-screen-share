import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import BroadcastRoom from './pages/BroadcastRoom';
import ViewerRoom from './pages/ViewerRoom';
import AdminPage from './pages/AdminPage';
import PrivateCallRoom from './pages/PrivateCallRoom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/broadcast/:roomId" element={<BroadcastRoom />} />
        <Route path="/view/:roomId" element={<ViewerRoom />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/call/:roomId" element={<PrivateCallRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
