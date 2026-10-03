// Booking projection engine.
//
// Nothing here decides a winner. This module answers a single question for the player:
// "if I run this card, what is it likely to do?" — quality range, heat, cost, gate,
// injury exposure, and how stale the booking is getting.

import { getWrestlerById, computeChemistry } from '../data/wrestlers.js';
import { getVenueById, homeFieldTier } from '../data/venues.js';
import { getMatchType, getStake, getMatchLength } from '../data/matchTypes.js';
import { CHAMPIONSHIPS, getChampionship, defenseStatus } from '../data/championships.js';
import {
  getPromoTier, getStagePackage, getTicketTier, getEntrancePackage, getExtra, getCelebrity,
} from '../data/production.js';
import {
  concessionsPerHead, demandModFromRatio, goodwillDemandMult, merchPriceFactor, ticketPriceRatio,
} from '../data/finances.js';
import { gimmickRarity, GIMMICK_FATIGUE, isBasicMatchType } from '../data/cards.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const average = list => (list.length ? list.reduce((sum, n) => sum + n, 0) / list.length : 0);

export function championshipBuildup(match, leadUpLog = []) {
  if (!match.titleId) return { bonus: 0, label: null };
  const beats = leadUpLog.filter(entry => entry.matchId === match.id);
  const weeks = new Set(beats.map(entry => entry.week).filter(Boolean));
  if (weeks.size < 2) {
    return {
      bonus: 0,
      label: beats.length ? 'Championship angle started too late to build real heat' : null,
    };
  }
  const activities = new Set(beats.map(entry => entry.activityId).filter(Boolean));
  const repetitionPenalty = Math.max(0, beats.length - activities.size) * 2;
  const timingBonus = weeks.size === 2 ? 5 : 8;
  const bonus = Math.max(0, timingBonus + Math.min(3, activities.size - 1) - repetitionPenalty);
  return {
    bonus,
    label: bonus
      ? `Championship buildup across ${weeks.size} weeks (+${bonus} heat)`
      : 'Championship buildup became repetitive',
  };
}

export function matchParticipantIds(match) {
  return match.teams.flat().filter(Boolean);
}

export function pairKey(ids) {
  return [...ids].sort().join('|');
}

// ---------------------------------------------------------------------------
// Talent cost
// ---------------------------------------------------------------------------
// Stars cost real money, gimmick matches carry hazard pay, and the main event
// slot is a negotiated premium on top of everything else.
export function talentPurse(wrestler, { type, stake, isMainEvent }) {
  if (!wrestler) return 0;
  const ability = average(Object.values(wrestler.stats));
  let purse = wrestler.popularity * 45 + ability * 12;
  purse *= 1 + (wrestler.hidden?.ego ?? 50) / 400;
  purse += (type?.injury ?? 0) * 900; // hazard pay
  if (stake?.id === 'title') purse *= 1.15;
  if (stake?.id === 'career' || stake?.id === 'mask-hair') purse *= 1.22;
  if (isMainEvent) purse *= 1.35;
  return Math.round(purse / 100) * 100;
}

// ---------------------------------------------------------------------------
// Per-match projection
// ---------------------------------------------------------------------------
function weightedStatScore(wrestler, demands) {
  return Object.entries(demands).reduce(
    (total, [stat, weight]) => total + (wrestler.stats[stat] ?? 50) * weight,
    0,
  );
}

function averageChemistry(ids) {
  const scores = [];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const result = computeChemistry(ids[i], ids[j]);
      if (result) scores.push(result.score);
    }
  }
  return scores.length ? average(scores) : 50;
}

export function projectMatch(match, context = {}) {
  const {
    venue = null,
    stage = getStagePackage('house'),
    isMainEvent = false,
    position = 0,
    cardSize = 1,
    staleness = null,
    staminaLookup = () => 100,
    moraleLookup = () => 65,
    titles = {},
    teams = [],
    showNumber = 1,
  } = context;

  const type = getMatchType(match.typeId);
  const stake = getStake(match.stakeId);
  const length = getMatchLength(match.lengthId);
  const titleDef = match.titleId ? getChampionship(match.titleId) : null;
  const titleState = titleDef ? titles[titleDef.id] : null;
  const ids = matchParticipantIds(match);
  const roster = ids.map(getWrestlerById).filter(Boolean);
  const notes = [];
  const warnings = [];
  let extraVariance = 0;
  let extraInjuryRisk = 0;

  // Easter egg: Bret Hart vs. Ric Flair, for the title, in the first few shows of the
  // promotion's life — two "I never lost it" claims settled in the ring. Basically a
  // guaranteed classic rather than a normal projection roll.
  const isInauguralDreamMatch = Boolean(titleDef)
    && ids.length === 2
    && ['bret-hart', 'ric-flair'].every(id => ids.includes(id))
    && showNumber <= 3;

  const filled = roster.length >= (type?.slots.min ?? 2) && roster.length <= (type?.slots.max ?? Infinity);
  if (!type) return emptyProjection('No match type selected.');
  if (!filled) {
    warnings.push(roster.length > type.slots.max
      ? `Allows up to ${type.slots.max} wrestlers — ${roster.length} booked.`
      : `Needs ${type.slots.min} wrestlers — ${roster.length} booked.`);
  }

  // --- presentation spend -------------------------------------------------
  const entrances = (match.entrances || []).map(getEntrancePackage);
  const extras = (match.extras || []).map(getExtra).filter(Boolean);
  const celebrity = getCelebrity(match.celebrityId);
  const entranceCost = entrances.reduce((sum, e) => sum + e.cost, 0);
  const extrasCost = extras.reduce((sum, e) => sum + e.cost, 0);
  const presentationSpend = entranceCost + extrasCost + celebrity.cost + type.cost + stake.cost;

  const presentationScore =
    entrances.reduce((sum, e) => sum + e.presentation, 0) +
    celebrity.presentation +
    stage.presentation * 0.4;

  const safetyNet = extras.reduce((sum, e) => sum + (e.safety ?? 0), 0);

  if (!roster.length) {
    return {
      ...emptyProjection('Empty slot.'),
      cost: presentationSpend,
      warnings,
    };
  }

  // --- worker quality -----------------------------------------------------
  const workerScores = roster.map(w => weightedStatScore(w, type.demands));
  const workerAvg = average(workerScores);
  const workerSpread = Math.max(...workerScores) - Math.min(...workerScores);
  const starPower = average(roster.map(w => w.popularity));
  const chemistry = averageChemistry(ids);

  let quality = workerAvg * 0.62 + starPower * 0.18;
  const baseline = quality;

  // Every adjustment is recorded so the post-show report can explain the result.
  const factors = [];
  const add = (label, delta, kind = 'neutral') => {
    if (!delta) return;
    quality += delta;
    factors.push({ label, delta: Math.round(delta * 10) / 10, kind });
  };

  add(
    `Chemistry between the workers (${Math.round(chemistry)}%)`,
    (chemistry - 50) * 0.38 * type.chemistryWeight,
    'chemistry',
  );
  const bookedTeams = type.id === 'tag-team'
    ? teams.filter(team => team.active && match.teams.some(side => side.length === 2 && team.memberIds.every(id => side.includes(id))))
    : [];
  bookedTeams.forEach(team => add(`${team.name} team cohesion`, Math.max(0, team.chemistry - 60) * 0.12, 'chemistry'));
  if (chemistry >= 78) notes.push(`Chemistry reads ${Math.round(chemistry)} — this pairing should click.`);
  if (chemistry <= 38) warnings.push(`Chemistry reads ${Math.round(chemistry)} — these styles fight each other.`);

  // A huge ability gap makes the match a squash rather than a contest.
  if (workerSpread > 22) {
    add('Talent gap makes it a squash', -(workerSpread - 22) * 0.45, 'matchmaking');
    warnings.push('Talent gap is wide — this may read as a squash.');
  }

  // --- conditioning vs. automatically assigned card pacing ----------------
  const conditioning = average(roster.map(w => w.stats.stamina * (staminaLookup(w.id) / 100)));
  const staminaNeeded = 46 * length.staminaDemand + type.drain * 0.7;
  const pacingLabel = length.id === 'sprint' ? 'Opener pacing'
    : length.id === 'extended' ? 'Main-event pacing'
      : `${length.name} pacing`;
  if (conditioning < staminaNeeded) {
    const shortfall = staminaNeeded - conditioning;
    const conditioningLabel = length.id === 'extended'
      ? 'Main event extended length exceeds available stamina'
      : `${pacingLabel} exceeds this crew's gas tank`;
    add(conditioningLabel, -shortfall * 0.55, 'conditioning');
    warnings.push(`${length.id === 'extended' ? 'The main event’s automatically assigned extended length' : `Automatic ${length.name.toLowerCase()} pacing`} exceeds this crew's available stamina (short by ${Math.round(shortfall)}).`);
  } else if (length.id === 'epic' || length.id === 'extended') {
    add('Conditioned for the automatic main-event pace', 4, 'conditioning');
    notes.push('The crew is conditioned for its automatically assigned main-event pace.');
  }

  // --- momentum, stakes, presentation -------------------------------------
  add('Momentum coming in', average(roster.map(w => w.momentum)) * 2.2, 'momentum');
  add('Entrance & production spend', clamp(presentationScore * 0.32, 0, 14), 'presentation');

  // --- morale ---------------------------------------------------------------
  const morale = average(roster.map(w => moraleLookup(w.id)));
  add('Locker room mood', (morale - 65) * 0.16, 'morale');
  if (morale <= 35) warnings.push('This group is unhappy right now — it shows in the work.');

  // Stakes raise expectations: good workers rise to it, weak cards get exposed.
  const pressure = stake.pressure;
  add(`${stake.name} pressure`, pressure * ((workerAvg - 68) / 22) * 0.9, 'stakes');
  if (pressure >= 12 && workerAvg < 66) {
    warnings.push(`${stake.name} on a card these two cannot carry — the crowd will feel it.`);
  }
  if (titleDef && context.championshipBuildup?.bonus) {
    add(context.championshipBuildup.label, context.championshipBuildup.bonus, 'stakes');
    notes.push(context.championshipBuildup.label);
  } else if (titleDef && context.championshipBuildup?.label) {
    warnings.push(`${context.championshipBuildup.label}.`);
  }
  if (type.ceiling >= 6 && type.id !== 'submission') {
    const gimmickSupport = (starPower - 60) / 10 + (isMainEvent ? 2 : 0);
    if (gimmickSupport < type.ceiling / 3) {
      const penalty = Math.round(type.ceiling / 2);
      add(`${type.name} without enough heat`, -penalty, 'matchmaking');
      extraVariance += penalty;
      extraInjuryRisk += Math.max(1, type.injury * 0.12);
      warnings.push(`${type.name} has a high ceiling, but without heat or star power it can backfire.`);
    }
  }

  // --- venue crowd taste ---------------------------------------------------
  const taste = venue?.crowdTaste?.[type.flavor] ?? 1;
  const beforeTaste = quality;
  quality *= 0.82 + taste * 0.18;
  if (venue) {
    factors.push({
      label: `${venue.city} crowd vs. ${type.flavor} matches`,
      delta: Math.round((quality - beforeTaste) * 10) / 10,
      kind: 'crowd',
    });
  }
  if (venue && taste >= 1.15) notes.push(`${venue.city} eats up ${type.flavor} matches.`);
  if (venue && taste <= 0.92) warnings.push(`${venue.city} is a cold room for ${type.flavor} matches.`);

  // --- card position -------------------------------------------------------
  if (isMainEvent) {
    add(starPower >= 82 ? 'Genuine main-event stars' : 'Thin star power for a headline slot', starPower >= 82 ? 5 : -6, 'position');
    if (starPower < 74) warnings.push('Main event star power is thin for a headline slot.');
  } else if (position === 0) {
    add('Fresh crowd in the opening slot', 2, 'position');
  }

  // --- freshness / repetition ---------------------------------------------
  const stalePenalty = staleness?.penalty ?? 0;
  if (stalePenalty) {
    add('Repetitive booking', -stalePenalty * 0.7, 'freshness');
    (staleness.reasons || []).forEach(reason => warnings.push(reason));
  }

  // --- championship --------------------------------------------------------
  // A belt is worth exactly what its prestige says it is worth.
  let titleInfo = null;
  if (titleDef && titleState) {
    const vacant = !titleState.holders.length;
    const championIn = titleState.holders.some(id => ids.includes(id));
    add(`${titleDef.name} on the line`, (titleState.prestige - 50) * 0.16, 'stakes');

    if (!vacant && !championIn) {
      warnings.push(`${titleDef.name} match without the champion. Book the title holder or it is not a defence.`);
    }
    if (titleDef.kind === 'tag' && type.id !== 'tag-team') {
      warnings.push(`${titleDef.name} should be defended in a tag team match.`);
    }
    if (titleDef.kind === 'singles' && type.slots.perTeam > 1) {
      warnings.push(`${titleDef.name} is a singles title — a tag match muddies the decision.`);
    }
    if (vacant) notes.push(`${titleDef.name} is vacant — the winner is crowned champion.`);
    else if (starPower < titleDef.expectedPopularity - 18) {
      warnings.push(`This is beneath the ${titleDef.name}. Weak challengers devalue the belt.`);
    }

    titleInfo = {
      id: titleDef.id,
      name: titleDef.name,
      short: titleDef.short,
      vacant,
      championIn,
      prestige: Math.round(titleState.prestige),
      holders: [...titleState.holders],
      defenses: titleState.defenses,
    };
  }

  // --- gimmick card payoff --------------------------------------------------
  // Rarity is reliability, not just size. And a stipulation only pays off in full on a
  // feud that has been built — the same card on a cold match is a wasted card.
  const rarity = gimmickRarity(type.id);
  const payoff = 1;

  // --- ceiling & variance ---------------------------------------------------
  const ceiling = clamp(
    64 + type.ceiling + (rarity ? rarity.ceilingBonus * payoff : 0) + length.ceilingMod + (chemistry - 50) * 0.28 + starPower * 0.12 + presentationScore * 0.12,
    45,
    99,
  );
  let expected = clamp(quality, 5, ceiling);
  let dreamMatchCeiling = ceiling;
  if (isInauguralDreamMatch) {
    expected = Math.max(expected, 90);
    dreamMatchCeiling = Math.max(dreamMatchCeiling, 97);
    notes.push('The Inaugural Classic — Bret Hart and Ric Flair, title on the line, in the promotion\'s first few shows. This one was always going to deliver.');
  }

  const reliability = average(roster.map(w => (w.hidden?.workEthic ?? 60)));
  const riskAppetite = average(roster.map(w => (w.hidden?.riskTolerance ?? 50)));
  let variance = type.variance + (length.id === 'epic' ? 4 : 0) + (100 - reliability) * 0.12 + extraVariance;
  if (rarity) variance *= rarity.varianceMod;
  variance *= 1 - clamp(safetyNet / 40, 0, 0.25);
  if (match.scouted) {
    const scoutingStrength = match.scouted === true ? 1 : Number(match.scouted) || 1;
    variance *= Math.max(0.45, 1 - scoutingStrength * 0.22);
    notes.push('Scouted ahead of time — fewer surprises expected in this one.');
  }
  if (isInauguralDreamMatch) variance = Math.min(variance, 6);
  variance = Math.round(variance);

  const low = clamp(Math.round(expected - variance * 1.1), 0, 100);
  const high = clamp(Math.round(expected + variance), 0, 100);

  // --- buzz (marquee value) -------------------------------------------------
  let buzz = type.buzz + stake.buzz + celebrity.draw;
  if (rarity) {
    buzz += rarity.buzzBonus * payoff;
  }
  if (titleState) buzz += titleState.prestige * 0.22;
  if (match.promoCardEffect?.matchBuzz) {
    buzz += match.promoCardEffect.matchBuzz;
    notes.push(`Promo card raised match hype by ${match.promoCardEffect.matchBuzz}.`);
  }
  buzz += extras.reduce((sum, e) => sum + (e.buzz ?? 0), 0);
  buzz += entrances.reduce((sum, e) => sum + e.heat, 0);
  buzz += (starPower - 60) * 0.45;
  if (venue) {
    const homeDraws = roster.filter(w => homeFieldTier(w, venue));
    homeDraws.forEach(w => {
      const tier = homeFieldTier(w, venue);
      buzz += tier === 'home' ? 10 : 4;
      notes.push(`${w.name} is a ${tier === 'home' ? 'hometown' : 'regional'} draw in ${venue.city}.`);
    });
  }
  buzz -= stalePenalty * 0.5;
  buzz = Math.round(clamp(buzz, -25, 120));

  // --- injury exposure -------------------------------------------------------
  let injuryRisk = type.injury * (1 + length.staminaDemand * 0.3);
  injuryRisk += riskAppetite * 0.04;
  injuryRisk += clamp((staminaNeeded - conditioning) * 0.12, 0, 8);
  injuryRisk += clamp((55 - morale) * 0.1, 0, 6); // distracted, unhappy talent works looser
  injuryRisk += extraInjuryRisk;
  injuryRisk *= 1 - clamp(safetyNet / 28, 0, 0.35);
  injuryRisk = clamp(Math.round(injuryRisk * 10) / 10, 0, 60);
  if (injuryRisk >= 14) warnings.push(`High injury exposure (${injuryRisk}%) — you could lose a star for months.`);

  // --- runtime ---------------------------------------------------------------
  const minutes = Math.max(4, type.baseMinutes + length.minutesMod) + (presentationScore > 12 ? 4 : 2);

  // --- cost -------------------------------------------------------------------
  const purses = roster.reduce((sum, w) => sum + talentPurse(w, { type, stake, isMainEvent }), 0);
  const cost = presentationSpend + purses;

  return {
    valid: filled,
    type,
    stake,
    length,
    roster,
    title: titleInfo,
    chemistry: Math.round(chemistry),
    starPower: Math.round(starPower),
    quality: { low, expected: Math.round(expected), high, ceiling: Math.round(dreamMatchCeiling) },
    grade: gradeFor(expected),
    confidence: confidenceFor(variance),
    baseline: Math.round(baseline),
    factors: factors.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
    variance,
    buzz,
    injuryRisk,
    minutes,
    cost,
    purses,
    presentationSpend,
    presentationScore: Math.round(presentationScore),
    drain: Math.round(type.drain + length.drainMod),
    notes,
    warnings,
  };
}

function emptyProjection(reason) {
  return {
    valid: false,
    quality: { low: 0, expected: 0, high: 0, ceiling: 0 },
    grade: '—',
    confidence: 'unknown',
    baseline: 0,
    factors: [],
    buzz: 0,
    injuryRisk: 0,
    minutes: 0,
    cost: 0,
    purses: 0,
    presentationSpend: 0,
    presentationScore: 0,
    chemistry: 0,
    starPower: 0,
    variance: 0,
    drain: 0,
    notes: [],
    warnings: [reason],
  };
}

// ---------------------------------------------------------------------------
// Freshness / repetition
// ---------------------------------------------------------------------------
// The single fastest way to kill a promotion is to run the same three matches
// every two weeks. History is scanned back three shows with decaying weight.
const RECENCY_WEIGHT = [1, 0.62, 0.34];

const OVERUSE_TIERS = {
  0: { staminaPenalty: 0, qualityPenalty: 0, reason: null },
  1: { staminaPenalty: 6, qualityPenalty: 4, reason: 'Back-to-back booking — nothing serious yet.' },
  2: { staminaPenalty: 16, qualityPenalty: 12, reason: 'Three straight shows is starting to wear on them.' },
  3: { staminaPenalty: 30, qualityPenalty: 22, reason: 'Worked into the ground — this is a significant hit.' },
};

// UFC-style booking cadence, not weekly TV: 2 shows in a row is a minor tax, 3 starts
// to bite, and 4 in a row (or 4-of-5 / 5-of-7 patterns) is a real gamble on a tired,
// injury-prone performance. `history` is newest-first past shows; this show counts as 1.
export function overuseTier(wrestlerId, history = []) {
  const appearedIn = show => (show.matches || []).some(m => (m.participantIds || []).includes(wrestlerId));
  let consecutive = 1;
  for (const show of history) {
    if (appearedIn(show)) consecutive += 1;
    else break;
  }
  const last5 = history.slice(0, 4).filter(appearedIn).length + 1;
  const last7 = history.slice(0, 6).filter(appearedIn).length + 1;
  let tier = 0;
  if (consecutive >= 4 || last5 >= 4 || last7 >= 5) tier = 3;
  else if (consecutive === 3) tier = 2;
  else if (consecutive === 2) tier = 1;
  return { tier, consecutive, ...OVERUSE_TIERS[tier] };
}

// How worn out a stipulation is from recent use. Bigger gimmicks burn out faster —
// a cage every other month stops being an event.
export function gimmickFatigue(typeId, history = []) {
  if (isBasicMatchType(typeId)) return { uses: 0, penalty: 0, reason: null };
  const rarity = gimmickRarity(typeId);
  if (!rarity) return { uses: 0, penalty: 0, reason: null };
  let uses = 0;
  history.slice(0, GIMMICK_FATIGUE.windowShows).forEach(pastShow => {
    (pastShow.matches ?? []).forEach(pastMatch => {
      if (pastMatch.typeId === typeId) uses += 1;
    });
  });
  if (!uses) return { uses: 0, penalty: 0, reason: null };
  const penalty = Math.min(GIMMICK_FATIGUE.max, uses * (GIMMICK_FATIGUE.perUse[rarity.id] ?? 8));
  const name = getMatchType(typeId)?.name ?? typeId;
  return {
    uses,
    penalty,
    reason: uses === 1
      ? `${name} already ran recently — some of the novelty is gone.`
      : `${name} has run ${uses} times in the last ${GIMMICK_FATIGUE.windowShows} shows. The crowd stopped treating it as special.`,
  };
}

export function stalenessForMatch(match, show, history = [], index = 0) {
  const ids = matchParticipantIds(match);
  const reasons = [];
  let penalty = 0;
  if (!ids.length) return { penalty: 0, reasons };

  const key = pairKey(ids);

  history.slice(0, 3).forEach((pastShow, depth) => {
    const weight = RECENCY_WEIGHT[depth];
    pastShow.matches.forEach(pastMatch => {
      if (pairKey(pastMatch.participantIds || []) === key) {
        penalty += 26 * weight;
        reasons.push(`Exact rematch — same bout ran ${depth === 0 ? 'last show' : `${depth + 1} shows ago`}.`);
      }
      if (pastMatch.stakeId === match.stakeId && ['career', 'mask-hair'].includes(match.stakeId)) {
        penalty += 18 * weight;
        reasons.push(`"${getStake(match.stakeId).name}" loses all meaning when you run it every show.`);
      }
    });
  });

  const fatigue = gimmickFatigue(match.typeId, history);
  if (fatigue.penalty) {
    penalty += fatigue.penalty;
    reasons.push(fatigue.reason);
  }

  // Repetition inside the same card.
  show.matches.forEach((other, otherIndex) => {
    if (otherIndex >= index) return;
    if (other.typeId === match.typeId && !isBasicMatchType(match.typeId)) {
      penalty += 12;
      reasons.push(`Second ${getMatchType(match.typeId)?.name} on the same card.`);
    }
    if (other.stakeId === match.stakeId && ['title', 'career', 'mask-hair'].includes(match.stakeId)) {
      penalty += 9;
      reasons.push('Repeated high stakes dilute the whole card.');
    }
  });

  // Over-exposed talent: consecutive/rolling-window booking takes a tiered toll.
  let usagePenalty = 0;
  ids.forEach(id => {
    const usage = overuseTier(id, history);
    if (!usage.qualityPenalty) return;
    usagePenalty += usage.qualityPenalty;
    if (usage.tier >= 2) reasons.push(`${getWrestlerById(id)?.name} — ${usage.reason}`);
  });
  penalty += getMatchType(match.typeId)?.slots.teams ? usagePenalty * Math.min(1, 2 / ids.length) : usagePenalty;

  return { penalty: Math.round(penalty), reasons: [...new Set(reasons)] };
}

function showFreshness(show, history, matchStaleness) {
  const reasons = [];
  let penalty = matchStaleness.reduce((sum, s) => sum + s.penalty, 0) * 0.4;

  const lastShow = history[0];
  if (lastShow && lastShow.venueId === show.venueId) {
    penalty += 14;
    reasons.push('Same building as your last show — the local market is already tapped.');
  }
  if (history.slice(0, 2).every(s => s && s.promoId === show.promoId) && history.length >= 2) {
    penalty += 4;
  }

  const styles = show.matches
    .flatMap(matchParticipantIds)
    .map(id => getWrestlerById(id)?.style)
    .filter(Boolean);
  const uniqueStyles = new Set(styles).size;
  if (styles.length >= 6 && uniqueStyles <= 2) {
    penalty += 12;
    reasons.push('The whole card wrestles the same way. Vary your styles.');
  }

  const mainEvent = show.matches[show.matches.length - 1];
  const mainIds = mainEvent ? matchParticipantIds(mainEvent) : [];
  const repeatedHeadliner = mainIds.filter(id =>
    history.slice(0, 2).every(s => (s.mainEventIds || []).includes(id)),
  );
  if (history.length >= 2 && repeatedHeadliner.length) {
    penalty += 12;
    reasons.push(`${getWrestlerById(repeatedHeadliner[0])?.name} has headlined three straight shows.`);
  }

  const score = clamp(Math.round(100 - penalty), 0, 100);
  return { score, penalty: Math.round(penalty), reasons: [...new Set(reasons)] };
}

// ---------------------------------------------------------------------------
// Full show projection
// ---------------------------------------------------------------------------
export const SHOW_RUNTIME_MINUTES = 120;
// Fixed cost of keeping the lights on and the whole roster under contract between shows.
export const BASE_OVERHEAD = 10000;
export const PER_WRESTLER_RETAINER = 250;

export function companyOverhead(rosterSize) {
  return BASE_OVERHEAD + rosterSize * PER_WRESTLER_RETAINER;
}

export function projectShow(show, options = {}) {
  const {
    history = [], bankroll = 0, staminaLookup = () => 100, moraleLookup = () => 65,
    titles = {}, showNumber = 1, gmLevel = 1, finances = { prices: {}, goodwill: 65 },
    teams = [], leadUpLog = [],
  } = options;

  const venue = getVenueById(show.venueId);
  const promo = getPromoTier(show.promoId);
  const stage = getStagePackage(show.stageId);
  const ticket = getTicketTier(show.ticketId);

  const matchStaleness = show.matches.map((match, index) => stalenessForMatch(match, show, history, index));

  const matches = show.matches.map((match, index) => {
    return projectMatch(match, {
      venue,
      stage,
      isMainEvent: index === show.matches.length - 1,
      position: index,
      cardSize: show.matches.length,
      staleness: matchStaleness[index],
      staminaLookup,
      moraleLookup,
      titles,
      teams,
      championshipBuildup: championshipBuildup(match, leadUpLog),
      showNumber,
    });
  });

  const freshness = showFreshness(show, history, matchStaleness);
  const warnings = [];

  // --- roster validity ------------------------------------------------------
  const allIds = show.matches.flatMap(matchParticipantIds);
  const duplicates = allIds.filter((id, i) => allIds.indexOf(id) !== i);
  [...new Set(duplicates)].forEach(id => {
    warnings.push(`${getWrestlerById(id)?.name ?? 'A wrestler'} is booked in more than one match.`);
  });
  if (show.matches.length < 3) warnings.push('A flagship card needs at least three matches.');
  if (!venue) warnings.push('No venue selected.');

  // --- idle championships ---------------------------------------------------
  const bookedTitles = new Set(show.matches.map(m => m.titleId).filter(Boolean));
  CHAMPIONSHIPS.forEach(def => {
    const titleState = titles[def.id];
    if (!titleState || bookedTitles.has(def.id)) return;
    const status = defenseStatus(def, titleState, showNumber);
    if (status.state === 'overdue') {
      warnings.push(`${def.name} has not been defended in ${status.label.toLowerCase()} — the belt is losing prestige.`);
    } else if (status.state === 'vacant') {
      warnings.push(`${def.name} is vacant. Book a match to crown a champion.`);
    }
  });

  const duplicateTitles = show.matches
    .map(m => m.titleId)
    .filter((id, i, all) => id && all.indexOf(id) !== i);
  if (duplicateTitles.length) warnings.push('The same championship cannot be defended twice on one card.');

  // --- runtime --------------------------------------------------------------
  const runtime = matches.reduce((sum, m) => sum + m.minutes, 0) + 12; // 12 min of show overhead
  if (runtime > SHOW_RUNTIME_MINUTES) {
    warnings.push(`Card runs ${runtime} min against a ${SHOW_RUNTIME_MINUTES} min broadcast window.`);
  }

  // --- expenses -------------------------------------------------------------
  const matchCost = matches.reduce((sum, m) => sum + m.cost, 0);
  const venueCost = venue ? venue.rental + venue.travel : 0;
  const overhead = companyOverhead(options.rosterSize ?? 0);
  const expenses = {
    venue: venueCost,
    promotion: promo.cost,
    staging: stage.cost,
    talent: matches.reduce((sum, m) => sum + m.purses, 0),
    production: matches.reduce((sum, m) => sum + m.presentationSpend, 0),
    overhead,
  };
  const totalCost = venueCost + promo.cost + stage.cost + matchCost + overhead;

  // --- demand ---------------------------------------------------------------
  const bookedStars = [...new Set(allIds)].map(getWrestlerById).filter(Boolean);
  const topStars = bookedStars.map(w => w.popularity).sort((a, b) => b - a).slice(0, 3);
  const cardStarPower = average(topStars);
  const cardBuzz = matches.reduce((sum, m) => sum + m.buzz, 0);

  const brandAudience = Math.max(0, showNumber - 1) * 45 + Math.max(0, gmLevel - 1) * 400;
  let audienceDemand = 250 + (venue?.marketHeat ?? 0) * 8 + cardStarPower * 8
    + cardBuzz * 4 + (freshness.score - 70) * 5 + promo.buzz * 5 + brandAudience;
  const ticketRatio = ticketPriceRatio(finances.prices, gmLevel);
  audienceDemand *= promo.demand * goodwillDemandMult(finances.goodwill);
  audienceDemand *= demandModFromRatio(ticketRatio);
  audienceDemand = Math.max(0, Math.round(audienceDemand));

  const capacity = venue?.capacity ?? 0;
  const attendance = Math.min(capacity, audienceDemand);
  const fillPercent = capacity ? Math.round((attendance / capacity) * 100) : 0;

  // --- show rating ----------------------------------------------------------
  const weights = matches.map((_, index) => (index === matches.length - 1 ? 2.2 : 1));
  const weightedQuality =
    matches.reduce((sum, m, i) => sum + m.quality.expected * weights[i], 0) /
    (weights.reduce((sum, w) => sum + w, 0) || 1);

  const goodwillRating = Math.round((finances.goodwill - 50) * 0.12);
  const crowdHeat = fillPercent * 0.12 + goodwillRating;
  let rating = weightedQuality * 0.78 + crowdHeat + stage.presentation * 0.25;
  rating -= freshness.penalty * 0.35;
  rating = clamp(Math.round(rating), 0, 100);

  const showFactors = [
    { label: 'Average in-ring quality (main event counts double)', delta: Math.round(weightedQuality * 0.78), kind: 'matches' },
    { label: `Crowd heat at ${fillPercent}% capacity`, delta: Math.round(fillPercent * 0.12), kind: 'crowd' },
    { label: `Fan goodwill (${finances.goodwill}/100)`, delta: goodwillRating, kind: 'pricing' },
    { label: `${stage.name} presentation`, delta: Math.round(stage.presentation * 0.25), kind: 'presentation' },
    { label: 'Repetitive booking', delta: -Math.round(freshness.penalty * 0.35), kind: 'freshness' },
  ].filter(f => f.delta);

  const ratingLow = clamp(
    Math.round(rating - average(matches.map(m => m.variance)) * 0.9),
    0,
    100,
  );
  const ratingHigh = clamp(
    Math.round(rating + average(matches.map(m => m.variance)) * 0.8),
    0,
    100,
  );

  // --- revenue --------------------------------------------------------------
  const prices = finances.prices;
  const ticketMix = gmLevel >= 2
    ? { general: .82, premium: .14, suite: .04 }
    : { general: .9, premium: .1, suite: 0 };
  const ticketPrice = ['general', 'premium', 'suite'].reduce(
    (sum, id) => sum + (prices[id] ?? 0) * ticketMix[id],
    0,
  );
  const gate = Math.round(attendance * ticketPrice);
  const concessions = Math.round(attendance * concessionsPerHead(prices));
  const merch = Math.round(attendance * (3.4 + cardStarPower / 14) * merchPriceFactor(prices));
  const tvBase = venue ? venue.tvReach * 168000 : 0;
  const televisionGuarantee = gmLevel === 1 ? 42000 : gmLevel === 2 ? 26000 : 0;
  const television = Math.max(
    televisionGuarantee,
    Math.round(tvBase * (1 + stage.tvBonus) * clamp(rating / 62, 0.35, 1.8)),
  );
  const homeVideo = Math.round(attendance * .18 * (prices.homeVideo ?? 0));
  const revenue = gate + concessions + merch + homeVideo + television;
  const profit = revenue - totalCost;
  const profitRange = {
    low: Math.round(revenue * 0.78 - totalCost),
    high: Math.round(revenue * 1.22 - totalCost),
  };

  const injuryExposure = Math.round(
    (1 - matches.reduce((acc, m) => acc * (1 - m.injuryRisk / 100), 1)) * 100,
  );

  const riskIndex = clamp(
    Math.round(
      average(matches.map(m => m.variance)) * 2.4 +
      injuryExposure * 0.8 +
      (totalCost / Math.max(bankroll, 1)) * 45 +
      promo.risk * 2,
    ),
    0,
    100,
  );

  if (bankroll && totalCost > bankroll) warnings.push('This card costs more than you have in the bank.');
  if (profit < 0) warnings.push(`Projected loss of $${Math.abs(profit).toLocaleString()} on this show.`);

  // A defence without the champion in it is not a defence.
  const titleBlocked = show.matches.some(match => {
    const titleState = match.titleId ? titles[match.titleId] : null;
    if (!titleState || !titleState.holders.length) return false;
    return !titleState.holders.some(id => matchParticipantIds(match).includes(id));
  });

  return {
    venue,
    promo,
    stage,
    ticket,
    matches,
    freshness,
    factors: showFactors.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
    warnings: [...new Set(warnings)],
    runtime,
    runtimeLimit: SHOW_RUNTIME_MINUTES,
    attendance,
    audienceDemand,
    attendanceRange: {
      low: Math.round(attendance * 0.84),
      high: Math.min(capacity, Math.round(attendance * 1.14)),
    },
    capacity,
    fillPercent,
    ticketPrice: Math.round(ticketPrice),
    finances,
    cardStarPower: Math.round(cardStarPower),
    cardBuzz: Math.round(cardBuzz),
    rating,
    grade: gradeFor(rating),
    ratingRange: { low: ratingLow, high: ratingHigh },
    stars: Math.round((rating / 20) * 2) / 2,
    revenue: { gate, concessions, merch, homeVideo, television, total: revenue },
    televisionGuarantee,
    expenses,
    overhead,
    totalCost,
    profit,
    profitRange,
    injuryExposure,
    riskIndex,
    readyToRun:
      Boolean(venue) &&
      show.matches.length >= 3 &&
      matches.every(m => m.valid) &&
      !duplicateTitles.length &&
      !titleBlocked &&
      !duplicates.length,
  };
}

export function ratingLabel(rating) {
  if (rating >= 90) return 'INSTANT CLASSIC';
  if (rating >= 80) return 'EXCELLENT';
  if (rating >= 70) return 'STRONG SHOW';
  if (rating >= 58) return 'SOLID';
  if (rating >= 45) return 'FORGETTABLE';
  if (rating >= 30) return 'POOR';
  return 'DISASTER';
}

// Letter grades keep the pre-show read honest without handing over the exact math.
export function gradeFor(rating) {
  if (rating >= 93) return 'A+';
  if (rating >= 86) return 'A';
  if (rating >= 79) return 'A-';
  if (rating >= 73) return 'B+';
  if (rating >= 66) return 'B';
  if (rating >= 59) return 'B-';
  if (rating >= 52) return 'C+';
  if (rating >= 45) return 'C';
  if (rating >= 38) return 'C-';
  if (rating >= 30) return 'D';
  return 'F';
}

export function confidenceFor(variance) {
  if (variance <= 10) return 'reliable';
  if (variance <= 16) return 'uncertain';
  if (variance <= 22) return 'volatile';
  return 'wild';
}

export function freshnessLabel(score) {
  if (score >= 88) return 'FRESH';
  if (score >= 72) return 'FAMILIAR';
  if (score >= 55) return 'REPETITIVE';
  if (score >= 35) return 'STALE';
  return 'PREDICTABLE';
}
