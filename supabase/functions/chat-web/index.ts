// chat-web - Sesion 6 Academia Catalizadora
// Widget de chat para dosis-de-moda (sitio web estatico, otro repo, no este).
// A diferencia de whatsapp-bot, esta funcion es 100% deterministica: solo consulta el
// catalogo real compartido (_shared/catalogo.ts). No llama a ningun LLM, para que nunca
// pueda inventar precio/disponibilidad y no dependa de una key gratuita con rate limit.
import "@supabase/functions-js/edge-runtime.d.ts";
import { buscarProductos } from "../_shared/catalogo.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const FALLBACK_RESPUESTA =
  "No tengo esa información en el catálogo ahora mismo. Escríbenos por WhatsApp al +58 412-7661131 y te ayudamos directo.";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo no soportado." }, 405);
  }

  let mensaje: unknown;
  try {
    const payload = await req.json();
    mensaje = payload?.mensaje;
  } catch (err) {
    console.log(`[parse] error leyendo el body: ${err}`);
    return jsonResponse({ error: "Body invalido, se espera JSON." }, 400);
  }

  if (typeof mensaje !== "string" || mensaje.trim().length === 0) {
    return jsonResponse({ error: "Falta 'mensaje' (string no vacio)." }, 400);
  }

  const catalogoContext = buscarProductos(mensaje);

  if (catalogoContext) {
    return jsonResponse(
      { respuesta: `Esto tenemos disponible:\n${catalogoContext}` },
      200,
    );
  }

  return jsonResponse({ respuesta: FALLBACK_RESPUESTA }, 200);
});
