import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { crearCajasPorDefecto } from '../cajas/cajasService';
import { Usuario } from '../../types/models';

export function configurarGoogle() {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
  });
}

export async function entrarConGoogle(): Promise<void> {
  await GoogleSignin.hasPlayServices();
  // En @react-native-google-signin/google-signin@16.x, `signIn()` devuelve un
  // `SignInResponse` discriminado por `type`: `{ type: 'success', data: User }` o
  // `{ type: 'cancelled', data: null }` (ya no el `{ idToken }` plano de versiones viejas).
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) {
    // El usuario canceló el flujo: no hay nada que autenticar, salida limpia.
    return;
  }
  const { idToken } = response.data;
  if (!idToken) {
    throw new Error('Google Sign-In no devolvió idToken');
  }
  const cred = GoogleAuthProvider.credential(idToken);
  await signInWithCredential(auth, cred);
}

export async function cerrarSesion(): Promise<void> {
  await GoogleSignin.signOut().catch(() => {});
  await signOut(auth);
}

/** Crea el doc del usuario y sus cajas si es su primer ingreso. */
export async function asegurarUsuario(u: {
  uid: string; email: string | null; displayName: string | null;
}): Promise<Usuario> {
  const ref = doc(db, 'users', u.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const nuevo: Usuario = {
      uid: u.uid, email: u.email, displayName: u.displayName,
      monedaPreferida: 'COP', createdAt: Date.now(),
    };
    await setDoc(ref, nuevo);
    await crearCajasPorDefecto(u.uid);
    return nuevo;
  }
  return snap.data() as Usuario;
}
