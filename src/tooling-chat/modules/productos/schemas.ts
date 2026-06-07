import type { GeminiFunctionDeclaration } from '../../types';

export const PRODUCTOS_SCHEMAS: GeminiFunctionDeclaration[] = [
  {
    name: 'listar_productos',
    description:
      'Lista todos los productos del catálogo con su código, nombre, stock y moneda. ' +
      "Usala para preguntas generales tipo '¿qué productos hay?' o '¿qué quedó con poco stock?'.",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'consultar_precio',
    description:
      'Devuelve los 4 precios finales (markup1..markup4) de un producto, ya convertidos a ARS. ' +
      "Resolvé antes el docId con 'buscar_producto'.",
    parameters: {
      type: 'object',
      properties: {
        docId: {
          type: 'string',
          description: 'docId de Firestore del producto (de buscar_producto).',
        },
      },
      required: ['docId'],
    },
  },
];
