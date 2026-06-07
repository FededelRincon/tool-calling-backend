/**
 * Prueba los handlers de tools contra la DB real, sin pasar por Gemini.
 * Solo ejecuta tools de LECTURA (no muta datos).
 *
 * Uso:  npx ts-node scripts/test-tools.ts
 */
import * as admin from 'firebase-admin';
import * as path from 'path';
import { executeTool } from '../src/tooling-chat/modules/registry';
import type { ToolContext } from '../src/tooling-chat/types';

const keyPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ?? './secrets/serviceAccountKey.json';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const serviceAccount = require(path.resolve(keyPath)) as admin.ServiceAccount;
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const ctx: ToolContext = { db: admin.firestore() };

async function run(name: string, args: Record<string, unknown>) {
  const result = await executeTool(name, args, ctx);
  console.log(`\n>>> ${name}(${JSON.stringify(args)})`);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  await run('obtener_dolar', {});
  const buscar = (await run('buscar_producto', { query: 'monitor' })) as {
    resultados?: { docId: string }[];
  };
  const docId = buscar.resultados?.[0]?.docId;
  if (docId) await run('consultar_precio', { docId });
  await run('listar_productos', {});
  await run('listar_ventas', { limite: 3 });
  await run('reporte_ganancias', { desde: '2024-01-01', hasta: '2026-12-31' });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
