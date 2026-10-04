const clamp = value => Math.max(0, Math.min(100, Number(value) || 0));

export const MARKET_LOCATIONS = {
  'Austin, TX': { coordinates: [-97.74, 30.27], country: 'USA', region: 'south' },
  'San Antonio, TX': { coordinates: [-98.49, 29.42], country: 'USA', region: 'south' },
  'Houston, TX': { coordinates: [-95.37, 29.76], country: 'USA', region: 'south' },
  'New Orleans, LA': { coordinates: [-90.07, 29.95], country: 'USA', region: 'south' },
  'El Paso, TX': { coordinates: [-106.49, 31.76], country: 'USA', region: 'south' },
  'Albany, NY': { coordinates: [-73.76, 42.65], country: 'USA', region: 'northeast' },
  'Philadelphia, PA': { coordinates: [-75.17, 39.95], country: 'USA', region: 'northeast' },
  'Boston, MA': { coordinates: [-71.06, 42.36], country: 'USA', region: 'northeast' },
  'New York, NY': { coordinates: [-74.01, 40.71], country: 'USA', region: 'northeast' },
  'Atlanta, GA': { coordinates: [-84.39, 33.75], country: 'USA', region: 'south' },
  'Dallas, TX': { coordinates: [-96.8, 32.78], country: 'USA', region: 'south' },
  'Memphis, TN': { coordinates: [-90.05, 35.15], country: 'USA', region: 'south' },
  'Louisville, KY': { coordinates: [-85.76, 38.25], country: 'USA', region: 'south' },
  'St. Louis, MO': { coordinates: [-90.2, 38.63], country: 'USA', region: 'midwest' },
  'Chicago, IL': { coordinates: [-87.63, 41.88], country: 'USA', region: 'midwest' },
  'Pittsburgh, PA': { coordinates: [-80, 40.44], country: 'USA', region: 'northeast' },
  'Los Angeles, CA': { coordinates: [-118.24, 34.05], country: 'USA', region: 'west' },
  'Tampa, FL': { coordinates: [-82.46, 27.95], country: 'USA', region: 'south' },
  'Miami, FL': { coordinates: [-80.19, 25.76], country: 'USA', region: 'south' },
  'Las Vegas, NV': { coordinates: [-115.14, 36.17], country: 'USA', region: 'west' },
  'Washington, DC': { coordinates: [-77.04, 38.91], country: 'USA', region: 'northeast' },
  'Pasadena, CA': { coordinates: [-118.14, 34.15], country: 'USA', region: 'west' },
  'Mexico City, Mexico': { coordinates: [-99.13, 19.43], country: 'Mexico', region: 'international' },
  'Toronto, ON': { coordinates: [-79.38, 43.65], country: 'Canada', region: 'international' },
  'Tokyo, Japan': { coordinates: [139.69, 35.68], country: 'Japan', region: 'international' },
  'Giza, Egypt': { coordinates: [31.21, 30.01], country: 'Egypt', region: 'international' },
  'Salisbury, England': { coordinates: [-1.8, 51.07], country: 'United Kingdom', region: 'international' },
  'Rome, Italy': { coordinates: [12.5, 41.9], country: 'Italy', region: 'international' },
};

export const HYPE_TIERS = [
  { minimum: 0, label: 'Unknown', color: '#46545b' },
  { minimum: 15, label: 'Emerging', color: '#3585a6' },
  { minimum: 35, label: 'Growing', color: '#37a77b' },
  { minimum: 60, label: 'Hot', color: '#e5b644' },
  { minimum: 80, label: 'Red hot', color: '#e36651' },
];

export function hypeTier(score) {
  return [...HYPE_TIERS].reverse().find(tier => score >= tier.minimum) ?? HYPE_TIERS[0];
}

export function createMarketHype() {
  return { markets: { 'Austin, TX': 18 }, regions: { south: 8 }, countries: { USA: 4 }, global: 0, visits: {} };
}

export function normalizeMarketHype(saved) {
  const defaults = createMarketHype();
  const scores = values => Object.fromEntries(Object.entries(values ?? {}).map(([key, value]) => [key, clamp(value)]));
  const normalized = {
    markets: scores(saved?.markets ?? defaults.markets),
    regions: scores(saved?.regions ?? defaults.regions),
    countries: scores(saved?.countries ?? defaults.countries),
    global: clamp(saved?.global),
    visits: Object.fromEntries(Object.entries(saved?.visits ?? {}).map(([key, value]) => [key, Math.max(0, Math.floor(Number(value) || 0))])),
  };
  for (const [previousCity, currentCity] of [['Syracuse, NY', 'New Orleans, LA'], ['Buffalo, NY', 'El Paso, TX']]) {
    if (!(previousCity in normalized.markets) && !(previousCity in normalized.visits)) continue;
    normalized.markets[currentCity] = Math.max(normalized.markets[currentCity] ?? 0, normalized.markets[previousCity] ?? 0);
    normalized.visits[currentCity] = (normalized.visits[currentCity] ?? 0) + (normalized.visits[previousCity] ?? 0);
    delete normalized.markets[previousCity];
    delete normalized.visits[previousCity];
  }
  return normalized;
}

export function countryHype(hype, country) {
  return clamp((hype?.countries?.[country] ?? 0) + (hype?.global ?? 0) * .2);
}

export function regionHype(hype, region) {
  return clamp((hype?.regions?.[region] ?? 0) + countryHype(hype, 'USA') * .3);
}

export function marketHypeForVenue(hype, venue) {
  const location = MARKET_LOCATIONS[venue?.city];
  if (!location) return 0;
  const regional = location.country === 'USA' ? regionHype(hype, location.region) : countryHype(hype, location.country);
  return Math.round(clamp((hype?.markets?.[venue.city] ?? 0) + regional * .45 + (hype?.global ?? 0) * .1));
}

export function marketDemandMultiplier(hype, venue) {
  return hype ? .85 + marketHypeForVenue(hype, venue) * .008 : 1;
}

export function updateMarketHype(hype, venue, result, { localOnly = false } = {}) {
  const location = MARKET_LOCATIONS[venue?.city];
  if (!location) return null;
  const before = marketHypeForVenue(hype, venue);
  const rating = clamp(result.rating);
  const quality = (rating - 35) / 65;
  const localGain = (quality >= 0 ? 5 + quality * 12 : quality * 12) * (localOnly ? .4 : 1);
  if (!localOnly) {
    Object.keys(hype.markets).forEach(city => { hype.markets[city] *= .995; });
    Object.keys(hype.regions).forEach(region => { hype.regions[region] *= .998; });
  }
  hype.markets[venue.city] = clamp((hype.markets[venue.city] ?? 0) + localGain);
  hype.visits[venue.city] = (hype.visits[venue.city] ?? 0) + 1;
  if (location.country === 'USA') hype.regions[location.region] = clamp((hype.regions[location.region] ?? 0) + localGain * .25);
  const broadcastGain = localOnly ? 0 : Math.max(0, (rating - 50) / 50) * Math.min(1.5, Math.max(0, result.tvViewers ?? 0) / 1000000) * 3;
  hype.countries[location.country] = clamp((hype.countries[location.country] ?? 0) + broadcastGain);
  if (broadcastGain > 1.5) hype.global = clamp(hype.global + (broadcastGain - 1.5) * .3);
  return { city: venue.city, before, after: marketHypeForVenue(hype, venue), localGain: Math.round(localGain * 10) / 10, broadcastGain: Math.round(broadcastGain * 10) / 10 };
}