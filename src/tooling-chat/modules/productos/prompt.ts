export const PRODUCTOS_PROMPT = `### PRODUCTOS
Catálogo de la tienda. Cada producto tiene un código (ej. P001), nombre, stock y 4 niveles de
precio (markup1 más barato → markup4 más caro). Los productos en USD se convierten a ARS con la
cotización del dólar.
- Para precios: primero 'buscar_producto' (→ docId) y luego 'consultar_precio'.
- Para vistas generales del catálogo o stock: 'listar_productos'.
- Nunca inventes códigos ni precios; salen de las tools.`;
