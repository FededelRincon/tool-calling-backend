import type { GeminiFunctionDeclaration } from '../../types';

export const VENTAS_SCHEMAS: GeminiFunctionDeclaration[] = [
  {
    name: 'registrar_venta',
    description:
      'Registra una venta: descuenta stock y calcula total y ganancia. Resolvé el docId de cada ' +
      "producto con 'buscar_producto' antes de llamar. Confirmá al usuario lo registrado.",
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'Productos vendidos.',
          items: {
            type: 'object',
            properties: {
              docId: {
                type: 'string',
                description: 'docId del producto (de buscar_producto).',
              },
              cantidad: {
                type: 'number',
                description: 'Unidades (entero > 0).',
              },
            },
            required: ['docId', 'cantidad'],
          },
        },
        markup: {
          type: 'string',
          description: 'Nivel de precio: markup1 | markup2 | markup3 | markup4.',
        },
        medioPago: {
          type: 'string',
          description: "Ej. 'efectivo'. Default 'efectivo'.",
        },
      },
      required: ['items', 'markup'],
    },
  },
  {
    name: 'listar_ventas',
    description:
      'Lista las últimas ventas (excluye anuladas salvo que se pida lo contrario). ' +
      "Útil para '¿qué vendí hoy?' o 'mostrame las últimas ventas'.",
    parameters: {
      type: 'object',
      properties: {
        limite: { type: 'number', description: 'Cuántas traer (default 10).' },
        incluirAnuladas: {
          type: 'boolean',
          description: 'Si true, incluye anuladas.',
        },
      },
    },
  },
  {
    name: 'anular_venta',
    description:
      'Marca una venta como anulada y repone el stock de sus productos. Pedí confirmación y el ' +
      "id de la venta (de 'listar_ventas') antes de anular.",
    parameters: {
      type: 'object',
      properties: {
        ventaId: { type: 'string', description: 'docId de la venta a anular.' },
      },
      required: ['ventaId'],
    },
  },
  {
    name: 'reporte_ganancias',
    description:
      'Suma total vendido y ganancia en un rango de fechas (ignora anuladas). ' +
      "Para '¿cuánto gané esta semana/este mes?'.",
    parameters: {
      type: 'object',
      properties: {
        desde: {
          type: 'string',
          description: 'Fecha ISO (YYYY-MM-DD) inicio del rango.',
        },
        hasta: {
          type: 'string',
          description: 'Fecha ISO (YYYY-MM-DD) fin del rango.',
        },
      },
      required: ['desde', 'hasta'],
    },
  },
];
