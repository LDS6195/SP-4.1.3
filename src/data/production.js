// Show production, promotion, and presentation options.
// These are the money levers. Almost none of them change who wins — they change how
// many people show up, how hot the room is, and how good the match is allowed to look.

// ---------------------------------------------------------------------------
// Show-level: how hard you advertise the event
// ---------------------------------------------------------------------------
export const PROMO_TIERS = [
  { id: 'word-of-mouth', name: 'Word of Mouth', cost: 0, demand: 0.78, buzz: -6, risk: 0, description: 'Flyers and the local paper. You are betting purely on the card.' },
  { id: 'local-radio', name: 'Local Radio Spots', cost: 14000, demand: 0.95, buzz: 0, risk: 0, description: 'Drive-time ads in the market. The safe baseline.' },
  { id: 'regional-tv', name: 'Regional TV Buy', cost: 38000, demand: 1.12, buzz: 6, risk: 1, unlockLevel: 3, description: 'Late-night spots across the territory. Reliable lift.' },
  { id: 'national-blitz', name: 'National Blitz', cost: 92000, demand: 1.3, buzz: 15, risk: 3, unlockLevel: 5, description: 'Coast-to-coast saturation. Expensive enough to sink a weak card.' },
  { id: 'media-tour', name: 'Full Media Tour', cost: 155000, demand: 1.46, buzz: 26, risk: 6, unlockLevel: 8, description: 'Talent on morning shows all week. Huge reach, and your stars come in tired.' },
];

// ---------------------------------------------------------------------------
// Show-level: the physical look of the broadcast
// ---------------------------------------------------------------------------
export const STAGE_PACKAGES = [
  { id: 'bare', name: 'Bare Bones Staging', cost: 0, presentation: -8, tvBonus: -0.1, description: 'A ring, some lights, a curtain. Looks like an indie show on tape.' },
  { id: 'house', name: 'House Show Rig', cost: 18000, presentation: 0, tvBonus: 0, description: 'Standard entrance ramp and lighting truss.' },
  { id: 'broadcast', name: 'Broadcast Set', cost: 55000, presentation: 9, tvBonus: 0.12, unlockLevel: 3, description: 'Titantron, hard camera platform, proper lighting design.' },
  { id: 'flagship', name: 'Flagship Spectacle', cost: 128000, presentation: 20, tvBonus: 0.26, unlockLevel: 7, description: 'Custom stage build, full lighting rig, pyro towers. Looks like the biggest show in wrestling.' },
];

// ---------------------------------------------------------------------------
// Show-level: what you charge at the box office
// ---------------------------------------------------------------------------
export const TICKET_TIERS = [
  { id: 'papered', name: 'Papered House', priceMod: 0.55, demandMod: 1.28, goodwill: 4, description: 'Give seats away to guarantee a hot, full room. You lose gate, you gain a crowd.' },
  { id: 'value', name: 'Value Pricing', priceMod: 0.82, demandMod: 1.12, goodwill: 2, description: 'Undercut the competition. Families show up.' },
  { id: 'standard', name: 'Market Rate', priceMod: 1.0, demandMod: 1.0, goodwill: 0, description: 'What the market expects to pay.' },
  { id: 'premium', name: 'Premium Pricing', priceMod: 1.28, demandMod: 0.84, goodwill: -3, description: 'More per head, fewer heads, and a quieter building.' },
  { id: 'gouge', name: 'Big-Event Gouge', priceMod: 1.7, demandMod: 0.62, goodwill: -9, description: 'Charge like it is the biggest night of the year. It had better be.' },
];

// ---------------------------------------------------------------------------
// Per-match: entrance production
// ---------------------------------------------------------------------------
export const ENTRANCE_PACKAGES = [
  { id: 'standard', name: 'Standard Walk-Out', cost: 0, presentation: 0, heat: 0, description: 'Music hits, they walk. Nothing wrong with it.' },
  { id: 'spotlight', name: 'Spotlight & Video', cost: 4500, presentation: 5, heat: 2, description: 'Custom video package and a proper light cue.' },
  { id: 'pyro', name: 'Full Pyro Entrance', cost: 15000, presentation: 12, heat: 5, unlockLevel: 4, description: 'Ramp bursts and a curtain explosion. Instantly feels like a big deal.' },
  { id: 'production', name: 'Spectacle Entrance', cost: 34000, presentation: 21, heat: 9, unlockLevel: 6, description: 'Set piece, live element, the whole production. Main-event-only money.' },
];

// ---------------------------------------------------------------------------
// Per-match: add-ons. Stackable, and they interact with the crowd's taste.
// ---------------------------------------------------------------------------
export const MATCH_EXTRAS = [
  { id: 'ring-crew', name: 'Extra Ring Crew', cost: 2500, presentation: 3, buzz: 0, safety: 6, description: 'More hands on the floor. Meaningfully lowers injury risk in gimmick matches.' },
  { id: 'ring-girls', name: 'Ring Card Girls', cost: 3200, presentation: 4, buzz: 2, safety: 0, description: 'Classic arena polish. Small, cheap presentation lift.' },
  { id: 'live-band', name: 'Live Entrance Band', cost: 26000, presentation: 11, buzz: 7, safety: 0, unlockLevel: 7, description: 'A band plays them to the ring. Loud, expensive, memorable.' },
  { id: 'vignette', name: 'Pre-Match Vignette', cost: 7500, presentation: 6, buzz: 6, safety: 0, heatGain: 2, description: 'A filmed package selling the story. The cheapest way to make a match matter.' },
  { id: 'confetti', name: 'Post-Match Payoff', cost: 5500, presentation: 5, buzz: 1, safety: 0, description: 'Confetti, streamers, a moment held for the cameras. Only lands if the match delivers.' },
  { id: 'commentary', name: 'Lead Announce Team', cost: 9000, presentation: 8, buzz: 3, safety: 0, unlockLevel: 2, description: 'Put the A-team on this match. Makes good work read as great on tape.' },
];

export function getExtra(id) {
  return MATCH_EXTRAS.find(e => e.id === id) || null;
}

export function productionUnlocked(option, gmLevel) {
  return gmLevel >= (option?.unlockLevel ?? 1);
}

// ---------------------------------------------------------------------------
// Per-match: celebrity guests. A reliable crossover lift at a price.
// ---------------------------------------------------------------------------
export const CELEBRITY_GUESTS = [
  { id: 'none', name: 'No Guest', cost: 0, draw: 0, presentation: 0, description: 'Keep the focus on the wrestlers.' },
  { id: 'local-legend', name: 'Local Sports Legend', cost: 12000, draw: 6, presentation: 4, description: 'A retired hometown hero in the corner. Cheap regional pop.' },
  { id: 'radio-host', name: 'Syndicated Radio Host', cost: 22000, draw: 9, presentation: 5, description: 'Enormous local reach and a familiar voice for the crowd.' },
  { id: 'rock-frontman', name: 'Rock Band Frontman', cost: 58000, draw: 18, presentation: 13, description: 'MTV coverage follows him everywhere, turning the walkout into a crossover event.' },
  { id: 'action-star', name: 'Hollywood Action Star', cost: 110000, draw: 28, presentation: 18, description: 'Mainstream press, a genuine crossover moment, and a fee that hurts.' },
  { id: 'heavyweight-champ', name: 'Supermodel', cost: 165000, draw: 36, presentation: 20, description: 'A global fashion icon brings cameras, sponsors, and a major crossover audience.' },
];

export function getCelebrity(id) {
  return CELEBRITY_GUESTS.find(c => c.id === id) || CELEBRITY_GUESTS[0];
}

export function getPromoTier(id) {
  return PROMO_TIERS.find(p => p.id === id) || PROMO_TIERS[1];
}

export function getStagePackage(id) {
  return STAGE_PACKAGES.find(s => s.id === id) || STAGE_PACKAGES[1];
}

export function getTicketTier(id) {
  return TICKET_TIERS.find(t => t.id === id) || TICKET_TIERS[2];
}

export function getEntrancePackage(id) {
  return ENTRANCE_PACKAGES.find(e => e.id === id) || ENTRANCE_PACKAGES[0];
}
