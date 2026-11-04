// Reads data/flipkart_data.csv and turns it into clean product records.
//
// The raw file has a few quirks this loader deals with:
//   * fields are separated by ", " and an unquoted comma inside a product name spills the
//     name across several fields; the export then cut each row to 8 fields, so those rows
//     lost their trailing stock / image values
//   * the same product id appears several times (only stock differs) -> kept once
//   * there is no category column -> derived from the 3-letter Flipkart id prefix
import fs from 'node:fs';

// ---- category mapping: Flipkart id prefix -> [category, sub-type] ------------------------
const CATEGORY_MAP = {
  'Staples & Grains': {
    FLR: 'flour', RIC: 'rice', PLS: 'pulses', SUG: 'sugar', SAT: 'salt', JGR: 'jaggery', SYC: 'soya chunks', VMC: 'vermicelli',
  },
  'Oils & Ghee': { EDO: 'edible oil', GHE: 'ghee' },
  'Spices & Masalas': { SCM: 'spices' },
  'Dry Fruits & Nuts': { NDF: 'nuts & dry fruits', EDS: 'edible seeds' },
  'Snacks & Biscuits': {
    CKB: 'biscuits & cookies', CHP: 'chips', SNS: 'namkeen', WFW: 'wafers', PCP: 'popcorn', FRY: 'papad', BAB: 'rusk', CEP: 'cakes',
  },
  'Chocolates & Sweets': { CHC: 'chocolate', CMF: 'candy', SAM: 'sweet mix' },
  'Beverages': {
    ARD: 'soft drink', DAJ: 'juice', TEA: 'tea', CFE: 'coffee', MLK: 'milk drink', ESR: 'energy drink', CNC: 'drink concentrate',
  },
  'Health & Wellness': { MDM: 'health drink mix', PSL: 'protein supplement', CHN: 'chyawanprash', MAK: 'face mask', ANS: 'antiseptic liquid' },
  'Breakfast & Instant Food': {
    CAF: 'breakfast cereal', NDL: 'noodles', PSA: 'pasta', RMD: 'ready meal', SOU: 'soup', RYM: 'ready mix', BKI: 'baking ingredients',
  },
  'Sauces, Spreads & Pickles': {
    SAK: 'sauce', JAS: 'jam & spreads', PAP: 'paste', CHT: 'chutney', PCK: 'pickle', VNG: 'vinegar', HNY: 'honey', ARS: 'sweetener',
  },
  'Dairy': { MPW: 'milk powder', CHE: 'cheese', BUT: 'butter', PTF: 'paneer', DRC: 'cream' },
  'Baby Care': { INF: 'infant milk', BBY: 'baby food', DPR: 'diapers' },
  'Personal Care': {
    SMP: 'shampoo', CND: 'conditioner', SOP: 'soap', BWS: 'body wash', DEO: 'deodorant', TPS: 'toothpaste', THB: 'toothbrush',
    MWH: 'mouthwash', BFR: 'breath freshener', FCW: 'face wash', FCP: 'face pack', MSC: 'skin care', CBK: 'fairness cream',
    HOL: 'hair oil', HSM: 'hair serum', HRC: 'hair colour', SHR: 'razor', SHC: 'shaving cartridge', SCR: 'shaving cream',
    ASL: 'after shave', SPP: 'sanitary pads', HRM: 'hair removal', PER: 'body mist', TLC: 'talc', CDM: 'condoms',
    HWS: 'hand wash', WIP: 'wipes',
  },
  'Home Cleaning': {
    LDT: 'detergent powder', WSP: 'detergent powder', LDG: 'liquid detergent', WBR: 'detergent bar', FSN: 'fabric softener',
    FSF: 'fabric stiffener', FWR: 'fabric whitener', TCN: 'toilet cleaner', BCR: 'bathroom cleaner', GLA: 'glass cleaner',
    DWB: 'dishwash bar', DCG: 'dishwash gel', DRO: 'drain opener', APC: 'all purpose cleaner',
  },
  'Household & Kitchen': {
    CNT: 'containers', KIS: 'kitchen tools', KRK: 'kitchen tools', FRK: 'cutlery', AFS: 'aluminium foil', ACC: 'batteries',
    INS: 'incense', HAI: 'pooja oil', AIR: 'air freshener', IRP: 'insect repellent', MVR: 'mosquito repellent', MOV: 'mosquito repellent',
  },
};
const PREFIX_INFO = {};
for (const [category, subs] of Object.entries(CATEGORY_MAP)) {
  for (const [prefix, sub] of Object.entries(subs)) PREFIX_INFO[prefix] = { category, sub };
}
export const CATEGORY_NAMES = Object.keys(CATEGORY_MAP);
export const FALLBACK_CATEGORY = 'Other Grocery';

// ---- tiny RFC-4180 style parser (handles "quoted, fields" and "" escapes) ----------------
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false, atFieldStart = true;
  const endField = () => { row.push(field); field = ''; atFieldStart = true; };
  const endRow = () => { endField(); rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"' && atFieldStart) {
      inQuotes = true; atFieldStart = false;
    } else if (c === ' ' && atFieldStart) {
      // skip the space after a delimiter so a following quote is still recognised
    } else if (c === ',') endField();
    else if (c === '\r') { /* ignore, \n ends the row */ }
    else if (c === '\n') endRow();
    else { field += c; atFieldStart = false; }
  }
  if (field !== '' || row.length) endRow();
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

const NUM = /^\d+(\.\d+)?$/;
const round2 = (n) => Math.round(n * 100) / 100;

// Turns one raw row into a record, or null if it can't be trusted.
function parseRow(fields) {
  const f = fields.map((x) => x.trim());
  const id = f[1];
  const rest = f.slice(2);
  // price is the first purely numeric field; everything before it is the (comma-split) name
  const p = rest.findIndex((t) => NUM.test(t));
  if (!id || p < 1) return null;
  const name = rest.slice(0, p).join(', ');
  const price = Number(rest[p]);
  const mrp = NUM.test(rest[p + 1] ?? '') ? Number(rest[p + 1]) : price;
  const tail = rest.slice(p + 2);
  // read the tail from the right: [variant parts...] [stock] [image url]
  let imageUrl = '';
  if (tail.length && /^https?:\/\//i.test(tail[tail.length - 1])) imageUrl = tail.pop();
  let stock = null;
  if (tail.length && NUM.test(tail[tail.length - 1])) stock = Math.round(Number(tail.pop()));
  let variant = tail.join(', ');
  if (NUM.test(variant)) variant = `Pack of ${variant}`; // source has a bare "1" for some items
  if (name.length < 2 || !(price > 0)) return null;
  return { id, name, price: round2(price), mrp: round2(Math.max(mrp, price)), variant, stock, imageUrl };
}

/**
 * @param {string | URL} csvPath
 * @returns {{ products: object[], stats: object }}
 */
export function loadFlipkartProducts(csvPath) {
  const text = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
  const raw = parseCsv(text).slice(1); // drop header
  const stats = { rawRows: raw.length, skipped: 0, duplicates: 0, missingStock: 0, missingImage: 0, unmappedPrefixes: new Set() };
  const seen = new Set();
  const products = [];
  for (const fields of raw) {
    const rec = parseRow(fields);
    if (!rec) { stats.skipped++; continue; }
    if (seen.has(rec.id)) { stats.duplicates++; continue; } // keep the first row per id
    seen.add(rec.id);
    const info = PREFIX_INFO[rec.id.slice(0, 3)];
    if (!info) stats.unmappedPrefixes.add(rec.id.slice(0, 3));
    if (rec.stock === null) stats.missingStock++;
    if (!rec.imageUrl) stats.missingImage++;
    products.push({ ...rec, category: info?.category ?? FALLBACK_CATEGORY, sub: info?.sub ?? 'other' });
  }
  stats.unmappedPrefixes = [...stats.unmappedPrefixes];
  return { products, stats };
}
