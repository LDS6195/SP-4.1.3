// Year-end aging pass: young wrestlers climb toward their peak, physical stats drift
// down once the body starts going, and technique/charisma hold up longer on experience.
//
// Nobody retires on their own. This is pro wrestling — careers end when the promoter
// ends them, which is a decision the player makes at the January intake.

import { calculateAge } from '../data/wrestlers.js';

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
  const room = 5 + Math.round(workEthic / 7);
  w.peak = Object.fromEntries(ALL_STATS.map(stat => [stat, clamp((w.stats[stat] ?? 50) + room, 20, 97)]));
  return w.peak;
}

function driftStats(w, phase) {
  const peak = peakFor(w);
  const workEthicBoost = ((w.hidden?.workEthic ?? 60) - 50) / 100; // roughly -0.5..0.5
  PHYSICAL_STATS.forEach(stat => {
    let delta = 0;
    if (phase === 'rising') delta = 1 + Math.random() * 2;
    else if (phase === 'prime') delta = Math.random() * 2 - 1;
    else if (phase === 'declining') delta = -(1.5 - workEthicBoost * 2) - Math.random() * 1.5;
    else delta = -(3 - workEthicBoost * 2) - Math.random() * 3;
    const next = Math.round(w.stats[stat] + delta);
    // Growth stops at the peak; decline is never capped by it.
    w.stats[stat] = clamp(delta > 0 ? Math.min(next, Math.max(peak[stat], w.stats[stat])) : next, 15, 99);
  });
  // Technique and charisma reflect experience, not just the body — they hold up longer.
  const experienceDelta = phase === 'late' ? -1 : phase === 'declining' ? 0 : 1;
  const nextTechnique = w.stats.technique + experienceDelta + Math.round(Math.random());
  w.stats.technique = clamp(
    nextTechnique > w.stats.technique ? Math.min(nextTechnique, Math.max(peak.technique, w.stats.technique)) : nextTechnique,
    15,
    99,
  );
  const charismaDelta = phase === 'late' ? -1 : Math.round(Math.random());
  const nextCharisma = w.stats.charisma + charismaDelta;
  w.stats.charisma = clamp(
    charismaDelta > 0 ? Math.min(nextCharisma, Math.max(peak.charisma, w.stats.charisma)) : nextCharisma,
    15,
    99,
  );
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
    driftStats(w, phase);
    if (!isSigned(w.id)) return;
    const after = ALL_STATS.reduce((sum, s) => sum + w.stats[s], 0);
    if (after !== before) changes.push({ id: w.id, name: w.name, age, phase, delta: after - before });
  });
  return changes;
}
