// Tier vocabulary shared by the founding pack break and the annual free-agency board.
// The old pick-your-own draft is gone — see src/data/cards.js for the pack shapes.

export const MIDCARD_TIERS = ['star', 'contender'];

export const DRAFT_TIERS = ['legend', 'star', 'contender', 'jobber'];

export const TIER_LABELS = {
  legend: 'Legend',
  star: 'Star',
  contender: 'Contender',
  jobber: 'Jobber',
  celebrity: 'Special Attraction',
};

// Fallback for wrestlers without an explicit draftTier.
export function tierFromPopularity(popularity) {
  if (popularity >= 85) return 'legend';
  if (popularity >= 70) return 'star';
  if (popularity >= 35) return 'contender';
  return 'jobber';
}
