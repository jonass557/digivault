// Prix effectif d'un produit en tenant compte des ventes flash.
//
// Règle (rétro-compatible avec le comportement historique `sale_price || price`) :
//  - Pas de `sale_price` → prix normal.
//  - `sale_price` défini SANS fenêtre (`sale_starts_at`/`sale_ends_at`) → promo permanente
//    (comportement historique inchangé).
//  - `sale_price` défini AVEC fenêtre → le prix soldé ne s'applique que dans la fenêtre ;
//    en dehors, on revient au prix normal.

// Renvoie true si une vente flash à durée limitée est actuellement active.
export const isFlashSaleActive = (product, now = new Date()) => {
  if (!product || product.sale_price == null) return false;
  const { sale_price, price, sale_starts_at, sale_ends_at } = product;
  if (!(sale_price < price)) return false;
  // Une "vente flash" suppose au moins une borne temporelle.
  if (!sale_starts_at && !sale_ends_at) return false;
  const t = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (sale_starts_at && t < new Date(sale_starts_at).getTime()) return false;
  if (sale_ends_at && t > new Date(sale_ends_at).getTime()) return false;
  return true;
};

// Renvoie le prix à facturer maintenant pour un produit.
export const effectivePrice = (product, now = new Date()) => {
  if (!product) return 0;
  const { price, sale_price, sale_starts_at, sale_ends_at } = product;
  if (sale_price == null) return price;

  const t = now instanceof Date ? now.getTime() : new Date(now).getTime();
  // Fenêtre pas encore ouverte.
  if (sale_starts_at && t < new Date(sale_starts_at).getTime()) return price;
  // Fenêtre expirée.
  if (sale_ends_at && t > new Date(sale_ends_at).getTime()) return price;
  // Promo permanente (aucune borne) ou fenêtre active.
  return sale_price;
};

// Pourcentage de réduction actuellement appliqué (0 si aucun).
export const discountPercent = (product, now = new Date()) => {
  if (!product || !product.price) return 0;
  const eff = effectivePrice(product, now);
  if (eff >= product.price) return 0;
  return Math.round((1 - eff / product.price) * 100);
};

// Répartit un montant entier `target` sur des items pondérés par `weights`,
// en garantissant des parts entières dont la somme vaut EXACTEMENT `target`
// (le reste d'arrondi est attribué aux plus grosses fractions). Utilisé pour
// ventiler le prix d'un bundle ou une réduction de coupon sur les OrderItem.
export const distributeProrata = (target, weights) => {
  const n = weights.length;
  if (n === 0) return [];
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // Poids nuls → répartition égale.
  if (totalWeight <= 0) {
    const base = Math.floor(target / n);
    const result = new Array(n).fill(base);
    let rem = target - base * n;
    for (let i = 0; i < rem; i++) result[i] += 1;
    return result;
  }

  const raw = weights.map((w) => (target * w) / totalWeight);
  const floored = raw.map(Math.floor);
  const remainder = target - floored.reduce((a, b) => a + b, 0);

  const byFrac = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);

  const result = [...floored];
  for (let k = 0; k < remainder; k++) {
    result[byFrac[k % n].i] += 1;
  }
  return result;
};

export default { effectivePrice, isFlashSaleActive, discountPercent, distributeProrata };
