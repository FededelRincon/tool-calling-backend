import { Timestamp } from 'firebase-admin/firestore';
import type { MarkupKey, Producto } from './types';

export const TZ = 'America/Argentina/Buenos_Aires';

/** Formatea un Timestamp de Firestore a fecha/hora local legible. */
export function fmtFecha(ts: Timestamp | null | undefined): string | null {
  if (!ts) return null;
  try {
    return new Intl.DateTimeFormat('es-AR', {
      timeZone: TZ,
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(ts.toDate());
  } catch {
    return null;
  }
}

/** Costo del producto en ARS (convierte si la moneda es USD). */
export function costoEnArs(p: Producto, dolar: number): number {
  return p.moneda === 'USD' ? p.costo * dolar : p.costo;
}

/** Precio final unitario (en ARS) para un nivel de markup dado. */
export function precioFinal(p: Producto, markup: MarkupKey, dolar: number): number {
  return Math.round(costoEnArs(p, dolar) * (1 + p[markup]));
}

/** Resultado de error legible que vuelve al LLM como functionResponse. */
export function errResult(message: string) {
  return { error: message };
}
