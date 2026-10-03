// Broadcast playback.
//
// Nothing here simulates anything. The show has already happened — this walks the
// finished result on a timeline and presents it as a 1996 television broadcast.

import { getCompanyIdentity, titleState } from './bookingState.js';
import { CHAMPIONSHIPS } from '../data/championships.js';
import { getWrestlerById } from '../data/wrestlers.js';
import { wrestlerImageUrl } from '../data/wrestlerImages.js';
import { logoUrl } from '../data/calendar.js';
import worldChampBeltUrl from '../../images/world-champ-belt.png?url';
import tagBeltUrl from '../../images/tag-belt.png?url';

const ANNOUNCERS = {
  pbp: 'LANCE VOSS',
  colour: 'BIG DADDY REX',
};

const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;
const BELT_IMAGES = { world: worldChampBeltUrl, tag: tagBeltUrl };

let session = null;

export function isBroadcastActive() {
  return Boolean(session);
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------
function beatDuration(text, floor = 1500) {
  return Math.min(5200, Math.max(floor, 850 + text.length * 27));
}

function buildTimeline(result) {
  const mainEvent = result.matches.at(-1);
  const branding = result.eventBranding ?? {};
  const steps = [
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
      kind: 'card',
      ms: 2700,
      heat: 40,
      match,
      portraitIds: match.participantIds,
      lower: {
        slot: match.label + (match.titleId ? ' / CHAMPIONSHIP' : ''),
        title: match.sideNames.join('   vs.   '),
        meta: `${match.typeName}${match.stakeId !== 'none' ? ` / ${match.stakeName}` : ''}`,
      },
    });

    if (match.titleId) {
      const previousHolders = match.titleOutcome?.previousHolders ?? [];
      const holderNames = previousHolders.map(id => getWrestlerById(id)?.name ?? id).join(' & ');
      steps.push({
        kind: 'title-intro',
        ms: 3000,
        heat: 76,
        eyebrow: 'OFFICIAL CHAMPIONSHIP INTRODUCTIONS',
        headline: match.titleOutcome?.titleName ?? match.stakeName,
        sub: previousHolders.length ? `CHAMPION${previousHolders.length > 1 ? 'S' : ''}: ${holderNames}` : 'VACANT TITLE / A NEW CHAMPION WILL BE CROWNED',
        portraitIds: match.participantIds,
        belt: BELT_IMAGES[match.titleId] ?? '',
      });
    }

    match.sideNames.forEach((name, side) => {
      const entrance = match.entrances?.[side] ?? 'Standard Walk-Out';
      const big = /pyro|spectacle/i.test(entrance);
      steps.push({
        kind: 'entrance',
        ms: big ? 1900 : 1300,
        heat: big ? 72 : 48,
        flash: big,
        portraitIds: match.sideIds?.[side] ?? [match.participantIds[side]].filter(Boolean),
        lower: { slot: 'NOW ENTERING', title: name, meta: entrance },
      });
    });

    match.beats.forEach(beat => {
      steps.push({
        kind: 'beat',
        ms: beatDuration(beat.text, beat.isFinish ? 2600 : 1700),
        heat: beat.heat,
        voice: beat.voice,
        text: beat.text,
        emphasis: beat.isFinish,
        portraitIds: match.participantIds,
        lower: beat.isFinish
          ? { slot: 'DECISION', title: match.winnerNames ?? 'DRAW', meta: `${match.outcome.toUpperCase()} / ${match.time}` }
          : null,
      });
    });

    steps.push({
      kind: 'stars',
      ms: 2400,
      heat: Math.max(40, match.rating),
      match,
      portraitIds: match.participantIds,
      eyebrow: 'MATCH RATING',
      headline: match.stars || 'DUD',
      sub: `${match.grade} / ${match.rating} / 100`,
    });

    if (match.titleOutcome && ['change', 'crowned'].includes(match.titleOutcome.type)) {
      steps.push({
        kind: 'title',
        ms: 3400,
        heat: 100,
        eyebrow: match.titleOutcome.type === 'crowned' ? 'A CHAMPION IS CROWNED' : 'NEW CHAMPION',
        headline: match.titleOutcome.newHolderNames,
        sub: match.titleOutcome.titleName,
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
function setWrestlers(root, ids = [], holders = {}) {
  const frame = root.querySelector('.bc-wrestlers');
  const uniqueIds = [...new Set(ids.filter(Boolean))].slice(0, 4);
  frame.innerHTML = uniqueIds.map((id, index) => {
    const wrestler = getWrestlerById(id);
    const image = wrestlerImageUrl(wrestler);
    if (!image) return '';
    const belts = CHAMPIONSHIPS.filter(def => holders[def.id]?.includes(id)).map(def => BELT_IMAGES[def.id]).filter(Boolean);
    const beltHtml = belts.map(url => `<img class="bc-wrestler-belt" src="${url}" alt="">`).join('');
    return `<span class="bc-wrestler" style="--bc-index:${index}"><img class="bc-wrestler-photo" src="${image}" alt="">${beltHtml}</span>`;
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
  const steps = buildTimeline(result);
  const lineEl = root.querySelector('.bc-line');
  const voiceEl = root.querySelector('.bc-voice');
  const heatFill = root.querySelector('.bc-heat i');
  const timeEl = root.querySelector('.bc-time');

  session = {
    root,
    index: -1,
    speed: 1,
    heat: 0,
    target: 0,
    startedAt: performance.now(),
    stepTimer: null,
    typeTimer: null,
    raf: null,
  };

  function clearTimers() {
    clearTimeout(session.stepTimer);
    clearInterval(session.typeTimer);
  }

  function finish() {
    if (!session) return;
    clearTimers();
    cancelAnimationFrame(session.raf);
    removeEventListener('keydown', onKey, true);
    root.classList.add('closing');
    const node = root;
    setTimeout(() => node.remove(), 260);
    session = null;
    onComplete(result);
  }

  function typeLine(step) {
    voiceEl.textContent = ANNOUNCERS[step.voice] ?? '';
    lineEl.className = `bc-line${step.emphasis ? ' emphasis' : ''}`;
    if (REDUCED_MOTION) {
      lineEl.textContent = step.text;
      return;
    }
    lineEl.textContent = '';
    let cursor = 0;
    const speed = Math.max(8, 20 / session.speed);
    session.typeTimer = setInterval(() => {
      cursor += 1;
      lineEl.textContent = step.text.slice(0, cursor);
      if (cursor >= step.text.length) clearInterval(session.typeTimer);
    }, speed);
  }

  function advance() {
    clearTimers();
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

    if (step.kind === 'beat') {
      hideStage(root);
      typeLine(step);
      if (step.lower) setLower(root, step.lower);
    } else {
      setStage(root, step, step.kind);
      if (step.kind === 'card' || step.kind === 'entrance') {
        lineEl.textContent = '';
        voiceEl.textContent = '';
        hideStage(root);
      }
      setLower(root, step.lower ?? null);
    }

    session.stepTimer = setTimeout(advance, step.ms / session.speed);
  }

  function tick() {
    if (!session) return;
    // Crowd noise surges to the beat's heat, then decays like a real room.
    session.heat += (session.target - session.heat) * 0.12;
    session.target = Math.max(18, session.target - 0.35);
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
      advance();
    } else if (event.code === 'KeyF') {
      session.speed = session.speed === 1 ? 3 : 1;
      root.classList.toggle('fast', session.speed !== 1);
    } else {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  addEventListener('keydown', onKey, true);
  root.addEventListener('click', advance);
  tick();
  advance();
}
