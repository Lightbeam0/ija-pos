import { useEffect } from 'react';
import { usePosStore } from './store/usePosStore';
import { api } from './lib/api';
import LoginScreen from './components/LoginScreen';
import PosScreen from './components/PosScreen';

// FIX: removed import of App.css — the file was entirely Vite scaffold
// boilerplate (.hero, #next-steps, .ticks etc.) with no relation to this
// project. Tailwind handles all styling via index.css.

function App() {
  const { token, setAuth, logout } = usePosStore();

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      api.auth.me()
        .then(data => setAuth(savedToken, data.user))
        .catch(logout);
    }
  }, []);

  if (!token) return <LoginScreen />;
  return <PosScreen />;
}

export default App;
