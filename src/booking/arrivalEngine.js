// Generates a signed free agent's debut arrival promo: which flavor of "new guy" they
// are (team player, cocky dominator, calling someone out, or riffing on the league's
// own history/lore), biased by their persona/ego, plus an optional rivalry target.
import { getWrestlerById } from '../data/wrestlers.js';
import { getPersonaFor } from '../data/promos.js';
import { ARRIVAL_CATEGORIES, ARRIVAL_LINE_POOLS } from '../data/arrivals.js';

function categoryWeights(wrestler) {
  const persona = getPersonaFor(wrestler.id);
  const ego = wrestler.hidden?.ego ?? 50;
  const workEthic = wrestler.hidden?.workEthic ?? 60;
  const archetypes = persona?.archetypes ?? [];

  let teamPlayer = 1 + Math.max(0, (workEthic - 60) / 10) + Math.max(0, (40 - ego) / 10);
  let dominator = 1 + Math.max(0, (ego - 60) / 8);
  let callout = 1 + (persona?.rivals?.length ? 3 : 0) + Math.max(0, (ego - 50) / 15);
  const lore = 1.4; // always a live option — it's the flavor players notice most

  if (archetypes.includes('veteran-legend') || archetypes.includes('moral-crusader')) teamPlayer += 2;
  if (archetypes.includes('playboy') || archetypes.includes('outsider')) dominator += 1.5;
  if (archetypes.includes('blood-feud-ready')) callout += 2;

  return {
    [ARRIVAL_CATEGORIES.TEAM_PLAYER]: teamPlayer,
    [ARRIVAL_CATEGORIES.DOMINATOR]: dominator,
    [ARRIVAL_CATEGORIES.CALLOUT]: callout,
    [ARRIVAL_CATEGORIES.LORE]: lore,
  };
}

function weightedPick(weights, rng) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
  if (total <= 0) return entries[0]?.[0];
  let roll = rng() * total;
  for (const [key, w] of entries) {
    roll -= Math.max(0, w);
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

export function generateArrivalPromo(wrestlerId, {
  roster = [],
  companyName = 'the company',
  founderTitle = 'the founder of this company',
  championName = null,
  championCount = 0,
  showsRun = 0,
  rng = Math.random,
} = {}) {
  const wrestler = getWrestlerById(wrestlerId);
  if (!wrestler) return null;

  const category = weightedPick(categoryWeights(wrestler), rng);

  let targetId = null;
  let targetName = null;
  if (category === ARRIVAL_CATEGORIES.CALLOUT) {
    const persona = getPersonaFor(wrestlerId);
    const rivalCandidates = (persona?.rivals ?? [])
      .map(id => roster.find(w => w.id === id))
      .filter(Boolean);
    const pool = rivalCandidates.length ? rivalCandidates : roster.filter(w => w.id !== wrestlerId);
    if (pool.length) {
      const pick = pool[Math.floor(rng() * pool.length)];
      targetId = pick.id;
      targetName = pick.name;
    }
  }

  const pool = ARRIVAL_LINE_POOLS[category];
  const line = pool[Math.floor(rng() * pool.length)];
  const quote = line(wrestler, {
    companyName,
    founderTitle,
    targetName: targetName ?? 'somebody in that locker room',
    championCount,
    showsRun,
    currentChampionName: championName ?? 'whoever is holding it this month',
  });

  return { wrestlerId, category, quote, targetId, targetName };
}
