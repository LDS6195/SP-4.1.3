// Championships.
//
// A belt is only worth what the booking makes it worth. Every title carries a
// prestige score that rises when it headlines good matches and decays when it sits
// on the shelf. Defending on schedule is the player's job.

export const CHAMPIONSHIPS = [
  {
    id: 'world',
    name: 'RP World Title',
    short: 'RP',
    kind: 'singles',
    holders: 1,
    basePrestige: 74,
    defenseWindow: 2, // PPVs before the press starts asking questions
    expectedPopularity: 80,
    description: 'The top prize. Whoever holds it is the face of the company.',
  },
  {
    id: 'tag',
    name: 'RP Tag Team Title',
    short: 'TT',
    kind: 'tag',
    holders: 2,
    basePrestige: 62,
    defenseWindow: 3,
    expectedPopularity: 62,
    description: 'The division prize. Two partners defend it together and build a legacy one match at a time.',
  },
];

export function getChampionship(id) {
  return CHAMPIONSHIPS.find(c => c.id === id) || null;
}

export function titleMatchCompatible(definition, matchType) {
  if (!definition || !matchType) return false;
  return definition.kind === 'tag' ? matchType.id === 'tag-team' : (matchType.slots.perTeam ?? 1) === 1;
}

export function setChampionshipBrand(acronym = 'RP') {
  const world = getChampionship('world');
  world.name = `${acronym} World Title`;
  world.short = acronym;
  const tag = getChampionship('tag');
  tag.name = `${acronym} Tag Team Title`;
  tag.short = acronym;
}

export function titleBookable(def, show, titleState = null) {
  if (!def || !show) return false;
  // The belt has to have been pulled out of the founding pack first.
  return titleState ? Boolean(titleState.unlocked) : true;
}


export function newTitleState(def) {
  return {
    holders: [],
    unlocked: false,
    since: null,
    sinceShow: 0,
    reignNumber: 0,
    defenses: 0,
    prestige: def.basePrestige,
    lastDefendedShow: 0,
    history: [],
  };
}

export function createTitleTable() {
  return Object.fromEntries(CHAMPIONSHIPS.map(def => [def.id, newTitleState(def)]));
}

export function prestigeLabel(prestige) {
  if (prestige >= 85) return 'MUST-SEE';
  if (prestige >= 72) return 'PRESTIGIOUS';
  if (prestige >= 58) return 'RESPECTED';
  if (prestige >= 44) return 'MIDCARD';
  if (prestige >= 30) return 'DEVALUED';
  return 'WORTHLESS';
}

// How many shows a title can sit idle before it starts bleeding prestige.
export function defenseStatus(def, titleState, currentShowNumber) {
  if (!titleState.holders.length) return { state: 'vacant', overdue: 0, label: 'VACANT' };
  const idle = Math.max(0, currentShowNumber - 1 - titleState.lastDefendedShow);
  if (idle > def.defenseWindow) {
    return { state: 'overdue', overdue: idle - def.defenseWindow, label: `${idle} SHOWS IDLE` };
  }
  if (idle === def.defenseWindow) return { state: 'due', overdue: 0, label: 'DEFENCE DUE' };
  return { state: 'current', overdue: 0, label: 'DEFENDED' };
}
