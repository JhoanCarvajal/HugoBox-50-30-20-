/// <reference types="node" />
import { initializeTestEnvironment, assertFails, assertSucceeds }
  from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection,
} from 'firebase/firestore';
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
  await assertFails(addDoc(collection(ana, 'users/ana/transacciones'), {
    monto: -50,
    tipo: 'ingreso',
  }));
});

it('NO se puede crear una transacción con tipo inválido', async () => {
  const ana = env.authenticatedContext('ana').firestore();
  await assertFails(addDoc(collection(ana, 'users/ana/transacciones'), {
    monto: 100,
    tipo: 'transferencia', // monto válido, pero tipo fuera de ['ingreso','egreso']
  }));
});

it('SÍ se puede crear una transacción válida (monto > 0 y tipo válido)', async () => {
  const ana = env.authenticatedContext('ana').firestore();
  await assertSucceeds(addDoc(collection(ana, 'users/ana/transacciones'), {
    monto: 100,
    tipo: 'ingreso',
  }));
});

it('un usuario NO puede leer el documento raíz de otro', async () => {
  const ana = env.authenticatedContext('ana').firestore();
  await assertFails(getDoc(doc(ana, 'users/beto')));
});

it('un usuario NO puede escribir cajas de otro', async () => {
  const ana = env.authenticatedContext('ana').firestore();
  await assertFails(setDoc(doc(ana, 'users/beto/cajas/x'), {
    nombre: 'Gastos', porcentaje: 50, saldo: 0, esPorDefecto: true, orden: 0, createdAt: 1,
  }));
});

it('un usuario NO puede leer ni crear transacciones de otro', async () => {
  const ana = env.authenticatedContext('ana').firestore();
  await assertFails(getDoc(doc(ana, 'users/beto/transacciones/x')));
  await assertFails(addDoc(collection(ana, 'users/beto/transacciones'), {
    monto: 100, tipo: 'ingreso',
  }));
});

it('un usuario SÍ puede actualizar y borrar sus propias transacciones', async () => {
  // Se siembra el doc con reglas deshabilitadas para aislar el caso a update/delete.
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users/ana/transacciones/propia'), {
      monto: 100, tipo: 'ingreso',
    });
  });
  const ana = env.authenticatedContext('ana').firestore();
  await assertSucceeds(updateDoc(doc(ana, 'users/ana/transacciones/propia'), { descripcion: 'editada' }));
  await assertSucceeds(deleteDoc(doc(ana, 'users/ana/transacciones/propia')));
});

it('un usuario NO puede actualizar ni borrar transacciones de otro', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users/beto/transacciones/ajena'), {
      monto: 100, tipo: 'ingreso',
    });
  });
  const ana = env.authenticatedContext('ana').firestore();
  await assertFails(updateDoc(doc(ana, 'users/beto/transacciones/ajena'), { descripcion: 'hackeada' }));
  await assertFails(deleteDoc(doc(ana, 'users/beto/transacciones/ajena')));
});
