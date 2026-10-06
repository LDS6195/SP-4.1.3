// One-off Promo card copy and eligibility rules. A card is played on a single match;
// its premise is logged on the wrestlers' profiles instead of growing as an active arc.

const hasTag = (w, tag) => w.chemistryTags.includes(tag);
const isFace = w => w.alignment === 'face';
const isHeel = w => w.alignment === 'heel';
const includesCurrentChampion = ([a, b], ctx = {}) => Boolean(ctx.forMatch)
  && (ctx.currentChampionIds ?? []).some(id => id === a.id || id === b.id);

// Gates for storylines that shouldn't be available on every match — only once a
// wrestler is freshly signed, or once they've gone quiet for a long stretch. Context
// is optional and supplied by bookingState.js; templates that ignore it are unaffected.
const ARRIVAL_WINDOW_SHOWS = 3;
const ABSENCE_MIN_TENURE_SHOWS = 6;
// How many flagship shows count as "the start of your career" for the Launch category
// (founding-star title claims) — a tight window so it reads as a launch-era event only.
const EARLY_CAREER_SHOWS = 3;

function isRecentSignee(wrestler, ctx = {}) {
  const signedShow = ctx.signedShows?.[wrestler.id];
  if (signedShow == null) return false;
  return (ctx.showNumber ?? 0) - signedShow <= ARRIVAL_WINDOW_SHOWS;
}

function isLongAbsent(wrestler, ctx = {}) {
  const signedShow = ctx.signedShows?.[wrestler.id];
  if (signedShow == null) return false;
  if ((ctx.showNumber ?? 0) - signedShow < ABSENCE_MIN_TENURE_SHOWS) return false;
  const history = ctx.history ?? [];
  return !history.some(show => show.matches?.some(match => match.participantIds?.includes(wrestler.id)));
}

// Each template's eligible()/weight() take the two booked wrestlers (and an optional
// context of {showNumber, signedShows, history}) and decide whether the angle fits
// them, and (for natural generation) how strongly it wants to happen.
export const STORYLINE_TEMPLATES = [
  {
    id: 'standard-supremacy',
    name: 'Settling It',
    category: 'Standard',
    tagline: 'The wrestlers find out who is better. No distractions.',
    description: 'A straightforward contest to establish who the better wrestler is. No distractions, no excuses, just the bell and a decisive result.',
    beats: [
      '{a} and {b} strip the match down to one question: who is better? No distractions, no excuses.',
      '{a} and {b} agree to settle it in the ring, straight up, with nowhere for the loser to hide.',
    ],
    eligible: () => true,
    weight: () => 1,
  },
  {
    id: 'car-giveaway',
    name: 'The Keys Are a Lie',
    category: 'Chaos',
    tagline: 'A luxury giveaway with somebody else\'s name on the registration',
    description: 'A wrestler promises a lucky fan a luxury car during their live appreciation ceremony. Their opponent recognizes it as their own car, missing from the arena garage, complete with their gym bag in the back seat. The fan refuses to surrender the keys, the dealer wants the car back, and the host insists the ceremony was legally binding. The owner demands a match with the person who gave their car away.',
    beats: [
      '{a} presents a fan with the keys to a luxury car. {b} recognizes their own registration plate and interrupts the ceremony with the parking receipt.',
      'The giveaway winner opens the trunk and finds {b}\'s ring gear. {a} calls it a bonus prize. {b} demands their car back and a match with the host.',
      '{b} brings the dealer to ringside. {a} insists the oversized giveaway key makes the transfer official, while the actual owner demands an answer in the ring.',
    ],
    eligible: () => true,
    weight: () => 65,
  },
  {
    id: 'betrayal',
    name: 'The Turn',
    category: 'Turncoats',
    tagline: 'A secret contract turns a trusted partner into a target',
    description: 'One partner has secretly negotiated a singles contract that only pays out if the other partner is left behind. The signed paperwork makes the betrayal undeniable.',
    beats: [
      '{a} finds a singles contract in {b}\'s locker: a private bonus, a guaranteed title shot, and one condition — leave {a} behind.',
      '{b} signs the secret singles deal in the ring, then seals it by dropping {a} with their own team finishing move.',
      '{a} brings the copied contract to the ring and circles the clause carrying {b}\'s initials. The partnership ends before the bell rings.',
    ],
    eligible: ([a, b]) => a.bestChemistryWith.includes(b.id) || b.bestChemistryWith.includes(a.id)
      || a.chemistryTags.some(t => b.chemistryTags.includes(t)),
    weight: ([a, b]) => (a.bestChemistryWith.includes(b.id) || b.bestChemistryWith.includes(a.id) ? 25 : 0)
      + Math.max(a.hidden.ego, b.hidden.ego) * 0.3,
  },
  {
    id: 'locker-auction',
    name: 'Everything Must Go',
    category: 'Chaos',
    tagline: 'An auctioneer, a stolen locker key, and a very personal lot list',
    description: 'A wrestler hires an auctioneer to sell their rival\'s entrance jacket, gym bag, and first championship photograph live in the ring. The rival arrives with the stolen locker key as evidence and the winning bidder, who wants a refund. The auction stops when the owner demands their belongings back face-to-face.',
    beats: [
      '{a} opens bidding on {b}\'s entrance jacket at one dollar. {b} interrupts with the stolen locker key and demands the auction end.',
      'The bidder who bought {b}\'s gym bag demands a refund from {a}. {b} says the money can wait until they settle the theft in the ring.',
      '{a} lists {b}\'s first championship photograph as "a relic from when somebody cared." {b} takes it back and challenges the auctioneer\'s employer.',
    ],
    eligible: () => true,
    weight: () => 65,
  },
  {
    id: 'appearance-double',
    name: 'Will the Real Wrestler Please Stand Up?',
    category: 'Chaos',
    tagline: 'The autograph is fake. The appearance fee is missing.',
    description: 'A wrestler hires a terrible lookalike to attend their rival\'s paid appearances, insult fans, and collect the fees. The rival brings a furious convention organizer and the double\'s invoice to the arena. The impersonator points out who hired them, leaving the real wrestlers to settle the scam.',
    beats: [
      '{b} confronts {a} with a photograph of an obviously fake {b} collecting an appearance fee. The double\'s invoice has {a}\'s billing address.',
      '{a} insists the double is the real {b}. The convention organizer asks why the supposed wrestler needed help opening a folding chair.',
      'The double points to {a} as the person who paid for the scam. {b} demands the missing money and a match with the real culprit.',
    ],
    eligible: () => true,
    weight: () => 65,
  },
  {
    id: 'monster-rampage',
    name: 'Unstoppable',
    category: 'Blood Feuds',
    tagline: 'Order steps into the underground fight scene',
    description: 'This wrestler has been dominating the roster in underground street fights, and the locker room is running out of answers. Their opponent tries to bring order to the chaos.',
    beats: [
      '{a} has been tearing through the roster in underground street fights. Tonight, {b} steps in to bring order to the chaos.',
      'The locker room has run out of answers for {a}. {b} takes the fight out of the shadows and into the ring.',
    ],
    eligible: ([a, b]) => hasTag(a, 'supernatural-gimmick') || hasTag(b, 'supernatural-gimmick')
      || hasTag(a, 'powerhouse-icon') || hasTag(b, 'powerhouse-icon'),
    weight: ([a, b]) => Math.max(a.stats.strength, b.stats.strength) * 0.3,
  },
  {
    id: 'sold-playbook',
    name: 'The Notebook',
    category: 'In-Ring Respect',
    tagline: 'Every weakness, handwritten by somebody they trusted',
    description: 'A wrestler discovers their trusted coach sold a notebook of their injuries, counters, and training habits to their opponent. The buyer reads a private entry aloud at the contract signing. The betrayed wrestler promises to win with a move the coach never taught them.',
    beats: [
      '{b} reads {a}\'s private training notes into the microphone. {a} recognizes the coach\'s handwriting and demands to know what the betrayal cost.',
      '{a} shows the receipt proving their coach sold the notebook to {b}. {b} opens it to a bookmarked page labeled "COUNTERS."',
      '{a} promises to beat {b} with something absent from the stolen notebook. {b} brings the book to ringside, convinced they already know the ending.',
    ],
    eligible: () => true,
    weight: () => 65,
  },
  {
    id: 'career-buyout',
    name: 'Name Your Price',
    category: 'In-Ring Respect',
    tagline: 'A blank check cannot buy somebody else\'s place in the ring',
    description: 'A wealthy wrestler offers their rival a blank check to quit the federation, presenting the buyout as charity for someone who will never belong at the top. The rival writes "ONE MATCH" across the check and returns it on live television. The buyer raises the offer and brings a retirement banner; the rival demands they prove their superiority instead of paying to avoid the contest.',
    beats: [
      '{a} offers {b} a blank check to leave the federation. {b} writes "ONE MATCH" across it and hands it back in front of the cameras.',
      '{a} unveils a retirement banner for {b} and doubles the buyout offer. {b} refuses the money and asks why {a} is so desperate to avoid wrestling them.',
      '{b} brings the unsigned buyout to ringside. {a} says everybody has a price; {b} says tonight they will find out what money cannot buy.',
    ],
    eligible: () => true,
    weight: () => 65,
  },
  {
    id: 'number-one-spot',
    name: 'Coming for that #1 Spot',
    category: 'Championship',
    tagline: 'One win puts them first in line',
    description: 'The spotlight wrestler stakes their place in line on this match. If they win, they jump to the top of the contender rankings, directly behind the champion, and are first in line for a title shot.',
    beats: [
      '{a} is done waiting for a title opportunity. One win over {b} puts {a} at the front of the line.',
      '{a} says the rankings are about to change. Beating {b} tonight makes {a} the number-one contender.',
    ],
    eligible: () => true,
    weight: () => 65,
  },
  {
    id: 'belt-snatch',
    name: 'The Belt Snatch',
    category: 'Championship',
    tagline: 'The champion arrives without the championship',
    description: 'The title belt disappears during a contract signing. The challenger brags that it is theirs now, while the champion insists the match is still for the championship whether the belt is present or not.',
    beats: [
      'The title belt vanishes from the contract-signing table. {a} accuses {b} of taking it; {b} says the champion should have guarded it better.',
      '{b} appears on the arena stage holding the belt over their head. The champion demands it back; {b} says it will be returned after the match.',
      'Security footage shows the belt changing hands twice and ending up in the wrong locker. The champion and challenger head to the ring before it disappears again.',
    ],
    eligible: includesCurrentChampion,
    weight: () => 90,
  },
  {
    id: 'champion-press-conference',
    name: 'The Champion’s Press Conference',
    category: 'Championship',
    tagline: 'The challenger brought exhibits, a projector, and a very large arrow',
    description: 'The champion schedules a routine media appearance. The challenger hijacks it with a presentation claiming the reign is illegitimate, the title match was miscounted, and the belt plate is mounted upside down.',
    beats: [
      '{b} interrupts the champion’s press conference with a slide show proving the title reign is built on technicalities.',
      '{a} answers every accusation until {b} unveils a freeze-frame, a hand-drawn diagram, and a witness who is clearly reading cue cards.',
      'The champion and challenger agree to settle the disputed reign in the ring. The projector is wheeled out after them.',
    ],
    eligible: includesCurrentChampion,
    weight: () => 70,
  },
  {
    id: 'championship-contract-addendum',
    name: 'The Championship Contract Addendum',
    category: 'Championship',
    tagline: 'Forty-seven pages of terms, all initialed in the wrong places',
    description: 'A challenger produces an addendum claiming the title match has bizarre new terms. The champion disputes every page, but the signatures look uncomfortably familiar.',
    beats: [
      '{b} presents a contract addendum requiring {a} to enter first, answer to a new nickname, and defend the belt under an unexpected stipulation.',
      '{a} finds the champion’s initials on every page. {b} says the document was signed at a diner; the napkin notarization is apparently valid.',
      'The office rejects the addendum, then discovers the original contract references it in a footnote. The champion and challenger take the dispute to the ring.',
    ],
    eligible: includesCurrentChampion,
    weight: () => 70,
  },
  {
    id: 'grudge',
    name: 'Old Wounds',
    category: 'Blood Feuds',
    tagline: 'This was never just business',
    description: 'A parking-lot ambush ended with a shattered windshield, a hospital bill, and security footage naming the attacker. The victim wants repayment in the ring.',
    beats: [
      '{a} rolls security footage of {b} smashing a car window and dragging {a} across the parking lot. The hospital bill is stapled to the match contract.',
      '{b} offers to pay for {a}\'s shattered windshield, then tears up the check and demands another fight instead.',
      '{a} showed up uninvited at {b}\'s hotel room last week. Tonight, {b} returns the visit in the worst way possible.',
    ],
    eligible: ([a, b]) => hasTag(a, 'blood-feud-ready') || hasTag(b, 'blood-feud-ready')
      || a.poorChemistryWith.includes(b.id) || b.poorChemistryWith.includes(a.id),
    weight: ([a, b]) => (a.poorChemistryWith.includes(b.id) || b.poorChemistryWith.includes(a.id) ? 20 : 10),
  },
  {
    id: 'underdog',
    name: 'The Cinderella Run',
    category: 'Underdog',
    tagline: 'Nobody gave them a chance. That is the point.',
    description: 'A significant popularity gap makes every near-fall feel like an earthquake.',
    beats: [
      'Nobody in the building thinks {a} beats {b} tonight. {a} is counting on exactly that.',
      '{b} has never had a real reason to take {a} seriously before. That changes tonight, one way or another.',
    ],
    eligible: ([a, b]) => Math.abs(a.popularity - b.popularity) >= 20,
    weight: ([a, b]) => Math.abs(a.popularity - b.popularity) * 0.5,
  },
  {
    id: 'finisher-injunction',
    name: 'The Finisher Injunction',
    category: 'Corporate Conspiracy',
    tagline: 'The move is identical. The paperwork says otherwise.',
    description: 'A disputed trademark filing threatens to ban a wrestler from using their own signature move. The rival insists the move belongs to them now, despite having used it for exactly one week.',
    beats: [
      '{b} arrives with a cease-and-desist claiming {a} no longer has the right to use their own finishing move.',
      '{a} unveils a legally distinct version with a new name and the exact same motion. {b} objects from ringside with a binder.',
      'The referee receives a diagram, a counter-diagram, and an emergency injunction moments before the bell. {a} and {b} settle ownership the only way they can.',
    ],
    eligible: () => true,
    weight: () => 75,
  },
  {
    id: 'interim-commissioner',
    name: 'The Interim Commissioner',
    category: 'Corporate Conspiracy',
    tagline: 'Stolen authority, one match to give it back',
    description: 'A wrestler kidnaps the real commissioner and declares themselves interim commissioner. Their opponent challenges them to a match: lose, release the commissioner, and give up the stolen authority.',
    beats: [
      'After kidnapping the real commissioner, {a} declares themselves interim commissioner of {company}. {b} challenges them to a match: lose, release the commissioner, and give up the stolen authority.',
    ],
    eligible: () => true,
    weight: () => 70,
  },
  {
    id: 'missing-tape',
    name: 'Bootleg',
    category: 'Tabloid',
    tagline: 'A bootleg tape brings a disputed match back to light',
    description: 'A bootleg VHS appears to show a match that supposedly never happened. One wrestler claims it proves the other quit; the other says the footage is a cheap fake. They decide to settle it once and for all.',
    beats: [
      '{a} produces a bootleg tape of a match nobody remembers, ending with {b} apparently quitting. {b} calls it a fake and demands they settle it in the ring.',
      '{b} says the bootleg footage is doctored. {a} says the tape speaks for itself. They agree to settle the argument once and for all.',
      'The bootleg tape has two endings and no credible source. {a} and {b} stop arguing over the footage and take the dispute to the ring.',
    ],
    eligible: () => true,
    weight: () => 70,
  },
  {
    id: 'friendship-clause',
    name: 'Best Frenemies',
    category: 'Turncoats',
    tagline: 'Rivals settle their differences and shift the balance of power',
    description: 'After a hard-fought match, two rivals put their differences aside and team up to shift the balance of power in the company. Rivals become friends, and a new tag duo starts with the crowd and momentum behind them.',
    beats: [
      'After their match, {a} offers {b} a hand. They leave the ring together, ready to change the balance of power in the company.',
      '{a} and {b} stop fighting each other and start making plans together. The locker room has a new team to reckon with.',
      'Rivals turned friends, {a} and {b} make their alliance official and set their sights on the tag division.',
    ],
    eligible: () => true,
    weight: () => 65,
  },
  {
    id: 'deed-to-the-ring',
    name: 'The Deed to the Ring',
    category: 'Corporate Conspiracy',
    tagline: 'One owns the ring. The other has the rental receipt.',
    description: 'A wrestler claims to own the ring after finding a suspicious deed in the office. Their rival counters with a rental invoice, a lien notice, and a map to a very different ring.',
    beats: [
      '{a} walks to the ring with a deed declaring the entire ring their property. {b} asks why the document lists a used lawn mower as collateral.',
      '{b} produces the rental agreement and says {a} has been wrestling on borrowed canvas for months.',
      'The ring is briefly declared evidence. {a} and {b} are ordered to settle the ownership dispute without damaging the alleged property.',
    ],
    eligible: () => true,
    weight: () => 60,
  },
  {
    id: 'mascot-knows',
    name: 'The President Knows Too Much',
    category: 'Corporate Conspiracy',
    tagline: 'Blackmail puts the President on the defensive',
    description: 'The President has evidence that could ruin {a}. {a} turns it into leverage and threatens to expose the President’s own secrets. With the presidency under threat, the President sends {b} to stop the blackmail before it becomes public.',
    beats: [
      'The President presents {a} with evidence. {a} threatens to expose the President’s own secrets unless the President gives them what they want.',
      '{a} uses the President’s evidence as blackmail. The President sends {b} to shut down the threat before the details get out.',
      'The President sends {b} to defend the office, while {a} warns that the evidence will go public if the match does not go their way.',
    ],
    eligible: () => true,
    weight: () => 65,
  },
  {
    id: 'retirement-tour-clause',
    name: 'Farewell Forever (Terms Apply)',
    category: 'Tabloid',
    tagline: 'One last match, subject to a few dozen exceptions',
    description: 'A wrestler announces retirement to avoid one more fight. Their rival discovers the farewell contract guarantees a full tour, a final rematch, and a return clause in exceptionally large print.',
    beats: [
      '{a} announces an immediate retirement. {b} reads the contract and finds that the farewell tour includes a match against {b}.',
      '{a} says the clause only applies if the arena has a roof. {b} books an outdoor show and brings a portable canopy.',
      'The final match is advertised as absolutely, contractually, and probably permanently the last one. {a} keeps the comeback paperwork close by.',
    ],
    eligible: () => true,
    weight: () => 65,
  },
  {
    id: 'sponsor-champion',
    name: 'The Sponsor’s Champion',
    category: 'Chaos',
    tagline: 'The sponsor picked a champion. The champion was not consulted.',
    description: 'A sponsor names one wrestler its official champion and forces the rival to appear as the promotional spokesperson. The campaign slogan changes every week, usually after a public argument.',
    beats: [
      '{b} is named the sponsor’s champion. {a} is handed a branded jacket and told to introduce {b} as "the future of sports entertainment."',
      '{a} changes the slogan on the posters overnight. {b} holds a press conference to announce that the new slogan is legally inaccurate.',
      'The sponsor demands one final face-off before renewing the deal. {a} and {b} agree, but both bring their own banners and their own fine print.',
    ],
    eligible: () => true,
    weight: () => 60,
  },
  {
    id: 'identity-theft',
    name: 'Identity Theft',
    category: 'Turncoats',
    tagline: 'Same entrance, same jacket, suspiciously different mustache',
    description: 'One wrestler starts copying the other’s entrance, catchphrases, and wardrobe, insisting the original gimmick was never properly registered. The imitation gets more accurate and more insulting each week.',
    beats: [
      '{b} walks out in {a}’s jacket, uses {a}’s catchphrase, and claims the name was filed first in a county neither wrestler has visited.',
      '{a} copies {b}’s entrance in return, including a dramatic pause that lasts long enough for the ring crew to finish lunch.',
      'Both wrestlers arrive dressed as each other. The announcer refuses to guess, so they have to settle who is the original in the ring.',
    ],
    eligible: () => true,
    weight: () => 65,
  },
  {
    id: 'affair-accusation',
    name: 'I Slept with Your Wife',
    category: 'Tabloid',
    tagline: 'One claim, one furious denial, and a hotel key nobody can explain',
    description: 'A wrestler publicly claims they slept with their opponent’s wife. The claim may be true, fabricated, or a deliberate attempt to wreck the opponent’s home life; every new piece of evidence makes the story less clear.',
    beats: [
      '{a} tells a live interview they slept with {b}’s wife. {b} calls it a lie; {a} refuses to take it back.',
      '{a} produces a hotel key as proof. The hotel closed years ago, but the room number matches a date {b} would rather forget.',
      'A recorded message from {b}’s wife says neither wrestler is telling the whole story. {a} and {b} bring their competing timelines to the ring.',
    ],
    eligible: () => true,
    weight: () => 75,
  },
  {
    id: 'family-callout',
    name: 'Say It to My Brother',
    category: 'Blood Feuds',
    tagline: 'The feud just got a family-sized guest list',
    description: 'One wrestler drags the opponent’s sibling into the feud, challenging them by name and demanding they come to the arena. The opponent insists their family is off-limits; the callout only gets louder.',
    beats: [
      '{a} calls out {b}’s brother by name and says the real problem has been hiding behind {b} all along.',
      '{b} brings a message from the brother: stay out of this. {a} reads it aloud, then challenges the brother to appear anyway.',
      'A family member arrives at ringside, refuses to take sides, and leaves {a} and {b} to answer for the mess they made.',
    ],
    eligible: () => true,
    weight: () => 70,
  },
  {
    id: 'holiday-present-break-in',
    name: 'Somebody Opened All the Presents',
    category: 'Blood Feuds',
    tagline: 'The house was empty. The tree was not safe.',
    description: 'While {b}’s family was away for the holiday, {a} broke into their house, opened every present under the tree, including the kids’ gifts, and left the wrapping scattered across the living room. Nobody was home; the violation becomes the feud’s most personal chapter.',
    beats: [
      '{b} returns from the holiday to find every present opened and the wrapping piled beneath the tree. A gift tag is signed by {a}.',
      '{a} says the presents were opened to check whether {b}’s family had better taste. A doorbell camera shows {a} carrying a bow and a roll of tape.',
      '{b} brings the untouched replacement gifts to the arena and demands {a} explain the stunt face-to-face.',
    ],
    eligible: () => true,
    weight: () => 75,
  },
  {
    id: 'hit-and-run-accusation',
    name: 'You Hit My Friend',
    category: 'Blood Feuds',
    tagline: 'A parking-lot collision becomes a public accusation',
    description: 'A car clipped {b}’s friend or relative in the arena parking lot and drove off. The person was treated and released; {b} says {a} was behind the wheel. A damaged rental car, a missing timecard, and a dashcam copy turn the accusation into a feud.',
    beats: [
      '{b} says {a} hit their friend in the parking lot and kept driving. {a} denies being anywhere near the arena exit.',
      'A witness changes their story, but a damaged rental car and a time-stamped receipt put {a} on the road.',
      'The dashcam owner agrees to release the footage after the match. {a} and {b} race to make their case before the tape does.',
    ],
    eligible: () => true,
    weight: () => 75,
  },
  {
    id: 'fake-career-funeral',
    name: 'The Funeral for Your Career',
    category: 'Tabloid',
    tagline: 'The eulogy is ready. The guest of honor is very much alive.',
    description: '{a} stages a full funeral for {b}’s career, complete with a rented hearse, a cardboard tombstone, and a eulogy written before the match has happened. {b} arrives to interrupt the service and challenge the speaker.',
    beats: [
      '{a} holds a funeral for {b}’s career and delivers a eulogy about a wrestler who is still walking around backstage.',
      '{b} interrupts the service, climbs out of the empty coffin, and challenges {a} to prove the career is over.',
      '{a} hires a choir to sing the eulogy at the arena. {b} walks through the procession and demands the final word in the ring.',
    ],
    eligible: () => true,
    weight: () => 70,
  },
  {
    id: 'dna-test-reveal',
    name: 'The DNA Test Says You’re My Father',
    category: 'Tabloid',
    tagline: 'The envelope is sealed. The chain of custody is not.',
    description: '{a} unveils a paternity test claiming {b} is their long-lost father. {b} denies it, the lab denies running the test, and a second envelope appears with a different result and the same handwriting.',
    beats: [
      '{a} opens a sealed DNA result on live television and names {b} as their father. {b} says they have never met before this year.',
      'The lab says the sample was collected from a hotel comb. {a} says that proves nothing; {b} says it proves the lab needs better procedures.',
      'A second test arrives with a different answer and a photo of the courier wearing {a}’s jacket. {a} and {b} agree to settle the family mystery in the ring.',
    ],
    eligible: () => true,
    weight: () => 70,
  },
  {
    id: 'paternity-test',
    name: 'Paternity Test',
    category: 'Tabloid',
    tagline: 'A lab result lands in the middle of a wrestling feud',
    description: '{a} claims to be the secret father of {b}’s child. {b} demands to know who ordered the test, where the sample came from, and why the lab courier is wearing a promotion jacket.',
    beats: [
      '{a} unveils a paternity test claiming they are the secret father of {b}’s child. {b} says the child has never even met {a}.',
      'The lab admits the sample arrived in an unmarked envelope with no chain-of-custody form. {a} insists the result is real; {b} calls the whole thing a setup.',
      'A second result contradicts the first, and the courier is photographed leaving with {a}’s jacket. {b} demands the truth face-to-face, with the child kept out of the circus.',
    ],
    eligible: () => true,
    weight: () => 70,
  },
  {
    id: 'tag-team-cheating-scandal',
    name: 'The Illegal Assist Scandal',
    category: 'Turncoats',
    manual: false,
    tagline: 'The partner was not booked, but apparently that was a suggestion',
    description: 'A tag partner interferes in a singles match to get their teammate over. The footage is obvious, the denials are theatrical, and the locker room picks sides.',
    eligible: () => true,
    weight: () => 100,
  },
  {
    id: 'rogue-officials',
    name: 'The Rules Are A Suggestion',
    category: 'Corporate Conspiracy',
    manual: false,
    tagline: 'One wrestler decided the rulebook was for other people',
    description: 'A rogue star bends, breaks, and occasionally invents rules until the officials threaten to unionize.',
    eligible: () => true,
    weight: () => 90,
  },
  {
    id: 'false-accusation',
    name: 'The Conspiracy Board',
    category: 'Tabloid',
    manual: false,
    tagline: 'No evidence, maximum confidence',
    description: 'A wrestler accuses an opponent of cheating despite a clean finish, then produces increasingly ridiculous evidence to prove it.',
    eligible: () => true,
    weight: () => 80,
  },
  {
    id: 'screwjob-aftermath',
    name: 'The Bell Rang Early',
    category: 'Corporate Conspiracy',
    manual: false,
    tagline: 'The referee says it was official. Nobody else agrees.',
    description: 'A disputed call turns a normal match into a promotion-wide constitutional crisis, complete with microphones, lawyers, and a suspiciously nervous timekeeper.',
    eligible: () => true,
    weight: () => 110,
  },
  {
    id: 'arrival-calling-out-locker-room',
    name: 'Open Challenge to Everybody',
    category: 'Arrival',
    tagline: 'New in town, and already sick of waiting in line',
    description: 'The newest signing skips the pleasantries and calls out the entire roster on their first few weeks, daring anyone with a problem to say it to their face.',
    beats: [
      '{a} walked in the door and immediately called out the entire roster — {b} is just the first one to answer.',
      '{a} does not know {b}\'s name yet, and honestly does not care to learn it before tonight.',
    ],
    eligible: ([a, b], ctx) => isRecentSignee(a, ctx) || isRecentSignee(b, ctx),
    weight: ([a, b], ctx) => (isRecentSignee(a, ctx) ? a.hidden.ego : 0) + (isRecentSignee(b, ctx) ? b.hidden.ego : 0),
  },
  {
    id: 'arrival-league-is-a-joke',
    name: 'This League Is a Joke',
    category: 'Arrival',
    tagline: 'I have seen better competition at the county fair',
    description: 'This wrestler has no respect for the federation, trashing its history and legitimacy, taunting the fans, the executives, and the rest of the roster, and daring anyone to prove them wrong.',
    beats: [
      '{a} interrupts a federation tribute video to call its history a collection of empty claims. {b} steps forward to defend the company in the ring.',
      '{a} turns their back on the fans, mocks the executives by name, and challenges the entire locker room. {b} answers before the microphone is switched off.',
    ],
    eligible: () => true,
    weight: ([a, b]) => 20 + Math.max(a.hidden.ego, b.hidden.ego) * 0.3,
  },
  {
    id: 'arrival-prove-it-veteran',
    name: 'Prove It to Me',
    category: 'Arrival',
    tagline: 'Somebody who has actually been here needs to shut this rookie up',
    description: 'A brand-new face gets targeted by an established veteran who has zero patience for an unproven newcomer talking a big game.',
    beats: [
      '{b} has heard enough out of {a} to last a whole career. Tonight, {b} ends the conversation early.',
      '{a} talked a big game on the way in. {b} intends to make tonight very educational.',
    ],
    eligible: ([a, b], ctx) => (isRecentSignee(a, ctx) && !isRecentSignee(b, ctx)) || (isRecentSignee(b, ctx) && !isRecentSignee(a, ctx)),
    weight: ([a, b], ctx) => (isRecentSignee(a, ctx) ? b.popularity : isRecentSignee(b, ctx) ? a.popularity : 0) * 0.4,
  },
  {
    id: 'arrival-scandalous-secret',
    name: 'Payback',
    category: 'Arrival',
    tagline: 'New name, same scandal',
    description: 'They abandoned a former tag partner at an airport, took the team merch money, and signed here alone. A saved voicemail and an unpaid hotel bill followed them.',
    beats: [
      '{b} plays the voicemail {a} left after taking the team merch money and boarding a flight alone. The unpaid hotel bill is still in the envelope.',
      '{a} calls it a business decision. {b} reads every charge from the abandoned partner\'s hotel bill into the microphone, then demands repayment in the ring.',
    ],
    eligible: ([a, b], ctx) => isRecentSignee(a, ctx) || isRecentSignee(b, ctx),
    weight: ([a, b], ctx) => (isRecentSignee(a, ctx) ? 15 + a.hidden.ego * 0.2 : 0) + (isRecentSignee(b, ctx) ? 15 + b.hidden.ego * 0.2 : 0),
  },
  {
    id: 'arrival-getting-too-comfortable',
    name: 'Getting Too Comfortable',
    category: 'Arrival',
    tagline: 'A new friendship threatens the locker-room hierarchy',
    description: 'A new face wastes no time getting friendly with an established veteran, threatening the power dynamic of the locker room.',
    beats: [
      '{a} arrives carrying the veteran\'s gym bag and leaves the office with a reserved locker. {b} asks why a newcomer suddenly gets privileges nobody else earned.',
      '{b} confronts {a} over the veteran saving them a seat at the booking meeting. {a} says the old pecking order is not their problem.',
      '{a} calls their friendship with the veteran a fresh start. {b} calls it a shortcut and challenges them to prove they belong without anyone speaking for them.',
    ],
    eligible: ([a, b], ctx) => isRecentSignee(a, ctx) || isRecentSignee(b, ctx),
    weight: ([a, b], ctx) => (isRecentSignee(a, ctx) ? 15 + a.stats.charisma * 0.25 : 0) + (isRecentSignee(b, ctx) ? 15 + b.stats.charisma * 0.25 : 0),
  },
  {
    id: 'comeback-injury-return',
    name: "Back Against Doctor's Orders",
    category: 'Comeback',
    tagline: 'They said I would never wrestle again. They were rude about it too',
    description: 'A wrestler returns from a long absence citing injury, immediately picking a fight with whoever they think wrote them off while they were gone.',
    beats: [
      '{a} was told by three separate doctors this comeback was a bad idea. {a} is doing it anyway, against {b}.',
      'The last time anyone saw {a} in a ring, they were being carried out of it. Tonight, {a} walks back in against {b}.',
    ],
    eligible: ([a, b], ctx) => isLongAbsent(a, ctx) || isLongAbsent(b, ctx),
    weight: ([a, b], ctx) => (isLongAbsent(a, ctx) ? 20 + a.popularity * 0.3 : 0) + (isLongAbsent(b, ctx) ? 20 + b.popularity * 0.3 : 0),
  },
  {
    id: 'comeback-settling-old-scores',
    name: 'I Kept a List',
    category: 'Comeback',
    tagline: 'Absence made the grudges grow stronger',
    description: 'A long-absent wrestler returns with a very specific, very personal list of people who did them wrong before they disappeared — and starts working through it.',
    beats: [
      '{a} kept a list the entire time they were gone, and {b} is on it.',
      'Everyone assumed {a} forgot all about {b} during the time away. Everyone assumed wrong.',
    ],
    eligible: ([a, b], ctx) => isLongAbsent(a, ctx) || isLongAbsent(b, ctx),
    weight: ([a, b], ctx) => (isLongAbsent(a, ctx) ? 15 + a.hidden.ego * 0.2 : 0) + (isLongAbsent(b, ctx) ? 15 + b.hidden.ego * 0.2 : 0),
  },
  {
    id: 'comeback-legal-trouble',
    name: 'Time Served',
    category: 'Comeback',
    tagline: 'Whatever they say happened, this version is funnier',
    description: 'A wrestler returns from a long, vaguely-explained absence with a colorful story about exactly why they were away — legal trouble, a bar bet gone wrong, a warrant that is "probably expired by now." Nobody fully believes it, and that is the fun of it.',
    beats: [
      '{a} has three different stories about the missing months, and {b} is the only one asking to hear the real one.',
      '{a} swears the paperwork got lost. {b} is not buying a single word of it.',
    ],
    eligible: ([a, b], ctx) => isLongAbsent(a, ctx) || isLongAbsent(b, ctx),
    weight: ([a, b], ctx) => (isLongAbsent(a, ctx) ? 18 : 0) + (isLongAbsent(b, ctx) ? 18 : 0),
  },
  {
    id: 'launch-inaugural-claim',
    name: 'I Never Lost This',
    category: 'Launch',
    manual: false,
    tagline: 'A champion from somewhere else, standing in a locker room that has no champion yet',
    description: 'A wrestler who walked in as a reigning titleholder somewhere else refuses to act like a challenger — as far as they are concerned, the new company just needs to catch up to who they already are.',
    beats: [
      '{a} has said it in every interview since signing: a title from another company is still a title, and this company is behind on recognizing it.',
      '{a} is not asking for a number-one contender spot. {a} is telling {b} to hand over a belt that does not exist yet.',
    ],
    eligible: ([a, b], ctx) => (ctx?.showNumber ?? 99) <= EARLY_CAREER_SHOWS
      && (hasTag(a, 'inaugural-claim') || hasTag(b, 'inaugural-claim')),
    weight: ([a, b], ctx) => (ctx?.showNumber ?? 99) > EARLY_CAREER_SHOWS ? 0
      : (hasTag(a, 'inaugural-claim') ? 30 + a.hidden.ego * 0.3 : 0) + (hasTag(b, 'inaugural-claim') ? 30 + b.hidden.ego * 0.3 : 0),
  },
  {
    id: 'launch-inaugural-classic',
    name: 'The Inaugural Classic',
    category: 'Launch',
    manual: false,
    tagline: 'Two champions, two promotions, one first title match',
    description: 'Every promotion has a story about how its championship really started. This is that story — two wrestlers who each walked in already calling themselves the best in the world, settling it in the very first match that matters.',
    beats: [
      '{a} never lost the title, he just left the building. {b} has been "the man" since before {a} had a signature move. Neither one is interested in being the answer to a trivia question in six months.',
      'Nobody in this company has ever seen {a} and {b} in the same ring. Tonight, for the first time and with a title on the line, they find out who was actually right.',
    ],
    eligible: ([a, b], ctx) => (ctx?.showNumber ?? 99) <= EARLY_CAREER_SHOWS
      && hasTag(a, 'inaugural-claim') && hasTag(b, 'inaugural-claim'),
    weight: () => 500, // basically always the natural pick when this exact pairing is eligible
  },
];

export const STARTER_PROMO_TEMPLATES = [
  {
    id: 'starter-seat-taken', name: 'Your Seat Is Taken', category: 'Launch', cardRarity: 'common',
    description: 'A veteran arrives expecting the private dressing room and guaranteed main-event spot they enjoyed elsewhere. Their belongings are beside a folding chair, and the founder gives the dressing room to their opponent. Nobody brought seniority across the state line. The veteran demands a match to establish who runs this locker room.',
    beats: [
      '{a} arrives expecting star treatment and finds their name taped to a folding chair. {b} has the dressing-room key. The founder says everyone starts over in {company}.',
      '{a} demands the main-event privileges they had elsewhere. {b} says old contracts do not buy a place in {company}, and challenges them to earn it in the ring.',
    ],
    eligible: () => true, weight: () => 65,
  },
  {
    id: 'starter-wrong-channel', name: 'The Wrong Channel', category: 'Launch', cardRarity: 'rare',
    description: 'A wrestler interrupts the new federation\'s broadcast with a remote control, trying to switch the arena screens to WWF or WCW. Their opponent brings out the original rejection fax that sent them here. Everyone discovers the supposed loyalist begged the competition for a job.',
    beats: [
      '{a} tries to change the arena screens to a rival broadcast. {b} reads the rejection fax proving {a} begged that company for a job before signing with {company}.',
      '{a} calls {company} a backup plan. {b} brings the unanswered job applications to ringside and demands they respect the company that actually hired them.',
    ],
    eligible: () => true, weight: () => 65,
  },
  {
    id: 'starter-new-territory', name: 'Marking New Territory', category: 'Launch', cardRarity: 'legendary',
    description: 'A defector urinates on their former company\'s logo during a televised declaration of allegiance, proclaiming {company} the best federation in the world. Another former employee objects to humiliating everyone who worked there. The new company\'s first ideological feud is born.',
    beats: [
      '{a} urinates on their old employer\'s logo and declares {company} the best federation in the world. {b} interrupts: leaving the company does not mean humiliating everyone who worked there.',
      '{a} calls the logo stunt a pledge of loyalty to {company}. {b} calls it disrespect to the people who built their careers and demands a match.',
    ],
    eligible: () => true, weight: () => 65,
  },
  {
    id: 'starter-replacement', name: 'The Replacement Was Already Here', category: 'Launch', cardRarity: 'common',
    description: 'A newcomer discovers their former employer circulated a memo calling them replaceable. They read it live, then their opponent walks out carrying the same memo: they were the replacement. Both signed here without knowing the other was coming.',
    beats: [
      '{a} reads the memo calling them replaceable. {b} produces the offer naming them as the replacement. Neither expected to share a locker room at {company}.',
      '{b} says the old office chose them over {a}. {a} says the office never let them settle it in the ring. Tonight, {company} gives them that chance.',
    ],
    eligible: () => true, weight: () => 65,
  },
  {
    id: 'starter-whos-in-charge', name: "Who's in Charge?", category: 'Launch', cardRarity: 'rare',
    description: 'A wealthy wrestler claims they personally financed opening night and unveils a poster naming themselves the inaugural headliner. Their opponent produces the original poster with a different main event. The founder insists there\'s no funny business going on behind the scenes.',
    beats: [
      '{a} unveils an opening-night poster naming themselves the headliner and claims they paid for the show. {b} produces the original poster. The founder insists there is no funny business behind the scenes at {company}.',
      '{b} asks who really runs {company} after {a} claims their money bought the main event. The founder denies any secret deal and sends them to settle the dispute in the ring.',
    ],
    eligible: () => true, weight: () => 65,
  },
  {
    id: 'starter-all-eyez', name: 'All Eyez On Me', category: 'Launch', cardRarity: 'legendary',
    description: 'The wrestler makes a public appearance at a Death Row Records event, where 2Pac co-signs them and presents them with a Thug Life chain. They bring the endorsement to opening night, while their opponent insists celebrity approval does not earn a place at the top of the federation.',
    beats: [
      '{a} arrives wearing the Thug Life chain 2Pac presented to them at a Death Row Records event. {b} says the endorsement means nothing once the bell rings at {company}.',
      '{a} airs footage of 2Pac co-signing them and promises to put {company} on the map. {b} challenges them to prove the new spotlight belongs to a wrestler, not just a celebrity guest.',
    ],
    eligible: () => true, weight: () => 65,
  },
];

export const STARTER_PROMO_IDS = new Set(STARTER_PROMO_TEMPLATES.map(template => template.id));

export const PROMO_CARD_RARITIES = {
  common: { id: 'common', name: 'Common', packWeight: 62, matchBuzz: [4, 8], momentum: [1, 1], popularity: [1, 2] },
  rare: { id: 'rare', name: 'Rare', packWeight: 29, matchBuzz: [9, 16], momentum: [1, 2], popularity: [2, 4] },
  legendary: { id: 'legendary', name: 'Legendary', packWeight: 9, matchBuzz: [18, 30], momentum: [2, 3], popularity: [4, 7] },
};

const LEGENDARY_PROMO_IDS = new Set([
  'belt-snatch', 'champion-press-conference', 'championship-contract-addendum',
  'affair-accusation', 'holiday-present-break-in', 'hit-and-run-accusation', 'paternity-test', 'number-one-spot',
]);
const RARE_PROMO_CATEGORIES = new Set(['Turncoats', 'Blood Feuds', 'Corporate Conspiracy', 'Tabloid']);

export const PROMO_CARD_RARITY = Object.fromEntries(
  [...STORYLINE_TEMPLATES, ...STARTER_PROMO_TEMPLATES]
    .filter(template => template.manual !== false && template.id !== 'standard-supremacy' && !template.id.startsWith('launch-'))
    .map(template => [template.id, template.cardRarity ?? (LEGENDARY_PROMO_IDS.has(template.id)
      ? 'legendary'
      : RARE_PROMO_CATEGORIES.has(template.category) ? 'rare' : 'common')]),
);

PROMO_CARD_RARITY.custom = 'common';

export const CUSTOM_PROMO_TEMPLATE = {
  id: 'custom', name: 'Create Your Own', category: 'Custom',
  description: 'A one-off Promo written for your chosen wrestler.',
  beats: [], eligible: () => true,
};

export function promoCardRarity(templateId) {
  const rarityId = PROMO_CARD_RARITY[templateId];
  return rarityId ? PROMO_CARD_RARITIES[rarityId] : null;
}


export function getStorylineTemplate(id) {
  if (id === 'custom') return CUSTOM_PROMO_TEMPLATE;
  return [...STORYLINE_TEMPLATES, ...STARTER_PROMO_TEMPLATES].find(t => t.id === id) || null;
}

// Custom (player-written) storyline instances don't live in STORYLINE_TEMPLATES —
// their title/description are carried directly on the instance (`instance.custom`).
// This gives callers a template-shaped object either way, so display code never
// needs to know whether an angle was authored or picked from the library.
export function resolveTemplate(instance) {
  if (instance?.custom) {
    return {
      id: instance.templateId,
      name: instance.custom.title,
      category: 'Custom',
      tagline: instance.custom.description,
      description: instance.custom.description,
      beats: [],
      custom: true,
    };
  }
  return getStorylineTemplate(instance?.templateId);
}

export function promoCharismaChance(charisma = 50) {
  const skill = Number.isFinite(charisma) ? charisma : 50;
  return Math.max(0, Math.min(.5, (skill - 50) / 100));
}

export function rollPromoReward(min, max, charisma = 50, rng = Math.random) {
  const roll = () => min + Math.floor(rng() * (max - min + 1));
  const base = roll();
  const extraRollChance = promoCharismaChance(charisma);
  return extraRollChance > 0 && rng() < extraRollChance ? Math.max(base, roll()) : base;
}

export function previewText(template, a, b, context = {}) {
  const line = template?.description ?? template?.tagline ?? template?.beats?.[0] ?? '';
  return line.replace(/{a}/g, a?.name ?? 'They').replace(/{b}/g, b?.name ?? 'their opponent').replace(/{company}/g, context.acronym ?? 'the new federation');
}

export function eligibleTemplates(wrestlerObjs, context = {}) {
  if (wrestlerObjs.length < 2 || wrestlerObjs.some(w => !w)) return [];
  const pair = [wrestlerObjs[0], wrestlerObjs[1]];
  return [...STORYLINE_TEMPLATES, ...STARTER_PROMO_TEMPLATES, CUSTOM_PROMO_TEMPLATE].filter(t => t.manual !== false && t.eligible(pair, context));
}

const pick = list => list[Math.floor(Math.random() * list.length)];

const INCIDENT_LINES = {
  'tag-team-cheating-scandal': [
    '{helper} got involved while {accused} was in a singles match, and now everyone has watched the replay seventeen times.',
    '{accused} says the interference was "strategic positioning." {victim} says it was cheating. The footage says both things are true.',
  ],
  'rogue-officials': [
    '{accused} broke the rules so confidently that the referee briefly checked whether they were now in charge.',
    'The rulebook was waved at {accused}. {accused} waved back. The arena has entered a legal gray area.',
  ],
  'false-accusation': [
    '{accused} insists {victim} cheated in a perfectly clean match and unveils a corkboard covered in red string as evidence.',
    'There was no cheating, but {accused} has issued a press conference, a rebuttal, and a challenge over the alleged crime.',
  ],
  'screwjob-aftermath': [
    'The bell rang before anyone was ready, and now {accused} is demanding an investigation into the timekeeper, the referee, and possibly the building.',
    '{accused} was declared the loser. {accused} has rejected the result and accepted the role of aggrieved television celebrity.',
  ],
};

export function generateIncidentText(templateId, incident) {
  const lines = INCIDENT_LINES[templateId] ?? INCIDENT_LINES['rogue-officials'];
  return pick(lines)
    .replace(/{helper}/g, incident.helperName ?? 'The partner')
    .replace(/{accused}/g, incident.accusedName ?? 'The accused')
    .replace(/{victim}/g, incident.victimName ?? 'The opponent');
}
