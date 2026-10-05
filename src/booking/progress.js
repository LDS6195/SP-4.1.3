// Progression: evaluates trophies, company records, and season awards after each show,
// and hands back what is newly earned so the results poster can celebrate it.

import { wrestlers, getWrestlerById, hasDebuted } from '../data/wrestlers.js';
import { TROPHIES, RECORD_DEFS, SEASON_LENGTH } from '../data/achievements.js';
import { CHAMPIONSHIPS, getChampionship } from '../data/championships.js';
import { worldSnapshot } from '../data/worldNews.js';
import { INDEPENDENT_CIRCUIT } from '../data/rivalScene.js';
import { gmExperienceForShow, gmLevelForExperience } from '../data/venues.js';

// Career totals live outside the pruned history/results arrays so lifetime stats
// (the trophy room plaque) stay accurate no matter how many shows have run.
export function createCareerState() {
  return {
    showsRun: 0,
    houseShowsRun: 0,
    houseShowRevenue: 0,
    gmExperience: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalMerch: 0,
    totalAttendance: 0,
    totalTVViewers: 0,
    wrestlerStars: {},
    totalMatches: 0,
    totalStars: 0,
    totalRatingSum: 0,
    fiveStarMatches: 0,
    topMatches: [],
    topShows: [],
  };
}

function pushTop(list, entry, max = 5) {
  list.push(entry);
  list.sort((a, b) => b.rating - a.rating);
  list.length = Math.min(list.length, max);
}

export function restoreCareerLedger(career, savedCareer, archive = [], results = [], houseShows = []) {
  if (savedCareer?.houseShowsRun == null) {
    career.houseShowsRun = houseShows.length;
    career.houseShowRevenue = houseShows.reduce((total, show) => total + (show.revenue ?? 0), 0);
    career.houseHistoryIncomplete = houseShows.length >= 24;
    houseShows.forEach(show => (show.matches ?? []).forEach(match => {
      career.totalMatches += 1;
      career.totalStars += (match.rating ?? 0) / 20;
      if (match.rating >= 100) career.fiveStarMatches += 1;
    }));
  }
  if (savedCareer?.wrestlerStars != null && savedCareer?.totalTVViewers != null) return;
  const shows = new Map();
  archive.forEach(show => shows.set(`${show.date}|${show.showName}`, show));
  results.forEach(show => shows.set(`${show.date}|${show.showName}`, show));
  if (savedCareer?.wrestlerStars == null) {
    career.wrestlerStars = {};
    [...shows.values(), ...houseShows].forEach(show => (show.matches ?? []).forEach(match => {
      const ids = match.participantIds ?? match.effects?.map(effect => effect.id)
        ?? (match.sideNames ?? []).flatMap(side => side.split(' & ').map(name => wrestlers.find(wrestler => wrestler.name === name.trim())?.id)).filter(Boolean);
      [...new Set(ids)].forEach(id => {
        career.wrestlerStars[id] = (career.wrestlerStars[id] ?? 0) + (match.rating ?? 0) / 20;
      });
    }));
    career.wrestlerHistoryIncomplete = shows.size < career.showsRun;
  }
  if (savedCareer?.totalTVViewers == null) {
    const televised = [...shows.values()].filter(show => Number.isFinite(show.tvViewers));
    career.totalTVViewers = televised.reduce((total, show) => total + show.tvViewers, 0);
    career.tvHistoryIncomplete = televised.length < career.showsRun;
  }
}

function addCareerMatch(career, match) {
  career.totalMatches += 1;
  career.totalStars += match.rating / 20;
  if (match.rating >= 100) career.fiveStarMatches += 1;
  career.wrestlerStars ??= {};
  const participantIds = [...new Set(match.participantIds ?? match.effects?.map(effect => effect.id) ?? [])];
  participantIds.forEach(id => {
    career.wrestlerStars[id] = (career.wrestlerStars[id] ?? 0) + match.rating / 20;
  });
}

export function updateHouseShowCareer(state, show) {
  const career = state.career;
  career.houseShowsRun = (career.houseShowsRun ?? 0) + 1;
  career.houseShowRevenue = (career.houseShowRevenue ?? 0) + show.revenue;
  show.matches.forEach(match => addCareerMatch(career, match));
}

export function updateCareer(state, result) {
  const career = state.career;
  career.showsRun += 1;
  const gmExperienceEarned = gmExperienceForShow(result.rating);
  career.gmExperience = (career.gmExperience ?? 0) + gmExperienceEarned;
  career.totalRevenue += result.revenue.total;
  career.totalProfit += result.profit;
  career.totalMerch += result.revenue.merch;
  career.totalAttendance += result.attendance;
  career.totalTVViewers = (career.totalTVViewers ?? 0) + (result.tvViewers ?? 0);
  career.wrestlerStars ??= {};
  career.totalRatingSum += result.rating;
  pushTop(career.topShows, {
    name: result.showName, rating: result.rating, date: result.date,
    attendance: result.attendance, city: result.city,
  });
  result.matches.forEach(m => {
    addCareerMatch(career, m);
    pushTop(career.topMatches, {
      names: m.sideNames.join(' vs. '), rating: m.rating, stars: m.stars,
      show: result.showName, date: result.date,
    });
  });
  return gmExperienceEarned;
}

function recordCandidates(result) {
  const bestMatch = [...result.matches].sort((a, b) => b.rating - a.rating)[0];
  return {
    'best-show': { value: result.rating, holder: result.showName },
    'worst-show': { value: result.rating, holder: result.showName },
    'best-match': {
      value: bestMatch?.rating ?? 0,
      holder: bestMatch ? bestMatch.sideNames.join(' vs. ') : '',
    },
    attendance: { value: result.attendance, holder: `${result.venueName}, ${result.city}` },
    gate: { value: result.revenue.gate, holder: `${result.showName} · ${result.city}` },
    'tv-rating': { value: Number(result.tvRating), holder: result.showName },
    profit: { value: result.profit, holder: result.showName },
    merch: { value: result.revenue.merch, holder: result.showName },
  };
}

function updateRecords(state, result) {
  const candidates = recordCandidates(result);
  const broken = [];

  RECORD_DEFS.forEach(def => {
    const candidate = candidates[def.id];
    if (!candidate) return;
    const current = state.records[def.id];
    const beats = !current || (def.better === 'higher'
      ? candidate.value > current.value
      : candidate.value < current.value);
    if (!beats) return;

    state.records[def.id] = {
      value: candidate.value,
      holder: candidate.holder,
      date: result.date,
      show: result.showName,
      previous: current ? current.value : null,
    };
    // The first entry sets the bar rather than breaking anything worth announcing.
    if (current) broken.push({ ...def, ...state.records[def.id] });
  });

  return broken;
}

function awardAccolade(state, wrestlerId, accolade) {
  if (!wrestlerId) return;
  state.accolades[wrestlerId] = state.accolades[wrestlerId] ?? [];
  state.accolades[wrestlerId].push(accolade);
}

// Season awards fire once a year, right after the calendar's final PPV, and are permanent career credits.
function evaluateSeason(state, result) {
  const completedDate = new Date(`${state.date}T12:00:00`);
  const year = completedDate.getFullYear();
  if (completedDate.getMonth() !== 11 || state.awards.some(award =>
    (award.recap?.year ?? new Date(award.date).getFullYear()) === year)) return null;
  const season = state.results.filter(show => new Date(show.date).getFullYear() === year);
  if (!season.length) return null;
  const seasonNumber = Math.ceil(state.showNumber / SEASON_LENGTH);

  const allMatches = season.flatMap(show => show.matches.map(m => ({ ...m, show: show.showName, date: show.date })));
  const matchOfSeason = [...allMatches].sort((a, b) => b.rating - a.rating)[0];

  // Wrestler of the Year: in-ring work (rating, wins), title time held this year, and
  // money drawn, weighed against a rolled outside challenger — a real free agent still
  // on the open market, or a name off the independent/international circuit. Outside
  // talent is tough to beat while the promotion is young and fades as it matures.
  const internalScores = new Map();
  allMatches.forEach(m => {
    m.effects.forEach(effect => {
      const entry = internalScores.get(effect.id) ?? { id: effect.id, points: 0, matches: 0, wins: 0 };
      entry.points += m.rating * 0.6 + (effect.resultCode === 'W' ? 14 : 0) + effect.popDelta * 3;
      entry.matches += 1;
      entry.wins += effect.resultCode === 'W' ? 1 : 0;
      internalScores.set(effect.id, entry);
    });
  });

  const seasonStartDate = season[season.length - 1]?.date ?? result.date;
  const seasonEndDate = result.date;
  const moneyByWrestler = new Map();
  season.forEach(show => {
    const perMatchRevenue = show.matches.length ? show.revenue.total / show.matches.length : 0;
    show.matches.forEach(m => {
      (m.participantIds ?? []).forEach(id => {
        const share = perMatchRevenue / Math.max(1, m.participantIds.length);
        moneyByWrestler.set(id, (moneyByWrestler.get(id) ?? 0) + share);
      });
    });
  });

  const daysBetween = (a, b) => Math.max(0, Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000));
  const overlapDays = (from, to, rangeStart, rangeEnd) => {
    const start = from > rangeStart ? from : rangeStart;
    const end = to < rangeEnd ? to : rangeEnd;
    return daysBetween(start, end);
  };
  const titleDaysByWrestler = new Map();
  CHAMPIONSHIPS.forEach(def => {
    const title = state.titles[def.id];
    if (!title) return;
    if (title.holders.length && title.since) {
      const days = overlapDays(title.since, seasonEndDate, seasonStartDate, seasonEndDate);
      title.holders.forEach(id => titleDaysByWrestler.set(id, (titleDaysByWrestler.get(id) ?? 0) + days));
    }
    title.history.forEach(entry => {
      if (!entry.from || !entry.to || entry.to < seasonStartDate) return;
      const days = overlapDays(entry.from, entry.to, seasonStartDate, seasonEndDate);
      if (days <= 0) return;
      entry.holderNames.split(' & ').forEach(name => {
        const match = wrestlers.find(w => w.name === name.trim());
        if (match) titleDaysByWrestler.set(match.id, (titleDaysByWrestler.get(match.id) ?? 0) + days);
      });
    });
  });

  const internalRanked = [...internalScores.values()].map(entry => {
    const money = moneyByWrestler.get(entry.id) ?? 0;
    const titleDays = titleDaysByWrestler.get(entry.id) ?? 0;
    const impact = entry.points + titleDays * 1.5 + money / 4000;
    return { ...entry, money, titleDays, impact };
  }).sort((a, b) => b.impact - a.impact);
  const topInternal = internalRanked[0] ?? null;

  const dominance = Math.min(1, seasonNumber / 10); // 0 in year one, 1 by year ten
  const freeAgentPool = wrestlers.filter(w => !state.draft.signedIds.includes(w.id) && hasDebuted(w, state.showNumber) && !w.retired && !w.deceased);
  const useIndependent = INDEPENDENT_CIRCUIT.length && (!freeAgentPool.length || Math.random() < 0.35);
  const externalCandidate = useIndependent
    ? (() => {
      const pick = INDEPENDENT_CIRCUIT[Math.floor(Math.random() * INDEPENDENT_CIRCUIT.length)];
      return { id: null, name: pick.name, origin: pick.scene, popularity: pick.popularity };
    })()
    : freeAgentPool.length
      ? (() => {
        const pick = freeAgentPool[Math.floor(Math.random() * freeAgentPool.length)];
        return { id: pick.id, name: pick.name, origin: 'the open free-agent market', popularity: pick.popularity };
      })()
      : null;
  const externalImpact = externalCandidate
    ? (externalCandidate.popularity * 8 + (Math.random() * 200 - 60)) * (1 + (1 - dominance) * 0.9)
    : 0;

  let mvp = null;
  if (topInternal && topInternal.impact >= externalImpact) {
    mvp = {
      id: topInternal.id,
      name: getWrestlerById(topInternal.id)?.name ?? topInternal.id,
      matches: topInternal.matches,
      wins: topInternal.wins,
      external: false,
      origin: state.company?.name || 'your promotion',
    };
  } else if (externalCandidate) {
    mvp = {
      id: externalCandidate.id,
      name: externalCandidate.name,
      matches: 0,
      wins: 0,
      external: true,
      origin: externalCandidate.origin,
    };
  }
  const showOfSeason = [...season].sort((a, b) => b.rating - a.rating)[0];
  const seasonStartShow = state.showNumber - season.length + 1;
  const notablePromos = (state.promoHistory ?? [])
    .filter(promo => promo.showNumber >= seasonStartShow && promo.showNumber <= state.showNumber)
    .sort((a, b) => (b.matchRating ?? 0) - (a.matchRating ?? 0) || (b.effects?.matchBuzz ?? 0) - (a.effects?.matchBuzz ?? 0))
    .slice(0, 3)
    .map(promo => ({
      name: promo.promoName,
      participants: promo.participantIds.map(id => getWrestlerById(id)?.name ?? id),
      hype: promo.effects?.matchBuzz ?? 0,
      rating: promo.matchRating ?? 0,
      rarity: promo.rarity ?? 'Event',
    }));
  const champions = Object.entries(state.titles)
    .filter(([, title]) => title.holders.length)
    .map(([id, title]) => ({
      title: getChampionship(id)?.name ?? id,
      holders: title.holders.map(wrestlerId => getWrestlerById(wrestlerId)?.name ?? wrestlerId),
      prestige: Math.round(title.prestige),
    }));
  const upcomingDebuts = wrestlers
    .filter(wrestler => wrestler.debutShow > state.showNumber && wrestler.debutShow <= state.showNumber + SEASON_LENGTH)
    .sort((a, b) => a.debutShow - b.debutShow)
    .slice(0, 4)
    .map(wrestler => ({ name: wrestler.name, showsAway: wrestler.debutShow - state.showNumber }));

  const awards = {
    season: seasonNumber,
    date: result.date,
    wrestlerOfSeason: mvp
      ? {
        id: mvp.id,
        name: mvp.name,
        matches: mvp.matches,
        wins: mvp.wins,
        external: mvp.external,
        origin: mvp.origin,
        year,
      }
      : null,
    matchOfSeason: matchOfSeason
      ? {
        names: matchOfSeason.sideNames.join(' vs. '),
        rating: matchOfSeason.rating,
        stars: matchOfSeason.stars,
        show: matchOfSeason.show,
        participantIds: matchOfSeason.participantIds,
      }
      : null,
    showOfSeason: showOfSeason
      ? { name: showOfSeason.showName, rating: showOfSeason.rating, city: showOfSeason.city }
      : null,
    totalRevenue: season.reduce((sum, s) => sum + s.revenue.total, 0),
    totalProfit: season.reduce((sum, s) => sum + s.profit, 0),
    averageRating: Math.round(season.reduce((sum, s) => sum + s.rating, 0) / season.length),
    recap: {
      year,
      totalAttendance: season.reduce((sum, show) => sum + show.attendance, 0),
      totalMatches: allMatches.length,
      sellouts: season.filter(show => show.fillPercent >= 97).length,
      upsets: allMatches.filter(match => match.upset).length,
      champions,
      promos: notablePromos,
      upcomingDebuts,
      world: worldSnapshot(year),
    },
  };

  if (awards.wrestlerOfSeason?.id) {
    awardAccolade(state, awards.wrestlerOfSeason.id, `Wrestler of the Year ${year}`);
  }
  awards.matchOfSeason?.participantIds.forEach(id =>
    awardAccolade(state, id, `Match of Season ${seasonNumber}`),
  );

  state.awards.unshift(awards);
  const money = amount => amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  state.inbox.dynamic.push({
    id: `year-review-${year}`,
    from: 'KAY FABE / PRODUCTION',
    address: 'kfabe@rivalpromotion.com',
    subject: `${year} Year in Review`,
    date: state.date,
    showNumber: state.showNumber,
    body: [
      `${year} annual report: ${season.length} events, ${awards.averageRating} average rating.`,
      `Attendance: ${awards.recap.totalAttendance.toLocaleString('en-US')}. Revenue: ${money(awards.totalRevenue)}. Profit: ${money(awards.totalProfit)}.`,
      `Matches: ${awards.recap.totalMatches}. Sellouts: ${awards.recap.sellouts}. Upsets: ${awards.recap.upsets}.`,
      ...(awards.wrestlerOfSeason ? [`Wrestler of the Year: ${awards.wrestlerOfSeason.name}${awards.wrestlerOfSeason.external ? ' (outside talent)' : ` - ${awards.wrestlerOfSeason.wins} wins in ${awards.wrestlerOfSeason.matches} matches`}.`] : []),
      ...(awards.matchOfSeason ? [`Match of the Year: ${awards.matchOfSeason.names} at ${awards.matchOfSeason.show} - ${awards.matchOfSeason.stars}.`] : []),
      ...(awards.showOfSeason ? [`Show of the Year: ${awards.showOfSeason.name} in ${awards.showOfSeason.city} - ${awards.showOfSeason.rating} rating.`] : []),
      ...notablePromos.map(promo => `Standout promo: ${promo.name} - ${promo.participants.join(' vs. ')}. ${promo.rarity}, match rating ${promo.rating}, hype +${promo.hype}.`),
      ...champions.map(champion => `Year-end champions: ${champion.holders.join(' & ')} - ${champion.title}, prestige ${champion.prestige}.`),
      `Outside the arena: President ${awards.recap.world.president}. Box-office leader: ${awards.recap.world.movie}. Biggest-selling music: ${awards.recap.world.album}. NBA champions: ${awards.recap.world.nba}. Super Bowl champions: ${awards.recap.world.nfl}.`,
      ...upcomingDebuts.map(wrestler => `Coming next year: ${wrestler.name}, debuting in ${wrestler.showsAway} shows.`),
    ],
  });
  return awards;
}

function evaluateTrophies(state, result) {
  const earned = [];
  TROPHIES.forEach(trophy => {
    if (state.trophies[trophy.id]) return;
    let passed = false;
    try {
      passed = Boolean(trophy.test(result, state));
    } catch {
      passed = false;
    }
    if (!passed) return;
    state.trophies[trophy.id] = { date: result.date, show: result.showName };
    earned.push(trophy);
  });
  return earned;
}

// Match of the Night is a per-show credit that builds a wrestler's career story.
function creditMatchOfTheNight(state, result) {
  const best = [...result.matches].sort((a, b) => b.rating - a.rating)[0];
  if (!best || best.rating < 70) return null;
  best.participantIds.forEach(id =>
    awardAccolade(state, id, `Match of the Night · ${result.showName}`),
  );
  return best;
}

export function applyProgress(state, result) {
  const previousGMLevel = gmLevelForExperience(state.career.gmExperience ?? 0);
  const gmExperienceEarned = updateCareer(state, result);
  const gmLevel = gmLevelForExperience(state.career.gmExperience);
  const trophies = evaluateTrophies(state, result);
  const records = updateRecords(state, result);
  const matchOfTheNight = creditMatchOfTheNight(state, result);
  const awards = evaluateSeason(state, result);
  return {
    trophies,
    records,
    matchOfTheNight,
    awards,
    gmProgression: {
      experienceEarned: gmExperienceEarned,
      totalExperience: state.career.gmExperience,
      level: gmLevel,
      leveledUp: gmLevel > previousGMLevel,
    },
  };
}

export function accoladesFor(state, wrestlerId) {
  return state.accolades[wrestlerId] ?? [];
}
