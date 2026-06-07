import { z } from 'zod';
import type { ToolContext, ToolHandler, Producto } from '../../types';
import { errResult } from '../../utils';

const buscarProductoArgs = z.object({ query: z.string().min(1) });

async function buscarProducto(ctx: ToolContext, raw: unknown) {
  const { query } = buscarProductoArgs.parse(raw);
  const snap = await ctx.db.collection('productos').get();
  const q = query.trim().toLowerCase();
  const matches = snap.docs
    .map((d) => ({ docId: d.id, ...(d.data() as Producto) }))
    .filter(
      (p) => p.id.toLowerCase() === q || p.nombre.toLowerCase().includes(q),
    );
  if (matches.length === 0) {
    return errResult(`No encontré productos para "${query}".`);
  }
  return {
    resultados: matches.map((p) => ({
      docId: p.docId,
      codigo: p.id,
      nombre: p.nombre,
      moneda: p.moneda,
      stock: p.stock,
    })),
  };
}

async function obtenerDolar(ctx: ToolContext) {
  const doc = await ctx.db.collection('configuraciones').doc('dolar').get();
  const value = doc.data()?.value as number | undefined;
  if (value == null) return errResult('No hay cotización del dólar configurada.');
  return { dolar: value };
}

export const SHARED_HANDLERS: Record<string, ToolHandler> = {
  buscar_producto: buscarProducto,
  obtener_dolar: obtenerDolar,
};
