# Backend — Asistente con Tool Calling (NestJS)

Motor de *tool calling* sobre Cloud Firestore con Gemini. Expone un único endpoint
`POST /tooling-chat` que corre el loop agéntico: el modelo elige herramientas, el backend las
ejecuta contra Firestore y devuelve la respuesta + los pasos.

Ver el [README raíz](../README.md) para la visión completa y el diagrama de arquitectura.

## Setup

```bash
npm install
# colocá tu serviceAccountKey.json en back/secrets/
cp .env.example .env        # completá GEMINI_API_KEY
npm run start:dev           # http://localhost:3001
```

## Endpoint

`POST /tooling-chat`
```jsonc
// request
{ "message": "¿cuánto sale el monitor con markup3?", "conversationId": "opcional" }
// response
{ "reply": "…", "steps": [{ "tool": "...", "args": {}, "result": {} }], "conversationId": "..." }
```

## Estructura (`src/`)

- `firebase/firebase.service.ts` — inicializa el Admin SDK, expone Firestore.
- `tooling-chat/modules/` — un módulo por dominio (`shared`, `productos`, `ventas`): cada uno con
  `schemas` (menú para el LLM), `handlers` (la ejecución, con validación Zod) y `prompt`.
- `tooling-chat/modules/registry.ts` — junta todo y expone `executeTool` (dispatcher).
- `tooling-chat/tooling-chat.service.ts` — **el loop agéntico** (único y genérico).
- `tooling-chat/conversations.service.ts` — memoria (últimos 10 mensajes en Firestore).

**Agregar un dominio** = nuevo `modules/<nombre>/` + 2 líneas en `registry.ts`.

## Scripts

- `npm run inspect:db` — lista colecciones y documentos de Firestore.
- `npm run seed:db` — **resetea** la DB a un estado demo (⚠️ borra y recrea productos/ventas).
