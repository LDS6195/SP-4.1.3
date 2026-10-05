// Match and show simulation.
//
// Wrestling is real in this universe. The player books the matchups, the stakes, and
// the money — the ring decides the rest. Every winner here comes out of the numbers.

import { getDraftTier, getWrestlerById } from '../data/wrestlers.js';
import { getMatchType, getStake, getMatchLength } from '../data/matchTypes.js';
import { getChampionship, titleMatchCompatible } from '../data/championships.js';
import { eventBroadcastGuarantee, FINANCE_VARIANCE } from '../data/finances.js';
import { matchParticipantIds, ratingLabel, gradeFor } from './bookingEngine.js';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rand = (min, max) => min + Math.random() * (max - min);
const pick = list => list[Math.floor(Math.random() * list.length)];
const TIER_RANK = { jobber: 0, contender: 2, star: 3, legend: 4 };

// Triangular roll: outcomes cluster around the projection but the tails are real.
function triangular(low, high, mode) {
  const u = Math.random();
  const range = high - low || 1;
  const split = (mode - low) / range;
  return u < split
    ? low + Math.sqrt(u * range * (mode - low))
    : high - Math.sqrt((1 - u) * range * (high - mode));
}

export function starString(rating) {
  const stars = clamp(rating / 20, 0, 5);
  const full = Math.floor(stars);
  const remainder = stars - full;
  const fraction = remainder >= 0.75 ? '¾' : remainder >= 0.5 ? '½' : remainder >= 0.25 ? '¼' : '';
  return `${'★'.repeat(full)}${fraction}${full === 0 && !fraction ? 'DUD' : ''}`;
}

function clockTime(minutes) {
  const total = Math.max(60, Math.round(minutes * 60 * rand(0.8, 1.12)));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Who wins
// ---------------------------------------------------------------------------
function competitorStrength(wrestler, type, staminaPct) {
  const demands = type.demands;
  const ability = Object.entries(demands).reduce(
    (sum, [stat, weight]) => sum + (wrestler.stats[stat] ?? 50) * weight,
    0,
  );
  const exhaustionPenalty = staminaPct < 70
    ? Math.pow((70 - staminaPct) / 10, 1.35) * 3.5
    : 0;
  return (
    ability * 0.55 +
    wrestler.popularity * 0.2 +
    wrestler.momentum * 3.5 +
    (wrestler.hidden?.workEthic ?? 60) * 0.06 +
    (staminaPct - 70) * 0.28 -
    exhaustionPenalty
  );
}

function competitorScore(wrestler, type, staminaPct) {
  return competitorStrength(wrestler, type, staminaPct) + rand(-20, 20);
}

function resolveOutcome(type, stake, decisiveness) {
  if (type.id === 'submission') return 'submission';
  if (type.id === 'last-man-standing') return 'knockout';
  if (type.id === 'ladder') return 'retrieval';
  if (type.id === 'casket') return 'casket';
  if (type.id === 'battle-royal') return 'elimination';
  if (type.id === 'iron-man' && Math.random() < 0.12) return 'time-limit draw';

  const noDq = ['street-fight', 'steel-cage'].includes(type.id);
  const roll = Math.random();
  if (!noDq && roll < 0.05 && decisiveness < 0.35) return 'disqualification';
  if (!noDq && roll < 0.09 && decisiveness < 0.3) return 'count-out';
  if (roll < 0.22) return 'submission';
  return 'pinfall';
}

const OUTCOME_VERB = {
  pinfall: 'pinned',
  submission: 'submitted',
  knockout: 'knocked out',
  retrieval: 'out-climbed',
  casket: 'buried',
  elimination: 'last-eliminated',
  'count-out': 'beat (count-out)',
  disqualification: 'beat (DQ)',
  'time-limit draw': 'went the distance with',
};

// ---------------------------------------------------------------------------
// Narration
// ---------------------------------------------------------------------------
const OPENERS = [
  '{a} and {b} felt each other out, trading holds to a respectful crowd.',
  '{a} jumped {b} before the bell and the fight spilled straight to the floor.',
  'The two locked up clean, and {a} took the early advantage with pure {style} work.',
  '{b} tried to end it inside ninety seconds and paid for the arrogance.',
];
const MIDDLES = [
  '{b} took over with a long heat segment that had the building booing every rest hold.',
  'The pace turned brutal — {a} kicked out at 2.9 and the crowd came completely unglued.',
  '{a} went to the signature too early and {b} countered it into a near-fall.',
  'A collision on the outside left both of them beaten and the referee at a count of eight.',
];
const LATES = [
  '{b} hit the {finisher} and could not cover in time.',
  'They traded strikes in the center of the ring while the crowd counted along.',
  '{a} escaped the {finisher} and the arena audibly gasped.',
  'A referee bump muddied the finishing stretch and the crowd smelled a screwjob.',
];

function narrate(templates, { a, b, finisher, style }) {
  return pick(templates)
    .replace('{a}', a)
    .replace('{b}', b)
    .replace('{finisher}', finisher)
    .replace('{style}', style.toLowerCase());
}

function crowdReaction(rating) {
  if (rating >= 90) return 'The building would not stop chanting. People stayed in their seats afterward.';
  if (rating >= 78) return 'A genuine standing ovation as they left.';
  if (rating >= 64) return 'Strong, sustained reaction all the way to the finish.';
  if (rating >= 50) return 'Polite applause. The crowd was with it but never lost.';
  if (rating >= 36) return 'The room went quiet in the middle and never fully came back.';
  return 'Audible boos and a "boring" chant by the midpoint.';
}

// ---------------------------------------------------------------------------
// Single match
// ---------------------------------------------------------------------------
export function simulateMatch(match, projection, context = {}) {
  const { staminaLookup = () => 100, isMainEvent = false, position = 0, total = 1, isBattleRoyale = match.typeId === 'battle-royal' } = context;
  const type = getMatchType(match.typeId);
  const stake = getStake(match.stakeId);
  const length = getMatchLength(match.lengthId);
  const ids = matchParticipantIds(match);
  const roster = ids.map(getWrestlerById).filter(Boolean);

  const rating = Math.round(
    triangular(projection.quality.low, projection.quality.high, projection.quality.expected),
  );

  // Teams compete as units; a side's score is its average plus a small unit bonus.
  const sides = type.slots.teams
    ? match.teams.map(team => team.filter(Boolean))
    : ids.map(id => [id]);

  const scored = sides.map(side => {
    const members = side.map(getWrestlerById).filter(Boolean);
    const teamBonus = members.length > 1 ? 4 : 0;
    const score = members.length
      ? members.reduce((sum, w) => sum + competitorScore(w, type, staminaLookup(w.id)), 0) / members.length + teamBonus
      : -999;
    const strength = members.length
      ? members.reduce((sum, w) => sum + competitorStrength(w, type, staminaLookup(w.id)), 0) / members.length + teamBonus
      : -999;
    return { side, members, score, strength };
  }).sort((x, y) => y.score - x.score);

  if (!match.winnerId && scored.length === 2) {
    const [favorite, underdog] = [...scored].sort((a, b) => b.strength - a.strength);
    const favoriteTier = TIER_RANK[getDraftTier(favorite.members[0])] ?? 2;
    const underdogTier = TIER_RANK[getDraftTier(underdog.members[0])] ?? 2;
    const tierGap = clamp(favoriteTier - underdogTier, 0, 4);
    const tierUpsetChance = [0.35, 0.3, 0.2, 0.1, 0.05][tierGap];
    const strengthAdjustment = clamp((underdog.strength - favorite.strength) * 0.0005, -0.025, 0.025);
    const upsetChance = clamp(tierUpsetChance + strengthAdjustment, 0.05, 0.5);
    const selectedWinner = Math.random() < upsetChance ? underdog : favorite;
    if (scored[0] !== selectedWinner) scored.reverse();
  }

  // A booked finish overrides the numbers — "let fate decide" (no pick) leaves the
  // honest simulation above untouched. The score gap still feeds decisiveness below,
  // so calling an upset naturally reads as scrappier/more controversial.
  if (match.winnerId) {
    const calledIndex = scored.findIndex(s => s.members.some(w => w.id === match.winnerId));
    if (calledIndex > 0) scored.unshift(...scored.splice(calledIndex, 1));
  }

  const winners = scored[0];
  const runnerUp = scored[1];
  const gap = runnerUp ? winners.score - runnerUp.score : 20;
  const decisiveness = clamp(gap / 30, 0, 1);
  const outcome = resolveOutcome(type, stake, decisiveness);
  const draw = outcome === 'time-limit draw';

  const winnerNames = winners.members.map(w => w.name).join(' & ');
  const loserNames = runnerUp ? runnerUp.members.map(w => w.name).join(' & ') : '';
  const finisher = winners.members[0]?.signatureMoves?.[0] ?? 'a running finish';
  const time = clockTime(projection.minutes);

  const upset = Boolean(runnerUp && winners.strength < runnerUp.strength);

  const finish = draw
    ? `${winnerNames} and ${loserNames} fought to a draw at ${time}.`
    : sides.length > 2
      ? `${winnerNames} won the ${type.name.toLowerCase()} at ${time} (${finisher}).`
      : `${winnerNames} ${OUTCOME_VERB[outcome]} ${loserNames} at ${time} with the ${finisher}.`;

  const narrationContext = {
    a: winners.members[0]?.name ?? 'The favourite',
    b: runnerUp?.members[0]?.name ?? 'The field',
    finisher,
    style: winners.members[0]?.style ?? 'technical',
  };
  // Heat values drive the broadcast crowd meter and the pacing of the call.
  const heatScale = 0.62 + rating / 170;
  const beats = [
    { voice: 'pbp', heat: Math.round(36 * heatScale * 1.6), text: narrate(OPENERS, narrationContext) },
    { voice: 'colour', heat: Math.round(58 * heatScale * 1.5), text: narrate(MIDDLES, narrationContext) },
    { voice: 'pbp', heat: Math.round(78 * heatScale * 1.35), text: narrate(LATES, narrationContext) },
    { voice: 'pbp', heat: Math.round(96 * heatScale * 1.25), text: finish, isFinish: true },
  ];

  // --- injuries -------------------------------------------------------------
  let injury = null;
  if (roster.length && Math.random() * 100 < projection.injuryRisk) {
    const victim = pick(roster);
    const weeks = Math.max(1, Math.round(rand(1, 3) + projection.injuryRisk / 5));
    injury = {
      id: victim.id,
      name: victim.name,
      weeks,
      note: `${victim.name} came up hurt in the ${type.name.toLowerCase()} and is out roughly ${weeks} week${weeks > 1 ? 's' : ''}.`,
    };
  }

  // --- celebrity fallout ----------------------------------------------------
  const celebrityNote = null;
  const finalRating = clamp(rating, 0, 100);

  // --- championship outcome --------------------------------------------------
  // The belt only changes hands on a decisive finish. A champion who gets counted
  // out or disqualified keeps the gold and the crowd hates it.
  let titleOutcome = null;
  const titleDef = match.titleId ? getChampionship(match.titleId) : null;
  if (titleDef && projection.title && titleMatchCompatible(titleDef, type) && winners.members.length === titleDef.holders) {
    const previousHolders = projection.title.holders;
    const vacant = projection.title.vacant;
    const championWon = !draw && winners.members.some(w => previousHolders.includes(w.id));
    const cheapFinish = ['disqualification', 'count-out'].includes(outcome);

    if (vacant && !draw) {
      titleOutcome = {
        type: 'crowned',
        titleId: titleDef.id,
        titleName: titleDef.name,
        newHolders: winners.members.map(w => w.id),
        newHolderNames: winnerNames,
        previousHolders: [],
        note: `${winnerNames} is the new ${titleDef.name}.`,
      };
    } else if (draw || championWon) {
      titleOutcome = {
        type: 'retained',
        titleId: titleDef.id,
        titleName: titleDef.name,
        newHolders: previousHolders,
        newHolderNames: previousHolders.map(id => getWrestlerById(id)?.name).join(' & '),
        previousHolders,
        note: draw
          ? `${titleDef.name} stays put — a draw is not enough to take a belt.`
          : `${winnerNames} retained the ${titleDef.name}.`,
      };
    } else if (cheapFinish) {
      titleOutcome = {
        type: 'retained-cheap',
        titleId: titleDef.id,
        titleName: titleDef.name,
        newHolders: previousHolders,
        newHolderNames: previousHolders.map(id => getWrestlerById(id)?.name).join(' & '),
        previousHolders,
        note: `${winnerNames} won the match, but the ${titleDef.name} does not change hands on a ${outcome}.`,
      };
    } else {
      titleOutcome = {
        type: 'change',
        titleId: titleDef.id,
        titleName: titleDef.name,
        newHolders: winners.members.map(w => w.id),
        newHolderNames: winnerNames,
        previousHolders,
        note: `NEW CHAMPION: ${winnerNames} took the ${titleDef.name} from ${loserNames}.`,
      };
    }
  }

  // --- career effects --------------------------------------------------------
  const effects = [];
  const showcaseWinners = [];
  const opponents = scored.slice(1).flatMap(group => group.members);
  const opponentTiers = opponents.map(w => TIER_RANK[getDraftTier(w)] ?? -1);
  const hasJobberOpponent = opponents.some(w => getDraftTier(w) === 'jobber');
  const highestOpponentTier = opponentTiers.length ? Math.max(...opponentTiers) : -1;
  scored.forEach((group, groupIndex) => {
    group.members.forEach(w => {
      const won = groupIndex === 0 && !draw;
      const multiLoss = sides.length > 2 && groupIndex > 0;
      const battleRoyaleEarlyEliminated = isBattleRoyale && groupIndex >= Math.max(1, scored.length - 2);
      let popDelta = Math.round((finalRating - 58) / 12);
      let momentumDelta = 0;
      let resultCode = 'N';

      if (draw) {
        resultCode = 'N';
      } else if (won) {
        resultCode = 'W';
        popDelta += 2 + (upset ? 4 : 0);
        momentumDelta = upset ? 2 : 1;
        const tierGap = (TIER_RANK[getDraftTier(w)] ?? -1) - highestOpponentTier;
        const cleanWin = !['disqualification', 'count-out'].includes(outcome);
        if (cleanWin && hasJobberOpponent && tierGap >= 2) {
          const showcaseBonus = Math.min(2, tierGap - 1);
          popDelta += showcaseBonus;
          showcaseWinners.push(w.name);
        }
        if (titleOutcome?.type === 'change' || titleOutcome?.type === 'crowned') {
          popDelta += 6;
          momentumDelta += 1;
        }
      } else if (battleRoyaleEarlyEliminated) {
        resultCode = 'N';
        popDelta = -3;
        momentumDelta = -1;
      } else if (isBattleRoyale && multiLoss) {
        resultCode = 'N';
        popDelta = 4 + Math.max(0, Math.round((finalRating - 60) / 20));
        momentumDelta = 1;
      } else if (multiLoss) {
        resultCode = 'L';
        momentumDelta = finalRating >= 75 ? 0 : -1;
      } else {
        resultCode = 'L';
        popDelta -= 1;
        momentumDelta = -1;
      }

      if (isBattleRoyale && won) {
        popDelta = Math.max(12, popDelta + 10);
        momentumDelta = Math.max(3, momentumDelta);
      }
      if (injury?.id === w.id) momentumDelta -= 1;
      effects.push({ id: w.id, name: w.name, resultCode, popDelta, momentumDelta });
    });
  });
  const showcaseNote = showcaseWinners.length
    ? `${showcaseWinners.join(' & ')} made a dominant statement against enhancement talent.`
    : null;

  return {
    matchId: match.id,
    position,
    label: isMainEvent ? 'MAIN EVENT' : position === 0 ? 'OPENER' : position === total - 2 ? 'SEMI-MAIN' : `MATCH ${position + 1}`,
    typeId: type.id,
    typeName: type.name,
    stakeId: stake.id,
    stakeName: titleDef ? titleDef.name : stake.name,
    titleId: titleDef?.id ?? null,
    titleOutcome,
    lengthName: length.name,
    participantIds: ids,
    sideIds: sides.map(side => [...side]),
    sideNames: sides.map(side => side.map(id => getWrestlerById(id)?.name ?? id).join(' & ')),
    entrances: [],
    winnerNames: draw ? null : winnerNames,
    loserNames,
    winnerIds: draw ? [] : winners.members.map(w => w.id),
    firstEliminatedId: isBattleRoyale ? scored[scored.length - 1]?.members[0]?.id ?? null : null,
    secondEliminatedId: isBattleRoyale ? scored[scored.length - 2]?.members[0]?.id ?? null : null,
    outcome: draw ? 'draw' : outcome,
    upset,
    rating: finalRating,
    grade: gradeFor(finalRating),
    stars: starString(finalRating),
    buzz: projection.buzz,
    projected: projection.quality.expected,
    time,
    finish,
    beats,
    crowd: crowdReaction(finalRating),
    injury,
    celebrityNote,
    showcaseNote,
    effects,
    chemistry: projection.chemistry,
    cost: projection.cost,
  };
}

// ---------------------------------------------------------------------------
// Headlines and storylines
// ---------------------------------------------------------------------------
function buildNarrative(showName, results, meta) {
  const headlines = [];
  const storylines = [];

  const best = [...results].sort((a, b) => b.rating - a.rating)[0];
  const worst = [...results].sort((a, b) => a.rating - b.rating)[0];
  const main = results[results.length - 1];

  if (best && best.rating >= 82) {
    headlines.push(`MATCH OF THE NIGHT: ${best.sideNames.join(' vs. ')} tore the house down (${best.stars}).`);
  }
  if (worst && worst.rating <= 42) {
    headlines.push(`${worst.sideNames.join(' vs. ')} lost the crowd completely and dragged the card down.`);
  }
  results.filter(r => r.upset).forEach(r => {
    headlines.push(`UPSET: ${r.winnerNames} beat ${r.loserNames} and nobody saw it coming.`);
    storylines.push(`${r.winnerNames} has a claim nobody can ignore after beating ${r.loserNames} clean.`);
  });
  results.filter(r => r.injury).forEach(r => headlines.push(r.injury.note));
  results.filter(r => r.showcaseNote).forEach(r => headlines.push(`SHOWCASE WIN: ${r.showcaseNote}`));
  results.filter(r => r.titleOutcome).forEach(r => {
    const outcome = r.titleOutcome;
    if (outcome.type === 'change' || outcome.type === 'crowned') {
      headlines.push(outcome.note);
      storylines.push(`${outcome.newHolderNames} now carries the ${outcome.titleName}. Every contender in the building wants a shot.`);
    } else if (outcome.type === 'retained-cheap') {
      headlines.push(outcome.note);
      storylines.push(`${outcome.newHolderNames} escaped with the ${outcome.titleName}. That finish settled nothing.`);
    }
  });

  if (main) {
    if (main.stakeId === 'career') storylines.push(`${main.loserNames} put a career on the line and lost it.`);
    if (main.outcome === 'disqualification' || main.outcome === 'count-out') {
      storylines.push(`A non-finish in the main event means ${main.sideNames.join(' and ')} are nowhere near done with each other.`);
    }
  }
  if (meta.fillPercent >= 98) storylines.push(`${meta.city} sold out. The market is ready for a return date at a bigger building.`);
  if (meta.fillPercent <= 45) storylines.push(`Empty seats in ${meta.city} are a problem the office will hear about.`);

  return { headlines, storylines };
}

function buildRecap(showName, meta, results, rating) {
  const main = results[results.length - 1];
  const best = [...results].sort((a, b) => b.rating - a.rating)[0];
  const opener = results[0];

  const verdict = rating >= 82
    ? 'a show people are going to talk about for months'
    : rating >= 68
      ? 'a strong night that moved the company forward'
      : rating >= 52
        ? 'a serviceable card that did what it needed to do'
        : 'a night the promotion will want to move past quickly';

  return [
    `${showName} drew ${meta.attendance.toLocaleString()} into ${meta.venueName} in ${meta.city} (${meta.fillPercent}% capacity) and did a ${meta.tvRating} television rating with an estimated ${Math.round(meta.tvViewers / 1000).toLocaleString()}K homes watching.`,
    opener ? `${opener.sideNames.join(' vs. ')} opened the show and ${opener.rating >= 60 ? 'got the crowd where they needed to be' : 'never quite woke the building up'}.` : '',
    best ? `The night belonged to ${best.sideNames.join(' vs. ')} — ${best.stars} and ${best.crowd.toLowerCase()}` : '',
    main ? `In the main event, ${main.finish}` : '',
    `Industry consensus: ${verdict}.`,
  ].filter(Boolean).join(' ');
}

// ---------------------------------------------------------------------------
// The booker's report — the game teaching the player what actually mattered
// ---------------------------------------------------------------------------
function mergeFactors(list) {
  const merged = new Map();
  list.forEach(f => {
    const entry = merged.get(f.label) ?? { ...f, delta: 0, count: 0 };
    entry.delta += f.delta;
    entry.count += 1;
    merged.set(f.label, entry);
  });
  return [...merged.values()]
    .map(f => ({ ...f, delta: Math.round(f.delta * 10) / 10 }))
    .filter(f => Math.abs(f.delta) >= 0.5)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

const LESSONS = {
  freshness: 'Rotate your matchups and stipulations. The crowd punishes repetition harder than it rewards star power.',
  conditioning: 'Match the time allotment to the crew. Tired wrestlers cannot work long, no matter how good they are.',
  chemistry: 'Chemistry outweighs raw ability. Check the scouting read before locking a pairing.',
  crowd: 'Every market wants something specific. Book to the building, not to your own taste.',
  matchmaking: 'Keep the ability gap tight. Mismatches read as squashes and squashes do not draw.',
  stakes: 'Big stipulations raise expectations. Only hang them on workers who can carry the weight.',
  position: 'Card position matters. Main events need genuine stars at the top.',
  presentation: 'Match cards can lift a suitable matchup, but they cannot rescue poor chemistry.',
};

function buildReport(projection, results, rating) {
  const matchFactors = projection.matches.flatMap(m => m.factors ?? []);
  const merged = mergeFactors([...matchFactors, ...(projection.factors ?? [])]);
  const helped = merged.filter(f => f.delta > 0).slice(0, 5);
  const hurt = merged.filter(f => f.delta < 0).slice(0, 5);

  const swing = results.map((r, i) => r.rating - (projection.matches[i]?.quality.expected ?? r.rating));
  const averageSwing = swing.reduce((sum, s) => sum + s, 0) / (swing.length || 1);
  const luck = averageSwing >= 6
    ? 'The card over-delivered on the night — the wrestlers beat their projection.'
    : averageSwing <= -6
      ? 'The card under-delivered. Every one of those gimmicks carried variance and it broke against you.'
      : 'The night landed close to projection. Little luck involved either way.';

  const lessons = [...new Set(hurt.map(f => LESSONS[f.kind]).filter(Boolean))].slice(0, 2);

  return {
    projectedRating: projection.rating,
    actualRating: rating,
    delta: rating - projection.rating,
    helped,
    hurt,
    luck,
    lessons,
  };
}

// ---------------------------------------------------------------------------
// Full show
// ---------------------------------------------------------------------------
export function simulateShow(show, projection, context = {}) {
  const { staminaLookup = () => 100, date = '', gmLuck = 0 } = context;

  const results = show.matches.map((match, index) =>
    simulateMatch(match, projection.matches[index], {
      staminaLookup,
      isMainEvent: index === show.matches.length - 1,
      position: index,
      total: show.matches.length,
      isBattleRoyale: match.typeId === 'battle-royal',
    }),
  );

  // Actual attendance wobbles around the projection.
  const attendance = Math.round(
    clamp(projection.attendance * rand(FINANCE_VARIANCE.attendance.low, FINANCE_VARIANCE.attendance.high), 0, projection.capacity),
  );
  const fillPercent = projection.capacity ? Math.round((attendance / projection.capacity) * 100) : 0;

  const weights = results.map((_, i) => (i === results.length - 1 ? 2.2 : 1));
  const weightedQuality =
    results.reduce((sum, r, i) => sum + r.rating * weights[i], 0) /
    (weights.reduce((sum, w) => sum + w, 0) || 1);

  const rating = clamp(
    Math.round(
      weightedQuality * 0.8 +
      fillPercent * 0.12 +
      projection.stage.presentation * 0.25 -
      projection.freshness.penalty * 0.35 +
      rand(0, gmLuck * 0.5),
    ),
    0,
    100,
  );

  const tvViewers = Math.round(
    1200000 * (projection.venue?.tvReach ?? 0.5) *
    (0.55 + rating / 110) *
    (1 + projection.stage.tvBonus) *
    rand(0.92, 1.1),
  );
  const tvRating = (tvViewers / 960000).toFixed(1);

  const gate = Math.round(attendance * projection.ticketPrice);
  const concessions = Math.round(attendance * (projection.revenue.concessions / Math.max(projection.attendance, 1)) * rand(FINANCE_VARIANCE.concessions.low, FINANCE_VARIANCE.concessions.high));
  const merch = Math.round(
    attendance * (projection.revenue.merch / Math.max(projection.attendance, 1)) *
    ((.75 + rating / 130) / (.75 + projection.rating / 130)) * rand(FINANCE_VARIANCE.merch.low, FINANCE_VARIANCE.merch.high),
  );
  const homeVideo = Math.round(attendance * (projection.revenue.homeVideo / Math.max(projection.attendance, 1)) * ((.75 + rating / 130) / (.75 + projection.rating / 130)) * rand(FINANCE_VARIANCE.homeVideo.low, FINANCE_VARIANCE.homeVideo.high));
  const television = Math.max(
    eventBroadcastGuarantee(projection.venue, rating),
    Math.round((projection.venue?.tvReach ?? 0.5) * 168000 * (1 + projection.stage.tvBonus) * clamp(rating / 62, 0.35, 1.8) * rand(0.88, 1.15)),
  );
  const revenue = gate + concessions + merch + homeVideo + television;
  const profit = revenue - projection.totalCost;

  const meta = {
    showName: show.name,
    date,
    venueName: projection.venue?.name ?? 'Unknown venue',
    city: projection.venue?.city ?? '',
    stageId: show.stageId,
    stageName: projection.stage.name,
    stagePresentation: projection.stage.presentation,
    attendance,
    capacity: projection.capacity,
    fillPercent,
    tvViewers,
    tvRating,
  };

  const { headlines, storylines } = buildNarrative(show.name, results, meta);
  const report = buildReport(projection, results, rating);

  return {
    ...meta,
    matches: results,
    rating,
    grade: gradeFor(rating),
    ratingLabel: ratingLabel(rating),
    stars: starString(rating),
    revenue: { gate, concessions, merch, homeVideo, television, total: revenue },
    costs: projection.totalCost,
    expenses: projection.expenses,
    profit,
    freshness: projection.freshness,
    report,
    headlines,
    storylines,
    recap: buildRecap(show.name, meta, results, rating),
    injuries: results.map(r => r.injury).filter(Boolean),
  };
}
