// whatsapp-bot - Sesion 6 Academia Catalizadora
// Arquitectura: Twilio (cartero) -> esta edge function (cerebro) -> Claude API -> Mem0 (memoria) -> TwiML de vuelta a Twilio
import "@supabase/functions-js/edge-runtime.d.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";
const MEM0_API_KEY = Deno.env.get("MEM0_API_KEY") ?? "";

// Catalogo REAL de D&M Dosis de Moda (copiado de dosis-de-moda/js/productos.js) - agregado 2026-07-25
const PRODUCTOS = [
  { nombre: "Monedero Coral Cerezas", precio: 28.99, categoria: "mini" },
  { nombre: "Cartera Beige Tejida", precio: 32.50, categoria: "hombro" },
  { nombre: "Cartera Naranja Compacta", precio: 25.00, categoria: "hombro" },
  { nombre: "Cartera Vino Abovedada", precio: 29.99, categoria: "hombro" },
  { nombre: "Cartera Blanca Acolchada", precio: 31.00, categoria: "hombro" },
  { nombre: "Cartera Beige Acolchada", precio: 27.50, categoria: "hombro" },
  { nombre: "Satchel Violeta Ejecutiva", precio: 35.99, categoria: "satchel" },
  { nombre: "Mini Bandolera Pastel", precio: 23.50, categoria: "bandolera" },
  { nombre: "Cartera Rosa Casual", precio: 24.99, categoria: "hombro" },
  { nombre: "Satchel Cuero Cognac", precio: 38.00, categoria: "satchel" },
  { nombre: "Clutch Negra Cadena Dorada", precio: 29.99, categoria: "clutch" },
  { nombre: "Clutch Negra Elegante", precio: 27.50, categoria: "clutch" },
  { nombre: "Tote Camel Minimalista", precio: 26.99, categoria: "tote" },
  { nombre: "Clutch Blanco Satinado", precio: 22.99, categoria: "clutch" },
  { nombre: "Bucket Negro Tejido con Flores", precio: 30.50, categoria: "bucket" },
  { nombre: "Mini Clutch Café Elegante", precio: 25.99, categoria: "mini" },
  { nombre: "Tote Canvas Café", precio: 21.99, categoria: "tote" },
  { nombre: "Clutch Azul Cielo", precio: 33.00, categoria: "clutch" },
  { nombre: "Satchel Cognac Doble Correa", precio: 34.99, categoria: "satchel", nuevo: true },
  { nombre: "Bandolera Café Clásica", precio: 26.50, categoria: "bandolera", nuevo: true },
  { nombre: "Bucket Beige Tejido Artesanal", precio: 31.99, categoria: "bucket", nuevo: true },
  { nombre: "Mini Clutch Rojo Dorado", precio: 23.99, categoria: "mini", nuevo: true },
  { nombre: "Bandolera Vino Crossbody", precio: 28.50, categoria: "bandolera", nuevo: true },
  { nombre: "Satchel Estructurada Clásica", precio: 36.99, categoria: "satchel", nuevo: true },
  { nombre: "Cartera Terracota Minimal", precio: 27.99, categoria: "hombro", nuevo: true },
  { nombre: "Mini Clutch Colección Pastel", precio: 24.50, categoria: "mini", nuevo: true },
  { nombre: "Cartera Roja Acolchada", precio: 29.50, categoria: "hombro", nuevo: true },
  { nombre: "Satchel Café Multibolsillo", precio: 33.99, categoria: "satchel", nuevo: true },
  { nombre: "Bandolera Vaquetilla Animal Print", precio: 27.99, categoria: "bandolera", nuevo: true },
  { nombre: "Bucket Playero Rafia Natural", precio: 30.99, categoria: "bucket", nuevo: true },
  { nombre: "Mini Bolso Floral Azul", precio: 22.99, categoria: "mini", nuevo: true },
  { nombre: "Clutch Tapiz Floral Vintage", precio: 28.99, categoria: "clutch", nuevo: true },
  { nombre: "Tote Blanco Colgado", precio: 24.50, categoria: "tote", nuevo: true },
  { nombre: "Cartera Gris Bicolor", precio: 31.50, categoria: "hombro", nuevo: true },
  { nombre: "Tote Negro Minimalista", precio: 25.99, categoria: "tote", nuevo: true },
  { nombre: "Satchel Cognac Doble Hebilla", precio: 37.50, categoria: "satchel", nuevo: true },
  { nombre: "Mini Bolso Ciruela Elegante", precio: 29.99, categoria: "mini", nuevo: true },
  { nombre: "Bucket Tejido Playero", precio: 26.99, categoria: "bucket", nuevo: true },
  { nombre: "Cartera Beige y Blanca", precio: 28.50, categoria: "hombro", nuevo: true },
  { nombre: "Satchel Verde Oliva y Cuero", precio: 34.50, categoria: "satchel", nuevo: true },
  { nombre: "Bandolera Blanca Cadena Dorada", precio: 27.99, categoria: "bandolera", nuevo: true },
  { nombre: "Bucket Camel Bordado Boho", precio: 30.50, categoria: "bucket", nuevo: true },
  { nombre: "Mini Bolso Negro Acolchado", precio: 23.50, categoria: "mini", nuevo: true },
  { nombre: "Clutch Rojo Fiesta", precio: 26.99, categoria: "clutch", nuevo: true },
];

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // quita acentos
}

function raiz(palabra: string): string {
  // Normaliza plural y genero (negras/negros/negra/negro -> negr; rojas/rojo -> roj)
  return palabra.replace(/(as|os|es|a|o|s)$/, "");
}

const STOPWORDS = new Set([
  "tienen", "tiene", "tienes", "hay", "disponible", "disponibles", "alguna",
  "alguno", "algun", "quiero", "busco", "queria", "necesito", "cuanto", "cuesta",
  "cuestan", "precio", "precios", "para", "por", "una", "unos", "unas", "que",
  "cartera", "carteras", "bolso", "bolsa", "bolsos", "bolsas", // termino generico, no distingue producto
]);

function buscarProductos(query: string): string {
  const palabras = normalizar(query)
    .replace(/[^a-z0-9\s]/g, " ") // quita signos de puntuacion (?,!,.,etc)
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .filter((w) => !STOPWORDS.has(w)) // stopword ANTES de la raiz (ej. "disponibles" ya listado tal cual)
    .map(raiz);

  if (palabras.length === 0) return "";

  // Exige que TODAS las palabras clave coincidan (evita que "cartera" solo traiga cualquier color)
  let encontrados = PRODUCTOS.filter((p) => {
    const texto = normalizar(`${p.nombre} ${p.categoria}`);
    return palabras.every((w) => texto.includes(w));
  });

  // Si nada coincide con todas las palabras, relaja a "al menos una" como respaldo
  if (encontrados.length === 0) {
    encontrados = PRODUCTOS.filter((p) => {
      const texto = normalizar(`${p.nombre} ${p.categoria}`);
      return palabras.some((w) => texto.includes(w));
    });
  }

  if (encontrados.length === 0) return "";
  return encontrados
    .slice(0, 5)
    .map((p) => `- ${p.nombre} (${p.categoria})${p.nuevo ? " [nuevo]" : ""}: $${p.precio.toFixed(2)}`)
    .join("\n");
}

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
