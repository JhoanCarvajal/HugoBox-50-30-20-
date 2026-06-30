import { create } from 'zustand';
import { Usuario } from '../types/models';

interface SessionState {
  usuario: Usuario | null;
  cargando: boolean;
  setUsuario: (u: Usuario | null) => void;
  setCargando: (v: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  usuario: null,
  cargando: true,
  setUsuario: (usuario) => set({ usuario }),
  setCargando: (cargando) => set({ cargando }),
}));
