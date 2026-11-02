import { Setting } from '../models/index.js';

// Lecture typée des réglages stockés dans la collection `Setting`
// (paires clé/valeur avec `setting_type` ∈ string|number|boolean|json).

const cast = (doc, fallback) => {
  if (!doc || doc.setting_value == null) return fallback;
  const raw = doc.setting_value;
  switch (doc.setting_type) {
    case 'number': {
      const n = Number(raw);
      return Number.isNaN(n) ? fallback : n;
    }
    case 'boolean':
      return raw === 'true' || raw === '1' || raw === true;
    case 'json':
      try {
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    default:
      return raw;
  }
};

// Récupère un réglage unique, converti selon son type. `fallback` si absent.
export const getSetting = async (key, fallback = null) => {
  try {
    const doc = await Setting.findOne({ setting_key: key }).lean();
    return cast(doc, fallback);
  } catch (error) {
    console.error(`getSetting(${key}) error:`, error);
    return fallback;
  }
};

// Récupère plusieurs réglages d'un coup. `defaults` = { key: fallback }.
// Renvoie un objet { key: value } pour toutes les clés demandées.
export const getSettings = async (keys = [], defaults = {}) => {
  try {
    const docs = await Setting.find({ setting_key: { $in: keys } }).lean();
    const byKey = Object.fromEntries(docs.map((d) => [d.setting_key, d]));
    const result = {};
    for (const key of keys) {
      result[key] = cast(byKey[key], defaults[key] ?? null);
    }
    return result;
  } catch (error) {
    console.error('getSettings error:', error);
    return keys.reduce((acc, key) => ({ ...acc, [key]: defaults[key] ?? null }), {});
  }
};

export default { getSetting, getSettings };
