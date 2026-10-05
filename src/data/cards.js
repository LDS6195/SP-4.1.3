// Card systems: the founding roster pack, the January free-agency board, chips, and
// gimmick match cards.
//
// The through-line is "you don't choose what you get, you choose what you do with it".
// Your roster arrives by pack break, stipulations arrive as limited stock, and the only
// influence you have over the January pull is where you put your chips.

// ---------------------------------------------------------------------------
// Founding ceremony — replaces the old pick-your-roster draft
// ---------------------------------------------------------------------------

// 14 wrestlers, fixed tier shape, random faces. Midcard is weighted heaviest because
// that is where storylines actually live; jobbers are structural filler that let the
// stars be selective.
export const FOUNDING_PACK = [
  { tier: 'legend', count: 2 },
  { tier: 'star', count: 2 },
  { tier: 'contender', count: 6 },
  { tier: 'jobber', count: 4 },
];

export const FOUNDING_PACK_SIZE = FOUNDING_PACK.reduce((sum, slot) => sum + slot.count, 0);

// One re-draw for the whole ceremony, and it pulls from the same tier — the shape of
// the roster is fate, only the face is negotiable.
export const FOUNDING_REDRAWS = 1;

// ---------------------------------------------------------------------------
// Annual free agency — every January from year 2 on
// ---------------------------------------------------------------------------

export const ANNUAL_START_YEAR = 2;
export const ANNUAL_PULLS = 3;
export const ANNUAL_BONUS_PULL = 1;

// A strong year buys a fourth draw. Average of the year's show ratings.
export const BONUS_PULL_RATING = 78;

// The board is always this shape so a legend is always visible (aspirational) and the
// board is never garbage. Who fills each slot is random.
export const ANNUAL_BOARD = [
  { tier: 'legend', count: 2 },
  { tier: 'star', count: 2 },
  { tier: 'contender', count: 4 },
  { tier: 'jobber', count: 4 },
];

export const ANNUAL_BOARD_SIZE = ANNUAL_BOARD.reduce((sum, slot) => sum + slot.count, 0);

// Draw probability is weight / total weight. Stars start near-impossible.
export const BASE_PULL_WEIGHT = {
  legend: 2,
  star: 4,
  contender: 7,
  jobber: 10,
};

// The roulette asymmetry: a chip buys far less weight on a legend than on a jobber, so
// you can near-guarantee a midcarder or take a long shot at a legend and probably miss.
export const CHIP_WEIGHT = {
  legend: 1,
  star: 1.5,
  contender: 3,
  jobber: 4,
};

// Chips on wrestlers you did not pull decay into standing interest that carries to next
// January as bonus base weight — "I've been chasing this guy for three years".
export const CHIP_CARRYOVER = 0.4;
export const MAX_CARRYOVER_WEIGHT = 6;

// ---------------------------------------------------------------------------
// Chip economy
// ---------------------------------------------------------------------------

// Chips are earned on show performance, so a good year funds a real run at a star.
// Tuned so a solid year banks roughly 15-25 chips — enough for one serious commitment,
// not enough to buy a legend and a star in the same January.
export const CHIP_AWARD = {
  base: 1,
  ratingPivot: 62, // ratings above this start paying extra
  ratingDivisor: 8, // one extra chip per 8 rating points over the pivot
  max: 5,
};

export function chipsForShowRating(rating) {
  const over = Math.max(0, (rating ?? 0) - CHIP_AWARD.ratingPivot);
  return Math.max(0, Math.min(CHIP_AWARD.max, CHIP_AWARD.base + Math.floor(over / CHIP_AWARD.ratingDivisor)));
}

// ---------------------------------------------------------------------------
// Gimmick match cards
// ---------------------------------------------------------------------------

// Singles and tag are the grammar — always available, never consumed. Everything else
// is punctuation you have to have in stock.
export const BASIC_MATCH_TYPES = ['singles', 'tag-team'];

// Rarity is not just "bigger number" — it is reliability. A common is a gamble you can
// afford to waste; a legendary is a sure thing you only get to spend once. The base
// stats in matchTypes.js climb with rarity too, so these are a bonus on top rather
// than the whole difference.
export const GIMMICK_RARITIES = {
  common: {
    id: 'common',
    name: 'Common',
    color: '#9c9385',
    qualityBonus: 3,
    ceilingBonus: 0,
    buzzBonus: 0,
    varianceMod: 1.2,
    packWeight: 62,
    description: 'Might pop, might fizzle. Cheap enough to burn on a hunch.',
  },
  rare: {
    id: 'rare',
    name: 'Rare',
    color: '#5f8bb6',
    qualityBonus: 6,
    ceilingBonus: 1,
    buzzBonus: 4,
    varianceMod: 0.95,
    packWeight: 29,
    description: 'Solid on every axis. The workhorse of a good card.',
  },
  legendary: {
    id: 'legendary',
    name: 'Legendary',
    color: '#c79a3c',
    qualityBonus: 9,
    ceilingBonus: 3,
    buzzBonus: 9,
    varianceMod: 0.75,
    packWeight: 9,
    description: 'Near-guaranteed to deliver. You only get to spend it once.',
  },
};

export const GIMMICK_CARD_RARITY = {
  'battle-royal': 'legendary',
  'six-man-tag': 'common',
  lumberjack: 'common',
  submission: 'common',
  tables: 'common',
  'two-out-of-three-falls': 'common',
  'falls-count-anywhere': 'common',
  'texas-tornado': 'common',
  blindfold: 'common',
  'triple-threat': 'common',
  'fatal-four-way': 'rare',
  'street-fight': 'rare',
  'steel-cage': 'rare',
  'i-quit': 'rare',
  scaffold: 'rare',
  'strap-match': 'rare',
  'first-blood': 'rare',
  'dog-collar': 'rare',
  stretcher: 'rare',
  ladder: 'rare',
  'iron-man': 'rare',
  'last-man-standing': 'rare',
  casket: 'legendary',
  ambulance: 'legendary',
  'hell-in-a-cell': 'legendary',
  elimination: 'legendary',
  'buried-alive': 'legendary',
  inferno: 'legendary',
};

export function isBasicMatchType(typeId) {
  return BASIC_MATCH_TYPES.includes(typeId);
}

export function gimmickRarity(typeId) {
  const id = GIMMICK_CARD_RARITY[typeId];
  return id ? GIMMICK_RARITIES[id] : null;
}

// January drop. Guaranteed slots first, then open slots that can roll anything —
// so every year has exactly one headline card and still leaves room for a surprise.
export const ANNUAL_GIMMICK_PACK = [
  { rarity: 'legendary', count: 1 },
  { rarity: 'rare', count: 2 },
  { rarity: 'common', count: 3 },
  { rarity: 'any', count: 3 },
];

export const ANNUAL_GIMMICK_CARDS = ANNUAL_GIMMICK_PACK.reduce((sum, slot) => sum + slot.count, 0);
export const ANNUAL_PROMO_PACK = [{ rarity: 'common', count: 2 }, { rarity: 'rare', count: 1 }, { rarity: 'any', count: 1 }];

// The founding pack ships a few starter stipulations so year one is not all singles
// and tag. It is deliberately fixed to avoid a full-common opening that would feel
// like a busted first draw.
export const FOUNDING_GIMMICK_PACK = [
  { rarity: 'legendary', count: 1 },
  { rarity: 'rare', count: 1 },
  { rarity: 'common', count: 3 },
];
export const FOUNDING_GIMMICK_CARDS = FOUNDING_GIMMICK_PACK.reduce((sum, slot) => sum + slot.count, 0);
export const FOUNDING_GIMMICK_WEIGHTS = { common: 62, rare: 29, legendary: 9 };
export const FOUNDING_PROMO_PACK = [
  { rarity: 'any', count: 4 },
];

// The belts themselves come out of that first pack. Until the card is in hand the
// championship does not exist to be booked.
export const TITLE_CARDS = ['world', 'tag'];

// Lounge catalog. You buy a pack, never a card — the moment you can shop for a
// specific stipulation the scarcity is dead.
export const CRIB_PACKS = {
  match: { id: 'match', name: 'Match Pack', blurb: '3 match cards.', cost: 91000, gimmicks: 3, promos: 0, wrestlers: 0, color: '#cf493e' },
  promo: { id: 'promo', name: 'Promo Pack', blurb: '3 Promo cards.', cost: 91000, gimmicks: 0, promos: 3, wrestlers: 0, color: '#259b82' },
  'free-agent': { id: 'free-agent', name: 'Free Agent Pack', blurb: '1 wrestler, 1 match card, and 1 Promo card.', cost: 338000, gimmicks: 1, promos: 1, wrestlers: 1, wrestlerTierWeights: { legend: 23, star: 32, contender: 40, jobber: 5 }, color: '#397fca' },
  'custom-wrestler': { id: 'custom-wrestler', name: 'Create Your Own Wrestler Pack', blurb: '1 custom wrestler, 1 Match card, and 1 Promo card.', cost: 400000, gimmicks: 1, promos: 1, wrestlers: 1, customWrestler: true, color: '#c66792' },
  variety: { id: 'variety', name: 'Variety Pack', blurb: '2 match cards and 2 Promo cards.', cost: 130000, gimmicks: 2, promos: 2, wrestlers: 0, color: '#c59b31' },
};

export const PACK_TUTORIAL_REWARDS = [
  { id: 'free-agent-introduction', afterShow: 3, kind: 'free-agent', wrestlerTiers: ['contender', 'star', 'legend'], wrestlerTierWeights: { legend: 1, star: 1, contender: 1, jobber: 0 } },
];

// Cards expire at year end so players cannot hoard forever waiting for a perfect moment.
export const GIMMICK_CARD_EXPIRY_YEARS = 1;

// Running the same stipulation over and over drains it. The bigger the gimmick, the
// faster the crowd tires of seeing it.
export const GIMMICK_FATIGUE = {
  windowShows: 8,
  perUse: { common: 6, rare: 10, legendary: 17 },
  max: 42,
};

// ---------------------------------------------------------------------------
// Campaign length + roster intake
// ---------------------------------------------------------------------------

// Twenty years, twelve shows a year.
export const CAMPAIGN_YEARS = 20;
export const CAMPAIGN_SHOWS = CAMPAIGN_YEARS * 12;

// Nobody retires on their own. Once you are full, every new card you draw is a
// straight trade: keep them and end somebody's career, or pass and walk away.
export const ROSTER_CAP = 33;

// Usage, not rating. The suggested cut list should be a mirror of your own booking.
export const USAGE_WINDOW_SHOWS = 12;
