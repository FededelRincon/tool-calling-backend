import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import type { Firestore } from 'firebase-admin/firestore';
import * as path from 'path';

/**
 * Inicializa el Firebase Admin SDK con la cuenta de servicio y expone Firestore.
 * La ruta al JSON sale de GOOGLE_APPLICATION_CREDENTIALS (./secrets/serviceAccountKey.json).
 */
@Injectable()
export class FirebaseService implements OnModuleInit {
  private _db!: Firestore;

  onModuleInit() {
    if (!admin.apps.length) {
      const keyPath =
        process.env.GOOGLE_APPLICATION_CREDENTIALS ??
        './secrets/serviceAccountKey.json';
      // CommonJS: require funciona; mismo enfoque que el script inspect-firestore.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const serviceAccount = require(path.resolve(keyPath)) as admin.ServiceAccount;
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    this._db = admin.firestore();
  }

  get db(): Firestore {
    return this._db;
  }
}
