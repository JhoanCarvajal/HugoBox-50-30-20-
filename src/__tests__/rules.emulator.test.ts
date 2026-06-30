import { initializeTestEnvironment, assertFails, assertSucceeds }
  from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { readFileSync } from 'fs';

let env: Awaited<ReturnType<typeof initializeTestEnvironment>>;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-hugobox',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(() => env.cleanup());

it('un usuario NO puede leer cajas de otro', async () => {
  const ana = env.authenticatedContext('ana').firestore();
  await assertFails(getDoc(doc(ana, 'users/beto/cajas/x')));
});

it('un usuario SÍ puede escribir sus propias cajas', async () => {
  const ana = env.authenticatedContext('ana').firestore();
  await assertSucceeds(setDoc(doc(ana, 'users/ana/cajas/x'), { nombre: 'Gastos', porcentaje: 50, saldo: 0, esPorDefecto: true, orden: 0, createdAt: 1 }));
});

it('un usuario NO autenticado no puede leer ni escribir', async () => {
  const anonimo = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anonimo, 'users/ana/cajas/x')));
  await assertFails(setDoc(doc(anonimo, 'users/ana/cajas/x'), { nombre: 'Gastos' }));
});

it('NO se puede crear una transacción con monto <= 0', async () => {
  const ana = env.authenticatedContext('ana').firestore();
  await assertFails(addDoc(collection(ana, 'users/ana/transacciones'), {
    monto: 0,
    tipo: 'ingreso',
  }));
});

it('SÍ se puede crear una transacción válida (monto > 0 y tipo válido)', async () => {
  const ana = env.authenticatedContext('ana').firestore();
  await assertSucceeds(addDoc(collection(ana, 'users/ana/transacciones'), {
    monto: 100,
    tipo: 'ingreso',
  }));
});
