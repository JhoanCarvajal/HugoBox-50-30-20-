import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useSessionStore } from '../../stores/sessionStore';
import { asegurarUsuario } from './authService';

export function useAuth() {
  const { usuario, cargando, setUsuario, setCargando } = useSessionStore();
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const u = await asegurarUsuario({
          uid: fbUser.uid, email: fbUser.email, displayName: fbUser.displayName,
        });
        setUsuario(u);
      } else {
        setUsuario(null);
      }
      setCargando(false);
    });
    return unsub;
  }, []);
  return { usuario, cargando };
}
