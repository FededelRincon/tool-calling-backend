/**
 * Script standalone de inspección de Cloud Firestore.
 *
 * Se conecta con la cuenta de servicio (Admin SDK) y lista las colecciones raíz
 * con una muestra de documentos, para conocer la estructura real de la DB del
 * ejercicio antes de escribir los módulos de tools.
 *
 * Solo LEE. No escribe nada en la base.
 *
 * Uso:  npm run inspect:db
 */
import * as admin from 'firebase-admin';
import * as path from 'path';

const keyPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ?? './secrets/serviceAccountKey.json';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const serviceAccount = require(path.resolve(keyPath)) as admin.ServiceAccount;

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const SAMPLE_SIZE = 3;

async function describeCollection(
  col: admin.firestore.CollectionReference,
  indent = '',
): Promise<void> {
  // total real de documentos (aggregate query, no descarga los docs)
  let total = '?';
  try {
    const agg = await col.count().get();
    total = String(agg.data().count);
  } catch {
    /* count() puede no estar disponible; seguimos con la muestra */
  }

  const snap = await col.limit(SAMPLE_SIZE).get();
  console.log(`\n${indent}=== ${col.path}  (total: ${total}, muestra: ${snap.size}) ===`);

  for (const doc of snap.docs) {
    console.log(`${indent}· ${doc.id}: ${JSON.stringify(doc.data())}`);

    // descubrir subcolecciones de este documento de muestra
    const subs = await doc.ref.listCollections();
    for (const sub of subs) {
      await describeCollection(sub, indent + '    ');
    }
  }
}

async function main(): Promise<void> {
  const cols = await db.listCollections();
  if (cols.length === 0) {
    console.log('La base no tiene colecciones raíz (¿proyecto/credencial correctos?).');
    return;
  }
  console.log(`Colecciones raíz encontradas: ${cols.map((c) => c.id).join(', ')}`);
  for (const col of cols) {
    await describeCollection(col);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Error inspeccionando Firestore:', e);
    process.exit(1);
  });
