// Monthly "chance cards". One is drawn after the story promo each month.
//
// needs: who the one-off event is about.
//   'any'      — {a} is any signed wrestler (booked talent favoured).
//   'pair'     — {a} and {b} are two different signed wrestlers.
//   'noStory'  — neither wrestler has played a Promo card this show; this becomes history.
//   'hasStory' — a Promo card was played for this pair; the event adds match hype.
//
// effect ranges are [min, max]. Stat changes pick random in-ring stats.
//   statDrop / statGain: [count, min, max]   stamina / staminaB / morale / moraleB / pop / popB / cash: [min, max]
//   momentum: n   story: { title, description }   storyHeat: [min, max]

export const RANDOM_EVENT_CARDS = [
  // --- Injuries & wear -------------------------------------------------------
  { id: 'knee-tweak', kind: 'injury', title: 'Injury Scare', needs: 'any', text: '{a} tweaked a knee taking a bad bump in training. They will work through it, but they are not 100%.', effect: { statDrop: [2, 1, 3], stamina: [-25, -20] } },
  { id: 'shoulder', kind: 'injury', title: 'Bad Shoulder', needs: 'any', text: '{a} landed wrong at a spot show in the Carolinas and the shoulder has not felt right since.', effect: { statDrop: [1, 2, 3], stamina: [-20, -15] } },
  { id: 'back-spasms', kind: 'injury', title: 'Back Spasms', needs: 'any', text: '{a} spent two days flat on a motel floor with back spasms.', effect: { statDrop: [1, 1, 2], stamina: [-30, -20] } },
  { id: 'rental-car', kind: 'injury', title: 'Fender Bender', needs: 'any', text: '{a} rear-ended a pickup on the interstate. Nobody was hurt badly, but the neck is stiff.', effect: { statDrop: [1, 1, 2], stamina: [-15, -10], morale: [-8, -4] } },
  { id: 'broken-nose', kind: 'injury', title: 'Broken Nose', needs: 'pair', text: '{b} caught {a} with a stiff forearm at a house show and broke their nose.', effect: { stamina: [-15, -10], moraleB: [-6, -3], morale: [-10, -6] } },
  { id: 'food-poisoning', kind: 'injury', title: 'Truck-Stop Special', needs: 'any', text: '{a} ate gas-station sushi. It went about how you would expect.', effect: { stamina: [-35, -25] } },
  { id: 'gym-overdo', kind: 'injury', title: 'Overtrained', needs: 'any', text: '{a} tried to add fifty pounds to the bench overnight and tore something small but annoying.', effect: { statDrop: [1, 2, 2], stamina: [-15, -10] } },
  { id: 'ankle-roll', kind: 'injury', title: 'Rolled Ankle', needs: 'any', text: '{a} rolled an ankle coming off the top rope at a Tuesday-night show in front of 200 people.', effect: { statDrop: [1, 1, 3], stamina: [-20, -15] } },
  { id: 'flu', kind: 'injury', title: 'Locker Room Flu', needs: 'pair', text: 'A flu tore through the locker room. {a} and {b} got the worst of it.', effect: { stamina: [-25, -15], staminaB: [-25, -15] } },
  { id: 'concussion-scare', kind: 'injury', title: 'Concussion Scare', needs: 'any', text: '{a} took a chair shot wrong and could not remember the drive home.', effect: { statDrop: [2, 1, 2], stamina: [-25, -20], morale: [-6, -3] } },

  // --- Getting better --------------------------------------------------------
  { id: 'old-trainer', kind: 'growth', title: 'Back to the Dungeon', needs: 'any', text: '{a} spent a week back at their old trainer\'s basement ring and came back sharper.', effect: { statGain: [1, 1, 2] } },
  { id: 'japan-tour', kind: 'growth', title: 'Tour of Japan', needs: 'any', text: '{a} worked a short tour of Japan and came home with a stiffer, crisper style.', effect: { statGain: [2, 1, 2], stamina: [-10, -5] } },
  { id: 'mexico-tour', kind: 'growth', title: 'Lucha Education', needs: 'any', text: '{a} spent a week in Mexico City learning to fly. Mostly they learned to land.', effect: { statGain: [1, 2, 3], stamina: [-10, -5] } },
  { id: 'veteran-advice', kind: 'growth', title: 'Veteran Wisdom', needs: 'pair', text: '{b} pulled {a} aside after a house show and walked them through the whole match, spot by spot.', effect: { statGain: [1, 1, 2], morale: [4, 8] } },
  { id: 'cardio', kind: 'growth', title: 'Cardio Kick', needs: 'any', text: '{a} started running stairs at the local high school at 5 a.m.', effect: { statGain: [1, 1, 1], stamina: [10, 20] } },
  { id: 'acting-class', kind: 'growth', title: 'Acting Class', needs: 'any', text: '{a} signed up for a community-theatre acting class. The promos are noticeably better.', effect: { statGain: [1, 1, 2], pop: [1, 3] } },
  { id: 'diet', kind: 'growth', title: 'Clean Eating', needs: 'any', text: '{a} cut out fast food entirely and looks like a new person.', effect: { statGain: [1, 1, 1], stamina: [5, 15] } },
  { id: 'film-study', kind: 'growth', title: 'Tape Study', needs: 'any', text: '{a} borrowed a stack of old territory tapes and studied them every night.', effect: { statGain: [1, 1, 2] } },

  // --- Good weeks ------------------------------------------------------------
  { id: 'kids-clinic', kind: 'morale', title: 'Feel-Good Week', needs: 'any', text: '{a} ran a free kids\' clinic back home and the local paper ate it up.', effect: { morale: [15, 25], pop: [1, 2] } },
  { id: 'fan-letter', kind: 'morale', title: 'Fan Mail', needs: 'any', text: '{a} got a handwritten letter from a young fan. It is taped inside their locker now.', effect: { morale: [12, 20] } },
  { id: 'family-time', kind: 'morale', title: 'Home for a Few Days', needs: 'any', text: '{a} finally got a few days at home with the family.', effect: { morale: [15, 22], stamina: [10, 15] } },
  { id: 'new-baby', kind: 'morale', title: 'Proud Parent', needs: 'any', text: '{a} became a parent this week. Cigars all around in the locker room.', effect: { morale: [20, 28] } },
  { id: 'road-buddies', kind: 'morale', title: 'Road Buddies', needs: 'pair', text: '{a} and {b} started carpooling between towns and became fast friends.', effect: { morale: [8, 14], moraleB: [8, 14] } },
  { id: 'card-game', kind: 'morale', title: 'Big Night at Poker', needs: 'pair', text: '{a} cleaned out {b} at the locker-room poker game.', effect: { morale: [10, 15], moraleB: [-8, -4] } },
  { id: 'fishing-trip', kind: 'morale', title: 'Gone Fishing', needs: 'pair', text: '{a} and {b} spent their day off on a lake. Nobody caught anything. Everyone came back happy.', effect: { morale: [8, 12], moraleB: [8, 12], stamina: [5, 10] } },
  { id: 'hometown-pop', kind: 'morale', title: 'Hometown Hero', needs: 'any', text: '{a} worked a spot show in their hometown and got a standing ovation.', effect: { morale: [12, 18], pop: [2, 4] } },
  { id: 'raise-rumor', kind: 'morale', title: 'Good Word from Upstairs', needs: 'any', text: 'Someone told {a} the office is "very happy" with them. They have not stopped smiling.', effect: { morale: [10, 16] } },
  { id: 'charity', kind: 'morale', title: 'Hospital Visit', needs: 'any', text: '{a} spent an afternoon at a children\'s hospital. It made the six o\'clock news.', effect: { morale: [10, 15], pop: [2, 4] } },

  // --- Bad weeks -------------------------------------------------------------
  { id: 'airport', kind: 'setback', title: 'Rough Week on the Road', needs: 'any', text: '{a} had three flights cancelled and slept in an airport.', effect: { morale: [-16, -10], stamina: [-10, -5] } },
  { id: 'no-heat', kind: 'setback', title: 'Cold Snap', needs: 'any', text: '{a} got a rental car with no heat in the middle of a cold snap.', effect: { morale: [-12, -8] } },
  { id: 'written-off', kind: 'setback', title: 'Rumour Mill', needs: 'any', text: '{a} heard a rumour they were being written off TV.', effect: { morale: [-18, -12] } },
  { id: 'locker-prank', kind: 'setback', title: 'Rib Gone Wrong', needs: 'pair', text: '{b} filled {a}\'s boots with shaving cream. {a} did not find it funny.', effect: { morale: [-12, -6], moraleB: [3, 6] } },
  { id: 'paycheck', kind: 'setback', title: 'Bounced Cheque', needs: 'any', text: 'A payoff cheque bounced on {a} at a bank in Tulsa. The office fixed it. The embarrassment stuck.', effect: { morale: [-14, -8] } },
  { id: 'tax-man', kind: 'setback', title: 'Audit', needs: 'any', text: 'The IRS wants to talk to {a} about "creative" travel deductions.', effect: { morale: [-15, -10] } },
  { id: 'heat-backstage', kind: 'setback', title: 'Heat Backstage', needs: 'pair', text: '{a} got into a shouting match with {b} over who was stealing spots.', effect: { morale: [-10, -6], moraleB: [-10, -6] } },

  // --- Buzz & hype -----------------------------------------------------------
  { id: 'radio', kind: 'hype', title: 'Buzz Is Building', needs: 'any', text: '{a} called into a late-night radio show and the tape is making the rounds.', effect: { pop: [4, 8], momentum: 1 } },
  { id: 'newsletter', kind: 'hype', title: 'Newsletter Darling', needs: 'any', text: 'A wrestling newsletter named {a} "the one to watch in \'96".', effect: { pop: [4, 7], momentum: 1 } },
  { id: 'car-dealer', kind: 'hype', title: 'Local Celebrity', needs: 'any', text: '{a} cut a promo at a car dealership opening that somehow made the evening news.', effect: { pop: [3, 6] } },
  { id: 'talk-show', kind: 'hype', title: 'Daytime TV', needs: 'any', text: '{a} showed up on a daytime talk show and stole the whole episode.', effect: { pop: [6, 10], momentum: 1, morale: [5, 8] } },
  { id: 'movie-cameo', kind: 'hype', title: 'Movie Cameo', needs: 'any', text: '{a} landed a two-line role as "Bouncer #2" in a straight-to-video action movie.', effect: { pop: [5, 9], morale: [6, 10] } },
  { id: 'magazine', kind: 'hype', title: 'Magazine Cover', needs: 'any', text: '{a} made the cover of a newsstand wrestling magazine.', effect: { pop: [5, 8], momentum: 1 } },
  { id: 'arcade', kind: 'hype', title: 'Video Game Deal', needs: 'any', text: '{a} was scanned in for an arcade wrestling game. Kids are already fighting over who plays them.', effect: { pop: [4, 7], cash: [2000, 4000] } },
  { id: 'merch', kind: 'hype', title: 'Shirt Sells Out', needs: 'any', text: '{a}\'s new t-shirt sold out at every show this week.', effect: { pop: [2, 4], cash: [3000, 6000] } },

  // --- Embarrassments --------------------------------------------------------
  { id: 'botched-interview', kind: 'setback', title: 'Blown Interview', needs: 'any', text: '{a} froze during a live local-news interview and just said "yeah" eleven times.', effect: { pop: [-5, -3], morale: [-8, -4] } },
  { id: 'caught-smiling', kind: 'setback', title: 'Kayfabe Broken', needs: 'pair', text: 'A fan snapped a photo of {a} and {b} laughing together at a diner. The heel/face magic took a hit.', effect: { pop: [-4, -2], popB: [-4, -2] } },
  { id: 'no-show', kind: 'setback', title: 'Missed the Show', needs: 'any', text: '{a} overslept and missed a sold-out spot show. The fans let the office know.', effect: { pop: [-5, -3], morale: [-6, -3], cash: [-3000, -1500] } },
  { id: 'bar-fight', kind: 'setback', title: 'Bar Fight', needs: 'any', text: '{a} got into it with a local tough guy at a bar. It made the police blotter.', effect: { pop: [-3, 3], morale: [-6, -2], cash: [-2500, -1000] } },

  // --- Rest & recovery -------------------------------------------------------
  { id: 'hot-springs', kind: 'morale', title: 'Hot Springs', needs: 'any', text: '{a} found a hot spring outside Denver and soaked for two days straight.', effect: { stamina: [25, 35], morale: [5, 10] } },
  { id: 'chiropractor', kind: 'morale', title: 'Miracle Chiropractor', needs: 'any', text: '{a} found a chiropractor in Omaha who fixed a decade of bumps in one session.', effect: { stamina: [20, 30] } },
  { id: 'off-week', kind: 'morale', title: 'Unexpected Week Off', needs: 'any', text: 'A building fell through and {a} got an unexpected week at home.', effect: { stamina: [20, 30], morale: [6, 10] } },

  // --- Played Promo gets extra hype -----------------------------------------
  { id: 'security-pull', kind: 'storyline', title: 'The Story Spills Over', needs: 'hasStory', text: '{a} and {b} had to be pulled apart by security at a house show.', effect: { storyHeat: [10, 16] } },
  { id: 'autograph', kind: 'storyline', title: 'Uninvited Guest', needs: 'hasStory', text: '{a} showed up uninvited at {b}\'s autograph signing. It did not go well.', effect: { storyHeat: [10, 15] } },
  { id: 'lobby', kind: 'storyline', title: 'Hotel Lobby Ambush', needs: 'hasStory', text: '{b} blindsided {a} in a hotel lobby and the story spread fast.', effect: { storyHeat: [12, 18] } },
  { id: 'radio-callout', kind: 'storyline', title: 'On-Air Call-Out', needs: 'hasStory', text: '{a} called {b} a coward on a morning-zoo radio show.', effect: { storyHeat: [8, 14], pop: [1, 3] } },

  // --- New one-off Promo history --------------------------------------------
  { id: 'parking-lot', kind: 'new-story', title: 'Parking Lot Brawl', needs: 'noStory', text: '{a} and {b} got into a real scrap in the arena parking lot. Fans filmed it.', effect: { story: { title: 'The Parking Lot', description: '{a} and {b} took a disagreement outside the building, and the tape got out.' }, pop: [1, 3] } },
  { id: 'stolen-gear', kind: 'new-story', title: 'Stolen Gear', needs: 'noStory', text: '{a}\'s signature jacket went missing. It turned up in {b}\'s bag.', effect: { story: { title: 'Who Took the Jacket?', description: '{a} found their stolen gear in {b}\'s bag and wants answers.' } } },
  { id: 'sucker-punch', kind: 'new-story', title: 'Sucker Punch', needs: 'noStory', text: '{b} sucker-punched {a} at a spot show for no reason anyone can figure out.', effect: { story: { title: 'Out of Nowhere', description: '{b} attacked {a} without warning. {a} wants to know why.' }, morale: [-4, -2] } },
  { id: 'interview-insult', kind: 'new-story', title: 'Cheap Shot on the Mic', needs: 'noStory', text: '{b} called {a} "a glorified jobber" in a newsletter interview.', effect: { story: { title: 'Glorified Jobber', description: '{b} went public with what they think of {a}. {a} read every word.' }, morale: [-6, -3] } },
  { id: 'ex-partner', kind: 'new-story', title: 'Old Tag Partners', needs: 'noStory', text: '{a} and {b} used to team in the territories. Someone brought up how that team ended.', effect: { story: { title: 'Unfinished Business', description: 'Years ago {a} and {b} split in the territories. Neither ever got over it.' } } },
  { id: 'girlfriend', kind: 'new-story', title: 'Personal Matter', needs: 'noStory', text: 'Rumour has it {b} has been seeing {a}\'s ex. The locker room is buzzing.', effect: { story: { title: 'It\'s Personal', description: '{a} found out about {b} and their ex. This one stopped being business.' } } },
  { id: 'car-keyed', kind: 'new-story', title: 'Keyed Car', needs: 'noStory', text: 'Somebody keyed {a}\'s brand-new Camaro. {a} is sure it was {b}.', effect: { story: { title: 'The Camaro', description: '{a} blames {b} for the scratch down the side of their pride and joy.' } } },
  { id: 'dressing-room', kind: 'new-story', title: 'Dressing Room Politics', needs: 'noStory', text: '{b} got {a} bumped from the good dressing room. It was a whole thing.', effect: { story: { title: 'Pecking Order', description: '{b} has been politicking {a} down the card, and {a} has noticed.' }, morale: [-6, -3] } },
  { id: 'training-injury', kind: 'new-story', title: 'Careless Partner', needs: 'noStory', text: '{b} dropped {a} on their head in a practice ring. {a} does not think it was an accident.', effect: { story: { title: 'Accident?', description: '{a} is convinced {b} hurt them on purpose in training.' }, stamina: [-10, -5] } },
  { id: 'hometown-rival', kind: 'new-story', title: 'Same Hometown', needs: 'noStory', text: 'A local paper ran a piece asking who the real pride of town is: {a} or {b}.', effect: { story: { title: 'Pride of the City', description: 'A newspaper poll pitted {a} against {b}. Both want the crown.' }, pop: [1, 3] } },
  { id: 'trainer-feud', kind: 'new-story', title: 'Rival Schools', needs: 'noStory', text: '{a} and {b} came out of rival wrestling schools. Their trainers hated each other, and now so do they. The rivalry fires up both wrestlers.', effect: { momentum: 1, momentumB: 1, story: { title: 'Rival Schools', description: '{a} and {b} are carrying on a feud their trainers started twenty years ago.' } } },
  { id: 'spot-stolen', kind: 'new-story', title: 'Stolen Finisher', needs: 'noStory', text: '{b} started using a move that looks a lot like {a}\'s finisher.', effect: { story: { title: 'That\'s My Move', description: '{a} says {b} stole their finisher. {b} says {a} never owned it.' } } },
  { id: 'bet', kind: 'new-story', title: 'A Friendly Bet', needs: 'noStory', text: '{a} bet {b} a month\'s pay that they could beat them in under five minutes.', effect: { story: { title: 'The Bet', description: '{a} put money on it: they can beat {b} fast. {b} took the bet.' } } },
  { id: 'arm-wrestle', kind: 'new-story', title: 'Arm-Wrestling Match', needs: 'noStory', text: 'A bar arm-wrestling contest between {a} and {b} ended with a broken table and a grudge.', effect: { story: { title: 'Who\'s Stronger', description: '{a} and {b} could not settle it at the bar. They will settle it in the ring.' } } },
  { id: 'mentor', kind: 'new-story', title: 'Taken Under Their Wing', needs: 'noStory', text: '{b} offered to mentor {a}. {a} is flattered. The locker room is suspicious.', effect: { story: { title: 'The Mentor', description: '{b} has taken {a} under their wing. Nobody is sure what {b} wants in return.' }, morale: [4, 8] } },
  { id: 'fan-poll', kind: 'new-story', title: 'Fan Poll', needs: 'noStory', text: 'A fan-club poll named {a} more popular than {b}. {b} did not take it well.', effect: { story: { title: 'The Poll', description: '{b} cannot stand that the fans picked {a}. They plan to prove the poll wrong.' }, pop: [2, 4] } },
  { id: 'wrong-hotel', kind: 'new-story', title: 'Wrong Hotel Room', needs: 'noStory', text: 'A hotel mix-up put {a} and {b} in the same room for a week. It did not go well.', effect: { story: { title: 'Roommates', description: 'A week sharing a room turned {a} and {b} into enemies.' } } },
  { id: 'phone-call', kind: 'new-story', title: 'Late-Night Phone Call', needs: 'noStory', text: '{b} called {a} at 3 a.m. and just breathed into the phone. At least, {a} is pretty sure it was {b}.', effect: { story: { title: 'Mind Games', description: '{b} has been getting inside {a}\'s head, one late-night phone call at a time.' }, morale: [-6, -3] } },
  { id: 'debt', kind: 'new-story', title: 'Old Debt', needs: 'noStory', text: '{a} lent {b} $2,000 back in \'91. {a} has decided it is time to collect.', effect: { story: { title: 'Pay Up', description: '{b} owes {a} money, and {a} is done waiting.' } } },
  { id: 'crowd-favorite', kind: 'new-story', title: 'Crowd Chooses Sides', needs: 'noStory', text: 'At a house show the crowd started chanting for {a} during {b}\'s match.', effect: { story: { title: 'Upstaged', description: 'The fans chanted {a}\'s name in the middle of {b}\'s match. {b} heard every word.' }, pop: [2, 3] } },
  { id: 'wedding', kind: 'new-story', title: 'Wedding Crasher', needs: 'noStory', text: '{b} showed up drunk at {a}\'s wedding reception and knocked over the cake.', effect: { story: { title: 'The Cake', description: '{b} ruined {a}\'s wedding. {a} has not forgotten.' }, morale: [-8, -4] } },
  { id: 'benefit-show', kind: 'new-story', title: 'Benefit Show Showdown', needs: 'noStory', text: 'At a charity benefit show, {a} and {b} had a match so good the promoter begged for a rematch.', effect: { story: { title: 'Instant Classic', description: '{a} and {b} tore the house down at a benefit show. Everyone wants a sequel.' }, pop: [2, 4] } },
  { id: 'jealousy', kind: 'new-story', title: 'Green With Envy', needs: 'noStory', text: '{b} saw {a}\'s payoff envelope and has been sulking about it ever since.', effect: { story: { title: 'Money Talks', description: '{b} thinks {a} is overpaid, and has started saying so to anyone who will listen.' } } },
  { id: 'saved', kind: 'new-story', title: 'Saved in a Brawl', needs: 'noStory', text: '{b} jumped in to save {a} from a mob of rowdy fans. {a} owes them one.', effect: { story: { title: 'Owe You One', description: '{b} had {a}\'s back in a crowd brawl. Now {b} wants something back.' }, morale: [4, 8] } },
  { id: 'impersonation', kind: 'new-story', title: 'Impression Gone Wrong', needs: 'noStory', text: '{b} did a mocking impression of {a} on the bus. Everyone laughed except {a}.', effect: { story: { title: 'The Impression', description: '{b} made {a} the butt of the joke. {a} is not laughing.' }, morale: [-5, -2] } },
];
