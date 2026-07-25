// whatsapp-bot - Sesion 6 Academia Catalizadora
// Arquitectura: Twilio (cartero) -> esta edge function (cerebro) -> Claude API -> Mem0 (memoria) -> TwiML de vuelta a Twilio
import "@supabase/functions-js/edge-runtime.d.ts";
import { buscarProductos } from "../_shared/catalogo.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";
const MEM0_API_KEY = Deno.env.get("MEM0_API_KEY") ?? "";

const SYSTEM_PROMPT = `Eres el asistente de atencion al cliente de D&M Dosis de Moda, la tienda online de carteras para damas de Roger Soto (con app en Play Store y App Store).

Este bot es SOLO para D&M Dosis de Moda (carteras) - no menciones remesas, envios de dinero a Venezuela, ni ningun otro negocio, aunque el cliente pregunte por eso (si lo hace, dile amablemente que este numero es solo para pedidos de carteras).

Responde SIEMPRE en espanol, corto y directo, como por WhatsApp. Si preguntan por carteras (precio, disponibilidad, pedidos), ayuda con la informacion que tengas en el contexto (catalogo real o memoria de la conversacion). Si no tienes el dato real (por ejemplo un producto que no esta en el catalogo que te paso, o el estado de un pedido ya hecho), dilo honestamente y pide los datos necesarios para verificar - nunca inventes precios ni disponibilidad.

IMPORTANTE: responde UNICAMENTE con el mensaje final para el cliente. Nunca muestres tu razonamiento interno, tus dudas, ni analices el problema paso a paso en la respuesta - eso nunca debe llegar al cliente por WhatsApp. Ve directo al mensaje final, corto y listo para enviar.`;

// Palabras que activan traspaso a un humano (Roger)
const HANDOFF_TRIGGERS = ["precio", "agendar", "no entiendo", "hablar con alguien", "humano"];

function maybeHandoff(message: string): string | null {
  const lower = message.toLowerCase();
  for (const trigger of HANDOFF_TRIGGERS) {
    if (lower.includes(trigger)) {
      console.log(`[handoff] trigger="${trigger}" message="${message}"`);
      return trigger;
    }
  }
  return null;
}

async function getUserMemories(phone: string, query: string): Promise<string> {
  if (!MEM0_API_KEY) return "";
  try {
    const res = await fetch("https://api.mem0.ai/v2/memories/search/", {
      method: "POST",
      headers: {
        Authorization: `Token ${MEM0_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, filters: { AND: [{ user_id: phone }] } }),
    });
    if (!res.ok) return "";
    const data = await res.json();
    const memories = Array.isArray(data) ? data : data.results ?? [];
    return memories.map((m: any) => m.memory).join("\n");
  } catch (err) {
    console.log(`[memories] fetch failed: ${err}`);
    return "";
  }
}

async function askClaude(userMessage: string, memoryContext: string, catalogoContext: string): Promise<string> {
  let contextBlock = memoryContext
    ? `\n\nContexto previo de este cliente (de conversaciones pasadas):\n${memoryContext}`
    : "";
  if (catalogoContext) {
    contextBlock += `\n\nProductos reales de D&M Dosis de Moda que coinciden con la pregunta (precio real, disponibles):\n${catalogoContext}`;
  }

  // Usa el router gratis de OpenRouter (sin costo) en vez de la API paga de Anthropic.
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openrouter/free",
      max_tokens: 400,
      messages: [
        { role: "system", content: SYSTEM_PROMPT + contextBlock },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.log(`[openrouter] error ${res.status}: ${errText}`);
    return "Disculpa, tuve un problema respondiendo ahorita. Roger te va a escribir directo en un momento.";
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "No entendi bien, me lo puedes repetir?";
}

function twimlResponse(message: string): Response {
  const escaped = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
  return new Response(xml, { headers: { "Content-Type": "text/xml" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return twimlResponse("Metodo no soportado.");
  }

  // Twilio manda application/x-www-form-urlencoded - leemos como texto y parseamos
  // manualmente para no depender de que formData() soporte ese content-type.
  let params: URLSearchParams;
  try {
    const rawBody = await req.text();
    params = new URLSearchParams(rawBody);
  } catch (err) {
    console.log(`[parse] error leyendo el body: ${err}`);
    return twimlResponse("Error leyendo el mensaje.");
  }
  const body = (params.get("Body") ?? "").trim();
  const from = params.get("From") ?? "unknown";
  console.log(`[inbound] from="${from}" body="${body}"`);

  if (!body) {
    return twimlResponse("No recibi ningun mensaje.");
  }

  maybeHandoff(body);

  // Ruta deterministica: catalogo de carteras. Si hay coincidencias reales, se listan directo -
  // nunca se le pide al modelo gratis que decida disponibilidad, para no arriesgar que invente.
  const catalogoContext = buscarProductos(body);
  if (catalogoContext) {
    return twimlResponse(
      `Hola! Esto tenemos disponible:\n${catalogoContext}\n\n¿Te interesa alguna? Te puedo ayudar con el pedido.`,
    );
  }

  const memoryContext = await getUserMemories(from, body);
  const reply = await askClaude(body, memoryContext, "");

  return twimlResponse(reply);
});
