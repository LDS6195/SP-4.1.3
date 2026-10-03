// Debut flavor for free agents: the moment someone signs, they get a short arrival
// promo — sometimes a respectful team player, sometimes a cocky outsider who thinks
// the whole league is a joke, sometimes calling out a specific name, and sometimes
// dropping meta commentary on the promotion's own history (the founder, the churn of
// champions, how green the company still is). Pure flavor text + an optional rivalry.
export const ARRIVAL_CATEGORIES = {
  TEAM_PLAYER: 'team-player',
  DOMINATOR: 'dominator',
  CALLOUT: 'callout',
  LORE: 'lore',
};

const TEAM_PLAYER_LINES = [
  (w, ctx) => `"${w.name} just wants to say thank you. It's an honor to be part of ${ctx.companyName}, and ${w.name} intends to earn every bit of the spot."`,
  (w, ctx) => `"There's real respect here for what ${ctx.companyName} has built already. ${w.name} isn't here to tear any of it down — just to help carry it."`,
  (w, ctx) => `"${w.name} has heard good things about this locker room. Show up, work hard, put people over when it's earned. That's the whole plan."`,
  (w, ctx) => `"${w.name} could have signed anywhere. Chose ${ctx.companyName} because it felt like a place worth being loyal to."`,
];

const DOMINATOR_LINES = [
  (w, ctx) => `"Let's be honest about what this is. ${ctx.companyName} is a nice little league, and the money was too good to turn down. ${w.name} is going to make this look easy."`,
  (w, ctx) => `"${w.name} didn't sign here to make friends. This whole roster is a speed bump on the way to being the top dog in ${ctx.companyName}."`,
  (w, ctx) => `"Everybody in that locker room should be nervous. ${w.name} showed up to dominate, not to compete."`,
  (w, ctx) => `"${w.name} looked at this roster and laughed. This is the competition? This is going to be embarrassingly easy."`,
];

const CALLOUT_LINES = [
  (w, ctx) => `"${w.name} signed with ${ctx.companyName} for one reason: ${ctx.targetName}. Consider this the warning."`,
  (w, ctx) => `"There's history to settle with ${ctx.targetName}, and now ${w.name} is right down the hall. That should terrify somebody."`,
  (w, ctx) => `"${w.name} joined this company for one reason — to kick ${ctx.targetName}'s ass. Everything else is just paperwork."`,
  (w, ctx) => `"${w.name} has been waiting a long time for a shot at ${ctx.targetName}. That clock just ran out."`,
];

const LORE_LINES = [
  (w, ctx) => `"${w.name} did some homework before signing. One person has been running this whole league — ${ctx.founderTitle}. ${w.name} wants a word."`,
  (w, ctx) => `"${ctx.championCount} different champions across ${ctx.showsRun} shows? That's a lot of nobodies passing a belt around. ${w.name} is here to claim the real thing."`,
  (w, ctx) => `"${w.name} watched the tape on this company. ${ctx.currentChampionName} is holding the top title right now — enjoy it while it lasts."`,
  (w, ctx) => `"A promotion this young still has room for someone to write themselves into the history books. ${w.name} plans to be the answer to every trivia question."`,
];

export const ARRIVAL_LINE_POOLS = {
  [ARRIVAL_CATEGORIES.TEAM_PLAYER]: TEAM_PLAYER_LINES,
  [ARRIVAL_CATEGORIES.DOMINATOR]: DOMINATOR_LINES,
  [ARRIVAL_CATEGORIES.CALLOUT]: CALLOUT_LINES,
  [ARRIVAL_CATEGORIES.LORE]: LORE_LINES,
};
