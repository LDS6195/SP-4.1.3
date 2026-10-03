// Tragic wrestler deaths: a rare, permanent playthrough event. Framed the way the
// real business has lost people over the decades — in-ring accidents, the toll of
// the road, and sudden violence — without naming any specific real incident.
export const TRAGEDY_CAUSES = [
  {
    id: 'ring-rigging-accident',
    label: 'A ring-rigging accident',
    message: wrestler => `${wrestler.name} fell during an entrance stunt that never should have been rigged the way it was. The building went silent. Nobody backstage saw it coming, and nobody backstage will forget it.`,
  },
  {
    id: 'overdose',
    label: 'An accidental overdose',
    message: wrestler => `${wrestler.name} was found unresponsive in a hotel room after a run of matches that never let up. The road, the pain pills, the pressure to always be fine by showtime — it finally caught up.`,
  },
  {
    id: 'car-accident',
    label: 'A single-vehicle car accident',
    message: wrestler => `${wrestler.name} didn't make it home from the last town on the loop. State troopers said the roads were clear and dry. Sometimes there's no explanation, just a phone call nobody wanted to make.`,
  },
  {
    id: 'small-plane-crash',
    label: 'A small plane crash',
    message: wrestler => `${wrestler.name} chartered a puddle-jumper to make a signing on time. It never landed. The wreckage was found the next morning, and the whole territory has been quiet since.`,
  },
  {
    id: 'homicide',
    label: 'A homicide',
    message: wrestler => `${wrestler.name} was killed in an altercation that had nothing to do with this business and everything to do with somebody else's temper. The locker room is still trying to make sense of it.`,
  },
  {
    id: 'heart-failure',
    label: 'Sudden heart failure',
    message: wrestler => `${wrestler.name} collapsed at home, and the paramedics couldn't bring them back. Years of bumps, cutting weight, and living on adrenaline don't show up on a stat sheet, but they add up somewhere.`,
  },
  {
    id: 'training-accident',
    label: 'A training accident',
    message: wrestler => `${wrestler.name} took a routine bump in the practice ring that landed wrong in a way nobody could have predicted. It happened in front of people who had seen that exact spot run a hundred times before.`,
  },
];

export function pickTragedyCause(rng = Math.random) {
  return TRAGEDY_CAUSES[Math.floor(rng() * TRAGEDY_CAUSES.length)];
}
