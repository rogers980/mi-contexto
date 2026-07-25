// whatsapp-bot - Sesion 6 Academia Catalizadora
// Arquitectura: Twilio (cartero) -> esta edge function (cerebro) -> Claude API -> Mem0 (memoria) -> TwiML de vuelta a Twilio
import "@supabase/functions-js/edge-runtime.d.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";
const MEM0_API_KEY = Deno.env.get("MEM0_API_KEY") ?? "";

const SYSTEM_PROMPT = `Eres el asistente de atencion al cliente de Roger Soto, quien tiene dos negocios:
1. Envios de remesas a Venezuela.
2. D&M Dosis de Moda: tienda online de carteras para damas, con app en Play Store y App Store.

Responde SIEMPRE en espanol, corto y directo, como por WhatsApp. Si preguntan por remesas (tasas, estado de un envio), o por carteras (precio, disponibilidad, pedidos), ayuda con la informacion que tengas en la memoria de la conversacion. Si no tienes el dato real (por ejemplo el estado exacto de un envio o una tasa del dia que no esta en el contexto), dilo honestamente y pide los datos necesarios para verificar - nunca inventes precios, tasas ni estados de pedidos.`;

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

async function askClaude(userMessage: string, memoryContext: string): Promise<string> {
  const contextBlock = memoryContext
    ? `\n\nContexto previo de este cliente (de conversaciones pasadas):\n${memoryContext}`
    : "";

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

  const form = await req.formData();
  const body = String(form.get("Body") ?? "").trim();
  const from = String(form.get("From") ?? "unknown");

  if (!body) {
    return twimlResponse("No recibi ningun mensaje.");
  }

  maybeHandoff(body);

  const memoryContext = await getUserMemories(from, body);
  const reply = await askClaude(body, memoryContext);

  return twimlResponse(reply);
});
