// Pure card-pull mechanics. No game state, no persistence — bookingState.js owns the
// slice and feeds this module the live wrestler pool.

import {
  FOUNDING_PACK, ANNUAL_BOARD, BASE_PULL_WEIGHT, CHIP_WEIGHT,
  CHIP_CARRYOVER, MAX_CARRYOVER_WEIGHT, GIMMICK_RARITIES, GIMMICK_CARD_RARITY,
} from '../data/cards.js';
import { PROMO_CARD_RARITY, PROMO_CARD_RARITIES, STARTER_PROMO_IDS } from '../data/storylines.js';

const defaultRng = () => Math.random();

function pickRandom(list, rng) {
  if (!list.length) return null;
  return list[Math.floor(rng() * list.length)];
}

function drawTierSlots(shape, poolByTier, rng, taken) {
  const cards = [];
  shape.forEach(({ tier, count }) => {
    for (let i = 0; i < count; i += 1) {
      const available = (poolByTier[tier] ?? []).filter(w => !taken.has(w.id));
      const pick = pickRandom(available, rng);
      if (!pick) continue;
      taken.add(pick.id);
      cards.push({ id: pick.id, tier });
    }
  });
  return cards;
}

export function createCardState() {
  return {
    chips: 0,
    // { [matchTypeId]: count }
    gimmicks: {},
    // { [storyTemplateId]: count }
    promos: {},
    promoDrawCycles: {},
    used: { matches: {}, promos: {} },
    gimmickLog: [],
    tutorialClaims: {},
    pendingPack: null,
    intakeQueue: [],
    founding: { cards: [], redrawsLeft: 0, revealed: [], opened: false, complete: false, passed: [] },
    annual: null,
    // Chips spent on wrestlers you missed decay into standing interest for next year.
    carryover: {},
    history: [],
  };
}

// ---------------------------------------------------------------------------
// Founding ceremony
// ---------------------------------------------------------------------------

export function rollFoundingPack(pool, { rng = defaultRng, getTier } = {}) {
  const poolByTier = groupByTier(pool, getTier);
  return drawTierSlots(FOUNDING_PACK, poolByTier, rng, new Set());
}

// Re-draw pulls from the same tier, so the shape of the roster stays fixed. The rejected
// wrestler leaves the pool — they signed elsewhere — but can resurface on a later board.
export function redrawFoundingCard(cards, index, pool, { rng = defaultRng, getTier } = {}) {
  const card = cards[index];
  if (!card) return { ok: false, message: 'No card in that slot.' };
  const taken = new Set(cards.map(c => c.id));
  const available = pool.filter(w => getTier(w) === card.tier && !taken.has(w.id));
  if (!available.length) return { ok: false, message: `No one left in the ${card.tier} pool to pull.` };
  const pick = pickRandom(available, rng);
  const next = cards.slice();
  next[index] = { id: pick.id, tier: card.tier };
  return { ok: true, cards: next, passed: card.id, drawn: pick };
}

// ---------------------------------------------------------------------------
// Annual board + chip roulette
// ---------------------------------------------------------------------------

function groupByTier(pool, getTier) {
  const byTier = {};
  pool.forEach(w => {
    const tier = getTier(w);
    (byTier[tier] = byTier[tier] ?? []).push(w);
  });
  return byTier;
}

export function buildAnnualBoard(pool, { rng = defaultRng, getTier, carryover = {} } = {}) {
  const poolByTier = groupByTier(pool, getTier);
  return drawTierSlots(ANNUAL_BOARD, poolByTier, rng, new Set()).map(card => ({
    ...card,
    carryover: Math.min(MAX_CARRYOVER_WEIGHT, carryover[card.id] ?? 0),
  }));
}

export function cardWeight(card, chips = 0) {
  const base = BASE_PULL_WEIGHT[card.tier] ?? BASE_PULL_WEIGHT.contender;
  const perChip = CHIP_WEIGHT[card.tier] ?? CHIP_WEIGHT.contender;
  return base + (card.carryover ?? 0) + chips * perChip;
}

// Returns each card's live draw probability for a single pull, so the board can show the
// odds shifting as chips move.
export function boardOdds(board, bets = {}) {
  const weights = board.map(card => ({ card, weight: cardWeight(card, bets[card.id] ?? 0) }));
  const total = weights.reduce((sum, entry) => sum + entry.weight, 0) || 1;
  return weights.map(entry => ({
    id: entry.card.id,
    tier: entry.card.tier,
    chips: bets[entry.card.id] ?? 0,
    weight: entry.weight,
    probability: entry.weight / total,
  }));
}

function weightedPick(entries, rng) {
  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  if (total <= 0) return null;
  let roll = rng() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return entries[entries.length - 1];
}

// Draws without replacement — each pull removes the winner from the board.
export function pullFromBoard(board, bets = {}, pulls = 1, { rng = defaultRng } = {}) {
  let remaining = board.slice();
  const drawn = [];
  for (let i = 0; i < pulls && remaining.length; i += 1) {
    const entries = remaining.map(card => ({ card, weight: cardWeight(card, bets[card.id] ?? 0) }));
    const winner = weightedPick(entries, rng);
    if (!winner) break;
    drawn.push(winner.card);
    remaining = remaining.filter(card => card.id !== winner.card.id);
  }
  return { drawn, remaining };
}

// Chips placed on wrestlers you missed become next year's standing interest.
export function carryoverFromBets(board, bets, drawnIds, existing = {}) {
  const next = { ...existing };
  const drawn = new Set(drawnIds);
  board.forEach(card => {
    if (drawn.has(card.id)) { delete next[card.id]; return; }
    const chips = bets[card.id] ?? 0;
    if (!chips) return;
    const gain = chips * CHIP_CARRYOVER;
    next[card.id] = Math.min(MAX_CARRYOVER_WEIGHT, (next[card.id] ?? 0) + gain);
  });
  return next;
}

export function totalChipsBet(bets = {}) {
  return Object.values(bets).reduce((sum, chips) => sum + (chips || 0), 0);
}

// ---------------------------------------------------------------------------
// Gimmick cards
// ---------------------------------------------------------------------------

const GIMMICK_IDS = Object.keys(GIMMICK_CARD_RARITY);

function gimmickPool() {
  const perRarityCount = GIMMICK_IDS.reduce((acc, id) => {
    const rarity = GIMMICK_CARD_RARITY[id];
    acc[rarity] = (acc[rarity] ?? 0) + 1;
    return acc;
  }, {});
  return { ids: GIMMICK_IDS, perRarityCount };
}

// packWeight is a share of the whole pull, not a per-card weight, so each card's
// weight is its rarity's share split across the cards in that rarity. Without this,
// adding stipulations to a tier would quietly make that tier more likely.
export function rollGimmickCards(count, { rng = defaultRng, weights = null } = {}) {
  const rarityWeights = weights ?? Object.fromEntries(
    Object.values(GIMMICK_RARITIES).map(r => [r.id, r.packWeight]),
  );
  const { ids, perRarityCount } = gimmickPool();
  const pool = ids.map(id => {
    const rarity = GIMMICK_CARD_RARITY[id];
    return { id, weight: (rarityWeights[rarity] ?? 0) / (perRarityCount[rarity] || 1) };
  });
  const drawn = [];
  for (let i = 0; i < count; i += 1) {
    const winner = weightedPick(pool.map(card => ({ card, weight: card.weight })), rng);
    if (!winner) break;
    drawn.push(winner.card.id);
  }
  return drawn;
}

// Draws one card from a single rarity, ignoring the usual tier odds.
export function rollGimmickOfRarity(rarity, { rng = defaultRng, excluded = [] } = {}) {
  const candidates = GIMMICK_IDS.filter(id => GIMMICK_CARD_RARITY[id] === rarity && !excluded.includes(id));
  return pickRandom(candidates, rng);
}

// Builds a pack from a slot list: guaranteed rarities first, then open slots.
export function rollGimmickPack(slots, { rng = defaultRng, weights = null, distinctByRarity = false } = {}) {
  const drawn = [];
  slots.forEach(slot => {
    for (let i = 0; i < slot.count; i += 1) {
      if (slot.rarity === 'any') {
        drawn.push(...rollGimmickCards(1, { rng, weights }));
      } else {
        const card = rollGimmickOfRarity(slot.rarity, { rng, excluded: distinctByRarity ? drawn : [] });
        if (card) drawn.push(card);
      }
    }
  });
  return drawn;
}

export function rollPromoCards(count, { rng = defaultRng, weights = null, cycles = {} } = {}) {
  const rarityWeights = weights ?? Object.fromEntries(
    Object.values(PROMO_CARD_RARITIES).map(rarity => [rarity.id, rarity.packWeight]),
  );
  const pool = Object.keys(PROMO_CARD_RARITIES).map(rarity => ({ card: rarity, weight: rarityWeights[rarity] ?? 0 }));
  const drawn = [];
  for (let index = 0; index < count; index += 1) {
    const winner = weightedPick(pool.map(entry => ({ card: entry.card, weight: entry.weight })), rng);
    if (!winner) break;
    const card = drawPromoAtRarity(winner.card, cycles, rng);
    if (card) drawn.push(card);
  }
  return drawn;
}

function drawPromoAtRarity(rarity, cycles, rng) {
  const candidates = Object.keys(PROMO_CARD_RARITY).filter(id => PROMO_CARD_RARITY[id] === rarity && !STARTER_PROMO_IDS.has(id));
  const seen = new Set(cycles[rarity] ?? []);
  let remaining = candidates.filter(id => !seen.has(id));
  if (!remaining.length) {
    cycles[rarity] = [];
    remaining = candidates;
  }
  const card = pickRandom(remaining, rng);
  if (card) cycles[rarity] = [...(cycles[rarity] ?? []), card];
  return card;
}

export function rollStarterPromoPack(slots, { rng = defaultRng } = {}) {
  const remaining = [...STARTER_PROMO_IDS];
  const count = slots.reduce((sum, slot) => sum + slot.count, 0);
  const drawn = [];
  for (let index = 0; index < count && remaining.length; index += 1) {
    const card = pickRandom(remaining, rng);
    drawn.push(card);
    remaining.splice(remaining.indexOf(card), 1);
  }
  return drawn;
}

export function rollPromoPack(slots, { rng = defaultRng, weights = null, cycles = {} } = {}) {
  const drawn = [];
  const shape = typeof slots === 'number' ? [{ rarity: 'any', count: slots }] : slots;
  shape.forEach(slot => {
    for (let index = 0; index < slot.count; index += 1) {
      if (slot.rarity === 'any') {
        drawn.push(...rollPromoCards(1, { rng, weights, cycles }));
        continue;
      }
      const card = drawPromoAtRarity(slot.rarity, cycles, rng);
      if (card) drawn.push(card);
    }
  });
  return drawn;
}

export function gimmickStock(cardState, typeId) {
  return cardState?.gimmicks?.[typeId] ?? 0;
}

export function addGimmickCards(cardState, typeIds) {
  typeIds.forEach(id => {
    cardState.gimmicks[id] = (cardState.gimmicks[id] ?? 0) + 1;
  });
  return cardState.gimmicks;
}

export function consumeGimmickCard(cardState, typeId) {
  const stock = gimmickStock(cardState, typeId);
  if (stock <= 0) return false;
  cardState.gimmicks[typeId] = stock - 1;
  if (cardState.gimmicks[typeId] <= 0) delete cardState.gimmicks[typeId];
  return true;
}

export function promoStock(cardState, promoId) {
  return cardState?.promos?.[promoId] ?? 0;
}

export function addPromoCards(cardState, promoIds) {
  promoIds.forEach(id => {
    cardState.promos[id] = (cardState.promos[id] ?? 0) + 1;
  });
  return cardState.promos;
}

export function consumePromoCard(cardState, promoId) {
  const stock = promoStock(cardState, promoId);
  if (stock <= 0) return false;
  cardState.promos[promoId] = stock - 1;
  if (cardState.promos[promoId] <= 0) delete cardState.promos[promoId];
  return true;
}
