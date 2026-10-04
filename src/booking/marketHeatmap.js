import { geoAlbersUsa, geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import worldAtlas from 'world-atlas/countries-110m.json';
import usaAtlas from 'us-atlas/states-10m.json';
import { venues, venueRequiredLevel, venueUnlocked } from '../data/venues.js';
import { MARKET_LOCATIONS, HYPE_TIERS, hypeTier, marketHypeForVenue, regionHype, countryHype } from './marketHype.js';

const countries = feature(worldAtlas, worldAtlas.objects.countries);
const states = feature(usaAtlas, usaAtlas.objects.states);
const STATE_REGIONS = {
  northeast: ['Connecticut', 'Maine', 'Massachusetts', 'New Hampshire', 'Rhode Island', 'Vermont', 'New Jersey', 'New York', 'Pennsylvania', 'District of Columbia'],
  south: ['Delaware', 'Florida', 'Georgia', 'Maryland', 'North Carolina', 'South Carolina', 'Virginia', 'West Virginia', 'Alabama', 'Kentucky', 'Mississippi', 'Tennessee', 'Arkansas', 'Louisiana', 'Oklahoma', 'Texas'],
  midwest: ['Illinois', 'Indiana', 'Michigan', 'Ohio', 'Wisconsin', 'Iowa', 'Kansas', 'Minnesota', 'Missouri', 'Nebraska', 'North Dakota', 'South Dakota'],
};
const STATE_CODES = { Texas: 'TX', Louisiana: 'LA', 'New York': 'NY', Pennsylvania: 'PA', Massachusetts: 'MA', Georgia: 'GA', Tennessee: 'TN', Kentucky: 'KY', Missouri: 'MO', Illinois: 'IL', California: 'CA', Florida: 'FL', Nevada: 'NV', 'District of Columbia': 'DC' };
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const money = value => `${value < 0 ? '-' : ''}$${Math.round(Math.abs(value)).toLocaleString()}`;

function stateScore(hype, name) {
  const region = Object.keys(STATE_REGIONS).find(region => STATE_REGIONS[region].includes(name)) ?? 'west';
  const local = venues.filter(venue => venue.city.endsWith(`, ${STATE_CODES[name]}`));
  const average = local.length ? local.reduce((sum, venue) => sum + marketHypeForVenue(hype, venue), 0) / local.length : 0;
  return Math.round(Math.max(regionHype(hype, region), average * .8));
}

export function marketHeatmapHtml({ hype, show, gmLevel, scope = 'usa', selectedCity = show.city, projectVenue }) {
  const selected = venues.find(venue => venue.city === selectedCity) ?? venues.find(venue => venue.id === show.venueId) ?? venues[0];
  const usa = scope === 'usa';
  const projection = (usa ? geoAlbersUsa() : geoNaturalEarth1()).fitExtent([[20, 20], [940, 490]], usa ? states : countries);
  const path = geoPath(projection);
  const cities = [...new Set(venues.map(venue => venue.city))].filter(city => !usa || MARKET_LOCATIONS[city]?.country === 'USA');
  const markers = usa ? cities.map(city => ({ city, label: city, coordinates: MARKET_LOCATIONS[city].coordinates }))
    : [...new Set(Object.values(MARKET_LOCATIONS).map(location => location.country))].map(country => {
      const markets = cities.filter(city => MARKET_LOCATIONS[city].country === country);
      const city = markets.includes(selected.city) ? selected.city : markets.sort((first, second) => marketHypeForVenue(hype, venues.find(venue => venue.city === second)) - marketHypeForVenue(hype, venues.find(venue => venue.city === first)))[0];
      return { city, label: country === 'USA' ? 'United States' : country, coordinates: country === 'USA' ? [-98, 39] : MARKET_LOCATIONS[city].coordinates };
    });
  const placed = [];
  const pins = markers.map(marker => {
    const original = projection(marker.coordinates);
    if (!original) return '';
    let [x, y] = original;
    for (let attempt = 0; attempt < 30 && placed.some(point => Math.hypot(point.x - x, point.y - y) < 22); attempt += 1) {
      const angle = attempt * 2.4;
      const radius = 12 + attempt * 3;
      x = Math.max(14, Math.min(946, original[0] + Math.cos(angle) * radius));
      y = Math.max(14, Math.min(496, original[1] + Math.sin(angle) * radius));
    }
    placed.push({ x, y, original });
    const venue = venues.find(venue => venue.city === marker.city);
    const score = usa ? marketHypeForVenue(hype, venue) : Math.round(countryHype(hype, MARKET_LOCATIONS[marker.city].country));
    return `<button type="button" class="bk-market-pin ${marker.city === selected.city ? 'selected' : ''}" data-bk="heatmap-market" data-value="${escapeHtml(marker.city)}" style="left:${x / 9.6}%;top:${y / 5.1}%;--market-color:${hypeTier(score).color}" aria-label="${escapeHtml(marker.label)}: ${score} hype" title="${escapeHtml(marker.label)} · ${score}/100 hype"></button>`;
  }).join('');
  const outlines = (usa ? states : countries).features.map(area => {
    const outline = path(area);
    if (!outline) return '';
    const name = area.properties.name;
    const country = name === 'United States of America' ? 'USA' : name;
    const score = usa ? stateScore(hype, name) : Math.round(countryHype(hype, country));
    return `<path d="${outline}" fill="${hypeTier(score).color}"><title>${escapeHtml(name)} · ${score}/100 hype</title></path>`;
  }).join('');
  const score = marketHypeForVenue(hype, selected);
  const localVenues = venues.filter(venue => venue.city === selected.city);
  const localProjection = projectVenue(selected);
  const sorted = cities.map(city => venues.find(venue => venue.city === city)).sort((first, second) => marketHypeForVenue(hype, second) - marketHypeForVenue(hype, first) || first.city.localeCompare(second.city));
  return `<section class="bk-heatmap">
    <header class="bk-heatmap-toolbar">
      <div><small class="bk-label">MARKET INTELLIGENCE</small><h2>Heatmap</h2></div>
      <div class="bk-map-scope" role="group" aria-label="Map region">
        <button type="button" data-bk="heatmap-scope" data-value="usa" aria-pressed="${usa}" class="${usa ? 'selected' : ''}">USA</button>
        <button type="button" data-bk="heatmap-scope" data-value="world" aria-pressed="${!usa}" class="${usa ? '' : 'selected'}">World</button>
      </div>
    </header>
    <div class="bk-heatmap-layout">
      <div class="bk-heatmap-geography">
        <div class="bk-market-map">
          <svg viewBox="0 0 960 510" role="img" aria-label="${usa ? 'United States' : 'World'} market hype map"><g class="bk-map-land">${outlines}</g><g class="bk-map-leaders">${placed.map(point => `<line x1="${point.original[0]}" y1="${point.original[1]}" x2="${point.x}" y2="${point.y}" />`).join('')}</g></svg>
          <div class="bk-market-pins">${pins}</div>
        </div>
        <div class="bk-map-legend" aria-label="Hype legend">${HYPE_TIERS.map((tier, index) => `<span><i style="background:${tier.color}"></i>${tier.label}<small>${tier.minimum}-${HYPE_TIERS[index + 1] ? HYPE_TIERS[index + 1].minimum - 1 : 100}</small></span>`).join('')}</div>
      </div>
      <aside class="bk-market-detail">
        <small class="bk-label">SELECTED MARKET</small><h3>${escapeHtml(selected.city)}</h3>
        <div class="bk-market-score" style="--market-color:${hypeTier(score).color}"><b>${score}<small>/100</small></b><span>${hypeTier(score).label}</span></div>
        <dl><div><dt>Past shows</dt><dd>${hype.visits[selected.city] ?? 0}</dd></div><div><dt>Demand lift</dt><dd>${Math.round((localProjection.marketDemandMultiplier - 1) * 100)}%</dd></div><div><dt>National reach</dt><dd>${Math.round(countryHype(hype, MARKET_LOCATIONS[selected.city].country))}/100</dd></div></dl>
        ${localVenues.map(venue => {
          const forecast = venue.id === selected.id ? localProjection : projectVenue(venue);
          const unlocked = venueUnlocked(venue, gmLevel);
          return `<div class="bk-market-venue"><b>${escapeHtml(venue.name)}</b><small>${venue.capacity.toLocaleString()} seats · ${money(venue.rental + venue.travel)} upfront</small><dl><div><dt>Expected attendance</dt><dd>${forecast.attendance.toLocaleString()}</dd></div><div><dt>Expected net</dt><dd class="${forecast.profit >= 0 ? 'good' : 'bad'}">${money(forecast.profit)}</dd></div></dl><button type="button" class="bk-primary" data-bk="venue" data-value="${venue.id}" ${unlocked ? '' : 'disabled'}>${unlocked ? show.venueId === venue.id ? 'Keep selected venue' : 'Book venue' : `GM level ${venueRequiredLevel(venue)} required`}</button></div>`;
        }).join('')}
      </aside>
    </div>
    <div class="bk-market-list"><table><thead><tr><th>Market</th><th>Hype</th><th>Past shows</th><th>Venue access</th></tr></thead><tbody>${sorted.map(venue => {
      const value = marketHypeForVenue(hype, venue);
      return `<tr class="${venue.city === selected.city ? 'selected' : ''}"><td><button type="button" data-bk="heatmap-market" data-value="${escapeHtml(venue.city)}">${escapeHtml(venue.city)}</button></td><td><span class="bk-hype-value"><i style="background:${hypeTier(value).color}"></i>${value}</span></td><td>${hype.visits[venue.city] ?? 0}</td><td>${venueUnlocked(venue, gmLevel) ? 'Available' : `Level ${venueRequiredLevel(venue)}`}</td></tr>`;
    }).join('')}</tbody></table></div>
  </section>`;
}