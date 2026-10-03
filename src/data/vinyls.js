// Individual vinyl records for the Lounge's Vinyl Library shelf. Bought one at a time
// from the Lounge Catalog once the shelf/turntable itself ('vinyl-library') is owned.
const covers = import.meta.glob('../../images/vinyls/*.{jpg,jpeg,png}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const coverByFile = Object.fromEntries(
  Object.entries(covers).map(([path, url]) => [path.split('/').pop(), url]),
);

export const VINYL_RECORDS = [
  { id: 'bad-brains', file: 'bad-brains.jpg', title: 'Bad Brains', artist: 'Bad Brains', cost: 2200 },
  { id: 'cant-see-me', file: 'Cant_See_Me.jpg', title: "Can't See Me", artist: 'John Cena', cost: 1800 },
  { id: 'dmx-hell-is-hot', file: 'DMX_Its_Dark_and_Hell_Is_Hot.png', title: "It's Dark and Hell Is Hot", artist: 'DMX', cost: 2600 },
  { id: 'eminem-sslp', file: 'eminem-sslp.jpg', title: 'The Slim Shady LP', artist: 'Eminem', cost: 2800 },
  { id: 'hendrix-electric-ladyland', file: 'Jimi_Hendrix_-_Electric_Ladyland.jpg', title: 'Electric Ladyland', artist: 'Jimi Hendrix', cost: 4500 },
  { id: 'korn-follow-the-leader', file: 'korn-followtheleader.jpg', title: 'Follow the Leader', artist: 'Korn', cost: 2400 },
  { id: 'limp-bizkit-significant-other', file: 'Limp_Bizkit_Significant_Other.jpg', title: 'Significant Other', artist: 'Limp Bizkit', cost: 2200 },
  { id: 'living-colour-vivid', file: 'Living_Colour-Vivid.jpg', title: 'Vivid', artist: 'Living Colour', cost: 2400 },
  { id: 'metallica-master-of-puppets', file: 'Metallica_-_Master_of_Puppets_cover.jpg', title: 'Master of Puppets', artist: 'Metallica', cost: 4800 },
  { id: 'mf-doom-operation-doomsday', file: 'MF-DOOM-Operation.jpeg', title: 'Operation: Doomsday', artist: 'MF DOOM', cost: 3200 },
  { id: 'misfits-american-psycho', file: 'Misfits_-_American_Psycho_cover.jpg', title: 'American Psycho', artist: 'Misfits', cost: 2600 },
  { id: 'motorhead-ace-of-spades', file: 'Motörhead_-_Ace_of_Spades_(1980).jpg', title: 'Ace of Spades', artist: 'Motörhead', cost: 4200 },
  { id: 'orton-voices', file: 'orton-voices.jpg', title: 'Voices', artist: 'Randy Orton', cost: 1800 },
  { id: 'rage-evil-empire', file: 'Rage_Against_the_Machine_-_Evil_Empire.png', title: 'Evil Empire', artist: 'Rage Against the Machine', cost: 3000 },
  { id: 'rick-derringer-guitars', file: 'rick-derringer-guitars.jpg', title: 'Guitars and Women', artist: 'Rick Derringer', cost: 2000 },
  { id: 'run-dmc-raising-hell', file: 'run-dmc-raising-hell.jpg', title: 'Raising Hell', artist: 'Run-D.M.C.', cost: 3400 },
  { id: 'black-sabbath', file: 'sabbath.jpg', title: 'Black Sabbath', artist: 'Black Sabbath', cost: 4600 },
  { id: 'the-coup-steal-this-album', file: 'Stealthisalbum-thecoup.jpg', title: 'Steal This Album!', artist: 'The Coup', cost: 2000 },
  { id: 'sum-41-does-this-look-infected', file: 'sum41-doesthislookinfected.jpg', title: 'Does This Look Infected?', artist: 'Sum 41', cost: 2000 },
  { id: 'soundgarden-superunknown', file: 'Superunknown.jpg', title: 'Superunknown', artist: 'Soundgarden', cost: 3600 },
  { id: 'wcw-mayhem', file: 'WCW_Mayhem.jpg', title: 'WCW Mayhem: The Music', artist: 'WCW', cost: 1600 },
  { id: 'creed-weathered', file: 'Weathered_Main_Cover.jpg', title: 'Weathered', artist: 'Creed', cost: 2000 },
  { id: 'wu-tang-enter-the-wu-tang', file: 'Wu-TangClanEntertheWu-Tangalbumcover.jpg', title: 'Enter the Wu-Tang (36 Chambers)', artist: 'Wu-Tang Clan', cost: 4000 },
  { id: 'wwf-music-vol-5', file: 'WWF_The_Music_Volume_5.jpg', title: 'WWF The Music, Vol. 5', artist: 'WWF', cost: 1800 },
];

export function vinylCoverUrl(record) {
  return coverByFile[record.file] ?? null;
}

export function getVinylRecord(id) {
  return VINYL_RECORDS.find(v => v.id === id) || null;
}
