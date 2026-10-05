const imageModules = import.meta.glob('../../images/wrestlers/*.{png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const imageByName = Object.fromEntries(
  Object.entries(imageModules).map(([path, url]) => [
    path.split('/').pop().replace(/\.[^.]+$/, '').replace(/_/g, '-').toLowerCase(),
    url,
  ]),
);

const IMAGE_ALIASES = {
  'bret-hart': 'bret-hart',
  'andre-the-giant': 'andre-the-giant',
  'the-giant': 'andre-the-giant',
  diesel: 'kevin-nash',
  'razor-ramon': 'scott-hall',
  mankind: 'mick-foley',
  'british-bulldog': 'davey-boy-smith',
  'the-memphis-strangler': 'vanilla-gorilla',
  'minkus-hinton': 'nick-ubbs',
  'two-ton-tolliver': 'two-ton',
  'the-crab-man': 'cal-riffkin',
  'richard-pearl': 'dick-pearl',
  'bam-bam-bigelow': 'bam-bam',
};

export function wrestlerImageUrl(wrestler) {
  if (!wrestler) return null;
  const key = IMAGE_ALIASES[wrestler.id] ?? wrestler.id;
  return imageByName[key] ?? null;
}