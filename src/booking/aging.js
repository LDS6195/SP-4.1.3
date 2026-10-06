// Year-end aging pass: young wrestlers climb toward their peak, physical stats drift
// down once the body starts going, and technique/charisma hold up longer on experience.
//
// Nobody retires on their own. This is pro wrestling — careers end when the promoter
// ends them, which is a decision the player makes at the January intake.

import { calculateAge, getDraftTier } from '../data/wrestlers.js';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const PHYSICAL_STATS = ['strength', 'agility', 'stamina', 'toughness'];
const ALL_STATS = ['strength', 'agility', 'stamina', 'toughness', 'technique', 'charisma'];

function agePhase(age) {
  if (age < 28) return 'rising';
  if (age <= 34) return 'prime';
  if (age <= 44) return 'declining';
  return 'late';
}

// How good this wrestler can get on natural growth alone, fixed the first time we look
// at them. Work ethic decides how much headroom a career has. Training is deliberately
// exempt — the gym is how the player pushes someone past what they were born with.
function peakFor(w) {
  if (w.peak) return w.peak;
  const workEthic = w.hidden?.workEthic ?? 60;
  const room = getDraftTier(w) === 'jobber' ? 3 + Math.round(workEthic / 25) : 5 + Math.round(workEthic / 7);
  w.peak = Object.fromEntries(ALL_STATS.map(stat => [stat, clamp((w.stats[stat] ?? 50) + room, 20, 97)]));
  return w.peak;
}

function driftStats(w, phase) {
  const peak = peakFor(w);
  const workEthic = clamp(w.hidden?.workEthic ?? 60, 0, 100);
  const growing = phase === 'rising' || (phase === 'prime' && Math.random() < .55 + workEthic * .002);
  const breakthrough = growing && Math.random() < .03;
  const budget = breakthrough ? 4 + Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 3);
  const direction = growing ? 1 : -1;
  const pool = growing ? ALL_STATS : PHYSICAL_STATS;
  for (let point = 0; point < budget; point += 1) {
    const available = pool.filter(stat => growing
      ? w.stats[stat] < Math.min(99, Math.max(peak[stat], w.stats[stat]))
      : w.stats[stat] > 15);
    if (!available.length) break;
    const stat = available[Math.floor(Math.random() * available.length)];
    w.stats[stat] += direction;
  }
  return breakthrough;
}

// Mutates wrestler stats in place. Returns a summary of who climbed and who slipped so
// the year-end recap has something to say.
export function runAgingPass(wrestlers, { date, isSigned }) {
  const changes = [];
  wrestlers.forEach(w => {
    if (w.retired) return;
    const age = calculateAge(w.dob, date);
    const phase = agePhase(age);
    const before = ALL_STATS.reduce((sum, s) => sum + w.stats[s], 0);
    const breakthrough = driftStats(w, phase);
    if (!isSigned(w.id)) return;
    const after = ALL_STATS.reduce((sum, s) => sum + w.stats[s], 0);
    if (after !== before) changes.push({ id: w.id, name: w.name, age, phase, delta: after - before, breakthrough: breakthrough && after - before >= 4 });
  });
  return changes;
}
