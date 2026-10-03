// Promo Mad-Libs data: settings (where the promo is cut), scenarios (what it's about),
// and persona packs (how a given wrestler tends to talk). The engine in
// src/booking/promoEngine.js combines these with target selection to produce the
// actual segment. Kept as flat data so new material can be dropped in without
// touching any logic.

// --- Settings -----------------------------------------------------------
// Where the promo is delivered. Tag hints let the engine lean toward settings that
// suit a scenario's tone, but any setting can pair with any scenario.
export const PROMO_SETTINGS = [
  { text: 'from ringside, mic in hand', tags: ['classic'] },
  { text: 'standing in the center of the ring', tags: ['classic'] },
  { text: 'from the top of the entrance ramp', tags: ['classic'] },
  { text: 'backstage in front of the production trucks', tags: ['classic'] },
  { text: 'from the interview platform', tags: ['classic'] },
  { text: 'outside their locker room door', tags: ['classic'] },
  { text: 'from the Gorilla Position, still in gear', tags: ['classic'] },
  { text: 'at the merchandise table, signing autographs mid-rant', tags: ['classic'] },
  { text: 'from their home living room', tags: ['home'] },
  { text: 'from their front porch, coffee in hand', tags: ['home'] },
  { text: 'in their home gym, mid-workout', tags: ['home'] },
  { text: 'from their kitchen table', tags: ['home'] },
  { text: 'in bed, phone propped on the nightstand', tags: ['home', 'personal'] },
  { text: 'from a hot tub, in no hurry to get out', tags: ['home', 'personal'] },
  { text: 'from their bedroom, half-dressed for a night out', tags: ['home', 'personal'] },
  { text: 'from their opponent\'s front lawn', tags: ['personal', 'wild'] },
  { text: 'while getting a manicure', tags: ['personal', 'lifestyle'] },
  { text: 'while getting a massage at a day spa', tags: ['personal', 'lifestyle'] },
  { text: 'while getting a haircut', tags: ['personal', 'lifestyle'] },
  { text: 'while tanning poolside', tags: ['personal', 'lifestyle'] },
  { text: 'behind the wheel of a brand-new sports car', tags: ['lifestyle'] },
  { text: 'in the back of a stretch limousine', tags: ['lifestyle'] },
  { text: 'aboard a private jet', tags: ['lifestyle'] },
  { text: 'on a yacht somewhere the paperwork can\'t find them', tags: ['lifestyle'] },
  { text: 'at a five-star restaurant, steak untouched', tags: ['lifestyle'] },
  { text: 'at a champagne toast surrounded by admirers', tags: ['lifestyle', 'wild'] },
  { text: 'smashing in their opponent\'s car windows', tags: ['wild', 'personal'] },
  { text: 'keying the paint on their opponent\'s truck', tags: ['wild', 'personal'] },
  { text: 'while getting hauled off in handcuffs', tags: ['wild'] },
  { text: 'from a jail cell, unbothered', tags: ['wild'] },
  { text: 'from bed, in their opponent\'s spouse\'s house', tags: ['wild', 'personal'] },
  { text: 'crashing their opponent\'s family barbecue', tags: ['wild', 'personal', 'family'] },
  { text: 'from their opponent\'s hometown bar', tags: ['wild'] },
  { text: 'from the drive-thru line at 2 a.m.', tags: ['wild', 'comic'] },
  { text: 'in a strip-mall parking lot, security nowhere in sight', tags: ['wild'] },
  { text: 'from a tattoo parlor, mid-session', tags: ['wild', 'lifestyle'] },
  { text: 'crashing a press conference that wasn\'t theirs', tags: ['wild'] },
  { text: 'from a biker bar, surrounded by new friends', tags: ['wild'] },
  { text: 'from a smoky poker game', tags: ['wild'] },
  { text: 'from a casino floor, chips stacked high', tags: ['lifestyle', 'wild'] },
  { text: 'from a dive bar back booth', tags: ['personal'] },
  { text: 'from a church parking lot after Sunday service', tags: ['moral'] },
  { text: 'standing at a graveside', tags: ['dark'] },
  { text: 'in an empty, darkened arena, hours before doors open', tags: ['dark', 'classic'] },
  { text: 'lit only by candlelight in an abandoned building', tags: ['dark'] },
  { text: 'from atop a parking garage, city skyline behind them', tags: ['dark'] },
  { text: 'from the shadows at ringside, refusing to step into the light', tags: ['dark'] },
  { text: 'from a smoke-filled back room', tags: ['dark'] },
  { text: 'in a boxing gym, wrapping their hands', tags: ['gritty'] },
  { text: 'in a junkyard, sledgehammer resting on their shoulder', tags: ['gritty', 'wild'] },
  { text: 'chopping wood outside a cabin', tags: ['gritty'] },
  { text: 'in a truck stop diner at sunrise', tags: ['gritty'] },
  { text: 'on the tailgate of a pickup truck', tags: ['gritty'] },
  { text: 'from a rodeo arena', tags: ['gritty'] },
  { text: 'from a construction site, hard hat under one arm', tags: ['gritty'] },
  { text: 'at a shooting range', tags: ['gritty', 'dark'] },
  { text: 'in a hospital hallway, visiting a fallen friend', tags: ['personal', 'family'] },
  { text: 'at a family cookout, kids running in the background', tags: ['family'] },
  { text: 'holding their newborn child', tags: ['family'] },
  { text: 'at their childhood home, parents standing behind them', tags: ['family'] },
  { text: 'at a Little League game, still in their gear', tags: ['family', 'comic'] },
  { text: 'at a wedding reception, uninvited', tags: ['family', 'wild'] },
  { text: 'at a funeral home, out of respect and spite in equal measure', tags: ['family', 'dark'] },
  { text: 'from a courthouse hallway', tags: ['legal'] },
  { text: 'flanked by lawyers on a courthouse staircase', tags: ['legal'] },
  { text: 'signing legal documents on live camera', tags: ['legal'] },
  { text: 'from the steps of a state capitol building', tags: ['political'] },
  { text: 'in front of a giant American flag', tags: ['political'] },
  { text: 'from a Fourth of July cookout', tags: ['political', 'family'] },
  { text: 'from a border crossing, waving a passport', tags: ['political', 'international'] },
  { text: 'from the Great White North, in front of a maple leaf flag', tags: ['international'] },
  { text: 'from a bullring in Mexico City', tags: ['international'] },
  { text: 'in front of a European cathedral', tags: ['international'] },
  { text: 'atop a mountain in the Rockies', tags: ['gritty', 'lone-wolf'] },
  { text: 'from an empty desert highway, engine idling', tags: ['lone-wolf'] },
  { text: 'from a rooftop, watching the city below', tags: ['lone-wolf', 'dark'] },
  { text: 'from a foggy pier at midnight', tags: ['lone-wolf', 'dark'] },
  { text: 'from a rundown motel room', tags: ['gritty'] },
  { text: 'from a laundromat, folding ring gear', tags: ['comic', 'gritty'] },
  { text: 'from a barbershop, mid-shave', tags: ['comic'] },
  { text: 'from a supermarket checkout line', tags: ['comic'] },
  { text: 'while walking a very small dog', tags: ['comic'] },
  { text: 'from a kids\' birthday party, wearing a party hat', tags: ['comic', 'family'] },
  { text: 'from a karaoke bar, mic already in hand', tags: ['comic'] },
  { text: 'from a bowling alley', tags: ['comic'] },
  { text: 'from a golf course, mid-swing', tags: ['lifestyle', 'comic'] },
  { text: 'from a tanning bed, sunglasses on', tags: ['comic', 'lifestyle'] },
  { text: 'from a monster truck rally', tags: ['comic', 'wild'] },
  { text: 'from a county fair, corn dog in hand', tags: ['comic'] },
  { text: 'in a training facility, sweat still dripping', tags: ['gritty', 'classic'] },
  { text: 'in a wrestling school ring in front of hungry rookies', tags: ['classic'] },
  { text: 'from the announce table, having stolen a headset', tags: ['classic'] },
  { text: 'from the timekeeper\'s chair', tags: ['classic'] },
  { text: 'in the parking lot after everyone else has gone home', tags: ['gritty'] },
  { text: 'from a tour bus rolling down the interstate', tags: ['gritty'] },
  { text: 'from an airport gate, flight delayed and patience gone', tags: ['gritty', 'comic'] },
  { text: 'from a hotel bar at last call', tags: ['personal'] },
  { text: 'from a hotel balcony overlooking the strip', tags: ['lifestyle'] },
  { text: 'from a rooftop pool party', tags: ['lifestyle', 'wild'] },
  { text: 'from a strip club parking lot', tags: ['wild'] },
  { text: 'from a nightclub VIP section', tags: ['wild', 'lifestyle'] },
  { text: 'from a recording studio booth', tags: ['lifestyle'] },
  { text: 'from a photo shoot, still in makeup', tags: ['lifestyle'] },
  { text: 'from a magazine cover shoot', tags: ['lifestyle'] },
  { text: 'from a late-night talk show green room', tags: ['lifestyle'] },
  { text: 'from a radio station booth', tags: ['classic'] },
  { text: 'crashing a rival wrestler\'s autograph signing', tags: ['wild', 'personal'] },
  { text: 'crashing the opponent\'s post-match interview', tags: ['classic', 'wild'] },
  { text: 'from the back of an ambulance, refusing the stretcher', tags: ['gritty'] },
  { text: 'from a hospital waiting room', tags: ['personal'] },
  { text: 'in front of a burned-out car', tags: ['dark', 'wild'] },
  { text: 'in front of a house with the porch light smashed out', tags: ['dark', 'wild'] },
  { text: 'from a boxing ring, gloves already laced', tags: ['gritty'] },
  { text: 'from a military base, saluting a row of soldiers', tags: ['political', 'family'] },
  { text: 'from a children\'s hospital, gift bags in hand', tags: ['family', 'moral'] },
  { text: 'from a homeless shelter, serving dinner', tags: ['moral', 'family'] },
  { text: 'from a soup kitchen line', tags: ['moral'] },
  { text: 'from a courtroom steps press gaggle', tags: ['legal'] },
  { text: 'from behind a podium at a hastily called press conference', tags: ['classic', 'legal'] },
  { text: 'in front of a promotional billboard with their own face on it', tags: ['lifestyle'] },
  { text: 'from atop a parked monster truck', tags: ['wild', 'comic'] },
  { text: 'from a farm, pitchfork resting nearby', tags: ['gritty'] },
  { text: 'from a horse stable', tags: ['gritty', 'lifestyle'] },
  { text: 'from a shooting gallery at a carnival', tags: ['comic'] },
  { text: 'from a batting cage', tags: ['comic', 'gritty'] },
  { text: 'from a driving range', tags: ['lifestyle', 'comic'] },
  { text: 'from a tattoo removal clinic waiting room', tags: ['comic', 'personal'] },
  { text: 'in a divorce lawyer\'s office', tags: ['legal', 'personal'] },
  { text: 'in front of a repossessed truck', tags: ['gritty', 'comic'] },
  { text: 'from a pawn shop counter', tags: ['gritty', 'comic'] },
  { text: 'from a used car lot, selling someone else\'s car', tags: ['comic', 'wild'] },
  { text: 'in front of their opponent\'s old high school', tags: ['personal'] },
  { text: 'in front of their own childhood gym', tags: ['personal', 'family'] },
  { text: 'from a boxing gym their father used to train at', tags: ['family', 'gritty'] },
  { text: 'from a cemetery gate, hat over their heart', tags: ['dark', 'family'] },
  { text: 'in front of a war memorial', tags: ['political'] },
  { text: 'from a fireworks stand, sparklers lit', tags: ['comic'] },
  { text: 'from a Thanksgiving dinner table, still holding a fork', tags: ['family', 'comic'] },
  { text: 'from a locker room shower, towel around their waist', tags: ['comic', 'personal'] },
  { text: 'from a sauna, sweat pouring down', tags: ['personal'] },
  { text: 'from a strip of asphalt behind the arena, engine revving', tags: ['wild'] },
  { text: 'from the top of a ring truck', tags: ['classic', 'wild'] },
  { text: 'from a talk-radio call-in segment', tags: ['classic'] },
  { text: 'from an open casket prop set up ringside', tags: ['dark', 'wild'] },
  { text: 'from a smoky pool hall', tags: ['personal'] },
  { text: 'from a shooting star trail of confetti still falling', tags: ['comic', 'lifestyle'] },
  { text: 'from an empty stadium seating bowl, alone', tags: ['lone-wolf', 'dark'] },
  { text: 'in front of a burning effigy of their opponent', tags: ['wild', 'dark'] },
];

// --- Scenarios ------------------------------------------------------------
// What the promo is actually about. `category` groups scenarios for weighting and
// target-type compatibility (some categories only make sense against a real
// wrestler; others are built for calling out the founder, the org, or a celebrity).
// `template(a, b)` returns the core quote; `a` is the speaker's name, `b` the target's.
export const PROMO_SCENARIOS = [
  // --- Pure competition / "I'm the best" ---
  { id: 'best-in-world', category: 'competition', tags: ['confidence'],
    template: (a, b) => `"${a} is the best in this business, and ${b} is about to find that out the hard way."` },
  { id: 'beat-you-before', category: 'competition', tags: ['confidence'],
    template: (a, b) => `"${a} has beaten better than ${b} on ${a}'s worst night."` },
  { id: 'no-contest', category: 'competition', tags: ['confidence'],
    template: (a, b) => `"This isn't even a contest. ${b} is a name ${a} will forget by next week."` },
  { id: 'earned-everything', category: 'competition', tags: ['confidence'],
    template: (a, b) => `"${a} earned every ounce of this spot. ${b} was just handed an opportunity."` },
  { id: 'measuring-up', category: 'competition', tags: ['confidence'],
    template: (a, b) => `"${b} doesn't measure up, and deep down, ${b} already knows it."` },
  { id: 'passing-torch', category: 'competition', tags: ['confidence'],
    template: (a, b) => `"${a} isn't passing any torch. ${b} is going to have to take it — and ${b} can't."` },
  { id: 'prove-it', category: 'competition', tags: ['confidence'],
    template: (a, b) => `"Talk is cheap. ${a} is going to prove it on ${b} in front of the whole world."` },
  { id: 'career-defining', category: 'competition', tags: ['confidence'],
    template: (a, b) => `"This match is the biggest thing to ever happen to ${b}'s career — win or lose."` },
  { id: 'disrespect', category: 'competition', tags: ['heat'],
    template: (a, b) => `"${b} disrespected ${a}, and in this business, that gets answered."` },
  { id: 'ring-general', category: 'competition', tags: ['confidence'],
    template: (a, b) => `"${b} is a fine wrestler. ${a} is a ring general. There's a difference."` },
  { id: 'underestimated', category: 'competition', tags: ['confidence'],
    template: (a, b) => `"Everyone underestimates ${a} right up until they're staring at the lights."` },
  { id: 'targeting-title', category: 'competition', tags: ['confidence'],
    template: (a, b) => `"${a} isn't chasing ${b}. ${a} is chasing that title, and ${b} is just in the way."` },
  { id: 'style-clash', category: 'competition', tags: ['confidence'],
    template: (a, b) => `"${b}'s style doesn't work on ${a}. It never has, and it never will."` },
  { id: 'been-there', category: 'competition', tags: ['veteran'],
    template: (a, b) => `"${a} has forgotten more about this business than ${b} will ever learn."` },
  { id: 'next-in-line', category: 'competition', tags: ['confidence'],
    template: (a, b) => `"There's a line to get to ${a}, and ${b} just cut right to the front of it — a mistake."` },

  // --- Personal / grudge ---
  { id: 'dont-like-you', category: 'personal', tags: ['heat'],
    template: (a, b) => `"This isn't about a match. ${a} just doesn't like ${b} — as a person."` },
  { id: 'what-you-stand-for', category: 'personal', tags: ['heat'],
    template: (a, b) => `"${a} doesn't respect what ${b} stands for, and never will."` },
  { id: 'fake-persona', category: 'personal', tags: ['heat'],
    template: (a, b) => `"Everybody sees through ${b}. That whole act is fake, and ${a} is the one calling it out."` },
  { id: 'stolen-spotlight', category: 'personal', tags: ['heat'],
    template: (a, b) => `"${b} has been stealing spotlight that belonged to ${a} for a long time."` },
  { id: 'jealous-of-you', category: 'personal', tags: ['heat'],
    template: (a, b) => `"${b} has always been jealous of ${a}, and it eats ${b} alive."` },
  { id: 'friendship-betrayed', category: 'personal', tags: ['heat'],
    template: (a, b) => `"${a} trusted ${b}. That trust is gone, and ${b} is going to pay for it."` },
  { id: 'used-to-be-friends', category: 'personal', tags: ['heat'],
    template: (a, b) => `"${a} and ${b} used to be friends. That history makes this so much easier now."` },
  { id: 'coward', category: 'personal', tags: ['heat'],
    template: (a, b) => `"${b} is a coward who has been ducking ${a} for months."` },
  { id: 'phony-tough-guy', category: 'personal', tags: ['heat'],
    template: (a, b) => `"${b} talks tough with a microphone. Let's see how tough ${b} is with the lights on."` },
  { id: 'lifelong-rivalry', category: 'personal', tags: ['heat', 'history'],
    template: (a, b) => `"${a} and ${b} have been doing this dance for years, and it ends soon."` },
  { id: 'living-rent-free', category: 'personal', tags: ['heat'],
    template: (a, b) => `"${a} lives rent-free in ${b}'s head, and it shows every single week."` },

  // --- Family / deeply personal ---
  { id: 'talked-about-family', category: 'family', tags: ['heat', 'dark'],
    template: (a, b) => `"${b} brought family into this. That was ${b}'s last mistake."` },
  { id: 'take-your-girl', category: 'family', tags: ['heat', 'dark'],
    template: (a, b) => `"${a} might just take ${b}'s girl too, since ${b} clearly can't keep her satisfied."` },
  { id: 'threaten-mother', category: 'family', tags: ['heat', 'dark'],
    template: (a, b) => `"${a} might swing by and take ${b}'s mother out to dinner — someone ought to treat her right."` },
  { id: 'father-figure', category: 'family', tags: ['dark'],
    template: (a, b) => `"${b}'s own father would be ashamed watching this."` },
  { id: 'legacy-shame', category: 'family', tags: ['dark'],
    template: (a, b) => `"${b} is a disgrace to a family name that used to mean something."` },
  { id: 'protect-my-family', category: 'family', tags: ['heroic'],
    template: (a, b) => `"${b} came after ${a}'s family, and now ${a} is coming for everything ${b} has."` },
  { id: 'kids-watching', category: 'family', tags: ['heroic'],
    template: (a, b) => `"${a}'s kids are watching this. That's exactly why ${b} needs to be taught a lesson."` },

  // --- Moral crusade / anti-hero ---
  { id: 'moral-standard', category: 'moral', tags: ['heroic'],
    template: (a, b) => `"${b} doesn't live up to any kind of standard, and somebody has to hold ${b} to one."` },
  { id: 'justice', category: 'moral', tags: ['heroic'],
    template: (a, b) => `"This isn't about a match. It's about justice, and ${b} is overdue for some."` },
  { id: 'slighted-career', category: 'moral', tags: ['brooding'],
    template: (a, b) => `"${a} has been slighted a whole career, passed over while people like ${b} got handed everything."` },
  { id: 'living-in-shadows', category: 'moral', tags: ['brooding'],
    template: (a, b) => `"${a} has lived in the shadows long enough. ${b} is about to see what steps out of them."` },
  { id: 'nobody-believed', category: 'moral', tags: ['brooding'],
    template: (a, b) => `"Nobody believed in ${a}. ${b} certainly didn't. That's about to change."` },
  { id: 'code-of-honor', category: 'moral', tags: ['heroic'],
    template: (a, b) => `"${a} still believes in a code that ${b} abandoned a long time ago."` },
  { id: 'watching-from-dark', category: 'moral', tags: ['brooding'],
    template: (a, b) => `"${b} won't see it coming. ${a} has been watching from the dark for weeks."` },
  { id: 'cleaning-house', category: 'moral', tags: ['heroic'],
    template: (a, b) => `"Somebody has to clean house around here, and ${b} is at the top of the list."` },

  // --- Conspiracy / screwjob ---
  { id: 'screwjob-conspiracy', category: 'conspiracy', tags: ['heat', 'dark'],
    template: (a, b) => `"${a} knows exactly what ${b} and the office cooked up, and it will not be forgotten."` },
  { id: 'behind-the-curtain', category: 'conspiracy', tags: ['heat'],
    template: (a, b) => `"There are things happening behind the curtain, and ${b} is right in the middle of them."` },
  { id: 'bought-opportunity', category: 'conspiracy', tags: ['heat'],
    template: (a, b) => `"${b} didn't earn this spot — ${b} bought it, or someone bought it for ${b}."` },
  { id: 'inside-job', category: 'conspiracy', tags: ['heat'],
    template: (a, b) => `"${a} has proof this was an inside job, and ${b} is not walking away clean."` },

  // --- Real-world flavor / geography ---
  { id: 'call-out-canada', category: 'geography', tags: ['heat'],
    template: (a, b) => `"${a} has a message for the whole country ${b} calls home — enjoy it while it lasts."` },
  { id: 'hometown-disrespect', category: 'geography', tags: ['heat'],
    template: (a, b) => `"${b}'s hometown should be embarrassed. ${a} is about to make sure the rest of the world is too."` },
  { id: 'foreign-menace', category: 'geography', tags: ['heat'],
    template: (a, b) => `"${b} doesn't belong on this show, in this country, or in this ring."` },

  // --- Lifestyle / playboy / outsider flavor ---
  { id: 'stole-your-girl', category: 'lifestyle', tags: ['heat', 'wild'],
    template: (a, b) => `"${a} met somebody very close to ${b} last night. ${b} really should call more often."` },
  { id: 'party-lifestyle', category: 'lifestyle', tags: ['confidence'],
    template: (a, b) => `"While ${b} was training, ${a} was living — and ${a} is still going to win."` },
  { id: 'outsider-code', category: 'lifestyle', tags: ['heat'],
    template: (a, b) => `"${a} doesn't answer to this locker room, this office, or ${b}."` },
  { id: 'living-good', category: 'lifestyle', tags: ['confidence'],
    template: (a, b) => `"${a} is living better than ${b} ever will, on ${b}'s worst day."` },

  // --- Founder / player callouts ---
  { id: 'call-out-founder-payday', category: 'founder', tags: ['heat'],
    template: (a, org) => `"${a} wants a word with the founder of ${org}. It's time to talk about a raise."` },
  { id: 'call-out-founder-respect', category: 'founder', tags: ['heat'],
    template: (a, org) => `"The person running ${org} doesn't respect what ${a} does around here. That changes tonight."` },
  { id: 'call-out-founder-booking', category: 'founder', tags: ['heat'],
    template: (a, org) => `"${a} wants to know exactly why the boss keeps booking ${a} like an afterthought."` },
  { id: 'call-out-founder-loyalty', category: 'founder', tags: ['heat'],
    template: (a, org) => `"${a} has been loyal to ${org} since day one. It's time the person signing the checks noticed."` },

  // --- Organization callouts ---
  { id: 'call-out-org-direction', category: 'organization', tags: ['heat'],
    template: (a, org) => `"${org} is being run into the ground, and ${a} is the only one willing to say it out loud."` },
  { id: 'call-out-org-locker-room', category: 'organization', tags: ['heat'],
    template: (a, org) => `"This locker room, this whole ${org} operation, doesn't appreciate ${a} yet. It will."` },
  { id: 'call-out-org-changes', category: 'organization', tags: ['heat'],
    template: (a, org) => `"${org} needs to change, starting with how ${a} gets treated around here."` },

  // --- Celebrity / real-world figure callouts (rare, flavor-only) ---
  { id: 'call-out-celebrity', category: 'celebrity', tags: ['wild'],
    template: (a, b) => `"${a} has a message for ${b}: stick to the day job, because this ring is not a photo op."` },
  { id: 'call-out-president', category: 'political', tags: ['wild'],
    template: (a, b) => `"${a} has a message for the President of the United States: come see a real fight sometime."` },
  { id: 'call-out-everybody', category: 'organization', tags: ['heat', 'wild'],
    template: (a, org) => `"${a} isn't calling out one person. ${a} is calling out everybody in ${org}, top to bottom."` },
];

// --- Persona packs ---------------------------------------------------------
// Archetype packs are shared flavor pools any wrestler can draw from. Bespoke
// wrestler entries layer on top: extra scenario weight toward certain categories,
// specific rival ids that get bonus weight as promo targets, and a couple of
// signature lines that can be appended after the scenario quote.
export const PROMO_ARCHETYPES = {
  playboy: {
    label: 'Playboy',
    categoryWeights: { lifestyle: 3, family: 1.5, personal: 1.5 },
    settingTags: ['lifestyle', 'wild', 'personal'],
  },
  outsider: {
    label: 'Outsider',
    categoryWeights: { lifestyle: 2, personal: 1.5, organization: 1.5 },
    settingTags: ['wild', 'lifestyle', 'gritty'],
  },
  'lone-wolf': {
    label: 'Lone Wolf',
    categoryWeights: { moral: 3, personal: 1.5 },
    settingTags: ['lone-wolf', 'dark'],
  },
  'moral-crusader': {
    label: 'Moral Crusader',
    categoryWeights: { moral: 3, family: 1.5, political: 1.2 },
    settingTags: ['moral', 'political', 'family'],
  },
  'veteran-legend': {
    label: 'Veteran Legend',
    categoryWeights: { competition: 2, organization: 1.5 },
    settingTags: ['classic', 'gritty'],
  },
  monster: {
    label: 'Monster',
    categoryWeights: { competition: 2.5, personal: 1 },
    settingTags: ['dark', 'gritty'],
  },
  underdog: {
    label: 'Underdog',
    categoryWeights: { competition: 2, moral: 1.5 },
    settingTags: ['gritty', 'family'],
  },
  'mic-work': {
    label: 'Showman',
    categoryWeights: { personal: 1.5, lifestyle: 1.5, organization: 1.2 },
    settingTags: ['lifestyle', 'classic'],
  },
  'family-legacy': {
    label: 'Family Legacy',
    categoryWeights: { family: 2.5, competition: 1.3 },
    settingTags: ['family', 'classic'],
  },
  'blood-feud-ready': {
    label: 'Blood Feud',
    categoryWeights: { personal: 2.5, conspiracy: 1.5 },
    settingTags: ['gritty', 'dark', 'wild'],
  },
  'cult-following': {
    label: 'Cult Favorite',
    categoryWeights: { moral: 1.5, lifestyle: 1.3 },
    settingTags: ['comic', 'gritty'],
  },
};

// Bespoke packs for marquee names. Anyone not listed here falls back to
// archetypes inferred from their chemistryTags/style/alignment (see promoEngine.js).
export const WRESTLER_PERSONAS = {
  'shawn-michaels': {
    archetypes: ['playboy', 'mic-work'],
    rivals: ['bret-hart', 'diesel', 'razor-ramon'],
    signatureLines: [
      '"Somebody call Canada and tell them the Heartbreak Kid says hello."',
      '"Everybody in this business would kill to be as good as Shawn Michaels — and it still isn\'t enough for them to trust him."',
      '"There\'s a reason they call this The Kid — the boyhood dream never got old."',
    ],
  },
  'bret-hart': {
    archetypes: ['family-legacy', 'veteran-legend'],
    rivals: ['shawn-michaels', 'owen-hart', 'diesel'],
    signatureLines: [
      '"The best there is, the best there was, and the best there ever will be doesn\'t need to shout about it."',
      '"Excellence of execution isn\'t a slogan for the Hitman — it\'s a promise."',
    ],
  },
  'owen-hart': {
    archetypes: ['family-legacy', 'blood-feud-ready'],
    rivals: ['bret-hart', 'british-bulldog'],
    signatureLines: [
      '"Everyone loves Bret Hart. Nobody ever asks what it cost to grow up in his shadow."',
    ],
  },
  sting: {
    archetypes: ['lone-wolf', 'moral-crusader'],
    rivals: ['ric-flair', 'undertaker', 'vader'],
    signatureLines: [
      '"Sting doesn\'t answer to a locker room that never had his back to begin with."',
      '"Somewhere along the way, the people running this business forgot what it means to earn something."',
    ],
  },
  diesel: {
    archetypes: ['outsider', 'monster'],
    rivals: ['shawn-michaels', 'bret-hart', 'razor-ramon'],
    signatureLines: [
      '"Big Daddy Cool doesn\'t need this office\'s permission to do anything."',
    ],
  },
  'razor-ramon': {
    archetypes: ['outsider', 'playboy'],
    rivals: ['diesel', 'shawn-michaels'],
    signatureLines: [
      '"Say hello to the bad guy — the toothpick stays, the attitude stays, and the Edge stays undefeated."',
    ],
  },
  'ric-flair': {
    archetypes: ['playboy', 'veteran-legend', 'mic-work'],
    rivals: ['sting', 'randy-savage', 'arn-anderson'],
    signatureLines: [
      '"Stylin\', profilin\', limousine-riding, jet-flying — and still the dirtiest player in the game."',
      '"To be the man, you\'ve got to beat the man, and that has not changed in sixteen years."',
    ],
  },
  'hulk-hogan': {
    archetypes: ['veteran-legend', 'moral-crusader'],
    rivals: ['randy-savage', 'the-giant'],
    signatureLines: [
      '"Say your prayers, take your vitamins, and believe — because the Hulkster always does, brother."',
    ],
  },
  'randy-savage': {
    archetypes: ['mic-work', 'family-legacy'],
    rivals: ['ric-flair', 'hulk-hogan'],
    signatureLines: [
      '"Ohhh yeah, dig it — the Macho Man doesn\'t need a microphone check, he IS the microphone check."',
    ],
  },
  mankind: {
    archetypes: ['monster', 'cult-following'],
    rivals: ['undertaker', 'vader'],
    signatureLines: [
      '"Have a nice day — because after tonight, somebody\'s isn\'t going to be very nice at all."',
    ],
  },
  undertaker: {
    archetypes: ['monster', 'moral-crusader'],
    rivals: ['mankind', 'vader', 'sting'],
    signatureLines: [
      '"Rest in peace has never been a threat. It has always been a promise."',
    ],
  },
  vader: {
    archetypes: ['monster', 'veteran-legend'],
    rivals: ['undertaker', 'mankind', 'sting'],
    signatureLines: [
      '"Mastodon doesn\'t do warnings. Mastodon does damage."',
    ],
  },
  'steve-austin': {
    archetypes: ['blood-feud-ready', 'outsider'],
    rivals: ['bret-hart'],
    signatureLines: [
      '"Stunning doesn\'t owe this office an explanation, and Stunning definitely doesn\'t owe one to a chip on somebody\'s shoulder."',
    ],
  },
  'the-rock': {
    archetypes: ['mic-work', 'playboy'],
    rivals: ['triple-h', 'chris-jericho'],
    signatureLines: [
      '"It doesn\'t matter what anybody thinks — The Rock says so, and The Rock is never wrong."',
      '"Finally, The Rock has come back, and The Rock has a lot of catching up to do."',
      '"The Rock doesn\'t care what your name is, what your team is, or what your smell is."',
      '"Know your role, lay the smackdown, and if you smell what The Rock is cooking, get out of the way."',
    ],
  },
  'john-cena': {
    archetypes: ['mic-work', 'moral-crusader'],
    rivals: ['randy-orton', 'edge'],
    signatureLines: [
      '"Hustle, loyalty, respect — that\'s not a slogan, that\'s the whole résumé."',
      '"John Cena has granted more wishes for sick kids than anybody in this building has granted opportunities."',
      '"Cheap heat gets a cheap freestyle in return — John Cena is always ready to spit one."',
      '"You can\'t see him, and by the sound of it, you\'ll never catch him either."',
    ],
  },
  'randy-orton': {
    archetypes: ['monster', 'blood-feud-ready'],
    rivals: ['john-cena', 'triple-h'],
    signatureLines: [
      '"Randy Orton has fought battles that never made a highlight reel, and came out the other side meaner."',
      '"This is Randy Orton\'s ring, and everybody else is just renting space in it."',
      '"That RKO comes out of absolutely nowhere — ask anybody who has eaten one."',
    ],
  },
  goldberg: {
    archetypes: ['monster'],
    rivals: ['the-giant', 'hulk-hogan'],
    signatureLines: [
      '"Goldberg doesn\'t need a build. Spear, Jackhammer, next."',
      '"Somebody wants to know who\'s next? Goldberg is standing right here."',
    ],
  },
  'cm-punk': {
    archetypes: ['mic-work', 'cult-following'],
    rivals: [],
    signatureLines: [
      '"CM Punk is the best in the world, and this whole company knows it whether they say it out loud or not."',
      '"This is a worked-shoot pipe bomb, and everybody in the back is about to get named."',
      '"Straight edge, clear head, and still smarter than everyone signing these paychecks."',
    ],
  },
  'booker-t': {
    archetypes: ['mic-work'],
    rivals: [],
    signatureLines: [
      '"Book Em, Danno — that\'s the whole match plan."',
      '"Five-time, five-time, five-time — and counting."',
    ],
  },
  'brock-lesnar': {
    archetypes: ['monster'],
    rivals: [],
    signatureLines: [
      '"Brock Lesnar isn\'t here to wrestle a match. He\'s here to conquer somebody\'s whole night."',
      '"Welcome to Suplex City — population whoever is standing across the ring."',
    ],
  },
  batista: {
    archetypes: ['monster'],
    rivals: [],
    signatureLines: [
      '"The Animal doesn\'t need a pack. The Animal just needs a reason."',
    ],
  },
  'bray-wyatt': {
    archetypes: ['cult-following', 'moral-crusader'],
    rivals: [],
    signatureLines: [
      '"Run, tell everybody — the buzzards are already circling this one."',
      '"He\'s got the whole family behind him, and the whole family follows the buzzards."',
      '"Bray Wyatt sees everybody\'s sins clear as day, even the ones nobody has confessed yet."',
    ],
  },
  'mike-tyson': {
    archetypes: ['monster', 'outsider'],
    rivals: [],
    signatureLines: [
      '"Iron Mike doesn\'t do warnings. Iron Mike does a straight right hand and a quiet room."',
      '"Everybody has a plan until they\'re standing across from Mike Tyson."',
    ],
  },
  'dennis-rodman': {
    archetypes: ['playboy', 'outsider'],
    rivals: [],
    signatureLines: [
      '"The Worm doesn\'t need a scouting report. The Worm needs a party and a reason to show up late."',
      '"Nobody in this building lives louder than Dennis Rodman, and everybody already knows it."',
    ],
  },
};

export function getPersonaFor(id) {
  return WRESTLER_PERSONAS[id] || null;
}

// Flat fee to bring a second wrestler onto the mic for a joint promo.
export const PROMO_PARTNER_FEE = 15000;
