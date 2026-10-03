// Promo generator: picks who gets called out, rolls a setting + scenario that fits
// the speaker's persona, and scores a "pop meter" for the segment. Pure functions —
// bookingState.js / bookingPanel.js own presentation and apply live wrestler effects.

import { getWrestlerById, computeChemistry } from '../data/wrestlers.js';
import { PROMO_SETTINGS, PROMO_SCENARIOS, PROMO_ARCHETYPES, getPersonaFor } from '../data/promos.js';

const META_TARGET_CHANCE = 0.08; // rare spice: founder / org / celebrity / real-world figure
const OPPONENT_CALLOUT_CHANCE = 0.65;

const REAL_WORLD_FIGURES = [
  'the President of the United States',
  'the reigning heavyweight boxing champion of the world',
  'a Hollywood action star who thinks they could last a round',
  'a late-night talk show host',
  'the commissioner of a rival sport entirely',
];

const CELEBRITY_POOL = ['dennis-rodman', 'mike-tyson'];

function fallbackArchetypes(wrestler) {
  const archetypes = [];
  if (wrestler.chemistryTags?.includes('showboat') || wrestler.chemistryTags?.includes('mic-work')) archetypes.push('mic-work');
  if (wrestler.chemistryTags?.includes('family-legacy')) archetypes.push('family-legacy');
  if (wrestler.chemistryTags?.includes('cult-following')) archetypes.push('cult-following');
  if (wrestler.chemistryTags?.includes('blood-feud-ready')) archetypes.push('blood-feud-ready');
  if (wrestler.style === 'Giant' || wrestler.style === 'Powerhouse') archetypes.push('monster');
  if (wrestler.style === 'High-Flyer' && wrestler.popularity < 55) archetypes.push('underdog');
  if (wrestler.hidden?.ego >= 65) archetypes.push('playboy');
  if (wrestler.hidden?.ego <= 30) archetypes.push('lone-wolf');
  if (wrestler.debutYear && (1996 - wrestler.debutYear) >= 15) archetypes.push('veteran-legend');
  return archetypes.length ? archetypes : ['underdog'];
}

function resolvePersona(wrestler) {
  const bespoke = getPersonaFor(wrestler.id);
  if (bespoke) return bespoke;
  return { archetypes: fallbackArchetypes(wrestler), rivals: [], signatureLines: [] };
}

function weightedPick(rng, entries) {
  const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0);
  if (total <= 0) return entries[0]?.[0] ?? null;
  let roll = rng() * total;
  for (const [item, weight] of entries) {
    roll -= Math.max(0, weight);
    if (roll <= 0) return item;
  }
  return entries[entries.length - 1][0];
}

function defaultRng() {
  return Math.random();
}

// --- Target selection -------------------------------------------------------
// Decides who the speaker calls out this month: their booked opponent (usually),
// someone with real history/heat, a total wildcard, or — rarely — the founder,
// the organization itself, or a celebrity/real-world figure.
export function pickPromoTarget(wrestler, { bookedOpponentId, roster = [], heatMap = {}, rng = defaultRng } = {}) {
  if (bookedOpponentId && rng() < OPPONENT_CALLOUT_CHANCE) {
    return { type: 'wrestler', id: bookedOpponentId };
  }

  if (rng() < META_TARGET_CHANCE) {
    const roll = rng();
    if (roll < 0.3) return { type: 'founder' };
    if (roll < 0.6) return { type: 'organization' };
    if (roll < 0.8 && CELEBRITY_POOL.length) {
      return { type: 'celebrity', id: CELEBRITY_POOL[Math.floor(rng() * CELEBRITY_POOL.length)] };
    }
    return { type: 'real-world', label: REAL_WORLD_FIGURES[Math.floor(rng() * REAL_WORLD_FIGURES.length)] };
  }

  const persona = resolvePersona(wrestler);
  const candidates = roster.filter(w => w.id !== wrestler.id);
  if (!candidates.length) return null;

  const weighted = candidates.map(candidate => {
    let weight = 1;
    if (persona.rivals?.includes(candidate.id)) weight += 6;
    if (wrestler.poorChemistryWith?.includes(candidate.id) || candidate.poorChemistryWith?.includes(wrestler.id)) weight += 4;
    if (wrestler.bestChemistryWith?.includes(candidate.id) || candidate.bestChemistryWith?.includes(wrestler.id)) weight += 2;
    weight += (heatMap[candidate.id] || 0) / 20;
    return [candidate.id, weight];
  });

  return { type: 'wrestler', id: weightedPick(rng, weighted) };
}

// --- Setting + scenario selection -------------------------------------------
function scenarioCategoriesFor(targetType) {
  if (targetType === 'founder') return ['founder'];
  if (targetType === 'organization') return ['organization'];
  if (targetType === 'celebrity') return ['celebrity'];
  if (targetType === 'real-world') return ['political', 'celebrity'];
  return null; // any category is fair game for a wrestler-vs-wrestler promo
}

function pickScenario(persona, targetType, rng) {
  const allowedCategories = scenarioCategoriesFor(targetType);
  const pool = allowedCategories
    ? PROMO_SCENARIOS.filter(s => allowedCategories.includes(s.category))
    : PROMO_SCENARIOS.filter(s => !['founder', 'organization', 'celebrity'].includes(s.category));
  const weighted = pool.map(scenario => {
    let weight = 1;
    (persona.archetypes || []).forEach(archId => {
      const arch = PROMO_ARCHETYPES[archId];
      if (arch?.categoryWeights?.[scenario.category]) weight += arch.categoryWeights[scenario.category];
    });
    return [scenario, weight];
  });
  return weightedPick(rng, weighted) || pool[0];
}

function pickSetting(persona, rng) {
  const weighted = PROMO_SETTINGS.map(setting => {
    let weight = 1;
    (persona.archetypes || []).forEach(archId => {
      const arch = PROMO_ARCHETYPES[archId];
      if (arch?.settingTags?.some(tag => setting.tags.includes(tag))) weight += 2;
    });
    return [setting, weight];
  });
  return weightedPick(rng, weighted) || PROMO_SETTINGS[0];
}

function targetLabel(target, companyName) {
  if (!target) return 'somebody';
  switch (target.type) {
    case 'wrestler': return getWrestlerById(target.id)?.name ?? 'somebody';
    case 'founder': return `the founder of ${companyName}`;
    case 'organization': return companyName;
    case 'celebrity': return getWrestlerById(target.id)?.name ?? 'a celebrity';
    case 'real-world': return target.label;
    default: return 'somebody';
  }
}

// --- Pop meter ---------------------------------------------------------------
// 0-100 crowd-reaction score. Charisma/momentum carry the floor; real history and
// on-brand scenarios add swings; a mismatched partner or low risk tolerance can
// flatten an otherwise hot promo.
function computePopScore({ wrestler, target, scenario, partner, rng }) {
  let score = 45;
  const notes = [];

  const charismaBonus = Math.round((wrestler.stats.charisma - 50) / 4);
  score += charismaBonus;
  if (charismaBonus > 0) notes.push(`${wrestler.name}'s natural charisma carries the room.`);

  score += Math.round((wrestler.momentum || 0) * 3);
  if ((wrestler.momentum || 0) >= 3) notes.push('The crowd is already hot on this streak.');

  if (target?.type === 'wrestler') {
    const opponent = getWrestlerById(target.id);
    if (opponent && (wrestler.poorChemistryWith?.includes(opponent.id) || wrestler.bestChemistryWith?.includes(opponent.id))) {
      score += 12;
      notes.push('Real history between these two — the crowd feels it.');
    }
  } else if (target?.type === 'founder' || target?.type === 'organization') {
    score += 6;
    notes.push('Going after the boss always gets a reaction.');
  } else if (target?.type === 'celebrity' || target?.type === 'real-world') {
    score += 10 * (rng() > 0.5 ? 1 : -1);
    notes.push('A wildcard callout — the crowd either loves it or groans.');
  }

  if (scenario?.tags?.includes('dark') || scenario?.tags?.includes('heat')) score += 5;
  if (scenario?.tags?.includes('heroic')) score += 4;

  score += Math.round((rng() - 0.5) * 16); // natural variance every promo has

  if (partner) {
    const chem = computeChemistry(wrestler.id, partner.id);
    if (chem) {
      const partnerSwing = Math.round((chem.score - 50) / 3);
      score += partnerSwing;
      notes.push(partnerSwing >= 0
        ? `${partner.name} on the mic alongside them adds real heat.`
        : `${partner.name} sharing the mic creates visible friction.`);
      if (chem.score < 35 && rng() < 0.3) {
        score -= 15;
        notes.push('The two nearly come to blows before the segment even ends.');
      }
    }
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), notes };
}

// --- Public API ---------------------------------------------------------------
export function generatePromo(wrestlerId, {
  bookedOpponentId = null,
  roster = [],
  heatMap = {},
  partnerId = null,
  companyName = 'the company',
  rng = defaultRng,
} = {}) {
  const wrestler = getWrestlerById(wrestlerId);
  if (!wrestler) return null;
  const partner = partnerId ? getWrestlerById(partnerId) : null;
  const persona = resolvePersona(wrestler);

  const target = pickPromoTarget(wrestler, { bookedOpponentId, roster, heatMap, rng });
  const scenario = pickScenario(persona, target?.type, rng);
  const setting = pickSetting(persona, rng);
  const targetName = targetLabel(target, companyName);
  const speakerName = partner ? `${wrestler.name} and ${partner.name}` : wrestler.name;

  let quote = scenario.template(speakerName, targetName);
  if (persona.signatureLines?.length && rng() < 0.5) {
    quote += ` ${persona.signatureLines[Math.floor(rng() * persona.signatureLines.length)]}`;
  }

  const { score, notes } = computePopScore({ wrestler, target, scenario, partner, rng });

  return {
    wrestlerId,
    partnerId: partner?.id ?? null,
    target,
    targetName,
    setting: setting.text,
    scenarioId: scenario.id,
    scenarioCategory: scenario.category,
    quote,
    popScore: score,
    notes,
  };
}
