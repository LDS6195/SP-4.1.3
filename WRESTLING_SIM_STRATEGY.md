# Wrestling Promotion Simulator Strategy

## Product Premise

**1997: Rival Promotion** is a wrestling management and life-simulation game. The player is a wealthy mogul who launches a rival promotion, drafts an initial roster, grows the company, and builds a lasting history.

The game uses an alternate-history wrestling industry. Talent, promotions, and the era can be recognizable or inspired by real wrestling history; the simulation must be free to produce outcomes that diverge from it.

## Player Fantasy

The player is not merely managing spreadsheets. They are building a promotion, relationships, personal life, and a physical history they can revisit in the headquarters.

The intended feeling is: "I need to see what happens after this show."

## Core Loop

1. Start with money saved to launch a rival promotion.
2. Complete an inaugural draft from a larger talent pool.
3. Begin with a roster of 20-30 wrestlers.
4. Spend each in-game day on constrained personal and business choices.
5. Build hype, manage wrestler availability, and book a biweekly flagship show.
6. Simulate real competitive outcomes; the player does not script winners.
7. Apply results to records, stamina, momentum, relationships, finances, ratings, and historical records.
8. Archive significant moments and visibly evolve the headquarters.

Major events occur every 6-8 weeks. A game year should contain roughly 8-12 meaningful show cards, with daily planning creating the texture between them.

## Wrestling Is Real

Matches are genuine competitions in this universe. The player controls matchups, event structure, feuds, promotion, training, and availability, but not match winners.

Match resolution should use a transparent but not fully predictable combination of:

- Wrestler ability and style matchup
- Stamina, fatigue, health, and injury risk
- Momentum and recent record
- Rivalry heat and personal relationships
- Tag-team chemistry or multi-person match dynamics
- Crowd interest, venue, event importance, and controlled randomness

## Wrestler Model

Start with a focused set of attributes:

- Popularity
- In-ring ability
- Charisma
- Reliability
- Ego
- Loyalty
- Work ethic
- Risk tolerance
- Stamina / fatigue
- Health / injury status
- Momentum
- Relationships
- Contract details
- Career and championship history

Track `W-L-O` records:

- `W`: individual or team-match wins
- `L`: direct losses
- `O`: non-winning outcomes in multi-person matches, battle royals, eliminations, and similar events

Avoid overusing talent. Major matches should generally be spaced around 2-3 months apart; promos, interviews, lighter TV matches, and appearances can maintain visibility with different costs.

## Persona-Style Time Management

The player has finite time and energy. Each day includes a choice from personal, roster, or promotion activities. Personal wellbeing is a resource rather than flavor text.

Possible activities:

- Meet a wrestler: improve relationship, loyalty, morale, or contract leverage
- Train or scout: improve talent or identify prospects
- Promote the next show: increase ticket sales, hype, and TV interest
- Negotiate TV, sponsorship, or venues: money and reach with tradeoffs
- Attend a family event: support personal wellbeing and relationships
- Rest or leisure: recover player energy and reduce burnout
- Study rival promotions: reveal opportunities and competitor intelligence
- Host media appearances or social events: improve awareness, roster chemistry, or create risk

## Presentation Direction

Use two distinct visual languages:

- **Headquarters / main navigation:** grimey late-1990s wrestling atmosphere: concrete, steel, worn posters, backstage spaces, neon, and visible memorabilia.
- **Computer terminal:** polished ESPN-style information interface: rankings, cards, records, ratings trends, finances, injury reports, and history.
- **Show presentation:** period broadcast feel with VHS texture, television graphics, lower-thirds, and generated headlines.

The headquarters is not merely a menu. It is a physical record of the player history:

- Trophy and championship displays
- Newspaper/news clippings for major moments
- Ratings and attendance records
- Hall of Fame plaques with emergent career histories
- Headquarters upgrades that reflect company growth

## First Playable Vertical Slice

Prove the full loop before a broad visual rebuild or advanced storytelling:

1. Begin with starting capital.
2. Draft 20 wrestlers from a larger pool.
3. Plan two weeks with limited daily actions.
4. Book the first flagship show.
5. Simulate results and show ratings, attendance, `W-L-O` updates, stamina changes, and a few relationship consequences.
6. Create a permanent news item and the first headquarters artifact.

## Expansion Order

1. Draft, calendar, daily actions, booking, match simulation, and save state.
2. Rankings, titles, archives, trophies, records, and headquarters progression.
3. Rival promotions, recruiting/signings, contracts, and talent movement.
4. Deeper feuds, backstage alliances, dynamic news, injuries, and personal/family systems.
5. Hall of Fame, legacy statistics, multiple shows, and a richer industry ecosystem.

## Existing Prototype Reuse

Retain the existing Vite/Three.js foundation and reuse scene interaction, local persistence, transitions, terminal patterns, office exploration, trophy-room concept, weekly progression, and shop/progression infrastructure.

Treat the pivot as a new game mode and data model rather than a new project. Build new focused modules for game state, roster, draft, booking, simulation, history, terminal UI, and headquarters world behavior.
