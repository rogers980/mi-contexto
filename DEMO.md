# DEMO — Mi OpenClaw (Roger Soto)

Guion para el video de 8 minutos. Graba tu pantalla + tu voz (ej. con el grabador de Windows, Loom, o OBS).

## Link al video
https://drive.google.com/file/d/1gdT5bSUMs_r6_7gJ0xOacu8_hUfkm-lT/view

## Guion (8 minutos)

### 1. El problema (2 min)
"Tengo dos negocios: envío remesas a Venezuela y vendo carteras online (D&M Dosis de Moda). Lo que más tiempo me quita cada semana es responder mensajes de clientes, hacer seguimiento de envíos, y subir productos nuevos — cosas repetitivas que hacía todas a mano."

### 2. Sistema en vivo, con datos reales (3 min)
Muestra en vivo (no simulado):
1. Manda un mensaje real por WhatsApp a tu número de Twilio Sandbox (+1 415 523 8886) preguntando por la tasa de remesas o disponibilidad de una cartera — muestra la respuesta real llegando en segundos.
2. Abre `briefing.md` en tu repo y muestra que se actualizó solo esta mañana con la tasa real del día.
3. Corre `node agents/orchestrator.mjs` y muestra los 3 subagentes respondiendo en paralelo.

### 3. Arquitectura (2 min)
Explica con tus palabras, apoyándote en la Bitácora que ya tienes:
- **Memoria:** CLAUDE.md (reglas fijas) + Mem0 (hechos que cambian, buscable).
- **Herramientas:** MCP (GitHub, filesystem, fetch) + edge functions en Supabase (mi-herramienta, whatsapp-bot).
- **Automatización:** 3 crons en GitHub Actions (briefing diario, extractor de Mem0 nocturno, orquesta de subagentes).
- **Canal de salida:** WhatsApp real vía Twilio, conectado a un asistente que conoce mi negocio.

### 4. Qué sigue (1 min)
"Lo próximo: conectar Gmail de verdad (falta el permiso de lectura), agregar más fuentes de datos a Mem0, y cuando el negocio crezca, pasar del Sandbox de Twilio a un número de WhatsApp Business real."

---

## Checklist antes de grabar
- [ ] Prueba el WhatsApp real una vez antes de grabar (por si el Sandbox de 72h expiró — reconéctate con `join birds-greatest` si hace falta)
- [ ] Ten `mi-contexto` y `mis-agentes` abiertos en el explorador de archivos o VS Code
- [ ] Ten la Bitácora (artifact) abierta en una pestaña para apoyarte en la arquitectura
