// Lead-up week engine: the month is three build-up weeks, one focus activity each, then
// fight week. bookingState.js owns the actual state slice and wires in the live objects;
// this module just knows the rules for each activity and the weekly cadence.

import { getActivity, BUILDUP_WEEKS, MONTHLY_PHASES, MONTHLY_PHASE_DEFAULTS } from '../data/activities.js';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const defaultAllocations = () => Object.fromEntries(
  MONTHLY_PHASES.map(phase => [phase.id, MONTHLY_PHASE_DEFAULTS[phase.id] ?? 0]),
);

// Days before the PPV the month's random event can land: after the story promo (-13),
// skipping the rest day (-6), weighted toward the middle of the month.
const RANDOM_EVENT_OFFSETS = [-12, -11, -10, -10, -9, -9, -8, -8, -7, -5, -4];

function createRandomEvent() {
  const offset = RANDOM_EVENT_OFFSETS[Math.floor(Math.random() * RANDOM_EVENT_OFFSETS.length)];
  return { offset, resolved: false, seen: false, result: null };
}

export function createLeadUpState() {
  return {
    week: 1, slotInWeek: 1, cadence: 1, log: [], monthly: true,
    allocations: defaultAllocations(),
    trainingIds: [], promoCardId: null, spotlightId: null, planned: false,
    phaseResults: {},
    randomEvent: createRandomEvent(),
  };
}

export function refillLeadUp(leadUpState) {
  leadUpState.week = 1;
  leadUpState.slotInWeek = 1;
  leadUpState.cadence = 1;
  leadUpState.log = [];
  leadUpState.monthly = true;
  leadUpState.allocations = defaultAllocations();
  leadUpState.trainingIds = [];
  leadUpState.promoCardId = null;
  leadUpState.spotlightId = null;
  leadUpState.planned = false;
  leadUpState.phaseResults = {};
  leadUpState.randomEvent = createRandomEvent();
}

export function isBuildupDone(leadUpState) {
  if (!leadUpState.monthly) return leadUpState.week > BUILDUP_WEEKS;
  return Boolean(leadUpState.planned) && (leadUpState.randomEvent?.resolved ?? true);
}

const RUNNERS = {
  train: ({ wrestler }) => {
    if (!wrestler) return { ok: false, message: 'Pick a wrestler.' };
    const stats = ['strength', 'agility', 'stamina', 'technique', 'charisma', 'toughness'];
    const breakthrough = Math.random() < 0.12;
    const pool = breakthrough ? stats : [...stats].sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 4));
    const gains = pool.map(stat => {
      const gain = breakthrough ? 5 : 2 + (Math.random() < 0.25 ? 1 : 0);
      wrestler.stats[stat] = clamp(wrestler.stats[stat] + gain, 1, 99);
      return `${stat.toUpperCase()} +${gain}`;
    });
    return { ok: true, message: `${wrestler.name} permanently improved — ${gains.join(', ')}${breakthrough ? ' (breakthrough session!)' : ''}.` };
  },
  media: ({ wrestler }) => {
    if (!wrestler) return { ok: false, message: 'Pick a wrestler.' };
    wrestler.popularity = clamp(wrestler.popularity + 10, 1, 100);
    wrestler.hidden.ego = clamp(wrestler.hidden.ego + 2, 1, 100);
    return { ok: true, message: `${wrestler.name} made the rounds with the press — popularity ${wrestler.popularity}.` };
  },
  rest: ({ wrestler, staminaState, injuryState }) => {
    if (!wrestler) return { ok: false, message: 'Pick a wrestler.' };
    staminaState[wrestler.id] = clamp((staminaState[wrestler.id] ?? 100) + 50, 0, 100);
    if (injuryState[wrestler.id]) {
      injuryState[wrestler.id] = Math.max(0, injuryState[wrestler.id] - 3);
      if (injuryState[wrestler.id] === 0) delete injuryState[wrestler.id];
    }
    return { ok: true, message: `${wrestler.name} took the week off to heal up.` };
  },
  politics: ({ wrestler }) => {
    if (!wrestler) return { ok: false, message: 'Pick a wrestler.' };
    wrestler.hidden.ego = clamp(wrestler.hidden.ego - 8, 1, 100);
    wrestler.hidden.lockerRoomImpact = clamp(wrestler.hidden.lockerRoomImpact + 5, 1, 100);
    return { ok: true, message: `A quiet word with ${wrestler.name} smoothed things over backstage.` };
  },
  bond: ({ wrestler, moraleState }) => {
    if (!wrestler) return { ok: false, message: 'Pick a wrestler.' };
    const current = moraleState[wrestler.id] ?? 65;
    moraleState[wrestler.id] = clamp(current + 25, 0, 100);
    return { ok: true, message: `You checked in with ${wrestler.name} outside the ring — satisfaction at ${moraleState[wrestler.id]}.` };
  },
  'locker-room': ({ allocations = {}, spreadAll = false, roster, moraleState, relationshipsState }) => {
    if (spreadAll) {
      roster.forEach(wrestler => {
        moraleState[wrestler.id] = clamp((moraleState[wrestler.id] ?? 65) + 3, 0, 100);
        relationshipsState[wrestler.id] = clamp((relationshipsState[wrestler.id] ?? 50) + 2, 0, 100);
        wrestler.hidden.ego = clamp(wrestler.hidden.ego - 1, 1, 100);
      });
      return { ok: true, message: 'You addressed the whole locker room. Everyone felt heard, even if nobody got much individual time.' };
    }
    const entries = Object.entries(allocations).filter(([, points]) => points > 0);
    const total = entries.reduce((sum, [, points]) => sum + points, 0);
    if (total !== 3) return { ok: false, message: 'Allocate all three attention points first.' };
    const names = [];
    entries.forEach(([id, points]) => {
      const wrestler = roster.find(candidate => candidate.id === id);
      if (!wrestler) return;
      moraleState[id] = clamp((moraleState[id] ?? 65) + points * 8, 0, 100);
      relationshipsState[id] = clamp((relationshipsState[id] ?? 50) + points * 10, 0, 100);
      wrestler.hidden.ego = clamp(wrestler.hidden.ego - points * 2, 1, 100);
      wrestler.hidden.lockerRoomImpact = clamp(wrestler.hidden.lockerRoomImpact + points, 1, 100);
      names.push(`${wrestler.name} +${points}`);
    });
    if (!names.length) return { ok: false, message: 'Choose at least one wrestler.' };
    return { ok: true, message: `Locker-room attention spent: ${names.join(', ')}.` };
  },
  scout: ({ match }) => {
    if (!match) return { ok: false, message: 'Pick a match on the card.' };
    if (match.scouted) return { ok: false, message: 'Already scouted that one.' };
    match.scouted = 2.5;
    return { ok: true, message: 'Scouting report filed — that match\'s projection just got sharper.' };
  },
  'house-show': ({ runHouseShow }) => runHouseShow(),
  promo: ({ promoWrestler, promoPartner, cutPromo }) => {
    if (!promoWrestler) return { ok: false, message: 'Choose a wrestler to cut a one-off promo.' };
    return cutPromo(promoWrestler.id, promoPartner?.id ?? null);
  },
  family: ({ gmState }) => {
    gmState.balance = clamp((gmState.balance ?? 60) + 25, 0, 100);
    gmState.luck = clamp((gmState.luck ?? 0) + 2, 0, 10);
    return { ok: true, message: 'You spent the week with family — home life is steadier, your head is clearer, and a little luck is on your side.' };
  },
  'side-hustle': ({ earnMoney, roster, staminaState }) => {
    const available = [...roster];
    const crew = [];
    while (available.length && crew.length < 3) {
      crew.push(available.splice(Math.floor(Math.random() * available.length), 1)[0]);
    }
    crew.forEach(wrestler => {
      staminaState[wrestler.id] = clamp((staminaState[wrestler.id] ?? 100) - 6, 0, 100);
    });
    earnMoney(37500);
    const crewNames = crew.map(wrestler => wrestler.name).join(', ');
    return {
      ok: true,
      calendarLabel: 'Construction Side Hustle',
      message: `The crew brought $37,500 back to the promotion${crewNames ? `; ${crewNames} put in the work and lost 6 stamina` : ''}.`,
    };
  },
};

// Returns { ok, message } and mutates whatever the activity targets in-place.
export function applyActivity(leadUpState, activityId, ctx) {
  if (isBuildupDone(leadUpState)) return { ok: false, message: 'Fight week is here — no more build-up.' };
  const activity = getActivity(activityId);
  if (!activity) return { ok: false, message: 'Unknown activity.' };

  const result = RUNNERS[activityId]?.(ctx) ?? { ok: false, message: 'Could not do that.' };
  if (!result.ok) return result;

  const slot = leadUpState.week;
  leadUpState.log.unshift({
    week: leadUpState.week,
    slot,
    activityId,
    matchId: ctx.match?.id ?? null,
    promoCardId: ctx.match?.promoCardId ?? result.promoCardId ?? null,
    label: result.calendarLabel ?? result.message,
  });
  leadUpState.week += 1;
  leadUpState.slotInWeek = 1;
  return result;
}

// Lets a week pass without picking anything.
export function skipWeek(leadUpState) {
  if (isBuildupDone(leadUpState)) return { ok: false, message: 'Already at fight week.' };
  leadUpState.log.unshift({ week: leadUpState.week, slot: leadUpState.week, label: 'Kept a low profile — nothing to report.' });
  leadUpState.week += 1;
  leadUpState.slotInWeek = 1;
  return { ok: true, message: 'The week passed quietly.' };
}

// Skips whatever build-up weeks remain and goes straight to fight week.
export function jumpToEvent(leadUpState) {
  if (isBuildupDone(leadUpState)) return { ok: false, message: 'Already at fight week.' };
  const skippedWeeks = BUILDUP_WEEKS - leadUpState.week + 1;
  leadUpState.log.unshift({ week: leadUpState.week, slot: leadUpState.week, label: `Skipped the rest of build-up from week ${leadUpState.week}.` });
  leadUpState.week = BUILDUP_WEEKS + 1;
  leadUpState.slotInWeek = 1;
  if (leadUpState.monthly) leadUpState.planned = true;
  return { ok: true, skippedWeeks, message: 'Skipped ahead to fight week.' };
}
