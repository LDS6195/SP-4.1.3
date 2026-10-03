// The nWo formation event: a rare, one-time storyline swing keyed to which of the
// four historical members the player has actually rostered. Purely emergent — no
// guarantee it happens, and which trio (or split) wins out is partly random.
export const NWO_MEMBER_IDS = {
  HBK: 'shawn-michaels',
  HALL: 'razor-ramon',
  NASH: 'diesel',
  HOGAN: 'hulk-hogan',
};

export const NWO_ANNOUNCEMENTS = {
  trioA: (names) => ({
    subject: 'Something just walked through the crowd',
    body: [
      `Nobody saw this coming. ${names.hbk}, ${names.hall}, and ${names.nash} just stood in the middle of the ring together and told the whole roster the company belongs to them now.`,
      'No Hogan. No "brother." Just three guys who decided the locker room needed new management, and they were the ones to provide it.',
      'This is a real problem. Book accordingly.',
    ],
  }),
  trioB: (names) => ({
    subject: 'The Outsiders just became something else',
    body: [
      `${names.hall} and ${names.nash} have been circling the roster for weeks. Tonight they got the third man: ${names.hogan}.`,
      'Say what you want about the turn — the crowd\'s reaction said everything. This is bigger than a stable. This is a takeover.',
      'This is a real problem. Book accordingly.',
    ],
  }),
  split: (names) => ({
    subject: `${names.hall} and ${names.nash} just turned on each other`,
    body: [
      `Whatever ${names.hall} and ${names.nash} were building together fell apart before it ever got a name. One shot, one betrayal, and now it's personal between them.`,
      'No stable. No takeover. Just two guys who apparently never trusted each other as much as everyone assumed.',
    ],
  }),
  hoganTurn: (names) => ({
    subject: `${names.hogan} has seen enough`,
    body: [
      `${names.hogan} watched the whole thing happen and isn't interested in staying quiet about it. Say goodbye to the heel act — the real American hero is back, and he's making the new group his problem.`,
      'The vitamins, the prayers, all of it. He is not letting this stand.',
    ],
  }),
};
