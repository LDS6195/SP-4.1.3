// Trophies, company records, and season awards.
//
// These are the long-tail rewards: proof the player's promotion has a history.
// Trophies are one-time unlocks with a permanent plaque. Records are living bests
// that can be broken. Awards are voted at the end of each season.

// ---------------------------------------------------------------------------
// Trophies — checked after every show. `test` receives (result, state).
// ---------------------------------------------------------------------------
import { wrestlers, getDraftTier } from './wrestlers.js';

export const TROPHIES = [
  {
    id: 'first-blood',
    name: 'The First Night',
    tier: 'bronze',
    flavor: 'You ran a wrestling show. Nobody can take that away.',
    test: (r, s) => s.results.length >= 1,
  },
  {
    id: 'sell-out',
    name: 'Standing Room Only',
    tier: 'silver',
    flavor: 'Sold a building to capacity.',
    test: r => r.fillPercent >= 98,
  },
  {
    id: 'in-the-black',
    name: 'In The Black',
    tier: 'bronze',
    flavor: 'Turned a profit on a flagship show.',
    test: r => r.profit > 0,
  },
  {
    id: 'quarter-million',
    name: 'Quarter Million Night',
    tier: 'silver',
    flavor: 'Cleared $250,000 in profit on a single card.',
    test: r => r.profit >= 250000,
  },
  {
    id: 'five-star',
    name: 'Five Star Classic',
    tier: 'gold',
    flavor: 'Produced a perfect 100-rated match. The tape gets traded for decades.',
    test: r => r.matches.some(m => m.rating >= 100),
  },
  {
    id: 'four-star-card',
    name: 'Card Of The Year Candidate',
    tier: 'gold',
    flavor: 'Every match on the card rated 75 or higher.',
    test: r => r.matches.length >= 3 && r.matches.every(m => m.rating >= 75),
  },
  {
    id: 'ratings-war',
    name: 'Ratings War',
    tier: 'silver',
    flavor: 'Drew a 2.0 television rating.',
    test: r => Number(r.tvRating) >= 2,
  },
  {
    id: 'ten-thousand',
    name: 'Five Figures',
    tier: 'silver',
    flavor: 'Drew more than 10,000 paying customers.',
    test: r => r.attendance >= 10000,
  },
  {
    id: 'fresh-booker',
    name: 'The Fresh Hand',
    tier: 'silver',
    flavor: 'Kept three consecutive flagship cards at 90 freshness or better.',
    test: (r, s) => s.results.length >= 3 && s.results.slice(0, 3).every(show => (show.freshness?.score ?? 0) >= 90),
  },
  {
    id: 'road-warrior',
    name: 'Coast To Coast',
    tier: 'silver',
    flavor: 'Ran shows in five different markets.',
    test: (r, s) => new Set(s.history.map(h => h.venueId)).size >= 5,
  },
  {
    id: 'iron-promoter',
    name: 'Iron Promoter',
    tier: 'gold',
    flavor: 'Ran ten flagship shows without going broke.',
    test: (r, s) => s.results.length >= 10 && s.bankroll > 0,
  },
  {
    id: 'millionaire',
    name: 'Seven Figures Banked',
    tier: 'gold',
    flavor: 'Grew the bankroll past $6,000,000.',
    test: (r, s) => s.bankroll >= 6000000,
  },
  {
    id: 'main-event-run',
    name: 'The Long Program',
    tier: 'silver',
    flavor: 'Three straight shows rated 75 or better.',
    test: (r, s) => s.results.slice(0, 3).length === 3 && s.results.slice(0, 3).every(x => x.rating >= 75),
  },
  {
    id: 'no-casualties',
    name: 'Clean Bill Of Health',
    tier: 'bronze',
    flavor: 'Ran a gimmick-heavy card with nobody injured.',
    test: r => !r.injuries.length && r.matches.some(m => ['steel-cage', 'ladder', 'street-fight', 'last-man-standing'].includes(m.typeId)),
  },
  {
    id: 'giant-killer',
    name: 'Giant Killer',
    tier: 'silver',
    flavor: 'Booked a night where the underdog won the main event.',
    test: r => r.matches[r.matches.length - 1]?.upset,
  },
  {
    id: 'first-champion',
    name: 'The First Champion',
    tier: 'silver',
    flavor: 'Crowned the first champion in company history.',
    test: (r, s) => Object.values(s.titles).some(t => t.reignNumber >= 1),
  },
  {
    id: 'full-slate',
    name: 'Every Belt On The Line',
    tier: 'gold',
    flavor: 'Defended all three championships on a single card.',
    test: r => r.matches.filter(m => m.titleOutcome).length >= 3,
  },
  {
    id: 'dominant-reign',
    name: 'Dominant Reign',
    tier: 'gold',
    flavor: 'A champion made five successful defences.',
    test: (r, s) => Object.values(s.titles).some(t => t.defenses >= 5),
  },
  {
    id: 'prestige-belt',
    name: 'The Belt Means Something',
    tier: 'gold',
    flavor: 'Built a championship to 85 prestige.',
    test: (r, s) => Object.values(s.titles).some(t => t.prestige >= 85),
  },
  {
    id: 'first-year',
    name: 'One Year In',
    tier: 'bronze',
    flavor: 'Kept the doors open through a full first calendar year.',
    test: (r, s) => s.results.length >= 12,
  },
  {
    id: 'territory-veteran',
    name: 'Territory Veteran',
    tier: 'silver',
    flavor: 'Ran two full years of flagship events.',
    test: (r, s) => s.results.length >= 24,
  },
  {
    id: 'five-year-plan',
    name: 'The Five-Year Plan',
    tier: 'gold',
    flavor: 'Kept the promotion healthy for five years.',
    test: (r, s) => s.results.length >= 60 && s.bankroll > 0,
  },
  {
    id: 'decade-of-dominance',
    name: 'A Decade Of Dominance',
    tier: 'gold',
    flavor: 'Ran 120 flagship shows without folding the company.',
    test: (r, s) => s.results.length >= 120 && s.bankroll > 0,
  },
  {
    id: 'living-legacy',
    name: 'Living Legacy',
    tier: 'gold',
    flavor: 'Built a 20-year history for the promotion.',
    test: (r, s) => s.results.length >= 240 && s.bankroll > 0,
  },
  {
    id: 'reliable-draw',
    name: 'Reliable Draw',
    tier: 'silver',
    flavor: 'Sold out five different shows.',
    test: (r, s) => s.results.filter(show => show.fillPercent >= 98).length >= 5,
  },
  {
    id: 'winning-streak',
    name: 'Business Is Booming',
    tier: 'silver',
    flavor: 'Turned a profit on five consecutive shows.',
    test: (r, s) => s.results.slice(0, 5).length === 5 && s.results.slice(0, 5).every(show => show.profit > 0),
  },
  {
    id: 'quality-control',
    name: 'Quality Control',
    tier: 'silver',
    flavor: 'Ran ten shows rated 75 or better.',
    test: (r, s) => s.results.filter(show => show.rating >= 75).length >= 10,
  },
  {
    id: 'classic-collection',
    name: 'Classic Collection',
    tier: 'gold',
    flavor: 'Produced ten matches rated 85 or better.',
    test: (r, s) => s.results.flatMap(show => show.matches).filter(match => match.rating >= 85).length >= 10,
  },
  {
    id: 'tape-trader',
    name: 'Tape Trader Favorite',
    tier: 'gold',
    flavor: 'Produced twenty-five matches rated 85 or better.',
    test: (r, s) => s.results.flatMap(show => show.matches).filter(match => match.rating >= 85).length >= 25,
  },
  {
    id: 'champions-road',
    name: 'The Champion\'s Road',
    tier: 'gold',
    flavor: 'A champion made twelve successful defences.',
    test: (r, s) => Object.values(s.titles).some(t => t.defenses >= 12),
  },
  {
    id: 'company-standard',
    name: 'Company Standard',
    tier: 'gold',
    flavor: 'Built a championship to 95 prestige.',
    test: (r, s) => Object.values(s.titles).some(t => t.prestige >= 95),
  },
  {
    id: 'fan-favorite',
    name: 'Fan Favorite',
    tier: 'silver',
    flavor: 'Sustained 90 fan goodwill after a full year.',
    test: (r, s) => s.results.length >= 12 && (s.finances?.goodwill ?? 0) >= 90,
  },
  {
    id: 'national-player',
    name: 'National Player',
    tier: 'gold',
    flavor: 'Drew a 4.0 television rating.',
    test: r => Number(r.tvRating) >= 4,
  },
  {
    id: 'eight-figures',
    name: 'Eight Figures Banked',
    tier: 'gold',
    flavor: 'Built an $10,000,000 war chest.',
    test: (r, s) => s.bankroll >= 10000000,
  },
  {
    id: 'world-tour',
    name: 'World Tour',
    tier: 'gold',
    flavor: 'Ran flagship events in ten different markets.',
    test: (r, s) => new Set(s.history.map(show => show.venueId)).size >= 10,
  },
  {
    id: 'gotta-catch-em-all',
    name: "Gotta Catch 'Em All",
    tier: 'gold',
    flavor: 'Acquired every collectible non-custom wrestler card across your career.',
    test: (r, s) => {
      const collected = new Set(s.cards?.collectedWrestlerIds ?? s.draft?.signedIds ?? []);
      return wrestlers.filter(wrestler => !wrestler.custom && getDraftTier(wrestler) !== 'celebrity')
        .every(wrestler => collected.has(wrestler.id));
    },
  },
];

export const TROPHY_TIER_ORDER = { gold: 0, silver: 1, bronze: 2 };

// ---------------------------------------------------------------------------
// Company records — living bests, each one can be broken and re-broken.
// ---------------------------------------------------------------------------
export const RECORD_DEFS = [
  { id: 'best-show', label: 'Highest Rated Show', better: 'higher', format: v => `${v} rating` },
  { id: 'best-match', label: 'Highest Rated Match', better: 'higher', format: v => `${v} rating` },
  { id: 'attendance', label: 'Largest Attendance', better: 'higher', format: v => `${v.toLocaleString()} fans` },
  { id: 'gate', label: 'Biggest Gate', better: 'higher', format: v => `$${v.toLocaleString()}` },
  { id: 'tv-rating', label: 'Highest TV Rating', better: 'higher', format: v => `${v} rating` },
  { id: 'profit', label: 'Most Profitable Night', better: 'higher', format: v => `$${v.toLocaleString()}` },
  { id: 'merch', label: 'Best Merchandise Night', better: 'higher', format: v => `$${v.toLocaleString()}` },
  { id: 'worst-show', label: 'Worst Night In Company History', better: 'lower', format: v => `${v} rating` },
];

export const SEASON_LENGTH = 12;
