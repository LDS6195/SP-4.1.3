// Finances: the player's standing pricing strategy for the whole company, not a
// per-show preset. Every category sits on its own supply curve around a "fair" price —
// push it too high for too long and Fan Goodwill erodes (hurting future demand);
// undercut the market and goodwill slowly recovers, but revenue is left on the table.

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Ticket categories are standing company prices. Their fair values are deliberately
// independent of the venue, so a strategy carries unchanged from market to market.
export const PRICE_CATEGORIES = [
  { id: 'general', name: 'General Admission', min: 8, max: 70, share: .82, fair: 22 },
  { id: 'premium', name: 'Premium / Ringside', min: 20, max: 180, share: .14, fair: 55 },
  { id: 'suite', name: 'VIP Suites', min: 60, max: 600, share: .04, fair: 180, unlockLevel: 2 },
  { id: 'concessions', name: 'Concessions', min: 2, max: 16, fair: 6 },
  { id: 'merch', name: 'Merchandise (T-Shirts)', min: 8, max: 50, fair: 20 },
  { id: 'homeVideo', name: 'Home Video', min: 5, max: 35, fair: 15 },
];

export function getPriceCategory(id) {
  return PRICE_CATEGORIES.find(c => c.id === id) || null;
}

export function defaultPrices() {
  return { general: 22, premium: 55, suite: 180, concessions: 6, merch: 20, homeVideo: 15 };
}

export function createFinanceState() {
  return { prices: defaultPrices(), goodwill: 65 };
}

export function clampPrice(categoryId, value) {
  const def = getPriceCategory(categoryId);
  if (!def) return value;
  return clamp(Math.round(value), def.min, def.max);
}

// Home video keeps selling the same way all game — only the label on the box changes.
export function homeVideoFormat(dateStr) {
  return new Date(`${dateStr}T00:00:00`).getFullYear() >= 2001 ? 'DVD' : 'VHS';
}

export function suitesUnlocked(gmLevel) {
  return gmLevel >= getPriceCategory('suite').unlockLevel;
}

// Blended ratio of standing prices against the company's market standard.
export function ticketPriceRatio(prices, gmLevel) {
  const unlocked = suitesUnlocked(gmLevel);
  const shares = unlocked ? { general: .82, premium: .14, suite: .04 } : { general: .9, premium: .1, suite: 0 };
  let ratio = 0;
  ['general', 'premium', 'suite'].forEach(id => {
    if (id === 'suite' && !unlocked) return;
    const def = getPriceCategory(id);
    ratio += (prices[id] / def.fair) * shares[id];
  });
  return ratio;
}

// Continuous stand-in for the discrete TICKET_TIERS curve (papered -> gouge) so the
// per-show ticket-tier dropdown and the standing Finances price both push the same lever.
export function demandModFromRatio(ratio) {
  return clamp(1 - 0.53 * (ratio - 1), 0.4, 1.35);
}

export function goodwillDeltaFromRatio(ratio) {
  return clamp(-13 * (ratio - 1), -12, 8);
}

// Fan Goodwill (0-100) is a slow-moving trust meter: it nudges toward whatever the
// current pricing "deserves" rather than snapping there, so a single gouge night
// doesn't ruin you and a single fair night doesn't erase a history of gouging.
export function applyGoodwillDrift(goodwill, ratio) {
  const target = clamp(65 + goodwillDeltaFromRatio(ratio) * 2.2, 5, 100);
  return clamp(Math.round(goodwill + (target - goodwill) * 0.18), 0, 100);
}

// Goodwill itself feeds back into demand — a trusted promotion draws better than its
// card alone would suggest, a resented one draws worse.
export function goodwillDemandMult(goodwill) {
  return 0.85 + (goodwill / 100) * 0.3;
}

// Per-head spend on a non-ticket category: prices above "fair" earn more per unit
// sold but taper off (diminishing, not collapsing) as fans balk at the markup.
function perHeadSpend(price, fair) {
  const ratio = price / fair;
  const uptake = clamp(1 - 0.5 * (ratio - 1), 0.35, 1.25);
  return price * uptake;
}

export function concessionsPerHead(prices) {
  return perHeadSpend(prices.concessions, getPriceCategory('concessions').fair);
}

export function merchPriceFactor(prices) {
  // Multiplies the existing star-power-driven merch formula rather than replacing it —
  // pricing changes how much of that demand actually converts into a sale.
  const fair = getPriceCategory('merch').fair;
  return perHeadSpend(prices.merch, fair) / fair;
}

export function homeVideoPerHead(prices, rating) {
  const fair = getPriceCategory('homeVideo').fair;
  const qualityMult = clamp(rating / 70, 0.4, 1.6);
  return perHeadSpend(prices.homeVideo, fair) * 0.32 * qualityMult;
}
