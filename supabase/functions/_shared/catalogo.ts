// _shared/catalogo.ts
// Logica de catalogo de D&M Dosis de Moda, compartida entre whatsapp-bot y chat-web.
// Extraido tal cual de whatsapp-bot/index.ts (Sesion 6) para reusar sin duplicar -
// no se cambio ninguna regla de matching ni el formato de salida.

export interface Producto {
  nombre: string;
  precio: number;
  categoria: string;
  nuevo?: boolean;
}

// Catalogo REAL de D&M Dosis de Moda (copiado de dosis-de-moda/js/productos.js) - agregado 2026-07-25
export const PRODUCTOS: Producto[] = [
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

export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // quita acentos
}

export function raiz(palabra: string): string {
  // Normaliza plural y genero (negras/negros/negra/negro -> negr; rojas/rojo -> roj)
  return palabra.replace(/(as|os|es|a|o|s)$/, "");
}

export const STOPWORDS = new Set([
  "tienen", "tiene", "tienes", "hay", "disponible", "disponibles", "alguna",
  "alguno", "algun", "quiero", "busco", "queria", "necesito", "cuanto", "cuesta",
  "cuestan", "precio", "precios", "para", "por", "una", "unos", "unas", "que",
  "cartera", "carteras", "bolso", "bolsa", "bolsos", "bolsas", // termino generico, no distingue producto
]);

export function buscarProductos(query: string): string {
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
