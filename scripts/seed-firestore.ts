/**
 * Resetea la base Firestore a un estado demo conocido.
 * Útil porque las tools de escritura (registrar/anular venta) mutan datos reales.
 *
 * Borra y recrea: configuraciones/dolar, productos (10) y ventas (de ejemplo).
 *
 * Uso:  npm run seed:db
 */
import * as admin from 'firebase-admin';
import * as path from 'path';
import { costoEnArs, precioFinal } from '../src/tooling-chat/utils';
import type { LineaVenta, MarkupKey, Producto } from '../src/tooling-chat/types';

const keyPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ?? './secrets/serviceAccountKey.json';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const serviceAccount = require(path.resolve(keyPath)) as admin.ServiceAccount;
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const DOLAR = 1100;

const PRODUCTOS: Producto[] = [
  { id: 'P001', nombre: 'Monitor LED 24"', costo: 150, moneda: 'USD', markup1: 0.3, markup2: 0.45, markup3: 0.6, markup4: 0.75, stock: 25 },
  { id: 'P002', nombre: 'Teclado Mecánico RGB', costo: 45000, moneda: 'ARS', markup1: 0.35, markup2: 0.5, markup3: 0.65, markup4: 0.8, stock: 50 },
  { id: 'P003', nombre: 'Mouse Gaming', costo: 35, moneda: 'USD', markup1: 0.4, markup2: 0.55, markup3: 0.7, markup4: 0.85, stock: 100 },
  { id: 'P004', nombre: 'Auriculares Bluetooth', costo: 28000, moneda: 'ARS', markup1: 0.45, markup2: 0.6, markup3: 0.75, markup4: 0.9, stock: 30 },
  { id: 'P005', nombre: 'Webcam HD', costo: 55, moneda: 'USD', markup1: 0.25, markup2: 0.4, markup3: 0.55, markup4: 0.7, stock: 40 },
  { id: 'P006', nombre: 'Mousepad XL', costo: 15000, moneda: 'ARS', markup1: 0.5, markup2: 0.65, markup3: 0.8, markup4: 0.95, stock: 75 },
  { id: 'P007', nombre: 'SSD 500GB', costo: 80, moneda: 'USD', markup1: 0.3, markup2: 0.45, markup3: 0.6, markup4: 0.75, stock: 60 },
  { id: 'P008', nombre: 'Memoria RAM 8GB', costo: 42000, moneda: 'ARS', markup1: 0.35, markup2: 0.5, markup3: 0.65, markup4: 0.8, stock: 45 },
  { id: 'P009', nombre: 'Gabinete ATX', costo: 120, moneda: 'USD', markup1: 0.4, markup2: 0.55, markup3: 0.7, markup4: 0.85, stock: 15 },
  { id: 'P010', nombre: 'Fuente 600W', costo: 65000, moneda: 'ARS', markup1: 0.45, markup2: 0.6, markup3: 0.75, markup4: 0.9, stock: 20 },
];

// Ventas de ejemplo (por código de producto), para que los reportes no estén vacíos.
const VENTAS_EJEMPLO: {
  items: { codigo: string; cantidad: number }[];
  markup: MarkupKey;
  medioPago: string;
}[] = [
  { items: [{ codigo: 'P002', cantidad: 1 }, { codigo: 'P003', cantidad: 1 }], markup: 'markup1', medioPago: 'efectivo' },
  { items: [{ codigo: 'P006', cantidad: 2 }], markup: 'markup2', medioPago: 'tarjeta' },
  { items: [{ codigo: 'P001', cantidad: 1 }], markup: 'markup3', medioPago: 'efectivo' },
];

async function clearCollection(name: string) {
  const snap = await db.collection(name).get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  console.log(`  ${name}: borrados ${snap.size} docs`);
}

async function main() {
  console.log('Limpiando colecciones…');
  await clearCollection('productos');
  await clearCollection('ventas');
  await clearCollection('configuraciones');

  console.log('Cargando dólar y productos…');
  await db.collection('configuraciones').doc('dolar').set({ value: DOLAR });

  const codigoToRef = new Map<string, string>(); // codigo -> docId
  for (const p of PRODUCTOS) {
    const ref = db.collection('productos').doc();
    await ref.set(p);
    codigoToRef.set(p.id, ref.id);
  }
  console.log(`  productos: creados ${PRODUCTOS.length}`);

  console.log('Cargando ventas de ejemplo…');
  for (const v of VENTAS_EJEMPLO) {
    const lineas: LineaVenta[] = [];
    let total = 0;
    let gananciaTotal = 0;
    for (const it of v.items) {
      const p = PRODUCTOS.find((x) => x.id === it.codigo)!;
      const precioU = precioFinal(p, v.markup, DOLAR);
      const gananciaU = precioU - costoEnArs(p, DOLAR);
      lineas.push({
        id: codigoToRef.get(p.id)!,
        productId: p.id,
        nombre: p.nombre,
        cantidad: it.cantidad,
        precioFinal: precioU,
        ganancia: gananciaU,
        stockAnterior: p.stock,
      });
      total += precioU * it.cantidad;
      gananciaTotal += gananciaU * it.cantidad;
    }
    await db.collection('ventas').add({
      productos: lineas,
      medioPago: v.medioPago,
      markup: v.markup,
      total,
      gananciaTotal,
      anulada: false,
      fecha: admin.firestore.Timestamp.now(),
    });
  }
  console.log(`  ventas: creadas ${VENTAS_EJEMPLO.length}`);
  console.log('\n✔ Seed completo.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Error en el seed:', e);
    process.exit(1);
  });
