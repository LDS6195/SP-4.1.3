# Gameplay Loop Redesign — Session Transcript

> Design conversation and implementation log for the card-based redesign of the
> core gameplay loop. Tool calls and file diffs are omitted; this is the prompts
> and the prose.
>
> For a lossless export including tool calls, use **Chat: Export Chat** from the
> VS Code Command Palette.

**Date:** 2026-09-28

---

## Table of contents

1. [Diagnosing the core loop](#1-diagnosing-the-core-loop)
2. [One wrestler advances + the pack break](#2-one-wrestler-advances--the-pack-break)
3. [Clarifying the ceremony and rarity](#3-clarifying-the-ceremony-and-rarity)
4. [Re-draw rules and roster size](#4-re-draw-rules-and-roster-size)
5. [Roster churn and the cap](#5-roster-churn-and-the-cap)
6. [Three pulls a year](#6-three-pulls-a-year)
7. [Implementation](#7-implementation)
8. [20-year campaign, no auto-retirement](#8-20-year-campaign-no-auto-retirement)
9. [Running locally](#9-running-locally)
10. [Stray arrow fix](#10-stray-arrow-fix)
11. [Pack-opening animation](#11-pack-opening-animation)
12. [Gimmicks in the founding pack + match screen cleanup](#12-gimmicks-in-the-founding-pack--match-screen-cleanup)
13. [Missing portrait](#13-missing-portrait)
14. [Unified card component](#14-unified-card-component)
15. [Reveal-all for gimmicks](#15-reveal-all-for-gimmicks)

---

## 1. Diagnosing the core loop

### User

> Without making any changes yet, I'd like to think about the core gameplay loop period. What are the actual farms about this game they're going to hook users keep them getting enough variety, so it's not too repetitive, but what's going to keep them coming back period the exciting things about wrestling are seeing storylines develop, maybe being surprised by the outcome, seeing the belt change hands, seeing the results the walk out entrances, the drama period. I'm trying to decide if we're overdoing it with the kind of strategic management elements period schedule with the training, the promo and the recruiting new wrestlers. Period, it's sort of the same thing every week you're just clicking menus, and you're not even really surprised by the result. Maybe we keep the training aspect because that's a way that users can kind of customize their roster maybe choosing the storylines becomes the promo planning instead so you don't choose storylines in the booking the matches part. Instead, you do that in sort of the promo buildup phase of the calendar this replaces the picking one of the book tmatches to book a promo for period and we get rid of recruiting entirely period instead we definitely need a way to introduce free agents new wrestlers
>
> maybe we add a sort of gambling gamification type element to it. I was thinking periodically maybe you get new wrestlers joining I can't decide if it should be like every four months you get one or maybe at the start of every year you get four more period and I'm not sure if those numbers are right period but the way you get them I was thinking like you open a pack of cards and then at random you get one of the available free agent wrestlers period but maybe we add a user input aspect to this where you see a list of the free agent wrestlers and you almost like a roulette table you can put chips on the wrestler's period based on your performance throughout the year you earn tokens chips that you can spend here and then you can influence the odds like say early in the game whole kogan has a two percent chance of being pulled on your first time in this part of the game one of the jobbers might have a ten percent maybe all the jobbers have like eight to ten percent odds of being pulled medium tier wrestler like Paul Orendorff might have a six percent chance of getting pulled period but you can put your chips on guys to influence it so say you put a bunch of chips on Hogan maybe all your chips on Hogan you can get like thirty percent chance of pulling him or say you put all of them on Orendorff maybe you get like a fifty five percent chance of pulling him or whatever we can work on balancing the odds later but do you understand the core concept?

### Assistant

Yes — I understand the concept, and I think your instinct about the current loop is right. Let me play it back and then push on it.

**The diagnosis**

The problem isn't that there's *too much* management — it's that the management has **no uncertainty and no memory**. Right now training, promo, and recruiting are three sliders + three dropdowns, resolved instantly, with outcomes that are roughly what the tooltip said they'd be. That's admin, not gameplay. Compare to the thing that actually hooks wrestling fans: *you don't know what's going to happen, and when it happens it matters because of everything that came before it.*

So the fix isn't "fewer systems," it's "fewer systems that resolve deterministically in a menu." Every retained system should have **anticipation → uncertainty → a reveal moment**.

**On your three proposed cuts**

**Keep training** — agreed, and for exactly the reason you gave. Training is *roster authorship*. It's the only system where the player leaves a fingerprint on who these wrestlers become. "My Orndorff is a 92 charisma brawler" is a thing a player will tell someone about. That's worth keeping even though it's a menu.

**Move storyline choice into the promo phase** — strongly agreed, and I'd go further on why. Right now storylines are chosen at the same moment as matches, which means the player sees the whole arc laid out before it starts. Moving it to the buildup phase reframes it: during the month you're *planting seeds* (who's on the mic, who they're aimed at), and the match card at the end of the month is the *consequence* of what the promos stirred up. That's the actual rhythm of wrestling TV. It also means the storyline can partially escape your control — the promo lands better or worse than you planned, and the card you book is a reaction to that. That's where surprise gets injected.

**Cut recruiting** — agreed. "Spend a month raising a number so someone signs" is the most pure-admin system in the game. And critically, it *removes* the surprise from new talent arriving, which is the exact opposite of what you want.

**The draft/roulette concept — confirming I've got it**

New wrestlers stop being something you grind for and become a **scheduled event you look forward to**. A pool of available free agents, each with a base pull probability inversely related to their star power (jobbers ~8-10%, mid-card ~6%, Hogan ~2%). You earn chips through the year based on performance. Before the draw, you see the board and place chips on names, roulette-style, which reweights the odds in your favor. Then the pull happens as a ceremony — pack opening, card flip, whatever — and you get who you get.

Yes. And it's good, because it does three things the current recruiting system does none of:

1. **It creates a long-horizon goal.** Chips earned in March matter in December. Every good show becomes a deposit toward something.
2. **It's agency without certainty.** You're not picking a wrestler, you're *shaping odds*. You can feel smart and still lose, which is the emotional core of both gambling and wrestling booking.
3. **It's a reveal moment.** The one thing your loop is starving for.

**Where I'd push on the details**

**Cadence — I'd go annual, not quarterly.** Once a year, big ceremony, multiple pulls. Quarterly drips dilute it; the whole value is that it's an *event*. And it maps onto the real wrestling calendar (the "who's showing up this year" offseason energy). But — and this matters — pair it with **1-2 uncontrolled arrivals per year** through your existing `arrivalEngine`. So there's a system you steer annually, and separately, people just *show up* sometimes without warning. Controlled anticipation + uncontrolled shock. You need both.

**On the odds math — make chip cost vary by tier, not just the odds.** This is the piece that makes your example numbers work. You described putting all chips on Hogan getting ~30% but all chips on Orndorff getting ~55%. The clean way to get that asymmetry is a weight system where placing a chip on a top-tier name costs more chips per unit of weight:

- Every wrestler has a base weight. Draw probability = own weight ÷ total pool weight.
- A chip placed on a jobber adds, say, +4 weight. On a mid-carder, +2. On a main-eventer, +1.

Same 20 chips now produce exactly the shape you want: you can nearly guarantee a mid-tier guy, or take a real swing at Hogan and probably miss. That's a genuine risk/reward decision, which is what makes a roulette table interesting rather than a slot machine. It also means chip *income* is a real balancing lever — a strong year should let you make a credible run at a star, a mediocre year shouldn't.

**Don't let losing bets evaporate entirely.** Pure loss feels bad and discourages swinging big. Something like: chips on wrestlers you didn't pull convert partially into "interest" that carries to next year's board as bonus base weight. Now there's a multi-year narrative — "I've been chasing Hogan for three years" — which is itself a storyline.

**The one real risk:** this makes roster acquisition *exciting* but still leaves the weekly loop as menus. The draft is a once-a-year peak. It won't fix the other eleven months on its own. The storyline-in-promo-phase change is actually the more important one for week-to-week engagement, because that's what makes the buildup weeks feel like they're *authoring drama* instead of allocating points.

**Second risk:** if training stays a pure slider, it'll feel even flatter next to a flashy draft ceremony. It may need its own small uncertainty hook — breakthroughs, setbacks, a wrestler who resents being pushed — so it isn't the boring thing sitting next to the fun thing.

---

## 2. One wrestler advances + the pack break

### User

> 1. for the promos, maybe you're right. normal matches develop storylines in a generic way. "x wrestler beat y...builds his hype". but one promo per month adds a big modifier to potential hype building for a wrestler/match (small 1-10% chance it backfires and causes actually a hype loss). but this is how you get really unique storylines but don't have to build an impossible tree/database of potential storylines
>
> 2/3. I think you misunderstood. the 2 of each tier is a REPLACEMENT of the draft. you start with the srtarting pool and instead of choosing who you have, 2 of each tier are selected at random in a card opening animation ceremony that starts the game (randomly building your roster). then every year start of january you get 4 new wrestlers from the available free agency pool (as well as some match gimmick/modifier cards (maybe 6)...you can also purchase gimmick packs from the lounge catalog)
>
> 4. I guess the basic types single or tag stay available, but the others are gimmicks that can be modifieres (six man is a gimmic). and yes, there should be like a rarity system. rarer cards have higer and near guarantee of a BIG match hype boost

*(Note: this response followed an earlier exchange where the assistant proposed the storyline-advances-one-wrestler mechanic and the tier-structured board.)*

### Assistant

Got it — corrections absorbed. Taking them in order.

**1. Promo as a hype *modifier*, not a storyline tree**

This is the right call and it's the one that saves you from an unshippable amount of content authoring. You don't need a branching narrative database; you need matches to generate bland baseline story movement ("X beat Y, X's stock rises") and then one high-leverage lever per month that distorts it. Emergent stories come from the distortion pattern, not from authored branches. Ten months of "who got the mic" produces a roster history that feels written without anyone writing it.

Two refinements:

**Make the backfire chance legible, not flat.** A fixed 1-10% roll is invisible to the player — it just feels like getting mugged. Tie it to something they can read and manage: low charisma, high ego, burnt-out stamina, or a wrestler who's already been on the mic too many months running. Now the backfire is a risk the player *accepted* rather than one that happened to them, which is the difference between "that's unfair" and "that's on me."

**Make the backfire redirect rather than just subtract.** A promo that bombs and costs hype is a boring negative. A promo that bombs and the heat lands on *someone else* — the opponent, an interrupting third party — is a story. Same math, infinitely better feel, and it costs you nothing extra because you already have the targeting logic in the promo engine.

**2/3. Understood — the ceremony *replaces* the draft**

Clear now: opening card-pull ceremony builds your founding roster at random, no picking. Then every January you get 4 free agents (chip-weighted) plus ~6 gimmick cards, and you can buy additional gimmick packs from the lounge catalog.

I like it more than the draft. The draft was a sorting exercise; this is a *cold open* that hands you a promotion you didn't choose and dares you to make it work. That's a much stronger opening ten minutes, and it makes playthroughs genuinely distinct.

Two things to watch:

**Roster size.** Two of each tier reads as roughly 10-12 wrestlers. The current draft hands out 18. If your PPV card is five or six matches, a 12-man roster means literally everyone works every show — no rotation, no rest, stamina spirals, and no room for a wrestler to "disappear and come back." I'd weight the bottom heavier: keep 2 each of legend/star/contender/prospect, but pull 4-6 jobbers. Jobbers are structural filler, they're what lets your stars be selective.

**Pure randomness with zero agency at minute one is a real risk.** Most starts will be fine, but some will be unworkable, and a player who bounces off a bad roll never sees the good parts of the game. Cheapest fix: one re-draw. You can reject a single card and pull again. Preserves the "you didn't choose this" feeling while capping the disaster case.

Chips not existing in year 1 is correct and self-solving — you have no performance to have earned them on. The ceremony is pure fate; every January after is fate you've bought influence over. That's a good arc.

**4. Rarity on modifier cards — and your data model already supports it**

Reframing six-man as a gimmick rather than a basic is right. Singles and tag are the grammar; everything else is punctuation.

The nice part: `matchTypes.js` already carries `ceiling`, `buzz`, and `variance` per type. Rarity is just a coordinated move across those three:

- **Common** — modest ceiling bump, modest buzz, *high* variance. Might pop, might fizzle.
- **Rare** — solid on all three, variance tightening.
- **Legendary** (Hell in a Cell, Elimination) — large ceiling and buzz, *low* variance. Near-guaranteed to deliver.

That inversion is the important bit. Rarity shouldn't just mean "bigger number," it should mean **reliability**. A common card is a gamble you can afford to waste; a legendary is a sure thing you only get to spend once. That's what makes holding it for the right feud agonizing in a good way.

**On buying packs from the lounge catalog** — good instinct, it finally gives money a purpose beyond payroll. But guard the scarcity, because scarcity is the entire mechanic:

- You buy a **pack**, never a specific card. The moment players can shop for Hell in a Cell, the system is dead.
- Price them steeply and cap purchases per month. If money trivially converts to gimmicks, the annual card drop stops being an event.
- Consider weighting purchased packs toward commons, with legendaries essentially exclusive to the January drop. Keeps the yearly ceremony as the peak.

---

The three systems now share one spine: **you don't choose what you get, you choose what you do with it.** Roster, stipulations, and story momentum all run on that. Training stays the deliberate counterweight where the player is fully in control.

---

## 3. Clarifying the ceremony and rarity

### User (earlier in sequence)

> maybe in the storyline phase, you choose a storyline to develop for ONE of the wrestlers involved. this adds more stakes to winning and losing. you might lose in the ring and take an L on the record, but yo were the one on the mic, you were the one who advanced. your. story.
>
> ok so every year at the beginning of the year you can get...how many should it be (3 or 4?...) and this starts at yr 2. (so you don't get wrestlers right after the draft.)
>
> although maybe the wrestler draft chagnes too. rather than picking (most ppl would just take the 10 higets rated).....instead of drafting you pull random "cards" 2 legends, 2 stars, 2 high performers, 2 prospects, 4 jobbers"
>
> maybe each cycle as well you pull "match modifiers" which are cards you can "attach" to matches....match types become cards. tag, cage, coffin, ambulance, hell in a cell, elmination, etc. become "match modififer" cards. rather than just being able to book those every time, they become cards you have a limited stock of and can play to boost a match's hype.

### Assistant

Four ideas, and three of them are strong.

**1. Storyline advances *one* wrestler — this is the best idea in the batch**

Decoupling "who won the match" from "whose story advanced" is the thing that makes the whole loop click. It gives you:

- **The protected loss.** Taking an L but owning the segment is the single most authentic wrestling mechanic you could build. It's how every great heel run works.
- **A reason to care about jobbers.** A prospect who loses but keeps getting the mic is a story the player is *authoring*. Right now low-tier guys are inventory.
- **Two currencies instead of one.** Win/loss record and story momentum pull in different directions, so booking becomes a real decision instead of "put the better wrestler over."

Two details I'd add. First, make the mic slot genuinely scarce — one, maybe two per month. Scarcity is what makes the choice mean something. Second, leave a chance the *other* wrestler hijacks the segment. If the opponent is hot enough or the roll goes badly, they steal the heat and advance instead. That's your surprise injection, and it's true to the form.

**2 & 3. The pack composition and the pull count — these solve each other**

You're right that a pick-based draft collapses into "take the ten highest ratings." It's not a decision, it's a sort.

But I don't think the tier spread should be *what you get* — it should be **what's on the board**. Twelve cards laid out every January, guaranteed structure, randomized membership. Then your chips reweight it and you pull from it.

**On count: start at 3, with a 4th earned.** Base three pulls, fourth unlocked by hitting a performance threshold for the year.

**4. Match types as limited cards — yes, and it fixes an existing balance problem**

Right now nothing stops a player booking a cage match every single month. Making them scarce fixes that *and* models something real: overexposing a stipulation kills it.

- **Basic types stay free and unlimited** — singles, tag, six-man.
- **Gimmicks become cards** — cage, coffin, ambulance, Hell in a Cell, elimination.
- **The card's value should scale with the feud's heat.**

Two risks: **hoarding paralysis** (fix with expiry or a hand limit), and **don't make cards mandatory for good shows**.

---

## 4. Re-draw rules and roster size

### User

> ok i like the one re-draw thing, make it clear that it's for a card of the same tier though.
>
> also on the roster size. the early PPVs are only 3 matches. and make more jobbers part of the initial "draft" pack break. 2 legends, 2 stars, 4 mid-cards, 2 prospects, 4 jobbers

### Assistant

Both good calls.

**Re-draw = same tier.** Worth being explicit in the UI copy too — something like "Pull again from the Star pool." That framing does two jobs: it stops the re-draw from being a tier-upgrade exploit, and it keeps the ceremony's promise that the *shape* of your roster is fixed and only the faces are up to fate.

A couple of rules I'd nail down while it's fresh:

- **One re-draw total**, not one per tier. And you keep the second card — no re-rolling the re-roll.
- **The rejected wrestler leaves the pool.** They signed elsewhere. But let them resurface on a future January board — running into the guy you passed on three years later is free narrative.

**The roster math works now.** 2 + 2 + 4 + 2 + 4 = 14. Against a 3-match early card that's 6-8 bodies working, so roughly half the roster is active and half is resting each month. That's real rotation.

Weighting midcard to 4 is the right instinct. Midcard is where storylines actually live — legends are payoffs and jobbers are structure, but the midcard is the engine.

**One thing this exposes:** the roster is a faucet with no drain. Year 1 you're at 14, +4 every January puts you at 26 by year 4 and 34 by year 6, while your card only grows to maybe 6-7 matches. You'll want the drain to be roughly as visible as the faucet — retirements as an *event* the player sees coming, contracts expiring, rivals poaching talent you didn't push.

---

## 5. Roster churn and the cap

### User

> I think if the roster stabilizes around 24-32 that will be fine. by year 4-5 some guys can start retiring, or jobbers can get retired if needed. and hopefully from that point out we can keep roughly a 4 in 4 out....if guys aren't really being used they're forced into retirement. maybe you can't have more than 33 guys on your roster or 4 the lowest work rate ones (to get down to 29 for the next crop)....then again later in the game we might not have as many replacements coming in

### Assistant

That shape is right — 24-32 steady state with a 4-in/4-out churn is a healthy equilibrium.

Three things I'd adjust on the mechanic itself:

**Don't auto-cut the lowest work rate — make it a December decision the player owns.** A hard cap that silently deletes four names is cold, and it will eventually cut someone the player had plans for. Same outcome, but now it's a gut-punch choice instead of an accounting rule.

**Base the metric on usage, not rating.** It makes the cut list a mirror of the player's own booking rather than a rating sort. A 55-rated guy you built a year-long story around should be safe; an 80-rated guy you forgot about for eleven months shouldn't be.

**Let releases have teeth.** Cutting an unused jobber is free. Cutting someone who still has fan equity should cost you.

**On the depletion problem — you're right to flag it, and it's the real long-game risk.** Standard fix is regeneration: new fictional prospects entering the pool each year. Fresh prospects, released/retired-from-rival talent cycling back, second-generation wrestlers. Regens should start appearing *before* the pool runs dry, around year 3-4.

---

## 6. Three pulls a year

### User

> we'll only have 3 wrestler cards per year to help curb this

### Assistant

That changes the curve meaningfully — and mostly for the better.

**The math:** starting at 14, +3/year puts you at 20 by year 3, 26 by year 5, 32 by year 7. That lands squarely in your 24-32 target band right around years 5-7.

**Which means the 33-cap becomes a safety valve, not a routine event.** Make it conditional — it only fires when you're actually over, not as an annual ritual.

**Pool depletion pressure drops a lot.** Regens can wait until year 5-6.

**Each pull gets more precious, which makes the chips better.** At 3, every chip placement is a real commitment.

One thing I'd preserve: keep an **earnable 4th pull** for an exceptional year.

---

## 7. Implementation

### User

> ok let's start implementing all of these changes

### Assistant

Big change set. *(Mapped the codebase, then built in layers: data/config → pure engine → state → UI.)*

**New files**

- `src/data/cards.js` — all tuning constants in one place: pack shapes, pull weights, chip economy, rarity definitions, roster cap.
- `src/booking/cardEngine.js` — pure pull mechanics (no game state), so the odds math is testable in isolation.

**The founding ceremony**

The pick-your-roster draft is gone. You now break a pack of 14 — 2 legends, 2 stars, 4 midcarders, 2 prospects, 4 jobbers — turning cards over one at a time. One re-draw, same tier only, and the wrestler you pass on leaves the pool.

**The mic replaces promo + recruiting**

Three phases instead of four. You pick a story, then pick **which participant takes the microphone** — and that's who advances, independent of who wins. Backfire risk is surfaced as a live percentage driven by ego, charisma, and mic-streak. When it fires, the heat **redirects to the other wrestler**.

**January free agency**

From year 2: a 12-name board in fixed tier shape, 3 pulls (4 if last year averaged 78+). Verified with 20 chips all-in:

| | per draw | across 3 pulls |
|---|---|---|
| Legend | 22% | 56% |
| Contender | 43% | 84% |
| Jobber | 56% | 93% |

Retuned chip income down (1 base, +1 per 8 rating over 62, cap 5) — at the original rate a year banked 24-48 chips, which made legends trivially buyable.

**Stipulations as cards**

Singles and tag free and unlimited. Everything else is stock, spent when the show runs. Rarity is reliability: common is +0 ceiling with 1.15× variance, legendary is +5/+14 with 0.6× variance. Payoff scales with storyline heat — 0.45× cold, 1.35× hot.

**Roster crunch**

Usage tracking over a rolling 12 shows. Past 33 signed, you pick who goes from the 8 least-used — champions protected.

**Two things I'd flag:** regens aren't built yet; the crunch screen is modal with no escape.

---

## 8. 20-year campaign, no auto-retirement

### User

> im thinking htis would just be a 20 year campagin. maybe we don't need wrestlers retiring. it's pro wrestling, ric flair was technically still wrestling past 2016. maybe once you're at 33, any new wrestler cards you draw you can choose if you wanto to keep, and if so you have to "force retire" one of your current roster.
>
> progression system is still in tact. wrestlers start going down in skill as they age. and young wrestlers gain points until they reach their peak

### Assistant

Good call — a 20-year campaign with player-chosen retirements is cleaner than silent attrition.

**No more automatic retirement.** `aging.js` no longer rolls for retirement — it only drifts stats and returns a summary of who climbed and who slipped. The year-end recap now shows an "Another Year On The Body" panel.

**Progression with a real peak.** Each wrestler gets a `peak` fixed the first time aging looks at them: current stats plus headroom of 5 + workEthic/7. Rising wrestlers climb toward it and stop; decline is never capped by it.

The important detail: **training is exempt from the peak.** Natural growth has a ceiling, the gym doesn't. That keeps training as the lever that lets you build someone past what they were born with.

**Intake replaces the December cull.** When a January draw comes in and you're at 33: **pass** (they stay in the industry, +1 standing interest) or **sign** — which requires picking someone whose career ends tonight. Candidates sorted by usage, oldest as tiebreak, champions filtered out.

**Campaign clock.** `CAMPAIGN_YEARS = 20` / `CAMPAIGN_SHOWS = 240`. The constants exist but nothing consumes them yet — there's no end-of-campaign screen.

One consequence worth naming: with no natural attrition and 3 signings a year, you'll hit 33 around year 8 and every January after that becomes a trade.

---

## 9. Running locally

### User

> run it locally

### Assistant

Running at **http://localhost:5174/** (5173 was already in use).

Since this is a breaking save change, the storage key moved to `v8` — your existing campaign won't load, and you'll drop straight into the pack break ceremony on a fresh state.

Note the year-1 chicken-and-egg: no gimmick cards until January of year 2, so the first twelve shows are singles and tag only. That may be too austere for an opening year.

---

## 10. Stray arrow fix

### User

> one of the arrows is poking thru the email, please fix this

### Assistant

Fixed. `.alt-menu-toggle` had no visibility condition, so the collapse arrow rendered on every panel — including ones opened directly from a 3D hotspot like the email terminal, where there's no menu rail for it to collapse. It's now hidden by default and only shown when the panel is in `alt-menu-active` mode.

---

## 11. Pack-opening animation

### User

> could you make the opening pack ceremony look more like a trading card "pack" opening. and animating. and then the wrestler "cards" come out. also could you make the "cards" when as they're presented in the grid look more like cards, like a banner at the bottom with the wrsetler name on it

### Assistant

**The sealed pack.** Opens on a foil wrapper — red/orange gradient, serrated tear edges top and bottom, "FOUNDING CONTRACTS / 14 CARDS" with the tier breakdown in fine print. It idles with a gentle float and a shine sweep. One button: **TEAR IT OPEN**.

**The deal.** Cards cascade in face-down at 55ms intervals, dropping from above with a slight rotation. The card backs are a dark cross-hatch with a gold monogram and an inner gold rule.

**The flip.** Both faces now live in the DOM simultaneously with `transform-style: preserve-3d`, so revealing is a genuine 3D flip instead of a content swap. The flip overshoots slightly at the midpoint (scales to 1.08 at 100°). Only newly revealed cards animate — `view.packRevealFrom` tracks where the batch started.

**The card face.** Proper 5:7 trading card proportions with a black inner bezel: art fills the upper portion with a gradient fade, tier chip top-left, **nameplate banner** overlapping the bottom of the art with a gold gradient bar, footer strip with style and POP.

`prefers-reduced-motion` disables the float, shine, deal, and flip.

---

## 12. Gimmicks in the founding pack + match screen cleanup

### User

> also, when this draft pack break happens there are no "gimmick" cards...did you not build this in yet?
>
> with this, we should also clean up the match booking screen. there shuoldn't be a "more match types" section. these become gimmicks remember. stakes and match time also can disappear. we don't need match time as more admin variables, it's not that exciting. the only stakes are if it's a championship match or not. the championship match becomes a checkmark at near the top, that only becomes visible and enableable IF the current belt holder(s) are involved in the match. the inaugural world belt and tag belt will be "gimmick" cards that the user gets every time they open their first gimmick pack during the inaugural draft

### Assistant

To answer directly: **no, I hadn't built gimmick cards into the founding pack** — I flagged it last time as the "year one is singles and tag only" problem. That's fixed now.

**The founding pack now has a second half.** After you lock in the roster: both championship cards, plus 5 starter stipulation cards weighted 74/26 common/rare with **no legendaries**.

**Championships are card-gated.** `newTitleState` now carries `unlocked: false`, and `titleBookable()` checks it.

**Match screen cleanup.** Match type is now just basics plus what's in your drawer — no browsable catalog. **Stakes & match time is gone entirely.** Runtime is derived from card position — opener sprint, main event extended, everything between standard.

**The championship toggle** sits above the teams as a checkbox row, and only renders when: you hold the card, the match type fits, and every current holder is booked in it — or it's vacant.

`revokeStaleTitleBookings()` runs on slot and type changes.

---

## 13. Missing portrait

### User

> diamond-dallas-page.png was added (previoously missing)

### Assistant

No change needed — it resolves automatically.

The loader in `wrestlerImages.js` uses an eager `import.meta.glob` over `images/wrestlers/`, keying each file by its filename minus extension. Since the file is `diamond-dallas-page.png` and the wrestler's id is `diamond-dallas-page`, the lookup matches directly. Aliases are only needed when the filename and id differ.

Vite picks up new files in a glob on restart rather than via HMR.

---

## 14. Unified card component

### User

> make the pack dimensions taller/less wide, so it looks moer like a real pack shape. also why do the cards say "RP" before flipping. it should say your acronym
>
> "The wrest of the pack" cards should look like cards too....and have the same reveal process. call it "Gimicks" not "the rest of the pack"
>
> in the year 2 and beyond reveals the gimmicks will come along with the 3 wrestlers at the same time (3 wrestlers, 6 gimmicks in the annual start of the year pack). the gimmick cards should have some way to distinguish. like a diff banner color or something so "wrestler" cards and "gimmick" cards are distinguishable. the gimmick cards should have the rarity level (common, ultra rare, etc. ) replacing the star/jobber/etc label position on the wrestler card layout

### User

> and yes keep the belts labeled championship not rare, etc since they're one time things

### Assistant

**Pack shape.** Width down from 250px to 208px with a 306px min-height body — roughly 2:3.

**Card backs use your acronym.** `revealCardHtml` pulls `booking.getCompanyIdentity().acronym`. The sub-label now says CONTRACT / STIPULATION / CHAMPIONSHIP.

**One card component for everything.** Replaced `packCardHtml` with `revealCardHtml`, which switches on a `kind` field (`wrestler` / `gimmick` / `title`). `revealGridHtml` and `revealControlsHtml` give every pack the same deal-and-flip behaviour.

**Gimmicks** get a purple nameplate and card back, a large initial glyph over a hatched field, and **the rarity name sits in the badge slot** where the tier label goes. Rare shifts blue, legendary gold with outer glow.

**Belts** keep the badge reading **CHAMPIONSHIP** — no rarity, since they're one-time. They render the actual belt image, gold frame, gold nameplate.

**Flow changes.** The founding starter screen is titled **Gimmicks** and is a real pack break. The **annual pull now deals one combined pack**: 3 wrestlers + 6 stipulations in the same wrapper.

One thing I'd flag: with 9 cards in the annual pack, "turn the next card" nine times may get tedious by year 6 or 7.

---

## 15. Reveal-all for gimmicks

### User

> i agree actually. for the gimmicks, just have the button be reveal all (say all for these buttons not everything)

### Assistant

Done.

- **Founding gimmick pack** — single **REVEAL ALL →** button, no card-by-card step.
- **Annual pack** — the 3 contracts still turn one at a time, and the moment the last wrestler is flipped the controls collapse to a single **REVEAL ALL →** for the 6 stipulations.
- Renamed the secondary button from "REVEAL EVERYTHING" to **REVEAL ALL** everywhere.

---

## Open items

Carried forward from the conversation, not yet built:

- **Wrestler regeneration** — the free-agency pool thins out around year 5-6. Needs fresh prospects, returning released talent, second-generation wrestlers.
- **End of campaign** — `CAMPAIGN_YEARS`/`CAMPAIGN_SHOWS` and `isCampaignComplete()` exist but nothing consumes them. Show 241 just keeps going.
- **Uncontrolled arrivals** — 1-2 unplanned signings a year through `arrivalEngine` to sit alongside the steerable January pull.
- **Training uncertainty** — training is still a deterministic slider next to two flashy random systems. May need breakthroughs/setbacks of its own.
- **Year-one card scarcity** — 5 starter stipulations across 12 shows runs dry mid-year unless you buy a pack. May be the right pressure, may be too thin.
- **Gimmick card expiry** — `GIMMICK_CARD_EXPIRY_YEARS` is defined but not enforced, so hoarding is still possible.
