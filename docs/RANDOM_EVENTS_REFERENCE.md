# Random Events Reference

The game has 79 random-event cards. One is scheduled each month after the story-promo phase, 4-12 days before the PPV. The selected event resolves automatically when its calendar date is reached; there is no accept/decline choice. The result modal has a Continue button.

## Targeting and Effects

- `any`: one signed wrestler is selected. If booked wrestlers are available, they are favored 60% of the time.
- `pair`: selects A with the same booked-wrestler preference, then a different signed wrestler for B.
- `noStory`: A must have no active storyline; B prefers another wrestler without an active storyline when possible. These events start a custom storyline owned by A.
- `hasStory`: selects an active storyline involving roster members, favoring stories with a booked wrestler. These events add heat to the existing story.
- The resolver tries up to 25 random card/cast combinations. If no card can be assigned, the event is silently resolved without a modal.
- All numeric ranges are inclusive. Random stat changes affect Strength, Agility, Technique, Toughness, and Charisma; Stamina is separate. A and B refer to the selected participants.
- New-story events create a custom angle at 18 heat. Existing-story events increase angle heat by the listed range. Money changes are rounded to the nearest $100.
- Events marked `injury` are flavor/category labels; their effects do not by themselves create a formal injury record.

## Injury and Wear (10)

| Event | Target | Scenario | Effects |
| --- | --- | --- | --- |
| Injury Scare | any | A tweaked a knee on a bad training bump. | 2 random stats -1 to -3 each; A Stamina -20 to -25. |
| Bad Shoulder | any | A's shoulder has not felt right since a bad landing at a spot show. | 1 random stat -2 to -3; A Stamina -15 to -20. |
| Back Spasms | any | A spent two days flat on a motel floor with back spasms. | 1 random stat -1 to -2; A Stamina -20 to -30. |
| Fender Bender | any | A rear-ended a pickup; nobody was badly hurt, but A's neck is stiff. | 1 random stat -1 to -2; A Stamina -10 to -15; A morale -4 to -8. |
| Broken Nose | pair | B broke A's nose with a stiff forearm at a house show. | A Stamina -10 to -15; A morale -6 to -10; B morale -3 to -6. |
| Truck-Stop Special | any | A ate gas-station sushi. | A Stamina -25 to -35. |
| Overtrained | any | A overdid a bench-press attempt and tore something small but annoying. | 1 random stat -2; A Stamina -10 to -15. |
| Rolled Ankle | any | A rolled an ankle coming off the top rope at a small show. | 1 random stat -1 to -3; A Stamina -15 to -20. |
| Locker Room Flu | pair | A and B got the worst of a locker-room flu outbreak. | A and B Stamina -15 to -25 each. |
| Concussion Scare | any | A took a chair shot wrong and could not remember the drive home. | 2 random stats -1 to -2 each; A Stamina -20 to -25; A morale -3 to -6. |

## Growth (8)

| Event | Target | Scenario | Effects |
| --- | --- | --- | --- |
| Back to the Dungeon | any | A revisited their old trainer's basement ring and came back sharper. | 1 random stat +1 to +2. |
| Tour of Japan | any | A worked a short Japanese tour and returned with a crisper style. | 2 random stats +1 to +2 each; A Stamina -5 to -10. |
| Lucha Education | any | A spent a week in Mexico City learning to fly and land. | 1 random stat +2 to +3; A Stamina -5 to -10. |
| Veteran Wisdom | pair | B walked A through a match, spot by spot. | 1 random stat +1 to +2; A morale +4 to +8. |
| Cardio Kick | any | A started running stairs at 5 a.m. | 1 random stat +1; A Stamina +10 to +20. |
| Acting Class | any | A took an acting class and improved their promos. | 1 random stat +1 to +2; A popularity +1 to +3. |
| Clean Eating | any | A cut out fast food and looks like a new person. | 1 random stat +1; A Stamina +5 to +15. |
| Tape Study | any | A studied old territory tapes every night. | 1 random stat +1 to +2. |

## Morale and Recovery (13)

| Event | Target | Scenario | Effects |
| --- | --- | --- | --- |
| Feel-Good Week | any | A ran a free kids' clinic back home and got good local press. | A morale +15 to +25; A popularity +1 to +2. |
| Fan Mail | any | A received a handwritten letter from a young fan. | A morale +12 to +20. |
| Home for a Few Days | any | A got a few days at home with family. | A morale +15 to +22; A Stamina +10 to +15. |
| Proud Parent | any | A became a parent. | A morale +20 to +28. |
| Road Buddies | pair | A and B started carpooling and became friends. | A and B morale +8 to +14 each. |
| Big Night at Poker | pair | A cleaned B out in a locker-room poker game. | A morale +10 to +15; B morale -4 to -8. |
| Gone Fishing | pair | A and B took a day off at a lake and came back happy. | A and B morale +8 to +12 each; A Stamina +5 to +10. |
| Hometown Hero | any | A got a standing ovation at a hometown spot show. | A morale +12 to +18; A popularity +2 to +4. |
| Good Word from Upstairs | any | A heard the office was happy with them. | A morale +10 to +16. |
| Hospital Visit | any | A visited a children's hospital and appeared on the news. | A morale +10 to +15; A popularity +2 to +4. |
| Hot Springs | any | A found a hot spring near Denver and soaked for two days. | A Stamina +25 to +35; A morale +5 to +10. |
| Miracle Chiropractor | any | A found a chiropractor who fixed years of bumps. | A Stamina +20 to +30. |
| Unexpected Week Off | any | A building fell through and A got a week at home. | A Stamina +20 to +30; A morale +6 to +10. |

## Setbacks (11)

| Event | Target | Scenario | Effects |
| --- | --- | --- | --- |
| Rough Week on the Road | any | Three cancelled flights left A sleeping in an airport. | A morale -10 to -16; A Stamina -5 to -10. |
| Cold Snap | any | A got a rental car with no heat in a cold snap. | A morale -8 to -12. |
| Rumour Mill | any | A heard a rumor that they were being written off TV. | A morale -12 to -18. |
| Rib Gone Wrong | pair | B filled A's boots with shaving cream; A was not amused. | A morale -6 to -12; B morale +3 to +6. |
| Bounced Cheque | any | A's payoff cheque bounced before the office fixed it. | A morale -8 to -14. |
| Audit | any | The IRS questioned A's travel deductions. | A morale -10 to -15. |
| Heat Backstage | pair | A and B argued over who was stealing spots. | A and B morale -6 to -10 each. |
| Blown Interview | any | A froze during a local-news interview. | A popularity -3 to -5; A morale -4 to -8. |
| Kayfabe Broken | pair | A fan photographed A and B laughing together at a diner. | A and B popularity -2 to -4 each. |
| Missed the Show | any | A overslept and missed a sold-out spot show. | A popularity -3 to -5; A morale -3 to -6; company cash -$1,500 to -$3,000. |
| Bar Fight | any | A got into a bar fight that made the police blotter. | A popularity -3 to +3; A morale -2 to -6; company cash -$1,000 to -$2,500. |

## Buzz and Hype (8)

| Event | Target | Scenario | Effects |
| --- | --- | --- | --- |
| Buzz Is Building | any | A called a late-night radio show and the tape is circulating. | A popularity +4 to +8; A momentum +1. |
| Newsletter Darling | any | A was named a newsletter's "one to watch in '96." | A popularity +4 to +7; A momentum +1. |
| Local Celebrity | any | A's promo at a car-dealership opening made the evening news. | A popularity +3 to +6. |
| Daytime TV | any | A appeared on a daytime talk show and stole the episode. | A popularity +6 to +10; A momentum +1; A morale +5 to +8. |
| Movie Cameo | any | A landed a two-line action-movie role as "Bouncer #2." | A popularity +5 to +9; A morale +6 to +10. |
| Magazine Cover | any | A made the cover of a wrestling magazine. | A popularity +5 to +8; A momentum +1. |
| Video Game Deal | any | A was scanned for an arcade wrestling game. | A popularity +4 to +7; company cash +$2,000 to +$4,000. |
| Shirt Sells Out | any | A's new shirt sold out at every show that week. | A popularity +2 to +4; company cash +$3,000 to +$6,000. |

## Existing Storylines Heat Up (4)

| Event | Target | Scenario | Effects |
| --- | --- | --- | --- |
| The Story Spills Over | hasStory | Security pulled A and B apart at a house show. | Existing story heat +10 to +16. |
| Uninvited Guest | hasStory | A showed up uninvited at B's autograph signing. | Existing story heat +10 to +15. |
| Hotel Lobby Ambush | hasStory | B blindsided A in a hotel lobby. | Existing story heat +12 to +18. |
| On-Air Call-Out | hasStory | A called B a coward on morning radio. | Existing story heat +8 to +14; A popularity +1 to +3. |

## New Storylines (25)

| Event | Scenario | Story created | Other effects |
| --- | --- | --- | --- |
| Parking Lot Brawl | A and B fought in the arena lot; fans filmed it. | The Parking Lot: their disagreement went outside and the tape got out. | A popularity +1 to +3. |
| Stolen Gear | A's signature jacket turned up in B's bag. | Who Took the Jacket?: A wants answers. | None. |
| Sucker Punch | B punched A at a spot show without explanation. | Out of Nowhere: A wants to know why. | A morale -2 to -4. |
| Cheap Shot on the Mic | B called A a glorified jobber in an interview. | Glorified Jobber: A read every word. | A morale -3 to -6. |
| Old Tag Partners | A and B used to team; someone brought up how it ended. | Unfinished Business: neither got over the split. | None. |
| Personal Matter | Rumor says B is seeing A's ex. | It's Personal: the rivalry stopped being business. | None. |
| Keyed Car | A's Camaro was keyed; A blames B. | The Camaro: A wants payback for the scratch. | None. |
| Dressing Room Politics | B got A bumped from the good dressing room. | Pecking Order: B has been politicking A down the card. | A morale -3 to -6. |
| Careless Partner | B dropped A on their head in practice. | Accident?: A thinks B did it on purpose. | A Stamina -5 to -10. |
| Same Hometown | A local paper asked whether A or B is the town's pride. | Pride of the City: both want the crown. | A popularity +1 to +3. |
| Rival Schools | A and B came from rival wrestling schools. | Rival Schools: their trainers' old feud carries on through them. | None. |
| Stolen Finisher | B started using a move like A's finisher. | That's My Move: A says it was stolen; B disagrees. | None. |
| A Friendly Bet | A bet a month's pay they could beat B in under five minutes. | The Bet: B took the challenge. | None. |
| Arm-Wrestling Match | A and B broke a table in a bar contest. | Who's Stronger: they will settle it in the ring. | None. |
| Taken Under Their Wing | B offered to mentor A; the locker room is suspicious. | The Mentor: nobody knows what B wants in return. | A morale +4 to +8. |
| Fan Poll | A fan poll ranked A above B; B took it badly. | The Poll: B plans to prove the fans wrong. | A popularity +2 to +4. |
| Wrong Hotel Room | A and B shared a room after a hotel mix-up. | Roommates: the week turned them into enemies. | None. |
| Late-Night Phone Call | B called A at 3 a.m. and breathed into the phone. | Mind Games: A thinks B is getting inside their head. | A morale -3 to -6. |
| Old Debt | A wants to collect $2,000 lent to B in 1991. | Pay Up: A is done waiting. | None. |
| Crowd Chooses Sides | Fans chanted for A during B's match. | Upstaged: B heard the crowd choose A. | A popularity +2 to +3. |
| Wedding Crasher | B showed up drunk at A's reception and knocked over the cake. | The Cake: A has not forgotten. | A morale -4 to -8. |
| Benefit Show Showdown | A and B had a benefit-show match that demanded a rematch. | Instant Classic: everyone wants a sequel. | A popularity +2 to +4. |
| Green With Envy | B saw A's payoff envelope and resented it. | Money Talks: B thinks A is overpaid. | None. |
| Saved in a Brawl | B saved A from a crowd brawl; A owes B. | Owe You One: B wants something back. | A morale +4 to +8. |
| Impression Gone Wrong | B mocked A on the bus; everyone laughed except A. | The Impression: A is not laughing. | A morale -2 to -5. |
