// Alimentos: lista local de comida típica (funciona sin internet) + Open Food Facts (gratis).

// [nombre, kcal por 100 g, ración típica en g, nombre de la ración]
const LOCAL = [
  ['Arroz blanco cocido', 130, 150, 'plato'], ['Arroz integral cocido', 123, 150, 'plato'],
  ['Pasta cocida', 158, 180, 'plato'], ['Pan blanco', 265, 60, 'rebanada grande'], ['Pan integral', 247, 60, 'rebanada grande'],
  ['Tostada de pan de molde', 265, 30, 'rebanada'], ['Patata cocida', 87, 200, 'unidad'], ['Patatas fritas caseras', 312, 150, 'ración'],
  ['Copos de avena', 379, 40, 'puñado'], ['Quinoa cocida', 120, 150, 'plato'], ['Cuscús cocido', 112, 150, 'plato'],
  ['Pechuga de pollo a la plancha', 165, 150, 'filete'], ['Muslo de pollo asado', 209, 120, 'unidad'],
  ['Pavo en lonchas', 104, 50, 'lonchas'], ['Ternera a la plancha', 217, 150, 'filete'], ['Carne picada mixta', 250, 125, 'ración'],
  ['Lomo de cerdo plancha', 180, 150, 'filete'], ['Jamón serrano', 241, 30, 'lonchas'], ['Jamón cocido', 110, 40, 'lonchas'],
  ['Chorizo', 455, 30, 'rodajas'], ['Salmón a la plancha', 208, 150, 'filete'], ['Merluza a la plancha', 90, 150, 'filete'],
  ['Atún en lata al natural', 116, 56, 'lata'], ['Atún en aceite (escurrido)', 198, 56, 'lata'], ['Gambas cocidas', 99, 100, 'ración'],
  ['Huevo', 143, 60, 'unidad'], ['Clara de huevo', 52, 33, 'unidad'], ['Tortilla de patatas', 190, 150, 'pincho grande'],
  ['Tortilla francesa (2 huevos)', 154, 120, 'unidad'], ['Lentejas guisadas', 116, 300, 'plato'], ['Garbanzos cocidos', 164, 150, 'ración'],
  ['Alubias cocidas', 127, 150, 'ración'], ['Hummus', 166, 50, 'ración'], ['Tofu', 76, 100, 'ración'],
  ['Leche entera', 64, 250, 'vaso'], ['Leche semidesnatada', 46, 250, 'vaso'], ['Leche desnatada', 35, 250, 'vaso'],
  ['Bebida de avena', 45, 250, 'vaso'], ['Yogur natural', 61, 125, 'unidad'], ['Yogur griego', 115, 125, 'unidad'],
  ['Yogur proteico / skyr', 62, 150, 'unidad'], ['Queso fresco batido 0%', 46, 250, 'tarrina'], ['Queso fresco tipo Burgos', 174, 60, 'porción'],
  ['Queso curado', 400, 30, 'cuñas'], ['Mozzarella', 280, 60, 'porción'], ['Proteína whey (polvo)', 380, 30, 'cacito'],
  ['Plátano', 89, 120, 'unidad'], ['Manzana', 52, 180, 'unidad'], ['Naranja', 47, 180, 'unidad'], ['Fresas', 32, 150, 'bol'],
  ['Uvas', 69, 120, 'racimo pequeño'], ['Kiwi', 61, 75, 'unidad'], ['Pera', 57, 170, 'unidad'], ['Sandía', 30, 300, 'tajada'],
  ['Melón', 34, 250, 'tajada'], ['Arándanos', 57, 100, 'bol'], ['Aguacate', 160, 100, 'medio'],
  ['Ensalada verde (sin aliñar)', 17, 150, 'plato'], ['Tomate', 18, 150, 'unidad'], ['Brócoli cocido', 35, 200, 'ración'],
  ['Verduras a la plancha', 45, 200, 'ración'], ['Judías verdes cocidas', 31, 200, 'ración'], ['Espinacas cocidas', 23, 150, 'ración'],
  ['Gazpacho', 45, 250, 'vaso'], ['Crema de verduras', 50, 300, 'plato'],
  ['Aceite de oliva', 884, 10, 'cucharada'], ['Mantequilla', 717, 10, 'porción'], ['Mantequilla de cacahuete', 588, 15, 'cucharada'],
  ['Almendras', 579, 30, 'puñado'], ['Nueces', 654, 30, 'puñado'], ['Chocolate negro 85%', 600, 20, 'onzas'],
  ['Chocolate con leche', 535, 20, 'onzas'], ['Galletas María', 436, 30, '4 galletas'], ['Croissant', 406, 60, 'unidad'],
  ['Magdalena', 450, 50, 'unidad'], ['Cereales de desayuno', 380, 40, 'bol'], ['Miel', 304, 15, 'cucharada'],
  ['Pizza', 266, 300, 'media pizza'], ['Hamburguesa completa', 250, 220, 'unidad'], ['Kebab', 215, 350, 'unidad'],
  ['Sushi (pieza)', 145, 30, 'pieza'], ['Paella', 160, 300, 'plato'], ['Croquetas', 220, 30, 'unidad'],
  ['Patatas fritas de bolsa', 536, 40, 'bolsa pequeña'], ['Cerveza', 43, 330, 'caña/tercio'], ['Vino tinto', 85, 150, 'copa'],
  ['Refresco de cola', 42, 330, 'lata'], ['Zumo de naranja', 45, 200, 'vaso'], ['Café con leche', 40, 200, 'taza'],
];

export const LOCAL_FOODS = LOCAL.map(([name, kcal100, portion, portionName]) => ({ name, kcal100, portion, portionName, source: 'local' }));

const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function searchLocal(q, extra = []) {
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const all = [...extra, ...LOCAL_FOODS];
  const seen = new Set();
  return all.filter(f => {
    const n = norm(f.name);
    if (seen.has(n)) return false;
    const ok = terms.every(t => n.includes(t));
    if (ok) seen.add(n);
    return ok;
  }).slice(0, 15);
}

function kcalFrom(nutr) {
  if (!nutr) return null;
  let k = nutr['energy-kcal_100g'];
  if (k == null && nutr['energy_100g'] != null) k = nutr['energy_100g'] / 4.184;
  if (k == null && nutr['energy-kj_100g'] != null) k = nutr['energy-kj_100g'] / 4.184;
  return k != null && isFinite(k) ? Math.round(k) : null;
}

function mapProduct(p) {
  const kcal100 = kcalFrom(p.nutriments);
  if (kcal100 == null) return null;
  const name = p.product_name_es || p.product_name || 'Producto sin nombre';
  const brand = Array.isArray(p.brands) ? p.brands[0] : (p.brands || '').split(',')[0];
  const sq = parseFloat(p.serving_quantity);
  return { name: brand ? `${name} · ${brand.trim()}` : name, kcal100, portion: sq > 0 ? sq : 100, portionName: sq > 0 ? 'ración' : '100 g', source: 'off', code: p.code };
}

const FIELDS = 'code,product_name,product_name_es,brands,nutriments,serving_quantity';

async function fetchJSON(url, ms = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

/** Busca en Open Food Facts priorizando productos vendidos en España. */
export async function searchOFF(q) {
  const enc = encodeURIComponent;
  const d = await fetchJSON(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${enc(q)}&search_simple=1&action=process&json=1&page_size=25&cc=es&lc=es&fields=${FIELDS}`, 20000);
  return dedupe((d.products || []).map(mapProduct).filter(Boolean));
}

function dedupe(arr) {
  const seen = new Set();
  return arr.filter(f => { const k = norm(f.name) + f.kcal100; if (seen.has(k)) return false; seen.add(k); return true; });
}

export async function lookupBarcode(code) {
  const d = await fetchJSON(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`);
  if (d.status !== 1 || !d.product) return null;
  return mapProduct({ ...d.product, code });
}

export const MEALS = [
  { id: 'desayuno', l: 'Desayuno', ic: 'coffee', c: '#d97706' },
  { id: 'comida', l: 'Comida', ic: 'soup', c: '#10a37f' },
  { id: 'merienda', l: 'Merienda', ic: 'apple', c: '#e64980' },
  { id: 'cena', l: 'Cena', ic: 'moon', c: '#6d5efc' },
  { id: 'snack', l: 'Picoteo', ic: 'cookie', c: '#a16207' },
];

export function defaultMeal(date = new Date()) {
  const h = date.getHours();
  if (h < 11) return 'desayuno';
  if (h < 16) return 'comida';
  if (h < 19) return 'merienda';
  if (h < 23) return 'cena';
  return 'snack';
}
