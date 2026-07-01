import { useEffect, useState } from 'react';
import { onSnapshot, query, orderBy } from 'firebase/firestore';
import { refCajas } from './cajasService';
import { useSessionStore } from '../../stores/sessionStore';
import { Caja } from '../../types/models';

export function useCajas() {
  const uid = useSessionStore((s) => s.usuario?.uid);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(query(refCajas(uid), orderBy('orden')), (snap) => {
      setCajas(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Caja, 'id'>) })));
      setCargando(false);
    });
    return unsub;
  }, [uid]);
  return { cajas, cargando };
}
