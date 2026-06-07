import type { GeminiFunctionDeclaration } from '../../types';

export const SHARED_SCHEMAS: GeminiFunctionDeclaration[] = [
  {
    name: 'buscar_producto',
    description:
      "Busca productos por código (ej. 'P001') o por nombre (parcial, ej. 'monitor'). " +
      'Usala SIEMPRE antes de consultar precio, registrar una venta o anular, para resolver el ' +
      'docId real del producto. Devuelve los que matchean con docId, código, nombre, moneda y stock.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Código o parte del nombre del producto.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'obtener_dolar',
    description:
      'Devuelve la cotización actual del dólar (ARS por USD). Necesaria para calcular ' +
      'precios de productos cuya moneda es USD.',
    parameters: { type: 'object', properties: {} },
  },
];
