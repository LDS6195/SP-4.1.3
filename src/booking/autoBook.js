// Auto-booker. Produces a coherent, playable card in one click — used for demos and
// as a starting point the player can then edit.

import { computeChemistry } from '../data/wrestlers.js';
import { venues, venueUnlocked } from '../data/venues.js';
import { pairKey } from './bookingEngine.js';
import * as booking from './bookingState.js';

const pick = list => list[Math.floor(Math.random() * list.length)];

function recentPairs(history) {
  return new Set(
    history.slice(0, 2).flatMap(show => show.matches.map(m => pairKey(m.participantIds || []))),
  );
}

// Talent that worked recently gets pushed down the list so the auto-booker rotates
// the roster instead of running the same four names every fortnight.
function appearanceCount(history, id) {
  return history.slice(0, 2).filter(show =>
    show.matches.some(m => (m.participantIds || []).includes(id)),
  ).length;
}

// Best available opponent for a wrestler: chemistry first, then a popularity band so
// the card does not turn into a series of squashes.
function bestOpponent(anchor, pool, avoid) {
  return pool
    .filter(w => w.id !== anchor.id)
    .map(w => {
      const chemistry = computeChemistry(anchor.id, w.id)?.score ?? 50;
      const gap = Math.abs(anchor.popularity - w.popularity);
      const stale = avoid.has(pairKey([anchor.id, w.id])) ? 45 : 0;
      return { w, score: chemistry - gap * 0.7 - stale };
    })
    .sort((a, b) => b.score - a.score)[0]?.w ?? null;
}

export function autoBook() {
  const state = booking.getState();
  const avoid = recentPairs(state.history);

  const pool = booking
    .availableWrestlers()
    .filter(w => booking.staminaFor(w.id) >= 45)
    .map(w => ({ w, rank: w.popularity - appearanceCount(state.history, w.id) * 26 }))
    .sort((a, b) => b.rank - a.rank)
    .map(entry => entry.w);

  if (pool.length < 8) return { ok: false, reason: 'Not enough healthy talent to fill a card.' };
  const matchCount = Math.min(booking.getMaxMatches(), 4);
  booking.resetCard(matchCount);
  const matches = booking.getShow().matches;

  // --- venue: the biggest room this roster can realistically fill ------------
  const starPower = pool.slice(0, 3).reduce((sum, w) => sum + w.popularity, 0) / 3;
  const venue = pick(
    venues
      .filter(v => venueUnlocked(v, booking.getGMLevel()))
      .filter(v => v.id !== state.history[0]?.venueId)
      .filter(v => v.capacity <= starPower * 180)
      .sort((a, b) => b.capacity - a.capacity)
      .slice(0, 3),
  ) ?? venues[0];
  booking.setShowField('venueId', venue.id);

  const used = new Set();
  const take = list => list.find(w => !used.has(w.id));

  // --- main event: the champion, or the two biggest fresh names --------------
  const worldTitle = booking.titleState('world');
  const worldChampion = worldTitle.holders.length
    ? pool.find(w => w.id === worldTitle.holders[0])
    : null;

  const anchor = worldChampion ?? take(pool);
  used.add(anchor.id);
  const rival = bestOpponent(anchor, pool.slice(0, 12).filter(w => !used.has(w.id)), avoid) ?? take(pool);
  used.add(rival.id);
  const mainId = matches[matchCount - 1].id;
  const recentTypes = new Set((state.history[0]?.matches ?? []).map(m => m.typeId));
  const mainTypeOptions = ['singles', 'steel-cage', 'street-fight', 'submission', 'last-man-standing']
    .filter(id => !recentTypes.has(id) && booking.canBookMatchType(id));
  booking.setMatchType(mainId, pick(mainTypeOptions.length ? mainTypeOptions : ['singles']));
  booking.assignWrestler(mainId, 0, 0, anchor.id);
  booking.assignWrestler(mainId, 1, 0, rival.id);

  // The world title headlines whenever the champion can work.
  if (worldChampion || !worldTitle.holders.length) {
    booking.setMatchTitle(mainId, 'world');
  }
  booking.setEntrance(mainId, 0, 'pyro');
  booking.setEntrance(mainId, 1, 'spotlight');
  booking.toggleExtra(mainId, 'vignette');
  booking.toggleExtra(mainId, 'commentary');

  // --- semi-main: a hot non-title singles match to set up next month ---------
  const semiA = take(pool);
  used.add(semiA.id);
  const semiB = bestOpponent(semiA, pool.filter(w => !used.has(w.id)), avoid);
  used.add(semiB.id);
  const semiId = matches[matchCount - 2].id;
  booking.setMatchType(semiId, 'singles');
  booking.assignWrestler(semiId, 0, 0, semiA.id);
  booking.assignWrestler(semiId, 1, 0, semiB.id);
  booking.setEntrance(semiId, 0, 'spotlight');

  // --- second match: a tag bout --------------------------------------------
  const midId = matches[1].id;
  booking.setMatchType(midId, 'tag-team');
  [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(([team, slot]) => {
    const w = take(pool);
    if (!w) return;
    used.add(w.id);
    booking.assignWrestler(midId, team, slot, w.id);
  });
  const tagTitle = booking.titleState('tag');
  if (!tagTitle.holders.length || Math.random() < 0.35) booking.setMatchTitle(midId, 'tag');


  // --- opener: something with a gimmick to wake the room up --------------------
  const openerId = matches[0].id;
  const openerType = booking.canBookMatchType('triple-threat') ? pick(['singles', 'triple-threat', 'singles']) : 'singles';
  booking.setMatchType(openerId, openerType);
  const openerMatch = booking.getMatch(openerId);
  openerMatch.teams.forEach((_, teamIndex) => {
    const w = take(pool);
    if (!w) return;
    used.add(w.id);
    booking.assignWrestler(openerId, teamIndex, 0, w.id);
  });

  // --- production: spend in proportion to the bankroll --------------------------
  const rich = state.bankroll > 3000000;
  const introductoryRun = booking.getGMLevel() === 1 && state.showNumber <= 3;
  booking.setShowField('promoId', introductoryRun ? 'word-of-mouth' : rich ? 'regional-tv' : 'local-radio');
  booking.setShowField('stageId', introductoryRun ? 'bare' : rich ? 'broadcast' : 'house');
  booking.setShowField('ticketId', 'standard');

  return { ok: true, venue, mainEvent: `${anchor.name} vs. ${rival.name}` };
}
