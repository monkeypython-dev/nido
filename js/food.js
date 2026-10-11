// Alimentos: lista local de comida típica (funciona sin internet) + Open Food Facts (gratis).

// [nombre, kcal/100 g, ración típica (g), nombre de la ración, proteína, carbohidratos, grasas (g/100 g)]
const LOCAL = [
  ['Arroz blanco cocido', 130, 150, 'plato', 2.7, 28, 0.3], ['Arroz integral cocido', 123, 150, 'plato', 2.6, 25.6, 1],
  ['Pasta cocida', 158, 180, 'plato', 5.8, 31, 0.9], ['Pan blanco', 265, 60, 'rebanada grande', 9, 49, 3.2], ['Pan integral', 247, 60, 'rebanada grande', 10, 41, 3.4],
  ['Tostada de pan de molde', 265, 30, 'rebanada', 8, 49, 3.5], ['Patata cocida', 87, 200, 'unidad', 1.9, 20, 0.1], ['Patatas fritas caseras', 312, 150, 'ración', 3.4, 41, 15],
  ['Copos de avena', 379, 40, 'puñado', 13, 60, 7], ['Quinoa cocida', 120, 150, 'plato', 4.4, 21, 1.9], ['Cuscús cocido', 112, 150, 'plato', 3.8, 23, 0.2],
  ['Pechuga de pollo a la plancha', 165, 150, 'filete', 31, 0, 3.6], ['Muslo de pollo asado', 209, 120, 'unidad', 26, 0, 11],
  ['Pavo en lonchas', 104, 50, 'lonchas', 19, 2, 1.5], ['Ternera a la plancha', 217, 150, 'filete', 26, 0, 13], ['Carne picada mixta', 250, 125, 'ración', 17, 0, 20],
  ['Lomo de cerdo plancha', 180, 150, 'filete', 27, 0, 8], ['Jamón serrano', 241, 30, 'lonchas', 31, 0, 13], ['Jamón cocido', 110, 40, 'lonchas', 18, 1.5, 4],
  ['Chorizo', 455, 30, 'rodajas', 24, 2, 38], ['Salmón a la plancha', 208, 150, 'filete', 22, 0, 13], ['Merluza a la plancha', 90, 150, 'filete', 18, 0, 2],
  ['Atún en lata al natural', 116, 56, 'lata', 26, 0, 1], ['Atún en aceite (escurrido)', 198, 56, 'lata', 29, 0, 8], ['Gambas cocidas', 99, 100, 'ración', 21, 0.2, 1.1],
  ['Huevo', 143, 60, 'unidad', 12.6, 0.7, 9.5], ['Clara de huevo', 52, 33, 'unidad', 11, 0.7, 0.2], ['Tortilla de patatas', 190, 150, 'pincho grande', 7, 14, 12],
  ['Tortilla francesa (2 huevos)', 154, 120, 'unidad', 11, 1, 11], ['Lentejas guisadas', 116, 300, 'plato', 7, 17, 2], ['Garbanzos cocidos', 164, 150, 'ración', 8.9, 27, 2.6],
  ['Alubias cocidas', 127, 150, 'ración', 8.7, 23, 0.5], ['Hummus', 166, 50, 'ración', 7.9, 14, 9.6], ['Tofu', 76, 100, 'ración', 8, 1.9, 4.8],
  ['Leche entera', 64, 250, 'vaso', 3.2, 4.7, 3.6], ['Leche semidesnatada', 46, 250, 'vaso', 3.3, 4.8, 1.6], ['Leche desnatada', 35, 250, 'vaso', 3.4, 5, 0.1],
  ['Bebida de avena', 45, 250, 'vaso', 1, 7, 1.5], ['Yogur natural', 61, 125, 'unidad', 3.5, 4.7, 3.3], ['Yogur griego', 115, 125, 'unidad', 6, 4, 9],
  ['Yogur proteico / skyr', 62, 150, 'unidad', 10, 4, 0.2], ['Queso fresco batido 0%', 46, 250, 'tarrina', 8, 3.5, 0.2], ['Queso fresco tipo Burgos', 174, 60, 'porción', 12, 3, 13],
  ['Queso curado', 400, 30, 'cuñas', 32, 0.5, 33], ['Mozzarella', 280, 60, 'porción', 22, 3, 20], ['Proteína whey (polvo)', 380, 30, 'cacito', 78, 8, 5],
  ['Plátano', 89, 120, 'unidad', 1.1, 23, 0.3], ['Manzana', 52, 180, 'unidad', 0.3, 14, 0.2], ['Naranja', 47, 180, 'unidad', 0.9, 12, 0.1], ['Fresas', 32, 150, 'bol', 0.7, 7.7, 0.3],
  ['Uvas', 69, 120, 'racimo pequeño', 0.7, 18, 0.2], ['Kiwi', 61, 75, 'unidad', 1.1, 15, 0.5], ['Pera', 57, 170, 'unidad', 0.4, 15, 0.1], ['Sandía', 30, 300, 'tajada', 0.6, 7.6, 0.2],
  ['Melón', 34, 250, 'tajada', 0.8, 8, 0.2], ['Arándanos', 57, 100, 'bol', 0.7, 14, 0.3], ['Aguacate', 160, 100, 'medio', 2, 9, 15],
  ['Ensalada verde (sin aliñar)', 17, 150, 'plato', 1.4, 3, 0.2], ['Tomate', 18, 150, 'unidad', 0.9, 3.9, 0.2], ['Brócoli cocido', 35, 200, 'ración', 2.4, 7, 0.4],
  ['Verduras a la plancha', 45, 200, 'ración', 1.8, 6, 2], ['Judías verdes cocidas', 31, 200, 'ración', 1.9, 7, 0.1], ['Espinacas cocidas', 23, 150, 'ración', 3, 3.8, 0.3],
  ['Gazpacho', 45, 250, 'vaso', 0.8, 4.5, 2.8], ['Crema de verduras', 50, 300, 'plato', 1.5, 6, 2.3],
  ['Aceite de oliva', 884, 10, 'cucharada', 0, 0, 100], ['Mantequilla', 717, 10, 'porción', 0.9, 0.1, 81], ['Mantequilla de cacahuete', 588, 15, 'cucharada', 25, 20, 50],
  ['Almendras', 579, 30, 'puñado', 21, 22, 50], ['Nueces', 654, 30, 'puñado', 15, 14, 65], ['Chocolate negro 85%', 600, 20, 'onzas', 10, 20, 50],
  ['Chocolate con leche', 535, 20, 'onzas', 7.6, 59, 30], ['Galletas María', 436, 30, '4 galletas', 7, 74, 12], ['Croissant', 406, 60, 'unidad', 8, 46, 21],
  ['Magdalena', 450, 50, 'unidad', 6, 55, 23], ['Cereales de desayuno', 380, 40, 'bol', 7, 80, 3], ['Miel', 304, 15, 'cucharada', 0.3, 82, 0],
  ['Pizza', 266, 300, 'media pizza', 11, 33, 10], ['Hamburguesa completa', 250, 220, 'unidad', 13, 24, 12], ['Kebab', 215, 350, 'unidad', 12, 18, 11],
  ['Sushi (pieza)', 145, 30, 'pieza', 6, 26, 2.5], ['Paella', 160, 300, 'plato', 7, 22, 5], ['Croquetas', 220, 30, 'unidad', 7, 20, 12],
  ['Patatas fritas de bolsa', 536, 40, 'bolsa pequeña', 6, 53, 35], ['Cerveza', 43, 330, 'caña/tercio', 0.5, 3.6, 0], ['Vino tinto', 85, 150, 'copa', 0.1, 2.6, 0],
  ['Refresco de cola', 42, 330, 'lata', 0, 10.6, 0], ['Zumo de naranja', 45, 200, 'vaso', 0.7, 10.4, 0.2], ['Café con leche', 40, 200, 'taza', 1.7, 3, 2],
];

export const LOCAL_FOODS = LOCAL.map(([name, kcal100, portion, portionName, prot100, carb100, fat100]) => ({ name, kcal100, portion, portionName, prot100, carb100, fat100, source: 'local' }));

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
  const g100 = k => { const v = p.nutriments?.[k]; return v != null && isFinite(v) ? Math.round(v * 10) / 10 : null; };
  return { name: brand ? `${name} · ${brand.trim()}` : name, kcal100, prot100: g100('proteins_100g'), carb100: g100('carbohydrates_100g'), fat100: g100('fat_100g'), portion: sq > 0 ? sq : 100, portionName: sq > 0 ? 'ración' : '100 g', source: 'off', code: p.code };
}

const FIELDS = 'code,product_name,product_name_es,brands,nutriments,serving_quantity';

/** Macronutrientes que se registran: clave del registro, clave por 100 g y clave por ración fija. */
export const MACROS = [
  { k: 'protein', per: 'prot100', fix: 'protFixed', l: 'Proteína', s: 'P', c: 'var(--c-run)' },
  { k: 'carbs', per: 'carb100', fix: 'carbFixed', l: 'Carbohidratos', s: 'C', c: 'var(--gold)' },
  { k: 'fat', per: 'fat100', fix: 'fatFixed', l: 'Grasas', s: 'G', c: 'var(--c-cardio)' },
];

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
