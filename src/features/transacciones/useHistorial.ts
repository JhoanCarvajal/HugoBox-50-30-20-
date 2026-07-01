import { useEffect, useState } from 'react';
import { onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { refTransacciones } from './transaccionesService';
import { useSessionStore } from '../../stores/sessionStore';
import { Transaccion } from '../../types/models';

export function useHistorial(filtroCajaId?: string | null) {
  const uid = useSessionStore((s) => s.usuario?.uid);
  const [items, setItems] = useState<Transaccion[]>([]);
  useEffect(() => {
    if (!uid) return;
    const base = refTransacciones(uid);
    const q = filtroCajaId
      ? query(base, where('cajaId', '==', filtroCajaId), orderBy('fecha', 'desc'))
      : query(base, orderBy('fecha', 'desc'));
    return onSnapshot(q, (snap) =>
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Transaccion, 'id'>) }))));
  }, [uid, filtroCajaId]);
  return { items };
}
