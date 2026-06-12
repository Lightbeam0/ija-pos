// frontend/src/App.tsx
import { useEffect } from 'react';
import { usePosStore } from './store/usePosStore.ts';
import { api } from './lib/api';
import LoginScreen from './components/LoginScreen.tsx';
import PosScreen from './components/PosScreen';

function App() {
  const { token, setAuth, logout } = usePosStore();

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      api.auth.me()
        .then(data => {
          setAuth(savedToken, data.user);
        })
        .catch(() => {
          logout();
        });
    }
  }, []);

  if (!token) {
    return <LoginScreen />;
  }

  return <PosScreen />;
}

export default App;