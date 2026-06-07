import { z } from 'zod';
import type {
  GeminiFunctionDeclaration,
  ToolContext,
  ToolHandler,
} from '../types';
import { SHARED_SCHEMAS, SHARED_HANDLERS } from './shared';
import {
  PRODUCTOS_SCHEMAS,
  PRODUCTOS_HANDLERS,
  PRODUCTOS_PROMPT,
} from './productos';
import { VENTAS_SCHEMAS, VENTAS_HANDLERS, VENTAS_PROMPT } from './ventas';
// ...importar cada módulo nuevo acá

// MENÚ total que ve el LLM
export const TOOL_DECLARATIONS: GeminiFunctionDeclaration[] = [
  ...SHARED_SCHEMAS,
  ...PRODUCTOS_SCHEMAS,
  ...VENTAS_SCHEMAS,
];

// COCINA total (privada)
const HANDLERS: Record<string, ToolHandler> = {
  ...SHARED_HANDLERS,
  ...PRODUCTOS_HANDLERS,
  ...VENTAS_HANDLERS,
};

// Fragmentos de prompt por módulo (los pega system-prompt.ts)
export const PROMPT_FRAGMENTS: string[] = [PRODUCTOS_PROMPT, VENTAS_PROMPT];

// Dispatcher: busca por name y ejecuta. Errores legibles ante tool desconocida / args / excepción.
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, unknown>> {
  const handler = HANDLERS[name];
  if (!handler) return { error: `Herramienta desconocida: ${name}` };
  try {
    return await handler(ctx, args);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return {
        error: `Argumentos inválidos para ${name}: ${e.issues
          .map((i) => i.message)
          .join(', ')}`,
      };
    }
    return {
      error: e instanceof Error ? e.message : 'Error ejecutando la herramienta',
    };
  }
}
