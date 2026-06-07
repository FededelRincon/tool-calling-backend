import type { Firestore, Timestamp } from 'firebase-admin/firestore';

// --- Contexto que el endpoint arma y pasa a cada handler ---
export interface ToolContext {
  db: Firestore;
}

// Firma común de un handler.
export type ToolHandler = (
  ctx: ToolContext,
  args: unknown,
) => Promise<Record<string, unknown>>;

// --- Declaración de una tool para el LLM (JSON Schema, subconjunto OpenAPI) ---
export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// --- Tipos del protocolo de function calling (Gemini v1beta) ---
export interface GeminiFunctionCall {
  name: string;
  args: Record<string, unknown>;
}
export interface GeminiPart {
  text?: string;
  functionCall?: GeminiFunctionCall;
  functionResponse?: { name: string; response: Record<string, unknown> };
}
export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}
export interface GeminiGenerateResponse {
  candidates?: { content?: GeminiContent; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

// --- Mensaje persistido + paso de tool para la UI ---
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
export interface ToolStep {
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
}

// --- Tipos del dominio (forma real de Firestore) ---
export type MarkupKey = 'markup1' | 'markup2' | 'markup3' | 'markup4';

export interface Producto {
  id: string; // código de negocio, ej. "P001" (NO es el docId de Firestore)
  nombre: string;
  costo: number;
  moneda: 'ARS' | 'USD';
  markup1: number;
  markup2: number;
  markup3: number;
  markup4: number;
  stock: number;
}

export interface LineaVenta {
  id: string; // docId del producto
  productId: string; // código de negocio
  nombre: string;
  cantidad: number;
  precioFinal: number;
  ganancia: number;
  stockAnterior: number;
}

export interface Venta {
  productos: LineaVenta[];
  medioPago: string;
  fecha: Timestamp;
  markup: MarkupKey;
  total: number;
  gananciaTotal: number;
  anulada: boolean;
}

export interface ConfigDolar {
  value: number;
}
