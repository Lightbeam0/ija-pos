// frontend/src/App.tsx
import { useEffect } from 'react';
import { usePosStore } from './store/usePosStore';
import { api } from './lib/api';
import LoginScreen from './components/LoginScreen';
import PosScreen from './components/PosScreen';
import InventoryScreen from './components/inventory/InventoryScreen';

function App() {
  const { token, currentView, setAuth, logout } = usePosStore();

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      api.auth.me()
        .then(data => setAuth(savedToken, data.user))
        .catch(logout);
    }
  }, []);

  if (!token) return <LoginScreen />;
  if (currentView === 'inventory') return <InventoryScreen />;
  return <PosScreen />;
}

export default App;
