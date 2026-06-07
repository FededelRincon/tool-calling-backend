import { z } from 'zod';
import type { ToolContext, ToolHandler, Producto } from '../../types';
import { errResult, precioFinal } from '../../utils';

async function listarProductos(ctx: ToolContext) {
  const snap = await ctx.db.collection('productos').get();
  return {
    productos: snap.docs.map((d) => {
      const p = d.data() as Producto;
      return {
        docId: d.id,
        codigo: p.id,
        nombre: p.nombre,
        moneda: p.moneda,
        stock: p.stock,
      };
    }),
  };
}

const consultarPrecioArgs = z.object({ docId: z.string().min(1) });

async function consultarPrecio(ctx: ToolContext, raw: unknown) {
  const { docId } = consultarPrecioArgs.parse(raw);
  const doc = await ctx.db.collection('productos').doc(docId).get();
  if (!doc.exists) {
    return errResult('No existe ese producto (revisá el docId con buscar_producto).');
  }
  const p = doc.data() as Producto;
  const dolarDoc = await ctx.db.collection('configuraciones').doc('dolar').get();
  const dolar = (dolarDoc.data()?.value as number | undefined) ?? 1;
  return {
    nombre: p.nombre,
    codigo: p.id,
    moneda: p.moneda,
    stock: p.stock,
    precios: {
      markup1: precioFinal(p, 'markup1', dolar),
      markup2: precioFinal(p, 'markup2', dolar),
      markup3: precioFinal(p, 'markup3', dolar),
      markup4: precioFinal(p, 'markup4', dolar),
    },
  };
}

export const PRODUCTOS_HANDLERS: Record<string, ToolHandler> = {
  listar_productos: listarProductos,
  consultar_precio: consultarPrecio,
};
