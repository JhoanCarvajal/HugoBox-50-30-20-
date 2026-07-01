import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth';
import { doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { crearCajasPorDefecto, refCajas } from '../cajas/cajasService';
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
  let usuario: Usuario;
  if (!snap.exists()) {
    usuario = {
      uid: u.uid, email: u.email, displayName: u.displayName,
      monedaPreferida: 'COP', createdAt: Date.now(),
    };
    await setDoc(ref, usuario);
  } else {
    usuario = snap.data() as Usuario;
  }
  // Recuperación idempotente: si el doc de usuario existe pero las cajas
  // nunca se llegaron a crear (el proceso murió entre el setDoc y
  // crearCajasPorDefecto en un login anterior), se repara aquí en vez de
  // dejar al usuario sin cajas para siempre.
  const cajasSnap = await getDocs(refCajas(u.uid));
  if (cajasSnap.empty) {
    await crearCajasPorDefecto(u.uid);
  }
  return usuario;
}
