import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import type { ChatMessage } from './types';

const COLLECTION = 'conversaciones';
const MAX_MESSAGES = 10; // ventana deslizante: siempre los últimos 10 mensajes

/**
 * Memoria del chat persistida en Firestore. Cada documento (conversationId) guarda un array
 * `messages` capado a los últimos MAX_MESSAGES (FIFO).
 */
@Injectable()
export class ConversationsService {
  constructor(private readonly firebase: FirebaseService) {}

  /** Devuelve los últimos mensajes de una conversación (o [] si no existe). */
  async load(conversationId?: string): Promise<ChatMessage[]> {
    if (!conversationId) return [];
    const doc = await this.firebase.db
      .collection(COLLECTION)
      .doc(conversationId)
      .get();
    if (!doc.exists) return [];
    const messages = (doc.data()?.messages as ChatMessage[] | undefined) ?? [];
    return messages.slice(-MAX_MESSAGES);
  }

  /**
   * Agrega el turno (mensaje del usuario + respuesta del asistente), recorta a los últimos
   * MAX_MESSAGES y guarda. Crea la conversación si no venía id. Devuelve el conversationId.
   */
  async append(
    conversationId: string | undefined,
    userMessage: string,
    assistantMessage: string,
  ): Promise<string> {
    const ref = conversationId
      ? this.firebase.db.collection(COLLECTION).doc(conversationId)
      : this.firebase.db.collection(COLLECTION).doc();

    const now = new Date().toISOString();
    const previous = await this.load(ref.id);
    const messages: ChatMessage[] = [
      ...previous,
      { role: 'user' as const, content: userMessage, timestamp: now },
      { role: 'assistant' as const, content: assistantMessage, timestamp: now },
    ].slice(-MAX_MESSAGES);

    await ref.set({ messages, updatedAt: now }, { merge: true });
    return ref.id;
  }
}
