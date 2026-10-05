// Broadcast playback.
//
// Nothing here simulates anything. The show has already happened — this walks the
// finished result on a timeline and presents it as a 1996 television broadcast.

import { getCompanyIdentity, companyBrandedText, titleState } from './bookingState.js';
import { CHAMPIONSHIPS } from '../data/championships.js';
import { getWrestlerById } from '../data/wrestlers.js';
import { wrestlerImageUrl } from '../data/wrestlerImages.js';
import { logoUrl } from '../data/calendar.js';
import { createPpvPoster } from './ppvPoster.js';
import worldChampBeltUrl from '../../images/world-champ-belt.png?url';
import tagBeltUrl from '../../images/tag-belt.png?url';

const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;
const BELT_IMAGES = { world: worldChampBeltUrl, tag: tagBeltUrl };
const MATCH_ANIMATION_MS = 5000;
const MATCH_RESULT_HOLD_MS = 2200;
const ANNOUNCERS = { pbp: 'LANCE VOSS', colour: 'BIG DADDY REX' };

let session = null;

export function isBroadcastActive() {
  return Boolean(session);
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------
function matchResultText(match) {
  if (match.outcome === 'draw' || match.outcome === 'time-limit draw') return `${match.sideNames.join(' and ')} fought to a draw in ${match.time}.`;
  const verbs = {
    pinfall: 'pinned', submission: 'submitted', knockout: 'knocked out',
    escape: 'escaped ahead of', retrieval: 'out-climbed', casket: 'closed the casket on', elimination: 'last eliminated',
  };
  const method = match.outcome === 'count-out' ? ' by count-out' : match.outcome === 'disqualification' ? ' by disqualification' : '';
  return `${match.winnerNames} ${verbs[match.outcome] ?? 'defeated'} ${match.loserNames}${method} in ${match.time}.`;
}

function matchMeterState(match, progress) {
  const fraction = Math.max(0, Math.min(1, progress));
  const finalHype = Math.max(0, Math.min(100, match.buzz ?? match.rating ?? 0));
  const heats = [Math.min(20, finalHype), ...(match.beats ?? []).filter(beat => !beat.isFinish).flatMap(beat => {
    const heat = Math.max(0, Math.min(100, beat.heat ?? finalHype));
    return [heat, heat * .65];
  }), finalHype];
  const position = fraction * (heats.length - 1);
  const index = Math.min(heats.length - 2, Math.floor(position));
  const hype = heats[index] + (heats[index + 1] - heats[index]) * (position - index);
  const draw = !match.winnerIds?.length || match.outcome === 'draw' || match.outcome === 'time-limit draw';
  const winnerOnLeft = match.sideIds?.[0]?.some(id => (match.winnerIds ?? []).includes(id));
  const finish = draw ? 50 : winnerOnLeft ? 5 : 95;
  const swings = [50, 18, 79, 28, 86, 35, 68, finish];
  const swingPosition = fraction * (swings.length - 1);
  const swingIndex = Math.min(swings.length - 2, Math.floor(swingPosition));
  const blend = (swingPosition - swingIndex) ** 2 * (3 - 2 * (swingPosition - swingIndex));
  return { hype: Math.max(0, Math.min(100, hype)), advantage: swings[swingIndex] + (swings[swingIndex + 1] - swings[swingIndex]) * blend };
}

function buildTimeline(result) {
  const mainEvent = result.matches.at(-1);
  const branding = result.eventBranding ?? {};
  const steps = [
    { kind: 'poster', ms: 6000, heat: 20 },
    {
      kind: 'cold-open',
      ms: 3000,
      heat: 30,
      eyebrow: `${getCompanyIdentity().name.toUpperCase()} PRESENTS`,
      headline: result.showName,
      sub: `${result.venueName} / ${result.city} / ${result.date}`,
      portraitIds: mainEvent?.participantIds ?? [],
      logo: branding.logoId ? logoUrl(branding.logoId, branding.name || result.showName, branding.color, branding.logoStyle) : '',
    },
    {
      kind: 'crowd',
      ms: 2200,
      heat: 55,
      eyebrow: 'LIVE',
      headline: `${result.attendance.toLocaleString()} IN THE BUILDING`,
      sub: `${result.fillPercent}% capacity`,
    },
  ];

  result.matches.forEach((match, index) => {
    const isMain = index === result.matches.length - 1;
    steps.push({
      kind: 'match',
      ms: MATCH_ANIMATION_MS + MATCH_RESULT_HOLD_MS,
      heat: 40,
      match,
      portraitIds: match.participantIds,
    });

    if (match.titleOutcome && ['change', 'crowned'].includes(match.titleOutcome.type)) {
      steps.push({
        kind: 'title',
        ms: 3400,
        heat: 100,
        eyebrow: match.titleOutcome.type === 'crowned' ? 'A CHAMPION IS CROWNED' : 'NEW CHAMPION',
        headline: match.titleOutcome.newHolderNames,
        sub: companyBrandedText(match.titleOutcome.titleName),
        portraitIds: match.winnerIds,
        belt: BELT_IMAGES[match.titleId] ?? '',
        titleOutcome: match.titleOutcome,
      });
    }

    if (match.injury) {
      steps.push({
        kind: 'injury',
        ms: 2600,
        heat: 30,
        eyebrow: 'MEDICAL',
        headline: match.injury.name,
        sub: `Helped to the back / out ${match.injury.weeks} week${match.injury.weeks > 1 ? 's' : ''}`,
        portraitIds: [match.injury.id],
      });
    }

    if (isMain) {
      steps.push({
        kind: 'sign-off',
        ms: 3600,
        heat: Math.max(45, result.rating),
        eyebrow: 'THAT IS OUR SHOW',
        headline: `${result.grade} · ${result.rating}`,
        sub: `${result.ratingLabel} / ${result.tvRating} TV RATING`,
      });
    }
  });

  // The saved title state is post-show; rewind it, then replay changes as they air.
  const holders = Object.fromEntries(CHAMPIONSHIPS.map(def => [def.id, titleState(def.id)?.holders ?? []]));
  [...result.matches].reverse().forEach(match => {
    if (match.titleOutcome) holders[match.titleOutcome.titleId] = match.titleOutcome.previousHolders ?? [];
  });
  steps.forEach(step => {
    if (step.kind === 'title' && step.titleOutcome) holders[step.titleOutcome.titleId] = step.titleOutcome.newHolders ?? [];
    step.holders = { ...holders };
  });

  return steps;
}

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------
function createOverlay(result) {
  const root = document.createElement('div');
  const venueTier = result.capacity >= 30000 ? 'stadium' : result.capacity >= 10000 ? 'arena' : result.capacity >= 3000 ? 'hall' : 'intimate';
  const stageTier = result.stageId === 'flagship' ? 'flagship' : result.stageId === 'broadcast' ? 'broadcast' : result.stageId === 'bare' ? 'bare' : 'house';
  root.className = `bc venue-${venueTier} production-${stageTier}${REDUCED_MOTION ? ' reduced' : ''}`;
  const ppvAccent = result.eventBranding?.color;
  root.style.setProperty('--bc-accent', /^#[\da-f]{6}$/i.test(ppvAccent ?? '') ? ppvAccent : '#d3a84e');
  root.innerHTML = `
    <div class="bc-scene"></div>
    <div class="bc-light-rig" aria-hidden="true">${Array.from({ length: 6 }, (_, index) => `<i style="--beam:${index}"></i>`).join('')}</div>
    <div class="bc-crowd" aria-hidden="true">${Array.from({ length: 54 }, (_, index) => `<i style="--fan:${index}"></i>`).join('')}</div>
    <div class="bc-wrestlers" aria-hidden="true"></div>
    <img class="bc-ppv-poster" alt="${result.showName.replace(/[&<>"']/g, '')} match card">
    <img class="bc-event-logo" alt="">
    <img class="bc-title-belt" alt="Championship belt">
    <div class="bc-grain" aria-hidden="true"></div>
    <div class="bc-scanlines" aria-hidden="true"></div>
    <div class="bc-tracking" aria-hidden="true"></div>
    <header class="bc-bug">
      <span class="bc-rec">REC</span>
      <span class="bc-net">${getCompanyIdentity().acronym} NETWORK</span>
      <span class="bc-time">0:00</span>
    </header>
    <div class="bc-stage">
      <small class="bc-eyebrow"></small>
      <b class="bc-headline"></b>
      <span class="bc-sub"></span>
    </div>
    <section class="bc-match" aria-label="Match presentation">
      <header class="bc-match-heading"><small class="bc-match-slot"></small><b class="bc-match-names"></b><span class="bc-match-meta"></span></header>
      <div class="bc-match-meter">
        <div class="bc-match-meter-heading"><span>AUDIENCE HYPE</span><output class="bc-match-hype-value"></output></div>
        <div class="bc-match-hype-track" role="progressbar" aria-label="Audience hype" aria-valuemin="0" aria-valuemax="100"><i></i></div>
      </div>
      <div class="bc-match-meter">
        <div class="bc-match-meter-heading"><span>MATCH ADVANTAGE</span><output class="bc-match-leader"></output></div>
        <div class="bc-match-advantage-track" role="meter" aria-label="Match advantage" aria-valuemin="0" aria-valuemax="100"><i class="bc-match-advantage-center"></i><i class="bc-match-advantage-marker"></i></div>
        <div class="bc-match-sides"><span class="bc-match-side-left"></span><span class="bc-match-side-right"></span></div>
      </div>
      <div class="bc-match-result" aria-live="polite">
        <div><p class="bc-match-decision"></p><small class="bc-match-finish"></small></div>
        <div class="bc-match-score"><small>MATCH SCORE</small><b></b><span></span><em></em></div>
      </div>
    </section>
    <div class="bc-lower">
      <div class="bc-lower-card">
        <span class="bc-lower-slot"></span>
        <b class="bc-lower-title"></b>
        <small class="bc-lower-meta"></small>
      </div>
    </div>
    <div class="bc-commentary">
      <b class="bc-voice"></b>
      <p class="bc-line"></p>
    </div>
    <div class="bc-heat"><i></i></div>
    <footer class="bc-controls">
      <span><kbd>SPACE</kbd> NEXT</span>
      <span><kbd>F</kbd> FAST</span>
      <span><kbd>ESC</kbd> SKIP TO RESULTS</span>
    </footer>`;
  document.body.appendChild(root);
  return root;
}

function setStage(root, { eyebrow = '', headline = '', sub = '' }, tone = '') {
  const stage = root.querySelector('.bc-stage');
  stage.className = `bc-stage visible ${tone}`;
  stage.querySelector('.bc-eyebrow').textContent = eyebrow;
  stage.querySelector('.bc-headline').textContent = headline;
  stage.querySelector('.bc-sub').textContent = sub;
  // Restart the entry animation on every stage change.
  stage.style.animation = 'none';
  void stage.offsetWidth;
  stage.style.animation = '';
}

function hideStage(root) {
  root.querySelector('.bc-stage').classList.remove('visible');
}

// Belts follow the show as it happens: a wrestler only wears gold they held at that
// point in the broadcast, not the titles they walk out of tonight with.
function setWrestlers(root, ids = [], holders = {}, winnerIds = []) {
  const frame = root.querySelector('.bc-wrestlers');
  const winners = new Set(winnerIds);
  const participants = [...new Set(ids.filter(Boolean))];
  const visibleIds = participants.slice(0, 4);
  const uniqueIds = winnerIds.some(id => !visibleIds.includes(id))
    ? [...participants.filter(id => winners.has(id)), ...participants.filter(id => !winners.has(id))].slice(0, 4)
    : visibleIds;
  frame.innerHTML = uniqueIds.map((id, index) => {
    const wrestler = getWrestlerById(id);
    const image = wrestlerImageUrl(wrestler);
    if (!image) return '';
    const belts = CHAMPIONSHIPS.filter(def => holders[def.id]?.includes(id)).map(def => BELT_IMAGES[def.id]).filter(Boolean);
    const beltHtml = belts.map(url => `<img class="bc-wrestler-belt" src="${url}" alt="">`).join('');
    return `<span class="bc-wrestler${winners.has(id) ? ' bc-wrestler-winner' : ''}" style="--bc-index:${index}"><img class="bc-wrestler-photo" src="${image}" alt="">${beltHtml}${winners.has(id) ? '<b class="bc-winner-badge">WINNER</b>' : ''}</span>`;
  }).join('');
  frame.classList.toggle('visible', Boolean(frame.children.length));
  frame.dataset.count = String(frame.children.length);
}

function setEventLogo(root, url = '') {
  const logo = root.querySelector('.bc-event-logo');
  logo.src = url;
  logo.classList.toggle('visible', Boolean(url));
}

function setTitleBelt(root, url = '') {
  const belt = root.querySelector('.bc-title-belt');
  belt.src = url;
  belt.classList.toggle('visible', Boolean(url));
}

function setLower(root, lower) {
  const card = root.querySelector('.bc-lower-card');
  if (!lower) {
    card.classList.remove('visible');
    return;
  }
  card.querySelector('.bc-lower-slot').textContent = lower.slot;
  card.querySelector('.bc-lower-title').textContent = lower.title;
  card.querySelector('.bc-lower-meta').textContent = lower.meta;
  card.classList.remove('visible');
  void card.offsetWidth;
  card.classList.add('visible');
}

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------
export function playBroadcast(result, { onComplete = () => {} } = {}) {
  if (session) return;

  const root = createOverlay(result);
  const poster = createPpvPoster(result, result.eventBranding, getCompanyIdentity().name);
  const posterImage = root.querySelector('.bc-ppv-poster');
  posterImage.src = poster.canvas.toDataURL('image/png');
  const steps = buildTimeline(result);
  const heatFill = root.querySelector('.bc-heat i');
  const timeEl = root.querySelector('.bc-time');
  const lineEl = root.querySelector('.bc-line');
  const voiceEl = root.querySelector('.bc-voice');

  session = {
    root,
    index: -1,
    speed: 1,
    heat: 0,
    target: 0,
    startedAt: performance.now(),
    stepTimer: null,
    match: null,
    raf: null,
  };

  function clearTimers() {
    clearTimeout(session.stepTimer);
  }

  function finish() {
    if (!session) return;
    clearTimers();
    cancelAnimationFrame(session.raf);
    removeEventListener('keydown', onKey, true);
    poster.dispose();
    root.classList.add('closing');
    const node = root;
    setTimeout(() => node.remove(), 260);
    session = null;
    onComplete(result);
  }

  function renderMatch() {
    const current = session.match;
    if (!current) return;
    const progress = REDUCED_MOTION ? 1 : Math.min(1, current.elapsed / MATCH_ANIMATION_MS);
    const meters = matchMeterState(current.result, progress);
    const hype = root.querySelector('.bc-match-hype-track');
    hype.querySelector('i').style.width = `${meters.hype}%`;
    hype.setAttribute('aria-valuenow', String(Math.round(meters.hype)));
    root.querySelector('.bc-match-hype-value').textContent = `${Math.round(meters.hype)}/100`;
    const advantage = root.querySelector('.bc-match-advantage-track');
    advantage.querySelector('.bc-match-advantage-marker').style.left = `${meters.advantage}%`;
    advantage.setAttribute('aria-valuenow', String(Math.round(meters.advantage)));
    const leader = progress >= 1 ? current.result.winnerNames || 'EVEN' : meters.advantage < 45 ? current.left : meters.advantage > 55 ? current.right : 'EVEN';
    advantage.setAttribute('aria-valuetext', leader === 'EVEN' ? 'Evenly matched' : `${leader} has the advantage`);
    root.querySelector('.bc-match-leader').textContent = leader;
    session.heat = meters.hype;
    const callIndex = Math.min(current.calls.length - 1, Math.floor(progress * current.calls.length));
    if (callIndex !== current.callIndex) {
      current.callIndex = callIndex;
      const call = current.calls[callIndex];
      lineEl.textContent = call?.text ?? '';
      voiceEl.textContent = ANNOUNCERS[call?.voice] ?? '';
    }
    if ((current.elapsed >= MATCH_ANIMATION_MS || REDUCED_MOTION) && !current.revealed) {
      current.revealed = true;
      root.querySelector('.bc-match-decision').textContent = matchResultText(current.result);
      root.querySelector('.bc-match-finish').textContent = current.result.finish ?? '';
      const score = root.querySelector('.bc-match-score');
      score.querySelector('b').textContent = `${current.result.rating}/100`;
      score.querySelector('span').textContent = current.result.stars || 'DUD';
      score.querySelector('em').textContent = current.result.grade;
      setWrestlers(root, current.result.participantIds, steps[session.index].holders, current.result.winnerIds ?? []);
      root.classList.toggle('match-has-winner', Boolean(current.result.winnerIds?.length));
      root.classList.add('match-decided');
    }
  }

  function startMatch(match) {
    const left = match.sideNames[0];
    const right = match.sideNames.slice(1).join(' / ');
    const beats = (match.beats ?? []).filter(beat => !beat.isFinish && beat.text);
    const calls = beats.length > 2 ? [beats[0], beats.at(-1)] : beats;
    session.match = { result: match, left, right, calls, callIndex: null, elapsed: 0, lastTick: performance.now(), revealed: false };
    root.classList.remove('match-decided');
    root.classList.remove('match-has-winner');
    root.querySelector('.bc-match-slot').textContent = match.label;
    root.querySelector('.bc-match-names').textContent = match.sideNames.join(' vs. ');
    root.querySelector('.bc-match-meta').textContent = [match.typeName, match.stakeId !== 'none' ? companyBrandedText(match.stakeName) : ''].filter(Boolean).join(' / ');
    root.querySelector('.bc-match-side-left').textContent = left;
    root.querySelector('.bc-match-side-right').textContent = right;
    root.querySelector('.bc-match-decision').textContent = '';
    root.querySelector('.bc-match-finish').textContent = '';
    hideStage(root);
    setLower(root, null);
    renderMatch();
  }

  function advance() {
    clearTimers();
    session.match = null;
    lineEl.textContent = '';
    voiceEl.textContent = '';
    session.index += 1;
    const step = steps[session.index];
    if (!step) {
      finish();
      return;
    }

    session.target = step.heat ?? 40;
    setWrestlers(root, step.portraitIds, step.holders);
    setEventLogo(root, step.logo);
    setTitleBelt(root, step.belt);
    root.dataset.step = step.kind;
    root.classList.toggle('flash', Boolean(step.flash));
    if (step.flash) setTimeout(() => root.classList.remove('flash'), 420);

    if (step.kind === 'poster') {
      hideStage(root);
      setLower(root, null);
      poster.ready.then(() => {
        if (!session || session.root !== root || session.index !== 0) return;
        posterImage.src = poster.canvas.toDataURL('image/png');
        session.stepTimer = setTimeout(advance, step.ms / session.speed);
      });
      return;
    } else if (step.kind === 'match') {
      startMatch(step.match);
      return;
    } else {
      setStage(root, step, step.kind);
      setLower(root, step.lower ?? null);
    }

    session.stepTimer = setTimeout(advance, step.ms / session.speed);
  }

  function tick() {
    if (!session) return;
    if (session.match) {
      const now = performance.now();
      session.match.elapsed += (now - session.match.lastTick) * session.speed;
      session.match.lastTick = now;
      renderMatch();
      const total = REDUCED_MOTION ? MATCH_RESULT_HOLD_MS : MATCH_ANIMATION_MS + MATCH_RESULT_HOLD_MS;
      if (session.match.elapsed >= total) advance();
      if (!session) return;
    }
    // Crowd noise surges to the beat's heat, then decays like a real room.
    if (!session.match) {
      session.heat += (session.target - session.heat) * 0.12;
      session.target = Math.max(18, session.target - 0.35);
    }
    heatFill.style.width = `${Math.max(0, Math.min(100, session.heat))}%`;
    root.style.setProperty('--crowd-heat', String(session.heat / 100));
    root.style.setProperty('--crowd-opacity', String(0.34 + session.heat / 265));
    root.classList.toggle('crowd-hot', session.heat >= 68);
    root.classList.toggle('crowd-roaring', session.heat >= 88);

    const elapsed = Math.floor((performance.now() - session.startedAt) / 1000);
    timeEl.textContent = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
    session.raf = requestAnimationFrame(tick);
  }

  function onKey(event) {
    if (!session) return;
    if (event.code === 'Escape') {
      finish();
    } else if (event.code === 'Space' || event.code === 'Enter') {
      next();
    } else if (event.code === 'KeyF') {
      session.speed = session.speed === 1 ? 3 : 1;
      root.classList.toggle('fast', session.speed !== 1);
    } else {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  function next() {
    if (!session || session.root !== root) return;
    if (session?.match && !session.match.revealed) {
      session.match.elapsed = MATCH_ANIMATION_MS;
      renderMatch();
      return;
    }
    advance();
  }

  addEventListener('keydown', onKey, true);
  root.addEventListener('click', next);
  tick();
  advance();
}
