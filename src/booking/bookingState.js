// Booking state: the card the player is currently building, the bankroll it spends
// against, and the history of shows already run (which is what makes repetition hurt).

import { wrestlers, getWrestlerById, getDraftTier, hasDebuted, calculateAge, createCustomWrestler, computeChemistry } from '../data/wrestlers.js';
import { COMPANY_LOGO_STYLES } from '../data/companyLogo.js';
import {
  venues, gmExperienceForShow, gmLevelForExperience, experienceRequiredForLevel, venueUnlocked,
} from '../data/venues.js';
import { getMatchType } from '../data/matchTypes.js';
import { CHAMPIONSHIPS, getChampionship, createTitleTable, defenseStatus, titleBookable, titleMatchCompatible, setChampionshipBrand } from '../data/championships.js';
import { PPV_CALENDAR, PPV_LOGOS, calendarForShowNumber, createEventBranding, eventDisplayName, ppvDateForShowNumber } from '../data/calendar.js';
import { MIDCARD_TIERS } from '../data/draft.js';
import {
  FOUNDING_REDRAWS, FOUNDING_PACK_SIZE, ANNUAL_START_YEAR, ANNUAL_PULLS, ANNUAL_BONUS_PULL,
  BONUS_PULL_RATING, ANNUAL_GIMMICK_PACK, CRIB_PACKS, GIMMICK_RARITIES, GIMMICK_CARD_RARITY,
  ROSTER_CAP, USAGE_WINDOW_SHOWS, CAMPAIGN_YEARS, CAMPAIGN_SHOWS,
  FOUNDING_GIMMICK_CARDS, FOUNDING_GIMMICK_PACK, FOUNDING_GIMMICK_WEIGHTS, FOUNDING_PROMO_PACK,
  ANNUAL_PROMO_PACK, TITLE_CARDS, BASE_PULL_WEIGHT, PACK_TUTORIAL_REWARDS,
  chipsForShowRating, isBasicMatchType, gimmickRarity,
} from '../data/cards.js';
import {
  createCardState, rollFoundingPack, redrawFoundingCard, buildAnnualBoard, boardOdds,
  pullFromBoard, carryoverFromBets, totalChipsBet, rollGimmickCards, rollGimmickPack, gimmickStock,
  addGimmickCards, consumeGimmickCard, rollPromoPack, rollStarterPromoPack, promoStock, addPromoCards, consumePromoCard,
} from './cardEngine.js';
import { matchParticipantIds, projectShow, projectMatch, gradeFor, overuseTier } from './bookingEngine.js';
import { simulateShow, simulateMatch } from './simulation.js';
import { applyProgress, createCareerState, restoreCareerLedger, updateHouseShowCareer } from './progress.js';
import { createLeadUpState, refillLeadUp, applyActivity, skipWeek, jumpToEvent, isBuildupDone } from './leadUp.js';
import { runAgingPass } from './aging.js';
import { applyGoodwillDrift, clampPrice, createFinanceState, ticketPriceRatio } from '../data/finances.js';
import { getStagePackage } from '../data/production.js';
import { generatePromo } from './promoEngine.js';
import { PROMO_PARTNER_FEE } from '../data/promos.js';
import { pickTragedyCause } from '../data/tragedy.js';
import { getVinylRecord } from '../data/vinyls.js';
import { generateArrivalPromo } from './arrivalEngine.js';
import { NWO_MEMBER_IDS, NWO_ANNOUNCEMENTS } from '../data/nwo.js';
import {
  generateIncidentText, resolveTemplate, promoCardRarity, PROMO_CARD_RARITIES, PROMO_CARD_RARITY,
  eligibleTemplates, previewText, getStorylineTemplate,
} from '../data/storylines.js';
import { RANDOM_EVENT_CARDS } from '../data/randomEvents.js';
import { createMarketHype, normalizeMarketHype, updateMarketHype } from './marketHype.js';

const STORAGE_KEY = 'rival-promotion-booking-v8';
const MAX_SAVED_TEAMS = 20;

export const LOUNGE_ITEMS = [
  { id: 'vinyl-library', name: 'Vinyl Library', description: 'A full wall of records and a working turntable.', cost: 45000, unlockLevel: 1 },
  { id: 'arcade-cabinet', get name() { return `${getCompanyIdentity().acronym} Arcade`; }, description: 'A private cabinet for future games and guest challenges.', cost: 70000, unlockLevel: 3 },
  { id: 'rothko', name: 'Rothko Painting', description: 'A statement piece for the collection wall.', cost: 35000, unlockLevel: 2 },
  { id: 'dali', name: 'Dali Painting', description: 'A surrealist centerpiece for the Lounge.', cost: 40000, unlockLevel: 3 },
  { id: 'goya', name: 'Goya Painting', description: 'A dark, prestigious final piece for the wall.', cost: 50000, unlockLevel: 3 },
];

export const LOUNGE_PAINTING_IDS = ['rothko', 'dali', 'goya'];

// Twelve flagship events a year — no more, no less. Each show is one month's PPV.
export const MIN_MATCHES = 3;
export const MAX_MATCHES = 5;
// Extra flagship match slots unlock as the promotion matures, not just with time —
// booking everybody on every card gets repetitive fast with a small early roster.
const MATCH_SLOT_TIERS = [
  { level: 1, matches: MIN_MATCHES },
  { level: 5, matches: 4 }, // roughly year 2-3 at 12 shows/year
  { level: 10, matches: MAX_MATCHES }, // roughly year 6-8 at 12 shows/year
];
function maxMatchSlotsForLevel(level) {
  return [...MATCH_SLOT_TIERS].reverse().find(tier => level >= tier.level)?.matches ?? MIN_MATCHES;
}
const FIRST_SHOW_DATE = ppvDateForShowNumber(1);

let matchSeq = 0;
function createMatch() {
  matchSeq += 1;
  return {
    id: `m${matchSeq}`,
    typeId: 'singles',
    stakeId: 'none',
    titleId: null,
    lengthId: 'standard',
    teams: [[], []],
    entrances: ['standard', 'standard'],
    extras: [],
    celebrityId: 'none',
    promoCardId: null,
    promoCardWrestlerId: null,
    promoCardEffect: null,
    promoCardPlayed: false,
    winnerId: null,
    scouted: false,
  };
}

function createShow(index = 1, eventBranding = {}) {
  const event = calendarForShowNumber(index);
  const matches = Array.from({ length: MIN_MATCHES }, createMatch);
  return {
    id: `show-${index}`,
    name: eventDisplayName(event, index, eventBranding),
    eventId: event.id,
    theme: event.theme,
    date: ppvDateForShowNumber(index),
    venueId: venues[0].id,
    promoId: 'word-of-mouth',
    stageId: 'bare',
    ticketId: 'standard',
    matches,
    tribute: null,
  };
}

function createDraftState() {
  return {
    signedIds: [],
    complete: false,
    freeAgentInterest: {},
  };
}

function createTeamState() {
  return [];
}

const EMAIL_DEFS = [
  {
    id: 'welcome',
    from: state => `RICK O'SHEA, VICE PRESIDENT · ${state.company?.named ? state.company.acronym : 'TBD (ACRONYM)'}`,
    address: state => (state.company?.named ? `roshea@${state.company.acronym.toLowerCase()}.com` : '(pending — name the company to unlock)'),
    subject: 'okay so this is actually happening', date: 'JAN 02, 1996',
    available: () => true,
    body: ['Okay, I am still not over this. You bought a lottery ticket at the gas station and now you own a wrestling promotion. That is the most insane sentence I have ever typed.', 'You have been the person quoting entrances and drawing up dream cards on notebook paper since we were kids. Now you get to live it. You get to build the cards and the stories.', 'Here is the bad news: buying the promotion, setting up the office, paying permits, and putting the inaugural roster budget together burned through most of the winnings. We have $250,000 in operating cash. That is enough to put on a real first show, but we have to be smart. I’m confident we’ll be earning it all back soon.', 'One last thing: what are we calling this company? Reply with it below and I will get our graphic designer on a logo!'],
  },
  {
    id: 'calendar', from: 'KAY FABE / PRODUCTION', address: 'kfabe@rivalpromotion.com', subject: 'Three weeks of work, one night that counts', date: 'JAN 04, 1996',
    available: state => state.draft.complete && ((state.leadUp?.log?.length ?? 0) >= 1 || state.showNumber >= 2),
    body: ['The Calendar Wall allows you to book the upcoming PPV, train wrestlers to improve their stats and cut promos to develop storylines and build hype for upcoming matches.', 'Visit the finance office to manage our pricing strategies if you think you can better optimize our profits.', 'Oh one more thing, I tried to make the place feel like home, but I left a shopping catalog in your lounge area. Let me know if anything catches your eye.'],
  },
  {
    id: 'booking', from: 'RIVAL PROMOTION NETWORK', address: 'desk@rp-1996.com', subject: 'The card is a set of tradeoffs', date: 'JAN 05, 1996',
    available: state => state.draft.complete && (state.showNumber >= 2 || (state.leadUp?.week ?? 1) > 1),
    body: ['Good matchups, meaningful stakes, and the right building are what make the night. Big crowds are great, but the talent and venue bills still need to be paid.', 'A projection is a read, not a promise. The best cards usually have a reason to exist, a rested roster, and enough money left to run the next one.'],
  },
  {
    id: 'progression', from: 'KAY FABE / PRODUCTION', address: 'kfabe@rivalpromotion.com', subject: 'Take a look around', date: '1996-05-01',
    available: state => state.career.showsRun >= 4,
    body: ['Four shows in, and this place is starting to have a history. When you get a minute, take a look at the Computer and the Trophy Room.', 'The Computer has your roster, wrestler profiles, rankings, company stats, news, and inbox. It\'s a good place to check how everyone is doing between shows.', 'Over in the Trophy Room, you\'ll find the trophies you\'ve earned, company records, and championship history. We have plenty of empty space left to fill. Go have a look.'],
  },
  {
    id: 'free-agent-introduction', from: "RICK O'SHEA / TALENT RELATIONS", address: 'talent@rivalpromotion.com',
    subject: 'Your first Free Agent Pack is waiting', date: '1996-04-01',
    available: state => state.career.showsRun >= 3,
    vendingRewardId: 'free-agent-introduction',
    body: ['Three shows down. Time to give the locker room a new face. A free card pack is waiting in the Lounge vending machine. A Free Agent pack: 1 wrestler, 1 match card, and 1 promo card.', 'Visit the Vending Machine any time you\'d like to spend your hard earned money on card packs.'],
  },
];

function availableEmails() {
  return EMAIL_DEFS.filter(email => email.available(state));
}

// ---------------------------------------------------------------------------
// Family notes are rare flavor attached to the occasional family activity.
// ---------------------------------------------------------------------------
function createFamilyState() {
  return { emailSeq: 0, lastFlavorEmailShow: -6 };
}

const FAMILY_SIGNOFFS = ['Your loving wife, Pookie (<3)', 'Love always, Pookie', 'xoxo, your girl', 'Missing you \u2014 Pookie (<3)'];

const FAMILY_HAPPY_LINES = [
  'Pookie says the dog has started reacting to your entrance music. It may be your biggest fan.',
  'Mikey tried your finishing move on a sofa cushion. The cushion is expected to recover.',
  'Birdie wants to know if championship belts come in purple. I told her we would ask the office.',
  'Your favorite mug is still where you left it. I am not confirming whether it is clean.',
];

function pickOne(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function pushFamilyEmail({ subject, body }) {
  state.family.emailSeq += 1;
  state.inbox.dynamic = state.inbox.dynamic ?? [];
  state.inbox.dynamic.push({
    id: `family-${state.family.emailSeq}`,
    from: 'YOUR WIFE',
    address: '(personal)',
    subject,
    date: state.date,
    showNumber: state.showNumber,
    body,
  });
}

function sendFamilyHappyEmail() {
  pushFamilyEmail({ subject: 'thinking of you', body: [pickOne(FAMILY_HAPPY_LINES), pickOne(FAMILY_SIGNOFFS)] });
}

const ECONOMY_VERSION = 4;
const STARTING_BANKROLL = 250000;

// Family correspondence is a once-a-year easter egg, not a consequence meter.
function handleFamilyActivity(activityId, slots) {
  if (activityId === 'family') {
    if (state.showNumber >= 6 && state.showNumber - (state.family.lastFlavorEmailShow ?? -6) >= 12) {
      sendFamilyHappyEmail();
      state.family.lastFlavorEmailShow = state.showNumber;
    }
    return;
  }
  state.gm.balance = Math.max(0, (state.gm.balance ?? 60) - slots * 4);
}

const defaultState = () => {
  const eventBranding = createEventBranding();
  return {
  economyVersion: ECONOMY_VERSION,
  jobberStatsVersion: 2,
  bankroll: STARTING_BANKROLL,
  showNumber: 1,
  date: FIRST_SHOW_DATE,
  show: createShow(1, eventBranding),
  history: [],
  results: [],
  archive: [],
  promoHistory: [],
  randomEventHistory: [],
  numberOneContenderId: null,
  battleRoyaleHistory: [],
  stamina: {},
  morale: {},
  relationships: {},
  gm: { balance: 60, luck: 0 },
  incidents: { seq: 0, pending: null, history: [], cooldowns: {}, promises: [] },
  injuries: {},
  roster: {},
  customWrestlers: [],
  trophies: {},
  records: {},
  awards: [],
  accolades: {},
  titles: createTitleTable(),
  teams: createTeamState(),
  draft: createDraftState(),
  cards: createCardState(),
  usage: {},
  micHistory: {},
  signedShows: {},
  leadUp: createLeadUpState(),
  retirees: [],
  memorials: [],
  nwo: { resolved: false, outcome: null, formedShow: null, members: [] },
  career: createCareerState(),
  finances: createFinanceState(),
  marketHype: createMarketHype(),
  houseShows: [],
  lounge: { owned: [], vinyls: [], nowPlaying: null, displayedPaintings: [] },
  inbox: { readIds: [], dynamic: [] },
  eventBranding,
  company: { acronym: 'RP', name: 'Rival Promotion', logoStyle: 'seal', logoAccent: null, named: false, homeCity: 'Austin, TX' },
  family: createFamilyState(),
  };
};

let state = load();
setChampionshipBrand(state.company.acronym);
recordRandomEvent(state.leadUp.randomEvent?.result);
syncMatchLengths();
applyRosterSnapshot();
repairTitleHolders();
revokeStaleTitleBookings();
syncBookedTeams();
persist();

function repairTitleHolders() {
  CHAMPIONSHIPS.forEach(def => {
    const title = state.titles[def.id];
    if (!title?.holders?.length) return;
    const valid = ids => ids?.length === def.holders && new Set(ids).size === def.holders && ids.every(id => getWrestlerById(id) && isSigned(id));
    if (valid(title.holders)) return;
    title.unlocked = true;
    const history = title.history ?? [];
    const idsForReign = reign => {
      const names = def.kind === 'singles' ? [reign.holderNames] : String(reign.holderNames ?? '').split(' & ');
      return names.map(name => wrestlers.find(wrestler => wrestler.name === name?.trim() || wrestler.nickname === name?.trim())?.id).filter(Boolean);
    };
    const previousIndex = history.findIndex(reign => valid(idsForReign(reign)));
    const results = state.results ?? [];
    const previousResult = results.find(show => show.matches?.some(match => match.titleOutcome?.titleId === def.id && valid(match.titleOutcome.previousHolders)));
    const previousOutcome = previousResult?.matches.find(match => match.titleOutcome?.titleId === def.id && valid(match.titleOutcome.previousHolders))?.titleOutcome;
    const holders = previousIndex >= 0 ? idsForReign(history[previousIndex]) : previousOutcome?.previousHolders;
    if (!holders) {
      title.holders = [];
      title.since = null;
      title.sinceShow = 0;
      title.defenses = 0;
      title.lastDefendedShow = 0;
      title.reignNumber = 0;
      return;
    }
    const previous = previousIndex >= 0 ? history[previousIndex] : {};
    const shows = [...(state.archive ?? []), ...results];
    const endedShow = shows.find(show => show.date === previous.to)?.showNumber ?? previousResult?.showNumber ?? title.sinceShow;
    const sinceShow = shows.find(show => show.date === previous.from)?.showNumber ?? Math.max(1, endedShow - (previous.shows ?? 1));
    const defenses = results.filter(show => show.matches?.some(match => match.titleId === def.id
      && titleMatchCompatible(def, getMatchType(match.typeId))
      && holders.every(id => match.titleOutcome?.newHolders?.includes(id)))).map(show => show.showNumber);
    title.holders = [...holders];
    title.since = previous.from ?? previousResult?.date ?? title.since;
    title.sinceShow = sinceShow;
    title.reignNumber = previous.reignNumber ?? Math.max(1, title.reignNumber - Math.max(1, previousIndex + 1));
    title.defenses = previous.defenses ?? 0;
    title.lastDefendedShow = Math.max(sinceShow, ...defenses);
    if (previousIndex >= 0) title.history = history.slice(previousIndex + 1);
  });
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    (parsed.customWrestlers ?? []).forEach(wrestler => {
      if (wrestler.custom && wrestler.id?.startsWith('custom-') && !getWrestlerById(wrestler.id)) {
        wrestlers.push(wrestler);
      }
    });
    matchSeq = parsed.matchSeq ?? 0;
    const defaults = defaultState();
    const marketHype = normalizeMarketHype(parsed.marketHype);
    if (!parsed.marketHype) {
      [...(parsed.archive ?? parsed.history ?? [])].reverse().forEach(show => {
        const venue = venues.find(venue => venue.id === show.venueId || venue.name === show.venueName || venue.city === show.city);
        if (venue) updateMarketHype(marketHype, venue, show);
      });
    }
    const loaded = {
      ...defaults,
      ...parsed,
      marketHype,
      eventBranding: { ...defaults.eventBranding, ...(parsed.eventBranding ?? {}) },
      career: { ...defaults.career, ...(parsed.career ?? {}) },
      titles: { ...defaults.titles, ...(parsed.titles ?? {}) },
      teams: parsed.teams ?? createTeamState(),
      lounge: { ...defaults.lounge, ...(parsed.lounge ?? {}), owned: parsed.lounge?.owned ?? [], vinyls: parsed.lounge?.vinyls ?? [], nowPlaying: parsed.lounge?.nowPlaying ?? null, displayedPaintings: parsed.lounge?.displayedPaintings ?? [] },
      houseShows: parsed.houseShows ?? [],
      archive: parsed.archive ?? [],
      promoHistory: parsed.promoHistory ?? [],
      battleRoyaleHistory: parsed.battleRoyaleHistory ?? parsed.royalRumbleHistory ?? [],
      memorials: parsed.memorials ?? [],
      nwo: { ...defaults.nwo, ...(parsed.nwo ?? {}) },
      inbox: { ...defaults.inbox, ...(parsed.inbox ?? {}), readIds: parsed.inbox?.readIds ?? [], dynamic: parsed.inbox?.dynamic ?? [] },
      company: { ...defaults.company, ...(parsed.company ?? {}) },
      family: { ...defaults.family, ...(parsed.family ?? {}) },
      gm: { ...defaults.gm, ...(parsed.gm ?? {}) },
      relationships: parsed.relationships ?? {},
      usage: parsed.usage ?? {},
      micHistory: parsed.micHistory ?? {},
      cards: {
        ...defaults.cards,
        ...(parsed.cards ?? {}),
        gimmicks: parsed.cards?.gimmicks ?? {},
        promoDrawCycles: parsed.cards?.promoDrawCycles ?? {},
        promos: parsed.cards?.promos ?? {},
        used: { matches: parsed.cards?.used?.matches ?? {}, promos: parsed.cards?.used?.promos ?? {} },
        tutorialClaims: parsed.cards?.tutorialClaims ?? {},
        pendingPack: parsed.cards?.pendingPack ?? null,
        gimmickLog: parsed.cards?.gimmickLog ?? [],
        carryover: parsed.cards?.carryover ?? {},
        founding: { ...defaults.cards.founding, ...(parsed.cards?.founding ?? {}) },
        annual: parsed.cards?.annual ?? null,
        intakeQueue: parsed.cards?.intakeQueue ?? parsed.cards?.annual?.queue ?? [],
        history: parsed.cards?.history ?? [],
      },
      incidents: { ...defaults.incidents, ...(parsed.incidents ?? {}), history: parsed.incidents?.history ?? [], cooldowns: parsed.incidents?.cooldowns ?? {}, promises: parsed.incidents?.promises ?? [] },
    };
    [
      ...(loaded.cards.founding.cards ?? []),
      ...(loaded.cards.annual?.board ?? []),
      ...(loaded.cards.annual?.reveal?.cards ?? []),
      ...(loaded.cards.pendingPack?.cards ?? []),
    ].forEach(card => {
      if (card.tier === 'prospect') card.tier = 'contender';
    });
    loaded.inbox.dynamic.forEach(email => {
      if (email.address === 'apin@rivalpromotion.com') {
        email.from = 'KAY FABE / PRODUCTION';
        email.address = 'kfabe@rivalpromotion.com';
      }
      if (typeof email.from === 'string') email.from = email.from.replace(/JUSTIN CREDIBLE/gi, "RICK O'SHEA");
      if (typeof email.address === 'string') email.address = email.address.replace(/^jcredible@/i, 'roshea@');
    });
    const legacyStorylines = [...(parsed.storylines?.active ?? []), ...(parsed.storylines?.archive ?? [])];
    const loggedLegacyIds = new Set(loaded.promoHistory.filter(entry => entry.legacyStoryId).map(entry => entry.legacyStoryId));
    legacyStorylines.forEach(storyline => {
      if (loggedLegacyIds.has(storyline.id) || !storyline.participants?.length) return;
      const template = resolveTemplate(storyline);
      const ownerId = storyline.ownerId ?? storyline.spotlightId ?? storyline.participants[0];
      loaded.promoHistory.unshift({
        id: `legacy-promo-${storyline.id}`,
        legacyStoryId: storyline.id,
        promoId: storyline.templateId,
        promoName: template?.name ?? 'Legacy storyline',
        rarity: 'Legacy',
        spotlightId: ownerId,
        participantIds: storyline.participants,
        opponentIds: storyline.participants.filter(id => id !== ownerId),
        showNumber: storyline.lastShow ?? storyline.startedShow ?? loaded.showNumber,
        showName: 'Previous storyline',
        date: storyline.beats?.[0]?.date ?? loaded.date,
        matchType: 'Legacy storyline',
        matchRating: 0,
        outcome: storyline.resolved ? 'resolved' : 'legacy',
        winnerNames: [],
        text: storyline.custom?.description ?? storyline.beats?.map(beat => beat.text).reverse().join(' ') ?? template?.description ?? '',
        effects: {},
      });
    });
    delete loaded.storylines;
    delete loaded.storylineTemplateUses;
    if (!parsed.cards?.promoDrawCycles) {
      const receivedIds = new Set([
        ...Object.keys(loaded.cards.promos ?? {}),
        ...(loaded.cards.promoLog ?? []).flatMap(entry => entry.cards ?? []),
        ...loaded.promoHistory.map(entry => entry.promoId),
      ]);
      Object.keys(PROMO_CARD_RARITIES).forEach(rarity => {
        loaded.cards.promoDrawCycles[rarity] = [...receivedIds].filter(id => PROMO_CARD_RARITY[id] === rarity);
      });
      const pendingCustoms = (loaded.show.matches ?? []).filter(match => match.promoCardCustom && !match.promoCardPlayed).length;
      if (pendingCustoms) loaded.cards.promos.custom = Math.max(loaded.cards.promos.custom ?? 0, pendingCustoms);
    }
    loaded.show.matches?.forEach(match => {
      match.storylineId = null;
      match.storylineLinks = [];
    });
    loaded.promoHistory = loaded.promoHistory.slice(0, 500);
    if (!parsed.cards?.used) {
      const playedMatches = loaded.archive.length ? loaded.archive.flatMap(show => show.matches ?? []) : loaded.history.flatMap(show => show.matches ?? []);
      playedMatches.forEach(match => {
        const typeId = match.typeId ?? Object.keys(GIMMICK_CARD_RARITY).find(id => getMatchType(id)?.name === match.typeName);
        if (GIMMICK_CARD_RARITY[typeId]) loaded.cards.used.matches[typeId] = (loaded.cards.used.matches[typeId] ?? 0) + 1;
      });
      loaded.promoHistory.forEach(entry => {
        if (!PROMO_CARD_RARITY[entry.promoId] || !entry.id?.startsWith('promo-')) return;
        loaded.cards.used.promos[entry.promoId] = (loaded.cards.used.promos[entry.promoId] ?? 0) + 1;
      });
      loaded.show.matches?.filter(match => match.promoCardPlayed).forEach(match => {
        loaded.cards.used.promos[match.promoCardId] = (loaded.cards.used.promos[match.promoCardId] ?? 0) + 1;
      });
    }
    loaded.career.showsRun = Math.max(0, loaded.showNumber - 1);
    restoreCareerLedger(loaded.career, parsed.career, loaded.archive, loaded.results, loaded.houseShows);
    if (parsed.family?.lastFlavorEmailShow == null) {
      const previousFamilyEmails = (loaded.inbox.dynamic ?? []).filter(email => email.id?.startsWith('family-'));
      const trackedShow = previousFamilyEmails.map(email => email.showNumber).filter(Number.isFinite).at(-1);
      loaded.family.lastFlavorEmailShow = trackedShow ?? (previousFamilyEmails.length ? loaded.showNumber - 1 : -12);
    }
    if (parsed.career?.gmExperience == null) {
      const archivedRatingTotal = loaded.archive.reduce((sum, show) => sum + (Number(show.rating) || 0), 0);
      const archivedExperience = loaded.archive.reduce((sum, show) => sum + gmExperienceForShow(show.rating), 0);
      const unarchivedShows = Math.max(0, loaded.career.showsRun - loaded.archive.length);
      const unarchivedRatingTotal = Math.max(0, (Number(loaded.career.totalRatingSum) || 0) - archivedRatingTotal);
      const unarchivedAverage = unarchivedShows ? unarchivedRatingTotal / unarchivedShows : 0;
      loaded.career.gmExperience = archivedExperience + unarchivedShows * gmExperienceForShow(unarchivedAverage);
    }
    // Saves from before signing dates were tracked: treat every already-signed
    // wrestler as long-tenured (never "recently signed") so Comeback angles can
    // still trigger off history alone, without ever misfiring an Arrival angle.
    (loaded.draft?.signedIds ?? []).forEach(id => {
      if (loaded.signedShows[id] == null) loaded.signedShows[id] = -999;
    });
    if (!loaded.leadUp?.monthly) loaded.leadUp = createLeadUpState();
    if (loaded.leadUp?.cadence !== 1) {
      const chronological = [...(loaded.leadUp?.log ?? [])].reverse().slice(0, BUILDUP_WEEKS);
      loaded.leadUp = {
        ...createLeadUpState(),
        log: chronological.map((entry, index) => ({ ...entry, week: index + 1, slot: index + 1 })).reverse(),
        week: Math.min(BUILDUP_WEEKS + 1, chronological.length + 1),
      };
    }
    if ((parsed.economyVersion ?? 0) < ECONOMY_VERSION) {
      if (loaded.showNumber <= 2 && loaded.bankroll > 500000) loaded.bankroll = STARTING_BANKROLL;
      if (parsed.economyVersion === 2 && loaded.showNumber === 1 && !loaded.history.length && loaded.bankroll === 150000) {
        loaded.bankroll = STARTING_BANKROLL;
      }
      if (loaded.showNumber <= 3 && loaded.show.promoId === 'local-radio' && loaded.show.stageId === 'house') {
        loaded.show.promoId = 'word-of-mouth';
        loaded.show.stageId = 'bare';
      }
      loaded.economyVersion = ECONOMY_VERSION;
    }
    loaded.date = ppvDateForShowNumber(loaded.showNumber);
    loaded.show.date = loaded.date;
    if (/^new year clash(?:\s+'?\d{2})?$/i.test(loaded.eventBranding['day-one']?.name ?? '')) {
      loaded.eventBranding['day-one'] = { ...defaults.eventBranding['day-one'] };
    }
    const legacyJuneBrand = loaded.eventBranding['royal-rumble'];
    if (legacyJuneBrand) {
      const juneDefaults = defaults.eventBranding['super-brawl'];
      loaded.eventBranding['super-brawl'] = {
        ...legacyJuneBrand,
        name: legacyJuneBrand.name === 'Royal Rumble' ? juneDefaults.name : legacyJuneBrand.name,
        logoId: legacyJuneBrand.logoId === 'royalrumble' ? juneDefaults.logoId : legacyJuneBrand.logoId,
      };
      delete loaded.eventBranding['royal-rumble'];
    }
    if (loaded.show?.eventId === 'royal-rumble') loaded.show.eventId = 'super-brawl';
    const activeEvent = calendarForShowNumber(loaded.showNumber);
    if (loaded.show?.eventId === activeEvent.id) {
      loaded.show.name = eventDisplayName(activeEvent, loaded.showNumber, loaded.eventBranding);
      loaded.show.theme = activeEvent.theme;
    }
    if (loaded.show?.rumble) {
      const legacyBattleRoyale = loaded.show.matches?.find(match => match.typeId === 'battle-royal');
      if (legacyBattleRoyale) {
        const participants = matchParticipantIds(legacyBattleRoyale).slice(0, 8);
        legacyBattleRoyale.typeId = 'battle-royal';
        legacyBattleRoyale.teams = [Array.from({ length: 8 }, (_, index) => participants[index] ?? null)];
        legacyBattleRoyale.entrances = ['standard'];
        legacyBattleRoyale.extras = [];
        legacyBattleRoyale.celebrityId = 'none';
        if (!consumeGimmickCard(loaded.cards, 'battle-royal')) {
          addGimmickCards(loaded.cards, ['battle-royal']);
          consumeGimmickCard(loaded.cards, 'battle-royal');
        }
      }
      delete loaded.show.rumble;
      delete loaded.show.rumbleEntrants;
    }
    delete loaded.royalRumbleHistory;
    loaded.show.matches?.forEach(match => {
      if (match.stakeId === 'title' && !match.titleId) match.stakeId = 'none';
    });
    // Reveals used to be a running count; they are per-card now.
    const toIndexList = value => (Array.isArray(value) ? value : [...Array(Number(value) || 0).keys()]);
    loaded.cards.founding.revealed = toIndexList(loaded.cards.founding.revealed);
    if (loaded.cards.founding.starter) {
      loaded.cards.founding.starter.revealed = toIndexList(loaded.cards.founding.starter.revealed);
    }
    if (loaded.cards.annual?.reveal) {
      loaded.cards.annual.reveal.revealed = toIndexList(loaded.cards.annual.reveal.revealed);
    }

    // Belts predate being card-gated: anyone already past the ceremony owns both.
    if (loaded.draft?.complete) {
      Object.values(loaded.titles).forEach(title => { title.unlocked = true; });
    }
    if (loaded.showNumber === 1 && !loaded.history.length && loaded.show?.venueId === 'lincoln-high-gym-syracuse') {
      loaded.show.venueId = 'south-austin-rec-center';
    }
    const allowedMatchSlots = maxMatchSlotsForLevel(gmLevelForExperience(loaded.career.gmExperience ?? 0));
    if ((loaded.show.matches?.length ?? 0) > allowedMatchSlots) {
      const removedMatches = loaded.show.matches.splice(allowedMatchSlots);
      removedMatches.forEach(match => {
        if (!isBasicMatchType(match.typeId)) {
          loaded.cards.gimmicks[match.typeId] = (loaded.cards.gimmicks[match.typeId] ?? 0) + 1;
        }
      });
    }
    if (parsed.jobberStatsVersion !== 2) {
      Object.entries(loaded.roster).forEach(([id, snapshot]) => {
        const wrestler = getWrestlerById(id);
        if (!wrestler || getDraftTier(wrestler) !== 'jobber') return;
        if (snapshot.stats) Object.keys(snapshot.stats).forEach(stat => {
          const previous = parsed.jobberStatsVersion === 1 ? snapshot.stats[stat] : Math.min(99, snapshot.stats[stat] + 10);
          snapshot.stats[stat] = Math.max(1, previous - 3);
        });
        if (Number.isFinite(snapshot.popularity)) snapshot.popularity = Math.min(100, snapshot.popularity + 6);
      });
      loaded.jobberStatsVersion = 2;
    }
    return loaded;
  } catch {
    return defaultState();
  }
}

// Career changes live on the wrestler objects so every system reads one source of
// truth; the snapshot just re-applies them after a page reload.
function applyRosterSnapshot() {
  Object.entries(state.roster).forEach(([id, snapshot]) => {
    const w = getWrestlerById(id);
    if (w) {
      Object.assign(w, snapshot);
      w.record = { w: w.record.w, l: w.record.l };
    }
  });
}

function snapshotWrestler(w) {
  state.roster[w.id] = {
    popularity: w.popularity,
    momentum: w.momentum,
    streak: { ...w.streak },
    record: { ...w.record },
    stats: { ...w.stats },
  };
}

// Satisfaction reacts to how the wrestler was actually used tonight: winning, working a
// good match, facing worthwhile opponents, and not being sent out already gassed.
function moraleDeltaFor(w, effect, matchResult, staminaBefore) {
  let delta = effect.resultCode === 'W' ? 3 : effect.resultCode === 'L' ? -1 : 0;
  delta += matchResult.rating >= 70 ? 3 : matchResult.rating < 40 ? -4 : 0;
  const opponents = matchResult.participantIds
    .filter(id => id !== w.id)
    .map(getWrestlerById)
    .filter(Boolean);
  if (opponents.length) {
    const oppAvgPop = opponents.reduce((sum, o) => sum + o.popularity, 0) / opponents.length;
    if (w.popularity - oppAvgPop > 25) delta -= 2; // stuck working down the card
    else if (oppAvgPop - w.popularity > 10) delta += 2; // a rub, working with bigger names
  }
  if (staminaBefore < 40) delta -= 3; // sent out already gassed
  return delta;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, matchSeq }));
  } catch {
    /* storage unavailable — the session still works in memory */
  }
}

export function getState() {
  return state;
}

export function getCompanyIdentity() {
  return state.company;
}

export function companyBrandedText(value) {
  const { acronym, name } = state.company;
  return String(value ?? '')
    .replace(/\bRival World Championship\b|\bRP World Title\b/gi, () => `${acronym} World Title`)
    .replace(/\bRival Tag Team Championship\b|\bRP Tag Team Title\b/gi, () => `${acronym} Tag Team Title`)
    .replace(/\bRP\b/g, () => acronym)
    .replace(/\bRIVAL PROMOTION\b/g, () => name.toUpperCase())
    .replace(/\bRival Promotion\b/g, () => name);
}

export function hasNamedCompany() {
  return Boolean(state.company?.named);
}

// Answered from the welcome email's reply form. Acronym drives the wordmark,
// terminal branding, and the generated logo; the full name is the flavor text everywhere else.
export function setCompanyIdentity({ acronym, name, logoStyle = 'seal', logoAccent = null }) {
  const cleanAcronym = String(acronym || '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 3);
  const cleanName = String(name || '').replace(/[^a-z0-9 '&!.-]/gi, '').trim().slice(0, 40);
  if (cleanAcronym.length !== 3 || !cleanName) return false;
  const cleanLogoStyle = COMPANY_LOGO_STYLES.includes(logoStyle) ? logoStyle : 'seal';
  const cleanLogoAccent = /^#[\da-f]{6}$/i.test(logoAccent ?? '') ? logoAccent : null;
  state.company = { ...state.company, acronym: cleanAcronym, name: cleanName, logoStyle: cleanLogoStyle, logoAccent: cleanLogoAccent, named: true };
  setChampionshipBrand(cleanAcronym);
  persist();
  return true;
}

export function getInbox() {
  const readIds = new Set(state.inbox?.readIds ?? []);
  // Some fields (Rick's later reply) depend on the company name, so they are
  // authored as functions and resolved here against the live state.
  const resolve = value => (typeof value === 'function' ? value(state) : value);
  const storyEmails = availableEmails().map(email => ({
    ...email,
    from: resolve(email.from),
    address: resolve(email.address),
    subject: resolve(email.subject),
    body: resolve(email.body),
    unread: !readIds.has(email.id),
  }));
  // Dynamic and scripted mail share one newest-first timeline.
  const familyEmails = [...(state.inbox.dynamic ?? [])].reverse().map(email => ({ ...email, unread: !readIds.has(email.id) }));
  return [...familyEmails, ...storyEmails]
    .map(email => ({
      ...email,
      date: /^AFTER SHOW \d+$/i.test(email.date ?? '')
        ? new Date(Date.UTC(1996, Number(email.date.match(/\d+/)[0]), 1)).toISOString().slice(0, 10)
        : email.date,
      from: companyBrandedText(email.from),
      address: email.address.replace(/@(rivalpromotion\.com|rp-1996\.com)$/i, `@${state.company.acronym.toLowerCase()}.com`),
      subject: companyBrandedText(email.subject),
      body: email.body.map(companyBrandedText),
    }))
    .map((email, index) => {
      const parsedDate = Date.parse(email.date);
      const order = Number.isFinite(parsedDate)
        ? parsedDate
        : Number.isFinite(email.showNumber)
            ? Date.UTC(1996, email.showNumber - 1, 1)
            : 0;
      return { email, index, order };
    })
    .sort((a, b) => b.order - a.order || b.index - a.index)
    .map(entry => entry.email);
}

export function unreadEmailCount() {
  return getInbox().filter(email => email.unread).length;
}

export function markEmailRead(emailId) {
  const known = availableEmails().some(email => email.id === emailId) || (state.inbox.dynamic ?? []).some(email => email.id === emailId);
  if (!known) return false;
  state.inbox.readIds = [...new Set([...(state.inbox.readIds ?? []), emailId])];
  persist();
  return true;
}

export function startNewGame() {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportGameData() {
  return JSON.stringify({ ...state, matchSeq }, null, 2);
}

export function importGameData(raw) {
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || !parsed.show || !parsed.career) throw new Error(`Invalid ${state.company.name} save file.`);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
}

export function buyLoungeItem(itemId) {
  const item = LOUNGE_ITEMS.find(entry => entry.id === itemId);
  const level = getGMLevel();
  if (!item || state.lounge.owned.includes(itemId)) return { ok: false, message: 'Already owned.' };
  if (level < item.unlockLevel) return { ok: false, message: `GM LEVEL ${item.unlockLevel} REQUIRED.` };
  if (state.bankroll < item.cost) return { ok: false, message: 'Not enough cash.' };
  state.bankroll -= item.cost;
  state.lounge.owned.push(itemId);
  persist();
  return { ok: true, message: `${item.name} purchased.` };
}

export function getOwnedVinyls() {
  return state.lounge.vinyls;
}

export function getDisplayedPaintings() {
  const owned = LOUNGE_PAINTING_IDS.filter(id => state.lounge.owned.includes(id));
  const used = new Set();
  return [0, 1].map(slot => {
    const preferred = state.lounge.displayedPaintings[slot];
    const selected = owned.includes(preferred) && !used.has(preferred)
      ? preferred : owned.find(id => !used.has(id)) ?? null;
    if (selected) used.add(selected);
    return selected;
  });
}

export function setDisplayedPainting(slot, paintingId) {
  if (![0, 1].includes(slot) || !LOUNGE_PAINTING_IDS.includes(paintingId) || !state.lounge.owned.includes(paintingId)) return false;
  const displayed = getDisplayedPaintings();
  const otherSlot = 1 - slot;
  if (displayed[otherSlot] === paintingId) displayed[otherSlot] = displayed[slot];
  displayed[slot] = paintingId;
  state.lounge.displayedPaintings = displayed;
  persist();
  return true;
}

export function getNowPlayingVinyl() {
  return state.lounge.nowPlaying;
}

export function setNowPlayingVinyl(vinylId) {
  if (vinylId && !state.lounge.vinyls.includes(vinylId)) return { ok: false, message: 'You do not own that record yet.' };
  state.lounge.nowPlaying = vinylId;
  persist();
  return { ok: true };
}

export function buyVinyl(vinylId) {
  if (!state.lounge.owned.includes('vinyl-library')) return { ok: false, message: 'Install the Vinyl Library first.' };
  const record = getVinylRecord(vinylId);
  if (!record) return { ok: false, message: 'Unknown record.' };
  if (state.lounge.vinyls.includes(vinylId)) return { ok: false, message: 'Already owned.' };
  if (state.bankroll < record.cost) return { ok: false, message: 'Not enough cash.' };
  state.bankroll -= record.cost;
  state.lounge.vinyls.push(vinylId);
  if (!state.lounge.nowPlaying) state.lounge.nowPlaying = vinylId;
  persist();
  return { ok: true, message: `${record.title} added to the collection.` };
}

export function getFinances() {
  return state.finances;
}

export function getGMLevel() {
  return gmLevelForExperience(state.career.gmExperience ?? 0);
}

export function getGMProgress() {
  const experience = state.career.gmExperience ?? 0;
  const level = getGMLevel();
  const currentLevelExperience = experienceRequiredForLevel(level);
  const nextLevelExperience = experienceRequiredForLevel(level + 1);
  const levelRange = nextLevelExperience - currentLevelExperience;
  return {
    experience,
    level,
    currentLevelExperience,
    nextLevelExperience,
    experienceToNext: Math.max(0, nextLevelExperience - experience),
    progress: levelRange > 0 ? Math.max(0, Math.min(1, (experience - currentLevelExperience) / levelRange)) : 1,
  };
}

// Extra flagship match slots: unlocked by GM level, not raw career length.
export function getMaxMatches() {
  return maxMatchSlotsForLevel(getGMLevel());
}

function nextMatchSlotTier() {
  const level = getGMLevel();
  return MATCH_SLOT_TIERS.find(tier => tier.level > level) ?? null;
}

export function extraMatchSlotUnlocked() {
  return getMaxMatches() > MIN_MATCHES;
}

export function experienceUntilExtraMatchSlot() {
  const tier = nextMatchSlotTier();
  if (!tier) return 0;
  return Math.max(0, experienceRequiredForLevel(tier.level) - (state.career.gmExperience ?? 0));
}

export function updateEventBranding(eventId, changes) {
  const event = PPV_CALENDAR.find(entry => entry.id === eventId);
  if (!event) return false;
  const current = state.eventBranding[eventId] ?? createEventBranding()[eventId];
  const next = { ...current };
  if ('name' in changes) {
    const name = String(changes.name).replace(/[^a-z0-9 '&!?.-]/gi, '').trim().slice(0, 24);
    next.name = name || event.name;
  }
  if ('logoId' in changes && PPV_LOGOS.some(([id]) => id === changes.logoId)) {
    next.logoId = changes.logoId;
    if (!current.colorCustomized) {
      const logoEvent = PPV_CALENDAR.find(entry => entry.logoId === changes.logoId);
      if (logoEvent) next.color = logoEvent.color;
    }
  }
  if ('color' in changes && /^#[0-9a-f]{6}$/i.test(changes.color)) {
    next.color = changes.color;
    next.colorCustomized = true;
  }
  if ('logoStyle' in changes && Number.isInteger(changes.logoStyle)) next.logoStyle = changes.logoStyle;
  state.eventBranding[eventId] = next;
  if (state.show.eventId === eventId) state.show.name = eventDisplayName(event, state.showNumber, state.eventBranding);
  persist();
  return true;
}

export function resetEventBranding(eventId) {
  const defaults = createEventBranding();
  if (!defaults[eventId]) return false;
  state.eventBranding[eventId] = defaults[eventId];
  const event = PPV_CALENDAR.find(entry => entry.id === eventId);
  if (event && state.show.eventId === eventId) state.show.name = eventDisplayName(event, state.showNumber, state.eventBranding);
  persist();
  return true;
}

export function generateEventLogo(eventId) {
  return updateEventBranding(eventId, { logoId: 'generated', logoStyle: Math.floor(Math.random() * 1000000) });
}

export function setFinancePrice(categoryId, value) {
  if (!(categoryId in state.finances.prices)) return false;
  state.finances.prices[categoryId] = clampPrice(categoryId, value);
  persist();
  return true;
}

export function getShow() {
  return state.show;
}

export function getMatch(matchId) {
  return state.show.matches.find(m => m.id === matchId) || null;
}

export function staminaFor(id) {
  return state.stamina[id] ?? 100;
}

// Satisfaction/happiness (0-100). Rises with good matches, good opponents, and
// attention during lead-up; falls when buried, gassed, or left off the card.
export function moraleFor(id) {
  return state.morale[id] ?? 65;
}

export function relationshipFor(id) {
  return state.relationships[id] ?? 50;
}

function adjustMorale(id, delta) {
  state.morale[id] = Math.max(0, Math.min(100, Math.round(moraleFor(id) + delta)));
}

export function injuryFor(id) {
  return state.injuries[id] ?? 0;
}

export function isAvailable(id) {
  return injuryFor(id) === 0 && isSigned(id);
}

export function availableWrestlers() {
  return getSignedRoster().filter(w => isAvailable(w.id));
}

// ---------------------------------------------------------------------------
// Founding ceremony — a pack break, not a draft. You do not pick your roster.
// ---------------------------------------------------------------------------
export function isDraftComplete() {
  return state.draft.complete;
}

export function isSigned(id) {
  return state.draft.signedIds.includes(id);
}

export function getSignedRoster() {
  const signed = new Set(state.draft.signedIds);
  return wrestlers
    .filter(w => signed.has(w.id))
    .sort((a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name));
}

export function getPowerRankings() {
  const ranked = getSignedRoster().map(w => {
    const champion = isChampion(w.id).length > 0;
    const score = w.popularity + w.momentum * 4 + w.record.w * 1.5 - w.record.l * .5 + (champion ? 12 : 0);
    return { w, champion, score };
  }).sort((first, second) => {
    const championOrder = Number(second.champion) - Number(first.champion);
    const contenderOrder = Number(second.w.id === state.numberOneContenderId) - Number(first.w.id === state.numberOneContenderId);
    return championOrder || contenderOrder || second.score - first.score || first.w.name.localeCompare(second.w.name);
  });
  let contenderRank = 0;
  return ranked.map(entry => ({ ...entry, rank: entry.champion ? null : ++contenderRank }));
}

function eligiblePool() {
  const signed = new Set(state.draft.signedIds);
  const passed = new Set(state.cards.founding.passed ?? []);
  return wrestlers.filter(w => hasDebuted(w, state.showNumber)
    && !signed.has(w.id)
    && !passed.has(w.id)
    && !w.retired && !w.deceased
    && getDraftTier(w) !== 'celebrity');
}

// Called once when the ceremony screen first opens.
export function openFoundingCeremony() {
  const founding = state.cards.founding;
  if (founding.complete) return founding;
  if (!founding.cards.length) {
    founding.cards = rollFoundingPack(eligiblePool(), { getTier: getDraftTier });
    founding.redrawsLeft = FOUNDING_REDRAWS;
    founding.revealed = [];
    founding.opened = false;
    founding.passed = [];
    persist();
  }
  // A ceremony already part-way through never goes back in the wrapper.
  if (founding.revealed.length > 0 && !founding.opened) {
    founding.opened = true;
    persist();
  }
  return founding;
}

export function getFoundingCeremony() {
  const founding = state.cards.founding;
  return {
    ...founding,
    packSize: FOUNDING_PACK_SIZE,
    cards: founding.cards.map(card => ({ kind: 'wrestler', ...card, wrestler: getWrestlerById(card.id) })),
  };
}

export function openFoundingPack() {
  state.cards.founding.opened = true;
  persist();
  return { ok: true };
}

export function revealFoundingCard(index) {
  const founding = state.cards.founding;
  if (index == null || index < 0 || index >= founding.cards.length) return { ok: false };
  if (founding.revealed.includes(index)) return { ok: false };
  founding.revealed = [...founding.revealed, index];
  persist();
  return { ok: true, index };
}

export function revealAllFoundingCards() {
  const founding = state.cards.founding;
  founding.revealed = founding.cards.map((_, index) => index);
  persist();
  return { ok: true };
}

// One re-draw for the whole ceremony, same tier only. The wrestler you pass on signs
// elsewhere, but can turn up on a future January board.
export function redrawFoundingSlot(index) {
  const founding = state.cards.founding;
  if (founding.complete) return { ok: false, message: 'The roster is already locked in.' };
  if (founding.redrawsLeft <= 0) return { ok: false, message: 'You only get one re-draw.' };
  if (!founding.revealed.includes(index)) return { ok: false, message: 'Turn that card over first.' };
  const result = redrawFoundingCard(founding.cards, index, eligiblePool(), { getTier: getDraftTier });
  if (!result.ok) return result;
  founding.cards = result.cards;
  founding.passed = [...(founding.passed ?? []), result.passed];
  founding.redrawsLeft -= 1;
  persist();
  return { ok: true, drawn: result.drawn, passed: getWrestlerById(result.passed) };
}

export function confirmFoundingRoster() {
  const founding = state.cards.founding;
  if (founding.complete) return { ok: false, message: 'Already locked in.' };
  if (founding.revealed.length < founding.cards.length) return { ok: false, message: 'Turn every card over first.' };
  founding.cards.forEach(card => {
    if (state.draft.signedIds.includes(card.id)) return;
    state.draft.signedIds.push(card.id);
    state.signedShows[card.id] = state.showNumber;
  });

  // The same pack carries the starter stipulations and both inaugural belts.
  // Fixed rarity slots keep the inaugural pack from collapsing into an all-common dump.
  const gimmicks = rollGimmickPack(FOUNDING_GIMMICK_PACK, { weights: FOUNDING_GIMMICK_WEIGHTS, distinctByRarity: true });
  state.cards.promoDrawCycles.common = [...new Set([...(state.cards.promoDrawCycles.common ?? []), 'custom'])];
  const promos = ['custom', 'custom', 'custom', ...rollStarterPromoPack(FOUNDING_PROMO_PACK)];
  addGimmickCards(state.cards, gimmicks);
  addPromoCards(state.cards, promos);
  state.cards.gimmickLog = [{ year: 1, cards: gimmicks }, ...(state.cards.gimmickLog ?? [])].slice(0, 12);
  state.cards.promoLog = [{ year: 1, cards: promos }, ...(state.cards.promoLog ?? [])].slice(0, 12);
  TITLE_CARDS.forEach(id => {
    if (state.titles[id]) state.titles[id].unlocked = true;
  });
  founding.starter = {
    cards: [
      ...TITLE_CARDS.map(id => ({ kind: 'title', id })),
      ...gimmicks.map(id => ({ kind: 'gimmick', id })),
      ...promos.map(id => ({ kind: 'promo', id })),
    ],
    revealed: [],
    seen: false,
  };

  founding.complete = true;
  state.draft.complete = true;
  persist();
  return { ok: true, roster: getSignedRoster() };
}

// The founding pack's second half: the belts and the starter stipulations.
export function getFoundingStarter() {
  const starter = state.cards.founding.starter;
  if (!starter || starter.seen) return null;
  return {
    ...starter,
    cards: starter.cards.map(card => decorateCard(card)),
  };
}

export function revealStarterCard(index) {
  const starter = state.cards.founding.starter;
  if (!starter || index == null || starter.revealed.includes(index)) return { ok: false };
  starter.revealed = [...starter.revealed, index];
  persist();
  return { ok: true };
}

export function revealAllStarterCards() {
  const starter = state.cards.founding.starter;
  if (!starter) return { ok: false };
  starter.revealed = starter.cards.map((_, index) => index);
  persist();
  return { ok: true };
}

export function dismissFoundingStarter() {
  const starter = state.cards.founding.starter;
  if (starter) starter.seen = true;
  persist();
  return { ok: true };
}

// Shared shape so wrestler, gimmick, and title cards all render through one component.
function decorateCard(card) {
  if (card.kind === 'wrestler') {
    const wrestler = getWrestlerById(card.id);
    return { ...card, wrestler, tier: card.tier ?? (wrestler ? getDraftTier(wrestler) : 'jobber') };
  }
  if (card.kind === 'title') {
    return { ...card, title: getChampionship(card.id) };
  }
  if (card.kind === 'promo') {
    return { ...card, promo: getStorylineTemplate(card.id), rarity: promoCardRarity(card.id) };
  }
  return { ...card, type: getMatchType(card.id), rarity: gimmickRarity(card.id) };
}


export function getLastResult() {
  return state.results[0] ?? null;
}

export function showDateLabel() {
  return new Date(`${state.date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

export function getProjection(venueId = state.show.venueId) {
  syncBookedTeams();
  return projectShow({ ...state.show, venueId }, {
    history: state.history,
    bankroll: state.bankroll,
    staminaLookup: staminaFor,
    moraleLookup: moraleFor,
    rosterSize: wrestlers.length,
    titles: state.titles,
    showNumber: state.showNumber,
    gmLevel: getGMLevel(),
    finances: state.finances,
    marketHype: state.marketHype,
    teams: state.teams,
    leadUpLog: state.leadUp.log,
  });
}

// ---------------------------------------------------------------------------
// Tag teams
// ---------------------------------------------------------------------------
export function getTeams() {
  syncBookedTeams();
  return state.teams.filter(team => team.active);
}

function pruneTeams() {
  const seen = new Set();
  state.teams = state.teams
    .filter(team => team.active && team.memberIds.length === 2 && team.memberIds.every(isSigned))
    .filter(team => team.createdExplicitly || (team.uses ?? 0) > 0
      || (team.record?.w ?? 0) + (team.record?.l ?? 0) > 0
      || team.name !== team.memberIds.map(id => getWrestlerById(id).name.split(' ').at(-1)).join(' & '))
    .sort((first, second) => (second.lastUsedShow ?? 0) - (first.lastUsedShow ?? 0)
      || (second.lastUsedOrder ?? 0) - (first.lastUsedOrder ?? 0)
      || (second.uses ?? 0) - (first.uses ?? 0))
    .filter(team => {
      const key = team.memberIds.slice().sort().join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_SAVED_TEAMS);
}

function rememberTeam(memberIds, name = '') {
  const members = [...new Set(memberIds)].filter(isSigned);
  if (members.length !== 2) return null;
  const teamName = String(name ?? '').replace(/[<>&"]/g, '').trim().slice(0, 32);
  const matchesPair = entry => entry.memberIds.length === 2 && members.every(id => entry.memberIds.includes(id));
  let team = state.teams.find(entry => entry.active && matchesPair(entry)) ?? state.teams.find(matchesPair);
  const firstUseThisShow = !team || team.lastUsedShow !== state.showNumber;
  if (team) {
    if (teamName) team.name = teamName;
    team.active = true;
  } else {
    team = {
      id: `team-${members.slice().sort().join('-')}`,
      name: teamName || members.map(id => getWrestlerById(id).name.split(' ').at(-1)).join(' & '),
      memberIds: members,
      chemistry: computeChemistry(members[0], members[1])?.score ?? 50,
      record: { w: 0, l: 0 },
      active: true,
      uses: 0,
    };
    state.teams.push(team);
  }
  if (firstUseThisShow) {
    state.teamUseSequence = (state.teamUseSequence ?? 0) + 1;
    team.lastUsedOrder = state.teamUseSequence;
  }
  team.lastUsedShow = state.showNumber;
  team.lastUsedDate = state.date;
  return team;
}

function syncBookedTeams() {
  state.teams.forEach(team => {
    team.record = { w: team.record?.w ?? 0, l: team.record?.l ?? 0 };
    if (team.lastUsedShow != null) return;
    const depth = (state.history ?? []).findIndex(show => (show.matches ?? []).some(match => {
      const type = getMatchType(match.typeId);
      if (!type?.slots.teams || type.slots.perTeam !== 2) return false;
      const sides = match.sideIds ?? [match.participantIds?.slice(0, 2) ?? [], match.participantIds?.slice(2, 4) ?? []];
      return sides.some(side => side.length === 2 && team.memberIds.every(id => side.includes(id)));
    }));
    if (depth >= 0) {
      const show = state.history[depth];
      team.lastUsedShow = show.showNumber ?? state.showNumber - depth - 1;
      team.lastUsedDate = show.date;
    }
    team.uses ??= (team.record?.w ?? 0) + (team.record?.l ?? 0);
  });
  pruneTeams();
}

export function createTeam(name, memberIds) {
  const team = rememberTeam(memberIds, name);
  if (!team) return { ok: false, message: 'Choose two signed wrestlers.' };
  team.createdExplicitly = true;
  pruneTeams();
  persist();
  return { ok: true, team };
}

export function renameTeam(teamId, name) {
  const team = state.teams.find(entry => entry.id === teamId && entry.active);
  const teamName = String(name ?? '').replace(/[<>&"]/g, '').trim().slice(0, 32);
  if (!team || !teamName) return { ok: false, message: 'Enter a team name.' };
  team.name = teamName;
  team.createdExplicitly = true;
  persist();
  return { ok: true, team };
}

export function dissolveTeam(teamId) {
  const team = state.teams.find(entry => entry.id === teamId && entry.active);
  if (!team) return false;
  team.active = false;
  persist();
  return true;
}

function updateTeamRecords(result) {
  result.matches.forEach(match => {
    const type = getMatchType(match.typeId);
    if (!type?.slots.teams || type.slots.perTeam !== 2) return;
    const sides = match.sideIds ?? [match.participantIds.slice(0, 2), match.participantIds.slice(2, 4)];
    sides.forEach(side => {
      if (side.length !== 2) return;
      const team = rememberTeam(side);
      if (!team) return;
      team.record ??= { w: 0, l: 0 };
      if (match.winnerIds?.length) {
        if (team.memberIds.every(id => match.winnerIds.includes(id))) team.record.w += 1;
        else team.record.l += 1;
      }
      team.uses = (team.uses ?? 0) + 1;
    });
  });
  pruneTeams();
}

function controversyForMatch(match, matchResult) {
  const participants = matchResult.participantIds ?? [];
  if (participants.length !== 2) return null;
  const accused = getWrestlerById(matchResult.winnerIds?.[0] ?? participants[0]);
  const victim = getWrestlerById(participants.find(id => id !== accused?.id) ?? participants[1]);
  if (!accused || !victim) return null;

  if (matchResult.outcome === 'disqualification' || matchResult.outcome === 'count-out') {
    const templateId = Math.random() < .5 ? 'rogue-officials' : 'screwjob-aftermath';
    return {
      templateId, participants: [accused.id, victim.id], accusedName: accused.name, victimName: victim.name,
    };
  }

  if (match.typeId === 'singles') {
    const helperTeam = state.teams.find(team => team.active && team.memberIds.includes(accused.id));
    const helperId = helperTeam?.memberIds.find(id => id !== accused.id && !participants.includes(id));
    if (helperId && Math.random() < .32) {
      const helper = getWrestlerById(helperId);
      return {
        templateId: 'tag-team-cheating-scandal', participants: [accused.id, victim.id, helperId],
        accusedName: accused.name, victimName: victim.name, helperName: helper?.name,
      };
    }
    if (Math.random() < .08) {
      return {
        templateId: 'false-accusation', participants: [accused.id, victim.id],
        accusedName: accused.name, victimName: victim.name,
      };
    }
  }
  return null;
}

function setRelationship(id, delta) {
  state.relationships[id] = Math.max(0, Math.min(100, relationshipFor(id) + delta));
}

function recordPromoHistoryEntry(entry) {
  state.promoHistory.unshift(entry);
  state.promoHistory = state.promoHistory.slice(0, 500);
  return entry;
}

function recordIncidentPromo(templateId, participantIds, text) {
  const template = getStorylineTemplate(templateId);
  if (!participantIds.length) return null;
  const ownerId = participantIds[0];
  return recordPromoHistoryEntry({
    id: `incident-promo-${state.showNumber}-${state.promoHistory.length}`,
    promoId: `incident:${templateId}`,
    promoName: template?.name ?? 'Backstage Incident',
    rarity: 'Incident',
    spotlightId: ownerId,
    participantIds,
    opponentIds: participantIds.filter(id => id !== ownerId),
    showNumber: state.showNumber,
    showName: state.show.name,
    date: state.date,
    matchType: 'Backstage incident',
    matchRating: 0,
    outcome: 'incident',
    winnerNames: [],
    text,
    effects: {},
  });
}

function maybeCreateIncident() {
  if (state.incidents.pending || state.showNumber < 2) return null;
  const roster = getSignedRoster().filter(wrestler => !wrestler.retired);
  const averageTrust = roster.length
    ? roster.reduce((sum, wrestler) => sum + relationshipFor(wrestler.id), 0) / roster.length
    : 50;
  const chance = Math.max(0.12, Math.min(0.48, 0.24 + (55 - averageTrust) / 180 + (55 - state.gm.balance) / 220));
  if (Math.random() >= chance) return null;

  const available = type => (state.incidents.cooldowns[type] ?? 0) < state.showNumber;
  const volatile = [...roster].sort((a, b) =>
    (b.hidden.ego + b.hidden.riskTolerance + (100 - moraleFor(b.id)) + (100 - relationshipFor(b.id))) -
    (a.hidden.ego + a.hidden.riskTolerance + (100 - moraleFor(a.id)) + (100 - relationshipFor(a.id))),
  );
  const reckless = [...roster].filter(wrestler => wrestler.hidden.riskTolerance >= 68).sort((a, b) => b.hidden.riskTolerance - a.hidden.riskTolerance);
  const injured = roster.filter(wrestler => injuryFor(wrestler.id) > 0);
  const incidents = [];

  if (available('personal-scandal') && volatile.length >= 2 && volatile[0].hidden.ego >= 60) {
    const [star, rival] = volatile;
    incidents.push({
      type: 'personal-scandal', weight: 2,
      title: 'A Hotel Rumor Hits The Locker Room',
      body: `A rumor links ${star.name} to ${rival.name}’s spouse. Nobody knows the whole truth, but everyone has chosen a side.`,
      participants: [star.id, rival.id],
      choices: [
        { id: 'suspend', label: `Suspend ${star.name}`, detail: 'Protect the locker room, lose star power, and deepen the resentment.' },
        { id: 'exploit', label: 'Turn it into television', detail: 'A high-profile one-off Promo at a serious human cost.' },
        { id: 'deny', label: 'Publicly deny everything', detail: 'May contain the story or make the eventual fallout worse.' },
      ],
    });
  }
  if (available('dangerous-stunt') && reckless.length) {
    const wrestler = reckless[0];
    incidents.push({
      type: 'dangerous-stunt', weight: 3,
      title: `${wrestler.name} Wants To Go Further`,
      body: `${wrestler.name} has pitched a brutal stunt for the next major match. The locker room thinks it is either unforgettable or completely reckless.`,
      participants: [wrestler.id],
      choices: [
        { id: 'approve', label: 'Approve the stunt', detail: 'Big popularity upside with immediate fatigue and injury risk.' },
        { id: 'safer', label: 'Design a safer version', detail: 'A smaller boost, but trust improves.' },
        { id: 'refuse', label: 'Refuse outright', detail: 'Protect their body and risk damaging the relationship.' },
      ],
    });
  }
  if (available('injury-crisis') && injured.length) {
    const wrestler = injured.sort((a, b) => injuryFor(b.id) - injuryFor(a.id))[0];
    incidents.push({
      type: 'injury-crisis', weight: 4,
      title: `${wrestler.name} Is Struggling`,
      body: `Recovery has stalled, and prescription medication is becoming part of the problem. A backstage scene forces the company to respond.`,
      participants: [wrestler.id],
      choices: [
        { id: 'rehab', label: 'Pay for treatment', detail: 'Expensive, compassionate, and best for long-term trust.' },
        { id: 'suspend', label: 'Suspend them until cleared', detail: 'Protects the card but may deepen the isolation.' },
        { id: 'cover', label: 'Keep it quiet', detail: 'Avoid immediate attention with a serious risk of escalation.' },
      ],
    });
  }
  if (available('comeback') && injured.length) {
    const wrestler = injured[Math.floor(Math.random() * injured.length)];
    incidents.push({
      type: 'comeback', weight: 3,
      title: `${wrestler.name} Wants One More Shot`,
      body: `After a punishing injury and a difficult recovery, ${wrestler.name} believes the comeback can begin now. The medical opinion is less certain.`,
      participants: [wrestler.id],
      choices: [
        { id: 'early', label: 'Clear an early return', detail: 'A dramatic comeback with a real chance of a serious setback.' },
        { id: 'patient', label: 'Finish rehabilitation', detail: 'Lose the immediate moment but improve the recovery and relationship.' },
        { id: 'vignettes', label: 'Build the comeback from afar', detail: 'Keep them out of the ring while building anticipation.' },
      ],
    });
  }
  if (available('ego-ultimatum') && volatile.length && (moraleFor(volatile[0].id) < 52 || relationshipFor(volatile[0].id) < 42)) {
    const wrestler = volatile[0];
    incidents.push({
      type: 'ego-ultimatum', weight: 3,
      title: `${wrestler.name} Demands An Answer`,
      body: `${wrestler.name} is tired of waiting and wants a clear place near the top of the card.`,
      participants: [wrestler.id],
      choices: [
        { id: 'promise', label: 'Promise a major opportunity', detail: 'Restores trust now, but creates an expectation you should honor.' },
        { id: 'challenge', label: 'Tell them to earn it', detail: 'Could motivate them or turn frustration into open defiance.' },
        { id: 'listen', label: 'Hear them out privately', detail: 'A moderate relationship repair without making a booking promise.' },
      ],
    });
  }
  if (!incidents.length) return null;
  const weighted = incidents.flatMap(incident => Array.from({ length: incident.weight }, () => incident));
  const incident = { ...pickOne(weighted), id: `incident-${++state.incidents.seq}`, showNumber: state.showNumber, date: state.date };
  delete incident.weight;
  state.incidents.pending = incident;
  return incident;
}

export function getPendingIncident() {
  return state.incidents.pending;
}

export function resolveIncident(choiceId) {
  const incident = state.incidents.pending;
  if (!incident || !incident.choices.some(choice => choice.id === choiceId)) return { ok: false, message: 'That decision is no longer available.' };
  const [primaryId, secondaryId] = incident.participants;
  const primary = getWrestlerById(primaryId);
  const secondary = getWrestlerById(secondaryId);
  let message = 'The decision is made.';

  if (incident.type === 'personal-scandal') {
    if (choiceId === 'suspend') {
      adjustMorale(primaryId, -12); setRelationship(primaryId, -8); setRelationship(secondaryId, 10);
      primary.popularity = Math.max(1, primary.popularity - 2);
      message = `${primary.name} is suspended. ${secondary.name} appreciates the stand, but the issue is far from dead.`;
    } else if (choiceId === 'exploit') {
      primary.popularity = Math.min(100, primary.popularity + 3); secondary.popularity = Math.min(100, secondary.popularity + 3);
      adjustMorale(secondaryId, -15); setRelationship(primaryId, -12); setRelationship(secondaryId, -10);
      recordIncidentPromo('betrayal', [primaryId, secondaryId], 'Management turned a personal scandal into a one-off Promo.');
      message = 'The scandal becomes the hottest story in the company, and the locker room knows exactly what you traded for it.';
    } else {
      const exposed = Math.random() < 0.45;
      setRelationship(primaryId, exposed ? -14 : 3); setRelationship(secondaryId, exposed ? -10 : 2);
      if (exposed) { primary.popularity = Math.max(1, primary.popularity - 4); adjustMorale(secondaryId, -8); }
      message = exposed ? 'The denial collapses under new rumors and makes everyone look worse.' : 'The story cools down for now, though nobody entirely believes the statement.';
    }
  } else if (incident.type === 'dangerous-stunt') {
    if (choiceId === 'approve') {
      state.stamina[primaryId] = Math.max(0, staminaFor(primaryId) - 25);
      primary.popularity = Math.min(100, primary.popularity + 5); adjustMorale(primaryId, 8); setRelationship(primaryId, 4);
      if (Math.random() < 0.28) state.injuries[primaryId] = Math.max(injuryFor(primaryId), 8);
      recordIncidentPromo('screwjob-aftermath', [primaryId], `${primary.name} was allowed to push the rivalry into dangerous territory.`);
      message = injuryFor(primaryId) ? `${primary.name} attempted it and paid for it with an injury.` : `${primary.name} survived the stunt and the footage is already circulating.`;
    } else if (choiceId === 'safer') {
      primary.popularity = Math.min(100, primary.popularity + 2); adjustMorale(primaryId, 2); setRelationship(primaryId, 8);
      recordIncidentPromo('screwjob-aftermath', [primaryId], `${primary.name} agreed to a safer escalation without cooling the issue off.`);
      message = `${primary.name} accepts the compromise. The moment still lands without gambling their career.`;
    } else {
      adjustMorale(primaryId, -10); setRelationship(primaryId, -8);
      message = `${primary.name} is healthy and furious that you would not let them take the risk.`;
    }
  } else if (incident.type === 'injury-crisis') {
    if (choiceId === 'rehab') {
      const cost = Math.min(30000, state.bankroll);
      state.bankroll -= cost; state.injuries[primaryId] = Math.max(1, injuryFor(primaryId) - 3);
      adjustMorale(primaryId, 15); setRelationship(primaryId, 18);
      message = `${primary.name} enters treatment with the company covering $${cost.toLocaleString()}. Recovery finally has a direction.`;
    } else if (choiceId === 'suspend') {
      state.injuries[primaryId] = Math.max(injuryFor(primaryId), 6); adjustMorale(primaryId, -8); setRelationship(primaryId, -3);
      message = `${primary.name} is suspended until medically cleared. The immediate danger passes, but trust is strained.`;
    } else {
      const exposed = Math.random() < 0.55;
      adjustMorale(primaryId, -8); setRelationship(primaryId, -10);
      if (exposed) { primary.popularity = Math.max(1, primary.popularity - 6); state.injuries[primaryId] = Math.max(injuryFor(primaryId), 10); }
      message = exposed ? 'The cover-up fails and the situation becomes a public crisis.' : 'The story stays quiet this month, but the underlying problem remains.';
    }
  } else if (incident.type === 'comeback') {
    if (choiceId === 'early') {
      const setback = Math.random() < 0.38;
      if (setback) {
        state.injuries[primaryId] = Math.max(injuryFor(primaryId), 10);
        adjustMorale(primaryId, -8); setRelationship(primaryId, -6);
        message = `${primary.name} returned too soon and suffered a major setback. The comeback will have to begin again.`;
      } else {
        delete state.injuries[primaryId];
        primary.popularity = Math.min(100, primary.popularity + 7);
        primary.momentum = Math.min(5, primary.momentum + 2);
        message = `${primary.name} beat the prognosis and returned to an enormous reaction.`;
      }
      recordIncidentPromo('comeback-injury-return', [primaryId], `${primary.name} risked an early return from a serious injury.`);
    } else if (choiceId === 'patient') {
      state.injuries[primaryId] = Math.max(0, injuryFor(primaryId) - 4);
      if (!state.injuries[primaryId]) delete state.injuries[primaryId];
      adjustMorale(primaryId, 5); setRelationship(primaryId, 8);
      message = `${primary.name} accepts the long recovery plan and makes real progress.`;
    } else {
      primary.popularity = Math.min(100, primary.popularity + 3); setRelationship(primaryId, 5);
      recordIncidentPromo('comeback-mysterious-absence', [primaryId], `${primary.name} began telling the comeback story before being medically cleared.`);
      message = `${primary.name}'s recovery footage builds anticipation without risking another injury.`;
    }
  } else if (incident.type === 'ego-ultimatum') {
    if (choiceId === 'promise') {
      adjustMorale(primaryId, 15); setRelationship(primaryId, 8);
      state.incidents.promises = [...(state.incidents.promises ?? []), { wrestlerId: primaryId, madeShow: state.showNumber, dueShow: state.showNumber + 3, type: 'major-opportunity' }];
      message = `${primary.name} leaves satisfied. You now have three shows to deliver a major opportunity.`;
    } else if (choiceId === 'challenge') {
      const motivated = Math.random() < ((primary.hidden.workEthic ?? 60) / 100);
      adjustMorale(primaryId, motivated ? 8 : -12); setRelationship(primaryId, motivated ? 4 : -10);
      primary.momentum = Math.max(-5, Math.min(5, primary.momentum + (motivated ? 2 : -1)));
      message = motivated ? `${primary.name} takes the challenge personally and comes back focused.` : `${primary.name} hears disrespect and leaves angrier than before.`;
    } else {
      adjustMorale(primaryId, 8); setRelationship(primaryId, 12);
      message = `The private conversation lowers the temperature. ${primary.name} still wants more, but feels heard.`;
    }
  }

  incident.choiceId = choiceId;
  incident.resolution = message;
  state.incidents.history.unshift(incident);
  state.incidents.history = state.incidents.history.slice(0, 30);
  state.incidents.cooldowns[incident.type] = state.showNumber + 6;
  state.incidents.pending = null;
  [primary, secondary].filter(Boolean).forEach(snapshotWrestler);
  persist();
  return { ok: true, message, incident };
}

function evaluateIncidentPromises(result) {
  const remaining = [];
  const updates = [];
  (state.incidents.promises ?? []).forEach(promise => {
    const majorMatch = state.show.matches.find((match, index) =>
      matchParticipantIds(match).includes(promise.wrestlerId) &&
      (index === state.show.matches.length - 1 || Boolean(match.titleId)),
    );
    const wrestler = getWrestlerById(promise.wrestlerId);
    if (majorMatch) {
      adjustMorale(promise.wrestlerId, 10);
      setRelationship(promise.wrestlerId, 12);
      updates.push(`${wrestler?.name ?? 'A wrestler'} received the promised major opportunity.`);
    } else if (state.showNumber >= promise.dueShow) {
      adjustMorale(promise.wrestlerId, -18);
      setRelationship(promise.wrestlerId, -20);
      updates.push(`BROKEN PROMISE: ${wrestler?.name ?? 'A wrestler'} waited three shows for an opportunity that never came.`);
    } else {
      remaining.push(promise);
    }
  });
  state.incidents.promises = remaining;
  result.promiseUpdates = updates;
  result.headlines.push(...updates);
}

// ---------------------------------------------------------------------------
// Championships
// ---------------------------------------------------------------------------
export function getTitles() {
  return CHAMPIONSHIPS.map(def => ({
    def,
    state: state.titles[def.id],
    status: defenseStatus(def, state.titles[def.id], state.showNumber),
    holderNames: state.titles[def.id].holders.map(id => getWrestlerById(id)?.name ?? id),
  }));
}

export function titleState(id) {
  return state.titles[id] ?? null;
}

export function isChampion(wrestlerId) {
  return CHAMPIONSHIPS.filter(def => state.titles[def.id].holders.includes(wrestlerId));
}

// Booking a belt into a match implies the stake; clearing it hands the stake back.
export function setMatchTitle(matchId, titleId) {
  const match = getMatch(matchId);
  if (!match) return;
  const title = titleId ? getChampionship(titleId) : null;
  if (titleId && !canBookTitle(titleId, matchId)) return false;
  match.titleId = titleId || null;
  if (match.titleId) match.stakeId = 'title';
  else if (match.stakeId === 'title') match.stakeId = 'none';
  persist();
  return true;
}

// The belt only goes on the line if you hold the card, the match type fits, and the
// current champion is actually in it. A vacant belt is open to anyone.
export function canBookTitle(titleId, matchId) {
  const def = getChampionship(titleId);
  const titleData = state.titles[titleId];
  const match = getMatch(matchId);
  if (!def || !titleData || !match) return false;
  if (!titleBookable(def, state.show, titleData)) return false;
  if (!titleMatchCompatible(def, getMatchType(match.typeId))) return false;
  if (!titleData.holders.length) return true;
  const participants = matchParticipantIds(match);
  return titleData.holders.every(id => participants.includes(id));
}

// Every title the player could legally put on this match right now.
export function bookableTitlesFor(matchId) {
  return CHAMPIONSHIPS
    .filter(def => state.titles[def.id]?.unlocked && canBookTitle(def.id, matchId))
    .map(def => ({
      def,
      state: state.titles[def.id],
      holderNames: state.titles[def.id].holders.map(id => getWrestlerById(id)?.name ?? id),
    }));
}

// Runtime follows card position instead of being one more thing to set by hand:
// openers are sprints, the main event gets room to breathe.
function autoLengthFor(index, total) {
  if (total <= 1) return 'extended';
  if (index === total - 1) return 'extended';
  if (index === 0) return 'sprint';
  return 'standard';
}

function syncMatchLengths() {
  const matches = state.show.matches ?? [];
  matches.forEach((match, index) => {
    match.lengthId = autoLengthFor(index, matches.length);
  });
}

// ---------------------------------------------------------------------------
// Promo cards
// ---------------------------------------------------------------------------
// Feeds gated Promo templates (Arrival, Comeback) the data they need: when a wrestler
// signed, and the recent-show history used to detect a long absence.
function promoEligibilityContext(match = null) {
  return {
    showNumber: state.showNumber,
    signedShows: state.signedShows,
    history: state.history,
    forMatch: Boolean(match),
    currentChampionIds: match
      ? [...new Set(Object.values(state.titles).flatMap(title => title.holders ?? []))]
      : [],
  };
}

export function getPromoInventory() {
  return Object.entries(state.cards.promos ?? {})
    .map(([id, count]) => ({
      id,
      count,
      template: getStorylineTemplate(id),
      rarity: promoCardRarity(id),
    }))
    .filter(card => card.template && card.rarity)
    .sort((a, b) => (b.rarity.packWeight - a.rarity.packWeight) || a.template.name.localeCompare(b.template.name));
}

export function getPromoHistoryFor(wrestlerId) {
  return (state.promoHistory ?? []).filter(entry => entry.participantIds?.includes(wrestlerId));
}

export function getWrestlerHistory(wrestlerId) {
  const events = (state.randomEventHistory ?? []).filter(event => event.wrestlerIds?.includes(wrestlerId))
    .sort((first, second) => (Date.parse(second.date) || 0) - (Date.parse(first.date) || 0));
  const eventPromoIds = new Set(events.map(event => `event-promo-${event.showNumber}-${event.eventId}`));
  const promoHistory = getPromoHistoryFor(wrestlerId).filter(promo => !eventPromoIds.has(promo.id));
  const attached = new Set();
  const rows = [];
  const shows = state.archive?.length ? state.archive : state.results ?? [];
  const appendShow = (show, house = false) => {
    const fullShow = house ? show : state.results?.find(result => result.showNumber === show.showNumber && result.date === show.date);
    (show.matches ?? []).forEach((savedMatch, index) => {
      if (!savedMatch.participantIds?.includes(wrestlerId)) return;
      const match = { ...savedMatch, ...(fullShow?.matches?.[index] ?? {}) };
      const sameShow = promo => promo.showNumber != null && show.showNumber != null
        ? promo.showNumber === show.showNumber
        : promo.showName === (show.showName ?? show.name) && promo.date === show.date;
      const linked = house ? [] : promoHistory.filter(promo => {
        if (!sameShow(promo)) return false;
        if (promo.matchId && match.matchId) return promo.matchId === match.matchId;
        if (match.matchId && promo.id?.endsWith(`-${match.matchId}`)) return true;
        return promo.participantIds?.length >= 2 && promo.participantIds.every(id => match.participantIds.includes(id));
      });
      const promos = [...(match.promos ?? []), match.promoCard, match.storyIncident, ...linked].filter(Boolean)
        .filter((promo, promoIndex, entries) => entries.findIndex(entry => entry.id === promo.id) === promoIndex)
        .filter(promo => !promo.participantIds || promo.participantIds.includes(wrestlerId));
      promos.forEach(promo => { if (promo.id) attached.add(promo.id); });
      const ownSide = match.sideIds?.findIndex(side => side.includes(wrestlerId)) ?? -1;
      const opponents = ownSide >= 0
        ? match.sideNames?.filter((name, side) => side !== ownSide).join(' / ')
        : match.participantIds.filter(id => id !== wrestlerId).map(id => getWrestlerById(id)?.name ?? id).join(' & ');
      const draw = ['draw', 'time-limit draw'].includes(match.outcome);
      const resultCode = draw ? 'D' : match.winnerIds?.includes(wrestlerId) ? 'W'
        : match.typeId === 'battle-royal' || !match.winnerIds?.length ? 'NC' : 'L';
      const winner = Array.isArray(match.winnerNames) ? match.winnerNames.join(' & ') : match.winnerNames;
      rows.push({
        event: show.showName ?? show.name ?? 'House Show', date: show.date,
        opponentName: opponents || 'Unknown', result: resultCode,
        type: match.typeName ?? getMatchType(match.typeId)?.name ?? 'Match',
        rating: match.rating, stars: match.stars, promos,
        description: match.finish || (draw ? 'Draw.' : winner ? `${winner} won${match.time ? ` in ${match.time}` : ''}.` : 'No decisive winner.'),
      });
    });
  };
  shows.forEach(show => appendShow(show));
  (state.houseShows ?? []).forEach(show => appendShow(show, true));
  rows.sort((first, second) => (Date.parse(second.date) || 0) - (Date.parse(first.date) || 0));
  return { matches: rows, promos: promoHistory.filter(promo => !attached.has(promo.id)), events };
}

export function getCardBookInventory() {
  const signed = new Set(state.draft.signedIds);
  const available = new Set(getFreeAgents().map(entry => entry.wrestler.id));
  return {
    wrestlers: wrestlers.map(wrestler => ({
      card: { id: wrestler.id, kind: 'wrestler', wrestler, tier: getDraftTier(wrestler) },
      status: signed.has(wrestler.id) ? 'owned' : available.has(wrestler.id) ? 'unowned' : 'locked',
    })).sort((first, second) => ({ owned: 0, unowned: 1, locked: 2 }[first.status] - { owned: 0, unowned: 1, locked: 2 }[second.status])),
    matches: Object.keys(GIMMICK_CARD_RARITY).map(id => ({
      card: { id, kind: 'gimmick', type: getMatchType(id), rarity: gimmickRarity(id) },
      count: gimmickStock(state.cards, id),
      reserved: state.show.matches.filter(match => match.typeId === id).length,
      used: state.cards.used.matches[id] ?? 0,
      status: gimmickStock(state.cards, id) || state.show.matches.some(match => match.typeId === id) ? 'owned' : 'unowned',
    })),
    promos: Object.keys(PROMO_CARD_RARITY).map(id => ({
      card: { id, kind: 'promo', promo: getStorylineTemplate(id), rarity: promoCardRarity(id) },
      count: promoStock(state.cards, id),
      used: state.cards.used.promos[id] ?? 0,
      status: promoStock(state.cards, id) ? 'owned' : 'unowned',
    })),
  };
}

export function getPromoCardsForMatch(matchId, ownerId = null, partnerId = null) {
  const match = getMatch(matchId);
  if (!match || match.promoCardPlayed) return [];
  const participants = ownerId && partnerId
    ? [ownerId, partnerId]
    : matchParticipantIds(match).slice(0, 2);
  if (participants.some(id => !matchParticipantIds(match).includes(id))) return [];
  const wrestlersInPair = participants.map(getWrestlerById);
  const context = { ...promoEligibilityContext(match), ownerId: ownerId ?? participants[0] };
  const eligibleIds = new Set(eligibleTemplates(wrestlersInPair, context).map(template => template.id));
  const reservedElsewhere = Object.create(null);
  state.show.matches.forEach(other => {
    if (other.id === match.id || !other.promoCardId || other.promoCardPlayed) return;
    reservedElsewhere[other.promoCardId] = (reservedElsewhere[other.promoCardId] ?? 0) + 1;
  });
  return getPromoInventory()
    .filter(card => eligibleIds.has(card.id))
    .map(card => ({ ...card, available: card.count - (reservedElsewhere[card.id] ?? 0) }))
    .filter(card => card.available > 0);
}

export function getMatchPromoCard(matchId) {
  const match = getMatch(matchId);
  if (!match?.promoCardId) return null;
  const template = match.promoCardCustom ?? getStorylineTemplate(match.promoCardId);
  if (!template) return null;
  return {
    id: match.promoCardId,
    name: match.promoCardCustom?.title ?? template.name,
    description: match.promoCardCustom?.description ?? template.description.replace(/{company}/g, state.company.acronym),
    rarity: promoCardRarity(match.promoCardId),
    wrestlerId: match.promoCardWrestlerId,
    played: Boolean(match.promoCardPlayed),
    effect: match.promoCardEffect ?? null,
  };
}

export function setMatchPromoCard(matchId, promoId, wrestlerId, partnerId = null) {
  const match = getMatch(matchId);
  if (!match || match.promoCardPlayed) return { ok: false, message: 'This match promo has already been played.' };
  if (!promoId) {
    match.promoCardId = null;
    match.promoCardWrestlerId = null;
    match.promoCardPartnerId = null;
    match.promoCardCustom = null;
    persist();
    return { ok: true };
  }
  if (!matchParticipantIds(match).includes(wrestlerId)) return { ok: false, message: 'Choose a wrestler in this match.' };
  const partner = partnerId ?? matchParticipantIds(match).find(id => id !== wrestlerId);
  const card = getPromoCardsForMatch(matchId, wrestlerId, partner)
    .find(entry => entry.id === promoId);
  if (!card) return { ok: false, message: 'That Promo card is not in stock or does not fit this pairing.' };
  match.promoCardId = promoId;
  match.promoCardWrestlerId = wrestlerId;
  match.promoCardPartnerId = partner;
  match.promoCardCustom = null;
  match.promoCardEffect = null;
  persist();
  return { ok: true, card };
}

export function setCustomPromoCard(matchId, title, description, wrestlerId, partnerId = null) {
  const match = getMatch(matchId);
  if (!match || match.promoCardPlayed || !matchParticipantIds(match).includes(wrestlerId)) return false;
  const cleanTitle = String(title ?? '').trim().slice(0, 60);
  if (!cleanTitle) return false;
  const partner = partnerId ?? matchParticipantIds(match).find(id => id !== wrestlerId);
  const card = getPromoCardsForMatch(matchId, wrestlerId, partner).find(entry => entry.id === 'custom');
  if (!card) return false;
  match.promoCardId = 'custom';
  match.promoCardWrestlerId = wrestlerId;
  match.promoCardPartnerId = partner;
  match.promoCardCustom = { title: cleanTitle, description: String(description ?? '').trim().slice(0, 400) };
  match.promoCardEffect = null;
  persist();
  return true;
}

// null/'' means "let fate decide" (the default, honest simulation). A wrestlerId locks
// in that wrestler's side to win the booked finish — any id on their side works, since
// the whole side shares the call.
export function setMatchWinner(matchId, wrestlerId) {
  const match = getMatch(matchId);
  if (!match) return;
  match.winnerId = wrestlerId && matchParticipantIds(match).includes(wrestlerId) ? wrestlerId : null;
  persist();
}

export function runMonthlyPromoCardPhase(matchId, wrestlerId, { skip = false } = {}) {
  const match = getMatch(matchId);
  const selected = getMatchPromoCard(matchId);
  const wrestler = getWrestlerById(wrestlerId);
  if (!match || !wrestler || !matchParticipantIds(match).includes(wrestlerId)) {
    return { ok: false, message: 'Choose a wrestler in the booked match.' };
  }
  if (match.promoCardPlayed || state.leadUp.phaseResults?.promoCard) return { ok: false, message: 'This month\'s Promo phase has already been completed.' };

  if (skip || !selected) {
    if (skip) {
      const cleared = setMatchPromoCard(matchId, '', null);
      if (!cleared.ok) return cleared;
      match.promoCardEffect = null;
    }
    const result = { promoCardId: null, name: 'No Promo Card', wrestlerId, wrestlerName: wrestler.name, matchId, text: `${wrestler.name} had the week to themselves; no Promo card was played.` };
    state.leadUp.phaseResults = { ...state.leadUp.phaseResults, promoCard: result };
    state.leadUp.promoCardId = null;
    state.leadUp.spotlightId = wrestlerId;
    noteMicAppearance(wrestlerId);
    persist();
    return { ok: true, result };
  }

  if (match.promoCardId === 'custom' && !match.promoCardCustom?.title) {
    return { ok: false, message: 'Write a title for your Promo first.' };
  }
  if (!getPromoCardsForMatch(matchId, wrestlerId, match.promoCardPartnerId).some(card => card.id === match.promoCardId)) {
    return { ok: false, message: 'That Promo card no longer fits this pairing or is reserved elsewhere.' };
  }
  const rarity = match.promoCardId === 'custom' ? PROMO_CARD_RARITIES.rare : promoCardRarity(match.promoCardId);
  if (!rarity || !consumePromoCard(state.cards, match.promoCardId)) {
    return { ok: false, message: 'That Promo card is no longer in stock.' };
  }
  const effect = {
    matchBuzz: rollBetween(...rarity.matchBuzz),
    momentum: rollBetween(...rarity.momentum),
    popularity: rollBetween(...rarity.popularity),
      ...(match.promoCardId === 'number-one-spot' ? { contenderOnWin: true } : {}),
      ...(match.promoCardId === 'friendship-clause' ? { formsTagTeam: true } : {}),
  };

  wrestler.momentum = Math.max(-5, Math.min(5, (wrestler.momentum ?? 0) + effect.momentum));
  wrestler.popularity = Math.max(1, Math.min(100, wrestler.popularity + effect.popularity));
  snapshotWrestler(wrestler);
  match.promoCardWrestlerId = wrestlerId;
  match.promoCardEffect = { ...effect, wrestlerId };
  match.promoCardPlayed = true;
  state.cards.used.promos[match.promoCardId] = (state.cards.used.promos[match.promoCardId] ?? 0) + 1;
  noteMicAppearance(wrestlerId);

  const opponentId = match.promoCardPartnerId ?? matchParticipantIds(match).find(id => id !== wrestlerId);
  const template = match.promoCardCustom ? null : getStorylineTemplate(match.promoCardId);
  const result = {
    promoCardId: match.promoCardId,
    name: selected.name,
    rarity: selected.rarity?.name ?? 'Unique',
    wrestlerId,
    wrestlerName: wrestler.name,
    opponentId,
    opponentName: getWrestlerById(opponentId)?.name ?? 'their opponent',
    matchId,
    matchBuzz: effect.matchBuzz,
    momentum: effect.momentum,
    popularity: effect.popularity,
    text: match.promoCardCustom?.description || previewText(template, wrestler, getWrestlerById(opponentId), state.company),
  };
  state.leadUp.phaseResults = { ...state.leadUp.phaseResults, promoCard: result };
  state.leadUp.promoCardId = match.promoCardId;
  state.leadUp.spotlightId = wrestlerId;
  persist();
  return { ok: true, result };
}

function buildPromoHeatMap(wrestlerId) {
  const heatMap = {};
  (state.promoHistory ?? []).slice(0, 60).forEach(entry => {
    if (!entry.participantIds?.includes(wrestlerId)) return;
    entry.opponentIds?.forEach(id => {
      if (id === wrestlerId) return;
      heatMap[id] = (heatMap[id] || 0) + Math.max(1, entry.effects?.matchBuzz ?? 4);
    });
  });
  return heatMap;
}

function bookedOpponentFor(wrestlerId) {
  const match = state.show.matches.find(m => matchParticipantIds(m).includes(wrestlerId));
  if (!match) return null;
  return matchParticipantIds(match).find(id => id !== wrestlerId) || null;
}

// Cuts a Mad-Libs style promo: the target, setting, scenario, and pop meter are all
// generated (see promoEngine.js) — the player only picks the speaker and, optionally,
// pays a fee to bring a second wrestler onto the mic with them.
export function cutPromo(wrestlerId, partnerId = null) {
  if (!isSigned(wrestlerId)) return { ok: false, message: 'That wrestler is not signed.' };
  if (partnerId && (partnerId === wrestlerId || !isSigned(partnerId))) {
    return { ok: false, message: 'Pick a different signed wrestler to join the promo.' };
  }
  if (partnerId && state.bankroll < PROMO_PARTNER_FEE) {
    return { ok: false, message: `Not enough money to bring a partner onto the mic (needs $${PROMO_PARTNER_FEE.toLocaleString()}).` };
  }

  const wrestler = getWrestlerById(wrestlerId);
  const promo = generatePromo(wrestlerId, {
    bookedOpponentId: bookedOpponentFor(wrestlerId),
    roster: getSignedRoster(),
    heatMap: buildPromoHeatMap(wrestlerId),
    partnerId,
    companyName: state.company?.name || 'the company',
  });
  if (!promo) return { ok: false, message: 'Could not generate a promo for that wrestler.' };

  if (partnerId) state.bankroll -= PROMO_PARTNER_FEE;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const momentumShift = promo.popScore >= 75 ? 2 : promo.popScore >= 55 ? 1 : promo.popScore <= 25 ? -2 : promo.popScore <= 40 ? -1 : 0;
  wrestler.momentum = clamp((wrestler.momentum || 0) + momentumShift, -5, 5);
  wrestler.popularity = clamp(wrestler.popularity + Math.round((promo.popScore - 50) / 8), 1, 100);
  if (partnerId) {
    const partner = getWrestlerById(partnerId);
    if (partner) {
      partner.momentum = clamp((partner.momentum || 0) + Math.round(momentumShift / 2), -5, 5);
      partner.popularity = clamp(partner.popularity + Math.round((promo.popScore - 50) / 12), 1, 100);
    }
  }

  let promoHistoryEntry = null;
  if (promo.target?.type === 'wrestler') {
    const targetId = promo.target.id;
    const target = getWrestlerById(targetId);
    const participants = [...new Set([wrestlerId, targetId, partnerId].filter(Boolean))];
    promoHistoryEntry = recordPromoHistoryEntry({
      id: `live-promo-${state.showNumber}-${state.promoHistory.length}`,
      promoId: 'live-promo',
      promoName: promo.setting || 'Live Promo',
      rarity: 'Live',
      spotlightId: wrestlerId,
      participantIds: participants,
      opponentIds: participants.filter(id => id !== wrestlerId),
      showNumber: state.showNumber,
      showName: state.show.name,
      date: state.date,
      matchType: 'Live Promo',
      matchRating: 0,
      outcome: 'promo',
      winnerNames: [],
      text: `${wrestler.name}: ${promo.quote}`,
      effects: { popScore: promo.popScore },
    });
    if (target) snapshotWrestler(target);
  }

  persist();
  return { ok: true, promo, promoHistoryEntry, message: `${wrestler.name} cut a promo on ${promo.targetName} — pop meter hit ${promo.popScore}.` };
}

// ---------------------------------------------------------------------------
// Lead-up week
// ---------------------------------------------------------------------------
export function getLeadUp() {
  return state.leadUp;
}

export function isLeadUpDone() {
  return isBuildupDone(state.leadUp);
}

export function forecastLeadUpActivity(activityId, payload = {}) {
  const projection = getProjection();
  const wrestler = payload.wrestlerId ? getWrestlerById(payload.wrestlerId) : null;
  const bookedMatches = wrestler
    ? state.show.matches.filter(match => matchParticipantIds(match).includes(wrestler.id))
    : [];
  const promoMatch = payload.matchId ? getMatch(payload.matchId) : null;
  let ratingDelta = 0;
  let interestDelta = 0;
  let note = 'Long-term benefit; no reliable change to this PPV yet.';
  let uncertainty = 'Estimate only; the event can still overperform or miss.';

  if (activityId === 'train' && wrestler) {
    ratingDelta = bookedMatches.length ? 2 : 0;
    note = bookedMatches.length ? `${wrestler.name}'s expected in-ring performance improves.` : `${wrestler.name} is not booked on this PPV.`;
  } else if (activityId === 'media' && wrestler) {
    ratingDelta = bookedMatches.length ? 2 : 0;
    interestDelta = bookedMatches.length ? 5 : 1;
    note = bookedMatches.length ? `${wrestler.name}'s press week should lift demand for the card.` : 'Small company buzz now; larger value when this wrestler is booked.';
  } else if (activityId === 'rest' && wrestler) {
    const recovery = Math.min(50, 100 - staminaFor(wrestler.id));
    ratingDelta = bookedMatches.length && staminaFor(wrestler.id) < 75 ? Math.max(1, Math.min(5, Math.round(recovery / 12))) : 0;
    note = bookedMatches.length
      ? `${wrestler.name} should recover about ${recovery} stamina before the PPV.`
      : `${wrestler.name} is not booked, so this protects future months.`;
  } else if (activityId === 'bond' && wrestler) {
    ratingDelta = bookedMatches.length ? 1 : 0;
    note = bookedMatches.length ? `Better morale should help ${wrestler.name}'s PPV performance.` : 'Morale improves, but not this PPV card.';
  } else if (activityId === 'locker-room') {
    const allocations = payload.allocations ?? {};
    const bookedAttention = Object.entries(allocations).reduce((sum, [id, points]) =>
      sum + (state.show.matches.some(match => matchParticipantIds(match).includes(id)) ? points : 0), 0);
    ratingDelta = payload.spreadAll ? 1 : Math.min(3, bookedAttention);
    note = payload.spreadAll
      ? 'A roster meeting modestly improves morale and trust across the company.'
      : bookedAttention
        ? `${bookedAttention} attention point${bookedAttention === 1 ? '' : 's'} support talent booked on this PPV.`
        : 'Allocate attention to see which relationships can affect this PPV.';
  } else if (activityId === 'promo' && promoMatch) {
    const promoBuzz = promoMatch.promoCardEffect?.matchBuzz ?? 0;
    ratingDelta = promoBuzz ? Math.min(3, Math.round(promoBuzz / 8)) : 0;
    interestDelta = promoBuzz;
    note = promoBuzz ? `The played Promo card adds ${promoBuzz} hype to this booked match.` : 'A freeform mic promo builds the wrestler, but no Promo card is attached to this match.';
  } else if (activityId === 'promo' && payload.promoWrestlerId) {
    interestDelta = 2;
    note = 'Who gets called out is decided live — usually a booked opponent, sometimes an old rival, occasionally a total wildcard.';
    uncertainty = 'The pop meter swings with charisma, momentum, and history with whoever gets named.';
  } else if (activityId === 'scout' && payload.matchId) {
    note = 'Expected grade stays level, but the projection range narrows considerably.';
    uncertainty = 'Scouting reduces surprise; it does not make the wrestlers better.';
  } else if (activityId === 'family') {
    ratingDelta = state.gm.luck < 10 ? 1 : 0;
    note = 'Restores GM balance, repairs family relationships, and banks a small show-night luck boost.';
    uncertainty = 'Luck can improve execution, but never guarantees a stronger show.';
  } else if (activityId === 'house-show') {
    ratingDelta = -1;
    interestDelta = 2;
    note = 'Live reps can build interest, but anyone used on both cards reaches the PPV more tired.';
    uncertainty = 'High variance: development, fatigue, and injury depend on the house-show card.';
  } else if (activityId === 'side-hustle') {
    ratingDelta = -1;
    note = 'Three random wrestlers lose stamina; the PPV impact depends on who gets called.';
    uncertainty = 'High uncertainty because the crew is selected at random.';
  }

  const afterRating = Math.max(0, Math.min(100, projection.rating + ratingDelta));
  return {
    beforeGrade: projection.grade,
    afterGrade: gradeFor(afterRating),
    beforeRating: projection.rating,
    afterRating,
    interestBefore: projection.cardBuzz,
    interestAfter: projection.cardBuzz + interestDelta,
    ratingDelta,
    interestDelta,
    note,
    uncertainty,
  };
}

export function skipLeadUpWeek() {
  const result = skipWeek(state.leadUp);
  if (result.ok) {
    handleFamilyActivity('skip', 1);
    persist();
  }
  return result;
}

export function jumpToPPV() {
  const result = jumpToEvent(state.leadUp);
  if (result.ok) {
    handleFamilyActivity('skip', result.skippedWeeks ?? 1);
    const randomEvent = state.leadUp.randomEvent;
    if (randomEvent && !randomEvent.resolved) {
      randomEvent.resolved = true;
      randomEvent.seen = true;
      randomEvent.skipped = true;
      randomEvent.result = null;
    }
    persist();
  }
  return result;
}

// ---------------------------------------------------------------------------
// Monthly random event — one "chance card" per month, after the story promo.
// ---------------------------------------------------------------------------
const rollBetween = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const STAT_LABELS = { strength: 'STR', agility: 'AGI', stamina: 'STA', technique: 'TEC', charisma: 'CHA', toughness: 'TGH' };

export function getRandomEvent() {
  return state.leadUp.randomEvent ?? null;
}

function randomEventDate(offset) {
  const date = new Date(`${state.show.date || state.date}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

const rangeRoll = range => rollBetween(range[0], range[1]);
const signedLabel = (label, value) => `${label} ${value >= 0 ? '+' : ''}${value}`;

function hasPromoForWrestlerThisShow(id) {
  return state.show.matches.some(match => match.promoCardPlayed && match.promoCardWrestlerId === id);
}

// Finds who a card is about, or null when nobody on the roster fits it this month.
function castRandomEvent(card, roster, bookedIds) {
  const favourBooked = list => {
    const booked = list.filter(w => bookedIds.has(w.id));
    return pickOne(booked.length && Math.random() < 0.6 ? booked : list);
  };
  if (card.needs === 'hasStory') {
    const promos = state.show.matches.filter(match => match.promoCardPlayed && match.promoCardId && matchParticipantIds(match).length >= 2);
    const onCard = promos.filter(match => matchParticipantIds(match).some(id => bookedIds.has(id)));
    const match = pickOne(onCard.length ? onCard : promos);
    if (!match) return null;
    const [aId, bId] = [match.promoCardWrestlerId, ...matchParticipantIds(match).filter(id => id !== match.promoCardWrestlerId)];
    const a = getWrestlerById(aId);
    const b = getWrestlerById(bId);
    return a && b ? { a, b, angle: match } : null;
  }
  if (card.needs === 'noStory') {
    const free = roster.filter(w => !hasPromoForWrestlerThisShow(w.id));
    if (!free.length) return null;
    const a = favourBooked(free);
    const others = roster.filter(w => w.id !== a.id);
    const freeOthers = others.filter(w => !hasPromoForWrestlerThisShow(w.id));
    const b = pickOne(freeOthers.length ? freeOthers : others);
    return b ? { a, b } : null;
  }
  const a = favourBooked(roster);
  if (!a) return null;
  if (card.needs !== 'pair') return { a };
  const b = pickOne(roster.filter(w => w.id !== a.id));
  return b ? { a, b } : null;
}

function applyRandomEventEffect(card, { a, b, angle }, date) {
  const effect = card.effect ?? {};
  const fill = text => text.replaceAll('{a}', a.name).replaceAll('{b}', b?.name ?? '');
  const effects = [];
  const shiftStats = ([count, min, max], direction) => {
    ['strength', 'agility', 'technique', 'toughness', 'charisma'].sort(() => Math.random() - 0.5).slice(0, count).forEach(stat => {
      const amount = rollBetween(min, max) * direction;
      a.stats[stat] = Math.max(1, Math.min(99, a.stats[stat] + amount));
      effects.push(signedLabel(STAT_LABELS[stat], amount));
    });
  };
  if (effect.statDrop) shiftStats(effect.statDrop, -1);
  if (effect.statGain) shiftStats(effect.statGain, 1);
  if (effect.stamina) {
    const amount = rangeRoll(effect.stamina);
    state.stamina[a.id] = Math.max(0, Math.min(100, staminaFor(a.id) + amount));
    effects.push(signedLabel('Stamina', amount));
  }
  if (effect.staminaB && b) {
    const amount = rangeRoll(effect.staminaB);
    state.stamina[b.id] = Math.max(0, Math.min(100, staminaFor(b.id) + amount));
    effects.push(signedLabel(`${b.name} stamina`, amount));
  }
  if (effect.morale) {
    const amount = rangeRoll(effect.morale);
    adjustMorale(a.id, amount);
    effects.push(signedLabel(`${a.name} satisfaction`, amount));
  }
  if (effect.moraleB && b) {
    const amount = rangeRoll(effect.moraleB);
    adjustMorale(b.id, amount);
    effects.push(signedLabel(`${b.name} satisfaction`, amount));
  }
  if (effect.pop) {
    const amount = rangeRoll(effect.pop);
    a.popularity = Math.max(1, Math.min(100, a.popularity + amount));
    effects.push(signedLabel('Popularity', amount));
  }
  if (effect.popB && b) {
    const amount = rangeRoll(effect.popB);
    b.popularity = Math.max(1, Math.min(100, b.popularity + amount));
    effects.push(signedLabel(`${b.name} popularity`, amount));
  }
  if (effect.momentum) {
    const before = a.momentum ?? 0;
    a.momentum = Math.max(-5, Math.min(5, (a.momentum ?? 0) + effect.momentum));
    effects.push(signedLabel(`${a.name} momentum`, a.momentum - before));
  }
  if (effect.momentumB && b) {
    const before = b.momentum ?? 0;
    b.momentum = Math.max(-5, Math.min(5, before + effect.momentumB));
    effects.push(signedLabel(`${b.name} momentum`, b.momentum - before));
  }
  if (effect.cash) {
    const amount = Math.round(rangeRoll(effect.cash) / 100) * 100;
    state.bankroll += amount;
    effects.push(`${amount >= 0 ? '+' : '-'}$${Math.abs(amount).toLocaleString()}`);
  }
  if (effect.storyHeat && angle) {
    const amount = rangeRoll(effect.storyHeat);
    angle.promoCardEffect ??= { matchBuzz: 0, momentum: 0, popularity: 0, wrestlerId: angle.promoCardWrestlerId };
    angle.promoCardEffect.matchBuzz += amount;
    effects.push(`${getMatchPromoCard(angle.id)?.name ?? 'Promo'} match hype +${amount}`);
  }
  if (effect.story && b) {
    const description = fill(effect.story.description);
    state.promoHistory.unshift({
      id: `event-promo-${state.showNumber}-${card.id}`,
      promoId: `event:${card.id}`,
      promoName: effect.story.title,
      rarity: 'Random Event',
      spotlightId: a.id,
      participantIds: [a.id, b.id],
      opponentIds: [b.id],
      showNumber: state.showNumber,
      showName: state.show.name,
      date,
      matchType: 'Random Event',
      matchRating: 0,
      outcome: 'event',
      winnerNames: [],
      text: description,
      effects: {},
    });
    state.promoHistory = state.promoHistory.slice(0, 500);
    effects.push(`Profile Promo: ${effect.story.title}`);
  }
  snapshotWrestler(a);
  if (b) snapshotWrestler(b);
  return effects;
}

function recordRandomEvent(result) {
  if (!result) return;
  state.randomEventHistory ??= [];
  const id = `random-event-${state.showNumber}-${result.id}`;
  if (state.randomEventHistory.some(event => event.id === id)) return;
  state.randomEventHistory.unshift({ ...result, id, eventId: result.id, showNumber: state.showNumber, showName: state.show.name });
  state.randomEventHistory = state.randomEventHistory.slice(0, CAMPAIGN_SHOWS);
}

export function resolveRandomEvent() {
  const event = state.leadUp.randomEvent;
  if (!event || event.resolved) {
    recordRandomEvent(event?.result);
    return event?.result ?? null;
  }
  const roster = getSignedRoster();
  const bookedIds = new Set((state.show.matches ?? []).flatMap(matchParticipantIds));
  const date = randomEventDate(event.offset);
  let result = null;
  for (let attempt = 0; attempt < 25 && !result && roster.length >= 2; attempt += 1) {
    const card = pickOne(RANDOM_EVENT_CARDS);
    const cast = castRandomEvent(card, roster, bookedIds);
    if (!cast?.a) continue;
    const effects = applyRandomEventEffect(card, cast, date);
    result = {
      id: card.id,
      kind: card.kind,
      title: card.title,
      body: card.text.replaceAll('{a}', cast.a.name).replaceAll('{b}', cast.b?.name ?? ''),
      effects,
      wrestlerIds: [cast.a.id, cast.b?.id].filter(Boolean),
      date,
    };
  }
  event.resolved = true;
  event.seen = !result;
  event.result = result;
  recordRandomEvent(result);
  persist();
  return result;
}

export function dismissRandomEvent() {
  if (state.leadUp.randomEvent) state.leadUp.randomEvent.seen = true;
  persist();
}

function currentLeadUpActivityDate() {
  const daysBeforePpv = [20, 13, 6][Math.max(0, Math.min(2, state.leadUp.week - 1))] ?? 20;
  const date = new Date(`${state.show.date || state.date}T12:00:00`);
  date.setDate(date.getDate() - daysBeforePpv);
  return date.toISOString().slice(0, 10);
}

// payload: wrestlerId, stat, matchId, or activity-specific Promo options.
export function spendLeadUpActivity(activityId, payload = {}) {
  const activityDate = currentLeadUpActivityDate();
  const ctx = {
    wrestler: payload.wrestlerId ? getWrestlerById(payload.wrestlerId) : null,
    stat: payload.stat,
    match: payload.matchId ? getMatch(payload.matchId) : null,
    promoWrestler: payload.promoWrestlerId ? getWrestlerById(payload.promoWrestlerId) : null,
    promoPartner: payload.promoPartnerId ? getWrestlerById(payload.promoPartnerId) : null,
    staminaState: state.stamina,
    injuryState: state.injuries,
    moraleState: state.morale,
    relationshipsState: state.relationships,
    gmState: state.gm,
    roster: getSignedRoster(),
    allocations: payload.allocations ?? {},
    spreadAll: Boolean(payload.spreadAll),
    showNumber: state.showNumber,
    date: activityDate,
    getWrestlerById,
    cutPromo: (id, partnerId) => cutPromo(id, partnerId),
    freeAgentInterest: state.draft.freeAgentInterest,
    conversationBonus: payload.conversationBonus ?? 0,
    blackjackBonus: payload.blackjackBonus ?? 0,
    handsPlayed: payload.handsPlayed ?? 0,
    bankroll: state.bankroll,
    spendMoney: amount => { state.bankroll -= amount; },
    earnMoney: amount => { state.bankroll += amount; },
    signWrestler: id => finalizeFreeAgentSigning(id),
    runHouseShow: () => runHouseShow(payload.houseCard, activityDate),
  };
  const result = applyActivity(state.leadUp, activityId, ctx);
  if (result.ok) {
    handleFamilyActivity(activityId, 1);
    persist();
  }
  return result;
}

function rollTrainingGain() {
  const roll = Math.random();
  if (roll < 0.03) return 5;
  return roll < 0.515 ? 2 : 3;
}

export function runMonthlyTrainingPhase(ids) {
  if (state.leadUp.planned || state.leadUp.phaseResults?.training) return { ok: false, message: 'Training is already complete this month.' };
  if (!Array.isArray(ids) || ids.length !== 1) return { ok: false, message: 'Choose exactly one wrestler.' };
  const wrestler = getSignedRoster().find(candidate => candidate.id === ids[0]);
  if (!wrestler) return { ok: false, message: 'Choose a wrestler from your signed roster.' };
  const stats = ['strength', 'agility', 'stamina', 'technique', 'charisma', 'toughness'];
  const available = stats.filter(stat => wrestler.stats[stat] < 99);
  if (available.length < 3) return { ok: false, message: 'Choose a wrestler with at least three attributes below 99.' };
  for (let index = 0; index < 3; index += 1) {
    const pick = index + Math.floor(Math.random() * (available.length - index));
    [available[index], available[pick]] = [available[pick], available[index]];
  }
  const selected = available.slice(0, 3);
  const gain = rollTrainingGain();
  const gains = Object.fromEntries(selected.map(stat => {
    const actualGain = Math.min(gain, 99 - wrestler.stats[stat]);
    wrestler.stats[stat] += actualGain;
    return [stat, actualGain];
  }));
  const results = [{ name: wrestler.name, gain, stats: selected, gains, breakthrough: gain === 5 }];
  state.leadUp.phaseResults = { ...state.leadUp.phaseResults, training: results };
  persist();
  return { ok: true, results };
}

// ---------------------------------------------------------------------------
// The mic: one wrestler a month advances their story, win or lose in the ring.
// ---------------------------------------------------------------------------

// Risk the player can read and manage rather than a flat invisible roll: ego, weak mic
// skills, and going back to the same well month after month are what get you booed out
// of the building.
export function micBackfireChance(wrestlerId) {
  const wrestler = getWrestlerById(wrestlerId);
  if (!wrestler) return 0;
  const ego = wrestler.hidden?.ego ?? 50;
  const charisma = wrestler.stats?.charisma ?? 50;
  const streak = state.micHistory[wrestlerId]?.streak ?? 0;
  const raw = 4
    + Math.max(0, Math.min(5, (ego - 50) / 10))
    + Math.max(0, Math.min(4, (50 - charisma) / 10))
    + streak * 2
    - (state.gm.luck ?? 0) * 0.3;
  return Math.round(Math.max(1, Math.min(10, raw)));
}

function noteMicAppearance(wrestlerId) {
  Object.keys(state.micHistory).forEach(id => {
    const entry = state.micHistory[id];
    if (id !== wrestlerId && entry.lastShow < state.showNumber - 1) entry.streak = 0;
  });
  const previous = state.micHistory[wrestlerId];
  const consecutive = previous && previous.lastShow === state.showNumber - 1;
  state.micHistory[wrestlerId] = {
    lastShow: state.showNumber,
    streak: consecutive ? (previous.streak ?? 0) + 1 : 1,
  };
}

export function completeMonthlyPlan() {
  const familyPoints = state.leadUp.allocations?.family ?? 30;
  const recovery = Math.max(0, Math.round(familyPoints * 0.45));
  getSignedRoster().forEach(wrestler => {
    const current = state.stamina[wrestler.id] ?? 100;
    state.stamina[wrestler.id] = Math.max(0, Math.min(100, current + (familyPoints < 15 ? -(5 + Math.floor(Math.random() * 6)) : recovery)));
  });
  handleFamilyActivity(familyPoints >= 15 ? 'family' : 'skip', 1);
  state.leadUp.planned = true;
  persist();
  return { ok: true, message: 'Monthly plan complete. The rest of the month plays out on the calendar.' };
}

function normalizeHouseShowMatch(match, index) {
  const typeId = ['singles', 'tag-team', 'triple-threat', 'submission', 'lumberjack'].includes(match.typeId) ? match.typeId : 'singles';
  const type = getMatchType(typeId);
  const teams = type?.slots.teams
    ? match.teams.map(team => team.filter(Boolean))
    : (match.teams || []).flat().filter(Boolean).map(id => [id]);
  return {
    id: `house-${state.showNumber}-${Date.now()}-${index}`,
    typeId,
    stakeId: 'none', titleId: null, lengthId: 'standard',
    teams,
    entrances: teams.map(() => 'standard'), extras: [], celebrityId: 'none', promoCardId: null, promoCardWrestlerId: null, promoCardEffect: null, promoCardPlayed: false, scouted: false,
  };
}

function runHouseShow(card = null, date = state.date) {
  const roster = getSignedRoster();
  if (roster.length < 6) return { ok: false, message: 'You need at least six signed wrestlers to run a three-match house show.' };
  const matches = (card?.matches || []).slice(0, 3).map(normalizeHouseShowMatch);
  if (matches.length !== 3) return { ok: false, message: 'Book exactly three house-show matches first.' };
  const allIds = matches.flatMap(matchParticipantIds);
  if (allIds.length < 6 || new Set(allIds).size !== allIds.length) return { ok: false, message: 'House shows need three complete matches with no duplicate wrestlers.' };
  const venue = venues[0];
  const stage = getStagePackage('bare');
  const projections = [];
  const results = matches.map((match, index) => {
    const projection = projectMatch(match, {
      venue, stage, isMainEvent: index === matches.length - 1, position: index, cardSize: matches.length,
      staminaLookup: staminaFor, moraleLookup: moraleFor, titles: state.titles, teams: state.teams,
    });
    projection.quality.low = Math.max(0, projection.quality.low - 6);
    projection.quality.expected = Math.max(5, projection.quality.expected - 3);
    projection.quality.high = Math.min(100, projection.quality.high + 3);
    projection.injuryRisk = Math.min(60, projection.injuryRisk + 8);
    projection.drain += 9;
    projections[index] = projection;
    return simulateMatch(match, projection, {
      staminaLookup: staminaFor, isMainEvent: index === matches.length - 1, position: index, total: matches.length,
    });
  });
  const eventCost = 12000 + results.reduce((sum, result) => sum + result.cost, 0);
  const revenue = Math.round(1200 + results.reduce((sum, result) => sum + result.rating, 0) * 22);
  const profit = revenue - eventCost;
  state.bankroll += profit;
  results.forEach((result, index) => {
    result.effects.forEach(effect => {
      const wrestler = getWrestlerById(effect.id);
      if (!wrestler) return;
      if (effect.resultCode === 'W') wrestler.record.w += 1;
      else if (effect.resultCode === 'L') wrestler.record.l += 1;
      const developmentRoll = Math.random();
      const popGain = developmentRoll < 0.45 || developmentRoll >= 0.85 ? 1 + (Math.random() < 0.2 ? 1 : 0) : 0;
      const skillGains = [];
      if (developmentRoll >= 0.45) {
        const stats = ['strength', 'agility', 'stamina', 'technique', 'charisma', 'toughness'];
        const stat = stats[Math.floor(Math.random() * stats.length)];
        const gain = Math.random() < 0.15 ? 2 : 1;
        wrestler.stats[stat] = Math.min(99, wrestler.stats[stat] + gain);
        skillGains.push({ stat, gain });
      }
      wrestler.popularity = Math.min(100, wrestler.popularity + popGain);
      wrestler.momentum = Math.max(-5, Math.min(5, wrestler.momentum + effect.momentumDelta));
      effect.popDelta = popGain;
      effect.skillGains = skillGains;
      const drain = projections[index]?.drain ?? 18;
      state.stamina[wrestler.id] = Math.max(8, staminaFor(wrestler.id) - drain);
      snapshotWrestler(wrestler);
    });
    if (result.injury) state.injuries[result.injury.id] = result.injury.weeks;
  });
  const rating = Math.round(results.reduce((sum, result) => sum + result.rating, 0) / results.length);
  const houseShow = {
    id: `house-show-${state.showNumber}-${Date.now()}`, date, rating, profit, revenue, costs: eventCost,
    matches: results.map((result, index) => ({
      label: index === results.length - 1 ? 'MAIN EVENT' : index === 0 ? 'OPENER' : 'MATCH 2',
      typeId: result.typeId, typeName: result.typeName, participantIds: result.participantIds, winnerIds: result.winnerIds,
      rating: result.rating, stars: result.stars, outcome: result.outcome, sideNames: result.sideNames,
      winnerNames: result.winnerNames, loserNames: result.loserNames, finish: result.finish, crowd: result.crowd,
      effects: result.effects, injury: result.injury,
    })),
  };
  const homeVenue = venues.find(venue => venue.city === state.company.homeCity) ?? venues[0];
  houseShow.city = homeVenue.city;
  houseShow.marketGrowth = updateMarketHype(state.marketHype, homeVenue, houseShow, { localOnly: true });
  state.houseShows.unshift(houseShow);
  state.houseShows = state.houseShows.slice(0, 24);
  updateHouseShowCareer(state, houseShow);
  return { ok: true, houseShow, calendarLabel: 'House Show', message: `House show complete: ${rating} average rating, ${profit < 0 ? '-' : '+'}$${Math.abs(profit).toLocaleString()}.` };
}

// A free agent's first act on the roster is a debut arrival promo — team player,
// cocky dominator, calling someone out, or riffing on the league's own history. Runs
// once per signing regardless of which path (courting session or blackjack) closed it.
function finalizeFreeAgentSigning(wrestlerId) {
  if (!state.draft.signedIds.includes(wrestlerId)) state.draft.signedIds.push(wrestlerId);
  state.signedShows[wrestlerId] = state.showNumber;
  const wrestler = getWrestlerById(wrestlerId);
  if (!wrestler) return;

  const worldTitle = state.titles.world;
  const championId = worldTitle?.holders?.[0] ?? null;
  const championName = championId ? getWrestlerById(championId)?.name : null;
  const championCount = worldTitle ? (worldTitle.history?.length ?? 0) + (worldTitle.holders?.length ? 1 : 0) : 0;

  const arrival = generateArrivalPromo(wrestlerId, {
    roster: getSignedRoster().filter(w => w.id !== wrestlerId),
    companyName: state.company?.name || 'the company',
    founderTitle: state.company?.named ? `the founder of ${state.company.name}` : 'the founder of this company',
    championName,
    championCount,
    showsRun: state.career.showsRun,
  });
  if (!arrival) return;

  state.accolades[wrestlerId] = state.accolades[wrestlerId] ?? [];
  state.accolades[wrestlerId].push(`Debut promo: ${arrival.quote}`);

  state.family.emailSeq += 1;
  const emailId = `arrival-${state.family.emailSeq}`;
  state.inbox.dynamic = state.inbox.dynamic ?? [];
  state.inbox.dynamic.push({
    id: emailId,
    from: 'TALENT RELATIONS',
    address: 'talent@rivalpromotion.com',
    subject: `${wrestler.name} just signed`,
    date: state.date,
    body: [
      `${wrestler.name} is officially on the roster. First thing out of their mouth on the way through the door:`,
      arrival.quote,
    ],
  });
}

export function getFreeAgents() {
  const signed = new Set(state.draft.signedIds);
  return wrestlers
    .filter(w => hasDebuted(w, state.showNumber) && !signed.has(w.id) && !w.retired && !w.deceased && getDraftTier(w) !== 'celebrity')
    .map(w => ({ wrestler: w, carryover: state.cards.carryover[w.id] ?? 0 }))
    .sort((a, b) => b.wrestler.popularity - a.wrestler.popularity);
}

// ---------------------------------------------------------------------------
// Chips
// ---------------------------------------------------------------------------

export function getChips() {
  return state.cards.chips ?? 0;
}

function awardChips(rating) {
  const earned = chipsForShowRating(rating);
  state.cards.chips = (state.cards.chips ?? 0) + earned;
  return earned;
}

// ---------------------------------------------------------------------------
// January free agency - the board, the roulette, the pull
// ---------------------------------------------------------------------------

export function currentYear() {
  return Math.floor((state.showNumber - 1) / 12) + 1;
}

function averageRatingForYear(year) {
  const firstShow = (year - 1) * 12 + 1;
  const shows = state.archive.filter(show => show.showNumber >= firstShow && show.showNumber < firstShow + 12);
  if (!shows.length) return 0;
  return shows.reduce((sum, show) => sum + (show.rating ?? 0), 0) / shows.length;
}

export function isAnnualPullDue() {
  return false;
}

export function openAnnualPull() {
  if (!isAnnualPullDue()) return null;
  const year = currentYear();
  if (state.cards.annual?.year === year) return getAnnualPull();
  const lastYearRating = averageRatingForYear(year - 1);
  const pulls = ANNUAL_PULLS + (lastYearRating >= BONUS_PULL_RATING ? ANNUAL_BONUS_PULL : 0);
  state.cards.annual = {
    year,
    board: buildAnnualBoard(getFreeAgents().map(entry => entry.wrestler), {
      getTier: getDraftTier,
      carryover: state.cards.carryover,
    }),
    bets: {},
    pulls,
    bonusEarned: lastYearRating >= BONUS_PULL_RATING,
    lastYearRating: Math.round(lastYearRating),
    drawn: [],
    gimmicks: [],
    complete: false,
  };
  persist();
  return getAnnualPull();
}

export function getAnnualPull() {
  const annual = state.cards.annual;
  if (!annual) return null;
  const odds = boardOdds(annual.board, annual.bets);
  return {
    ...annual,
    chipsAvailable: getChips() - totalChipsBet(annual.bets),
    board: annual.board.map(card => {
      const entry = odds.find(o => o.id === card.id);
      return {
        ...card,
        wrestler: getWrestlerById(card.id),
        chips: annual.bets[card.id] ?? 0,
        probability: entry?.probability ?? 0,
      };
    }),
    drawn: annual.drawn.map(id => getWrestlerById(id)).filter(Boolean),
  };
}

export function placeChip(wrestlerId, delta = 1) {
  const annual = state.cards.annual;
  if (!annual || annual.complete) return { ok: false, message: 'The board is closed.' };
  if (!annual.board.some(card => card.id === wrestlerId)) return { ok: false, message: 'That name is not on the board.' };
  const current = annual.bets[wrestlerId] ?? 0;
  const next = current + delta;
  if (next < 0) return { ok: false, message: 'No chips there to take back.' };
  if (delta > 0 && getChips() - totalChipsBet(annual.bets) < delta) return { ok: false, message: 'Out of chips.' };
  if (next === 0) delete annual.bets[wrestlerId];
  else annual.bets[wrestlerId] = next;
  persist();
  return { ok: true };
}

export function clearChips() {
  const annual = state.cards.annual;
  if (!annual || annual.complete) return { ok: false, message: 'The board is closed.' };
  annual.bets = {};
  persist();
  return { ok: true };
}

export function runAnnualPull() {
  if (!isAnnualPullDue()) return { ok: false, message: 'Annual rewards are now two free Free Agent Packs in the Lounge.' };
  const annual = state.cards.annual;
  if (!annual) return { ok: false, message: 'No board is open.' };
  if (annual.complete) return { ok: false, message: 'Already pulled for this year.' };

  const spent = totalChipsBet(annual.bets);
  const { drawn } = pullFromBoard(annual.board, annual.bets, annual.pulls);
  const drawnIds = drawn.map(card => card.id);
  annual.chipsSpent = spent;

  state.cards.chips = Math.max(0, getChips() - spent);
  state.cards.carryover = carryoverFromBets(annual.board, annual.bets, drawnIds, state.cards.carryover);

  // Room on the roster means they just sign. Once you are full, each one becomes a
  // decision the player has to make one at a time.
  const signedNow = [];
  drawnIds.forEach(id => {
    if (state.draft.signedIds.length < ROSTER_CAP) {
      finalizeFreeAgentSigning(id);
      signedNow.push(id);
    } else {
      queueForIntake(id);
    }
  });

  const gimmicks = rollGimmickPack(ANNUAL_GIMMICK_PACK);
  const promos = rollPromoPack(ANNUAL_PROMO_PACK, { cycles: state.cards.promoDrawCycles });
  addGimmickCards(state.cards, gimmicks);
  addPromoCards(state.cards, promos);
  state.cards.gimmickLog = [{ year: annual.year, cards: gimmicks }, ...(state.cards.gimmickLog ?? [])].slice(0, 12);
  state.cards.promoLog = [{ year: annual.year, cards: promos }, ...(state.cards.promoLog ?? [])].slice(0, 12);

  annual.drawn = drawnIds;
  annual.signed = signedNow;
  annual.passed = [];
  annual.gimmicks = gimmicks;
  annual.promos = promos;
  annual.complete = true;
  // One pack: the wrestlers and the stipulations come out together.
  annual.reveal = {
    cards: [
      ...drawnIds.map(id => ({ kind: 'wrestler', id })),
      ...gimmicks.map(id => ({ kind: 'gimmick', id })),
      ...promos.map(id => ({ kind: 'promo', id })),
    ],
    revealed: [],
    seen: false,
  };
  state.cards.history = [{ year: annual.year, drawn: drawnIds, gimmicks, promos, chipsSpent: spent }, ...(state.cards.history ?? [])].slice(0, 20);
  persist();
  return { ok: true, chipsSpent: spent };
}

export function getAnnualReveal() {
  const annual = state.cards.annual;
  if (!annual?.reveal || annual.reveal.seen) return null;
  return {
    ...annual.reveal,
    year: annual.year,
    chipsSpent: annual.chipsSpent ?? 0,
    queued: state.cards.intakeQueue?.length ?? 0,
    cards: annual.reveal.cards.map(card => decorateCard(card)),
  };
}

export function revealAnnualCard(index) {
  const reveal = state.cards.annual?.reveal;
  if (!reveal || index == null || reveal.revealed.includes(index)) return { ok: false };
  reveal.revealed = [...reveal.revealed, index];
  persist();
  return { ok: true };
}

export function revealAllAnnualCards() {
  const reveal = state.cards.annual?.reveal;
  if (!reveal) return { ok: false };
  reveal.revealed = reveal.cards.map((_, index) => index);
  persist();
  return { ok: true };
}

export function dismissAnnualReveal() {
  const reveal = state.cards.annual?.reveal;
  if (reveal) reveal.seen = true;
  persist();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Roster intake — the trade you make when you are already full
// ---------------------------------------------------------------------------

function queueForIntake(wrestlerId) {
  state.cards.intakeQueue = [...(state.cards.intakeQueue ?? []), wrestlerId];
}

export function getRosterIntake() {
  const queue = state.cards.intakeQueue ?? [];
  if (!queue.length) return null;
  const wrestler = getWrestlerById(queue[0]);
  if (!wrestler) return null;
  return {
    wrestler,
    tier: getDraftTier(wrestler),
    remaining: queue.length,
    rosterSize: state.draft.signedIds.length,
    cap: ROSTER_CAP,
    // Least-used first: the suggestion is a mirror of your own booking, not a rating sort.
    candidates: getSignedRoster()
      .map(w => ({
        wrestler: w,
        usage: usageFor(w.id),
        age: calculateAge(w.dob, state.date),
        champion: Object.values(state.titles).some(title => title.holders?.includes(w.id)),
      }))
      .filter(entry => !entry.champion)
      .sort((a, b) => a.usage - b.usage || b.age - a.age),
  };
}

export function passOnDrawnWrestler() {
  const queue = state.cards.intakeQueue ?? [];
  if (!queue.length) return { ok: false, message: 'Nobody is waiting on a decision.' };
  const [id, ...rest] = queue;
  state.cards.intakeQueue = rest;
  // Passing still counts as pursuit — they remember the interest next January.
  state.cards.carryover[id] = Math.min(6, (state.cards.carryover[id] ?? 0) + 1);
  persist();
  return { ok: true, wrestler: getWrestlerById(id) };
}

export function acceptDrawnWrestler(retireId) {
  const queue = state.cards.intakeQueue ?? [];
  if (!queue.length) return { ok: false, message: 'Nobody is waiting on a decision.' };
  const retiree = getWrestlerById(retireId);
  if (!retiree) return { ok: false, message: 'Pick whose career ends.' };
  if (!state.draft.signedIds.includes(retireId)) return { ok: false, message: 'Not on your roster.' };
  if (Object.values(state.titles).some(title => title.holders?.includes(retireId))) {
    return { ok: false, message: 'Take the title off them first.' };
  }
  const result = forceRetire(retireId);
  if (!result.ok) return result;
  const [id, ...rest] = queue;
  state.cards.intakeQueue = rest;
  finalizeFreeAgentSigning(id);
  persist();
  return { ok: true, signed: getWrestlerById(id), retired: retiree };
}

// A career ending should be an event, not a log line.
export function forceRetire(wrestlerId) {
  const wrestler = getWrestlerById(wrestlerId);
  if (!wrestler) return { ok: false, message: 'Unknown wrestler.' };
  const age = calculateAge(wrestler.dob, state.date);
  wrestler.retired = true;
  state.draft.signedIds = state.draft.signedIds.filter(id => id !== wrestlerId);
  state.teams.forEach(team => {
    team.memberIds = team.memberIds.filter(id => id !== wrestlerId);
    if (team.memberIds.length < 2) team.active = false;
  });
  (state.show.matches ?? []).forEach(match => {
    match.teams = match.teams.map(side => side.filter(id => id !== wrestlerId));
  });
  state.retirees.unshift({ id: wrestlerId, name: wrestler.name, age, finalRecord: { ...wrestler.record }, reason: 'forced' });
  state.accolades[wrestlerId] = state.accolades[wrestlerId] ?? [];
  state.accolades[wrestlerId].push(`Retired at age ${age} — career record ${wrestler.record.w}-${wrestler.record.l}`);

  state.family.emailSeq += 1;
  state.inbox.dynamic = state.inbox.dynamic ?? [];
  state.inbox.dynamic.push({
    id: `retire-${state.family.emailSeq}`,
    from: 'TALENT RELATIONS',
    address: 'talent@rivalpromotion.com',
    subject: `${wrestler.name} is hanging them up`,
    date: state.date,
    body: [
      `${wrestler.name} is done. ${age} years old, ${wrestler.record.w}-${wrestler.record.l} across ${state.company?.name || 'the company'}.`,
      wrestler.popularity >= 60
        ? 'There are people who have never bought a ticket to see anyone else. We should send them out properly.'
        : 'Quiet exit. Not everybody gets a retirement tour.',
    ],
  });
  persist();
  return { ok: true, wrestler, age };
}

// ---------------------------------------------------------------------------
// Gimmick match cards
// ---------------------------------------------------------------------------

export function getGimmickInventory() {
  return Object.entries(state.cards.gimmicks ?? {})
    .map(([id, count]) => ({
      id,
      count,
      name: getMatchType(id)?.name ?? id,
      rarity: gimmickRarity(id),
      type: getMatchType(id),
    }))
    .filter(entry => entry.type)
    .sort((a, b) => (b.rarity?.buzzBonus ?? 0) - (a.rarity?.buzzBonus ?? 0) || a.name.localeCompare(b.name));
}

export function canBookMatchType(typeId, currentTypeId = null) {
  const type = getMatchType(typeId);
  if (!type) return false;
  if (gimmickCardRequired(typeId)) {
    if (typeId === currentTypeId) return true;
    return gimmickStock(state.cards, typeId) > 0;
  }
  if (getGMLevel() < (type.unlockLevel ?? 1)) return false;
  return true;
}

export function gimmickStockFor(typeId) {
  return gimmickStock(state.cards, typeId);
}

// ---------------------------------------------------------------------------
// Lounge packs and tutorial rewards
// ---------------------------------------------------------------------------

export function getCribPacks() {
  return Object.values(CRIB_PACKS).sort((first, second) => first.cost - second.cost).map(pack => ({
    ...pack,
    affordable: state.bankroll >= pack.cost,
    soldOut: Boolean(pack.wrestlers && !pack.customWrestler && !packFreeAgents().length),
  }));
}

export function getTutorialPacks() {
  const annualRewards = [];
  const completedYears = Math.floor(state.career.showsRun / 12);
  for (let year = 1; year <= completedYears; year += 1) {
    const previouslyAwarded = state.cards.history.some(entry => entry.year === year + 1)
      || (state.cards.annual?.year === year + 1 && state.cards.annual.complete);
    if (previouslyAwarded) continue;
    for (let packNumber = 1; packNumber <= 2; packNumber += 1) {
      annualRewards.push({
        id: `year-end-free-agent-${year}-${packNumber}`,
        afterShow: year * 12,
        kind: 'free-agent',
        year,
        packNumber,
      });
    }
    annualRewards.push({
      id: `year-end-variety-${year}`,
      afterShow: year * 12,
      kind: 'variety',
      year,
      packNumber: 3,
    });
  }
  return [...PACK_TUTORIAL_REWARDS, ...annualRewards]
    .filter(reward => state.career.showsRun >= reward.afterShow)
    .map(reward => ({ ...reward, pack: CRIB_PACKS[reward.kind], claimed: Boolean(state.cards.tutorialClaims[reward.id]) }));
}

export function claimTutorialPack(rewardId) {
  const reward = getTutorialPacks().find(entry => entry.id === rewardId);
  if (!reward || reward.claimed) return { ok: false, message: 'That free pack is not available.' };
  const result = awardPack({ ...reward.pack, wrestlerTiers: reward.wrestlerTiers, wrestlerTierWeights: reward.wrestlerTierWeights ?? reward.pack.wrestlerTierWeights }, true);
  if (!result.ok) return result;
  state.cards.tutorialClaims[reward.id] = true;
  persist();
  return result;
}

export function getPurchasedPackReveal() {
  const pending = state.cards.pendingPack;
  return pending ? { ...pending, cards: pending.cards.map(decorateCard) } : null;
}

export function revealPurchasedPackCard(index = null) {
  const pending = state.cards.pendingPack;
  if (!pending) return false;
  if (index == null) pending.revealed = pending.cards.map((card, cardIndex) => cardIndex);
  else if (Number.isInteger(index) && index >= 0 && index < pending.cards.length) pending.revealed = [...new Set([...pending.revealed, index])];
  else return false;
  persist();
  return true;
}

export function finishPurchasedPackReveal() {
  const pending = state.cards.pendingPack;
  if (!pending || pending.revealed.length !== pending.cards.length) return false;
  state.cards.pendingPack = null;
  persist();
  return true;
}

function packFreeAgents() {
  const queued = new Set(state.cards.intakeQueue ?? []);
  return getFreeAgents().filter(entry => !queued.has(entry.wrestler.id));
}

function rollPackWrestler(allowedTiers = null, tierWeights = CRIB_PACKS['free-agent'].wrestlerTierWeights) {
  const pool = packFreeAgents().map(entry => entry.wrestler).filter(wrestler => !allowedTiers || allowedTiers.includes(getDraftTier(wrestler)));
  const entries = Object.entries(tierWeights).map(([tier, weight]) => ({
    weight, wrestlers: pool.filter(wrestler => getDraftTier(wrestler) === tier),
  })).filter(entry => entry.weight > 0 && entry.wrestlers.length);
  if (!entries.length) return null;
  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * total;
  for (const entry of entries) {
    if (roll < entry.weight) return entry.wrestlers[Math.floor(Math.random() * entry.wrestlers.length)];
    roll -= entry.weight;
  }
  const fallback = entries[entries.length - 1].wrestlers;
  return fallback[Math.floor(Math.random() * fallback.length)];
}

export function buyPack(kind) {
  const pack = CRIB_PACKS[kind];
  if (!pack) return { ok: false, message: 'No such pack in the catalog.' };
  if (pack.customWrestler) return { ok: false, message: 'Create your wrestler before purchasing this pack.' };
  return awardPack(pack);
}

export function buyCustomWrestlerPack(data) {
  const pack = CRIB_PACKS['custom-wrestler'];
  if (state.cards.pendingPack) return { ok: false, message: 'Finish opening your waiting pack first.' };
  if (state.bankroll < pack.cost) return { ok: false, message: `This pack costs $${pack.cost.toLocaleString()}.` };
  let sequence = (state.customWrestlers?.length ?? 0) + 1;
  while (getWrestlerById(`custom-${sequence}`)) sequence += 1;
  const wrestler = createCustomWrestler(data, `custom-${sequence}`, state.date);
  if (!wrestler) return { ok: false, message: 'Enter a name, valid style, alignment, and an age from 18 to 55.' };
  if (wrestlers.some(existing => existing.name.toLowerCase() === wrestler.name.toLowerCase())) {
    return { ok: false, message: 'That wrestler name is already in use.' };
  }
  wrestlers.push(wrestler);
  const result = awardPack(pack, false, wrestler);
  if (!result.ok) {
    wrestlers.splice(wrestlers.indexOf(wrestler), 1);
    return result;
  }
  state.customWrestlers = [...(state.customWrestlers ?? []), wrestler];
  persist();
  return result;
}

function awardPack(pack, free = false, createdWrestler = null) {
  if (state.cards.pendingPack) return { ok: false, message: 'Finish opening your waiting pack first.' };
  if (!free && state.bankroll < pack.cost) {
    return { ok: false, message: `${pack.name} runs $${pack.cost.toLocaleString()}.` };
  }

  const wrestler = pack.customWrestler ? createdWrestler : pack.wrestlers ? rollPackWrestler(pack.wrestlerTiers, pack.wrestlerTierWeights) : null;
  if (pack.wrestlers && !wrestler) return { ok: false, message: pack.wrestlerTiers ? 'No midcard-or-better free agents are available right now. Your free pack will remain unclaimed.' : 'Nobody left in free agency to sign.' };

  if (!free) state.bankroll -= pack.cost;

  const gimmicks = rollGimmickCards(pack.gimmicks, { weights: pack.weights });
  const promos = rollPromoPack(pack.promos ?? 0, { weights: pack.promoWeights, cycles: state.cards.promoDrawCycles });
  addGimmickCards(state.cards, gimmicks);
  addPromoCards(state.cards, promos);
  state.cards.promoLog = [{ year: Math.ceil(state.showNumber / 12), cards: promos }, ...(state.cards.promoLog ?? [])].slice(0, 12);

  let signed = null;
  if (wrestler) {
    if (state.draft.signedIds.length < ROSTER_CAP) {
      finalizeFreeAgentSigning(wrestler.id);
      signed = wrestler;
    } else {
      queueForIntake(wrestler.id);
    }
  }

  state.cards.pendingPack = {
    name: pack.name, kind: pack.id, free,
    cards: [
      ...(wrestler ? [{ kind: 'wrestler', id: wrestler.id, tier: getDraftTier(wrestler) }] : []),
      ...gimmicks.map(id => ({ kind: 'gimmick', id })),
      ...promos.map(id => ({ kind: 'promo', id })),
    ],
    revealed: [],
    queued: wrestler && !signed ? wrestler.id : null,
  };

  persist();
  return {
    ok: true,
    pack,
    signed,
    queued: wrestler && !signed ? wrestler : null,
    cards: [
      ...gimmicks.map(id => ({ id, kind: 'gimmick', name: getMatchType(id)?.name ?? id, rarity: gimmickRarity(id) })),
      ...promos.map(id => ({ id, kind: 'promo', name: getStorylineTemplate(id)?.name ?? id, rarity: promoCardRarity(id) })),
    ],
  };
}

// Cards are spent when the show actually runs, so switching a match type while
// planning never burns stock.
function bookedGimmicksForResult() {
  const spent = [];
  (state.show.matches ?? []).forEach(match => {
    if (!gimmickCardRequired(match.typeId)) return;
    spent.push(match.typeId);
  });
  return spent;
}

// ---------------------------------------------------------------------------
// Roster usage + the December crunch
// ---------------------------------------------------------------------------

function recordUsage() {
  const worked = new Set();
  (state.show.matches ?? []).forEach(match => {
    matchParticipantIds(match).forEach(id => worked.add(id));
  });
  const spotlight = state.leadUp.phaseResults?.promoCard?.wrestlerId ?? null;
  if (spotlight) worked.add(spotlight);
  worked.forEach(id => {
    state.usage[id] = [state.showNumber, ...(state.usage[id] ?? [])].slice(0, USAGE_WINDOW_SHOWS);
  });
}

export function usageFor(wrestlerId) {
  const window = state.usage[wrestlerId] ?? [];
  return window.filter(show => show > state.showNumber - USAGE_WINDOW_SHOWS).length;
}

// Twenty years, twelve shows a year.
export function getCampaignProgress() {
  return {
    year: currentYear(),
    years: CAMPAIGN_YEARS,
    showNumber: state.showNumber,
    shows: CAMPAIGN_SHOWS,
    complete: state.showNumber > CAMPAIGN_SHOWS,
  };
}

export function isCampaignComplete() {
  return state.showNumber > CAMPAIGN_SHOWS;
}

// Usage, not rating - how much you have actually used each wrestler lately.
export function getRosterUsageBoard() {
  return getSignedRoster().map(w => ({
    wrestler: w,
    usage: usageFor(w.id),
    age: calculateAge(w.dob, state.date),
  })).sort((a, b) => a.usage - b.usage || b.age - a.age);
}

export function releaseWrestler(wrestlerId) {
  return forceRetire(wrestlerId);
}

export function getRetirees() {
  return state.retirees;
}

export function getMemorials() {
  return state.memorials;
}

// Once-per-playthrough, low-probability roll for a tragic real-world-style death.
// Checked after every flagship show once the roster has settled in a bit; the odds
// are tuned so a wrestler dying happens in roughly one in five typical playthroughs.
const TRAGEDY_CHANCE_PER_SHOW = 0.006;
const TRAGEDY_MIN_SHOW = 6;

function applyTragedy(wrestler, date) {
  const cause = pickTragedyCause();

  wrestler.deceased = true;
  state.draft.signedIds = state.draft.signedIds.filter(id => id !== wrestler.id);
  state.teams.forEach(team => {
    team.memberIds = team.memberIds.filter(id => id !== wrestler.id);
    if (team.memberIds.length < 2) team.active = false;
  });
  Object.values(state.titles).forEach(title => {
    if (title.holders.includes(wrestler.id)) title.holders = [];
  });

  const memorial = {
    id: wrestler.id,
    name: wrestler.name,
    nickname: wrestler.nickname,
    hometown: wrestler.hometown,
    style: wrestler.style,
    causeId: cause.id,
    cause: cause.label,
    message: cause.message(wrestler),
    date,
    finalRecord: { ...wrestler.record },
    finalStats: { ...wrestler.stats },
    popularity: wrestler.popularity,
  };
  state.memorials.unshift(memorial);
  state.accolades[wrestler.id] = state.accolades[wrestler.id] ?? [];
  state.accolades[wrestler.id].push(`Passed away ${date} — memorialized in the Trophy Room`);

  state.family.emailSeq += 1;
  const emailId = `tragedy-${state.family.emailSeq}`;
  state.inbox.dynamic = state.inbox.dynamic ?? [];
  state.inbox.dynamic.push({
    id: emailId,
    from: 'KAY FABE / PRODUCTION',
    address: 'kfabe@rivalpromotion.com',
    subject: `We lost ${wrestler.name}`,
    date,
    body: [
      `I don't know how else to say this, so I'll just say it: ${wrestler.name} is gone. ${cause.label}, sometime after the last show.`,
      memorial.message,
      'The locker room already knows. We are pulling together a tribute for the next show — it felt like the only right thing to do. Take whatever time you need before you get back to the booking sheet.',
    ],
  });
  memorial.emailId = emailId;
  return memorial;
}

function maybeCreateTragedy(date) {
  if (state.memorials.length) return null;
  if (state.showNumber < TRAGEDY_MIN_SHOW) return null;
  if (Math.random() >= TRAGEDY_CHANCE_PER_SHOW) return null;

  const candidates = getSignedRoster().filter(w => !w.retired);
  if (!candidates.length) return null;
  const wrestler = candidates[Math.floor(Math.random() * candidates.length)];
  return applyTragedy(wrestler, date);
}

// Debug/testing hook: forces a tragedy right now, bypassing the odds and the
// once-per-playthrough gate, so the whole flow (email, tribute show, shrine) can be
// previewed on demand. Not wired to any in-game button — console/debug use only.
export function forceTragedy(wrestlerId = null) {
  const candidates = getSignedRoster().filter(w => !w.retired && !w.deceased);
  const wrestler = wrestlerId ? getWrestlerById(wrestlerId) : candidates[Math.floor(Math.random() * candidates.length)];
  if (!wrestler || !isSigned(wrestler.id) || wrestler.retired || wrestler.deceased) {
    return { ok: false, message: 'Pick a signed, living wrestler to force a tragedy for.' };
  }
  const memorial = applyTragedy(wrestler, state.date);
  state.show.tribute = { wrestlerId: memorial.id, name: memorial.name };
  state.show.name = `In Memory of ${memorial.name}`;
  persist();
  return { ok: true, memorial };
}

// One-time, rare, emergent event: if the historical nWo members are actually rostered,
// there's a small chance per show that they form the faction — as Michaels/Hall/Nash if
// Hogan isn't part of the mix, as the classic Hall/Nash/Hogan trio otherwise, or (if all
// four are on the roster) a toss-up between either trio, Hall and Nash turning on each
// other instead, or nothing happening this time. Resolves permanently once it fires.
const NWO_CHECK_MIN_SHOW = 6;
const NWO_CHANCE_PER_SHOW = 0.05;

function nwoEligible(id) {
  const w = getWrestlerById(id);
  return Boolean(w) && isSigned(id) && !w.retired && !w.deceased;
}

function pushNwoEmail(subject, body, date) {
  state.family.emailSeq += 1;
  const emailId = `nwo-${state.family.emailSeq}`;
  state.inbox.dynamic = state.inbox.dynamic ?? [];
  state.inbox.dynamic.push({ id: emailId, from: 'RIVAL PROMOTION NETWORK', address: 'desk@rp-1996.com', subject, date, body });
  return emailId;
}

function nwoRivalryBeat(idA, idB, showNumber, date, text) {
  const names = [idA, idB].map(id => getWrestlerById(id)?.name ?? id);
  recordPromoHistoryEntry({
    id: `nwo-promo-${showNumber}-${state.promoHistory.length}`,
    promoId: 'nwo-rivalry',
    promoName: 'N.W.O. Rumors',
    rarity: 'Event',
    spotlightId: idA,
    participantIds: [idA, idB],
    opponentIds: [idB],
    showNumber,
    showName: state.show.name,
    date,
    matchType: 'Backstage segment',
    matchRating: 0,
    outcome: 'event',
    winnerNames: [],
    text: `${names[0]} vs. ${names[1]}: ${text}`,
    effects: {},
  });
}

function maybeTriggerNWO(date) {
  if (state.nwo.resolved) return null;
  if (state.showNumber < NWO_CHECK_MIN_SHOW) return null;

  const { HBK, HALL, NASH, HOGAN } = NWO_MEMBER_IDS;
  const trioAReady = nwoEligible(HBK) && nwoEligible(HALL) && nwoEligible(NASH);
  const trioBReady = nwoEligible(HOGAN) && nwoEligible(HALL) && nwoEligible(NASH);
  if (!trioAReady && !trioBReady) return null;
  if (Math.random() >= NWO_CHANCE_PER_SHOW) return null;

  let outcome = null;
  if (trioAReady && trioBReady) {
    const roll = Math.random();
    outcome = roll < 0.35 ? 'trioA' : roll < 0.7 ? 'trioB' : roll < 0.85 ? 'split' : null;
  } else if (trioAReady) {
    outcome = Math.random() < 0.7 ? 'trioA' : null;
  } else {
    outcome = Math.random() < 0.7 ? 'trioB' : null;
  }
  if (!outcome) return null;
  return applyNwoOutcome(outcome, date);
}

// Debug/testing hook: forces a specific (or the first eligible) outcome right now,
// bypassing the odds and eligibility toss-up. Console/debug use only.
export function forceNWO(outcome = null) {
  if (state.nwo.resolved) return { ok: false, message: 'The nWo storyline has already resolved this playthrough.' };
  const { HBK, HALL, NASH, HOGAN } = NWO_MEMBER_IDS;
  const trioAReady = nwoEligible(HBK) && nwoEligible(HALL) && nwoEligible(NASH);
  const trioBReady = nwoEligible(HOGAN) && nwoEligible(HALL) && nwoEligible(NASH);
  const resolved = outcome ?? (trioAReady ? 'trioA' : trioBReady ? 'trioB' : 'split');
  if (resolved === 'trioA' && !trioAReady) return { ok: false, message: 'Shawn Michaels, Razor Ramon, and Diesel all need to be signed and healthy.' };
  if (resolved === 'trioB' && !trioBReady) return { ok: false, message: 'Hulk Hogan, Razor Ramon, and Diesel all need to be signed and healthy.' };
  if (resolved === 'split' && !(nwoEligible(HALL) && nwoEligible(NASH))) return { ok: false, message: 'Razor Ramon and Diesel both need to be signed and healthy.' };
  const result = applyNwoOutcome(resolved, state.date);
  persist();
  return { ok: true, result };
}

function applyNwoOutcome(outcome, date) {
  const { HBK, HALL, NASH, HOGAN } = NWO_MEMBER_IDS;
  const names = {
    hbk: getWrestlerById(HBK)?.name,
    hall: getWrestlerById(HALL)?.name,
    nash: getWrestlerById(NASH)?.name,
    hogan: getWrestlerById(HOGAN)?.name,
  };
  const members = outcome === 'trioA' ? [HBK, HALL, NASH] : outcome === 'trioB' ? [HOGAN, HALL, NASH] : [HALL, NASH];

  state.nwo = { resolved: true, outcome, formedShow: state.showNumber, members };

  if (outcome === 'split') {
    [HALL, NASH].forEach(id => {
      state.accolades[id] = state.accolades[id] ?? [];
      state.accolades[id].push(`Turned on a former ally ${date}`);
    });
    const text = NWO_ANNOUNCEMENTS.split(names).body.join(' ');
    nwoRivalryBeat(HALL, NASH, state.showNumber, date, text);
    const announcement = NWO_ANNOUNCEMENTS.split(names);
    const emailId = pushNwoEmail(announcement.subject, announcement.body, date);
    return { outcome, members, emailId };
  }

  members.forEach(id => {
    const w = getWrestlerById(id);
    w.alignment = 'heel';
    w.momentum = Math.min(5, w.momentum + 2);
    w.popularity = Math.min(100, w.popularity + 6);
    state.accolades[id] = state.accolades[id] ?? [];
    state.accolades[id].push(`Founding member of the new heel faction, formed ${date}`);
  });

  const announcement = outcome === 'trioA' ? NWO_ANNOUNCEMENTS.trioA(names) : NWO_ANNOUNCEMENTS.trioB(names);
  const emailId = pushNwoEmail(announcement.subject, announcement.body, date);

  let hoganEmailId = null;
  if (outcome === 'trioA' && nwoEligible(HOGAN)) {
    const hogan = getWrestlerById(HOGAN);
    hogan.alignment = 'face';
    hogan.momentum = Math.min(5, hogan.momentum + 2);
    state.accolades[HOGAN] = state.accolades[HOGAN] ?? [];
    state.accolades[HOGAN].push(`Turned babyface to hunt the new heel faction, ${date}`);
    const responseText = `${hogan.name} makes it clear this new group is now his problem.`;
    [HBK, HALL, NASH].forEach(id => nwoRivalryBeat(HOGAN, id, state.showNumber, date, responseText));
    const turnMsg = NWO_ANNOUNCEMENTS.hoganTurn(names);
    hoganEmailId = pushNwoEmail(turnMsg.subject, turnMsg.body, date);
  }

  return { outcome, members, emailId, hoganEmailId };
}

// ---------------------------------------------------------------------------
// Show-level mutations
// ---------------------------------------------------------------------------
export function setShowField(field, value) {
  if (!['name', 'venueId', 'ticketId'].includes(field)) return;
  if (field === 'venueId' && !venueUnlocked(venues.find(venue => venue.id === value), getGMLevel())) return false;
  state.show[field] = value;
  persist();
  return true;
}

export function addMatch() {
  if (state.show.matches.length >= getMaxMatches()) return null;
  const match = createMatch();
  state.show.matches.push(match);
  syncMatchLengths();
  persist();
  return match;
}

export function removeMatch(matchId) {
  if (state.show.matches.length <= MIN_MATCHES) return false;
  const removed = state.show.matches.find(match => match.id === matchId);
  if (removed && gimmickCardRequired(removed.typeId)) addGimmickCards(state.cards, [removed.typeId]);
  state.show.matches = state.show.matches.filter(m => m.id !== matchId);
  syncMatchLengths();
  persist();
  return true;
}

export function moveMatch(matchId, direction) {
  const index = state.show.matches.findIndex(m => m.id === matchId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= state.show.matches.length) return false;
  const [match] = state.show.matches.splice(index, 1);
  state.show.matches.splice(target, 0, match);
  syncMatchLengths();
  persist();
  return true;
}

export function resetCard(count = MIN_MATCHES) {
  (state.show.matches ?? []).forEach(match => {
    if (gimmickCardRequired(match.typeId)) addGimmickCards(state.cards, [match.typeId]);
  });
  const safeCount = Math.max(MIN_MATCHES, Math.min(count, getMaxMatches()));
  state.show.matches = Array.from({ length: safeCount }, createMatch);
  syncMatchLengths();
  persist();
}

// ---------------------------------------------------------------------------
// Match-level mutations
// ---------------------------------------------------------------------------
// Changing match type reshapes the team structure, so participants have to be
// re-fitted into the new slot layout rather than silently dropped.
function gimmickCardRequired(typeId) {
  return !isBasicMatchType(typeId);
}

export function setMatchType(matchId, typeId) {
  const match = getMatch(matchId);
  const type = getMatchType(typeId);
  if (!match || !type) return false;
  if (typeId === match.typeId) return true;
  if (gimmickCardRequired(typeId) && typeId !== match.typeId) {
    if (gimmickStock(state.cards, typeId) <= 0 || !consumeGimmickCard(state.cards, typeId)) return false;
  } else if (!gimmickCardRequired(typeId) && getGMLevel() < (type.unlockLevel ?? 1)) {
    return false;
  }

  const previousTypeId = match.typeId;
  const existing = matchParticipantIds(match);
  match.typeId = typeId;
  if (gimmickCardRequired(previousTypeId)) addGimmickCards(state.cards, [previousTypeId]);
  match.teams = buildTeams(type, existing);
  match.entrances = match.teams.map((_, i) => match.entrances?.[i] ?? 'standard');
  revokeStaleWinnerPicks();
  revokeStaleTitleBookings();
  syncBookedTeams();
  persist();
  return true;
}

// Pulling the champion out of a match, or changing it to a type the belt cannot be
// defended in, quietly takes the title back off the line.
function revokeStaleTitleBookings() {
  state.show.matches.forEach(match => {
    if (!match.titleId) return;
    if (canBookTitle(match.titleId, match.id)) return;
    match.titleId = null;
    match.stakeId = 'none';
  });
}

function buildTeams(type, existingIds) {
  const teamCount = type.slots.teams || 1;
  const perTeam = type.slots.teams ? type.slots.perTeam : type.slots.max;
  const teams = Array.from({ length: teamCount }, () => []);
  let cursor = 0;
  for (let t = 0; t < teamCount; t += 1) {
    for (let s = 0; s < perTeam; s += 1) {
      if (existingIds[cursor]) teams[t].push(existingIds[cursor]);
      cursor += 1;
    }
  }
  return teams;
}

export function setMatchField(matchId, field, value) {
  const match = getMatch(matchId);
  if (!match || !['stakeId', 'lengthId'].includes(field)) return;
  if (field === 'stakeId' && value === 'title') return false;
  match[field] = value;
  if (field === 'stakeId' && value !== 'title') match.titleId = null;
  persist();
  return true;
}

export function setEntrance(matchId, teamIndex, packageId) {
  return false;
}

export function toggleExtra(matchId, extraId) {
  return false;
}

// Slot assignment: a wrestler already booked elsewhere on the card is moved, not cloned.
export function assignWrestler(matchId, teamIndex, slotIndex, wrestlerId) {
  const match = getMatch(matchId);
  if (!match) return;
  if (wrestlerId && !isSigned(wrestlerId)) return;
  if (wrestlerId) clearWrestlerEverywhere(wrestlerId);
  const team = match.teams[teamIndex];
  if (!team) return;
  while (team.length <= slotIndex) team.push(null);
  team[slotIndex] = wrestlerId || null;
  revokeStaleWinnerPicks();
  revokeStaleTitleBookings();
  syncBookedTeams();
  persist();
}

export function clearSlot(matchId, teamIndex, slotIndex) {
  assignWrestler(matchId, teamIndex, slotIndex, null);
}

// If a booked winner pick gets bumped off the card (slot cleared, or the match type
// changed and reshuffled the sides), the call no longer points at anyone real — drop
// it back to "let fate decide" rather than silently keeping a stale, invisible pick.
function revokeStaleWinnerPicks() {
  state.show.matches.forEach(match => {
    if (match.winnerId && !matchParticipantIds(match).includes(match.winnerId)) {
      match.winnerId = null;
    }
  });
}

function clearWrestlerEverywhere(wrestlerId) {
  state.show.matches.forEach(match => {
    match.teams = match.teams.map(team => team.map(id => (id === wrestlerId ? null : id)));
  });
}

export function bookedElsewhere(wrestlerId, matchId) {
  return state.show.matches.some(
    m => m.id !== matchId && matchParticipantIds(m).includes(wrestlerId),
  );
}

export function isBooked(wrestlerId) {
  return state.show.matches.some(m => matchParticipantIds(m).includes(wrestlerId));
}

// ---------------------------------------------------------------------------
// Running the show
// ---------------------------------------------------------------------------
// A belt's worth tracks the matches it headlines. Great defences build it up,
// bad ones drag it down, and leaving it on the shelf bleeds it out.
function applyTitleOutcomes(result) {
  const defended = new Set();

  result.matches.forEach(matchResult => {
    const outcome = matchResult.titleOutcome;
    if (!outcome) return;
    const def = getChampionship(outcome.titleId);
    const title = state.titles[outcome.titleId];
    const bookedMatch = state.show.matches.find(match => match.id === matchResult.matchId);
    const holders = [...new Set(outcome.newHolders ?? [])];
    const titleChanged = outcome.type === 'change' || outcome.type === 'crowned';
    if (!def || !title || bookedMatch?.titleId !== def.id || matchResult.titleId !== def.id
      || !titleMatchCompatible(def, getMatchType(matchResult.typeId))
      || holders.length !== def.holders || holders.length !== outcome.newHolders?.length
      || !holders.every(id => matchResult.participantIds?.includes(id))
      || (titleChanged && !holders.every(id => matchResult.winnerIds?.includes(id)))) {
      matchResult.titleOutcome = null;
      return;
    }
    defended.add(def.id);

    title.prestige = Math.max(5, Math.min(100, title.prestige + (matchResult.rating - title.prestige) * 0.18));
    if (outcome.type === 'retained-cheap') title.prestige = Math.max(5, title.prestige - 4);

    if (outcome.type === 'change' || outcome.type === 'crowned') {
      if (title.holders.length) {
        title.history.unshift({
          holderNames: title.holders.map(id => getWrestlerById(id)?.name ?? id).join(' & '),
          reignNumber: title.reignNumber,
          from: title.since,
          to: result.date,
          shows: Math.max(1, state.showNumber - title.sinceShow),
          defenses: title.defenses,
          lostTo: outcome.newHolderNames,
        });
      }
      title.holders = [...holders];
      title.since = result.date;
      title.sinceShow = state.showNumber;
      title.reignNumber += 1;
      title.defenses = 0;
      outcome.reignNumber = title.reignNumber;
      outcome.newHolders.forEach(id => {
        state.accolades[id] = state.accolades[id] ?? [];
        state.accolades[id].push(`${def.name} — reign ${title.reignNumber}`);
      });
    } else {
      title.defenses += 1;
      outcome.defenses = title.defenses;
    }
    title.lastDefendedShow = state.showNumber;
  });

  // Belts nobody defended lose their shine.
  CHAMPIONSHIPS.forEach(def => {
    const title = state.titles[def.id];
    if (defended.has(def.id) || !title.holders.length) return;
    const status = defenseStatus(def, title, state.showNumber + 1);
    if (status.state === 'overdue') title.prestige = Math.max(5, title.prestige - 4 - status.overdue * 2);
  });
}

function retireFromCareerStake(wrestlerId, date, reason) {
  const wrestler = getWrestlerById(wrestlerId);
  if (!wrestler || wrestler.retired) return null;
  wrestler.retired = true;
  state.draft.signedIds = state.draft.signedIds.filter(id => id !== wrestlerId);
  state.teams.forEach(team => {
    team.memberIds = team.memberIds.filter(id => id !== wrestlerId);
    if (team.memberIds.length < 2) team.active = false;
  });
  Object.values(state.titles).forEach(title => {
    if (title.holders.includes(wrestlerId)) title.holders = [];
  });
  const retirement = {
    id: wrestler.id,
    name: wrestler.name,
    age: calculateAge(wrestler.dob, date),
    finalRecord: { ...wrestler.record },
    reason,
  };
  state.retirees.unshift(retirement);
  state.accolades[wrestler.id] = state.accolades[wrestler.id] ?? [];
  state.accolades[wrestler.id].push(reason);
  return retirement;
}

function applyStakeConsequences(match, matchResult, date) {
  const notes = [];
  const loserIds = matchResult.winnerIds?.length
    ? matchResult.participantIds.filter(id => !matchResult.winnerIds.includes(id))
    : [];

  if (match.stakeId === 'career') {
    if (!loserIds.length) {
      matchResult.participantIds.forEach(id => adjustMorale(id, -10));
      notes.push('The Career On The Line stipulation ended without a loser. Fans treated it like a broken promise.');
    } else {
      const retired = loserIds.map(id => retireFromCareerStake(id, date, 'Lost a Career On The Line match')).filter(Boolean);
      if (retired.length) notes.push(`${retired.map(r => r.name).join(' & ')} left the promotion after losing a Career On The Line match.`);
    }
  }

  if (match.stakeId === 'mask-hair') {
    if (!loserIds.length) {
      matchResult.participantIds.forEach(id => adjustMorale(id, -6));
      notes.push('Mask vs. Hair ended without a clear loser. The crowd hated the cop-out.');
    } else {
      loserIds.forEach(id => {
        const wrestler = getWrestlerById(id);
        if (!wrestler) return;
        wrestler.popularity = Math.max(1, wrestler.popularity - 3);
        wrestler.momentum = Math.max(-5, wrestler.momentum - 1);
        adjustMorale(id, -8);
        state.accolades[id] = state.accolades[id] ?? [];
        state.accolades[id].push('Lost a Mask vs. Hair match');
      });
      notes.push(`${loserIds.map(id => getWrestlerById(id)?.name ?? id).join(' & ')} paid the Mask vs. Hair price.`);
    }
  }

  if (notes.length) {
    matchResult.stakeConsequences = notes;
  }
  return notes;
}

// The player never picks winners. This projects the card, simulates it, applies
// every consequence, and rolls the calendar forward to next month's PPV.
export function runShow() {
  const projection = getProjection();
  if (!projection.readyToRun || !isLeadUpDone()) return { ok: false, projection };

  const result = simulateShow(state.show, projection, {
    staminaLookup: staminaFor,
    date: showDateLabel(),
    gmLuck: state.gm.luck,
  });
  state.gm.luck = Math.max(0, state.gm.luck - 2);
  const completedEvent = PPV_CALENDAR.find(event => event.id === state.show.eventId);
  result.eventId = state.show.eventId;
  result.showNumber = state.showNumber;
  result.eventBranding = {
    ...(completedEvent ?? {}),
    ...(state.eventBranding[state.show.eventId] ?? {}),
  };
  result.marketGrowth = updateMarketHype(state.marketHype, projection.venue, result);

  state.bankroll += result.profit;
  state.finances.goodwill = applyGoodwillDrift(
    state.finances.goodwill,
    ticketPriceRatio(state.finances.prices, getGMLevel()),
  );

  // Passive recovery helps, but repeated PPV use still accumulates fatigue unless
  // the wrestler receives an explicit rest week.
  wrestlers.forEach(w => {
    state.stamina[w.id] = Math.min(100, staminaFor(w.id) + 20);
  });

  applyTitleOutcomes(result);
  const championIds = new Set(state.titles.world?.holders ?? []);
  if (championIds.has(state.numberOneContenderId)) state.numberOneContenderId = null;
  updateTeamRecords(result);
  result.matches.forEach((matchResult, index) => {
    const match = state.show.matches[index];
    if (match.promoCardEffect?.formsTagTeam) {
      const participants = matchResult.participantIds ?? [];
      const members = [match.promoCardWrestlerId, match.promoCardPartnerId ?? participants.find(id => id !== match.promoCardWrestlerId)]
        .filter((id, memberIndex, ids) => id && participants.includes(id) && ids.indexOf(id) === memberIndex);
      if (members.length === 2) {
        const existingTeam = state.teams.find(team => team.active && members.every(id => team.memberIds.includes(id)));
        if (existingTeam) {
          existingTeam.chemistry = Math.max(existingTeam.chemistry, 100);
        } else {
          const formed = createTeam('', members);
          if (formed.ok) formed.team.chemistry = 100;
        }
        match.promoCardEffect.formedTeamIds = members;
        matchResult.formedTeamIds = members;
        result.headlines.push(`${members.map(id => getWrestlerById(id)?.name ?? id).join(' & ')} form a new tag team after their match.`);
      }
    }
    if (!match.promoCardEffect?.contenderOnWin || !matchResult.winnerIds?.length) return;
    const winnerId = matchResult.winnerIds.includes(match.promoCardWrestlerId)
      ? match.promoCardWrestlerId
      : matchResult.winnerIds[0];
    if (championIds.has(winnerId)) return;
    state.numberOneContenderId = winnerId;
    match.promoCardEffect.numberOneContenderId = winnerId;
    matchResult.promoContenderId = winnerId;
    result.headlines.push(`${getWrestlerById(winnerId)?.name ?? 'The winner'} earns the #1 contender spot.`);
  });
  const bookedIds = new Set();
  result.matches.forEach((matchResult, index) => {
    const drainBase = projection.matches[index]?.drain ?? 10;
    matchResult.effects.forEach(effect => {
      const w = getWrestlerById(effect.id);
      if (!w) return;
      bookedIds.add(w.id);
      adjustMorale(w.id, moraleDeltaFor(w, effect, matchResult, staminaFor(w.id)));
      w.popularity = Math.max(1, Math.min(100, w.popularity + effect.popDelta));
      w.momentum = Math.max(-5, Math.min(5, w.momentum + effect.momentumDelta));
      if (effect.resultCode === 'W') w.record.w += 1;
      else if (effect.resultCode === 'L') w.record.l += 1;
      if (effect.resultCode === 'W') setRelationship(w.id, 1);
      else if (effect.resultCode === 'L' && w.hidden.ego >= 65) setRelationship(w.id, -2);
      if (effect.resultCode === 'W' || effect.resultCode === 'L') {
        const streakType = effect.resultCode === 'W' ? 'win' : 'loss';
        w.streak = w.streak.type === streakType
          ? { type: streakType, count: w.streak.count + 1 }
          : { type: streakType, count: 1 };
      }
      snapshotWrestler(w);
      const drain = drainBase + overuseTier(w.id, state.history).staminaPenalty;
      state.stamina[w.id] = Math.max(15, staminaFor(w.id) - drain);
    });
    if (matchResult.injury) state.injuries[matchResult.injury.id] = matchResult.injury.weeks;
    const stakeNotes = applyStakeConsequences(state.show.matches[index], matchResult, result.date);
    stakeNotes.forEach(note => result.headlines.push(note));
  });

  const battleRoyaleResult = result.matches.find(match => match.typeId === 'battle-royal');
  if (battleRoyaleResult) {
    const winnerId = battleRoyaleResult.winnerIds?.[0] ?? null;
    const firstEliminatedId = battleRoyaleResult.firstEliminatedId ?? null;
    const secondEliminatedId = battleRoyaleResult.secondEliminatedId ?? null;
    state.battleRoyaleHistory.unshift({
      show: state.show.name,
      date: result.date,
      winnerId,
      winnerName: winnerId ? getWrestlerById(winnerId)?.name : 'No winner',
      firstEliminatedId,
      firstEliminatedName: firstEliminatedId ? getWrestlerById(firstEliminatedId)?.name : 'Unknown',
      secondEliminatedId,
      secondEliminatedName: secondEliminatedId ? getWrestlerById(secondEliminatedId)?.name : 'Unknown',
      entrants: battleRoyaleResult.participantIds.length,
      rating: battleRoyaleResult.rating,
    });
  }

  // Sitting a big name out hurts morale; giving a lower-card talent a rest doesn't.
  getSignedRoster().forEach(w => {
    if (bookedIds.has(w.id)) return;
    adjustMorale(w.id, w.popularity >= 65 ? -2 : 1);
    if (w.popularity >= 70) setRelationship(w.id, -2);
  });
  evaluateIncidentPromises(result);

  // Match incidents become one-off entries in each wrestler's Promo history.
  state.show.matches.forEach((match, index) => {
    const incident = controversyForMatch(match, result.matches[index]);
    if (!incident) return;
    const template = getStorylineTemplate(incident.templateId);
    const participantIds = incident.participants ?? [];
    const incidentEntry = {
      id: `incident-promo-${state.showNumber}-${match.id}`,
      matchId: match.id,
      promoId: `incident:${incident.templateId}`,
      promoName: template?.name ?? 'Match Incident',
      rarity: 'Incident',
      spotlightId: participantIds[0] ?? null,
      participantIds,
      opponentIds: participantIds.slice(1),
      showNumber: state.showNumber,
      showName: state.show.name,
      date: result.date,
      matchType: getMatchType(match.typeId)?.name ?? match.typeId,
      matchRating: result.matches[index]?.rating ?? 0,
      outcome: result.matches[index]?.outcome ?? 'incident',
      winnerNames: result.matches[index]?.winnerNames ?? [],
      text: generateIncidentText(incident.templateId, incident),
      effects: {},
    };
    state.promoHistory.unshift(incidentEntry);
    result.matches[index].storyIncident = incidentEntry;
  });
  state.promoHistory = (state.promoHistory ?? []).slice(0, 500);

  // A month passes between flagship events.
  Object.keys(state.injuries).forEach(id => {
    state.injuries[id] -= 4;
    if (state.injuries[id] <= 0) delete state.injuries[id];
  });

  const mainEvent = state.show.matches[state.show.matches.length - 1];
  state.show.matches.forEach((match, index) => {
    if (!match.promoCardPlayed || !match.promoCardId) return;
    const promo = getMatchPromoCard(match.id);
    if (!promo) return;
    const participantIds = matchParticipantIds(match);
    const resultMatch = result.matches[index];
    const historyEntry = {
      id: `promo-${state.showNumber}-${match.id}`,
      matchId: match.id,
      promoId: match.promoCardId,
      promoName: promo.name,
      rarity: promo.rarity?.name ?? 'Unique',
      spotlightId: match.promoCardWrestlerId,
      participantIds,
      opponentIds: participantIds.filter(id => id !== match.promoCardWrestlerId),
      showNumber: state.showNumber,
      showName: state.show.name,
      date: result.date,
      matchType: getMatchType(match.typeId)?.name ?? match.typeId,
      matchRating: resultMatch?.rating ?? 0,
      outcome: resultMatch?.outcome ?? 'unknown',
      winnerNames: resultMatch?.winnerNames ?? [],
      text: match.promoCardCustom?.description ?? promo.description ?? promo.name,
      effects: { ...(match.promoCardEffect ?? {}) },
    };
    state.promoHistory.unshift(historyEntry);
    if (resultMatch) resultMatch.promoCard = historyEntry;
  });
  state.promoHistory = (state.promoHistory ?? []).slice(0, 500);
  state.history.unshift({
    id: state.show.id,
    name: state.show.name,
    venueId: state.show.venueId,
    promoId: state.show.promoId,
    stageId: state.show.stageId,
    ticketId: state.show.ticketId,
    date: result.date,
    rating: result.rating,
    attendance: result.attendance,
    profit: result.profit,
    mainEventIds: matchParticipantIds(mainEvent),
    matches: state.show.matches.map((match, index) => ({
      typeId: match.typeId,
      stakeId: match.stakeId,
      lengthId: match.lengthId,
      participantIds: matchParticipantIds(match),
      winnerIds: result.matches[index]?.winnerIds ?? [],
      rating: result.matches[index]?.rating ?? 0,
    })),
  });
  state.history = state.history.slice(0, 12);
  state.results.unshift(result);
  state.results = state.results.slice(0, 24);

  // A separate, much lighter permanent record (name/date/matches/results only, no
  // financials or storyline text) so the VHS shelf can hold far more shows than the
  // heavy `results` array without bloating every autosave.
  state.archive.unshift({
    showNumber: result.showNumber,
    eventId: result.eventId,
    eventBranding: result.eventBranding,
    showName: result.showName,
    date: result.date,
    venueName: result.venueName,
    city: result.city,
    rating: result.rating,
    ratingLabel: result.ratingLabel,
    stars: result.stars,
    attendance: result.attendance,
    capacity: result.capacity,
    tvViewers: result.tvViewers,
    matches: result.matches.map(match => ({
      matchId: match.matchId,
      label: match.label,
      participantIds: match.participantIds,
      sideIds: match.sideIds,
      winnerIds: match.winnerIds,
      typeId: match.typeId,
      typeName: match.typeName,
      stakeName: match.stakeName,
      sideNames: match.sideNames,
      winnerNames: match.winnerNames,
      outcome: match.outcome,
      rating: match.rating,
      buzz: match.buzz,
      time: match.time,
      finish: match.finish,
      stars: match.stars,
      resultCodes: Object.fromEntries((match.effects ?? []).map(effect => [effect.id, effect.resultCode])),
      promos: [match.promoCard, match.storyIncident].filter(Boolean).map(promo => ({ id: promo.id, promoName: promo.promoName, text: promo.text, participantIds: promo.participantIds })),
    })),
  });
  state.archive = state.archive.slice(0, 240);

  result.progress = applyProgress(state, result);

  recordUsage();
  bookedGimmicksForResult().forEach(id => {
    state.cards.used.matches[id] = (state.cards.used.matches[id] ?? 0) + 1;
  });
  result.gimmicksSpent = bookedGimmicksForResult().map(id => getMatchType(id)?.name ?? id);
  result.chipsEarned = awardChips(result.rating);

  // Year-end beat: the young climb toward their peak, the old start slipping. Nobody
  // retires on their own — ending a career is the player's call at the January intake.
  if (state.showNumber % 12 === 0) {
    result.aging = runAgingPass(wrestlers, { date: state.date, isSigned });
  }

  result.incident = maybeCreateIncident();

  const tragedy = maybeCreateTragedy(result.date);
  result.tragedy = tragedy;
  result.nwo = maybeTriggerNWO(result.date);

  state.showNumber += 1;
  state.date = ppvDateForShowNumber(state.showNumber);
  if (state.showNumber > 1 && state.showNumber % 12 === 1) {
    const year = new Date(`${state.date}T12:00:00`).getFullYear();
    state.inbox.dynamic = state.inbox.dynamic ?? [];
    state.inbox.dynamic.push({
      id: `year-end-packs-${year}`,
      from: "RICK O'SHEA / TALENT RELATIONS",
      address: 'talent@rivalpromotion.com',
      subject: 'Your three free January packs are waiting',
      date: state.date,
      vendingRewardId: `year-end-free-agent-${currentYear() - 1}-1`,
      body: [
        'Another full year completed. Two free Free Agent Packs and one free Variety Pack are waiting in the Lounge vending machine, replacing the old January free-agency board and annual card drop.',
        'Each Free Agent Pack contains one wrestler contract, one Match card, and one Promo. The Variety Pack contains two Match cards and two Promos. Open them one at a time; they cost nothing and stay waiting until claimed.',
        'If the roster is full, the new contracts wait in your intake queue. You can review them when you are ready to make room.',
      ],
    });
    state.inbox.dynamic.push({
      id: `save-reminder-${year}`,
      from: 'RIVAL PROMOTION NETWORK',
      address: 'desk@rivalpromotion.com',
      subject: 'please export your save file',
      date: state.date,
      body: [
        'A full year of promotion history is now behind you. Please use Save File in the headquarters menu and keep the downloaded JSON somewhere safe.',
        'Your browser stores the working campaign in local cache. If that cache is cleared, the browser is reset, or the device changes, the campaign can disappear. The exported file is your backup.',
        'You can upload that file later with Load File to continue this promotion on this browser or another one.',
      ],
    });
  }
  result.debuts = wrestlers
    .filter(w => w.debutShow === state.showNumber)
    .map(w => ({ id: w.id, name: w.name, tier: getDraftTier(w) }));
  state.show = createShow(state.showNumber, state.eventBranding);
  syncMatchLengths();
  if (tragedy) {
    state.show.tribute = { wrestlerId: tragedy.id, name: tragedy.name };
    state.show.name = `In Memory of ${tragedy.name}`;
  }
  refillLeadUp(state.leadUp);
  persist();
  return { ok: true, projection, result };
}

export function resetBooking() {
  for (let index = wrestlers.length - 1; index >= 0; index -= 1) {
    if (wrestlers[index].custom) wrestlers.splice(index, 1);
  }
  state = defaultState();
  matchSeq = 0;
  persist();
}
