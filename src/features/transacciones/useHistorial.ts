import { useEffect, useState } from 'react';
import { onSnapshot, query, orderBy } from 'firebase/firestore';
import { refTransacciones } from './transaccionesService';
import { useSessionStore } from '../../stores/sessionStore';
import { Transaccion } from '../../types/models';

// Trae TODAS las transacciones del usuario (sin filtrar en Firestore). El
// filtrado por caja/fecha se hace en memoria con `filtrarHistorial` (ver
// `./filtros.ts`): los ingresos se guardan con `cajaId: null` (se reparten
// entre cajas vía `reparto`), así que un `where('cajaId','==',x)` los
// dejaba siempre fuera del historial filtrado. El volumen por usuario es
// bajo en este MVP, así que traer todo y filtrar en el cliente es adecuado.
export function useHistorial() {
  const uid = useSessionStore((s) => s.usuario?.uid);
  const [items, setItems] = useState<Transaccion[]>([]);
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    if (!uid) return;
    const q = query(refTransacciones(uid), orderBy('fecha', 'desc'));
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Transaccion, 'id'>) })));
      setCargando(false);
    });
  }, [uid]);
  return { items, cargando };
}
