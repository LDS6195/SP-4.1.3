// Booking Board UI. Simple by default — venue, matchups, done. Everything deeper
// (stipulations and full P&L) lives behind a fold.

import { wrestlers, getWrestlerById, computeChemistry, momentumLabel, recordString, getDraftTier, GAME_START_DATE } from '../data/wrestlers.js';
import { venues, getVenueById, venueRequiredLevel, venueUnlocked } from '../data/venues.js';
import {
  getMatchType, getStake,
} from '../data/matchTypes.js';
import { getTicketTier } from '../data/production.js';
import {
  projectMatch, matchParticipantIds, stalenessForMatch, ratingLabel, freshnessLabel,
} from './bookingEngine.js';
import { TROPHIES, RECORD_DEFS, TROPHY_TIER_ORDER } from '../data/achievements.js';
import { CHAMPIONSHIPS, getChampionship, prestigeLabel, titleBookable } from '../data/championships.js';
import { previewText, promoCharismaChance } from '../data/storylines.js';
import { ACTIVITIES, getActivity, TRAINABLE_STATS, BUILDUP_WEEKS } from '../data/activities.js';
import { PROMO_PARTNER_FEE } from '../data/promos.js';
import { TIER_LABELS } from '../data/draft.js';
import { gimmickRarity, isBasicMatchType, BASIC_MATCH_TYPES as BASIC_TYPE_IDS } from '../data/cards.js';
import { PRICE_CATEGORIES, homeVideoFormat, suitesUnlocked, ticketPriceRatio, applyGoodwillDrift, defaultPrices, financeForecastRanges, merchSalesForecast } from '../data/finances.js';
import { PPV_CALENDAR, PPV_LOGOS, logoUrl } from '../data/calendar.js';
import { autoBook } from './autoBook.js';
import * as booking from './bookingState.js';
import worldChampBeltUrl from '../../images/world-champ-belt.png?url';
import tagBeltUrl from '../../images/tag-belt.png?url';
import trainingArtUrl from '../../images/wallpaper/weight.jpg?url';
import promoArtUrl from '../../images/wallpaper/promo.jpg?url';
import { wrestlerImageUrl } from '../data/wrestlerImages.js';
import { companyLogoUrl } from '../data/companyLogo.js';
import { createElement, Share2, Download, ArrowLeft, Check, RotateCcw, Dumbbell, Mic, Map as MapIcon } from 'lucide';
import { marketHeatmapHtml } from './marketHeatmap.js';
import { marketHypeForVenue, hypeTier, MARKET_LOCATIONS, recommendTourVenue } from './marketHype.js';

const view = { name: 'card', slot: null, titleId: null, titleHistoryPage: 0, rosterCandidate: null, resultIndex: 0, resultMatch: 0, storylinePartnerId: null, leadUpActivity: null, leadUpWrestler: null, lockerRoomAllocation: {}, promoWrestler: null, promoPartner: null, houseShow: null, housePick: null, houseCandidate: null, houseResult: null, teamMembers: [], teamName: '', monthlyTrainingIds: [], monthlySpotlightId: null, monthlyPromoPick: null, monthlyGuide: 'training', monthlyPhaseResult: null, incidentResult: null, packResult: null, packFlipped: [], annualOpened: false };
const open = new Set();
const teamSort = { key: 'w', dir: 'desc' };

const HOUSE_SHOW_TYPES = ['singles', 'tag-team', 'triple-threat', 'submission', 'lumberjack'];

const money = value => `$${Math.round(value).toLocaleString()}`;
const compactMoney = value => {
  const abs = Math.abs(value);
  if (abs >= 1000000) return `${value < 0 ? '-' : ''}$${(abs / 1000000).toFixed(2)}M`;
  if (abs >= 1000) return `${value < 0 ? '-' : ''}$${Math.round(abs / 1000)}K`;
  return money(value);
};
const signed = value => `${value < 0 ? '-' : '+'}${compactMoney(Math.abs(value))}`;
const signedRange = range => `${signed(range.low)} to ${signed(range.high)}`;
const BELT_IMAGES = { world: worldChampBeltUrl, tag: tagBeltUrl };

// Clickable names that open the wrestler's profile in the computer terminal.
function profileLinksHtml(ids, separator = ' & ') {
  return ids.map(id => `<button type="button" class="profile-link inline" data-profile="${id}">${getWrestlerById(id)?.name ?? id}</button>`).join(separator);
}

function wrestlerPortraitHtml(wrestler, className = 'bk-wrestler-portrait') {
  const url = wrestlerImageUrl(wrestler);
  return url
    ? `<span class="${className}"><img src="${url}" alt="${wrestler.name}"></span>`
    : `<span class="${className} fallback">${wrestler.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span>`;
}

function matchPortraitsHtml(ids, className = 'bk-match-portraits') {
  return `<span class="${className}">${ids.slice(0, 4).map(id => {
    const wrestler = getWrestlerById(id);
    return wrestler ? wrestlerPortraitHtml(wrestler) : '';
  }).join('')}</span>`;
}

function positionLabel(index, total) {
  if (index === total - 1) return 'MAIN EVENT';
  if (index === total - 2) return 'SEMI-MAIN';
  if (index === 0) return 'OPENER';
  return `MATCH ${index + 1}`;
}

function fold(key, title, summary, content) {
  const isOpen = open.has(key);
  return `<section class="bk-fold ${isOpen ? 'open' : ''}">
    <button class="bk-fold-head" data-bk="fold" data-value="${key}">
      <span class="bk-fold-title">${title}</span>
      <span class="bk-fold-summary">${summary}</span>
      <span class="bk-fold-chevron">${isOpen ? '–' : '+'}</span>
    </button>
    ${isOpen ? `<div class="bk-fold-body">${content}</div>` : ''}
  </section>`;
}

function optionCard(kind, id, selected, title, cost, meta, description, unlockLevel = 1) {
  const unlocked = booking.getGMLevel() >= unlockLevel;
  return `<button class="bk-option ${selected ? 'selected' : ''} ${unlocked ? '' : 'locked'}" data-bk="${kind}" data-value="${id}" ${unlocked ? '' : 'disabled'}>
    <span class="bk-option-head"><b>${title}</b>${cost === null ? '' : `<em>${cost ? money(cost) : 'FREE'}</em>`}</span>
    ${meta ? `<span class="bk-option-meta">${meta}</span>` : ''}
    ${description ? `<small>${description}</small>` : ''}
    ${unlocked ? '' : `<small class="bk-flag">GM LEVEL ${unlockLevel} REQUIRED</small>`}
  </button>`;
}

function meter(label, value, max = 100, tone = '') {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return `<div class="bk-meter ${tone}"><small>${label}</small><div class="bk-meter-track"><i style="width:${pct}%"></i></div><b>${value}</b></div>`;
}

function qualityBar(quality) {
  const low = Math.max(0, Math.min(100, quality.low));
  const high = Math.max(low, Math.min(100, quality.high));
  return `<div class="bk-range" title="Projected ${low}–${high}">
    <i class="bk-range-band" style="left:${low}%;width:${high - low}%"></i>
    <i class="bk-range-mark" style="left:${Math.min(99, quality.expected)}%"></i>
  </div>`;
}

// The player sees a band, never the exact number. Calibration is learned by running shows.
function confidenceDots(confidence) {
  const filled = { reliable: 3, uncertain: 2, volatile: 1, wild: 0 }[confidence] ?? 0;
  return `<span class="bk-confidence" title="${confidence} projection">${'●'.repeat(filled)}${'○'.repeat(3 - filled)}</span>`;
}

const MAGNITUDE = delta => {
  const size = Math.abs(delta);
  if (size >= 9) return 'major';
  if (size >= 4.5) return 'notable';
  return 'slight';
};

// Qualitative read: the player learns the direction and rough weight, not the math.
function readList(factors, limit = 3) {
  if (!factors?.length) return '';
  return `<ul class="bk-read">${factors.slice(0, limit).map(f => `
    <li class="${f.delta > 0 ? 'up' : 'down'}">
      <span>${f.delta > 0 ? '▲' : '▼'}</span>
      <b>${f.label}</b>
      <em>${MAGNITUDE(f.delta)}</em>
    </li>`).join('')}</ul>`;
}

function sideNames(match) {
  const type = getMatchType(match.typeId);
  if (!type?.slots.teams) {
    const names = matchParticipantIds(match).map(id => getWrestlerById(id)?.name).filter(Boolean);
    return names.length ? `${names.length} entrants` : '<em>No entrants booked</em>';
  }
  return match.teams
    .map(team => team.filter(Boolean).map(id => getWrestlerById(id)?.name).join(' & ') || '<em>Open slot</em>')
    .join('<i class="bk-vs">vs</i>');
}

// ---------------------------------------------------------------------------
// Card overview — the default, deliberately quiet screen
// ---------------------------------------------------------------------------
function matchRowHtml(match, index, p, total) {
  const type = getMatchType(match.typeId);
  const stake = getStake(match.stakeId);
  const title = match.titleId ? getChampionship(match.titleId) : null;
  const sub = [
    type?.name ?? 'Unset',
    title ? booking.companyBrandedText(title.name) : (stake.id === 'none' ? null : stake.name),
    p.valid ? `${p.minutes} min` : null,
    p.valid ? compactMoney(p.cost) : null,
  ].filter(Boolean).join(' · ');
  const variety = p.varietyBonus;
  const varietySignals = [
    variety?.freshFaceQuality ? `FRESH FACE +${variety.freshFaceQuality.toFixed(1)} GRADE · +${variety.freshFaceBuzz} HYPE` : '',
    variety?.losingStreakQuality ? `LOSING STREAK +${variety.losingStreakQuality.toFixed(1)} GRADE · +${variety.losingStreakBuzz} HYPE` : '',
  ].filter(Boolean);

  return `<article class="bk-match ${index === total - 1 ? 'is-main' : ''}">
    <div class="bk-match-row">
      <button class="bk-match-open" data-bk="edit-match" data-value="${match.id}">
        <span class="bk-slot-label">${positionLabel(index, total)}${title ? ` <em class="bk-belt-tag">${booking.getCompanyIdentity().acronym} TITLE</em>` : ''}</span>
        <span class="bk-match-name-line">${matchPortraitsHtml(matchParticipantIds(match))}<b class="bk-match-names">${sideNames(match)}</b></span>
        <span class="bk-match-sub">${sub}</span>
      </button>
      <div class="bk-match-score">
        ${p.valid
          ? `<b>${p.grade}</b>${confidenceDots(p.confidence)}${qualityBar(p.quality)}`
          : '<b class="dim">—</b><small>incomplete</small>'}
      </div>
      <div class="bk-match-actions">
        <button data-bk="move-match" data-value="${match.id}" data-dir="-1" title="Move up" ${index === 0 ? 'disabled' : ''}>↑</button>
        <button data-bk="move-match" data-value="${match.id}" data-dir="1" title="Move down" ${index === total - 1 ? 'disabled' : ''}>↓</button>
        <button data-bk="remove-match" data-value="${match.id}" title="Remove match" ${total <= booking.MIN_MATCHES ? 'disabled' : ''}>✕</button>
      </div>
    </div>
    ${p.warnings.length ? `<p class="bk-match-flag">${p.warnings[0]}${p.warnings.length > 1 ? ` <em>+${p.warnings.length - 1} more</em>` : ''}</p>` : ''}
    ${varietySignals.length ? `<p class="bk-match-spotlight">${varietySignals.join(' · ')}</p>` : ''}
  </article>`;
}

function cardViewHtml() {
  const show = booking.getShow();
  const state = booking.getState();
  const p = booking.getProjection();
  const venue = p.venue;
  const showTitleWidth = Math.min(650, window.innerWidth - 56);
  const showTitleSize = Math.max(14, Math.min(52, showTitleWidth / (show.name.length * 0.62)));
  const flags = [...p.warnings, ...p.freshness.reasons];

  const breakdown = `
    ${meter('Freshness', p.freshness.score, 100, p.freshness.score < 60 ? 'bad' : '')}
    ${meter('Star Power', p.cardStarPower)}
    ${meter('Marquee Buzz', Math.min(100, p.cardBuzz), 100)}
    ${meter('Risk Index', p.riskIndex, 100, p.riskIndex > 60 ? 'bad' : '')}
    ${meter('Injury Exposure', p.injuryExposure, 100, p.injuryExposure > 25 ? 'bad' : '')}
    <div class="bk-ledger">
      <span><small>GATE</small><b>${money(p.revenue.gate)}</b></span>
      <span><small>MERCH</small><b>${money(p.revenue.merch)}</b></span>
      <span><small>TELEVISION</small><b>${money(p.revenue.television)}</b></span>
      <hr />
      <span><small>VENUE</small><b>-${money(p.expenses.venue)}</b></span>
      <span><small>TALENT</small><b>-${money(p.expenses.talent)}</b></span>
      <span><small>MATCH SETUP</small><b>-${money(p.expenses.production)}</b></span>
      <span><small>COMPANY OVERHEAD</small><b>-${money(p.expenses.overhead)}</b></span>
      <hr />
      <span class="total ${p.profit >= 0 ? 'good' : 'bad'}"><small>EXPECTED NET</small><b>${signedRange(p.profitRange)}</b></span>
    </div>`;

  return `<div class="bk bk-card-poster">
    <header class="bk-head">
      <div class="bk-head-name">
        <small>MONTHLY PPV · ${booking.showDateLabel().toUpperCase()}</small>
        <input id="bk-show-name" data-bk="show-name" value="${show.name}" maxlength="34" style="--show-title-size:${showTitleSize}px" />
        ${show.theme ? `<p class="bk-event-theme">${show.theme}</p>` : ''}
      </div>
      <div class="bk-head-stats">
        <span><small>BANKROLL</small><b>${compactMoney(state.bankroll)}</b></span>
        <span><small>CARD COST</small><b>${compactMoney(p.totalCost)}</b></span>
        <span class="${p.profit >= 0 ? 'good' : 'bad'}"><small>EXPECTED NET</small><b>${signedRange(p.profitRange)}</b></span>
      </div>
    </header>

    <div class="bk-body">
      <section class="bk-col">
        <div class="bk-venue-selection">
        <button class="bk-strip" data-bk="view" data-value="venue">
          <small>VENUE</small>
          <b>${venue ? `${venue.name} — ${venue.city}` : 'Choose a building'}</b>
          <span>${venue ? `${venue.capacity.toLocaleString()} seats · ${compactMoney(venue.rental + venue.travel)} to run` : 'Required'}</span>
        </button>
        <button type="button" class="bk-heatmap-open" data-bk="view" data-value="heatmap">${createElement(MapIcon, { width: 18, height: 18, 'aria-hidden': 'true' }).outerHTML}<span>Heatmap</span></button>
        </div>

        <div class="bk-section-head">
          <small>THE CARD · ${show.matches.length} MATCHES</small>
          <span class="bk-section-buttons">
            <button data-bk="auto-book">⚡ AUTO-BOOK</button>
            <button data-bk="add-match" ${show.matches.length >= booking.getMaxMatches() ? 'disabled' : ''}>+ ADD MATCH</button>
          </span>
        </div>
        ${show.matches.map((match, index) => matchRowHtml(match, index, p.matches[index], show.matches.length)).join('')}

      </section>

      <aside class="bk-side">
        <div class="bk-rating">
          <small>PROJECTED SHOW</small>
          <b>${p.grade}</b>
          <span>${ratingLabel(p.rating)} · ${p.matches.every(m => m.valid) ? 'card complete' : 'card incomplete'}</span>
        </div>
        <div class="bk-quickstats">
          <span><small>EXPECTED GATE</small><b>${p.attendanceRange.low.toLocaleString()}–${p.attendanceRange.high.toLocaleString()}</b><em>${p.fillPercent}% of house</em></span>
          <span><small>TV FORECAST</small><b>${p.tvRatingRange.low.toFixed(1)}–${p.tvRatingRange.high.toFixed(1)}</b><em>${Math.round(p.tvViewers / 1000).toLocaleString()}K expected viewers</em></span>
          <span><small>REGULAR TV AUDIENCE</small><b>${Math.round(p.tvAudience / 1000).toLocaleString()}K</b><em>Built through completed PPVs</em></span>
          <span><small>FRESHNESS</small><b class="${p.freshness.score < 60 ? 'bad' : ''}">${freshnessLabel(p.freshness.score)}</b><em>${p.freshness.score}/100</em></span>
        </div>
        ${readList([...p.matches.flatMap(m => m.factors ?? []), ...p.factors].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)), 3)}

        ${fold('show-breakdown', 'Full breakdown', `${signedRange(p.profitRange)} net range`, breakdown)}
        ${flags.length ? fold('show-flags', 'Booking flags', `${flags.length}`, `<ul class="bk-flag-list">${flags.map(f => `<li>${f}</li>`).join('')}</ul>`) : ''}
        <div class="bk-side-actions">
          ${p.readyToRun && !booking.isLeadUpDone()
            ? '<button class="bk-primary" data-bk="view" data-value="calendar">ADVANCE CALENDAR</button>'
            : `<button class="bk-primary" data-bk="run" ${p.readyToRun ? '' : 'disabled'}>RUN THE SHOW</button>`}
          ${!booking.isLeadUpDone() ? '<button class="calendar-skip-ppv" type="button" data-bk="leadup-jump">SKIP TO PPV →<small>Skip all remaining prep and its bonuses</small></button>' : ''}
          ${booking.isLeadUpDone() && !p.readyToRun ? '<small class="bk-flag">Complete every match slot and resolve duplicate wrestlers or invalid championship bookings.</small>' : ''}
          ${booking.getLastResult() ? '<button data-bk="view" data-value="results">LAST SHOW RESULTS</button>' : ''}
          <button data-bk="view" data-value="teams">TAG TEAMS (${booking.getTeams().length})</button>
        </div>
      </aside>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Venue picker
// ---------------------------------------------------------------------------

// Match and Promo stock, plus the pack catalog.
function gimmickStockHtml() {
  const inventory = booking.getGimmickInventory();
  const total = inventory.reduce((sum, entry) => sum + entry.count, 0);
  const promoInventory = booking.getPromoInventory();
  const promoTotal = promoInventory.reduce((sum, entry) => sum + entry.count, 0);
  const packs = booking.getCribPacks();
  const body = `${inventory.length
    ? `<div class="gimmick-card-grid tight">${inventory.map(entry => `<article class="gimmick-card rarity-${entry.rarity?.id ?? 'common'}">
        <small>${entry.rarity?.name ?? 'Common'}</small><b>${entry.name}</b><span>×${entry.count}</span>
      </article>`).join('')}</div>`
    : '<p class="bk-empty">No stipulations in stock. Singles and tag matches are always available.</p>'}
    <small class="bk-label spaced">PROMO CARDS · ${promoTotal} IN STOCK</small>
    ${promoInventory.length
      ? `<div class="gimmick-card-grid tight">${promoInventory.map(entry => `<article class="gimmick-card rarity-${entry.rarity.id}">
          <small>${entry.rarity.name} Promo</small><b>${entry.template.name}</b><span>×${entry.count}</span>
        </article>`).join('')}</div>`
      : '<p class="bk-empty">No Promo cards in stock. Packs add stories to play during the monthly promo.</p>'}
    ${view.packResult ? `<div class="gimmick-card-grid tight pack-opened">${view.packResult.map(card => `<article class="gimmick-card rarity-${card.rarity?.id ?? 'common'}"><small>NEW · ${card.kind === 'promo' ? 'PROMO · ' : ''}${card.rarity?.name ?? 'Common'}</small><b>${card.name}</b></article>`).join('')}</div>` : ''}
    <small class="bk-label spaced">PACK CATALOG · PRICES SCALE WITH GM LEVEL</small>
    <div class="crib-pack-list">${packs.map(pack => `<button class="crib-pack" style="--pack-color:${pack.color}" data-bk="buy-pack" data-value="${pack.id}" ${pack.affordable && !pack.soldOut ? '' : 'disabled'}>
      <span class="crib-pack-copy"><b>${pack.name}</b><small>${pack.blurb}</small></span>
      <span class="crib-pack-cost">${pack.soldOut ? 'SOLD OUT' : compactMoney(pack.cost)}</span>
    </button>`).join('')}</div>`;
  return fold('gimmick-stock', 'Match & Promo cards', `${total} match cards · ${promoTotal} Promos`, body);
}

function venueViewHtml() {
  const show = booking.getShow();
  const state = booking.getState();
  const gmLevel = booking.getGMLevel();
  const tourHistory = [
    ...(state.archive ?? []).map(entry => ({ ...entry, venueId: entry.venueId ?? venues.find(venue => venue.city === entry.city)?.id })),
    ...(state.houseShows ?? []).map(entry => ({ ...entry, showName: 'House Show', venueId: venues.find(venue => venue.city === entry.city)?.id })),
  ].sort((first, second) => String(second.date ?? '').localeCompare(String(first.date ?? '')));
  const recentVenueIds = state.history.slice(0, 3).map(entry => entry.venueId);
  const previousVenue = venues.find(venue => venue.id === recentVenueIds[0]);
  const homeRegion = MARKET_LOCATIONS[state.company.homeCity]?.region;
  const recommended = recommendTourVenue(
    venues.filter(venue => venueUnlocked(venue, gmLevel)), state.marketHype,
    recentVenueIds, previousVenue?.region ?? homeRegion, state.company.homeCity,
  );

  return `<div class="bk">
    ${backBar('Plan the tour', 'Build nearby markets, watch each city cool after a stop, and return when its crowd is ready.')}
    <div class="bk-venue-map-action"><button type="button" class="bk-heatmap-open" data-bk="view" data-value="heatmap">${createElement(MapIcon, { width: 18, height: 18, 'aria-hidden': 'true' }).outerHTML}<span>Heatmap</span></button></div>
    <div class="bk-grid">
      ${[...venues].sort((a, b) => venueRequiredLevel(a) - venueRequiredLevel(b) || a.capacity - b.capacity).map(v => {
        const requiredLevel = venueRequiredLevel(v);
        const unlocked = venueUnlocked(v, gmLevel);
        const hype = marketHypeForVenue(state.marketHype, v);
        const cityVisits = tourHistory.filter(entry => entry.city === v.city);
        const visitCount = Math.max(state.marketHype.visits?.[v.city] ?? 0, cityVisits.length);
        const lastVisit = cityVisits[0];
        const visitsAgo = tourHistory.findIndex(entry => entry.city === v.city);
        const tier = hypeTier(hype);
        const cooling = visitsAgo >= 0 && visitsAgo < 3;
        const timing = cooling ? 'COOLING AFTER A RECENT STOP'
          : hype >= 80 ? 'AT PEAK'
            : hype >= 55 ? 'READY FOR A RETURN'
              : hype >= 30 ? 'BUILDING A FOLLOWING' : 'NEW MARKET TO GROW';
        const lastVisitLabel = lastVisit?.date
          ? new Date(`${lastVisit.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : 'NEVER';
        return `<button class="bk-option wide ${show.venueId === v.id ? 'selected' : ''} ${unlocked ? '' : 'locked'}" data-bk="venue" data-value="${v.id}" ${unlocked ? '' : 'disabled'}>
          <span class="bk-option-head"><b>${v.city}</b><em>VENUE TIER ${requiredLevel} · ${compactMoney(v.rental + v.travel)}</em></span>
          ${recommended?.id === v.id && unlocked ? '<small class="venue-route-pick">RECOMMENDED TOUR STOP</small>' : ''}
          <span class="bk-option-meta">${v.name} · ${v.capacity.toLocaleString()} seats · $${v.baseTicket} tickets</span>
          <div class="venue-tour-history"><span><b>${visitCount}</b> SHOW${visitCount === 1 ? '' : 'S'} HERE</span><span>LAST STOP <b>${lastVisitLabel}</b></span></div>
          <div class="venue-hype-meter"><div><small>CITY HYPE</small><b style="color:${tier.color}">${hype}/100 · ${timing}</b></div><span role="meter" aria-label="${v.city} hype" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${hype}"><i style="width:${hype}%;background:${tier.color}"></i></span></div>
          <span class="venue-route-context">${MARKET_LOCATIONS[v.city]?.region?.toUpperCase() ?? 'INTERNATIONAL'} ROUTE · ${Math.round(v.tvReach * 100)}% LOCAL TV REACH</span>
          ${unlocked ? '' : `<small class="bk-flag">GM LEVEL ${requiredLevel} REQUIRED · YOU'RE LEVEL ${gmLevel}</small>`}
        </button>`;
      }).join('')}
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Promotion / staging / ticketing
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Match editor — participants and match type up front, the rest folded away
// ---------------------------------------------------------------------------
function slotButtonHtml(match, teamIndex, slotIndex, id) {
  const w = id ? getWrestlerById(id) : null;
  return `<div class="bk-slot ${w ? 'filled' : ''}">
    <button type="button" data-bk="pick-slot" data-match="${match.id}" data-team="${teamIndex}" data-index="${slotIndex}">
      ${w ? `${wrestlerPortraitHtml(w, 'bk-slot-portrait')}<span class="bk-slot-copy"><b>${w.name}</b><small>${w.style} · POP ${w.popularity} · STA ${booking.staminaFor(w.id)}</small></span>` : '<span class="bk-slot-copy"><b>+ Book a wrestler</b><small>Empty slot</small></span>'}
    </button>
    ${w ? `<button class="bk-slot-clear" data-bk="clear-slot" data-match="${match.id}" data-team="${teamIndex}" data-index="${slotIndex}">✕</button>` : ''}
  </div>`;
}

// Who wins is decided by the sim by default ("Let Fate Decide") — the player can
// instead call it for one side, locking in that side's win (the finish type/rating
// still comes from the real numbers, so an underdog call still reads like an upset).
// One button per side, with the fate option sitting in the middle of the row. Corner
// colors (red/yellow) only make sense for a two-sided match, so anything with 3+
// sides (triple threat, Battle Royale) falls back to the neutral gold styling.
function callFinishSideHtml(match, type) {
  const sides = type.slots.teams
    ? match.teams.map((team, teamIndex) => {
      const members = team.filter(Boolean).map(getWrestlerById).filter(Boolean);
      const label = members.length ? members.map(w => w.name).join(' & ') : `Corner ${String.fromCharCode(65 + teamIndex)}`;
      const repId = members[0]?.id ?? null;
      return { repId, label, filled: Boolean(repId) };
    })
    : matchParticipantIds(match).map(id => ({ repId: id, label: getWrestlerById(id)?.name ?? 'Unknown', filled: true }));
  return sides.map((side, index) => ({ ...side, corner: sides.length === 2 ? (index === 0 ? 'a' : 'b') : null }));
}

function callFinishSectionHtml(match) {
  const type = getMatchType(match.typeId);
  const sides = callFinishSideHtml(match, type);
  if (sides.filter(s => s.filled).length < 2) {
    return '<p class="bk-empty">Book at least two sides to call the finish.</p>';
  }
  const fateButton = `<button class="bk-finish-pick fate ${!match.winnerId ? 'selected' : ''}" data-bk="call-finish" data-value="">Let Fate Decide</button>`;
  const sideButtons = sides.map(s => (s.filled
    ? `<button class="bk-finish-pick ${s.corner ? `corner-${s.corner}` : ''} ${match.winnerId === s.repId ? 'selected' : ''}" data-bk="call-finish" data-value="${s.repId}">${s.label}</button>`
    : `<button class="bk-finish-pick ${s.corner ? `corner-${s.corner}` : ''}" disabled>${s.label}</button>`));
  const mid = Math.ceil(sideButtons.length / 2);
  const ordered = [...sideButtons.slice(0, mid), fateButton, ...sideButtons.slice(mid)];
  return `<div class="bk-finish-row">${ordered.join('')}</div>`;
}

// The angle picker for a single match: continue a live rivalry, spark one this pairing
// fits, or leave it standard. Player choice is only one input — the rest grows on its own.
// "Write your own" — a title + description, no eligibility gating. Values live on
// `view` (like the team-name input) so typing doesn't re-render/steal focus; the
// submit button reads them off `view` at click time.
function customPromoFormHtml(match) {
  const title = view.customStorylineTitle ?? '';
  const description = view.customStorylineDescription ?? '';
  return `<div class="bk-custom-storyline">
      <label><span>Title</span><input type="text" maxlength="60" placeholder="e.g. The Line Was Crossed" data-bk-input="custom-storyline-title" value="${title}" /></label>
      <label><span>Promo</span><textarea maxlength="400" rows="4" placeholder="What happens in this one-off promo? It will be saved to the wrestlers' history." data-bk-input="custom-storyline-description">${description}</textarea></label>
      <button class="bk-primary" data-bk="promo-card-custom-submit" data-value="${match.id}" ${title.trim() ? '' : 'disabled'}>SAVE PROMO</button>
      <button class="bk-chip" data-bk="promo-card-custom-cancel">CANCEL</button>
    </div>`;
}

function storyStepperHtml(selection, spotlight, partner) {
  const match = selection.match;
  const selected = booking.getMatchPromoCard(match.id);
  if (view.customPromoMatchId === match.id) return customPromoFormHtml(match);
  if (selected) {
    return `<div class="promo-card-selected">
      <small class="bk-label">PROMO CARD · ${selected.rarity?.name?.toUpperCase() ?? 'UNIQUE'}</small>
      <b>${selected.name}</b><p>${selected.description}</p>
      ${selected.effect?.formsTagTeam ? '<small>AFTER THIS MATCH, THEY FORM A TAG TEAM WITH MAX CHEMISTRY</small>' : ''}
      ${selected.played
        ? '<span class="promo-card-played">PLAYED FOR THIS SHOW</span>'
        : `<div class="bk-chips"><button class="bk-chip" data-bk="promo-card-clear" data-value="${match.id}">REMOVE PROMO CARD</button><button class="bk-chip promo-card-skip" data-bk="promo-card-skip" data-match="${match.id}" data-wrestler="${spotlight.id}">SKIP PROMO CARD THIS MONTH</button></div>`}
      ${selected.effect ? `<small>HYPE +${selected.effect.matchBuzz} · ${getWrestlerById(selected.wrestlerId)?.name ?? 'Wrestler'} MOMENTUM +${selected.effect.momentum} · POP +${selected.effect.popularity}${selected.effect.contenderOnWin ? ' · WIN REQUIRED: #1 CONTENDER' : ''}</small>` : ''}
    </div>`;
  }

  const cards = booking.getPromoCardsForMatch(match.id, spotlight.id, partner.id);
  const cardGrid = cards.length
    ? `<div class="bk-storyline-grid">${cards.map(card => `<button class="bk-storyline-card promo-card rarity-${card.rarity.id}" data-bk="promo-card-select" data-value="${card.id}" data-match="${match.id}" data-wrestler="${spotlight.id}">
        <small>${card.rarity.name.toUpperCase()} · ${card.available} AVAILABLE</small><b>${card.template.name}</b><p>${card.id === 'custom' ? card.template.description : previewText(card.template, spotlight, partner, booking.getCompanyIdentity())}</p>${card.id === 'friendship-clause' ? '<small>FORMS A HIGH-CHEMISTRY TAG TEAM AFTER THE MATCH</small>' : ''}
        <em>${card.id === 'custom' ? 'RARE EFFECTS · HYPE +9-16 · MOMENTUM +1-2 · POP +2-4' : card.id === 'number-one-spot' ? `HYPE +${card.rarity.matchBuzz[0]}-${card.rarity.matchBuzz[1]} · MOMENTUM +${card.rarity.momentum[0]}-${card.rarity.momentum[1]} · POP +${card.rarity.popularity[0]}-${card.rarity.popularity[1]} · WINNER BECOMES #1 CONTENDER` : `HYPE +${card.rarity.matchBuzz[0]}-${card.rarity.matchBuzz[1]} · ${spotlight.name} MOMENTUM +${card.rarity.momentum[0]}-${card.rarity.momentum[1]} · POP +${card.rarity.popularity[0]}-${card.rarity.popularity[1]}`}</em>
      </button>`).join('')}</div>`
    : '<p class="bk-empty">No owned Promo cards fit this pairing.</p>';

  return `<div class="promo-card-picker">
    <small class="bk-label">OWNED PROMO CARDS · FOR ${spotlight.name.toUpperCase()}</small>
    ${cardGrid}
    <button class="bk-chip promo-card-skip" data-bk="promo-card-skip" data-match="${match.id}" data-wrestler="${spotlight.id}">SKIP PROMO CARD THIS MONTH</button>
  </div>`;
}

// The mic phase's current pick: which booked wrestler holds the mic, who the story is
// with, and whatever angle is already attached between them on that match.
function micSelection() {
  const match = view.monthlySpotlightId ? booking.getMatch(view.matchId) : null;
  if (!match) return null;
  const spotlightId = view.monthlySpotlightId;
  const ids = matchParticipantIds(match);
  if (!ids.includes(spotlightId)) return null;
  const type = getMatchType(match.typeId);
  const ownerTeam = match.teams.findIndex(team => team.includes(spotlightId));
  const isTeammate = id => Boolean(type.slots.teams && match.teams[ownerTeam]?.includes(id));
  const partnerIds = ids.filter(id => id !== spotlightId).sort((a, b) => isTeammate(a) - isTeammate(b));
  const partnerId = partnerIds.includes(view.storylinePartnerId) ? view.storylinePartnerId : partnerIds[0];
  view.storylinePartnerId = partnerId;
  return { match, partnerIds, partnerId, isTeammate, promoCard: booking.getMatchPromoCard(match.id) };
}

function micTileHtml(match, id, selection) {
  const wrestler = getWrestlerById(id);
  if (!wrestler) return '';
  const promoCard = booking.getMatchPromoCard(match.id);
  const selected = selection?.match.id === match.id && view.monthlySpotlightId === id;
  return `<button class="mic-tile ${selected ? 'selected' : ''}" data-bk="monthly-spotlight" data-value="${id}" data-match="${match.id}">
    ${wrestlerPortraitHtml(wrestler, 'bk-wrestler-portrait mic-tile-portrait')}
    <span class="mic-tile-copy"><b>${wrestler.name}</b><small title="Charisma above 50 grants a chance to roll twice and keep the better reward. Lower charisma keeps standard odds.">CHA ${wrestler.stats?.charisma ?? '—'} · BONUS ROLL ${Math.round(promoCharismaChance(wrestler.stats?.charisma) * 100)}%</small>${promoCard?.wrestlerId === id ? `<em>${promoCard.name}</em>` : ''}</span>
  </button>`;
}

function micStoryHtml(selection) {
  if (!selection) return '';
  const spotlight = getWrestlerById(view.monthlySpotlightId);
  const partner = getWrestlerById(selection.partnerId);
  const body = storyStepperHtml(selection, spotlight, partner);
  const partnerChips = selection.partnerIds.length > 1
    ? `<div class="bk-chips bk-storyline-partners"><span class="story-with-label">STORY WITH</span>${selection.partnerIds.map(id => `<button class="bk-chip ${id === selection.partnerId ? 'selected' : ''}" data-bk="monthly-partner" data-value="${id}">${getWrestlerById(id)?.name ?? id}<em>${selection.isTeammate(id) ? 'TAG PARTNER' : 'OPPONENT'}</em></button>`).join('')}</div>`
    : '';
  return `<div class="mic-story">
    <small class="bk-label">${spotlight.name.toUpperCase()}'S STORY${partner ? ` · WITH ${partner.name.toUpperCase()}` : ''}</small>
    ${partnerChips}
    ${body}
  </div>`;
}

function micCardHtml() {
  const show = booking.getShow();
  if (!show.matches.some(match => matchParticipantIds(match).length >= 2)) {
    return '<p class="bk-empty">Book a match with at least two wrestlers first — the mic needs someone to talk to.</p>';
  }
  const selection = micSelection();
  const matches = show.matches.map((match, index) => {
    const ids = matchParticipantIds(match);
    if (ids.length < 2) return '';
    const type = getMatchType(match.typeId);
    const sides = type.slots.teams
      ? match.teams.map(team => team.filter(Boolean)).filter(team => team.length)
      : ids.length <= 4 ? ids.map(id => [id]) : [ids];
    return `<section class="mic-match ${selection?.match.id === match.id ? 'active' : ''}">
      <div class="mic-match-tag"><small>${positionLabel(index, show.matches.length)}</small><span>${type.name}</span></div>
      <div class="mic-match-sides">${sides.map(side => `<div class="mic-side">${side.map(id => micTileHtml(match, id, selection)).join('')}</div>`).join('<span class="mic-vs">VS</span>')}</div>
      ${selection?.match.id === match.id ? micStoryHtml(selection) : ''}
    </section>`;
  }).join('');
  return `<div class="mic-card">${matches}</div>`;
}

function matchViewHtml() {
  const match = booking.getMatch(view.matchId);
  if (!match) return cardViewHtml();
  const show = booking.getShow();
  const index = show.matches.findIndex(m => m.id === match.id);
  const type = getMatchType(match.typeId);
  const venue = getVenueById(show.venueId);
  const projection = projectMatch(match, {
    venue,
    isMainEvent: index === show.matches.length - 1,
    position: index,
    cardSize: show.matches.length,
    staleness: stalenessForMatch(match, show, booking.getState().history, index),
    history: booking.getState().history,
    staminaLookup: booking.staminaFor,
  });

  const perTeam = type.slots.teams ? type.slots.perTeam : type.slots.max;
  const bookableTitles = booking.bookableTitlesFor(match.id);


  const detail = `
    ${qualityBar(projection.quality)}
    ${meter('Chemistry', projection.chemistry)}
    ${meter('Star Power', projection.starPower)}
    ${meter('Injury Risk', projection.injuryRisk, 40, projection.injuryRisk > 12 ? 'bad' : '')}
    ${readList(projection.factors, 8)}
    <div class="bk-ledger">
      <span><small>TALENT PURSES</small><b>${money(projection.purses)}</b></span>
      <span><small>MATCH SETUP</small><b>${money(projection.presentationSpend)}</b></span>
      <span><small>RUNTIME</small><b>${projection.minutes} min</b></span>
      <span><small>STAMINA DRAIN</small><b>${projection.drain}</b></span>
    </div>
    ${projection.notes.length ? `<ul class="bk-flag-list good">${projection.notes.map(n => `<li>${n}</li>`).join('')}</ul>` : ''}`;

  return `<div class="bk">
    ${backBar(positionLabel(index, show.matches.length), type.description, 'card', 'SAVE & BACK')}

    <div class="bk-editor">
      <div class="bk-editor-main">
        ${bookableTitles.length || match.titleId ? `<section class="title-toggle-row">${bookableTitles.map(({ def, state: t, holderNames }) => {
          const on = match.titleId === def.id;
          return `<button class="title-toggle ${on ? 'on' : ''}" data-bk="title" data-value="${on ? '' : def.id}">
            <span class="title-toggle-box">${on ? '✓' : ''}</span>
            <span class="title-toggle-copy"><b>${booking.companyBrandedText(def.name)}</b><small>${t.holders.length ? `${holderNames.join(' & ')} defending` : 'Vacant — crown a new champion'}</small></span>
          </button>`;
        }).join('')}</section>` : ''}

        <div class="bk-teams" style="--bk-team-columns:${match.teams.length === 4 ? 2 : Math.min(3, match.teams.length)};--bk-team-mobile-columns:${Math.min(2, match.teams.length)}">
          ${match.teams.map((team, teamIndex) => `
            <div class="bk-team ${!type.slots.teams ? 'bk-team-field' : teamIndex < 2 ? `corner-${teamIndex === 0 ? 'a' : 'b'}` : ''}">
              <header><span>${type.slots.teams ? `CORNER ${String.fromCharCode(65 + teamIndex)}` : 'THE FIELD'}</span>${type.slots.teams && teamIndex > 0 ? '<span class="bk-team-vs" aria-hidden="true">VS</span>' : ''}</header>
              ${Array.from({ length: perTeam }, (_, slotIndex) => slotButtonHtml(match, teamIndex, slotIndex, team[slotIndex])).join('')}
            </div>
          `).join('')}
        </div>

        <section class="bk-finish-panel">
          <small class="bk-label">CALL THE FINISH</small>
          ${callFinishSectionHtml(match)}
        </section>

        <section>
          <small class="bk-label">MATCH TYPE</small>
          <div class="bk-chips">
            ${BASIC_TYPE_IDS.map(id => {
              const t = getMatchType(id);
              return `<button class="bk-chip type-chip ${match.typeId === id ? 'selected' : ''}" data-bk="type" data-value="${id}">${t.name}</button>`;
            }).join('')}
          </div>
        </section>
        ${gimmickSlotHtml(match)}

      </div>

      <aside class="bk-side">
        <div class="bk-rating">
          <small>PROJECTED MATCH</small>
          <b>${projection.valid ? projection.grade : '—'}</b>
          <span>${projection.valid ? `${projection.confidence} read ${confidenceDots(projection.confidence)}` : 'Fill every slot to project'}</span>
        </div>
        ${projection.valid ? qualityBar(projection.quality) : ''}
        ${readList(projection.factors, 4)}
        <div class="bk-quickstats">
          <span><small>COST</small><b>${compactMoney(projection.cost)}</b><em>${projection.minutes} min</em></span>
          <span><small>CHEMISTRY</small><b>${projection.chemistry || '—'}</b><em>injury ${projection.injuryRisk}%</em></span>
        </div>
        ${projection.warnings.length ? `<div class="bk-notes warn"><small>FLAGS</small><ul>${projection.warnings.map(n => `<li>${n}</li>`).join('')}</ul></div>` : ''}
        ${fold('match-detail', 'Match breakdown', projection.valid ? `ceiling ${projection.quality.ceiling}` : 'incomplete', detail)}
      </aside>
    </div>
    <button class="bk-primary bk-match-save" data-bk="view" data-value="card">SAVE MATCH &amp; RETURN TO CARD</button>
  </div>`;
}

// An optional card you lay on the match. Empty slot when nothing is played.
function gimmickSlotHtml(match) {
  const played = isBasicMatchType(match.typeId) ? null : getMatchType(match.typeId);
  const playedRarity = played ? gimmickRarity(played.id) : null;
  const held = booking.getGimmickInventory().filter(entry => entry.id !== match.typeId);

  const foldBody = `
    <div class="gimmick-slot-row">
      <div class="gimmick-slot ${played ? `filled rarity-${playedRarity?.id ?? 'common'}` : 'empty'}">
        ${played ? `
          <small>${playedRarity?.name ?? 'Stipulation'}</small>
          <b>${played.name}</b>
          <span>Ceiling +${played.ceiling + (playedRarity?.ceilingBonus ?? 0)} · Buzz +${played.buzz + (playedRarity?.buzzBonus ?? 0)}</span>
          <span class="gimmick-description">${played.description}</span>
          <button type="button" class="bk-chip gimmick-slot-clear" data-bk="gimmick-clear" aria-label="Remove stipulation from match" title="Remove stipulation">×</button>
        ` : '<span class="gimmick-slot-hint">No stipulation<br>on this match</span>'}
      </div>
      <div class="gimmick-slot-copy">
        ${played ? '' : '<p>Stipulations are drawn from your available cards and spent when the show runs.</p>'}
        ${held.length ? `<div class="bk-chips gimmick-picker">${held.map(entry => {
          const available = booking.canBookMatchType(entry.id, match.typeId);
          return `<button type="button" class="bk-chip type-chip rarity-${entry.rarity?.id ?? 'common'} ${available ? '' : 'locked'}" data-bk="gimmick" data-value="${entry.id}" title="${entry.type.description}" ${available ? '' : 'disabled'}>${entry.name}<em>${entry.count} HELD</em><small class="gimmick-card-description">${entry.type.description}</small></button>`;
        }).join('')}</div>` : '<p class="bk-empty">No other cards in stock.</p>'}
      </div>
    </div>`;

  return fold('match-gimmick', 'Match card', played ? 'Modifier active' : 'No match card this match', foldBody);
}

// ---------------------------------------------------------------------------
// Roster picker
// ---------------------------------------------------------------------------
function rosterViewHtml() {
  if (!view.slot) return cardViewHtml();
  const { matchId, team, index } = view.slot;
  const match = booking.getMatch(matchId);
  if (!match) return cardViewHtml();
  const currentId = match.teams[team]?.[index];
  if (currentId && !view.rosterCandidate) view.rosterCandidate = currentId;
  const rows = booking.getPowerRankings()
    .map(({ w, rank, champion }) => ({ w, rank, champion, booked: booking.isBooked(w.id), injury: booking.injuryFor(w.id) }));

  const candidate = getWrestlerById(view.rosterCandidate);
  const candidateRanking = rows.find(({ w }) => w.id === candidate?.id);

  return `<div class="bk house-pick-screen">
    <div class="bk-back"><button data-bk="roster-cancel">← MATCH</button><div><b>Book Wrestler</b><small>${positionLabel(booking.getShow().matches.indexOf(match), booking.getShow().matches.length)} · ${getMatchType(match.typeId).name}</small></div></div>
    <div class="house-roster-select">
    <div class="house-roster-grid">
      ${rows.map(({ w, booked, injury }) => `
        <button type="button" class="house-roster-tile ${booked ? 'booked' : ''} ${view.rosterCandidate === w.id ? 'selected' : ''}" data-bk="${view.rosterCandidate === w.id ? 'roster-confirm' : 'roster-highlight'}" data-value="${w.id}" ${injury ? 'disabled' : ''}>
          <span class="house-roster-photo">
            ${wrestlerImageUrl(w) ? `<img src="${wrestlerImageUrl(w)}" alt="${w.name}">` : `<span class="house-roster-initials">${w.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span>`}
            ${injury ? `<em class="house-roster-badge">INJURED</em>` : booked ? `<em class="house-roster-badge">BOOKED</em>` : view.rosterCandidate === w.id ? `<em class="house-roster-badge">SELECTED</em>` : ''}
          </span>
          <b class="house-roster-name">${w.name}</b>
        </button>`).join('')}
    </div>
    <div class="house-roster-detail">
      ${candidate ? `<div class="house-roster-detail-main"><div><div class="house-roster-detail-heading"><b><button type="button" class="profile-link inline" data-profile="${candidate.id}" title="View wrestler profile">${candidate.name}</button></b><span class="house-roster-record">(${recordString(candidate.record)})${candidateRanking ? ` <span class="house-roster-detail-rank">${candidateRanking.champion ? 'Champion' : `#${candidateRanking.rank} Contender`}</span>` : ''}</span></div><small>${candidate.style} · POP ${candidate.popularity} · STA ${booking.staminaFor(candidate.id)} · ${momentumLabel(candidate.momentum)}</small><p>${candidate.bio}</p></div></div>
      <div class="bk-taste"><span>STR ${candidate.stats.strength}</span><span>AGI ${candidate.stats.agility}</span><span>STA ${candidate.stats.stamina}</span><span>TECH ${candidate.stats.technique}</span><span>CHA ${candidate.stats.charisma}</span><span>TGH ${candidate.stats.toughness}</span></div>
      <div class="house-roster-actions"><button type="button" class="bk-primary" data-bk="roster-confirm">ADD TO MATCH</button><button type="button" class="house-roster-profile" data-profile="${candidate.id}">VIEW PROFILE</button></div>` : '<p class="bk-empty">Choose a wrestler to see their details.</p>'}
    </div>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------
function historyViewHtml() {
  const history = booking.getState().history;
  return `<div class="bk">
    <p class="history-context">The freshness engine reads the last three shows.</p>
    ${history.length ? `<div class="bk-stack">${history.map((show, depth) => `
      <article class="bk-history">
        <header><b>${show.name}</b><span>${getVenueById(show.venueId)?.city ?? ''} · ${show.attendance.toLocaleString()} fans · rating ${show.rating} · ${signed(show.profit)}</span></header>
        <ul>${show.matches.map(m => `<li><span>${getMatchType(m.typeId)?.name ?? m.typeId}</span>${m.participantIds.map(id => getWrestlerById(id)?.name ?? id).join(' vs. ')}${m.stakeId !== 'none' ? ` <em>(${getStake(m.stakeId).name})</em>` : ''}</li>`).join('')}</ul>
      </article>`).join('')}</div>` : '<p class="bk-empty">No shows in the books yet. Lock in your first card.</p>'}
  </div>`;
}

// ---------------------------------------------------------------------------
// Results — presented as the show's own poster / results pamphlet
// ---------------------------------------------------------------------------
function resultsViewHtml() {
  const result = booking.getState().results[view.resultIndex];
  if (!result) return cardViewHtml();
  const promoMoments = result.matches.flatMap(match => [match.promoCard, match.storyIncident].filter(Boolean));

  const outcomeLine = m => (m.winnerNames
    ? `<b>${m.winnerNames}</b><span class="poster-def">def.</span><b class="poster-loser">${m.loserNames}</b>`
    : `<b>${m.sideNames.join(' & ')}</b><span class="poster-def">drew with</span><b class="poster-loser">${m.loserNames}</b>`);

  return `<div class="bk poster">
    <div class="poster-sheet">
      <header class="poster-head">
        <small>${booking.getCompanyIdentity().name.toUpperCase()} PRESENTS</small>
        <h1>${result.showName}</h1>
        <div class="poster-event-meta"><span>${result.date}</span><span>${result.venueName} · ${result.city}</span></div>
        ${result.fillPercent >= 97 ? '<span class="poster-stamp">SOLD OUT</span>' : ''}
      </header>

      <div class="poster-grade">
        <div><b>${result.rating}</b><small>${result.ratingLabel}</small></div>
        <div class="poster-stars">${result.stars}</div>
        <div class="poster-grade-meta">
          <span>${result.attendance.toLocaleString()} in attendance</span>
          <span>${result.tvRating} TV rating · ${Math.round(result.tvViewers / 1000).toLocaleString()}K homes</span>
        </div>
      </div>

      <ol class="poster-card">
        ${[...result.matches].reverse().map(m => `
          <li>
            <button data-bk="result-match" data-value="${result.matches.indexOf(m)}">
              ${matchPortraitsHtml(m.participantIds, 'poster-card-portraits')}
              <span class="poster-slot">${m.label}<small class="poster-type">${m.typeName}</small>${m.stakeId !== 'none' ? ` · ${booking.companyBrandedText(m.stakeName)}` : ''}</span>
              <span class="poster-result">${outcomeLine(m)}</span>
              <span class="poster-rating"><em>${m.stars}</em><small>${m.rating}</small></span>
              ${m.titleOutcome && (m.titleOutcome.type === 'change' || m.titleOutcome.type === 'crowned') ? '<span class="poster-tag belt">NEW CHAMPION</span>' : m.upset ? '<span class="poster-tag">UPSET</span>' : ''}
            </button>
          </li>`).join('')}
      </ol>

      <div class="poster-numbers">
        <span><small>ATTENDANCE</small><b>${result.attendance.toLocaleString()}</b><em>${result.fillPercent}% of ${result.capacity.toLocaleString()}</em></span>
        <span><small>HOME VIEWERS</small><b>${Math.round(result.tvViewers / 1000).toLocaleString()}K</b><em>${result.tvRating} rating${result.tvAudienceChange != null ? ` · regular audience ${result.tvAudienceChange >= 0 ? '+' : ''}${Math.round(result.tvAudienceChange / 1000).toLocaleString()}K` : ''}</em></span>
        <span><small>TICKET GATE</small><b>${compactMoney(result.revenue.gate)}</b><em>box office</em></span>
        <span><small>TV / RIGHTS</small><b>${compactMoney(result.revenue.television)}</b><em>broadcast fee</em></span>
        <span><small>MERCHANDISE</small><b>${compactMoney(result.revenue.merch)}</b><em>${money(Math.round(result.revenue.merch / Math.max(result.attendance, 1)))} per head</em></span>
        <span class="${result.profit >= 0 ? 'good' : 'bad'}"><small>NET</small><b>${signed(result.profit)}</b><em>${compactMoney(result.costs)} spent</em></span>
      </div>

      <div class="poster-recap">
        <small class="bk-label">THE WRAP</small>
        <p>${result.recap}</p>
        ${result.headlines.length ? `<ul class="poster-headlines">${result.headlines.map(h => `<li>${h}</li>`).join('')}</ul>` : ''}
        ${promoMoments.length ? `<div class="poster-storylines"><small class="bk-label">PROMO MOMENTS</small><ul>${promoMoments.map(promo => `<li><b>${promo.promoName}</b> · ${promo.participantIds.map(id => getWrestlerById(id)?.name ?? id).join(' vs. ')}</li>`).join('')}</ul></div>` : ''}
      </div>

      ${bookerReportHtml(result.report)}
      ${titleReportHtml(result)}
      ${progressHtml(result.progress?.awards ? { ...result.progress, awards: null } : result.progress)}
      ${result.progress?.awards ? '' : agingHtml(result.aging)}
      ${debutsHtml(result.debuts)}

      <footer class="poster-foot">
        <button class="bk-primary" data-bk="view" data-value="${result.progress?.awards ? 'year-recap' : 'card'}">${result.progress?.awards ? 'CONTINUE TO YEAR IN REVIEW →' : 'BOOK THE NEXT SHOW →'}</button>
        <button data-bk="view" data-value="trophies">TROPHY ROOM</button>
        <button data-bk="view" data-value="records">RECORD BOOK</button>
      </footer>
    </div>
  </div>`;
}

function incidentViewHtml() {
  const incident = booking.getPendingIncident();
  if (!incident) return resultsViewHtml();
  const participants = incident.participants.map(getWrestlerById).filter(Boolean);
  return `<div class="bk incident-screen">
    <header class="incident-head">
      <small>AFTER THE SHOW · LOCKER ROOM</small>
      <h1>${incident.title}</h1>
      <p>${incident.body}</p>
    </header>
    ${participants.length ? `<div class="incident-portraits">${participants.map(wrestler => `${wrestlerPortraitHtml(wrestler, 'incident-portrait')}<span><b>${wrestler.name}</b><small>Morale ${booking.moraleFor(wrestler.id)} · Trust ${booking.relationshipFor(wrestler.id)}</small></span>`).join('')}</div>` : ''}
    <small class="bk-label">YOUR RESPONSE</small>
    <div class="incident-choices">${incident.choices.map(choice => `<button class="bk-option wide" data-bk="incident-choice" data-value="${choice.id}"><b>${choice.label}</b><span>${choice.detail}</span></button>`).join('')}</div>
    <p class="incident-note">This alternate-history event was generated from current morale, trust, injuries, and personality. Your response becomes part of the company record.</p>
  </div>`;
}

function incidentMetricSnapshot(wrestlerId) {
  const wrestler = getWrestlerById(wrestlerId);
  if (!wrestler) return null;
  return {
    id: wrestlerId,
    name: wrestler.name,
    values: {
      Morale: booking.moraleFor(wrestlerId),
      Trust: booking.relationshipFor(wrestlerId),
      Momentum: wrestler.momentum,
      Popularity: wrestler.popularity,
      Stamina: booking.staminaFor(wrestlerId),
      'Injury time': booking.injuryFor(wrestlerId),
    },
  };
}

function incidentResultHtml() {
  const outcome = view.incidentResult;
  if (!outcome) return resultsViewHtml();
  const people = outcome.people.map(person => {
    const changes = Object.entries(person.after.values).flatMap(([label, value]) => {
      const delta = value - person.before.values[label];
      return delta ? [`<li>${label} ${delta > 0 ? '+' : ''}${delta} <small>(now ${value})</small></li>`] : [];
    });
    return `<section class="incident-result-person"><b>${person.after.name}</b>${changes.length ? `<ul>${changes.join('')}</ul>` : '<p>No tracked stats changed.</p>'}</section>`;
  }).join('');
  const cashChange = outcome.cashAfter - outcome.cashBefore;
  return `<div class="bk incident-screen incident-result-screen">
    <header class="incident-head"><small>DECISION RECORDED · ${outcome.incident.title.toUpperCase()}</small><h1>${outcome.choiceLabel}</h1><p>${outcome.message}</p></header>
    <section class="incident-result-ledger"><small>WHAT CHANGED</small>${people}${cashChange ? `<p class="incident-cash-change">Operating cash ${cashChange > 0 ? '+' : ''}${money(cashChange)} <small>(now ${money(outcome.cashAfter)})</small></p>` : ''}</section>
    <button class="bk-primary incident-result-continue" data-bk="incident-result-continue">CONTINUE TO SHOW RESULTS</button>
  </div>`;
}

function yearEndRecapHtml() {
  const result = booking.getState().results[view.resultIndex];
  const awards = result?.progress?.awards;
  const recap = awards?.recap;
  if (!result || !awards || !recap) return resultsViewHtml();
  const world = recap.world;
  const promos = recap.promos ?? [];
  return `<div class="bk year-recap">
    <header class="year-recap-head">
      <small>${booking.getCompanyIdentity().name.toUpperCase()} · ANNUAL REPORT</small>
      <h1>${recap.year} IN REVIEW</h1>
      <p>Twelve flagship events. One year written into the record book.</p>
    </header>
    <section class="year-score">
      <div><small>SEASON GRADE</small><b>${awards.averageRating}</b><span>${ratingLabel(awards.averageRating)}</span></div>
      <p>${awards.totalProfit >= 0 ? 'The company finished the year in the black.' : 'The promotion survived the year, but the books need attention.'} ${recap.sellouts ? `${recap.sellouts} sellout${recap.sellouts === 1 ? '' : 's'} proved the audience is there.` : 'A first sellout remains unfinished business.'}</p>
    </section>
    <div class="year-totals">
      <span><small>TOTAL ATTENDANCE</small><b>${recap.totalAttendance.toLocaleString()}</b></span>
      <span><small>REVENUE</small><b>${compactMoney(awards.totalRevenue)}</b></span>
      <span class="${awards.totalProfit >= 0 ? 'good' : 'bad'}"><small>PROFIT</small><b>${signed(awards.totalProfit)}</b></span>
      <span><small>MATCHES</small><b>${recap.totalMatches}</b></span>
      <span><small>SELLOUTS</small><b>${recap.sellouts}</b></span>
      <span><small>UPSETS</small><b>${recap.upsets}</b></span>
    </div>
    <section class="year-section">
      <small class="bk-label">THE HIGHS</small>
      <div class="year-highlights">
        ${awards.wrestlerOfSeason ? `<article><small>WRESTLER OF THE YEAR</small><b>${awards.wrestlerOfSeason.name}</b><p>${awards.wrestlerOfSeason.external ? '(Signed to Rival\'s roster)' : `${awards.wrestlerOfSeason.wins} wins in ${awards.wrestlerOfSeason.matches} matches`}</p></article>` : ''}
        ${awards.matchOfSeason ? `<article><small>MATCH OF THE YEAR</small><b>${awards.matchOfSeason.names}</b><p>${awards.matchOfSeason.stars} · ${awards.matchOfSeason.show}</p></article>` : ''}
        ${awards.showOfSeason ? `<article><small>SHOW OF THE YEAR</small><b>${awards.showOfSeason.name}</b><p>${awards.showOfSeason.rating} rating · ${awards.showOfSeason.city}</p></article>` : ''}
      </div>
    </section>
    <div class="year-columns">
      <section class="year-section">
        <small class="bk-label">PROMOS THAT MOVED THE NEEDLE</small>
        ${promos.length ? `<div class="year-list">${promos.map(promo => `<article><b>${promo.name}</b><span>${promo.participants.join(' vs. ')}</span><small>${promo.rarity} · match rating ${promo.rating} · hype +${promo.hype}</small></article>`).join('')}</div>` : '<p class="bk-empty">No standout Promos were played this year.</p>'}
      </section>
      <section class="year-section">
        <small class="bk-label">CHAMPIONS AT YEAR'S END</small>
        ${recap.champions.length ? `<div class="year-list">${recap.champions.map(champion => `<article><b>${champion.holders.join(' & ')}</b><span>${champion.title}</span><small>Prestige ${champion.prestige}</small></article>`).join('')}</div>` : '<p class="bk-empty">Every championship is vacant.</p>'}
      </section>
    </div>
    <section class="year-section world-year">
      <small class="bk-label">MEANWHILE, OUTSIDE THE ARENA</small>
      <div class="world-year-grid">
        <article><small>THE WHITE HOUSE</small><b>${world.president}</b></article>
        <article><small>BOX-OFFICE LEADER</small><b>${world.movie}</b></article>
        <article><small>BIGGEST-SELLING MUSIC</small><b>${world.album}</b></article>
        <article><small>NBA CHAMPIONS</small><b>${world.nba}</b></article>
        <article><small>SUPER BOWL CHAMPIONS</small><b>${world.nfl}</b></article>
      </div>
    </section>
    <section class="year-section next-year-watch">
      <small class="bk-label">WATCH NEXT YEAR</small>
      <ul>
        ${recap.upcomingDebuts.map(debut => `<li><b>${debut.name}</b> reaches the market in roughly ${debut.showsAway} show${debut.showsAway === 1 ? '' : 's'}.</li>`).join('')}
        ${!recap.upcomingDebuts.length ? '<li>The field is open. January begins without an obvious path.</li>' : ''}
      </ul>
    </section>
    ${agingHtml(result.aging)}
    <footer class="poster-foot">
      <button class="bk-primary" data-bk="view" data-value="card">START THE NEXT YEAR →</button>
      <button data-bk="view" data-value="results">BACK TO FINAL SHOW RESULTS</button>
      <button data-bk="view" data-value="records">RECORD BOOK</button>
    </footer>
  </div>`;
}

// The teaching tool: exactly what moved the needle, with the numbers exposed.
function bookerReportHtml(report) {
  if (!report) return '';
  const row = f => `<li class="${f.delta > 0 ? 'up' : 'down'}"><b>${f.label}</b><em>${f.delta > 0 ? '+' : ''}${f.delta}</em></li>`;
  return `<section class="poster-report">
    <header>
      <small class="bk-label">THE BOOKER'S REPORT</small>
      <span>Projected <b>${report.projectedRating}</b> · finished <b>${report.actualRating}</b>
        <em class="${report.delta >= 0 ? 'good' : 'bad'}">${report.delta >= 0 ? '+' : ''}${report.delta}</em></span>
    </header>
    <div class="poster-report-cols">
      <div>
        <small>WHAT HELPED</small>
        <ul>${report.helped.map(row).join('') || '<li class="empty">Nothing stood out.</li>'}</ul>
      </div>
      <div>
        <small>WHAT HURT</small>
        <ul>${report.hurt.map(row).join('') || '<li class="empty">Nothing dragged it down.</li>'}</ul>
      </div>
    </div>
    <p class="poster-luck">${report.luck}</p>
    ${report.lessons.length ? `<ul class="poster-lessons">${report.lessons.map(l => `<li>${l}</li>`).join('')}</ul>` : ''}
  </section>`;
}

function progressHtml(progress) {
  if (!progress) return '';
  const { trophies = [], records = [], awards = null, matchOfTheNight = null, gmProgression = null } = progress;
  if (!trophies.length && !records.length && !awards && !matchOfTheNight && !gmProgression) return '';

  return `<section class="poster-progress">
    ${gmProgression ? `<div class="poster-gm-progress"><small class="bk-label">GM PROGRESSION</small><b>+${gmProgression.experienceEarned} XP</b><span>LEVEL ${gmProgression.level} · ${gmProgression.totalExperience} TOTAL XP${gmProgression.leveledUp ? ' · LEVEL UP' : ''}</span></div>` : ''}
    ${matchOfTheNight ? `<div class="poster-motn"><small class="bk-label">MATCH OF THE NIGHT</small><b>${matchOfTheNight.sideNames.join(' vs. ')}</b><span>${matchOfTheNight.stars} · ${matchOfTheNight.rating}</span></div>` : ''}
    ${trophies.length ? `<div class="poster-trophies">
      <small class="bk-label">TROPHIES EARNED</small>
      <div class="poster-trophy-row">${trophies.map(t => `<article class="trophy ${t.tier}"><span class="trophy-badge">${t.tier === 'gold' ? '★' : t.tier === 'silver' ? '◆' : '●'}</span><b>${t.name}</b><small>${t.flavor}</small></article>`).join('')}</div>
    </div>` : ''}
    ${records.length ? `<div class="poster-records">
      <small class="bk-label">COMPANY RECORDS BROKEN</small>
      <ul>${records.map(r => `<li><b>${r.label}</b> — ${r.format(r.value)} <em>(previous ${r.format(r.previous)})</em></li>`).join('')}</ul>
    </div>` : ''}
    ${awards ? `<div class="poster-awards">
      <small class="bk-label">${awards.recap?.year ?? awards.season} AWARDS</small>
      <div class="poster-award-row">
        ${awards.wrestlerOfSeason ? `<article><small>WRESTLER OF THE YEAR</small><b>${awards.wrestlerOfSeason.name}</b><span>${awards.wrestlerOfSeason.external ? awards.wrestlerOfSeason.origin : `${awards.wrestlerOfSeason.wins}-${awards.wrestlerOfSeason.matches - awards.wrestlerOfSeason.wins} across ${awards.wrestlerOfSeason.matches} matches`}</span></article>` : ''}
        ${awards.matchOfSeason ? `<article><small>MATCH OF THE SEASON</small><b>${awards.matchOfSeason.names}</b><span>${awards.matchOfSeason.stars} at ${awards.matchOfSeason.show}</span></article>` : ''}
        ${awards.showOfSeason ? `<article><small>SHOW OF THE SEASON</small><b>${awards.showOfSeason.name}</b><span>${awards.showOfSeason.rating} rating in ${awards.showOfSeason.city}</span></article>` : ''}
      </div>
    </div>` : ''}
  </section>`;
}

function agingHtml(changes) {
  if (!changes?.length) return '';
  const climbing = changes.filter(c => c.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5);
  const slipping = changes.filter(c => c.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 5);
  if (!climbing.length && !slipping.length) return '';
  const row = (entry, kind) => `<article class="trophy ${kind}"><span class="trophy-badge">${entry.delta > 0 ? '↑' : '↓'}</span><b>${entry.name}</b><small>Age ${entry.age} · ${entry.delta > 0 ? '+' : ''}${entry.delta} total attribute points${entry.breakthrough ? ' · BREAKTHROUGH' : ''}</small></article>`;
  return `<section class="poster-progress">
    <div class="poster-trophies">
      <small class="bk-label">ANOTHER YEAR ON THE BODY</small>
      <div class="poster-trophy-row">${[
        ...climbing.map(entry => row(entry, 'gold')),
        ...slipping.map(entry => row(entry, '')),
      ].join('')}</div>
    </div>
  </section>`;
}

function debutsHtml(debuts) {
  if (!debuts?.length) return '';
  return `<section class="poster-progress">
    <div class="poster-trophies">
      <small class="bk-label">NEW TO THE INDUSTRY</small>
      <div class="poster-trophy-row">${debuts.map(d => `<article class="trophy silver"><span class="trophy-badge">★</span><b>${d.name}</b><small>${TIER_LABELS[d.tier] ?? d.tier} · now a free agent</small></article>`).join('')}</div>
    </div>
  </section>`;
}

// ---------------------------------------------------------------------------
// Career plaque — the player's own lifetime stat line, not any one wrestler's.
// ---------------------------------------------------------------------------
export function careerPlaqueHtml() {
  const state = booking.getState();
  const c = state.career;
  const gmProgress = booking.getGMProgress();
  const company = booking.getCompanyIdentity();
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const avgRating = c.showsRun ? (c.totalRatingSum / c.showsRun / 20).toFixed(2) : '0.00';
  const progressPercent = Math.round(gmProgress.progress * 100);
  const stat = (label, value) => `<div class="legacy-stat"><small>${label}</small><b>${value}</b></div>`;
  const icon = node => createElement(node, { width: 20, height: 20, 'aria-hidden': 'true' }).outerHTML;
  const leaders = Object.entries(c.wrestlerStars ?? {}).map(([id, stars]) => ({ wrestler: getWrestlerById(id), stars }))
    .filter(entry => entry.wrestler && entry.stars > 0)
    .sort((first, second) => second.stars - first.stars || first.wrestler.name.localeCompare(second.wrestler.name)).slice(0, 5);
  const logo = companyLogoUrl(company.acronym, company.name, company.logoStyle, company.logoAccent);
  const standing = gmProgress.level >= 20 ? 'ELITE PROMOTER' : gmProgress.level >= 10 ? 'POWERHOUSE PROMOTER' : gmProgress.level >= 5 ? 'RISING PROMOTER' : 'NEW ERA PROMOTER';
  const ratingStars = rating => `<span class="legacy-stars" aria-hidden="true"><span style="width:${Math.max(0, Math.min(100, rating))}%">&#9733;&#9733;&#9733;&#9733;&#9733;</span>&#9733;&#9733;&#9733;&#9733;&#9733;</span>`;
  const placeholders = count => Array.from({ length: 5 - count }, (_, index) => `<li class="legacy-vacant"><span>${String(count + index + 1).padStart(2, '0')}</span><b>AWAITING HISTORY</b></li>`).join('');

  return `<div class="career-screen">
    <div class="career-plaque" aria-label="${escape(company.name)} GM resume">
      <div class="legacy-resume">
        <div class="legacy-topline"><span>${escape(company.acronym)} / GM LEGACY</span><span>${escape(state.date)} / CAREER SNAPSHOT</span></div>
        <header class="legacy-masthead"><img src="${logo}" alt="${escape(company.name)} logo"><div><small>${escape(company.name)}</small><h2>GM RESUME</h2><span>THE LEGACY IS YOURS.</span></div></header>
        <div class="legacy-layout">
          <section class="legacy-summary" aria-label="Career totals">
            <div class="legacy-gm"><small>GENERAL MANAGER</small><b>LEVEL <strong>${gmProgress.level}</strong></b><span>${standing}</span><div class="legacy-xp" role="progressbar" aria-label="Progress to next GM level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressPercent}"><i style="width:${progressPercent}%"></i></div><small>${gmProgress.nextLevelExperience ? `${gmProgress.experienceToNext.toLocaleString()} XP TO LEVEL ${gmProgress.level + 1}` : 'MAX LEVEL'} / ${gmProgress.experience.toLocaleString()} XP</small></div>
            ${stat('TOTAL EVENTS HELD', (c.showsRun + (c.houseShowsRun ?? 0)).toLocaleString())}
            ${stat('TOTAL SHOW REVENUE', money(c.totalRevenue + (c.houseShowRevenue ?? 0)))}
            ${stat(c.tvHistoryIncomplete ? 'TV VIEWERS / TRACKED HISTORY' : 'TOTAL TV VIEWERS', (c.totalTVViewers ?? 0).toLocaleString())}
            ${stat('AVERAGE PPV / 5 STARS', `${avgRating} <span class="legacy-gold">&#9733;</span>`)}
          </section>
          <section class="legacy-leaderboard" aria-labelledby="legacy-wrestlers-heading">
            <header class="legacy-board-head"><h3 id="legacy-wrestlers-heading">TOP 5 WRESTLERS</h3><small>CAREER ACCUMULATED STARS${c.wrestlerHistoryIncomplete ? ' / TRACKED HISTORY' : ''}</small></header>
            <ol class="legacy-wrestlers">${leaders.map(({ wrestler, stars }, index) => `<li><span class="legacy-rank">${String(index + 1).padStart(2, '0')}</span>${wrestlerPortraitHtml(wrestler, 'legacy-portrait')}<div class="legacy-wrestler-copy"><b>${escape(wrestler.name)}</b><small>RECORD ${wrestler.record.w.toLocaleString()}-${wrestler.record.l.toLocaleString()}</small></div><div class="legacy-star-total"><b>${Number(stars.toFixed(1)).toLocaleString()} <span>&#9733;</span></b><small>CAREER STARS</small></div></li>`).join('')}${placeholders(leaders.length)}</ol>
          </section>
          <section class="legacy-leaderboard legacy-ppvs" aria-labelledby="legacy-ppvs-heading">
            <header class="legacy-board-head"><h3 id="legacy-ppvs-heading">TOP 5 PPVS</h3><small>ALL-TIME SHOW STAR RATING / 5</small></header>
            <ol>${c.topShows.map((show, index) => `<li><span class="legacy-rank">${String(index + 1).padStart(2, '0')}</span><div class="legacy-ppv-copy"><b>${escape(show.name)}</b><small>${escape(show.date)} / ${show.attendance.toLocaleString()} FANS</small><div class="legacy-ppv-rating"><strong>${(show.rating / 20).toFixed(2)}</strong>${ratingStars(show.rating)}</div></div></li>`).join('')}${placeholders(c.topShows.length)}</ol>
          </section>
        </div>
        <div class="legacy-seal"><span>${c.fiveStarMatches.toLocaleString()} FIVE-STAR CLASSICS</span><b>${escape(company.acronym)} <em>LEGACY</em></b><span>${c.totalMatches.toLocaleString()} MATCHES BOOKED</span></div>
        ${c.tvHistoryIncomplete || c.wrestlerHistoryIncomplete || c.houseHistoryIncomplete ? '<p class="legacy-history-note">Older-save totals reflect available recorded history.</p>' : ''}
      </div>
    </div>
    <div class="legacy-actions"><button type="button" data-legacy-export="share" title="Share GM resume">${icon(Share2)} SHARE RESUME</button><button type="button" data-legacy-export="download" title="Download GM resume as a PNG">${icon(Download)} SAVE IMAGE</button><button type="button" data-back="close" title="Back to the crib">${icon(ArrowLeft)} BACK</button><span class="legacy-export-status" role="status" aria-live="polite"></span></div>
  </div>`;
}

const financeText = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export function financeForecastHtml() {
  const state = booking.getState();
  const projection = booking.getProjection();
  const finances = booking.getFinances();
  const gmLevel = booking.getGMLevel();
  const ratio = ticketPriceRatio(finances.prices, gmLevel);
  const trust = applyGoodwillDrift(finances.goodwill, ratio);
  const ranges = financeForecastRanges(projection);
  const leaders = merchSalesForecast(booking.getSignedRoster(), state.show, projection, finances.prices.merch);
  const key = `${state.showNumber}:${state.show.eventId}`;
  if (view.financeBaseline?.key !== key) view.financeBaseline = { key, profit: projection.profit, fill: projection.fillPercent, trust };
  const baseline = view.financeBaseline;
  const delta = (value, suffix = '') => `${value > 0 ? '+' : ''}${Math.round(value).toLocaleString()}${suffix}`;
  const gauge = (label, value, readout, note, change = null) => `<div class="finance-meter"><div><small>${label}</small><b>${readout}</b></div><div class="finance-meter-track" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(Math.max(0, Math.min(100, value)))}"><i style="width:${Math.max(0, Math.min(100, value))}%"></i></div><span>${note}${change !== null ? `<em class="${change < 0 ? 'negative' : 'positive'}">${delta(change)}</em>` : ''}</span></div>`;
  const netGauge = 50 + projection.profit / Math.max(10000, projection.totalCost) * 35;
  const lowFill = projection.capacity ? ranges.attendance.low / projection.capacity * 100 : 0;
  const highFill = projection.capacity ? ranges.attendance.high / projection.capacity * 100 : 0;
  const leaderScore = leaders[0]?.score ?? 1;
  const row = (label, value, range) => `<div><span>${label}</span><b>${money(value)}</b><small>${money(range.low)} – ${money(range.high)}</small></div>`;
  return `<div class="finance-live-overview">
    <div class="finance-net ${projection.profit < 0 ? 'negative' : 'positive'}"><small>EXPECTED PPV NET</small><strong>${money(projection.profit)}</strong><span class="finance-net-delta">${delta(projection.profit - baseline.profit)} vs. opening forecast</span><div class="finance-uncertainty-band"><small>SHOW-DAY WORKING RANGE</small><b>${signedRange(ranges.profit)}</b></div></div>
    <div class="finance-market"><span><small>PRICING POSITION</small><b>${ratio > 1.08 ? 'Premium' : ratio < .92 ? 'Value' : 'Market rate'}</b></span><span><small>AVAILABLE CASH</small><b>${money(state.bankroll)}</b></span><span><small>SHOW COST</small><b>${money(projection.totalCost)}</b></span></div>
  </div>
  <section class="finance-meters" aria-label="Upcoming PPV impact">
    ${gauge('Turnout', projection.fillPercent, `${projection.fillPercent}%`, `${Math.round(lowFill)}–${Math.round(highFill)}% likely fill`, projection.fillPercent - baseline.fill)}
    ${gauge('Fan goodwill', trust, `${trust}/100`, `${finances.goodwill}/100 now · after PPV`, trust - baseline.trust)}
    ${gauge('Net margin', netGauge, money(projection.profit), `${money(ranges.profit.low)} downside`)}
    ${gauge('Sell-through', Math.min(100, projection.revenue.merch / Math.max(finances.prices.merch, 1) / Math.max(projection.attendance, 1) * 100), `${Math.round(projection.revenue.merch / Math.max(finances.prices.merch, 1)).toLocaleString()} shirts`, `${money(projection.revenue.merch)} merch forecast`)}
  </section>
  <div class="finance-analysis">
    <section class="finance-merch"><header><div><small>MERCH FORECAST</small><h3>Top five sellers</h3></div><span>EST. SHIRTS / REVENUE</span></header><ol>${leaders.length ? leaders.map((leader, index) => `<li><span class="finance-merch-rank">0${index + 1}</span><div class="finance-merch-copy"><b>${financeText(leader.name)}</b><small>POP ${leader.popularity} · MOM ${delta(leader.momentum)}${leader.booked ? ' · ON THE PPV' : ''}</small><div class="finance-merch-bar"><i style="width:${leader.score / leaderScore * 100}%"></i></div></div><div class="finance-merch-value"><b>${leader.units.toLocaleString()}</b><small>${money(leader.revenue)}</small></div></li>`).join('') : '<li class="finance-merch-empty">No signed roster.</li>'}</ol></section>
    <section class="finance-ledger"><header><small>PPV INCOME</small><h3>Revenue mix</h3></header><div>${row('Tickets', projection.revenue.gate, ranges.revenue.gate)}${row('Concessions', projection.revenue.concessions, ranges.revenue.concessions)}${row('Merchandise', projection.revenue.merch, ranges.revenue.merch)}${row(homeVideoFormat(state.date), projection.revenue.homeVideo, ranges.revenue.homeVideo)}${row('Television', projection.revenue.television, ranges.revenue.television)}${row('Total revenue', projection.revenue.total, ranges.total)}</div></section>
  </div>`;
}

export function financePanelHtml() {
  const state = booking.getState();
  const projection = booking.getProjection();
  const finances = booking.getFinances();
  const gmLevel = booking.getGMLevel();
  const company = booking.getCompanyIdentity();
  const videoLabel = homeVideoFormat(state.date);
  const categories = PRICE_CATEGORIES.map(category => {
    const suiteLocked = category.id === 'suite' && !suitesUnlocked(gmLevel);
    const label = category.id === 'homeVideo' ? videoLabel : category.name;
    return `<label class="finance-price ${suiteLocked ? 'locked' : ''}">
      <span><b>${label}</b><small>${suiteLocked ? 'GM LEVEL 2' : `MARKET $${category.fair}`}</small></span>
      <input type="range" min="${category.min}" max="${category.max}" step="1" value="${finances.prices[category.id]}" data-finance-price="${category.id}" aria-label="${label} price" aria-valuetext="$${finances.prices[category.id]}" ${suiteLocked ? 'disabled' : ''}>
      <output>$${finances.prices[category.id]}</output>
    </label>`;
  }).join('');
  return `<div class="finance-office">
    <header class="finance-head">
      <div class="finance-brand"><img src="${companyLogoUrl(company.acronym, company.name, company.logoStyle, company.logoAccent)}" alt="${financeText(company.acronym)}"><div><small>${financeText(company.name)} · FINANCE OFFICE</small><h2>Work the numbers</h2><span>SHOW ${state.showNumber} · ${financeText(state.show.name)} · ${financeText(projection.venue?.city ?? 'VENUE PENDING')}</span></div></div>
      <div class="finance-head-status"><span class="finance-optional">OPTIONAL</span><small>SHOW-DAY VOLATILITY</small><b>HIGH</b></div>
    </header>
    <div class="finance-workbench"><section class="finance-pricing"><header><div><small>STANDING PRICES</small><h3>Find your balance</h3></div><button type="button" class="finance-reset" data-bk="finance-reset" title="Set standard baseline prices, not optimized prices" aria-label="Auto-set standard baseline prices">${createElement(RotateCcw, { width: 16, height: 16, 'aria-hidden': 'true' }).outerHTML}<span>Auto-set</span></button></header><div class="finance-prices">${categories}</div></section><div class="finance-live" data-finance-forecast>${financeForecastHtml()}</div></div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Trophy room & record book
// ---------------------------------------------------------------------------
export function trophyCaseHtml() {
  const state = booking.getState();
  const earned = TROPHIES.filter(t => state.trophies[t.id]);
  const locked = TROPHIES.filter(t => !state.trophies[t.id]);
  const sortTier = (a, b) => TROPHY_TIER_ORDER[a.tier] - TROPHY_TIER_ORDER[b.tier];
  const badge = tier => (tier === 'gold' ? '★' : tier === 'silver' ? '◆' : '●');
  const wrestlerOfYearHistory = state.awards
    .filter(a => a.wrestlerOfSeason)
    .map(a => a.wrestlerOfSeason)
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  const memorials = booking.getMemorials();

  return `${memorials.length ? `<div class="memorial-shrine">
      <small class="bk-label">IN MEMORIAM</small>
      ${memorials.map(m => `<article class="memorial-entry">
        <img src="${wrestlerImageUrl(m.id)}" alt="${m.name}" onerror="this.style.display='none'" />
        <div class="memorial-copy">
          <b>${m.name}${m.nickname ? ` "${m.nickname}"` : ''}</b>
          <span>${m.hometown} · ${m.style} · ${m.cause} · ${m.date}</span>
          <p>${m.message}</p>
          <small>Final record ${m.finalRecord.w}-${m.finalRecord.l} · ${m.popularity} popularity at the time</small>
        </div>
      </article>`).join('')}
    </div>` : ''}
    ${wrestlerOfYearHistory.length ? `<div class="trophy earned" style="margin-bottom:12px;">
      <span class="trophy-badge">★</span>
      <b>Wrestler of the Year</b>
      <small>Awarded every year to the standout performer in the wrestling world — sometimes it's yours.</small>
      <em>${wrestlerOfYearHistory.map(w => `${w.name} ${w.year}${w.external ? ` (${w.origin})` : ''}`).join(', ')}</em>
    </div>` : ''}
    <div class="trophy-case">
      ${earned.sort(sortTier).map(t => `<article class="trophy ${t.tier} earned">
        <span class="trophy-badge">${badge(t.tier)}</span>
        <b>${t.name}</b>
        <small>${t.flavor}</small>
        <em>${state.trophies[t.id].show} · ${state.trophies[t.id].date}</em>
      </article>`).join('') || '<p class="bk-empty">The case is empty. Run a show.</p>'}
    </div>
    <small class="bk-label spaced">STILL OUT THERE · ${locked.length} LOCKED</small>
    <div class="trophy-case locked">
      ${locked.sort(sortTier).map(t => `<article class="trophy ${t.tier}">
        <span class="trophy-badge">?</span>
        <b>${t.name}</b>
        <small>${t.flavor}</small>
      </article>`).join('')}
    </div>`;
}

function recordBookDays(from, to) {
  const start = Date.parse(`${String(from ?? '').slice(0, 10)}T12:00:00Z`);
  const end = Date.parse(`${String(to ?? '').slice(0, 10)}T12:00:00Z`);
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, Math.floor((end - start) / 86400000)) : null;
}

function recordBookClassicsHtml(state) {
  const classics = state.career.topMatches ?? [];
  return `<section class="recordbook-classics"><div class="recordbook-section-head"><h3>Matches worth remembering</h3><span>ALL-TIME TOP ${Math.min(10, classics.length)}</span></div>${state.career.classicHistoryIncomplete ? '<p class="recordbook-history-note">Older-save matches are reconstructed from retained history; earlier details may be unavailable.</p>' : ''}${classics.length ? classics.slice(0, 10).map((match, index) => `<details class="recordbook-classic"><summary><span class="recordbook-rank">${String(index + 1).padStart(2, '0')}</span><div><b>${financeText(match.names)}</b><small>${financeText(match.show)} · ${financeText(match.date)}${match.city ? ` · ${financeText(match.city)}` : ''}</small></div><span class="recordbook-rating"><b>${(match.rating / 20).toFixed(2)}</b><small>/ 5 STARS</small></span></summary><div class="recordbook-match-detail"><dl><div><dt>MATCH</dt><dd>${financeText(match.typeName || 'Not retained')}</dd></div><div><dt>STAKES</dt><dd>${financeText(match.stakeName || 'Not retained')}</dd></div><div><dt>RESULT</dt><dd>${match.outcome === 'draw' ? 'Draw' : financeText(match.winnerNames ? `${match.winnerNames} won` : 'Not retained')}</dd></div></dl><p>${financeText(match.finish || 'The finish description was not retained in this older save.')}</p>${match.titleOutcome ? `<p class="recordbook-title-change">${financeText(match.titleOutcome.type === 'change' || match.titleOutcome.type === 'crowned' ? 'CHAMPIONSHIP CHANGED HANDS' : 'CHAMPIONSHIP RETAINED')}</p>` : ''}</div></details>`).join('') : '<p class="recordbook-empty">Your first show will start this collection.</p>'}</section>`;
}

function recordBookHoldersHtml(state) {
  return `<section class="recordbook-holders"><div class="recordbook-section-head"><h3>The company benchmarks</h3><span>BESTS, FIRSTS & LOW POINTS</span></div><div class="recordbook-record-grid">${RECORD_DEFS.map(def => {
    const record = state.records[def.id];
    const standing = record ? recordBookDays(record.date, state.date) : null;
    const previous = record?.previousRecord;
    const previousDays = previous ? recordBookDays(previous.date, record.date) : null;
    return `<article class="recordbook-record ${record ? '' : 'empty'}"><small>${def.label}</small><strong>${record ? financeText(def.format(record.value)) : '—'}</strong><b>${financeText(record?.holder || 'No record yet')}</b><span>${record ? `${financeText(record.date)}${standing !== null ? ` · STANDING ${standing} DAY${standing === 1 ? '' : 'S'}` : ''}` : 'Awaiting your first show'}</span><div class="recordbook-previous">${previous ? `<small>PREVIOUS HOLDER</small><b>${financeText(previous.holder)}</b><span>${financeText(def.format(previous.value))}${previousDays !== null ? ` · STOOD ${previousDays} DAY${previousDays === 1 ? '' : 'S'}` : ''}</span>` : record?.previous != null ? `<small>PREVIOUS BENCHMARK</small><span>${financeText(def.format(record.previous))} · Holder details not retained</span>` : '<small>FIRST BENCHMARK</small>'}</div></article>`;
  }).join('')}</div></section>`;
}

function recordBookYearbookHtml(state) {
  const retirees = booking.getRetirees();
  const list = (entries, fallback) => entries.length ? `<ul>${entries.map(entry => `<li>${entry}</li>`).join('')}</ul>` : `<p class="recordbook-muted">${fallback}</p>`;
  const years = (state.awards ?? []).map(award => {
    const recap = award.recap ?? {};
    const year = recap.year ?? String(award.date ?? '').slice(0, 4);
    const retirements = recap.retirements ?? retirees.filter(wrestler => String(wrestler.date ?? '').startsWith(String(year)));
    const rivalry = recap.rivalryOfYear;
    return `<article class="recordbook-year"><header><div><small>SEASON ${award.season}</small><h3>${financeText(year || 'Yearbook')}</h3></div><span>${award.averageRating}/100 AVG PPV · ${money(award.totalRevenue)} REVENUE · ${signed(award.totalProfit)} NET</span></header><div class="recordbook-year-grid"><section><h4>Annual honors</h4>${list([award.wrestlerOfSeason ? `<b>WRESTLER</b> ${financeText(award.wrestlerOfSeason.name)}${award.wrestlerOfSeason.external ? ` · ${financeText(award.wrestlerOfSeason.origin)}` : ''}` : '', award.matchOfSeason ? `<b>MATCH</b> ${financeText(award.matchOfSeason.names)} · ${financeText(award.matchOfSeason.stars)}` : '', award.showOfSeason ? `<b>SHOW</b> ${financeText(award.showOfSeason.name)} · ${award.showOfSeason.rating}/100` : ''].filter(Boolean), 'No award details retained.')}</section><section><h4>The defining rivalry</h4>${rivalry ? `<b>${financeText(rivalry.names)}</b><p>${rivalry.matches} meetings · ${rivalry.averageRating}/100 average</p>` : `<p class="recordbook-muted">${Object.hasOwn(recap, 'rivalryOfYear') ? 'No recurring matchup defined this year.' : 'Rivalry details were not retained in this older save.'}</p>`}</section><section><h4>Year-end champions</h4>${list((recap.champions ?? []).map(champion => `<b>${financeText(champion.title)}</b> ${financeText(champion.holders.join(' & '))}`), 'No champion snapshot retained.')}</section><section><h4>World debuts</h4>${list((recap.debuts ?? []).map(wrestler => financeText(wrestler.name)), Object.hasOwn(recap, 'debuts') ? 'No new arrivals this year.' : 'Debut details were not retained in this older save.')}</section><section><h4>Retirements</h4>${list(retirements.map(wrestler => `${financeText(wrestler.name)} · AGE ${wrestler.age} · ${wrestler.finalRecord?.w ?? 0}-${wrestler.finalRecord?.l ?? 0}`), 'No dated retirements this year.')}</section><section><h4>The year in numbers</h4><p>${recap.totalAttendance?.toLocaleString() ?? '—'} fans · ${recap.totalMatches ?? '—'} matches</p><p>${recap.sellouts ?? '—'} sellouts · ${recap.upsets ?? '—'} upsets</p></section></div></article>`;
  });
  const undated = retirees.filter(wrestler => !wrestler.date);
  return `<section class="recordbook-yearbook"><div class="recordbook-section-head"><h3>A promotion with a past</h3><span>YEAR-END CHAPTERS</span></div>${years.length ? years.join('') : '<p class="recordbook-empty">Your first year-end awards will open the Yearbook.</p>'}${undated.length ? `<section class="recordbook-undated"><h4>Earlier retirements · date not retained</h4>${list(undated.map(wrestler => `${financeText(wrestler.name)} · AGE ${wrestler.age} · ${wrestler.finalRecord?.w ?? 0}-${wrestler.finalRecord?.l ?? 0}`), '')}</section>` : ''}</section>`;
}

export function recordBookHtml() {
  const state = booking.getState();
  const tabs = [['classics', 'CLASSIC MATCHES'], ['holders', 'RECORD HOLDERS'], ['yearbook', 'YEARBOOK']];
  const selected = tabs.some(([id]) => id === view.recordBookTab) ? view.recordBookTab : 'classics';
  const body = selected === 'holders' ? recordBookHoldersHtml(state) : selected === 'yearbook' ? recordBookYearbookHtml(state) : recordBookClassicsHtml(state);
  return `<div class="recordbook-screen"><header class="recordbook-masthead"><small>${financeText(booking.getCompanyIdentity().name)} / COMPANY HISTORY</small><h2>The Record Book</h2><span>${financeText(state.date)}</span></header><div class="recordbook-tabs" role="tablist" aria-label="Record Book sections">${tabs.map(([id, label]) => `<button type="button" role="tab" id="recordbook-tab-${id}" aria-controls="recordbook-page" aria-selected="${selected === id}" class="${selected === id ? 'selected' : ''}" data-bk="recordbook-tab" data-value="${id}">${label}</button>`).join('')}</div><div class="recordbook-page" id="recordbook-page" role="tabpanel" aria-labelledby="recordbook-tab-${selected}">${body}</div></div>`;
}

// Permanent exhibits: the matches and nights worth remembering.
export function archiveHtml() {
  const results = booking.getState().results;
  const classics = results
    .flatMap(show => show.matches.map(m => ({ ...m, show: show.showName, date: show.date, city: show.city })))
    .filter(m => m.rating >= 82)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 8);
  const bigNights = [...results].filter(s => s.rating >= 75).sort((a, b) => b.rating - a.rating).slice(0, 5);

  return `<div class="archive-columns">
    <section>
      <small class="bk-label">CLASSIC MATCHES · ${classics.length}</small>
      ${classics.length ? classics.map(m => `<article class="archive-entry">
        <span class="archive-stars">${m.stars}</span>
        <b>${m.sideNames.join(' vs. ')}</b>
        <small>${m.typeName} · ${m.show} · ${m.city}</small>
        <p>${m.finish}</p>
      </article>`).join('') : '<p class="bk-empty">No match has cleared 82 yet.</p>'}
    </section>
    <section>
      <small class="bk-label">LANDMARK EVENTS · ${bigNights.length}</small>
      ${bigNights.length ? bigNights.map(s => `<article class="archive-entry">
        <span class="archive-stars">${s.stars}</span>
        <b>${s.showName}</b>
        <small>${s.city} · ${s.date}</small>
        <p>${s.attendance.toLocaleString()} fans · ${s.tvRating} TV rating · ${s.ratingLabel}</p>
      </article>`).join('') : '<p class="bk-empty">No show has cleared 75 yet.</p>'}
    </section>
  </div>`;
}

function trophyViewHtml() {
  const state = booking.getState();
  const earned = TROPHIES.filter(t => state.trophies[t.id]).length;
  return `<div class="bk">
    ${backBar('The Trophy Room', `${earned} of ${TROPHIES.length} earned`, 'card')}
    ${trophyCaseHtml()}
  </div>`;
}

function recordsViewHtml() {
  return `<div class="bk">
    ${backBar('The Record Book', 'Every best and worst night in company history.', 'card')}
    ${recordBookHtml()}
  </div>`;
}

function resultMatchViewHtml() {
  const result = booking.getState().results[view.resultIndex];
  const m = result?.matches[view.resultMatch];
  if (!m) return resultsViewHtml();

  return `<div class="bk poster">
    ${backBar(m.label, `${result.showName} · ${result.date}`, 'results')}
    <div class="poster-sheet detail">
      <header class="poster-match-head">
        <small>${m.typeName}${m.stakeId !== 'none' ? ` · ${booking.companyBrandedText(m.stakeName)}` : ''} · ${m.lengthName}</small>
        <h2>${m.sideNames.join(' vs. ')}</h2>
        <div class="poster-stars">${m.stars} <span>${m.rating} / 100 · projected ${m.projected}</span></div>
      </header>

      <div class="poster-finish">
        <small class="bk-label">DECISION</small>
        <b>${m.finish}</b>
        <span>${m.outcome.toUpperCase()} · ${m.time}${m.upset ? ' · MAJOR UPSET' : ''}</span>
      </div>

      <div class="poster-beats">
        <small class="bk-label">HOW IT WENT</small>
        <ol>${m.beats.map(b => `<li>${b.text ?? b}</li>`).join('')}</ol>
        <p class="poster-crowd">${m.crowd}</p>
        ${m.celebrityNote ? `<p class="poster-crowd">${m.celebrityNote.text}</p>` : ''}
        ${m.injury ? `<p class="poster-injury">${m.injury.note}</p>` : ''}
        ${m.stakeConsequences?.length ? `<ul class="poster-headlines">${m.stakeConsequences.map(note => `<li>${note}</li>`).join('')}</ul>` : ''}
      </div>

      <div class="poster-effects">
        <small class="bk-label">AFTER THE BELL</small>
        <div class="bk-grid tight">
          ${m.effects.map(e => `<div class="poster-effect">
            <b>${e.name}</b>
            <span class="result-${e.resultCode}">${e.resultCode === 'W' ? 'WIN' : e.resultCode === 'L' ? 'LOSS' : 'NO DECISION'}</span>
            <small>Popularity ${e.popDelta >= 0 ? '+' : ''}${e.popDelta} · Momentum ${e.momentumDelta >= 0 ? '+' : ''}${e.momentumDelta}</small>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Championships
// ---------------------------------------------------------------------------
export function championshipShrineHtml({ bookable = false } = {}) {
  const show = booking.getShow();
  const bookedTitles = new Set(show.matches.map(m => m.titleId).filter(Boolean));

  return `<div class="belt-shrine">
    ${booking.getTitles().map(({ def, state: title, status, holderNames }) => {
      const onCard = bookedTitles.has(def.id);
      return `<article class="belt ${status.state}" data-bk="belt-detail" data-value="${def.id}">
        <div class="belt-plate"><img src="${BELT_IMAGES[def.id] ?? ''}" alt="${booking.companyBrandedText(def.name)}"></div>
        <div class="belt-body">
          <small>${booking.companyBrandedText(def.name)}</small>
          <b>${title.holders.length ? profileLinksHtml(title.holders) : 'VACANT'}</b>
          <div class="belt-meta">
            <span>${title.holders.length ? `Reign #${title.reignNumber} since ${title.since}` : 'No champion crowned'}</span>
            <span>${title.defenses} successful defence${title.defenses === 1 ? '' : 's'}</span>
          </div>
          ${meter('Prestige', Math.round(title.prestige), 100, title.prestige < 45 ? 'bad' : '')}
          <div class="belt-status ${status.state}">${prestigeLabel(title.prestige)} · ${onCard ? 'ON THIS CARD' : status.label}</div>
          <button class="belt-detail" data-bk="belt-detail" data-value="${def.id}">View History</button>
          ${bookable && !onCard && titleBookable(def, show, title) ? `<button class="belt-book" data-bk="book-title" data-value="${def.id}">PUT IT ON THE CARD →</button>` : ''}
        </div>
      </article>`;
    }).join('')}
  </div>`;
}

function titlesViewHtml() {
  return `<div class="bk">
    ${backBar('Championships', 'Put the belt on someone, then decide when it gets defended.', 'card')}
    ${championshipShrineHtml({ bookable: true })}
  </div>`;
}

export function reignDaysHeld(reign, currentDate) {
  const calendarDay = value => {
    if (!value) return NaN;
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value ?? '') ? `${value}T12:00:00` : value);
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  };
  const from = calendarDay(reign.from);
  const to = calendarDay(reign.to === 'PRESENT' ? currentDate : reign.to);
  return Number.isFinite(from) && Number.isFinite(to)
    ? Math.max(0, Math.round((to - from) / 86400000))
    : Math.max(0, Number(reign.shows) || 0) * 30;
}

export function titleDetailViewHtml() {
  const state = booking.titleState(view.titleId);
  const definition = getChampionship(view.titleId);
  if (!state || !definition) return titlesViewHtml();
  const holderNames = state.holders.map(id => getWrestlerById(id)?.name).filter(Boolean);
  const reigns = [
    ...(state.holders.length ? [{ holderNames: holderNames.join(' & '), from: state.since, to: 'PRESENT', shows: Math.max(1, booking.getState().showNumber - state.sinceShow + 1), defenses: state.defenses, reignNumber: state.reignNumber, lostTo: '—' }] : []),
    ...state.history,
  ];
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(reigns.length / pageSize));
  view.titleHistoryPage = Math.min(view.titleHistoryPage, pageCount - 1);
  const pageRows = reigns.slice(view.titleHistoryPage * pageSize, (view.titleHistoryPage + 1) * pageSize);
  return `<div class="bk">
    ${backBar(definition.name, 'BELT HISTORY / CURRENT REIGN', 'titles')}
    <article class="belt-detail-panel">
      <img src="${BELT_IMAGES[definition.id] ?? ''}" alt="${definition.name}">
      <small>${definition.kind.toUpperCase()} CHAMPIONSHIP</small>
      <h2>${definition.name}</h2>
      <b>${holderNames.length ? holderNames.join(' & ') : 'VACANT'}</b>
      <p>${state.holders.length ? `Reign #${state.reignNumber} since ${state.since}. ${state.defenses} successful defence${state.defenses === 1 ? '' : 's'}.` : 'No champion has been crowned yet.'}</p>
      <small class="bk-label spaced">REIGN HISTORY · PAGE ${view.titleHistoryPage + 1} / ${pageCount}</small>
      <div class="belt-history-table-wrap"><table class="belt-history-table"><thead><tr><th>REIGN</th><th>HOLDER</th><th>DATE WON</th><th>DATE LOST</th><th>DAYS HELD</th><th>DEFENCES</th><th>LOST TO</th></tr></thead><tbody>${pageRows.length ? pageRows.map(row => `<tr><td>${row.reignNumber ?? '—'}</td><td><b>${row.holderNames}</b></td><td>${row.from}</td><td>${row.to}</td><td>${reignDaysHeld(row, booking.getState().date)}</td><td>${row.defenses}</td><td>${row.lostTo}</td></tr>`).join('') : '<tr><td colspan="7">No reigns recorded yet.</td></tr>'}</tbody></table></div>
      <div class="belt-history-pager"><button data-bk="title-history-page" data-value="-1" ${view.titleHistoryPage <= 0 ? 'disabled' : ''}>← PREVIOUS</button><span>${view.titleHistoryPage + 1} / ${pageCount}</span><button data-bk="title-history-page" data-value="1" ${view.titleHistoryPage >= pageCount - 1 ? 'disabled' : ''}>NEXT →</button></div>
      <button class="return-gallery" data-back="close">← RETURN</button>
    </article>
  </div>`;
}

export function teamsViewHtml({ embedded = false } = {}) {
  const teams = [...booking.getTeams()].sort((first, second) =>
    (first.record[teamSort.key] - second.record[teamSort.key]) * (teamSort.dir === 'asc' ? 1 : -1)
      || first.name.localeCompare(second.name));
  const recordHeader = (key, label) => {
    const active = teamSort.key === key;
    const direction = active ? teamSort.dir === 'asc' ? 'ascending' : 'descending' : 'none';
    return `<th scope="col" aria-sort="${direction}"><button type="button" class="tag-team-sort ${active ? 'active' : ''}" data-bk="team-sort" data-value="${key}" title="Sort by ${label.toLowerCase()}">${label}<span aria-hidden="true">${active ? teamSort.dir === 'asc' ? '&#9650;' : '&#9660;' : '&#8597;'}</span></button></th>`;
  };

  return `<div class="bk terminal-teams-view">
    ${embedded ? '' : backBar('Tag Teams', '')}
    ${embedded ? `<header class="tag-team-page-header"><h2>Tag Teams</h2><span>${teams.length} saved duos</span></header>` : `<small class="bk-label">${teams.length} SAVED DUOS</small>`}
    <div class="tag-team-list">
      <table class="tag-team-table"><thead><tr><th scope="col">TEAM NAME</th><th scope="col">MEMBERS</th>${recordHeader('w', 'WINS')}${recordHeader('l', 'LOSSES')}</tr></thead><tbody>
      ${teams.length ? teams.map(team => {
        const members = team.memberIds.map(id => getWrestlerById(id)?.name ?? id).join(' & ');
        const teamName = team.name.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
        return `<tr class="tag-team-row" data-team-row>
          <td><div class="tag-team-name"><input data-team-rename-input value="${teamName}" maxlength="32" aria-label="Team name" title="Edit team name"><button type="button" data-bk="team-rename" data-value="${team.id}" title="Save team name" aria-label="Save team name">${createElement(Check, { width: 16, height: 16, 'aria-hidden': 'true' }).outerHTML}</button></div></td>
          <td class="tag-team-members">${members}</td>
          <td class="tag-team-record">${team.record.w}</td>
          <td class="tag-team-record">${team.record.l}</td>
        </tr>`;
      }).join('') : '<tr><td colspan="4" class="bk-empty">No tag teams have competed yet.</td></tr>'}
      </tbody></table>
    </div>
  </div>`;
}

function titleReportHtml(result) {
  const outcomes = result.matches.map(m => m.titleOutcome).filter(Boolean);
  if (!outcomes.length) return '';
  return `<section class="poster-titles">
    <small class="bk-label">CHAMPIONSHIP REPORT</small>
    ${outcomes.map(o => `<article class="poster-title-line ${o.type}">
      <span class="poster-belt-tag">${o.type === 'change' ? 'NEW CHAMPION' : o.type === 'crowned' ? 'CROWNED' : 'RETAINED'}</span>
      <b>${o.newHolderNames || 'Vacant'}</b>
      <small>${booking.companyBrandedText(o.titleName)}${o.reignNumber ? ` · reign #${o.reignNumber}` : ''}${o.defenses ? ` · defence #${o.defenses}` : ''}</small>
      <p>${o.note}</p>
    </article>`).join('')}
  </section>`;
}

function backBar(title, subtitle, target = 'card', buttonLabel = '← BACK') {
  return `<div class="bk-back">
    <button class="${buttonLabel === '← BACK' ? '' : 'bk-save-back'}" data-bk="view" data-value="${target}">${buttonLabel === 'SAVE & BACK' ? createElement(ArrowLeft, { width: 14, height: 14, 'aria-hidden': 'true' }).outerHTML : ''}${buttonLabel}</button>
    <div><b>${title}</b><small>${subtitle}</small></div>
  </div>`;
}

// A header for screens reached from outside the Booking Board (Calendar Wall, Trophy
// Gallery) — no back button, since whatever opened it also owns getting back out.
function sectionHeader(title, subtitle) {
  return `<div class="bk-back"><div><b>${title}</b><small>${subtitle}</small></div></div>`;
}

// Lets other stations (Calendar Wall, Trophy Gallery) force this module to open on a
// specific screen instead of the default card view.
export function setBookingView(name) {
  view.name = name;
}

export function getBookingView() {
  return view.name;
}

// ---------------------------------------------------------------------------
// Lead-up week
// ---------------------------------------------------------------------------
function emptyHouseShowMatch(typeId = 'singles') {
  const type = getMatchType(typeId);
  const teams = type.slots.teams
    ? Array.from({ length: type.slots.teams }, () => Array.from({ length: type.slots.perTeam }, () => null))
    : Array.from({ length: type.slots.min }, () => [null]);
  return { typeId, teams };
}

function createHouseShowDraft() {
  return { matches: [emptyHouseShowMatch(), emptyHouseShowMatch(), emptyHouseShowMatch()] };
}

function houseShowBookedIds(card) {
  return new Set(card.matches.flatMap(match => match.teams.flat()).filter(Boolean));
}

function houseShowComplete(card) {
  if (!card || card.matches.length !== 3) return false;
  const ids = [...houseShowBookedIds(card)];
  return ids.length >= 6 && card.matches.every(match => match.teams.every(team => team.every(Boolean))) && ids.length === new Set(ids).size;
}

function houseShowResultsHtml() {
  const latest = booking.getState().houseShows?.[0];
  if (!latest) return '';
  return `<small class="bk-label spaced">LATEST HOUSE SHOW</small><article class="bk-history">
    <header><b>${latest.rating} average rating</b><span>${latest.date} · ${signed(latest.profit)}</span></header>
    <ul class="angle-beats">${latest.matches.map(match => `<li><small>${match.stars} · ${match.rating}</small>${match.finish ?? `${match.sideNames?.join(' vs. ') ?? 'Match'} — ${match.outcome}`}</li>`).join('')}</ul>
  </article>`;
}

function houseShowResultViewHtml() {
  const result = view.houseResult;
  if (!result) return '';
  const best = [...result.matches].sort((a, b) => b.rating - a.rating)[0];
  const injuries = result.matches.map(match => match.injury).filter(Boolean);
  const outcomeLine = match => (match.winnerNames
    ? `<b>${match.winnerNames}</b><span class="poster-def">def.</span><b class="poster-loser">${match.loserNames}</b>`
    : `<b>${match.sideNames.join(' & ')}</b><span class="poster-def">drew</span>`);
  return `<div class="bk poster">
    <div class="poster-sheet">
      <header class="poster-head">
        <small>${booking.getCompanyIdentity().name.toUpperCase()} LIVE EVENTS</small>
        <h1>House Show</h1>
        <div class="poster-event-meta"><span>${result.date}</span><span>Three-match live loop</span></div>
      </header>
      <div class="poster-grade">
        <div><b>${result.rating}</b><small>${ratingLabel(result.rating)}</small></div>
        <div class="poster-stars">${best?.stars ?? ''}</div>
        <div class="poster-grade-meta"><span>${result.matches.length} matches run</span><span class="${result.profit >= 0 ? 'good' : 'bad'}">${signed(result.profit)} net</span></div>
      </div>
      <ol class="poster-card">
        ${[...result.matches].reverse().map(match => `<li><button type="button">
          ${matchPortraitsHtml(match.participantIds, 'poster-card-portraits')}
          <span class="poster-slot">${match.label}<small class="poster-type">${match.typeName ?? getMatchType(match.typeId)?.name ?? match.typeId}</small></span>
          <span class="poster-result">${outcomeLine(match)}</span>
          <span class="poster-rating"><em>${match.stars}</em><small>${match.rating}</small></span>
        </button></li>`).join('')}
      </ol>
      <div class="poster-numbers">
        <span><small>LIVE REVENUE</small><b>${compactMoney(result.revenue ?? 0)}</b><em>local gate + merch</em></span>
        <span><small>EVENT COST</small><b>${compactMoney(result.costs ?? 0)}</b><em>travel, venue, talent</em></span>
        <span class="${result.profit >= 0 ? 'good' : 'bad'}"><small>NET</small><b>${signed(result.profit)}</b><em>house shows often run cold</em></span>
        <span><small>MATCH OF NIGHT</small><b>${best?.rating ?? 0}</b><em>${best?.sideNames?.join(' vs. ') ?? 'n/a'}</em></span>
      </div>
      <div class="poster-recap"><small class="bk-label">THE WRAP</small><p>The house show is in the books. Results count, stamina took a hit, and the workers picked up live reps in front of a smaller room.</p>${injuries.length ? `<ul class="poster-headlines">${injuries.map(injury => `<li>${injury.note}</li>`).join('')}</ul>` : ''}</div>
      <section class="poster-effects"><small class="bk-label">ROSTER EFFECTS</small>${result.matches.flatMap(match => match.effects ?? []).map(effect => `<div class="poster-effect"><b>${effect.name}</b><small>Result ${effect.resultCode}${effect.popDelta ? ` · Popularity +${effect.popDelta}` : ''}${effect.skillGains?.length ? ` · ${effect.skillGains.map(gain => `${gain.stat.toUpperCase()} +${gain.gain}`).join(', ')}` : ''} · Momentum ${effect.momentumDelta >= 0 ? '+' : ''}${effect.momentumDelta}</small></div>`).join('')}</section>
      <footer class="poster-foot"><button class="bk-primary" data-bk="house-result-done">BACK TO TRAINING MENU →</button></footer>
    </div>
  </div>`;
}

function houseShowBuilderHtml() {
  view.houseShow = view.houseShow || createHouseShowDraft();
  const card = view.houseShow;
  const picker = view.housePick;
  if (picker) return houseShowRosterSelectHtml(card, picker);
  return `<p class="bk-storyline-desc">Book a 3-match live event. House shows use limited match types and no titles. They usually lose money and hit stamina hard, but the matches count and the wrestlers get steady reps and small popularity gains.</p>
    <div class="bk-stack">${card.matches.map((match, matchIndex) => {
      const type = getMatchType(match.typeId);
      return `<article class="bk-history">
        <header><b>${matchIndex === 2 ? 'Main Event' : `Match ${matchIndex + 1}`}</b><span>${type.name}</span></header>
        <div class="bk-chips">${HOUSE_SHOW_TYPES.map(id => `<button class="bk-chip ${match.typeId === id ? 'selected' : ''}" data-bk="house-type" data-match="${matchIndex}" data-value="${id}">${getMatchType(id).name}</button>`).join('')}</div>
        <div class="bk-grid tight">${match.teams.map((team, teamIndex) => team.map((id, slotIndex) => {
          const wrestler = id ? getWrestlerById(id) : null;
          return `<button class="bk-option talent ${picker?.match === matchIndex && picker?.team === teamIndex && picker?.index === slotIndex ? 'selected' : ''}" data-bk="house-slot" data-match="${matchIndex}" data-team="${teamIndex}" data-index="${slotIndex}">
            <span class="bk-option-head"><b>${wrestler?.name ?? 'Choose wrestler'}</b></span>
            <span class="bk-option-meta">${wrestler ? `${wrestler.style} · POP ${wrestler.popularity} · STA ${booking.staminaFor(wrestler.id)}` : `Side ${teamIndex + 1}`}</span>
          </button>`;
        }).join('')).join('')}</div>
      </article>`;
    }).join('')}</div>
    <div class="bk-chips"><button class="bk-primary" data-bk="house-run" ${houseShowComplete(card) ? '' : 'disabled'}>RUN HOUSE SHOW</button><button class="bk-chip" data-bk="house-clear">CLEAR CARD</button></div>`;
}

function houseShowRosterSelectHtml(card, picker) {
  const match = card.matches[picker.match];
  if (!match) { view.housePick = null; return houseShowBuilderHtml(); }
  const type = getMatchType(match.typeId);
  const currentId = match.teams[picker.team]?.[picker.index];
  if (currentId && !view.houseCandidate) view.houseCandidate = currentId;
  const candidate = getWrestlerById(view.houseCandidate);
  const booked = houseShowBookedIds(card);
  const slotName = `${picker.match === 2 ? 'Main Event' : `Match ${picker.match + 1}`} · Side ${picker.team + 1}`;
  return `<div class="bk-back">
    <button data-bk="house-pick-cancel">← CARD</button>
    <div><b>Choose Wrestler</b><small>${slotName} · ${type.name}</small></div>
  </div>
  <div class="house-roster-select">
  <div class="house-roster-grid">${booking.getSignedRoster().map(w => {
    const locked = booked.has(w.id) && currentId !== w.id;
    const selected = view.houseCandidate === w.id;
    const portrait = wrestlerImageUrl(w);
    return `<button class="house-roster-tile ${selected ? 'selected' : ''}" data-bk="house-highlight" data-value="${w.id}" ${locked ? 'disabled' : ''}>
      <span class="house-roster-photo">
        ${portrait ? `<img src="${portrait}" alt="${w.name}">` : `<span class="house-roster-initials">${w.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span>`}
        ${locked || selected ? `<em class="house-roster-badge">${locked ? 'BOOKED' : 'SELECTED'}</em>` : ''}
      </span>
      <b class="house-roster-name">${w.name}</b>
    </button>`;
  }).join('')}</div>
  <div class="house-roster-detail">
    ${candidate ? `<div class="house-roster-detail-main">
      <div><b>${candidate.name}</b><small>${candidate.style} · POP ${candidate.popularity} · STA ${booking.staminaFor(candidate.id)}</small><p>${candidate.bio}</p></div>
    </div>
    <div class="bk-taste"><span>STR ${candidate.stats.strength}</span><span>AGI ${candidate.stats.agility}</span><span>STA ${candidate.stats.stamina}</span><span>TECH ${candidate.stats.technique}</span><span>CHA ${candidate.stats.charisma}</span><span>TGH ${candidate.stats.toughness}</span></div>
    <button class="bk-primary" data-bk="house-confirm">ADD TO HOUSE SHOW</button>` : '<p class="bk-empty">Choose a wrestler to see their details.</p>'}
  </div>
  </div>`;
}

function promoPickerHtml() {
  const roster = booking.getSignedRoster();
  const selected = view.promoWrestler ? getWrestlerById(view.promoWrestler) : null;
  const partner = view.promoPartner ? getWrestlerById(view.promoPartner) : null;
  return `<p class="bk-storyline-desc">Live mic promos are one-off moments saved to the wrestlers’ profiles. Promo cards are selected in the monthly Story Promo phase and are spent when played.</p>
    <small class="bk-label spaced">${selected ? 'WHO CUTS THIS PROMO?' : 'PUT A WRESTLER ON THE MIC'}</small>
    <div class="bk-grid tight">${roster.map(w => {
      const isSelected = view.promoWrestler === w.id;
      return `<button class="bk-option talent ${isSelected ? 'selected' : ''}" data-bk="promo-wrestler" data-value="${w.id}">
        <span class="bk-option-head"><b>${w.name}</b>${isSelected ? '<em>SPEAKER</em>' : ''}</span>
        <span class="bk-option-meta">${w.style} · POP ${w.popularity}</span>
      </button>`;
    }).join('')}</div>
    ${selected ? `
    <small class="bk-label spaced">BRING A SECOND WRESTLER? (+$${PROMO_PARTNER_FEE.toLocaleString()}, optional)</small>
    <div class="bk-grid tight">${roster.filter(w => w.id !== selected.id).map(w => {
      const isPartner = view.promoPartner === w.id;
      return `<button class="bk-option talent ${isPartner ? 'selected' : ''}" data-bk="promo-partner" data-value="${w.id}">
        <span class="bk-option-head"><b>${w.name}</b>${isPartner ? '<em>PARTNER</em>' : ''}</span>
        <span class="bk-option-meta">${w.style} · POP ${w.popularity}</span>
      </button>`;
    }).join('')}</div>
    ${leadUpImpactHtml('promo', { promoWrestlerId: selected.id }, true)}
    <button class="bk-primary" data-bk="promo-cut">CUT THE PROMO${partner ? ` WITH ${partner.name.toUpperCase()}` : ''}</button>
    ` : ''}`;
}

function leadUpImpactHtml(activityId, payload = {}, compact = false) {
  const forecast = booking.forecastLeadUpActivity(activityId, payload);
  const gradeChanged = forecast.beforeGrade !== forecast.afterGrade;
  const interestDelta = forecast.interestDelta > 0 ? `+${forecast.interestDelta}` : String(forecast.interestDelta);
  const training = activityId === 'train';
  return `<div class="leadup-impact ${compact ? 'compact' : ''}">
    ${training
      ? '<span><small>CAREER GROWTH</small><b>PERMANENT</b><em>Improves abilities</em></span><span><small>THIS PPV</small><b>BOOKED = LIFT</b><em>Otherwise, future value</em></span>'
      : `<span><small>EXPECTED PPV GRADE</small><b>${forecast.beforeGrade} → ${forecast.afterGrade}</b><em>${forecast.ratingDelta >= 0 ? '+' : ''}${forecast.ratingDelta} rating${gradeChanged ? ' · grade movement' : ''}</em></span><span><small>FAN INTEREST</small><b>${forecast.interestBefore} → ${forecast.interestAfter}</b><em>${interestDelta} expected</em></span>`}
    ${training ? '' : `<p>${forecast.note} <i>${forecast.uncertainty}</i></p>`}
  </div>`;
}

function lockerRoomAllocationHtml() {
  const allocations = view.lockerRoomAllocation ?? {};
  const total = Object.values(allocations).reduce((sum, points) => sum + points, 0);
  const roster = [...booking.getSignedRoster()].sort((a, b) =>
    booking.moraleFor(a.id) - booking.moraleFor(b.id) || booking.relationshipFor(a.id) - booking.relationshipFor(b.id),
  );
  return `<div class="locker-attention-head">
    <div><small>ATTENTION AVAILABLE</small><b>${3 - total}</b><span>of 3 points remaining</span></div>
    <p>Concentrate your time on one difficult relationship or divide it among several wrestlers. Lower-satisfaction talent appears first.</p>
  </div>
  ${leadUpImpactHtml('locker-room', { allocations })}
  <div class="locker-attention-list">${roster.map(wrestler => {
    const points = allocations[wrestler.id] ?? 0;
    return `<article class="locker-attention-row ${points ? 'selected' : ''}">
      ${wrestlerPortraitHtml(wrestler, 'locker-attention-portrait')}
      <div><b>${wrestler.name}</b><span>Morale ${booking.moraleFor(wrestler.id)} · Trust ${booking.relationshipFor(wrestler.id)}</span></div>
      <div class="locker-point-controls">
        <button data-bk="locker-point" data-value="${wrestler.id}" data-dir="-1" ${points ? '' : 'disabled'} aria-label="Remove attention from ${wrestler.name}">−</button>
        <strong>${points}</strong>
        <button data-bk="locker-point" data-value="${wrestler.id}" data-dir="1" ${total < 3 ? '' : 'disabled'} aria-label="Give attention to ${wrestler.name}">+</button>
      </div>
    </article>`;
  }).join('')}</div>
  <div class="bk-chips">
    <button class="bk-primary" data-bk="locker-confirm" ${total === 3 ? '' : 'disabled'}>SPEND ${total}/3 POINTS</button>
    <button class="bk-chip" data-bk="locker-spread">ADDRESS EVERYONE</button>
    <button class="bk-chip" data-bk="locker-clear" ${total ? '' : 'disabled'}>CLEAR</button>
  </div>`;
}

function leadUpTargetPickerHtml(activity) {
  if (activity.id === 'house-show') return houseShowBuilderHtml();
  if (activity.id === 'promo') return promoPickerHtml();
  if (activity.target === 'allocation') return lockerRoomAllocationHtml();
  if (activity.target === 'none') {
    return `${leadUpImpactHtml(activity.id)}<p class="bk-empty">No target needed — just confirm.</p><button class="bk-primary" data-bk="leadup-run" data-value="${activity.id}">DO IT</button>`;
  }
  if (activity.target === 'wrestler-stat' && view.leadUpWrestler) {
    const w = getWrestlerById(view.leadUpWrestler);
    if (!w) return '<p class="bk-empty">Wrestler not found.</p>';
    return `<p class="bk-storyline-desc">${w.name} — pick an attribute to train.</p>
      <div class="bk-chips">${TRAINABLE_STATS.map(stat => `<button class="bk-chip" data-bk="leadup-target-stat" data-value="${stat}">${stat.toUpperCase()}<em>${w.stats[stat]}</em></button>`).join('')}</div>`;
  }
  if (activity.target === 'wrestler' || activity.target === 'wrestler-stat') {
    return `<div class="bk-grid tight">${booking.getSignedRoster().map(w => `<button class="bk-option talent" data-bk="leadup-target-wrestler" data-value="${w.id}">
      <span class="bk-option-head"><b>${w.name}</b></span>
      <span class="bk-option-meta">${w.style} · POP ${w.popularity} · STA ${booking.staminaFor(w.id)}</span>
      ${activity.id === 'train' ? '<span class="train-preview">BOOST: 3-6 ATTRIBUTES BY +2-3 · RARE BREAKTHROUGH: ALL +5</span>' : leadUpImpactHtml(activity.id, { wrestlerId: w.id }, true)}
    </button>`).join('')}</div>`;
  }
  if (activity.target === 'match') {
    const show = booking.getShow();
    return `<div class="bk-stack">${show.matches.map((m, i) => `<button class="bk-option wide" data-bk="leadup-target-match" data-value="${m.id}">
      <span class="bk-option-head"><b>${positionLabel(i, show.matches.length)}</b>${m.scouted ? '<em>Scouted</em>' : ''}</span>
      <span class="bk-option-meta">${sideNames(m)}</span>
      ${leadUpImpactHtml(activity.id, { matchId: m.id }, true)}
    </button>`).join('')}</div>`;
  }
  if (activity.target === 'free-agent') {
    return '<p class="bk-empty">Talent arrives through the January pack break now, not the phone.</p>';
  }
  return '';
}

const CALENDAR_STAGES = {
  book: { label: 'BOOK THE CARD', view: 'card' },
  training: { label: 'TRAINING', view: 'leadup' },
  promo: { label: 'STORY PROMO', view: 'leadup' },
  event: { label: 'RANDOM EVENT', view: 'calendar' },
  ppv: { label: 'FIGHT WEEK — RUN THE SHOW', view: 'card' },
};

// Where the month stands: which activity is next, and the last calendar day already lived.
function calendarProgress() {
  const state = booking.getState();
  const show = booking.getShow();
  const projection = booking.getProjection();
  const leadUp = booking.getLeadUp();
  const monthDate = new Date(state.date || `${GAME_START_DATE}T12:00:00`);
  const ppvDay = new Date(show.date || `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-27T12:00:00`).getDate();
  const event = leadUp.randomEvent;
  const days = {
    book: 1,
    training: ppvDay - 20,
    promo: ppvDay - 13,
    event: event ? ppvDay + event.offset : null,
    ppv: ppvDay,
  };
  const trainingDone = Boolean(leadUp.phaseResults?.training) || leadUp.planned;
  const cardBooked = show.matches.length >= 3 && projection.matches.every(m => m.valid);
  let stage = 'ppv';
  if (!cardBooked && !trainingDone) stage = 'book';
  else if (!trainingDone) stage = 'training';
  else if (!leadUp.planned) stage = 'promo';
  else if (event && !event.resolved) stage = 'event';

  let doneDay = 0;
  if (stage !== 'book') doneDay = days.book;
  if (trainingDone) doneDay = days.training;
  if (leadUp.planned) doneDay = days.promo;
  if (event?.resolved && days.event) doneDay = Math.max(doneDay, days.event);
  return { stage, days, doneDay, targetDay: days[stage], monthKey: `${monthDate.getFullYear()}-${monthDate.getMonth()}` };
}

function calendarViewHtml() {
  const state = booking.getState();
  const show = booking.getShow();
  const currentMonthDate = new Date(state.date || `${GAME_START_DATE}T12:00:00`);
  const monthIndex = currentMonthDate.getMonth();
  const monthYear = currentMonthDate.getFullYear();
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentMonthDate);
  const monthStart = new Date(monthYear, monthIndex, 1);
  const monthEnd = new Date(monthYear, monthIndex + 1, 0);
  const firstDayOffset = monthStart.getDay();
  const totalDays = monthEnd.getDate();
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const progress = calendarProgress();
  const { days, stage } = progress;
  const ppvDay = days.ppv;
  const phaseDays = [days.training, days.promo];

  // Days already lived stay crossed off; anything newly lived since the last render animates.
  const advanceTo = view.calendarAdvance?.key === progress.monthKey ? view.calendarAdvance.to : 0;
  const passedUpTo = Math.max(progress.doneDay, advanceTo - 1);
  if (view.calendarAnim?.key !== progress.monthKey) view.calendarAnim = { key: progress.monthKey, upTo: passedUpTo };
  const animateFrom = Math.min(view.calendarAnim.upTo, passedUpTo);
  view.calendarAnim.upTo = passedUpTo;

  const cells = [];
  for (let blank = 0; blank < firstDayOffset; blank += 1) cells.push({ blank: true, day: '' });
  for (let day = 1; day <= totalDays; day += 1) {
    const isPpv = day === ppvDay;
    const phase = phaseDays.indexOf(day);
    const slot = phase + 1;
    cells.push({
      blank: false, day, ppv: isPpv, book: day === 1 && !isPpv, slot: phase >= 0 ? slot : 0,
      phase: phase >= 0 ? ['Train', 'Promo'][phase] : null,
      event: day === days.event && !isPpv && phase < 0,
      passed: day <= passedUpTo,
      passingDelay: day > animateFrom && day <= passedUpTo ? (day - animateFrom - 1) * 70 : null,
      next: day === progress.targetDay,
    });
  }
  while (cells.length % 7 !== 0) cells.push({ blank: true, day: '' });

  const cellClass = cell => [
    'day',
    cell.ppv ? 'active calendar-ppv-day' : '',
    cell.book ? 'calendar-book-day' : '',
    cell.slot ? 'calendar-phase-day' : cell.event ? 'calendar-event-day' : 'calendar-disabled-day',
    cell.passed ? 'calendar-day-passed' : '',
    cell.passingDelay !== null ? 'passing' : '',
    cell.next ? 'calendar-day-next' : '',
  ].filter(Boolean).join(' ');
  const clickable = cell => cell.slot || cell.ppv || cell.book || cell.event;
  const nextStage = CALENDAR_STAGES[stage];

  return `<div class="bk calendar-compact calendar-paper">
    <div class="calendar-month-header">
      <b>${monthLabel}</b>
      <span class="calendar-show-note">${show.name} · Show ${state.showNumber}</span>
    </div>
    <div class="calendar-grid">
      ${weekdayLabels.map(label => `<div class="calendar-weekday">${label}</div>`).join('')}
      ${cells.map(cell => cell.blank
        ? '<div class="calendar-blank" aria-hidden="true"></div>'
        : `<${clickable(cell) ? 'button' : 'div'} ${cell.ppv || cell.book ? 'type="button" data-bk="view" data-value="card"' : cell.slot ? 'type="button" data-bk="view" data-value="leadup"' : cell.event ? 'type="button" data-bk="calendar-event"' : ''} class="${cellClass(cell)}" style="--marker-tilt:${cell.day % 2 ? -8 : 6}deg;${cell.passingDelay !== null ? `--pass-delay:${cell.passingDelay}ms;` : ''}">
            <span class="calendar-date${clickable(cell) ? ' calendar-date-marked' : ''}"><b>${cell.day}</b></span>
            ${clickable(cell) ? `<span class="calendar-hand-note">${cell.ppv ? show.name : cell.book ? 'Book the card' : cell.event ? 'Event' : cell.phase === 'Train' ? 'Training' : 'Promo prep'}</span>` : ''}
          </${clickable(cell) ? 'button' : 'div'}>`).join('')}
    </div>
    <div class="calendar-next-row">
      <span class="calendar-now"><small>UP NEXT · DAY ${progress.targetDay}</small><b>${nextStage.label}</b></span>
      <button class="calendar-next-action" type="button" data-bk="calendar-advance" ${view.calendarAdvancing ? 'disabled' : ''}>
        ADVANCE TO ${nextStage.label} →
      </button>
      <button class="calendar-customize" data-bk="view" data-value="ppv-customize">Customize PPVs</button>
    </div>
  </div>`;
}

function ppvCustomizeViewHtml() {
  const branding = booking.getState().eventBranding;
  return `<div class="bk ppv-customize">
    ${backBar('Customize PPVs', 'Set each event name, logo, and accent. Generate a text logo from any custom name.')}
    <div class="ppv-customize-grid">
      ${PPV_CALENDAR.map(event => {
        const brand = branding[event.id] ?? event;
        const special = event.flagship ? 'December is the numbered year-end flagship.' : event.theme;
        return `<article class="ppv-custom-card" style="--ppv-color:${brand.color};">
          <div class="ppv-logo-preview"><img src="${logoUrl(brand.logoId, brand.name, brand.color, brand.logoStyle)}" alt="${brand.name} logo"></div>
          <div class="ppv-custom-fields">
            <small class="bk-label">${new Date(1996, event.month - 1).toLocaleDateString('en-US', { month: 'long' })}</small>
            <input aria-label="${event.name} event name" value="${brand.name}" maxlength="24" data-ppv-name data-event="${event.id}">
            <label><span>LOGO</span><select data-ppv-logo data-event="${event.id}">${PPV_LOGOS.map(([id, label]) => `<option value="${id}" ${brand.logoId === id ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
            <label><span>ACCENT</span><input type="color" value="${brand.color}" data-ppv-color data-event="${event.id}"></label>
            <small class="ppv-custom-note">${brand.logoId === 'generated' ? 'Generated logo: click again for another treatment.' : special}</small>
            <div class="ppv-custom-actions"><button class="bk-chip generate-logo" data-bk="ppv-generate" data-value="${event.id}">GENERATE LOGO</button><button class="bk-chip" data-bk="ppv-reset" data-value="${event.id}">RESET</button></div>
          </div>
        </article>`;
      }).join('')}
    </div>
  </div>`;
}

function leadUpViewHtml() {
  const leadUp = booking.getLeadUp();
  const pending = view.leadUpActivity ? getActivity(view.leadUpActivity) : null;
  const show = booking.getShow();
  const last = booking.getState().results[0];
  const done = booking.isLeadUpDone();

  if (view.houseResult) return houseShowResultViewHtml();

  if (booking.getLeadUp().monthly) return monthlyPlannerViewHtml();

  if (pending) {
    if (pending.id === 'house-show' && view.housePick) {
      return `<div class="bk house-pick-screen">${leadUpTargetPickerHtml(pending)}</div>`;
    }
    return `<div class="bk">
      ${backBar(pending.name, pending.description, 'leadup')}
      ${leadUpTargetPickerHtml(pending)}
    </div>`;
  }

  return `<div class="bk">
    ${sectionHeader(
      done ? 'Fight Week' : `Week ${leadUp.week} of ${BUILDUP_WEEKS}`,
      done
        ? `Build-up is over — ${show.name} is ready to run from the Booking Board.`
        : `Pick one thing to focus on before ${show.name}.`,
    )}
    <div class="message-list">
      <article><small>NEXT FLAGSHIP EVENT</small><b>${show.name}</b><p>${show.theme ?? ''}</p></article>
      ${last ? `<article><small>LAST RESULT</small><b>${last.showName} — ${last.rating} rating</b><p>${last.attendance.toLocaleString()} fans · ${last.date}</p></article>` : ''}
    </div>
    ${houseShowResultsHtml()}
    ${done ? '' : `
    <div class="bk-grid tight">
      ${ACTIVITIES.map(a => `<button class="bk-option" data-bk="leadup-pick" data-value="${a.id}">
        <span class="bk-option-head"><b>${a.name}</b></span>
        <small>${a.description}</small>
      </button>`).join('')}
    </div>
    <div class="bk-chips">
      <button class="bk-chip" data-bk="leadup-skip">SKIP THIS WEEK</button>
      <button class="bk-chip" data-bk="leadup-jump">SKIP TO THE PPV →</button>
    </div>`}
    ${leadUp.log.length ? `<small class="bk-label spaced">THIS MONTH</small><ul class="bk-flag-list good">${leadUp.log.map(s => `<li><em>WEEK ${s.week}</em> ${s.label}</li>`).join('')}</ul>` : ''}
  </div>`;
}

function monthlyPlannerViewHtml() {
  const show = booking.getShow();
  const roster = booking.getSignedRoster();
  const leadUp = booking.getLeadUp();
  const done = leadUp.planned;
  // Phases already run this month resume where they left off instead of re-running.
  if (!done && leadUp.phaseResults?.training && view.monthlyGuide !== 'storyline' && !view.monthlyPhaseResult) view.monthlyGuide = 'storyline';
  if (!done && view.monthlyGuide === 'storyline' && leadUp.phaseResults?.promoCard && !view.monthlyPhaseResult) view.monthlyPhaseResult = leadUp.phaseResults.promoCard;
  if (done) {
    return `<div class="bk monthly-planner monthly-complete-screen">
      ${sectionHeader('Month Complete', `${show.name} is ready for fight week.`)}
      <div class="monthly-complete-card"><small class="bk-label">THE WORK IS DONE</small><h2>Every phase is complete.</h2><p>The roster is ready. Head back to the calendar to let the rest of the month play out.</p></div>
      <button class="bk-primary" data-bk="view" data-value="calendar">BACK TO THE CALENDAR →</button>
    </div>`;
  }
  const phases = [
    { id: 'training', icon: createElement(Dumbbell, { width: 30, height: 30, 'aria-hidden': 'true' }).outerHTML, art: trainingArtUrl, name: 'Training', blurb: 'One wrestler this month. Three attributes gain +2-3 each, with a rare breakthrough of +5 each.', body: `<div class="monthly-training-controls"><div><small>MONTHLY DEVELOPMENT</small><h3>Choose your training focus</h3></div><button type="button" class="bk-chip" data-bk="monthly-training-auto">AUTO SELECT</button></div><div class="monthly-choice-grid">${roster.map(w => `<button type="button" class="bk-option talent ${view.monthlyTrainingIds.includes(w.id) ? 'selected' : ''}" data-bk="monthly-trainer" data-value="${w.id}" aria-pressed="${view.monthlyTrainingIds.includes(w.id)}"><span class="bk-option-head"><b>${financeText(w.name)}</b><em>${view.monthlyTrainingIds.includes(w.id) ? 'SELECTED' : ''}</em></span><span class="monthly-talent-stats">${[['strength', 'STR'], ['agility', 'AGI'], ['stamina', 'STA'], ['technique', 'TECH'], ['charisma', 'CHA'], ['toughness', 'TGH']].map(([stat, label]) => `<span><small>${label}</small><b>${w.stats[stat]}</b></span>`).join('')}</span></button>`).join('')}</div>` },
    { id: 'storyline', icon: createElement(Mic, { width: 30, height: 30, 'aria-hidden': 'true' }).outerHTML, art: promoArtUrl, name: 'Story Promo', blurb: 'Play one eligible Promo card for a booked match, boosting its hype and the spotlight wrestler.', body: micCardHtml() },
  ];
  const activePhase = phases.find(phase => phase.id === view.monthlyGuide) ?? phases[0];
  const result = view.monthlyPhaseResult;
  const summary = result ? monthlyPhaseSummaryHtml(activePhase.id, result) : activePhase.body;
  const nextLabel = !result
    ? `RUN ${activePhase.name.toUpperCase()} →`
    : activePhase.id === 'training' ? 'CONTINUE TO STORY PROMO →' : 'FINISH MONTH →';
  return `<div class="bk monthly-workflow monthly-workflow-${activePhase.id} ${result ? 'monthly-workflow-results' : ''}" style="--monthly-art:url('${activePhase.art}')">
    <div class="monthly-workflow-hero"><div class="monthly-workflow-topline"><span>${financeText(booking.getCompanyIdentity().name)}</span><span>${financeText(show.name)} · MONTHLY PREP</span></div><div class="monthly-workflow-heading"><span class="monthly-workflow-icon">${activePhase.icon}</span><div><small>${activePhase.name.toUpperCase()} · ${result ? 'RESULTS' : 'SELECTION'}</small><h2>${activePhase.name}</h2><p>${activePhase.blurb}</p></div></div><div class="monthly-workflow-phases" aria-label="Monthly preparation progress"><span class="${activePhase.id === 'training' ? 'active' : 'done'}">01 TRAINING</span><span class="${activePhase.id === 'storyline' ? 'active' : ''}">02 STORY PROMO</span></div></div>
    <div class="monthly-workflow-body">${summary}</div>
    <button class="bk-primary monthly-next" data-bk="monthly-next">${nextLabel}</button>
  </div>`;
}

function monthlyPhaseSummaryHtml(phase, result) {
  if (phase === 'training') return `<div class="monthly-result training-result"><small class="bk-label">SESSION COMPLETE</small><h3>The work is in.</h3><div class="monthly-result-list">${result.map(entry => `<article class="monthly-training-report ${entry.breakthrough ? 'breakthrough' : ''}"><div class="monthly-training-report-head"><b>${financeText(entry.name)}</b><span>${entry.breakthrough ? 'BREAKTHROUGH' : 'TRAINING COMPLETE'}</span></div><dl class="monthly-training-gains">${entry.stats.map(stat => `<div><dt>${stat.toUpperCase()}</dt><dd>+${entry.gains?.[stat] ?? entry.gain}</dd></div>`).join('')}</dl></article>`).join('')}</div></div>`;
  return `<div class="monthly-result promo-result">
    <small class="bk-label">${result.promoCardId ? `${result.rarity} PROMO PLAYED` : 'NO PROMO CARD PLAYED'}</small>
    <h3>${financeText(result.name)}</h3>
    <p class="angle-latest">${financeText(result.text)}</p>
    ${result.promoCardId ? `<p class="monthly-promo-wrestler">${financeText(result.wrestlerName)}</p><dl class="monthly-training-gains"><div><dt>MOMENTUM</dt><dd>+${result.momentum}</dd></div><div><dt>POPULARITY</dt><dd>+${result.popularity}</dd></div><div><dt>MATCH HYPE</dt><dd>+${result.matchBuzz}</dd></div></dl>` : `<p class="monthly-result-flavor">${financeText(result.wrestlerName)} takes the mic this month without spending a Promo card.</p>`}
  </div>`;
}


// ---------------------------------------------------------------------------
// Founding ceremony — a pack break, not a draft
// ---------------------------------------------------------------------------
// One card component for every kind of pull — wrestlers, stipulations, and belts.
// Both faces always live in the DOM so the reveal is a real flip rather than a swap.
function revealCardHtml(card, index, { revealed, action = null, clickAction = null, dealDelay = 0, flipDelay = null }) {
  const style = `--deal-delay:${dealDelay}ms;${flipDelay !== null ? `--flip-delay:${flipDelay}ms;` : ''}`;
  const acronym = booking.getCompanyIdentity().acronym;
  let kindClass = '';
  let badge = '';
  let art = '';
  let name = '';
  let footL = '';
  let footR = '';

  if (card.kind === 'wrestler') {
    const w = card.wrestler;
    kindClass = `card-wrestler tier-${card.tier}`;
    badge = TIER_LABELS[card.tier] ?? card.tier;
    art = w ? wrestlerPortraitHtml(w, 'card-portrait') : '';
    name = w?.name ?? 'Unknown';
    footL = w?.style ?? '';
    footR = `POP ${w?.popularity ?? '-'}`;
  } else if (card.kind === 'title') {
    kindClass = 'card-title-belt';
    badge = 'Championship';
    art = `<div class="card-glyph belt"><img src="${BELT_IMAGES[card.id] ?? ''}" alt=""></div>`;
    name = booking.companyBrandedText(card.title?.name ?? 'Championship');
    footL = card.title?.kind === 'tag' ? 'Tag team' : 'Singles';
    footR = 'VACANT';
  } else if (card.kind === 'promo') {
    const rarity = card.rarity;
    const buzzRange = card.id === 'custom' ? [9, 16] : rarity?.matchBuzz ?? [0, 0];
    kindClass = `card-gimmick card-promo rarity-${rarity?.id ?? 'common'}`;
    badge = rarity?.name ?? 'Common';
    name = card.promo?.name ?? card.id;
    art = `<div class="card-glyph"><span>${name}</span><em>PROMO</em></div>`;
    footL = card.promo?.category ?? 'Promo';
    footR = `HYPE +${buzzRange[0]}-${buzzRange[1]}`;
  } else {
    const rarity = card.rarity;
    kindClass = `card-gimmick card-match rarity-${rarity?.id ?? 'common'}`;
    badge = rarity?.name ?? 'Common';
    name = card.type?.name ?? card.id;
    art = `<div class="card-glyph"><span>${name}</span><em>MATCH</em></div>`;
    footL = `CEIL +${(card.type?.ceiling ?? 0) + (rarity?.ceilingBonus ?? 0)}`;
    footR = `BUZZ +${(card.type?.buzz ?? 0) + (rarity?.buzzBonus ?? 0)}`;
  }

  return `<article class="pack-card ${kindClass} ${revealed ? 'revealed' : ''} ${flipDelay !== null ? 'flipping' : ''} ${clickAction ? 'clickable' : ''}" style="${style}"${clickAction ? ` data-bk="${clickAction}" data-value="${index}" role="button" tabindex="0"` : ''}>
    <div class="pack-card-inner">
      <div class="pack-card-face card-reverse">
        <span class="card-reverse-mark">${acronym}</span>
        <small>${card.kind === 'wrestler' ? 'CONTRACT' : card.kind === 'title' ? 'CHAMPIONSHIP' : card.kind === 'promo' ? 'PROMO' : 'MATCH'}</small>
      </div>
      <div class="pack-card-face card-obverse">
        <div class="card-art">${art}</div>
        <span class="card-tier">${badge}</span>
        <div class="card-nameplate"><b>${name}</b></div>
        <div class="card-footer"><span>${footL}</span><span>${footR}</span></div>
      </div>
    </div>
    ${action ?? ''}
  </article>`;
}

export function cardBookHtml(section = 'wrestlers') {
  const inventory = booking.getCardBookInventory();
  const sections = { wrestlers: 'Wrestlers', matches: 'Match', promos: 'Promo' };
  const active = Object.hasOwn(sections, section) ? section : 'wrestlers';
  const entries = inventory[active];
  return `<div class="card-book"><nav class="card-book-tabs" aria-label="Card book sections">${Object.entries(sections).map(([id, label]) => `<button type="button" data-card-book-section="${id}" class="${active === id ? 'selected' : ''}" aria-pressed="${active === id}">${label}<span>${inventory[id].filter(entry => entry.status === 'owned').length}/${inventory[id].length}</span></button>`).join('')}</nav>
    <section class="card-book-page" aria-label="${sections[active]} cards"><h3>${sections[active]}</h3><div class="card-book-grid">${entries.map((entry, index) => {
      const card = entry.status === 'locked' ? { kind: 'wrestler', tier: '?', wrestler: null } : entry.card;
      const rendered = revealCardHtml(card, index, { revealed: true });
      const ownedWrestler = active === 'wrestlers' && entry.status === 'owned';
      return `<div class="card-book-pocket ${entry.status}" ${entry.status === 'locked' ? 'aria-label="Undiscovered wrestler"' : ''}>${ownedWrestler ? `<button class="card-book-profile" type="button" data-profile="${entry.card.id}" aria-label="View ${entry.card.wrestler.name} profile">${rendered}</button>` : rendered}
        ${active !== 'wrestlers' ? `<span class="card-book-count" title="${entry.count} in stock, ${entry.used} previously used"><b>${entry.count} held</b>${entry.reserved ? `<em>${entry.reserved} booked</em>` : ''}${entry.used ? `<em>${entry.used}x used</em>` : ''}</span>` : entry.status === 'unowned' ? '<span class="card-book-status">FREE AGENT</span>' : entry.status === 'locked' ? '<span class="card-book-status">UNDISCOVERED</span>' : ''}</div>`;
    }).join('')}</div></section></div>`;
}

// Shared deal/flip timing for any reveal grid. Face-down cards are clickable.
// The deal animation only runs while the pack is untouched, so later re-renders do
// not re-deal the whole grid.
function revealGridHtml(cards, revealed, { flipped = [], actionFor = null, revealAction = null } = {}) {
  const dealing = revealed.length === 0;
  return `<div class="pack-card-grid ${dealing ? 'dealing' : ''}">${cards.map((card, index) => {
    const isUp = revealed.includes(index);
    const flipOrder = flipped.indexOf(index);
    return revealCardHtml(card, index, {
      revealed: isUp,
      action: actionFor ? actionFor(card, index) : null,
      clickAction: !isUp && revealAction ? revealAction : null,
      dealDelay: dealing ? index * 55 : 0,
      flipDelay: flipOrder >= 0 ? flipOrder * 140 : null,
    });
  }).join('')}</div>`;
}

// Flips the clicked card without re-rendering the grid, so nothing else moves.
function flipCardInPlace(target, { revealed, total, redrawIndex = null }) {
  const card = target.closest('.pack-card');
  if (!card) return false;
  card.classList.remove('clickable');
  card.removeAttribute('data-bk');
  card.removeAttribute('role');
  card.removeAttribute('tabindex');
  card.style.setProperty('--flip-delay', '0ms');
  card.classList.add('revealed', 'flipping');
  if (redrawIndex !== null && !card.querySelector('.pack-redraw')) {
    const redraw = document.createElement('button');
    redraw.className = 'bk-chip pack-redraw';
    redraw.dataset.bk = 'founding-redraw';
    redraw.dataset.value = String(redrawIndex);
    redraw.textContent = 'RE-DRAW';
    card.appendChild(redraw);
  }
  const counter = card.closest('.pack-break')?.querySelector('.pack-bar-count');
  if (counter) counter.textContent = `${revealed}/${total} REVEALED`;
  return true;
}

function sealedPackHtml(action, { kicker, title, count, note }) {
  const company = booking.getCompanyIdentity();
  const logo = companyLogoUrl(company.acronym, company.name, company.logoStyle, company.logoAccent);
  return `<div class="pack-sealed">
    <div class="foil-pack" data-bk="${action}" role="button" tabindex="0" aria-label="Tear the pack open">
      <div class="foil-pack-serrated top"></div>
      <div class="foil-pack-body">
        <img class="foil-pack-logo" src="${logo}" alt="Company logo" />
        <small>${kicker}</small>
        <b>${title}</b>
        <span class="foil-pack-count">${count}</span>
        <em>${note}</em>
      </div>
      <div class="foil-pack-serrated bottom"></div>
      <div class="foil-pack-shine"></div>
    </div>
    <button class="bk-primary pack-open-btn" data-bk="${action}">TEAR IT OPEN</button>
  </div>`;
}

function revealControlsHtml(revealed, total, { allAction, doneAction, doneLabel, hint }) {
  return `<div class="pack-bar">
    <span class="pack-bar-count">${revealed}/${total} REVEALED</span>
    <span class="pack-bar-hint">${revealed >= total ? '' : (hint ?? 'Click a card to turn it over')}</span>
    ${revealed >= total
      ? `<button type="button" class="bk-primary" data-bk="${doneAction}">${doneLabel}</button>`
      : `<button type="button" class="bk-chip" data-bk="${allAction}">REVEAL ALL</button>`}
  </div>`;
}

export function purchasedPackRevealHtml(flipped = []) {
  const pack = booking.getPurchasedPackReveal();
  if (!pack) return '';
  return `<div class="bk pack-break"><header class="pack-head"><small>${pack.free ? 'COMPLIMENTARY PACK' : 'LOUNGE PACK DROP'}</small><b class="bk-draft-title">${pack.name}</b><p>${pack.queued ? `${getWrestlerById(pack.queued)?.name ?? 'Your wrestler'} is waiting in roster intake. Your Match and Promo cards are already in inventory.` : 'Your cards are in inventory. Turn them over to see what you pulled.'}</p></header>
    ${revealControlsHtml(pack.revealed.length, pack.cards.length, { allAction: 'purchase-reveal-all', doneAction: 'purchase-reveal-done', doneLabel: 'BACK TO THE MACHINE', hint: 'Click a card to turn it over' })}
    ${revealGridHtml(pack.cards, pack.revealed, { flipped, revealAction: 'purchase-reveal' })}
    ${pack.queued && pack.revealed.length === pack.cards.length ? '<button class="bk-primary" type="button" data-pack-intake>REVIEW CONTRACT</button>' : ''}</div>`;
}

function foundingCeremonyViewHtml() {
  booking.openFoundingCeremony();
  const ceremony = booking.getFoundingCeremony();
  const cards = ceremony.cards;
  const revealed = ceremony.revealed;
  return `<div class="bk pack-break">
    <header class="pack-head">
      <button class="pack-exit" data-back="close" type="button" aria-label="Back to the crib" title="Back to the crib">←</button>
      <small>OPENING NIGHT</small>
      <b class="bk-draft-title">Break The Pack</b>
      <p>Reveal your starting roster. 2 legends, 2 stars, 6 contenders, 4 enhancement talent</p>
    </header>
    ${!ceremony.opened ? sealedPackHtml('founding-open', {
      kicker: booking.getCompanyIdentity().name.toUpperCase(),
      title: 'FOUNDING<br>CONTRACTS',
      count: '14 CARDS',
      note: '',
    }) : `
    ${revealControlsHtml(revealed.length, cards.length, {
      allAction: 'founding-reveal-all',
      doneAction: 'founding-confirm',
      doneLabel: 'LOCK IN THE ROSTER →',
      hint: `Click a card to turn it over · ${ceremony.redrawsLeft} re-draw left`,
    })}
    ${revealGridHtml(cards, revealed, {
      flipped: view.packFlipped,
      revealAction: 'founding-reveal',
      actionFor: (card, index) => (revealed.includes(index) && ceremony.redrawsLeft > 0
        ? `<button class="bk-chip pack-redraw" data-bk="founding-redraw" data-value="${index}">RE-DRAW</button>`
        : null),
    })}`}
  </div>`;
}

// The founding pack's second half: both belts and the starter stipulations.
function foundingStarterViewHtml() {
  const starter = booking.getFoundingStarter();
  if (!starter) return cardViewHtml();
  return `<div class="bk pack-break">
    <header class="pack-head">
      <button class="pack-exit" data-back="close" type="button" aria-label="Back to the crib" title="Back to the crib">←</button>
      <small>THE REST OF THE ENVELOPE</small>
      <b class="bk-draft-title">Promos &amp; Match Cards</b>
      <p>Contracts were not the only thing in there. Both championships came with the sale, along with Promo cards to sell the matches and stipulations to raise the stakes.</p>
    </header>
    ${revealControlsHtml(starter.revealed.length, starter.cards.length, {
      allAction: 'starter-reveal-all',
      doneAction: 'starter-done',
      doneLabel: 'CONTINUE →',
    })}
    ${revealGridHtml(starter.cards, starter.revealed, {
      flipped: view.packFlipped,
      revealAction: 'starter-reveal',
    })}
  </div>`;
}


// The annual pack: the wrestlers and the stipulations come out of the same wrapper.
function annualRevealViewHtml() {
  const reveal = booking.getAnnualReveal();
  if (!reveal) return cardViewHtml();
  const wrestlers = reveal.cards.filter(c => c.kind === 'wrestler').length;
  const gimmicks = reveal.cards.filter(c => c.kind === 'gimmick').length;
  const promos = reveal.cards.filter(c => c.kind === 'promo').length;
  // A reveal already in progress never goes back in the wrapper.
  const opened = view.annualOpened || reveal.revealed.length > 0;
  return `<div class="bk pack-break">
    <header class="pack-head">
      <button class="pack-exit" data-back="close" type="button" aria-label="Back to the crib" title="Back to the crib">←</button>
      <small>JANUARY · YEAR ${reveal.year}</small>
      <b class="bk-draft-title">The Annual Pack</b>
      <p>${reveal.chipsSpent} chips spent on the board. ${wrestlers} contract${wrestlers === 1 ? '' : 's'}, ${gimmicks} stipulation${gimmicks === 1 ? '' : 's'}, and ${promos} Promo card${promos === 1 ? '' : 's'} came out of it.</p>
    </header>
    ${!opened ? sealedPackHtml('annual-open', {
      kicker: `${booking.getCompanyIdentity().name.toUpperCase()} · YEAR ${reveal.year}`,
      title: 'ANNUAL<br>PACK',
      count: `${reveal.cards.length} CARDS`,
      note: `${wrestlers} CONTRACTS / ${gimmicks} STIPULATIONS / ${promos} PROMOS`,
    }) : `
    ${revealControlsHtml(reveal.revealed.length, reveal.cards.length, {
      allAction: 'annual-reveal-all',
      doneAction: 'annual-reveal-done',
      doneLabel: reveal.queued ? 'MAKE THE CALLS →' : 'BACK TO THE BOOKING BOARD →',
    })}
    ${revealGridHtml(reveal.cards, reveal.revealed, {
      flipped: view.packFlipped,
      revealAction: 'annual-reveal',
    })}
    ${reveal.queued ? `<p class="pack-note">The roster is full. ${reveal.queued === 1 ? 'One contract needs' : `${reveal.queued} contracts need`} a decision once you are done here — sign them and end somebody's career, or pass.</p>` : ''}`}
  </div>`;
}

// ---------------------------------------------------------------------------
// January free agency — the board, the chips, the pull
// ---------------------------------------------------------------------------
function annualPullViewHtml() {
  const pull = booking.openAnnualPull() && booking.getAnnualPull();
  const chipsLeft = pull.chipsAvailable;
  return `<div class="bk annual-board">
    <header class="bk-head">
      <div class="bk-head-name">
        <small>JANUARY · YEAR ${pull.year}</small>
        <b class="bk-draft-title">The Free Agency Board</b>
        <p class="bk-event-theme">Twelve names are available. You get ${pull.pulls} draw${pull.pulls === 1 ? '' : 's'}${pull.bonusEarned ? ` — a ${pull.lastYearRating} average last year earned you an extra one` : ''}. Chips shift the odds; they do not buy anyone outright. A chip buys far less weight on a legend than on a jobber.</p>
      </div>
      <div class="bk-head-stats">
        <span><small>CHIPS LEFT</small><b>${chipsLeft}</b></span>
        <span><small>DRAWS</small><b>${pull.pulls}</b></span>
      </div>
    </header>
    <div class="roulette-board">${pull.board.map(card => {
      const w = card.wrestler;
      if (!w) return '';
      return `<article class="roulette-slot tier-${card.tier} ${card.chips ? 'backed' : ''}">
        <header><b>${w.name}</b><em>${TIER_LABELS[card.tier]}</em></header>
        <span class="roulette-odds">${(card.probability * 100).toFixed(1)}%</span>
        <small>POP ${w.popularity}${card.carryover ? ` · ${card.carryover.toFixed(1)} standing interest` : ''}</small>
        <div class="roulette-chips">
          <button class="bk-chip" data-bk="chip-remove" data-value="${w.id}" ${card.chips ? '' : 'disabled'}>−</button>
          <b>${card.chips}</b>
          <button class="bk-chip" data-bk="chip-add" data-value="${w.id}" ${chipsLeft > 0 ? '' : 'disabled'}>+</button>
        </div>
      </article>`;
    }).join('')}</div>
    <div class="bk-chips">
      <button class="bk-chip" data-bk="chip-clear">TAKE BACK ALL CHIPS</button>
      <button class="bk-primary" data-bk="annual-pull">SPIN THE BOARD →</button>
    </div>
    <p class="bk-storyline-desc">Chips left on names you do not pull decay into standing interest that carries to next January. Nothing is wasted entirely — but nothing is guaranteed either.</p>
  </div>`;
}

// ---------------------------------------------------------------------------
// Roster intake — the trade you make when you are already full
// ---------------------------------------------------------------------------
function rosterIntakeViewHtml() {
  const intake = booking.getRosterIntake();
  if (!intake) return '';
  const w = intake.wrestler;
  return `<div class="bk roster-intake">
    ${sectionHeader('A Contract You Do Not Have Room For', `${intake.rosterSize} under contract. The locker room is full.`)}
    <div class="intake-hero">
      <div class="intake-card">${revealCardHtml({ kind: 'wrestler', id: w.id, tier: intake.tier, wrestler: w }, 0, { revealed: true })}</div>
      <div>
        <small>${TIER_LABELS[intake.tier]} · DRAWN THIS JANUARY</small>
        <h2>${w.name}</h2>
        <p>${w.style} · POP ${w.popularity}${w.nickname ? ` · "${w.nickname}"` : ''}</p>
        <p class="bk-storyline-desc">You can sign them, but somebody's career ends tonight to make the room. Pass and they stay in the industry — they will remember the interest next January.</p>
      </div>
      <span class="intake-remaining">${intake.remaining} left to decide</span>
    </div>
    <div class="bk-chips">
      <button class="bk-chip" data-bk="intake-pass">PASS ON ${w.name.toUpperCase()}</button>
    </div>
    <small class="bk-label spaced">OR END A CAREER TO MAKE ROOM</small>
    <p class="bk-storyline-desc">Sorted by how little you have actually used them over the past year — not by how good they are. Champions cannot be retired while they hold gold.</p>
    <div class="bk-grid tight">${intake.candidates.map(({ wrestler: candidate, usage, age }) => `<button class="bk-option talent" data-bk="intake-accept" data-value="${candidate.id}">
      <span class="bk-option-head"><b>${candidate.name}</b><em>${usage} APPEARANCE${usage === 1 ? '' : 'S'}</em></span>
      <span class="bk-option-meta">AGE ${age} · ${TIER_LABELS[getDraftTier(candidate)]} · POP ${candidate.popularity}</span>
    </button>`).join('')}</div>
  </div>`;
}


// ---------------------------------------------------------------------------
// Public render + event handling
// ---------------------------------------------------------------------------
const RANDOM_EVENT_ICONS = { injury: '✚', growth: '▲', morale: '☺', hype: '★', setback: '☂', storyline: '⚡', 'new-story': '✦' };

function randomEventModalHtml() {
  const event = booking.getRandomEvent();
  if (!event?.resolved || event.seen || !event.result) return '';
  const result = event.result;
  const effects = (result.effects ?? []).map(effect => effect.replace(/^Profile Promo:/, 'Profile story recorded:'));
  const profileOnly = result.kind === 'new-story' && effects.length > 0 && effects.every(effect => effect.startsWith('Profile story recorded:'));
  const outcome = result.impactSummary ?? (profileOnly
    ? 'Profile history only. No active rivalry was started, and match hype, momentum, and popularity are unchanged.'
    : effects.length ? 'The changes below have been applied immediately.' : 'No gameplay values changed.');
  return `<div class="random-event-backdrop">
    <article class="random-event-card kind-${result.kind}" role="dialog" aria-label="${financeText(result.title)}">
      <header><span class="random-event-icon">${RANDOM_EVENT_ICONS[result.kind] ?? '?'}</span><div><small>RANDOM EVENT · ${financeText(result.date)}</small><h3>${financeText(result.title)}</h3></div></header>
      <p>${financeText(result.body)}</p>
      <section class="random-event-outcome"><small>OUTCOME</small><p>${financeText(outcome)}</p><ul class="random-event-effects">${effects.map(effect => `<li>${financeText(effect)}</li>`).join('')}</ul></section>
      ${result.wrestlerIds?.length ? `<div class="random-event-people"><small>INVOLVED</small>${result.wrestlerIds.map(id => {
        const wrestler = getWrestlerById(id);
        return wrestler ? `<button type="button" class="random-event-person" data-profile="${id}">${wrestlerPortraitHtml(wrestler)}<span>${wrestler.name}</span><em>VIEW PROFILE →</em></button>` : '';
      }).join('')}</div>` : ''}
      <button class="bk-primary" data-bk="random-event-dismiss">CONTINUE</button>
    </article>
  </div>`;
}

export function bookingPanelHtml() {
  const html = bookingViewHtml();
  return ['calendar', 'card'].includes(view.name) ? `${html}${randomEventModalHtml()}` : html;
}

function bookingViewHtml() {
  if (!booking.isDraftComplete()) return foundingCeremonyViewHtml();
  if (booking.getFoundingStarter()) return foundingStarterViewHtml();
  if (view.name === 'results') return resultsViewHtml();
  if (view.name === 'result-match') return resultMatchViewHtml();
  if (view.name === 'year-recap') return yearEndRecapHtml();
  if (view.name === 'incident-result') return incidentResultHtml();
  if (booking.getAnnualReveal()) return annualRevealViewHtml();
  if (booking.getRosterIntake()) return rosterIntakeViewHtml();
  if (booking.isAnnualPullDue()) return annualPullViewHtml();
  if (booking.getPendingIncident()) return incidentViewHtml();
  if (view.name === 'calendar') return calendarViewHtml();
  if (view.name === 'ppv-customize') return ppvCustomizeViewHtml();
  if (view.name === 'venue') return venueViewHtml();
  if (view.name === 'heatmap') return `<div class="bk">${backBar('Markets', '')}${marketHeatmapHtml({ hype: booking.getState().marketHype, show: booking.getShow(), gmLevel: booking.getGMLevel(), scope: view.heatmapScope ?? 'usa', selectedCity: view.heatmapCity, projectVenue: venue => booking.getProjection(venue.id) })}</div>`;
  if (view.name === 'match') return matchViewHtml();
  if (view.name === 'roster') return rosterViewHtml();
  if (view.name === 'history') return historyViewHtml();
  if (view.name === 'trophies') return trophyViewHtml();
  if (view.name === 'records') return recordsViewHtml();
  if (view.name === 'titles') return titlesViewHtml();
  if (view.name === 'title-detail') return titleDetailViewHtml();
  if (view.name === 'teams') return teamsViewHtml();
  if (view.name === 'leadup') return leadUpViewHtml();
  return cardViewHtml();
}

export function bookingPanelKicker() {
  if (!booking.isDraftComplete()) return 'INAUGURAL DRAFT · BUILD YOUR ROSTER';
  if (booking.getPendingIncident()) return 'AFTER THE SHOW · DECISION REQUIRED';
  if (view.name === 'leadup' && view.leadUpActivity === 'house-show' && view.housePick) return 'HOUSE_PICKER_COMPACT';
  if (view.name === 'calendar') return 'ESC · RETURN TO HEADQUARTERS';
  if (view.name === 'year-recap') {
    const awards = booking.getState().results[view.resultIndex]?.progress?.awards;
    if (awards) return `YEAR IN REVIEW · SEASON ${awards.season}`;
  }
  if (view.name === 'results' || view.name === 'result-match') {
    const result = booking.getState().results[view.resultIndex];
    if (result) return `RESULTS · ${result.showName.toUpperCase()}`;
  }
  if (view.name === 'incident-result') return 'AFTER THE SHOW · DECISION OUTCOME';
  if (view.name === 'leadup') return 'MONTHLY PLAN · TRAINING & STORY PROMO';
  if (view.name === 'history') return `SHOW HISTORY · ${booking.getState().history.length} LOGGED`;
  const show = booking.getShow();
  const venue = getVenueById(show.venueId);
  return `${show.name.toUpperCase()} · ${venue ? venue.city.toUpperCase() : 'NO VENUE'}`;
}

function selectSpotlight(wrestlerId, matchId) {
  view.monthlySpotlightId = wrestlerId;
  view.matchId = matchId;
  view.storylinePartnerId = null;
}

// Returns true when the panel needs to re-render.
export function handleBookingEvent(event, { toast = () => {}, onShowRun = () => {}, onReturnToCalendarWall = () => {}, onOpenBookingBoard = () => {}, onOpenVending = () => {}, refresh = () => {} } = {}) {
  const target = event.target.closest('[data-bk]');
  if (!target) return false;
  const action = target.dataset.bk;
  const value = target.dataset.value;

  switch (action) {
    case 'recordbook-tab':
      if (['classics', 'holders', 'yearbook'].includes(value)) view.recordBookTab = value;
      return true;
    case 'fold':
      if (open.has(value)) open.delete(value);
      else open.add(value);
      return true;
    case 'view':
      view.name = value;
      if (value === 'heatmap') {
        view.heatmapCity = getVenueById(booking.getShow().venueId)?.city;
        view.heatmapScope = MARKET_LOCATIONS[view.heatmapCity]?.country === 'USA' ? 'usa' : 'world';
      }
      if (value === 'leadup') {
        view.leadUpActivity = null;
        view.leadUpWrestler = null;
        view.promoWrestler = null;
        view.promoPartner = null;
        view.houseShow = null;
        view.housePick = null;
      }
      return true;
    case 'calendar-event':
    case 'calendar-advance': {
      if (view.calendarAdvancing) return false;
      const progress = calendarProgress();
      if (action === 'calendar-event' && booking.getRandomEvent()?.resolved) {
        const randomEvent = booking.getRandomEvent();
        if (randomEvent.result) randomEvent.seen = false;
        return true;
      }
      if (action === 'calendar-event' && progress.stage !== 'event') {
        toast('Finish booking, training, and the Story Promo before advancing to the random event.');
        return true;
      }
      const alreadyPassed = Math.max(progress.doneDay, view.calendarAnim?.upTo ?? 0);
      const daysToPass = Math.max(0, progress.targetDay - 1 - alreadyPassed);
      view.calendarAdvance = { key: progress.monthKey, to: progress.targetDay };
      view.calendarAdvancing = true;
      setTimeout(() => {
        view.calendarAdvancing = false;
        if (view.name !== 'calendar') return;
        if (progress.stage === 'event') {
          booking.resolveRandomEvent();
        } else {
          view.name = CALENDAR_STAGES[progress.stage].view;
          if (progress.stage === 'training' || progress.stage === 'promo') view.monthlyGuide = progress.stage === 'training' ? 'training' : 'storyline';
          view.monthlyPhaseResult = null;
        }
        refresh();
      }, daysToPass * 70 + 450);
      return true;
    }
    case 'random-event-dismiss':
      booking.dismissRandomEvent();
      return true;
    case 'belt-detail':
      view.titleId = value;
      view.titleHistoryPage = 0;
      view.name = 'title-detail';
      return true;
    case 'title-history-page':
      view.titleHistoryPage = Math.max(0, view.titleHistoryPage + Number(value));
      return true;
    case 'team-sort':
      if (!['w', 'l'].includes(value)) return false;
      teamSort.dir = teamSort.key === value && teamSort.dir === 'desc' ? 'asc' : 'desc';
      teamSort.key = value;
      return true;
    case 'team-rename': {
      const name = target.closest('[data-team-row]')?.querySelector('[data-team-rename-input]')?.value ?? '';
      const result = booking.renameTeam(value, name);
      toast(result.ok ? 'Team renamed.' : result.message);
      return true;
    }
    case 'team-member':
      if (view.teamMembers.includes(value)) view.teamMembers = view.teamMembers.filter(id => id !== value);
      else if (view.teamMembers.length < 2) view.teamMembers = [...view.teamMembers, value];
      else toast('A tag team has exactly two members.');
      return true;
    case 'team-create': {
      const result = booking.createTeam(view.teamName, view.teamMembers);
      toast(result.ok ? `${result.team.name} formed.` : result.message);
      if (result.ok) { view.teamMembers = []; view.teamName = ''; }
      return true;
    }
    case 'team-dissolve':
      if (booking.dissolveTeam(value)) toast('Team dissolved. Both wrestlers are available for new pairings.');
      return true;
    case 'ppv-reset':
      booking.resetEventBranding(value);
      return true;
    case 'ppv-generate':
      booking.generateEventLogo(value);
      return true;
    case 'heatmap-scope':
      view.heatmapScope = value === 'world' ? 'world' : 'usa';
      if (view.heatmapScope === 'usa' && MARKET_LOCATIONS[view.heatmapCity]?.country !== 'USA') view.heatmapCity = venues[0].city;
      return true;
    case 'heatmap-market':
      if (MARKET_LOCATIONS[value]) view.heatmapCity = value;
      return true;
    case 'venue':
      if (!booking.setShowField('venueId', value)) {
        toast('This venue requires a higher GM level.');
        return true;
      }
      view.name = 'card';
      toast(`Booked into ${getVenueById(value)?.city}`);
      return true;
    case 'ticket':
      booking.setShowField('ticketId', value);
      toast(`Pricing: ${getTicketTier(value).name}`);
      return true;
    case 'finance-reset':
      for (const [category, price] of Object.entries(defaultPrices())) {
        if (category !== 'suite' || suitesUnlocked(booking.getGMLevel())) booking.setFinancePrice(category, price);
      }
      return true;
    case 'add-match':
      booking.addMatch();
      toast('Match slot added to the card');
      return true;
    case 'remove-match':
      booking.removeMatch(value);
      return true;
    case 'move-match':
      booking.moveMatch(value, Number(target.dataset.dir));
      return true;
    case 'edit-match':
      view.name = 'match';
      view.matchId = value;
      view.storylinePartnerId = null;
      view.customStorylineTitle = '';
      view.customStorylineDescription = '';
      return true;
    case 'type':
      booking.setMatchType(view.matchId, value);
      return true;
    case 'gimmick': {
      const match = booking.getMatch(view.matchId);
      if (!match) return false;
      if (match.typeId === value) {
        open.add('match-gimmick');
        return true;
      }
      const applied = booking.setMatchType(view.matchId, value);
      if (!applied) {
        toast('That stipulation is not available for this match yet.');
        return true;
      }
      open.add('match-gimmick');
      return true;
    }
    case 'gimmick-clear': {
      const match = booking.getMatch(view.matchId);
      const perTeam = getMatchType(match?.typeId)?.slots?.perTeam ?? 1;
      booking.setMatchType(view.matchId, perTeam >= 2 ? 'tag-team' : 'singles');
      open.add('match-gimmick');
      toast('Stipulation taken back off the match.');
      return true;
    }
    case 'title':
      booking.setMatchTitle(view.matchId, value);
      if (value) toast(`${getChampionship(value).name} is on the line`);
      else toast('Title taken back off the line.');
      return true;
    case 'call-finish': {
      booking.setMatchWinner(view.matchId, value);
      const w = value ? getWrestlerById(value) : null;
      toast(w ? `Finish called: ${w.name} wins.` : 'Left to fate — the numbers decide.');
      return true;
    }
    case 'promo-card-select': {
      const matchId = target.dataset.match;
      const wrestlerId = target.dataset.wrestler;
      const partnerId = micSelection()?.partnerId;
      if (value === 'custom') {
        view.customPromoMatchId = matchId;
        view.customStorylineTitle = '';
        view.customStorylineDescription = '';
        return true;
      }
      const result = booking.setMatchPromoCard(matchId, value, wrestlerId, partnerId);
      if (!result.ok) { toast(result.message); return true; }
      view.monthlySpotlightId = wrestlerId;
      view.monthlyPromoPick = { matchId, ownerId: wrestlerId, partnerId };
      toast(`${result.card.template.name} selected for ${getWrestlerById(wrestlerId)?.name ?? 'the wrestler'}.`);
      return true;
    }
    case 'promo-card-skip': {
      const matchId = target.dataset.match;
      const wrestlerId = target.dataset.wrestler;
      const result = booking.runMonthlyPromoCardPhase(matchId, wrestlerId, { skip: true });
      if (!result.ok) { toast(result.message); return true; }
      view.monthlySpotlightId = wrestlerId;
      view.monthlyPromoPick = { matchId, ownerId: wrestlerId, partnerId: micSelection()?.partnerId, skip: true };
      view.monthlyPhaseResult = result.result;
      toast('Promo phase skipped. No cards were used.');
      return true;
    }
    case 'promo-card-clear': {
      const result = booking.setMatchPromoCard(value, '', null);
      if (!result.ok) toast(result.message);
      view.monthlyPromoPick = null;
      return true;
    }
    case 'promo-card-custom-submit': {
      const title = (view.customStorylineTitle ?? '').trim();
      if (!title) return true;
      const matchId = value;
      const wrestlerId = view.monthlySpotlightId;
      const partnerId = micSelection()?.partnerId;
      if (!booking.setCustomPromoCard(matchId, title, (view.customStorylineDescription ?? '').trim(), wrestlerId, partnerId)) {
        toast('Select a wrestler in this match before writing the Promo.');
        return true;
      }
      view.monthlyPromoPick = { matchId, ownerId: wrestlerId, partnerId, custom: true };
      view.customPromoMatchId = null;
      view.customStorylineTitle = '';
      view.customStorylineDescription = '';
      toast(`Unique Promo created for ${getWrestlerById(wrestlerId)?.name ?? 'the wrestler'}.`);
      return true;
    }
    case 'promo-card-custom-cancel':
      view.customPromoMatchId = null;
      return true;
    case 'incident-choice': {
      const incident = booking.getPendingIncident();
      const choice = incident?.choices.find(entry => entry.id === value);
      const peopleBefore = (incident?.participants ?? []).map(incidentMetricSnapshot).filter(Boolean);
      const cashBefore = booking.getState().bankroll;
      const result = booking.resolveIncident(value);
      if (!result.ok) { toast(result.message); return true; }
      view.incidentResult = {
        incident: result.incident,
        choiceLabel: choice?.label ?? 'Decision recorded',
        message: result.message,
        people: peopleBefore.map(before => ({ before, after: incidentMetricSnapshot(before.id) })),
        cashBefore,
        cashAfter: booking.getState().bankroll,
      };
      view.name = 'incident-result';
      return true;
    }
    case 'incident-result-continue':
      view.incidentResult = null;
      view.name = 'results';
      return true;
    case 'leadup-pick':
      view.leadUpActivity = value;
      view.leadUpWrestler = null;
      view.lockerRoomAllocation = {};
      view.promoWrestler = null;
      view.promoPartner = null;
      view.houseShow = value === 'house-show' ? createHouseShowDraft() : null;
      view.housePick = null;
      view.houseCandidate = null;
      return true;
    case 'monthly-next': {
      if (view.customPromoMatchId) { toast('Save or cancel your Promo text first.'); return true; }
      if (view.monthlyGuide !== 'storyline') {
        if (!view.monthlyPhaseResult) {
          if (view.monthlyTrainingIds.length !== 1) { toast('Select one wrestler for Training first.'); return true; }
          const result = booking.runMonthlyTrainingPhase(view.monthlyTrainingIds);
          if (!result.ok) { toast(result.message); return true; }
          view.monthlyPhaseResult = result.results;
          return true;
        }
        view.monthlyPhaseResult = null;
        view.monthlyGuide = 'storyline';
        return true;
      }
      if (!view.monthlyPhaseResult) {
        const pick = view.monthlyPromoPick;
        const selection = micSelection();
        const matchId = pick?.matchId ?? selection?.match.id;
        const spotlightId = pick?.ownerId ?? view.monthlySpotlightId;
        if (!spotlightId) { toast('Choose a wrestler to highlight.'); return true; }
        const result = booking.runMonthlyPromoCardPhase(matchId, spotlightId, { skip: Boolean(pick?.skip) });
        if (!result.ok) { toast(result.message); return true; }
        view.monthlyPhaseResult = result.result;
        return true;
      }
      const result = booking.completeMonthlyPlan();
      toast(result.message);
      if (result.ok) {
        view.monthlyTrainingIds = [];
        view.monthlySpotlightId = null;
        view.monthlyGuide = 'training';
        view.monthlyPhaseResult = null;
        view.storylinePartnerId = null;
        view.monthlyPromoPick = null;
        view.pendingSwitch = null;
      }
      return true;
    }
    case 'monthly-trainer': {
      view.monthlyTrainingIds = view.monthlyTrainingIds.includes(value) ? [] : [value];
      return true;
    }
    case 'monthly-training-auto': {
      const bookedIds = new Set(booking.getShow().matches.flatMap(matchParticipantIds));
      const stats = ['strength', 'agility', 'stamina', 'technique', 'charisma', 'toughness'];
      view.monthlyTrainingIds = booking.getSignedRoster()
        .filter(wrestler => stats.filter(stat => wrestler.stats[stat] < 99).length >= 3)
        .map(wrestler => ({
          id: wrestler.id,
          score: stats.reduce((sum, stat) => sum + (wrestler.stats[stat] ?? 50), 0) / stats.length - (bookedIds.has(wrestler.id) ? 3 : 0),
        }))
        .sort((a, b) => a.score - b.score || a.id.localeCompare(b.id))
        .slice(0, 1)
        .map(entry => entry.id);
      return true;
    }
    case 'monthly-spotlight': {
      view.customPromoMatchId = null;
      const existingPick = view.monthlyPromoPick;
      if (existingPick && (existingPick.ownerId !== value || existingPick.matchId !== target.dataset.match)) {
        const oldMatch = booking.getMatch(existingPick.matchId);
        if (oldMatch?.promoCardId && !oldMatch.promoCardPlayed) booking.setMatchPromoCard(oldMatch.id, '', null);
        view.monthlyPromoPick = null;
      }
      view.pendingSwitch = null;
      selectSpotlight(value, target.dataset.match);
      return true;
    }
    case 'monthly-partner':
      view.storylinePartnerId = value;
      view.pendingSwitch = null;
      if (view.monthlyPromoPick) {
        const selected = booking.getMatchPromoCard(view.monthlyPromoPick.matchId);
        const eligible = booking.getPromoCardsForMatch(view.monthlyPromoPick.matchId, view.monthlySpotlightId, value)
          .some(card => card.id === selected?.id);
        if (!eligible && selected && !selected.played) {
          booking.setMatchPromoCard(view.monthlyPromoPick.matchId, '', null);
          view.monthlyPromoPick = null;
        }
      }
      return true;
    case 'founding-open':
      booking.openFoundingPack();
      view.packFlipped = [];
      return true;
    case 'founding-reveal': {
      const index = Number(value);
      const result = booking.revealFoundingCard(index);
      if (!result.ok) return true;
      const ceremony = booking.getFoundingCeremony();
      view.packFlipped = [index];
      // The last card has to swap the bar over to the confirm button.
      if (ceremony.revealed.length >= ceremony.cards.length) return true;
      return flipCardInPlace(target, {
        revealed: ceremony.revealed.length,
        total: ceremony.cards.length,
        redrawIndex: ceremony.redrawsLeft > 0 ? index : null,
      }) ? 'in-place' : true;
    }
    case 'founding-reveal-all': {
      const before = booking.getFoundingCeremony().revealed;
      booking.revealAllFoundingCards();
      view.packFlipped = booking.getFoundingCeremony().revealed.filter(i => !before.includes(i));
      return true;
    }
    case 'founding-redraw': {
      const index = Number(value);
      const result = booking.redrawFoundingSlot(index);
      if (result.ok) view.packFlipped = [index];
      toast(result.ok
        ? `${result.passed?.name ?? 'That name'} signed elsewhere. ${result.drawn.name} came out instead.`
        : result.message);
      return true;
    }
    case 'founding-confirm': {
      const result = booking.confirmFoundingRoster();
      if (!result.ok) { toast(result.message); return true; }
      view.packFlipped = [];
      return true;
    }
    case 'starter-reveal': {
      const index = Number(value);
      const result = booking.revealStarterCard(index);
      if (!result.ok) return true;
      const starter = booking.getFoundingStarter();
      view.packFlipped = [index];
      if (starter.revealed.length >= starter.cards.length) return true;
      return flipCardInPlace(target, { revealed: starter.revealed.length, total: starter.cards.length }) ? 'in-place' : true;
    }
    case 'starter-reveal-all': {
      const before = booking.getFoundingStarter().revealed;
      booking.revealAllStarterCards();
      view.packFlipped = booking.getFoundingStarter().revealed.filter(i => !before.includes(i));
      return true;
    }
    case 'starter-done': {
      booking.dismissFoundingStarter();
      view.packFlipped = [];
      view.name = 'calendar';
      onReturnToCalendarWall();
      toast('The roster is locked in. Plan the month.');
      return 'in-place';
    }
    case 'chip-add': {
      const result = booking.placeChip(value, 1);
      if (!result.ok) toast(result.message);
      return true;
    }
    case 'chip-remove': {
      const result = booking.placeChip(value, -1);
      if (!result.ok) toast(result.message);
      return true;
    }
    case 'chip-clear':
      booking.clearChips();
      return true;
    case 'annual-pull': {
      const result = booking.runAnnualPull();
      if (!result.ok) { toast(result.message); return true; }
      view.annualOpened = false;
      view.packFlipped = [];
      return true;
    }
    case 'annual-open':
      view.annualOpened = true;
      view.packFlipped = [];
      return true;
    case 'annual-reveal': {
      const index = Number(value);
      const result = booking.revealAnnualCard(index);
      if (!result.ok) return true;
      const reveal = booking.getAnnualReveal();
      view.packFlipped = [index];
      if (reveal.revealed.length >= reveal.cards.length) return true;
      return flipCardInPlace(target, { revealed: reveal.revealed.length, total: reveal.cards.length }) ? 'in-place' : true;
    }
    case 'annual-reveal-all': {
      const before = booking.getAnnualReveal().revealed;
      booking.revealAllAnnualCards();
      view.packFlipped = booking.getAnnualReveal().revealed.filter(i => !before.includes(i));
      return true;
    }
    case 'annual-reveal-done':
      booking.dismissAnnualReveal();
      view.packFlipped = [];
      view.annualOpened = false;
      view.name = 'card';
      return true;
    case 'intake-pass': {
      const result = booking.passOnDrawnWrestler();
      toast(result.ok ? `You passed on ${result.wrestler.name}. They will remember that.` : result.message);
      return true;
    }
    case 'intake-accept': {
      const result = booking.acceptDrawnWrestler(value);
      toast(result.ok
        ? `${result.retired.name} is retired. ${result.signed.name} takes the spot.`
        : result.message);
      return true;
    }
    case 'buy-pack': {
      const result = booking.buyPack(value);
      if (!result.ok) { toast(result.message); return true; }
      view.packResult = result.cards;
      const signedNote = result.signed
        ? ` ${result.signed.name} signed.`
        : result.queued ? ` ${result.queued.name} is waiting on a roster decision.` : '';
      toast(`${result.pack.name}: ${result.cards.map(card => card.name).join(', ')}.${signedNote}`);
      onOpenVending();
      return true;
    }
    case 'locker-point': {
      const allocation = { ...(view.lockerRoomAllocation ?? {}) };
      const total = Object.values(allocation).reduce((sum, points) => sum + points, 0);
      const direction = Number(target.dataset.dir);
      const next = Math.max(0, Math.min(3, (allocation[value] ?? 0) + direction));
      if (direction > 0 && total >= 3) return true;
      if (next) allocation[value] = next;
      else delete allocation[value];
      view.lockerRoomAllocation = allocation;
      return true;
    }
    case 'locker-clear':
      view.lockerRoomAllocation = {};
      return true;
    case 'locker-spread': {
      const result = booking.spendLeadUpActivity('locker-room', { spreadAll: true });
      toast(result.message);
      if (result.ok) { view.leadUpActivity = null; view.lockerRoomAllocation = {}; }
      return true;
    }
    case 'locker-confirm': {
      const result = booking.spendLeadUpActivity('locker-room', { allocations: view.lockerRoomAllocation });
      toast(result.message);
      if (result.ok) { view.leadUpActivity = null; view.lockerRoomAllocation = {}; }
      return true;
    }
    case 'leadup-skip': {
      const result = booking.skipLeadUpWeek();
      toast(result.message);
      return true;
    }
    case 'leadup-jump': {
      const show = booking.getShow();
      const accepted = window.confirm(`Skip every remaining calendar opportunity and go straight to the PPV? You will miss all remaining preparation bonuses, training, the Story Promo, and this month's random event.`);
      if (!accepted) return true;
      const result = booking.jumpToPPV();
      toast(result.message);
      if (result.ok) {
        view.name = 'card';
        view.leadUpActivity = null;
        view.housePick = null;
        onOpenBookingBoard();
      }
      return true;
    }
    case 'leadup-target-wrestler': {
      const activity = getActivity(view.leadUpActivity);
      if (activity?.target === 'wrestler-stat') {
        view.leadUpWrestler = value;
        return true;
      }
      const result = booking.spendLeadUpActivity(view.leadUpActivity, { wrestlerId: value });
      toast(result.message);
      if (result.ok) { view.leadUpActivity = null; view.leadUpWrestler = null; }
      return true;
    }
    case 'leadup-target-stat': {
      const result = booking.spendLeadUpActivity(view.leadUpActivity, { wrestlerId: view.leadUpWrestler, stat: value });
      toast(result.message);
      if (result.ok) { view.leadUpActivity = null; view.leadUpWrestler = null; }
      return true;
    }
    case 'leadup-target-match': {
      const result = booking.spendLeadUpActivity(view.leadUpActivity, { matchId: value });
      toast(result.message);
      if (result.ok) view.leadUpActivity = null;
      return true;
    }
    case 'promo-wrestler':
      view.promoWrestler = view.promoWrestler === value ? null : value;
      view.promoPartner = null;
      return true;
    case 'promo-partner':
      view.promoPartner = view.promoPartner === value ? null : value;
      return true;
    case 'promo-cut': {
      const result = booking.spendLeadUpActivity('promo', { promoWrestlerId: view.promoWrestler, promoPartnerId: view.promoPartner });
      toast(result.message);
      if (result.ok) { view.leadUpActivity = null; view.promoWrestler = null; view.promoPartner = null; }
      return true;
    }
    case 'house-type': {
      const matchIndex = Number(target.dataset.match);
      if (!view.houseShow?.matches?.[matchIndex]) return true;
      view.houseShow.matches[matchIndex] = emptyHouseShowMatch(value);
      view.housePick = null;
      view.houseCandidate = null;
      return true;
    }
    case 'house-slot':
      view.housePick = { match: Number(target.dataset.match), team: Number(target.dataset.team), index: Number(target.dataset.index) };
      view.houseCandidate = view.houseShow?.matches?.[view.housePick.match]?.teams?.[view.housePick.team]?.[view.housePick.index] ?? null;
      return true;
    case 'house-pick-cancel':
      view.housePick = null;
      view.houseCandidate = null;
      return true;
    case 'house-highlight':
      view.houseCandidate = value;
      return true;
    case 'house-confirm': {
      const pick = view.housePick;
      if (!pick || !view.houseShow?.matches?.[pick.match]) return true;
      if (!view.houseCandidate) return true;
      view.houseShow.matches[pick.match].teams[pick.team][pick.index] = view.houseCandidate;
      view.housePick = null;
      view.houseCandidate = null;
      return true;
    }
    case 'house-clear':
      view.houseShow = createHouseShowDraft();
      view.housePick = null;
      view.houseCandidate = null;
      return true;
    case 'house-run': {
      const result = booking.spendLeadUpActivity('house-show', { houseCard: view.houseShow });
      toast(result.message);
      if (result.ok) { view.houseResult = result.houseShow; view.leadUpActivity = null; view.houseShow = null; view.housePick = null; view.houseCandidate = null; }
      return true;
    }
    case 'house-result-done': {
      view.houseResult = null;
      view.leadUpActivity = null;
      return true;
    }
    case 'leadup-run': {
      const result = booking.spendLeadUpActivity(value, {});
      toast(result.message);
      if (result.ok) view.leadUpActivity = null;
      return true;
    }
    case 'book-title': {
      const target = booking.getShow().matches.find(m => !m.titleId);
      if (!target) {
        toast('Every match already has a title on it.');
        return true;
      }
      view.matchId = target.id;
      view.name = 'match';
      if (booking.setMatchTitle(target.id, value)) {
        toast(`${getChampionship(value).name} added to the card — book the champion.`);
      } else if (getChampionship(value)?.kind === 'tag') {
        toast('Set this match to Tag Team first, then put the title on the line.');
      }
      return true;
    }
    case 'pick-slot':
      view.slot = {
        matchId: target.dataset.match,
        team: Number(target.dataset.team),
        index: Number(target.dataset.index),
      };
      view.matchId = target.dataset.match;
      view.rosterCandidate = null;
      view.name = 'roster';
      return true;
    case 'clear-slot':
      booking.clearSlot(target.dataset.match, Number(target.dataset.team), Number(target.dataset.index));
      return true;
    case 'roster-highlight':
      view.rosterCandidate = value;
      return true;
    case 'roster-cancel':
      view.name = 'match';
      view.rosterCandidate = null;
      return true;
    case 'roster-confirm': {
      if (!view.slot || !view.rosterCandidate) return true;
      const { matchId, team, index } = view.slot;
      const currentId = booking.getMatch(matchId)?.teams[team]?.[index];
      const wrestler = getWrestlerById(view.rosterCandidate);
      if (view.rosterCandidate !== currentId && booking.isBooked(view.rosterCandidate)
        && !confirm(`${wrestler?.name ?? 'This wrestler'} is already booked on this PPV. Adding them here will remove them from their previously booked match. Continue?`)) return true;
      booking.assignWrestler(matchId, team, index, view.rosterCandidate);
      view.name = 'match';
      view.rosterCandidate = null;
      return true;
    }
    case 'assign': {
      const { matchId, team, index } = view.slot;
      booking.assignWrestler(matchId, team, index, value);
      view.name = 'match';
      view.rosterCandidate = null;
      return true;
    }
    case 'auto-book': {
      const auto = autoBook();
      open.clear();
      view.name = 'card';
      toast(auto.ok ? `Auto-booked: ${auto.mainEvent} in ${auto.venue.city}` : auto.reason);
      return true;
    }
    case 'result-match':
      view.resultMatch = Number(value);
      view.name = 'result-match';
      return true;
    case 'run': {
      const outcome = booking.runShow();
      if (!outcome.ok) {
        toast('The card is not ready to run.');
        return true;
      }
      view.name = 'results';
      view.resultIndex = 0;
      open.clear();
      onShowRun(outcome.result);
      return true;
    }
    default:
      return false;
  }
}

export function handleBookingInput(event) {
  if (event.target.dataset?.teamName !== undefined) {
    view.teamName = event.target.value;
    return false;
  }
  if (event.target.dataset?.bkInput === 'custom-storyline-title' || event.target.dataset?.bkInput === 'custom-storyline-description') {
    if (event.target.dataset.bkInput === 'custom-storyline-title') view.customStorylineTitle = event.target.value;
    else view.customStorylineDescription = event.target.value;
    const submit = event.target.closest('.bk-custom-storyline')?.querySelector('[data-bk="promo-card-custom-submit"]');
    if (submit) submit.disabled = !(view.customStorylineTitle ?? '').trim();
    return false;
  }
  if (event.target.dataset?.bk === 'show-name') {
    booking.setShowField('name', event.target.value);
    return false; // live typing should not re-render and steal focus
  }
  const categoryId = event.target.dataset?.financePrice;
  if (categoryId) {
    const saved = booking.setFinancePrice(categoryId, Number(event.target.value));
    if (saved) {
      const output = event.target.closest('.finance-price')?.querySelector('output');
      const price = booking.getFinances().prices[categoryId];
      if (output) output.textContent = `$${price}`;
      event.target.setAttribute('aria-valuetext', `$${price}`);
      const forecast = event.target.closest('.finance-office')?.querySelector('[data-finance-forecast]');
      if (forecast) forecast.innerHTML = financeForecastHtml();
    }
    return false;
  }
  const eventId = event.target.dataset?.event;
  if (!eventId) return false;
  if (event.target.dataset.ppvName !== undefined) booking.updateEventBranding(eventId, { name: event.target.value });
  if (event.target.dataset.ppvLogo !== undefined) booking.updateEventBranding(eventId, { logoId: event.target.value });
  if (event.target.dataset.ppvColor !== undefined) booking.updateEventBranding(eventId, { color: event.target.value });
  return false;
}
