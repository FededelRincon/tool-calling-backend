import { z } from 'zod';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type {
  ToolContext,
  ToolHandler,
  Producto,
  Venta,
  LineaVenta,
} from '../../types';
import { errResult, costoEnArs, fmtFecha } from '../../utils';

const MARKUPS = ['markup1', 'markup2', 'markup3', 'markup4'] as const;

const registrarVentaArgs = z.object({
  items: z
    .array(
      z.object({
        docId: z.string().min(1),
        cantidad: z.number().int().positive(),
      }),
    )
    .min(1),
  markup: z.enum(MARKUPS),
  medioPago: z.string().default('efectivo'),
});

async function registrarVenta(ctx: ToolContext, raw: unknown) {
  const { items, markup, medioPago } = registrarVentaArgs.parse(raw);
  const dolarDoc = await ctx.db.collection('configuraciones').doc('dolar').get();
  const dolar = (dolarDoc.data()?.value as number | undefined) ?? 1;

  const result = await ctx.db.runTransaction(async (tx) => {
    // 1) LECTURAS (todas antes de cualquier escritura)
    const refs = items.map((it) => ctx.db.collection('productos').doc(it.docId));
    const snaps = await tx.getAll(...refs);

    const lineas: LineaVenta[] = [];
    const stockUpdates: { ref: (typeof refs)[number]; stock: number }[] = [];
    let total = 0;
    let gananciaTotal = 0;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const snap = snaps[i];
      if (!snap.exists) throw new Error(`Producto ${it.docId} inexistente.`);
      const p = snap.data() as Producto;
      if (p.stock < it.cantidad) {
        throw new Error(`Stock insuficiente de ${p.nombre} (hay ${p.stock}).`);
      }

      const costoArs = costoEnArs(p, dolar);
      const precioU = Math.round(costoArs * (1 + p[markup]));
      const gananciaU = precioU - costoArs;

      lineas.push({
        id: it.docId,
        productId: p.id,
        nombre: p.nombre,
        cantidad: it.cantidad,
        precioFinal: precioU,
        ganancia: gananciaU,
        stockAnterior: p.stock,
      });
      total += precioU * it.cantidad;
      gananciaTotal += gananciaU * it.cantidad;
      stockUpdates.push({ ref: refs[i], stock: p.stock - it.cantidad });
    }

    // 2) ESCRITURAS
    for (const u of stockUpdates) tx.update(u.ref, { stock: u.stock });
    const ventaRef = ctx.db.collection('ventas').doc();
    tx.set(ventaRef, {
      productos: lineas,
      medioPago,
      markup,
      total,
      gananciaTotal,
      anulada: false,
      fecha: FieldValue.serverTimestamp(),
    });
    return { ventaId: ventaRef.id, total, gananciaTotal };
  });

  return { ...result, mensaje: 'Venta registrada y stock actualizado.' };
}

const listarVentasArgs = z.object({
  limite: z.number().int().positive().optional(),
  incluirAnuladas: z.boolean().optional(),
});

async function listarVentas(ctx: ToolContext, raw: unknown) {
  const { limite = 10, incluirAnuladas = false } = listarVentasArgs.parse(raw);
  const snap = await ctx.db
    .collection('ventas')
    .orderBy('fecha', 'desc')
    .limit(limite)
    .get();
  const ventas = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Venta) }))
    .filter((v) => incluirAnuladas || !v.anulada)
    .map((v) => ({
      id: v.id,
      fecha: fmtFecha(v.fecha),
      total: v.total,
      gananciaTotal: v.gananciaTotal,
      medioPago: v.medioPago,
      anulada: v.anulada,
      items: v.productos.length,
    }));
  return { ventas };
}

const anularVentaArgs = z.object({ ventaId: z.string().min(1) });

async function anularVenta(ctx: ToolContext, raw: unknown) {
  const { ventaId } = anularVentaArgs.parse(raw);
  return await ctx.db.runTransaction(async (tx) => {
    const ref = ctx.db.collection('ventas').doc(ventaId);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error('La venta no existe.');
    const v = snap.data() as Venta;
    if (v.anulada) return errResult('Esa venta ya estaba anulada.');

    // 1) LECTURAS: ubicar cada producto por código de negocio (productId).
    const productSnaps = await Promise.all(
      v.productos.map((l) =>
        tx.get(
          ctx.db.collection('productos').where('id', '==', l.productId).limit(1),
        ),
      ),
    );

    // 2) ESCRITURAS: reponer stock + marcar anulada.
    v.productos.forEach((l, i) => {
      const pdoc = productSnaps[i].docs[0];
      if (pdoc) {
        tx.update(pdoc.ref, {
          stock: (pdoc.data() as Producto).stock + l.cantidad,
        });
      }
    });
    tx.update(ref, { anulada: true });
    return { ventaId, mensaje: 'Venta anulada y stock repuesto.' };
  });
}

const reporteArgs = z.object({ desde: z.string(), hasta: z.string() });

async function reporteGanancias(ctx: ToolContext, raw: unknown) {
  const { desde, hasta } = reporteArgs.parse(raw);
  const tDesde = Timestamp.fromDate(new Date(`${desde}T00:00:00-03:00`));
  const tHasta = Timestamp.fromDate(new Date(`${hasta}T23:59:59-03:00`));
  const snap = await ctx.db
    .collection('ventas')
    .where('fecha', '>=', tDesde)
    .where('fecha', '<=', tHasta)
    .get();
  const validas = snap.docs
    .map((d) => d.data() as Venta)
    .filter((v) => !v.anulada);
  return {
    desde,
    hasta,
    cantidadVentas: validas.length,
    totalVendido: validas.reduce((a, v) => a + v.total, 0),
    gananciaTotal: validas.reduce((a, v) => a + v.gananciaTotal, 0),
  };
}

export const VENTAS_HANDLERS: Record<string, ToolHandler> = {
  registrar_venta: registrarVenta,
  listar_ventas: listarVentas,
  anular_venta: anularVenta,
  reporte_ganancias: reporteGanancias,
};
