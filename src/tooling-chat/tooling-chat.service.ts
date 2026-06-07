import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { ConversationsService } from './conversations.service';
import { executeTool, TOOL_DECLARATIONS } from './modules/registry';
import { buildSystemPrompt } from './system-prompt';
import { TZ } from './utils';
import type {
  GeminiContent,
  GeminiGenerateResponse,
  ToolContext,
  ToolStep,
} from './types';

const MAX_TOOL_ITERATIONS = 6;

@Injectable()
export class ToolingChatService {
  private readonly logger = new Logger(ToolingChatService.name);

  constructor(
    private readonly firebase: FirebaseService,
    private readonly conversations: ConversationsService,
  ) {}

  async chat(message: string, conversationId?: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY no configurada');
    const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const cleanMessage = message.replace(/<[^>]*>/g, ''); // anti-inyección básica
    const nowLabel = new Intl.DateTimeFormat('es-AR', {
      timeZone: TZ,
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date());

    // Memoria: cargar historial (últimos 10) y mapear al formato de Gemini.
    const history = await this.conversations.load(conversationId);
    const contents: GeminiContent[] = [
      ...history.map(
        (m): GeminiContent => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }),
      ),
      { role: 'user', parts: [{ text: cleanMessage }] },
    ];

    const ctx: ToolContext = { db: this.firebase.db };
    const steps: ToolStep[] = [];
    let finalText = '';

    try {
      for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
        const payload = {
          system_instruction: { parts: [{ text: buildSystemPrompt(nowLabel) }] },
          contents,
          tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
          tool_config: { function_calling_config: { mode: 'AUTO' } },
          generationConfig: { temperature: 0.2 },
        };

        const data = await this.callGemini(url, apiKey, payload);
        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts ?? [];
        const functionCalls = parts.filter((p) => p.functionCall);

        if (candidate?.content) contents.push(candidate.content); // guardar turno del modelo

        if (functionCalls.length === 0) {
          finalText = parts
            .map((p) => p.text ?? '')
            .join('')
            .trim();
          break;
        }

        const responseParts: GeminiContent['parts'] = [];
        for (const part of functionCalls) {
          const call = part.functionCall!;
          const result = await executeTool(call.name, call.args ?? {}, ctx);
          steps.push({ tool: call.name, args: call.args ?? {}, result });
          responseParts.push({
            functionResponse: { name: call.name, response: result },
          });
        }
        contents.push({ role: 'user', parts: responseParts });
      }
    } catch (e) {
      // Gemini caído/saturado tras los reintentos: degradamos con elegancia (no persistimos el turno).
      this.logger.warn(`Loop interrumpido: ${(e as Error).message}`);
      return {
        reply:
          'El asistente está temporalmente saturado (límite o demanda de Gemini). ' +
          'Probá de nuevo en unos segundos.',
        steps,
        conversationId: conversationId ?? null,
      };
    }

    if (!finalText) {
      finalText = 'No pude completar la solicitud. ¿Podés reformularla?';
    }

    const savedId = await this.conversations.append(
      conversationId,
      cleanMessage,
      finalText,
    );

    return { reply: finalText, steps, conversationId: savedId };
  }

  /** Llama a Gemini con reintentos ante 429 (rate limit) y 503 (saturación). */
  private async callGemini(
    url: string,
    apiKey: string,
    payload: unknown,
    maxRetries = 3,
  ): Promise<GeminiGenerateResponse> {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(`${url}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) return (await res.json()) as GeminiGenerateResponse;

      const retriable = res.status === 429 || res.status === 503;
      const body = await res.text();
      if (!retriable || attempt >= maxRetries) {
        this.logger.error(`Gemini ${res.status}: ${body}`);
        throw new Error('LLM no disponible');
      }
      const waitMs = 1500 * Math.pow(2, attempt); // 1.5s, 3s, 6s
      this.logger.warn(
        `Gemini ${res.status}, reintento ${attempt + 1}/${maxRetries} en ${waitMs}ms`,
      );
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
}
