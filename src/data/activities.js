// Lead-up week: the month between shows is three build-up weeks (pick one focus each)
// followed by fight week, when the flagship event itself runs. Each activity targets a
// wrestler, a match already on the card, a one-off Promo, a free agent, or nobody.

export const BUILDUP_WEEKS = 4;

// Three phases now. Recruiting is gone — talent arrives through the January pack break,
// not through a monthly slider. The Promo phase highlights one wrestler for the month.
export const MONTHLY_PHASES = [
  { id: 'training', name: 'Training', description: 'Focus on three wrestlers and permanently improve their in-ring attributes.' },
  { id: 'storyline', name: 'The Mic', description: 'Choose one wrestler to spotlight in this month’s one-off Promo.' },
  { id: 'family', name: 'Rest / Family', description: 'Recover stamina, keep the family close, and avoid the consequences of neglect.' },
];

export const MONTHLY_PHASE_DEFAULTS = { training: 35, storyline: 35, family: 30 };

export const ACTIVITIES = [
  {
    id: 'train',
    name: 'Train',
    target: 'wrestler',
    description: 'Give one wrestler a hard week in the gym. Usually improve 3-6 attributes by +2-3 each; a rare breakthrough improves all six by +5.',
  },
  {
    id: 'promo',
    name: 'Promo Segment',
    target: 'promo',
    description: 'Put a wrestler on the mic and let the promo find its own target — a booked opponent, an old rival, or a total wildcard. Pay a fee to bring a second wrestler along for the segment.',
  },
  {
    id: 'media',
    name: 'Media Appearance',
    target: 'wrestler',
    description: 'Send someone out for a full press week. Builds substantial popularity, but feeds the ego.',
  },
  {
    id: 'scout',
    name: 'Scout The Opponent',
    target: 'match',
    description: 'Study a booked matchup closely. Tightens the projection — fewer surprises on the night.',
  },
  {
    id: 'house-show',
    name: 'Run A House Show',
    target: 'none',
    description: 'Book a three-match mini-card. Usually loses money and drains stamina, but records count and wrestlers build reps, popularity, and light heat.',
  },
  {
    id: 'rest',
    name: 'Rest & Recover',
    target: 'wrestler',
    description: 'Give one specific wrestler the week off. Bigger stamina recovery and faster injury healing than the roster-wide family week.',
  },
  {
    id: 'locker-room',
    name: 'Manage The Locker Room',
    target: 'allocation',
    description: 'Distribute three attention points among the roster, or address everyone for a smaller universal boost.',
  },
  {
    id: 'family',
    name: 'Spend Time With Family',
    target: 'none',
    description: 'Go home for the week. Repair family relationships and restore the GM’s balance and hidden luck.',
  },
  {
    id: 'side-hustle',
    name: 'Construction Side Hustle',
    target: 'none',
    description: 'Take a local construction job with three roster members. Earn $37,500, but the crew loses a little stamina.',
  },
];

export function getActivity(id) {
  return ACTIVITIES.find(a => a.id === id) || null;
}

export const TRAINABLE_STATS = ['strength', 'agility', 'stamina', 'technique', 'charisma', 'toughness'];
