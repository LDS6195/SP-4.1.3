import * as THREE from 'three';

import skylineUrl from '../images/skyline4.jpg?url';
import catalogUrl from '../images/catalog.jpg?url';
import cabinetUrl from '../images/cabinet.jpg?url';
import ringUrl from '../ring.jpg?url';
import daliUrl from '../images/dali.jpg?url';
import rothkoUrl from '../images/rothko.jpg?url';
import goyaUrl from '../images/goya.jpg?url';
import brickUrl from '../images/wallpaper/brick.jpg?url';
import rusticWallpaperUrl from '../images/wallpaper/rustic.jpg?url';
import wallpaperUrl from '../images/wallpaper/wallpaper1.jpg?url';
import rugUrl from '../images/wallpaper/rug.jpg?url';
import windows95Url from '../images/wallpaper/windows95.jpg?url';
import wall2Url from '../images/wallpaper/wall2.jpg?url';
import ticketsUrl from '../images/wallpaper/tickets.png?url';
import worldChampBeltUrl from '../images/world-champ-belt.png?url';
import tagBeltUrl from '../images/tag-belt.png?url';
import { wrestlerImageUrl } from './data/wrestlerImages.js';
import './style.css';
import './booking.css';
import './broadcast.css';
import { wrestlers, STYLES, getWrestlerById, calculateAge, recordString, momentumLabel, topChemistryPartners, getMatchHistoryFor } from './data/wrestlers.js';
import { RECORD_DEFS, TROPHIES } from './data/achievements.js';
import { bookingPanelHtml, bookingPanelKicker, handleBookingEvent, handleBookingInput, trophyCaseHtml, recordBookHtml, archiveHtml, championshipShrineHtml, careerPlaqueHtml, financePanelHtml, titleDetailViewHtml, teamsViewHtml, setBookingView, getBookingView, cardBookHtml, purchasedPackRevealHtml } from './booking/bookingPanel.js';
import { exportCareerResume } from './booking/legacyShare.js';
import {
  getSignedRoster, getState, getShow, getLeadUp, showDateLabel, isDraftComplete, getProjection, staminaFor, moraleFor, startNewGame,
  exportGameData, importGameData, buyLoungeItem, LOUNGE_ITEMS, getGMLevel, getInbox, unreadEmailCount, markEmailRead,
  getCompanyIdentity, hasNamedCompany, setCompanyIdentity, forceTragedy, getOwnedVinyls, getNowPlayingVinyl, setNowPlayingVinyl, buyVinyl, forceNWO, isChampion,
  getCribPacks, buyPack, buyCustomWrestlerPack, getPromoHistoryFor, getTutorialPacks, claimTutorialPack, getPurchasedPackReveal,
  LOUNGE_PAINTING_IDS, getDisplayedPaintings, setDisplayedPainting,
  revealPurchasedPackCard, finishPurchasedPackReveal,
} from './booking/bookingState.js';
import { playBroadcast, isBroadcastActive } from './booking/broadcast.js';
import { createPpvPoster } from './booking/ppvPoster.js';
import { PPV_CALENDAR, logoUrl } from './data/calendar.js';
import { companyLogoUrl, companyLogoAccent, COMPANY_LOGO_STYLES, COMPANY_LOGO_STYLE_LABELS } from './data/companyLogo.js';
import { getMatchType, MATCH_TYPES } from './data/matchTypes.js';
import { CHAMPIONSHIPS } from './data/championships.js';
import { worldNewsForDate } from './data/worldNews.js';
import { VINYL_RECORDS, vinylCoverUrl, getVinylRecord } from './data/vinyls.js';
import { createVendingMachine } from './lounge/vendingMachine.js';
import { createCardBook } from './lounge/cardBook.js';
import { createCompanyEmblem, createWallPainting, createFinanceDeskProps, disposeOfficeDisplay } from './lounge/officeDisplay.js';

let vinylGrooveTexture = null;
function grooveTexture() {
  if (vinylGrooveTexture) return vinylGrooveTexture;
  const size = 256;
  const canvasEl = document.createElement('canvas');
  canvasEl.width = size;
  canvasEl.height = size;
  const ctx = canvasEl.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  ctx.fillStyle = '#131313';
  ctx.fillRect(0, 0, size, size);
  for (let r = size / 2; r > 6; r -= 2) {
    const shade = 14 + ((r % 6) * 3) + (r % 11 === 0 ? 10 : 0);
    ctx.strokeStyle = `rgba(${shade + 4},${shade + 4},${shade + 6},${r % 4 === 0 ? .55 : .3})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  const sheen = ctx.createLinearGradient(0, 0, size, size);
  sheen.addColorStop(0, 'rgba(255,255,255,.05)');
  sheen.addColorStop(.45, 'rgba(255,255,255,0)');
  sheen.addColorStop(.55, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(255,255,255,.08)');
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.fill();
  vinylGrooveTexture = new THREE.CanvasTexture(canvasEl);
  return vinylGrooveTexture;
}

const canvas = document.querySelector('#scene');
const app = document.querySelector('#app');
const intro = document.querySelector('#intro');
const panel = document.querySelector('#panel');
const panelFrame = document.querySelector('.panel-frame');
const panelTitle = document.querySelector('#panel-title');
const panelKicker = document.querySelector('#panel-kicker');
const panelContent = document.querySelector('#panel-content');
const altMenuNav = document.querySelector('#alt-menu-nav');
const altMenuToggle = document.querySelector('#alt-menu-toggle');
const stationName = document.querySelector('#station-name');
const stationDescription = document.querySelector('#station-description');
const stationIndex = document.querySelector('#station-index');
const toast = document.querySelector('#toast');

function applyCompanyBranding() {
  const { acronym, name } = getCompanyIdentity();
  document.title = name;
  document.querySelector('#wordmark-acronym').textContent = acronym;
  document.querySelector('#wordmark-name').textContent = name.toUpperCase();
  document.querySelector('#alt-menu-heading').textContent = name.toUpperCase();
  const words = name.split(/\s+/);
  document.querySelector('#intro-heading').innerHTML = words.length > 1
    ? `${words.slice(0, -1).join(' ')}<br />${words.at(-1)}`
    : name;
}

applyCompanyBranding();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x121214);
scene.fog = new THREE.Fog(0x121214, 15, 37);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, .1, 80);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;

const clock = new THREE.Clock();
const targetPosition = new THREE.Vector3();
const targetLookAt = new THREE.Vector3();
const currentLookAt = new THREE.Vector3();
let started = false;
let panelOpen = false;
let station = 0;
let currentPanelKind = null;
let calendarHeaderSign = null;
const calendarCells = [];
let bookingBoardSign = null;
let bookingPosterMesh = null;
let bookingPosterAsset = null;
let bookingPosterSignature = '';
let ppvLogoDisplay = null;
let galleryMode = false;
let galleryExhibit = 0;
let trophyGalleryMode = false;
let trophyExhibit = 0;
let loungeMode = false;
let loungeExhibit = 0;
let vhsMode = false;
let vhsExhibit = 0;
let selectedVhsIndex = null;
let selectedLoungeCatalogTab = 'packs';
let selectedCardBookSection = 'wrestlers';
let selectedPaintingSlot = 0;
let cardBookProfileId = null;
let cardBookScrollTop = 0;
let purchasedPackFlipped = [];
let altMenuOpen = false;
let toastTimer;
let vhsArchiveSign = null;
const vhsTapeSlots = [];
let vhsSignature = null;
const gallerySpotlight = new THREE.PointLight(0xffd275, 0, 5, 2);
const windowReflectionTextures = [];

function patternedTexture(base, detail, lines = 50) {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = textureCanvas.height = 512;
  const context = textureCanvas.getContext('2d');
  context.fillStyle = base;
  context.fillRect(0, 0, 512, 512);
  context.strokeStyle = detail;
  context.globalAlpha = .34;
  context.lineWidth = 2;
  for (let index = 0; index < lines; index += 1) {
    context.beginPath();
    context.moveTo(Math.random() * 512, Math.random() * 512);
    context.bezierCurveTo(Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 3);
  return texture;
}

function rugTexture() {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = textureCanvas.height = 512;
  const context = textureCanvas.getContext('2d');
  context.fillStyle = '#27181a';
  context.fillRect(0, 0, 512, 512);
  context.strokeStyle = '#bd9654';
  context.lineWidth = 10;
  context.strokeRect(24, 24, 464, 464);
  context.strokeStyle = '#70323a';
  context.lineWidth = 24;
  context.strokeRect(52, 52, 408, 408);
  context.strokeStyle = '#d8b56b';
  context.lineWidth = 6;
  for (let offset = 92; offset < 440; offset += 54) {
    context.beginPath(); context.moveTo(72, offset); context.lineTo(440, offset); context.stroke();
    context.beginPath(); context.moveTo(offset, 72); context.lineTo(offset, 440); context.stroke();
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function imageTexture(url, repeatX = 1, repeatY = 1) {
  const texture = new THREE.TextureLoader().load(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  return texture;
}

function bookingPosterTexture() {
  const show = getShow();
  const branding = getState().eventBranding[show.eventId] ?? {};
  bookingPosterAsset?.dispose();
  const poster = createPpvPoster(show, branding, getCompanyIdentity().name);
  bookingPosterAsset = poster;
  const texture = new THREE.CanvasTexture(poster.canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  poster.ready.then(() => {
    if (bookingPosterAsset === poster) texture.needsUpdate = true;
  });
  return texture;
}

function refreshBookingPoster() {
  if (!bookingPosterMesh) return;
  const show = getShow();
  const signature = JSON.stringify([show, getState().eventBranding[show.eventId], getCompanyIdentity().name]);
  if (signature === bookingPosterSignature) return;
  bookingPosterSignature = signature;
  bookingPosterMesh.material.map?.dispose();
  bookingPosterMesh.material.map = bookingPosterTexture();
  bookingPosterMesh.material.needsUpdate = true;
}

function refreshPpvLogo() {
  if (!ppvLogoDisplay) return;
  const show = getShow();
  const event = PPV_CALENDAR.find(entry => entry.id === show.eventId);
  const branding = getState().eventBranding[show.eventId] || {};
  const url = logoUrl(branding.logoId || event?.logoId || 'generated', branding.name || show.name, branding.color || event?.color, branding.logoStyle);
  ppvLogoDisplay.material.map?.dispose();
  ppvLogoDisplay.material.map = imageTexture(url);
  ppvLogoDisplay.material.needsUpdate = true;
}

function refreshHud() {
  const state = getState();
  const date = new Date(`${state.date}T12:00:00`);
  const capital = state.bankroll >= 1000000
    ? `$${(state.bankroll / 1000000).toFixed(1)}M`
    : `$${Math.round(state.bankroll / 1000)}K`;
  document.querySelector('#hud-capital').textContent = capital;
  document.querySelector('#hud-date').textContent = date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  }).toUpperCase();
}

const materials = {
  black: new THREE.MeshStandardMaterial({ color: 0x171719, roughness: .72, metalness: .2 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x404249, roughness: .45, metalness: .75 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x62605e, roughness: .92 }),
  plaster: new THREE.MeshStandardMaterial({ color: 0x77747a, roughness: .88 }),
  walnut: new THREE.MeshStandardMaterial({ color: 0x3d2923, roughness: .7 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xc49a46, roughness: .25, metalness: .85 }),
  red: new THREE.MeshStandardMaterial({ color: 0x8e1d25, roughness: .65 }),
  burgundy: new THREE.MeshStandardMaterial({ color: 0x391719, roughness: .78 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xeaf0ee, transparent: true, opacity: .1, roughness: .05, depthWrite: false }),
  walnutGrain: new THREE.MeshStandardMaterial({ map: patternedTexture('#2b1b16', '#80513b', 85), roughness: .58, metalness: .08 }),
  marble: new THREE.MeshStandardMaterial({ map: patternedTexture('#d7d0bf', '#8e8b81', 38), roughness: .36, metalness: .05 }),
  modernWhite: new THREE.MeshStandardMaterial({ color: 0xe7e4dc, roughness: .82, metalness: .03 }),
  legacySilver: new THREE.MeshStandardMaterial({ color: 0xb8bec4, roughness: .55, metalness: .3 }),
  wallpaper: new THREE.MeshStandardMaterial({ map: imageTexture(wallpaperUrl, 6, 2), roughness: .88, metalness: .02 }),
  rusticWallpaper: new THREE.MeshStandardMaterial({ map: imageTexture(rusticWallpaperUrl, 5, 2), roughness: .9, metalness: .02 }),
  bookingWallpaper: new THREE.MeshStandardMaterial({ map: imageTexture(wall2Url, 3, 2), roughness: .9, metalness: .02 }),
  bookingWall: new THREE.MeshStandardMaterial({ map: patternedTexture('#e6e0d5', '#c7bfb2', 22), roughness: .92, metalness: 0 }),
  bulletinBoard: new THREE.MeshStandardMaterial({ color: 0xd4b67a, roughness: .94, metalness: 0 }),
  brick: new THREE.MeshStandardMaterial({ map: imageTexture(brickUrl, 7, 3), roughness: .96, metalness: 0 }),
  blackBrick: new THREE.MeshStandardMaterial({ map: imageTexture(brickUrl, 4, 3), color: 0x242321, roughness: .98, metalness: 0 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc59a4c, roughness: .28, metalness: .9 }),
  leather: new THREE.MeshStandardMaterial({ color: 0x4b2824, roughness: .7, metalness: .05 }),
  boxOfficeGreen: new THREE.MeshStandardMaterial({ color: 0x143e36, roughness: .58, metalness: .12 }),
  ticketPaper: new THREE.MeshStandardMaterial({ color: 0xe6d4ac, roughness: .88 }),
  popcorn: new THREE.MeshStandardMaterial({ color: 0xf4d87b, roughness: .8 }),
  rug: new THREE.MeshStandardMaterial({ map: imageTexture(rugUrl), roughness: .9 }),
};

function box(width, height, depth, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function textTexture(lines, colors = {}, aspect = 2) {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = Math.round(512 * aspect);
  textureCanvas.height = 512;
  const context = textureCanvas.getContext('2d');
  context.fillStyle = colors.background || '#18181a';
  context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
  context.strokeStyle = colors.border || '#c49a46';
  context.lineWidth = 16;
  context.strokeRect(14, 14, textureCanvas.width - 28, textureCanvas.height - 28);
  const scale = 2;
  lines.forEach((line, index) => {
    context.fillStyle = index === 0 ? (colors.accent || '#d8a847') : (colors.text || '#ede5d3');
    context.font = `${index === 0 ? '700 72px' : '600 48px'} sans-serif`;
    context.textAlign = 'center';
    context.fillText(line, textureCanvas.width / 2, (68 + index * 47) * scale);
  });
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function staticTexture(aspect = 2) {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = Math.round(512 * aspect);
  textureCanvas.height = 256;
  const context = textureCanvas.getContext('2d');
  const pixels = context.createImageData(textureCanvas.width, textureCanvas.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const value = 95 + Math.floor(Math.random() * 160);
    pixels.data[index] = value;
    pixels.data[index + 1] = value;
    pixels.data[index + 2] = value;
    pixels.data[index + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function brickTexture() {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 1024;
  textureCanvas.height = 512;
  const context = textureCanvas.getContext('2d');
  context.fillStyle = '#303039';
  context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
  context.strokeStyle = '#1e2028';
  context.lineWidth = 7;
  const brickWidth = 92;
  const brickHeight = 42;
  for (let row = 0; row < 13; row += 1) {
    const offset = row % 2 ? brickWidth / 2 : 0;
    for (let column = -1; column < 13; column += 1) {
      const x = column * brickWidth + offset;
      const y = row * brickHeight;
      context.fillStyle = row % 3 === 0 ? '#444149' : '#393841';
      context.fillRect(x + 3, y + 3, brickWidth - 6, brickHeight - 6);
      context.strokeRect(x, y, brickWidth, brickHeight);
    }
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function sign(lines, width, height, x, y, z, rotationY = 0, colors) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: textTexture(lines, colors, width / height) }));
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotationY;
  mesh.userData.textureAspect = width / height;
  scene.add(mesh);
  return mesh;
}

function wrapCanvasText(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  words.forEach(word => {
    const test = line ? `${line} ${word}` : word;
    if (context.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((text2, index) => context.fillText(text2, x, startY + index * lineHeight));
}

// A framed magazine/newspaper clipping — masthead kicker, a headline, and faked
// column copy — instead of a plain flat-color placard.
function newspaperTexture(kicker, headline, aspect, headlineY = 118) {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = Math.round(560 * aspect);
  textureCanvas.height = 560;
  const context = textureCanvas.getContext('2d');
  const { width, height } = textureCanvas;
  context.fillStyle = '#e8ddc2';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = '#2b2622';
  context.lineWidth = 10;
  context.strokeRect(9, 9, width - 18, height - 18);
  context.fillStyle = '#8a1f26';
  context.font = '700 26px Georgia, serif';
  context.textAlign = 'center';
  context.fillText(kicker.toUpperCase(), width / 2, 56);
  context.strokeStyle = '#2b2622';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(26, 72);
  context.lineTo(width - 26, 72);
  context.stroke();
  context.fillStyle = '#201b16';
  context.font = 'italic 700 32px Georgia, serif';
  wrapCanvasText(context, headline, width / 2, headlineY, width - 56, 36);
  context.strokeStyle = '#2b2622';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(26, 208);
  context.lineTo(width - 26, 208);
  context.stroke();
  context.fillStyle = 'rgba(32,27,22,.4)';
  for (let row = 0; row < 16; row += 1) {
    const y = 232 + row * 19;
    const w = width - 52 - Math.random() * (width * .25);
    context.fillRect(26, y, w, 7);
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function framedClipping(kicker, headline, width, height, x, y, z, rotationY = 0, { headlineY } = {}) {
  const frame = new THREE.Mesh(new THREE.BoxGeometry(width + .09, height + .09, .04), materials.walnut);
  frame.position.set(x, y, z - (rotationY === Math.PI ? -.03 : .03));
  frame.rotation.y = rotationY;
  scene.add(frame);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: newspaperTexture(kicker, headline, width / height, headlineY) }));
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotationY;
  scene.add(mesh);
  return mesh;
}

// Swaps a sign's baked texture for a fresh one — used to keep 3D signage honest as the
// calendar actually advances instead of leaving opening-night text carved in forever.
function updateSign(mesh, lines, colors) {
  if (!mesh) return;
  mesh.material.map?.dispose();
  mesh.material.map = textTexture(lines, colors, mesh.userData.textureAspect || 2);
  mesh.material.needsUpdate = true;
}

function addImageWall(url, width, height, x, y, z, rotationY, { preserveAspect = false } = {}) {
  const texture = new THREE.TextureLoader().load(url, loadedTexture => {
    if (!preserveAspect) return;
    const imageAspect = loadedTexture.image.width / loadedTexture.image.height;
    const surfaceAspect = width / height;
    if (imageAspect > surfaceAspect) {
      const repeatX = surfaceAspect / imageAspect;
      loadedTexture.repeat.set(repeatX, 1);
      loadedTexture.offset.set((1 - repeatX) / 2, 0);
    } else {
      const repeatY = imageAspect / surfaceAspect;
      loadedTexture.repeat.set(1, repeatY);
      loadedTexture.offset.set(0, (1 - repeatY) / 2);
    }
  });
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, fog: false }));
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotationY;
  scene.add(mesh);
}

function addWindowGlass(width, height, x, y, z, rotationY) {
  const reflectionCanvas = document.createElement('canvas');
  reflectionCanvas.width = 1024;
  reflectionCanvas.height = 512;
  const context = reflectionCanvas.getContext('2d');
  for (const bandX of [180, 760]) {
    const glow = context.createLinearGradient(bandX - 110, 0, bandX + 110, 0);
    glow.addColorStop(0, 'rgba(220, 239, 255, 0)');
    glow.addColorStop(.5, 'rgba(220, 239, 255, .26)');
    glow.addColorStop(1, 'rgba(220, 239, 255, 0)');
    context.save();
    context.translate(bandX, 256);
    context.rotate(-.22);
    context.fillStyle = glow;
    context.fillRect(-110, -620, 220, 1240);
    context.restore();
  }
  const reflectionTexture = new THREE.CanvasTexture(reflectionCanvas);
  reflectionTexture.wrapS = THREE.RepeatWrapping;
  reflectionTexture.repeat.x = 1.25;
  windowReflectionTextures.push(reflectionTexture);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: reflectionTexture, color: 0xb9d7e8, transparent: true, opacity: .2, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide }),
  );
  glass.position.set(x, y, z);
  glass.rotation.y = rotationY;
  scene.add(glass);
}

function makeArchitecture() {
  box(26, .2, 15, materials.marble, 0, 0, 0);
  box(26, .2, 15, materials.black, 0, 7, 0);
  box(.3, 7, 15, materials.concrete, -13, 3.5, 0);
  box(.3, 7, 15, materials.concrete, 13, 3.5, 0);
  box(26, 7, .3, materials.brick, 0, 3.5, -7.5);
  box(16.8, 6.7, .04, materials.wallpaper, 4.4, 3.5, -7.29);
  box(.04, 6.7, 14.4, materials.rusticWallpaper, -12.82, 3.5, 0);
  box(.04, 6.7, 14.4, materials.bookingWallpaper, 12.82, 3.5, 0);
  box(25.5, 1.35, .08, materials.walnutGrain, 0, .84, -7.2);
  box(25.5, .05, .06, materials.brass, 0, 1.55, -7.14);
  box(.08, 1.35, 14.4, materials.walnutGrain, -12.76, .84, 0);
  box(.08, 1.35, 14.4, materials.walnutGrain, 12.76, .84, 0);
  box(.04, .05, 14.4, materials.brass, -12.7, 1.55, 0);
  box(.04, .05, 14.4, materials.brass, 12.7, 1.55, 0);
  [-4.8, .2, 5.2, 10.2].forEach(x => {
    box(.11, 4.65, .06, materials.walnutGrain, x, 4.02, -7.14);
    box(.06, 4.8, .035, materials.brass, x + .08, 4.02, -7.09);
  });
  box(25.5, .18, .24, materials.walnutGrain, 0, 6.65, -7.18);
  box(26, 7, .18, materials.glass, 0, 3.5, 7.3);
  addImageWall(skylineUrl, 25.4, 6.5, 0, 3.5, 7.39, Math.PI, { preserveAspect: true });
  addWindowGlass(25.4, 6.5, 0, 3.5, 7.16, Math.PI);
  [-10, -5, 0, 5, 10].forEach(x => {
    box(.18, 7, .3, materials.black, x, 3.5, 7.12);
    box(.035, 6.5, .04, materials.brass, x + .11, 3.5, 7.05);
  });
  box(26, .22, .3, materials.black, 0, 6.7, 7.12);
  box(26, .28, .3, materials.black, 0, .25, 7.12);
  box(.22, 7, 15, materials.legacySilver, 4.3, 3.5, 0);
  box(.22, 7, 15, materials.rusticWallpaper, -2.3, 3.5, 0);
}

function makeExecutiveOffice() {
  box(5.8, .035, 4.4, materials.rug, -.25, .16, .8);
  box(2.5, .12, 1.15, materials.walnutGrain, .55, .74, 3.4);
  [-.5, 1.6].forEach(x => box(.1, .62, .1, materials.brass, x, .42, 3.4));
  box(1.2, .07, .48, materials.marble, .55, .84, 3.4);

  [[-1.5, 3.8, .18], [2.6, 4.05, -.18]].forEach(([x, z, rotation]) => {
    box(1.25, .25, 1.2, materials.leather, x, .72, z);
    box(1.25, .95, .2, materials.leather, x, 1.16, z + (rotation > 0 ? .48 : -.48));
    box(1.32, .08, 1.28, materials.brass, x, .45, z);
  });

  const pendant = new THREE.Group();
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(.78, .58, .24, 32, 1, true), materials.black);
  const trim = new THREE.Mesh(new THREE.TorusGeometry(.78, .035, 10, 32), materials.brass);
  trim.rotation.x = Math.PI / 2;
  trim.position.y = -.11;
  const lamp = new THREE.PointLight(0xffc877, 13, 8, 2);
  lamp.position.y = -.35;
  pendant.add(shade, trim, lamp);
  pendant.position.set(.2, 6.15, 1.1);
  scene.add(pendant);
  box(.04, 1.0, .04, materials.brass, .2, 6.6, 1.1);

  [-2.35, 3.15].forEach(x => {
    box(.16, .52, .09, materials.brass, x, 4.55, -7.05);
    const sconce = new THREE.PointLight(0xffc576, 5, 3.5, 2);
    sconce.position.set(x, 4.45, -6.6);
    scene.add(sconce);
  });

  [[-3.96, 4.8, Math.PI / 2, 'EVENT', 'POSTER ART']].forEach(([x, y, rotationY, top, bottom]) => {
    sign([top, bottom], 1.15, 1.5, x, y, .55, rotationY, { background: '#241a18', border: '#c59a4c', accent: '#d9b86d' });
  });

  for (let shelf = 0; shelf < 3; shelf += 1) {
    const y = 1.6 + shelf * .72;
    box(2.6, .06, .32, materials.walnutGrain, 1.45, y, -7.02);
    box(2.64, .02, .04, materials.brass, 1.45, y + .05, -6.98);
    for (let book = 0; book < 7; book += 1) {
      const bookHeight = .2 + (book % 3) * .05;
      box(.12, bookHeight, .18, book % 2 ? materials.burgundy : materials.leather, .52 + book * .22, y + bookHeight / 2, -6.83);
    }
  }
}

function makeRingView() {
  addImageWall(ringUrl, 7.6, 5.3, -12.78, 3.25, 0, Math.PI / 2);
  box(.18, 5.9, 8.1, materials.steel, -12.63, 3.3, 0);
  box(.35, .35, 8.2, materials.black, -12.42, .35, 0);
  sign(['TONIGHT', 'THE RING IS WAITING'], 2.7, .9, -12.35, 6.1, 0, Math.PI / 2, { background: '#761a20', border: '#d9b562' });
}

// A freestanding spiral staircase: central pole, helical treads, and a tube-geometry handrail.
function makeSpiralStaircase(x, z, baseY, topY, { radius = .82, steps = 15, turns = 1.3 } = {}) {
  const totalHeight = topY - baseY;
  const stepHeight = totalHeight / steps;
  const angleStep = (Math.PI * 2 * turns) / steps;
  const group = new THREE.Group();

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, totalHeight + .3, 16), materials.steel);
  pole.position.set(0, totalHeight / 2, 0);
  pole.castShadow = true;
  group.add(pole);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius * .55, radius * .6, .07, 24), materials.steel);
  base.position.set(0, .035, 0);
  group.add(base);

  const railPoints = [];
  for (let i = 0; i <= steps; i += 1) {
    const angle = i * angleStep;
    const y = stepHeight * i;
    if (i < steps) {
      const tread = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.15, .045, radius * .68), materials.walnutGrain);
      tread.position.set(Math.cos(angle) * radius * .52, y + stepHeight * .5, Math.sin(angle) * radius * .52);
      tread.rotation.y = -angle;
      tread.castShadow = true;
      tread.receiveShadow = true;
      group.add(tread);

      const baluster = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, stepHeight + .78, 8), materials.steel);
      baluster.position.set(Math.cos(angle) * radius * .96, y + stepHeight * .5 + .39, Math.sin(angle) * radius * .96);
      group.add(baluster);
    }
    railPoints.push(new THREE.Vector3(Math.cos(angle) * radius * .96, y + .92, Math.sin(angle) * radius * .96));
  }
  const railCurve = new THREE.CatmullRomCurve3(railPoints);
  const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve, steps * 6, .024, 8, false), materials.brass);
  group.add(rail);

  group.position.set(x, baseY, z);
  scene.add(group);
}

let packVendingMachine;
let loungeCardBook;
let financeDeskItems;
let companyWallEmblem;
let companyWallSignature = '';
const wallPaintings = [null, null];
const paintingArtUrls = { rothko: rothkoUrl, dali: daliUrl, goya: goyaUrl };

function makeLounge() {
  const centerX = -7.55;
  const windowZ = 6.96;
  const ownedLoungeItems = new Set(getState().lounge?.owned ?? []);

  box(9.9, .08, 7.2, materials.modernWhite, centerX, .18, 3.35);
  box(.14, 6.25, 6.75, materials.modernWhite, -12.63, 3.25, 3.62);
  box(.14, 6.25, 6.75, materials.modernWhite, -2.47, 3.25, 3.62);
  addImageWall(skylineUrl, 9.55, 5.45, centerX, 3.55, windowZ, Math.PI, { preserveAspect: true });
  addWindowGlass(9.55, 5.45, centerX, 3.55, 6.86, Math.PI);
  box(9.85, .22, .18, materials.black, centerX, 6.42, 6.82);
  box(9.85, .22, .18, materials.black, centerX, .78, 6.82);
  [-11.55, -9.55, -7.55, -5.55, -3.55].forEach(x => box(.14, 5.6, .16, materials.black, x, 3.55, 6.83));
  box(9.8, .08, .18, materials.brass, centerX, .94, 6.69);

  box(6.8, .06, 3.35, materials.rug, centerX, .25, 3.95);
  box(3.5, .28, .9, materials.leather, centerX - .55, .72, 3.15);
  box(3.5, .76, .2, materials.leather, centerX - .55, 1.13, 2.76);
  box(.9, .28, 2.15, materials.leather, centerX + 1.45, .72, 3.77);
  box(.2, .76, 2.15, materials.leather, centerX + 1.83, 1.13, 3.77);
  [-1.72, .62].forEach(offset => box(.18, .48, .85, materials.leather, centerX + offset, .9, 4.72));
  box(1.45, .12, .82, materials.marble, centerX - .15, .55, 4.88);
  [-.68, .38].forEach(offset => box(.12, .48, .12, materials.brass, centerX + offset, .3, 4.88));
  const catalogBase = box(.34, .045, .38, materials.walnutGrain, centerX - .64, .68, 4.95);
  catalogBase.rotation.y = Math.PI / 6;
  const loungeCatalog = new THREE.Mesh(
    new THREE.PlaneGeometry(.3, .36),
    new THREE.MeshBasicMaterial({ map: imageTexture(catalogUrl), toneMapped: false }),
  );
  loungeCatalog.position.set(centerX - .64, .707, 4.95);
  loungeCatalog.rotation.x = -Math.PI / 2;
  loungeCatalog.rotation.z = Math.PI + Math.PI / 6;
  scene.add(loungeCatalog);
  loungeCardBook = createCardBook();
  loungeCardBook.position.set(centerX + .08, .615, 4.88);
  scene.add(loungeCardBook);
  packVendingMachine = createVendingMachine(getCribPacks());
  packVendingMachine.position.set(-5.45, .24, 6.35);
  packVendingMachine.rotation.y = Math.PI;
  scene.add(packVendingMachine);
  if (ownedLoungeItems.has('vinyl-library')) {
  // The collection is built into the left wall, keeping the enlarged Lounge open from its entry view.
  box(.24, 4.6, 5.6, materials.walnutGrain, -12.42, 2.55, 3.35);
  box(.1, 4.72, .1, materials.brass, -12.25, 2.55, .6);
  box(.1, 4.72, .1, materials.brass, -12.25, 2.55, 6.1);
  const ownedVinyls = new Set(getOwnedVinyls());
  const grooveMaterial = new THREE.MeshStandardMaterial({ map: grooveTexture(), roughness: .35, metalness: .5 });
  VINYL_RECORDS.forEach((vinylRecord, record) => {
    const column = record % 6;
    const row = Math.floor(record / 6);
    const x = -12.24;
    const y = 1.65 + row * .72;
    const z = .95 + column * .92;
    const sleeveMaterial = record % 4 === 0 ? materials.burgundy : record % 4 === 1 ? materials.black : record % 4 === 2 ? materials.leather : materials.ticketPaper;
    box(.045, .64, .72, sleeveMaterial, x, y, z);
    const coverUrl = ownedVinyls.has(vinylRecord.id) ? vinylCoverUrl(vinylRecord) : null;
    if (coverUrl) {
      const cover = new THREE.Mesh(
        new THREE.PlaneGeometry(.7, .6),
        new THREE.MeshBasicMaterial({ map: imageTexture(coverUrl), toneMapped: false }),
      );
      cover.position.set(-12.16, y, z);
      cover.rotation.y = Math.PI / 2;
      scene.add(cover);
      return;
    }
    const vinyl = new THREE.Mesh(new THREE.CylinderGeometry(.215, .215, .025, 24), [materials.black, grooveMaterial, grooveMaterial]);
    vinyl.rotation.z = Math.PI / 2;
    vinyl.position.set(-12.2, y, z);
    vinyl.castShadow = true;
    scene.add(vinyl);
    const label = new THREE.Mesh(new THREE.CircleGeometry(.065, 16), new THREE.MeshStandardMaterial({ color: record % 3 === 0 ? 0xc49a46 : 0xb9a48a, roughness: .7 }));
    label.position.set(-12.18, y, z);
    label.rotation.y = Math.PI / 2;
    scene.add(label);
  });
  sign(['VINYL LIBRARY', '24 ALBUMS'], 1.65, .32, -12.16, 4.64, 3.35, Math.PI / 2, { background: '#211817', border: '#c59a4c', accent: '#d9b86d' });
  }

  if (ownedLoungeItems.has('vinyl-library')) {
  box(1.8, .88, .72, materials.walnutGrain, -11.08, .66, 3.35);
  box(1.92, .1, .82, materials.brass, -11.08, 1.14, 3.35);
  const turntable = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .055, 32), [materials.black, new THREE.MeshStandardMaterial({ map: grooveTexture(), roughness: .35, metalness: .5 }), materials.black]);
  turntable.position.set(-11.32, 1.22, 3.35);
  scene.add(turntable);
  const recordLabel = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .06, 20), materials.burgundy);
  recordLabel.position.set(-11.32, 1.27, 3.35);
  scene.add(recordLabel);
  box(.035, .045, .48, materials.steel, -10.72, 1.29, 3.35);
  box(.12, .08, .12, materials.brass, -10.72, 1.29, 3.58);
  sign(['NOW PLAYING'], .94, .2, -11.08, 1.52, 2.96, 0, { background: '#211817', border: '#c59a4c', accent: '#d9b86d' });
  }

  if (ownedLoungeItems.has('arcade-cabinet')) {
  box(.8, 2.15, 1.1, materials.black, -2.92, 1.28, 3.5);
  box(.86, .08, 1.18, materials.brass, -2.92, .32, 3.5);
  const addArcadeSkinPanel = (width, height, y, z) => {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: imageTexture(cabinetUrl), toneMapped: false }),
    );
    panel.position.set(-3.335, y, z);
    panel.rotation.y = -Math.PI / 2;
    scene.add(panel);
  };
  addArcadeSkinPanel(1.1, .4, 2.15, 3.5);
  addArcadeSkinPanel(1.1, 1.12, .77, 3.5);
  addArcadeSkinPanel(.19, .64, 1.67, 3.045);
  addArcadeSkinPanel(.19, .64, 1.67, 3.955);
  const arcadeLogoCanvas = document.createElement('canvas');
  arcadeLogoCanvas.width = 512;
  arcadeLogoCanvas.height = 176;
  const arcadeLogoContext = arcadeLogoCanvas.getContext('2d');
  arcadeLogoContext.fillStyle = '#2b2b2f';
  arcadeLogoContext.fillRect(0, 0, arcadeLogoCanvas.width, arcadeLogoCanvas.height);
  arcadeLogoContext.strokeStyle = '#57565c';
  arcadeLogoContext.lineWidth = 8;
  arcadeLogoContext.strokeRect(4, 4, arcadeLogoCanvas.width - 8, arcadeLogoCanvas.height - 8);
  arcadeLogoContext.save();
  arcadeLogoContext.translate(arcadeLogoCanvas.width / 2, arcadeLogoCanvas.height / 2);
  arcadeLogoContext.transform(1, 0, -.22, 1, 0, 0);
  arcadeLogoContext.textAlign = 'center';
  arcadeLogoContext.textBaseline = 'middle';
  arcadeLogoContext.font = "900 54px 'Arial Black', Impact, sans-serif";
  arcadeLogoContext.lineJoin = 'round';
  arcadeLogoContext.lineWidth = 10;
  arcadeLogoContext.strokeStyle = '#ff9d1c';
  arcadeLogoContext.strokeText('COLLEGE', 0, -32);
  const logoGradient = arcadeLogoContext.createLinearGradient(0, -60, 0, -4);
  logoGradient.addColorStop(0, '#fff4d6');
  logoGradient.addColorStop(1, '#ffce54');
  arcadeLogoContext.fillStyle = logoGradient;
  arcadeLogoContext.fillText('COLLEGE', 0, -32);
  arcadeLogoContext.strokeStyle = '#1c6fd1';
  arcadeLogoContext.strokeText('GAMEDAY', 0, 34);
  const logoGradient2 = arcadeLogoContext.createLinearGradient(0, 2, 0, 58);
  logoGradient2.addColorStop(0, '#eaf6ff');
  logoGradient2.addColorStop(1, '#7fc8ff');
  arcadeLogoContext.fillStyle = logoGradient2;
  arcadeLogoContext.fillText('GAMEDAY', 0, 34);
  arcadeLogoContext.restore();
  const arcadeLogoTexture = new THREE.CanvasTexture(arcadeLogoCanvas);
  arcadeLogoTexture.colorSpace = THREE.SRGBColorSpace;
  const arcadeLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(.86, .296),
    new THREE.MeshBasicMaterial({ map: arcadeLogoTexture, toneMapped: false }),
  );
  arcadeLogo.position.set(-3.337, 2.15, 3.5);
  arcadeLogo.rotation.y = -Math.PI / 2;
  scene.add(arcadeLogo);
  const arcadeScreenFrame = new THREE.Mesh(new THREE.PlaneGeometry(.82, .7), materials.black);
  arcadeScreenFrame.position.set(-3.345, 1.67, 3.5);
  arcadeScreenFrame.rotation.y = -Math.PI / 2;
  scene.add(arcadeScreenFrame);
  const arcadeScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(.7, .54),
    new THREE.MeshBasicMaterial({ map: staticTexture(.7 / .54), toneMapped: false }),
  );
  arcadeScreen.position.set(-3.352, 1.67, 3.5);
  arcadeScreen.rotation.y = -Math.PI / 2;
  scene.add(arcadeScreen);
  box(.38, .08, .78, materials.steel, -3.4, 1.02, 3.5);
  [3.28, 3.68].forEach((z, index) => {
    const button = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 10), index ? materials.burgundy : materials.gold);
    button.position.set(-3.46, 1.09, z);
    scene.add(button);
  });
  }
  [-11.15, -5.95].forEach(x => {
    box(.18, 1.2, .18, materials.brass, x, 1.15, 4.95);
    const lampShade = new THREE.Mesh(new THREE.ConeGeometry(.34, .18, 18, 1, true), materials.modernWhite);
    lampShade.position.set(x, 1.82, 4.95);
    scene.add(lampShade);
    const lampLight = new THREE.PointLight(0xffd498, 4, 2.7, 2);
    lampLight.position.set(x, 1.7, 4.95);
    scene.add(lampLight);
  });
  [-11.85, -5.2].forEach(x => {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(.16, .2, .28, 12), materials.black);
    pot.position.set(x, .42, 5.85);
    scene.add(pot);
    for (let leaf = 0; leaf < 5; leaf += 1) {
      const foliage = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), new THREE.MeshStandardMaterial({ color: 0x315940, roughness: .9 }));
      foliage.position.set(x + (leaf - 2) * .08, .67 + (leaf % 2) * .1, 5.85);
      scene.add(foliage);
    }
  });
  const loungeLight = new THREE.PointLight(0xffd49a, 10, 5, 2);
  loungeLight.position.set(centerX, 4.9, 4.7);
  scene.add(loungeLight);
  // Back-right corner, in front of the window, next to where the arcade cabinet goes.
  makeSpiralStaircase(-3.35, 6.3, .18, 6.05);
  sign(['THE LOUNGE'], 1.35, .3, centerX, 5.88, 6.77, Math.PI, { background: '#e7e4dc', border: '#252525', accent: '#252525', text: '#252525' });
}

function makeDesk() {
  box(3.7, .18, 1.8, materials.marble, 0, 1.1, -2.5);
  box(.22, 1.1, 1.55, materials.walnutGrain, -1.62, .55, -2.5);
  box(.22, 1.1, 1.55, materials.walnutGrain, 1.62, .55, -2.5);
  financeDeskItems = createFinanceDeskProps(imageTexture(ticketsUrl));
  financeDeskItems.position.set(-1.25, 1.205, -1.94);
  scene.add(financeDeskItems);

  box(1.46, .94, .12, materials.black, .25, 1.9, -2.86);
  const monitorScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, .74),
    new THREE.MeshBasicMaterial({ map: imageTexture(windows95Url), fog: false, side: THREE.DoubleSide, toneMapped: false }),
  );
  monitorScreen.position.set(.25, 1.9, -2.795);
  scene.add(monitorScreen);
  box(.1, .48, .1, materials.steel, .25, 1.25, -2.86);
  box(.72, .07, .3, materials.steel, .25, 1.17, -2.72);
  box(1.15, .05, .38, materials.black, .25, 1.23, -2.47);
  box(.22, .05, .32, materials.black, 1.05, 1.23, -2.45);
}

function makeCompanyWall() {
  box(.18, 7, 14.8, materials.legacySilver, 4.15, 3.5, 0);
  box(.05, .14, 14.7, materials.steel, 4.025, .25, 0);
  refreshCompanyWallEmblem();
  refreshWallPaintings();
  const wallLight = new THREE.PointLight('#e2eee8', 12, 9, 2);
  wallLight.position.set(1.8, 5.3, -2.85);
  scene.add(wallLight);
}

function refreshCompanyWallEmblem() {
  const company = getCompanyIdentity();
  const signature = JSON.stringify([company.acronym, company.name, company.logoStyle, company.logoAccent]);
  if (companyWallSignature === signature) return;
  if (companyWallEmblem) {
    scene.remove(companyWallEmblem);
    disposeOfficeDisplay(companyWallEmblem);
  }
  companyWallEmblem = createCompanyEmblem(company, imageTexture(companyLogoUrl(company.acronym, company.name, company.logoStyle, company.logoAccent)));
  companyWallEmblem.position.set(3.98, 3.45, -2.85);
  companyWallEmblem.rotation.y = -Math.PI / 2;
  scene.add(companyWallEmblem);
  companyWallSignature = signature;
}

function refreshWallPaintings() {
  getDisplayedPaintings().forEach((id, slot) => {
    if (wallPaintings[slot]) {
      scene.remove(wallPaintings[slot]);
      disposeOfficeDisplay(wallPaintings[slot]);
      wallPaintings[slot] = null;
    }
    if (!id) return;
    const painting = createWallPainting(imageTexture(paintingArtUrls[id]));
    painting.name = `company-wall-painting-${slot}`;
    painting.position.set(3.98, 3.45, slot === 0 ? -5.2 : -.5);
    painting.rotation.y = -Math.PI / 2;
    wallPaintings[slot] = painting;
    scene.add(painting);
  });
}

function makeCalendar() {
  const centerX = -8.65;
  const boardZ = -7.24;
  const boardFrontZ = -7.1;
  const columns = 7;
  const rows = 6;
  const cellWidth = .58;
  const cellHeight = .4;
  const gap = .07;
  const gridWidth = columns * cellWidth + (columns - 1) * gap;
  const gridLeft = centerX - gridWidth / 2 + cellWidth / 2;
  const weekdayY = 5.1;
  const firstRowY = 4.62;

  box(10.5, 6.7, .12, materials.blackBrick, -7.55, 3.5, -7.24);
  box(8.08, .24, .34, materials.black, centerX, 6.48, -7.03);
  [-2.45, 0, 2.45].forEach(offset => {
    box(.56, .12, .38, materials.black, centerX + offset, 6.27, -7.0);
    box(.34, .04, .26, materials.brass, centerX + offset, 6.18, -6.97);
    const downlight = new THREE.PointLight(0xffcc82, 8, 5.5, 2);
    downlight.position.set(centerX + offset, 6.05, -6.7);
    scene.add(downlight);
  });
  box(5, 5.15, .16, materials.black, centerX, 3.45, boardZ);
  calendarHeaderSign = sign(['SHOW 1', 'JANUARY 1996'], 4.25, .46, centerX, 5.72, boardFrontZ, 0, { background: '#201f21', border: '#d0a94f' });
  ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].forEach((day, column) => {
    const x = gridLeft + column * (cellWidth + gap);
    sign([day], cellWidth, .25, x, weekdayY, boardFrontZ, 0, { background: '#18181a', border: '#d0a94f', accent: '#f1df9b' });
  });
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = gridLeft + column * (cellWidth + gap);
      const y = firstRowY - row * (cellHeight + gap);
      const tile = box(cellWidth, cellHeight, .06, new THREE.MeshStandardMaterial({ color: 0x27262a, roughness: .72 }), x, y, boardFrontZ);
      const label = sign([''], cellWidth - .08, cellHeight - .08, x, y, boardFrontZ + .04, 0, { background: '#11141d', border: '#4a4c56', accent: '#d8d1c5' });
      calendarCells.push({ tile, label });
    }
  }
  sign(['ACTIVITY DAYS', 'MATCH THE CALENDAR WALL'], 3.35, .36, centerX, 1.1, boardFrontZ, 0, { background: '#18181a', border: '#5e5647', text: '#bdb5a5' });
}

function refreshCalendarWall() {
  const state = getState();
  const show = getShow();
  const leadUp = getLeadUp();
  const currentDate = new Date(`${state.date}T12:00:00`);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const totalDays = new Date(year, month + 1, 0).getDate();
  const ppvDay = new Date(`${state.date}T12:00:00`).getDate();
  const activityDays = [ppvDay - 20, ppvDay - 13, ppvDay - 6];
  const muted = { background: '#11141d', border: '#36363b', accent: '#77736c' };

  calendarCells.forEach((cell, index) => {
    const day = index - firstOffset + 1;
    if (day < 1 || day > totalDays) {
      cell.tile.visible = false;
      cell.label.visible = false;
      return;
    }
    cell.tile.visible = true;
    cell.label.visible = true;
    const slot = activityDays.indexOf(day) + 1;
    const activity = slot ? leadUp.log.find(entry => (entry.slot ?? entry.week) === slot) : null;
    const ppv = day === ppvDay;
    const lines = ppv
      ? ['PPV', String(day), show.name.slice(0, 15)]
      : activity
        ? [`DONE ${slot}`, String(day), 'ACTIVITY']
        : slot
          ? [`ACT ${slot}`, String(day), 'PLAN']
          : ['OFF', String(day)];
    const colors = ppv
      ? { background: '#4a2024', border: '#d3a84e', accent: '#f9e7b7' }
      : activity
        ? { background: '#332924', border: '#a67b38', accent: '#e7c676' }
        : slot
          ? { background: '#262220', border: '#8b6833', accent: '#d3a84e' }
          : muted;
    cell.tile.material.color.set(ppv ? 0x5a252b : activity ? 0x403027 : slot ? 0x312a23 : 0x242429);
    updateSign(cell.label, lines, colors);
  });
}

function makeBookingBoard() {
  const tvX = 6.55;
  const boardX = 10.35;
  const tvFrontZ = -6.58;
  const boardFrontZ = -6.92;
  const whiteboard = new THREE.MeshStandardMaterial({ color: 0xd8d8cf, roughness: .72 });
  const show = getShow();
  const branding = getState().eventBranding[show.eventId] || {};
  const event = PPV_CALENDAR.find(entry => entry.id === show.eventId);
  const ppvLogo = logoUrl(branding.logoId || event?.logoId || 'generated', branding.name || show.name, branding.color || event?.color, branding.logoStyle);
  const stickyYellow = new THREE.MeshStandardMaterial({ color: 0xf1d66d, roughness: .82 });
  const stickyBlue = new THREE.MeshStandardMaterial({ color: 0x8fbac2, roughness: .82 });
  const stickyPink = new THREE.MeshStandardMaterial({ color: 0xe4a1a3, roughness: .82 });

  box(8.3, .08, 6.7, materials.walnutGrain, 8.55, .24, -3.65);
  box(8.45, 6.7, .08, materials.bulletinBoard, 8.55, 3.5, -7.08);
  box(.06, 6.7, 6.8, materials.bookingWallpaper, 4.42, 3.5, -3.65);
  box(.06, 6.7, 6.8, materials.bookingWall, 12.84, 3.5, -3.65);
  box(8.75, .25, .18, materials.walnutGrain, 8.55, 6.64, -6.98);
  box(.12, 6.35, .14, materials.walnutGrain, 4.38, 3.5, -6.98);
  box(.12, 6.35, .14, materials.walnutGrain, 12.72, 3.5, -6.98);
  [6.1, 8.55, 11].forEach(x => {
    box(.58, .1, .34, materials.black, x, 6.32, -5.35);
    box(.32, .035, .2, materials.brass, x, 6.25, -5.35);
    const downlight = new THREE.PointLight(0xffd09a, 7, 5, 2);
    downlight.position.set(x, 6.08, -5.25);
    scene.add(downlight);
  });
  box(2.65, 2.35, .7, materials.black, tvX, 2.58, -7.05);
  box(2.3, 1.52, .1, materials.steel, tvX, 2.95, tvFrontZ);
  const staticScreen = new THREE.Mesh(new THREE.PlaneGeometry(2.12, 1.3), new THREE.MeshBasicMaterial({ map: staticTexture(2.12 / 1.3) }));
  staticScreen.position.set(tvX, 2.95, tvFrontZ + .06);
  scene.add(staticScreen);
  bookingBoardSign = sign(['THE FIRST NIGHT', 'TWO WEEKS AWAY', 'CARD: UNBOOKED'], 1.58, .86, tvX, 2.95, tvFrontZ + .1, 0, { background: '#261518', border: '#c49a46', accent: '#db3540' });
  box(2.95, .55, .95, materials.black, tvX, 1.11, -7.05);
  box(2.35, .14, .06, materials.steel, tvX, 1.21, tvFrontZ + .04);
  box(.42, .1, .5, materials.black, tvX - .9, .75, -7.05);
  box(.42, .1, .5, materials.black, tvX + .9, .75, -7.05);
  box(.2, 1.15, .62, materials.black, tvX - 1.12, .62, -7.05);
  box(.2, 1.15, .62, materials.black, tvX + 1.12, .62, -7.05);
  for (let speaker = 0; speaker < 4; speaker += 1) box(.08, .36, .03, materials.steel, tvX - 1.02 + speaker * .13, 1.98, tvFrontZ + .07);
  box(.24, .08, .2, materials.steel, tvX, 3.81, -7.05);
  const leftAntenna = box(.05, .78, .05, materials.steel, tvX - .18, 4.11, -7.05);
  const rightAntenna = box(.05, .78, .05, materials.steel, tvX + .18, 4.11, -7.05);
  leftAntenna.rotation.z = -.38;
  rightAntenna.rotation.z = .38;

  box(2.95, 3.25, .08, materials.black, boardX, 3.15, -7.03);
  box(2.6, 2.88, .05, whiteboard, boardX, 3.15, boardFrontZ);
  box(3.05, .12, .12, materials.steel, boardX, 4.78, boardFrontZ - .03);
  box(3.05, .12, .12, materials.steel, boardX, 1.52, boardFrontZ - .03);
  box(.12, 3.2, .12, materials.steel, boardX - 1.45, 3.15, boardFrontZ - .03);
  box(.12, 3.2, .12, materials.steel, boardX + 1.45, 3.15, boardFrontZ - .03);
  sign(['BOOKING NOTES'], 1.45, .28, boardX, 4.45, boardFrontZ + .05, 0, { background: '#d8d8cf', border: '#34363a', accent: '#24262b', text: '#24262b' });
  sign(['MAIN EVENT'], .78, .18, boardX - .46, 3.75, boardFrontZ + .06, 0, { background: '#d8d8cf', border: '#b33b36', accent: '#b33b36', text: '#b33b36' });
  sign(['TITLE MATCH'], .84, .18, boardX + .42, 3.35, boardFrontZ + .06, 0, { background: '#d8d8cf', border: '#34729a', accent: '#34729a', text: '#34729a' });
  sign(['BUILD HEAT'], .72, .18, boardX - .35, 2.85, boardFrontZ + .06, 0, { background: '#d8d8cf', border: '#3c8b59', accent: '#3c8b59', text: '#3c8b59' });
  sign(['PROMO: LOCAL TV', 'ANGLE: OPEN SHOW HOT'], 1.68, .34, boardX, 2.42, boardFrontZ + .06, 0, { background: '#d8d8cf', border: '#d8d8cf', accent: '#1d4b73', text: '#1d4b73' });
  sign(['CALL AGENT', 'LOCK FINISH'], 1.32, .3, boardX, 1.82, boardFrontZ + .06, 0, { background: '#d8d8cf', border: '#d8d8cf', accent: '#7b2530', text: '#7b2530' });
  box(.34, .28, .025, stickyYellow, boardX - .92, 2.32, boardFrontZ + .065);
  box(.32, .3, .025, stickyBlue, boardX + .98, 2.42, boardFrontZ + .065);
  box(.28, .25, .025, stickyPink, boardX + .72, 1.98, boardFrontZ + .065);
  ppvLogoDisplay = new THREE.Mesh(
    new THREE.PlaneGeometry(1.72, 1.02),
    new THREE.MeshBasicMaterial({ map: imageTexture(ppvLogo), transparent: true, fog: false, side: THREE.DoubleSide, toneMapped: false }),
  );
  box(1.9, 1.18, .04, materials.black, 8.55, 5.55, -6.98);
  ppvLogoDisplay.position.set(8.55, 5.55, -6.94);
  scene.add(ppvLogoDisplay);
  box(1.25, 1.64, .05, materials.black, tvX, 5.38, -6.99);
  bookingPosterMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.15 * 4 / 3),
    new THREE.MeshBasicMaterial({ map: bookingPosterTexture(), fog: false, toneMapped: false }),
  );
  bookingPosterMesh.position.set(tvX, 5.38, -6.95);
  scene.add(bookingPosterMesh);
  box(2.7, .08, .18, materials.steel, boardX, 1.35, boardFrontZ - .12);
  box(3.6, .16, 1.15, materials.steel, tvX, 1.25, -7.05);
  box(.16, .85, .9, materials.black, tvX - 1.35, .78, -7.05);
  box(.16, .85, .9, materials.black, tvX + 1.35, .78, -7.05);
}

// The right wall of the Booking Board room: a physical shelf of VHS tapes, one per
// completed show, that grows in order as the promotion runs events. Backed by the
// lightweight `state.archive` record (name/date/matches/results only, capped at 240)
// rather than the heavier `state.results`, so it can hold far more shows without
// bloating every autosave. Shelf rows are built lazily as the archive grows, up to
// the wall's physical limit (VHS_MAX_ROWS x VHS_COLS); once full, the shelf shows
// the most recent tapes and keeps scrolling forward.
const VHS_WALL_X = 12.84;
const VHS_SHELF_DEPTH = .3;
const VHS_SHELF_X = VHS_WALL_X - VHS_SHELF_DEPTH / 2 - .05;
const VHS_COLS = 14;
const VHS_Z_START = -6.6;
const VHS_Z_END = -.6;
const VHS_COL_PITCH = (VHS_Z_END - VHS_Z_START) / VHS_COLS;
const VHS_ROW_PITCH = .65;
const VHS_Y_START = 1;
const VHS_MAX_ROWS = 8;
let vhsBuiltRows = 0;

function vhsSpineTexture(entry) {
  const canvas = document.createElement('canvas');
  canvas.width = 112;
  canvas.height = 440;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const branding = entry.eventBranding || {};
  const color = branding.color || '#3a3a3a';
  const event = PPV_CALENDAR.find(item => item.id === entry.eventId);
  const eventName = (branding.name || entry.showName || 'SHOW').toUpperCase();
  const rawDate = entry.date || '';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? `${rawDate}T12:00:00` : rawDate);
  const dateText = !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
    : rawDate.toUpperCase();

  const draw = logoImage => {
    const { width, height } = canvas;
    ctx.fillStyle = '#111214';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#25272b';
    ctx.fillRect(6, 6, width - 12, height - 12);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(6, 6, width - 12, height - 12);

    const logoBox = { x: 22, y: 18, size: width - 44 };
    if (logoImage?.naturalWidth) {
      const scale = Math.min(logoBox.size / logoImage.naturalWidth, logoBox.size / logoImage.naturalHeight);
      const w = logoImage.naturalWidth * scale;
      const h = logoImage.naturalHeight * scale;
      ctx.drawImage(logoImage, logoBox.x + (logoBox.size - w) / 2, logoBox.y + (logoBox.size - h) / 2, w, h);
    }

    // Spine text runs along the tape, reading top to bottom.
    const textTop = logoBox.y + logoBox.size + 12;
    const textLength = height - textTop - 16;
    ctx.save();
    ctx.translate(width / 2, textTop + textLength / 2);
    ctx.rotate(Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let titleSize = 26;
    ctx.font = `600 ${titleSize}px 'Barlow Condensed', 'Franklin Gothic Medium', sans-serif`;
    while (titleSize > 14 && ctx.measureText(eventName).width > textLength) {
      titleSize -= 1;
      ctx.font = `600 ${titleSize}px 'Barlow Condensed', 'Franklin Gothic Medium', sans-serif`;
    }
    ctx.fillStyle = '#f4ead6';
    ctx.fillText(eventName, 0, -9, textLength);
    ctx.font = '500 9px "DM Mono", "Courier New", monospace';
    ctx.fillStyle = '#a7aaae';
    ctx.fillText(dateText, 0, 16, textLength);
    ctx.restore();

    texture.needsUpdate = true;
  };
  draw(null);
  const logoSrc = logoUrl(branding.logoId || event?.logoId || 'generated', branding.name || eventName, color, branding.logoStyle);
  if (logoSrc) {
    const image = new Image();
    image.onload = () => draw(image);
    image.src = logoSrc;
  }
  return texture;
}

function updateVhsSpine(slot, entry) {
  slot.spine.material.map?.dispose();
  slot.spine.material.map = vhsSpineTexture(entry);
  slot.spine.material.needsUpdate = true;
}

// Builds one more row of shelf (board + brass trim + VHS_COLS empty slots) on the
// wall, from the bottom up, without exceeding VHS_MAX_ROWS (the point the wall
// physically runs out of room).
function buildVhsShelfRow(row) {
  const shelfY = VHS_Y_START + row * VHS_ROW_PITCH;
  const zSpan = VHS_Z_END - VHS_Z_START;
  const zMid = VHS_Z_START + zSpan / 2;
  box(VHS_SHELF_DEPTH, .045, zSpan + .2, materials.walnut, VHS_SHELF_X, shelfY - .34, zMid);
  box(VHS_SHELF_DEPTH + .03, .01, zSpan + .22, materials.brass, VHS_SHELF_X - .015, shelfY - .31, zMid);
  for (let col = 0; col < VHS_COLS; col += 1) {
    const z = VHS_Z_START + col * VHS_COL_PITCH + VHS_COL_PITCH / 2;
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(.58, .55, .14), materials.black);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    const spine = new THREE.Mesh(
      new THREE.PlaneGeometry(.14, .55),
      new THREE.MeshBasicMaterial({ toneMapped: false }),
    );
    spine.position.set(-.295, 0, 0);
    spine.rotation.y = -Math.PI / 2;
    group.add(spine);
    group.position.set(VHS_SHELF_X, shelfY, z);
    group.visible = false;
    scene.add(group);
    vhsTapeSlots.push({ group, spine });
  }
  vhsBuiltRows += 1;
}

function ensureVhsShelfRows(tapeCount) {
  const rowsNeeded = Math.min(VHS_MAX_ROWS, Math.max(1, Math.ceil(tapeCount / VHS_COLS)));
  while (vhsBuiltRows < rowsNeeded) buildVhsShelfRow(vhsBuiltRows);
}

function makeVhsShelf() {
  const zMid = VHS_Z_START + (VHS_Z_END - VHS_Z_START) / 2;
  vhsArchiveSign = sign(['VHS ARCHIVE', 'EMPTY SHELF'], 1.5, .34, VHS_WALL_X - .13, 6.15, zMid, -Math.PI / 2, { background: '#171412', border: '#c59a4c', accent: '#d9b86d' });
  ensureVhsShelfRows(1);
}

// state.archive is newest-first and capped at 240; the shelf is walked oldest-first
// so tapes fill in the order the shows actually happened. Once the archive outgrows
// the wall's physical capacity, only the most recent tapes that fit are displayed.
function refreshVhsShelf() {
  const archive = getState().archive ?? [];
  const signature = `${archive.length}|${archive[0]?.eventId}|${archive[0]?.date}`;
  if (signature === vhsSignature) return;
  vhsSignature = signature;
  ensureVhsShelfRows(archive.length);
  const visible = archive.slice(0, vhsTapeSlots.length);
  const ordered = [...visible].reverse();
  vhsTapeSlots.forEach((slot, index) => {
    const entry = ordered[index];
    if (!entry) { slot.group.visible = false; return; }
    slot.group.visible = true;
    updateVhsSpine(slot, entry);
  });
  const capacity = VHS_MAX_ROWS * VHS_COLS;
  const shelfLabel = !archive.length
    ? 'EMPTY SHELF'
    : archive.length > capacity
      ? `${capacity} ON SHELF / ${archive.length} TOTAL`
      : `${archive.length}/${capacity} SHOWS`;
  updateSign(vhsArchiveSign, ['VHS ARCHIVE', shelfLabel], { background: '#171412', border: '#c59a4c', accent: '#d9b86d' });
}

// Mirrors activeTrophyExhibits()/activeLoungeExhibits(): one browsable stop per
// filled tape slot, converted back to the original state.archive index on select.
function activeVhsExhibits() {
  const archive = getState().archive ?? [];
  const visible = archive.slice(0, vhsTapeSlots.length);
  const ordered = [...visible].reverse();
  return ordered.map((entry, index) => {
    const slot = vhsTapeSlots[index];
    if (!slot) return null;
    const { x, y, z } = slot.group.position;
    return {
      name: (entry.eventBranding?.name || entry.showName || 'SHOW').toUpperCase(),
      description: `${entry.date} \u00b7 Rating ${entry.rating} \u00b7 ${entry.stars}`,
      position: [x - 1.1, y, z],
      lookAt: [x, y, z],
      archiveIndex: visible.length - 1 - index,
    };
  }).filter(Boolean);
}

// A subtly stitched leather look for belt straps — cheap canvas texture, tiled.
function leatherTexture(hex) {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 128;
  textureCanvas.height = 64;
  const context = textureCanvas.getContext('2d');
  context.fillStyle = hex;
  context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
  for (let i = 0; i < 260; i += 1) {
    context.fillStyle = `rgba(255,255,255,${(Math.random() * 0.05).toFixed(3)})`;
    context.fillRect(Math.random() * textureCanvas.width, Math.random() * textureCanvas.height, 1, 1);
  }
  context.strokeStyle = 'rgba(230,200,140,.35)';
  context.setLineDash([3, 3]);
  context.lineWidth = 1.5;
  context.strokeRect(5, 5, textureCanvas.width - 10, textureCanvas.height - 10);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  return texture;
}

// Two title color schemes: gold-forward for the world belt, red-and-black for the tag title.
const BELT_SCHEMES = {
  gold: {
    strap: new THREE.MeshStandardMaterial({ map: leatherTexture('#100e0c'), roughness: .82 }),
    plate: materials.gold,
    center: materials.black,
    accent: materials.gold,
    monogramAccent: '#f4d98a',
  },
  redBlack: {
    strap: new THREE.MeshStandardMaterial({ map: leatherTexture('#120e0e'), roughness: .82 }),
    plate: materials.black,
    center: materials.red,
    accent: materials.red,
    monogramAccent: '#f08088',
  },
};

function makeChampionshipBelt(x, y, z, initials, scheme, { scale = 1, rotationY = 0 } = {}) {
  const belt = new THREE.Group();
  const strap = new THREE.Mesh(new THREE.BoxGeometry(1.15, .34, .07), scheme.strap);
  const centerPlate = new THREE.Mesh(new THREE.CylinderGeometry(.27, .32, .07, 20), scheme.plate);
  centerPlate.rotation.x = Math.PI / 2;
  const centerRing = new THREE.Mesh(new THREE.TorusGeometry(.22, .022, 10, 24), scheme.accent);
  centerRing.rotation.x = Math.PI / 2;
  centerRing.position.z = .04;
  const innerPlate = new THREE.Mesh(new THREE.CylinderGeometry(.16, .19, .085, 20), scheme.center);
  innerPlate.rotation.x = Math.PI / 2;
  innerPlate.position.z = .05;
  const monogram = new THREE.Mesh(new THREE.PlaneGeometry(.22, .11), new THREE.MeshBasicMaterial({ map: textTexture([initials], { background: '#171719', border: '#171719', accent: scheme.monogramAccent }) }));
  monogram.position.set(0, 0, .095);
  belt.add(strap, centerPlate, centerRing, innerPlate, monogram);
  [-.42, .42].forEach(offset => {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(.1, .13, .065, 16), scheme.plate);
    plate.rotation.x = Math.PI / 2;
    plate.position.set(offset, 0, .035);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.075, .013, 8, 16), scheme.accent);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(offset, 0, .07);
    belt.add(plate, ring);
  });
  [-.58, .58].forEach(offset => {
    const outerPlate = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, .05, 12), scheme.plate);
    outerPlate.rotation.x = Math.PI / 2;
    outerPlate.position.set(offset, 0, .028);
    belt.add(outerPlate);
  });
  [-.5, .5].forEach(side => {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(.3, .5, .05), scheme.strap);
    tail.position.set(side, -.4, .01);
    tail.rotation.z = side > 0 ? -.1 : .1;
    belt.add(tail);
  });
  belt.scale.setScalar(scale);
  belt.rotation.y = rotationY;
  belt.position.set(x, y, z);
  scene.add(belt);
  return belt;
}

// Championship mounts use the actual belt artwork rather than a simplified mesh.
function makeChampionshipDisplay(x, y, z, beltUrl, label, { width, height }) {
  const frameWidth = width + .2;
  const frameHeight = Math.max(height + .58, 1.3);
  box(frameWidth, frameHeight, .04, materials.gold, x, y, z + .14);
  box(frameWidth - .18, frameHeight - .18, .08, materials.burgundy, x, y, z + .1);
  const belt = new THREE.Mesh(
    new THREE.PlaneGeometry(width * .58, height * .58),
    new THREE.MeshBasicMaterial({ map: imageTexture(beltUrl), transparent: true, alphaTest: .02, fog: false, side: THREE.DoubleSide, toneMapped: false }),
  );
  belt.position.set(x, y + .14, z + .02);
  belt.rotation.y = Math.PI;
  scene.add(belt);
  sign([label], 1.35, .26, x, y - .62, z + .05, Math.PI, { background: '#0f0d0c', border: '#d1ae59', accent: '#d1ae59' });
  const spot = new THREE.PointLight(0xffe3b0, 13, 5.2, 2);
  spot.position.set(x, y + 1.4, z - .8);
  scene.add(spot);
}

const TROPHY_SHELF_ROWS = 5;
const TROPHY_SHELF_COLS = 7;
const trophyDisplays = [];
const trophyBronze = new THREE.MeshStandardMaterial({ color: 0xa96739, roughness: .36, metalness: .72 });
const trophySilver = new THREE.MeshStandardMaterial({ color: 0xbec5ca, roughness: .24, metalness: .9 });
const trophyGem = new THREE.MeshPhysicalMaterial({ color: 0x9d2230, roughness: .18, metalness: .15, transmission: .15 });

function trophyMaterial(tier) {
  if (tier === 'gold') return materials.gold;
  if (tier === 'silver') return trophySilver;
  return trophyBronze;
}

function addStar(group, material, y, scale = 1) {
  const shape = new THREE.Shape();
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 ? .075 : .16;
    const angle = -Math.PI / 2 + point * Math.PI / 5;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (point === 0) shape.moveTo(x, z); else shape.lineTo(x, z);
  }
  const star = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .045, bevelEnabled: true, bevelSize: .012, bevelThickness: .012 }), material);
  star.rotation.y = Math.PI / 2;
  star.scale.setScalar(scale);
  star.position.y = y;
  group.add(star);
}

function makeAchievementTrophy(definition, index, x, y, z) {
  const trophy = new THREE.Group();
  const metal = trophyMaterial(definition.tier);
  const base = new THREE.Mesh(new THREE.BoxGeometry(.26, .07, .3), materials.black);
  base.position.y = .035;
  trophy.add(base);

  const shape = index % 9;
  if (shape === 0) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.035, .055, .2, 10), metal);
    stem.position.y = .16;
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(.13, .065, .16, 16, 1, true), metal);
    bowl.position.y = .32;
    trophy.add(stem, bowl);
  } else if (shape === 1) {
    addStar(trophy, metal, .27, 1.05);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.025, .045, .15, 10), metal);
    stem.position.y = .14;
    trophy.add(stem);
  } else if (shape === 2) {
    const globe = new THREE.Mesh(new THREE.SphereGeometry(.14, 18, 12), metal);
    globe.position.y = .3;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.17, .018, 8, 24), metal);
    ring.rotation.x = Math.PI / 2.7;
    ring.position.y = .3;
    trophy.add(globe, ring);
  } else if (shape === 3) {
    const obelisk = new THREE.Mesh(new THREE.ConeGeometry(.13, .42, 4), metal);
    obelisk.position.y = .27;
    obelisk.rotation.y = Math.PI / 4;
    trophy.add(obelisk);
  } else if (shape === 4) {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .055, 24), metal);
    coin.rotation.z = Math.PI / 2;
    coin.position.y = .27;
    const inset = new THREE.Mesh(new THREE.TorusGeometry(.105, .014, 8, 20), trophyGem);
    inset.rotation.y = Math.PI / 2;
    inset.position.set(-.035, .27, 0);
    trophy.add(coin, inset);
  } else if (shape === 5) {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(.075, .1, .31, 8), metal);
    column.position.y = .22;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(.16, .16, 6), trophyGem);
    crown.position.y = .45;
    trophy.add(column, crown);
  } else if (shape === 6) {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(.16, .035, 10, 28, Math.PI), metal);
    arch.rotation.z = Math.PI;
    arch.position.y = .28;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.09), trophyGem);
    gem.position.y = .29;
    trophy.add(arch, gem);
  } else if (shape === 7) {
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(.16, .13, .055, 6), metal);
    shield.rotation.z = Math.PI / 2;
    shield.position.y = .28;
    const boss = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 8), trophyGem);
    boss.position.set(-.045, .28, 0);
    trophy.add(shield, boss);
  } else {
    const figure = new THREE.Mesh(new THREE.CapsuleGeometry(.06, .2, 6, 10), metal);
    figure.position.y = .27;
    figure.rotation.z = -.18;
    const arms = new THREE.Mesh(new THREE.BoxGeometry(.05, .25, .05), metal);
    arms.position.y = .3;
    arms.rotation.z = Math.PI / 2;
    trophy.add(figure, arms);
  }

  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(.34, .11),
    new THREE.MeshBasicMaterial({ map: textTexture([definition.name.toUpperCase().slice(0, 18)], { background: '#17120d', border: '#b68b42', accent: '#e6cf91' }), side: THREE.DoubleSide }),
  );
  plate.rotation.y = -Math.PI / 2;
  plate.position.set(-.17, .12, 0);
  trophy.add(plate);
  trophy.position.set(x, y, z);
  trophy.visible = false;
  trophy.userData.trophyId = definition.id;
  scene.add(trophy);
  trophyDisplays.push({ id: definition.id, group: trophy });
}

// An elegant lit shelving unit with a distinct sculpture and nameplate for every award.
function makeTrophyWall() {
  const wallX = 11.85;
  const shelfDepth = .55;
  const shelfX = wallX - shelfDepth / 2 - .1;
  const zStart = 1.15;
  const zEnd = 6.3;
  const zSpan = zEnd - zStart;
  const colPitch = zSpan / TROPHY_SHELF_COLS;
  const shelfYs = [1.25, 2.1, 2.95, 3.8, 4.65];
  sign(['TROPHY WALL'], 2.1, .5, wallX - .13, 5.55, 3.72, -Math.PI / 2, { background: '#1a1418', border: '#d1ae59', accent: '#d1ae59' });
  shelfYs.forEach(shelfY => {
    box(shelfDepth, .06, zSpan + .3, materials.walnut, shelfX, shelfY, zStart + zSpan / 2);
    box(shelfDepth + .04, .015, zSpan + .32, materials.gold, shelfX - .02, shelfY + .04, zStart + zSpan / 2);
    const spot = new THREE.PointLight(0xffdca0, 8, 2.8, 2);
    spot.position.set(shelfX + .35, shelfY + .6, zStart + zSpan / 2);
    scene.add(spot);
    for (let col = 0; col < TROPHY_SHELF_COLS; col += 1) {
      const z = zStart + col * colPitch + colPitch / 2;
      const cupX = shelfX - shelfDepth / 2 + .1;
      const cupY = shelfY + .045;
      const trophyIndex = shelfYs.indexOf(shelfY) * TROPHY_SHELF_COLS + col;
      const definition = TROPHIES[trophyIndex];
      if (definition) makeAchievementTrophy(definition, trophyIndex, cupX, cupY, z);
      const marker = new THREE.Mesh(new THREE.RingGeometry(.09, .115, 16), new THREE.MeshBasicMaterial({ color: 0x2a2015, side: THREE.DoubleSide }));
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(cupX, shelfY + .034, z);
      scene.add(marker);
    }
  });
}

// Each physical sculpture corresponds to one specific achievement.
function refreshTrophyWall() {
  const earned = getState().trophies;
  trophyDisplays.forEach(display => { display.group.visible = Boolean(earned[display.id]); });
}

// A wood-and-brass perpetual plaque, styled after real trophy-room record boards:
// a gold nameplate header, then one small brass row per company record.
function recordPlaqueTexture() {
  const state = getState();
  const width = 460;
  const height = 620;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4a3222';
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 36; i += 1) {
    ctx.strokeStyle = `rgba(20,12,6,${(0.05 + Math.random() * 0.06).toFixed(3)})`;
    const gy = Math.random() * height;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.bezierCurveTo(width * .3, gy + Math.random() * 18 - 9, width * .7, gy + Math.random() * 18 - 9, width, gy);
    ctx.stroke();
  }
  ctx.strokeStyle = '#2a1c12';
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, width - 16, height - 16);

  ctx.fillStyle = '#14100c';
  ctx.fillRect(42, 32, width - 84, 92);
  ctx.strokeStyle = '#d1ae59';
  ctx.lineWidth = 5;
  ctx.strokeRect(42, 32, width - 84, 92);
  ctx.fillStyle = '#d8b563';
  ctx.textAlign = 'center';
  ctx.font = '700 27px Georgia, serif';
  ctx.fillText('RECORD BOOK', width / 2, 72);
  ctx.font = '600 14px Georgia, serif';
  ctx.fillText(`${getCompanyIdentity().name.toUpperCase()} \u00b7 COMPANY BESTS`, width / 2, 100);
  [[56, 44], [width - 56, 44], [56, 112], [width - 56, 112]].forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#e7cf8e';
    ctx.fill();
  });

  let y = 156;
  RECORD_DEFS.forEach(def => {
    const record = state.records[def.id];
    ctx.fillStyle = '#111214';
    ctx.fillRect(42, y, width - 84, 50);
    ctx.strokeStyle = '#39352c';
    ctx.lineWidth = 1;
    ctx.strokeRect(42, y, width - 84, 50);
    [[52, y + 10], [width - 52, y + 10], [52, y + 40], [width - 52, y + 40]].forEach(([sx, sy2]) => {
      ctx.beginPath();
      ctx.arc(sx, sy2, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = '#8f7744';
      ctx.fill();
    });
    ctx.textAlign = 'left';
    ctx.fillStyle = '#d8b563';
    ctx.font = '700 13px Georgia, serif';
    ctx.fillText(def.label.toUpperCase(), 64, y + 20);
    ctx.font = '600 13px Georgia, serif';
    ctx.fillStyle = record ? '#f0e2c0' : '#6b6558';
    ctx.fillText(record ? `${record.holder} \u00b7 ${def.format(record.value)}` : 'Not yet set', 64, y + 38);
    y += 58;
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

let recordPlaqueMesh = null;
function makeRecordBookPlaque(x, y, z) {
  box(.06, 1.95, 1.45, materials.walnut, x - .1, y, z);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 1.78), new THREE.MeshBasicMaterial({ map: recordPlaqueTexture() }));
  mesh.position.set(x + .02, y, z);
  mesh.rotation.y = Math.PI / 2;
  scene.add(mesh);
  recordPlaqueMesh = mesh;
  const spot = new THREE.PointLight(0xffdca0, 8, 3.6, 2);
  spot.position.set(x + .9, y + .7, z);
  scene.add(spot);
}

function refreshRecordPlaque() {
  if (!recordPlaqueMesh) return;
  recordPlaqueMesh.material.map?.dispose();
  recordPlaqueMesh.material.map = recordPlaqueTexture();
  recordPlaqueMesh.material.needsUpdate = true;
}

// A retro digital scoreboard for the player's own career — LED-style progress bars
// instead of another framed photo, since this is about the promoter, not a wrestler.
function careerDisplayTexture() {
  const state = getState();
  const career = state.career;
  const width = 560;
  const height = 560;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#05130c';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#173423';
  ctx.lineWidth = 12;
  ctx.strokeRect(7, 7, width - 14, height - 14);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7cffb2';
  ctx.font = '700 28px "Courier New", monospace';
  ctx.fillText('CAREER LEDGER', width / 2, 52);
  ctx.strokeStyle = '#2c5c3f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(32, 68);
  ctx.lineTo(width - 32, 68);
  ctx.stroke();

  const shortMoney = value => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${Math.round(value / 1000)}K`;
    return `$${Math.round(value)}`;
  };

  function bar(label, pct, readout, y) {
    const clamped = Math.max(0, Math.min(1, pct));
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8fffc0';
    ctx.font = '600 15px "Courier New", monospace';
    ctx.fillText(label, 32, y);
    ctx.fillStyle = '#0d2318';
    ctx.fillRect(32, y + 10, width - 64, 22);
    ctx.fillStyle = '#38f79a';
    ctx.fillRect(32, y + 10, (width - 64) * clamped, 22);
    ctx.strokeStyle = '#2c5c3f';
    ctx.lineWidth = 2;
    ctx.strokeRect(32, y + 10, width - 64, 22);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#c9ffe0';
    ctx.font = '700 14px "Courier New", monospace';
    ctx.fillText(readout, width - 34, y + 27);
  }

  const avgRating = career.showsRun ? Math.round(career.totalRatingSum / career.showsRun) : 0;
  const trophyCount = Object.keys(state.trophies).length;
  let y = 106;
  bar('SHOWS RUN', career.showsRun / Math.max(24, career.showsRun), `${career.showsRun}`, y);
  y += 68;
  bar('TOTAL REVENUE', career.totalRevenue / 10000000, shortMoney(career.totalRevenue), y);
  y += 68;
  bar('TROPHIES EARNED', trophyCount / TROPHIES.length, `${trophyCount}/${TROPHIES.length}`, y);
  y += 68;
  bar('AVG SHOW RATING', avgRating / 100, `${avgRating}`, y);
  y += 82;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#38f79a';
  ctx.font = '700 16px "Courier New", monospace';
  ctx.fillText(`FIVE-STAR CLASSICS ${String(career.fiveStarMatches).padStart(2, '0')}`, 32, y);
  y += 30;
  ctx.fillText(`CAREER STAR TOTAL  ${career.totalStars.toFixed(1)}\u2605`, 32, y);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

let careerDisplayMesh = null;
function makeCareerDisplayPlaque(x, y, z) {
  box(.06, 1.5, 1.5, materials.black, x - .1, y, z);
  box(.025, 1.58, 1.58, materials.gold, x - .13, y, z);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: careerDisplayTexture() }));
  mesh.position.set(x + .02, y, z);
  mesh.rotation.y = Math.PI / 2;
  scene.add(mesh);
  careerDisplayMesh = mesh;
  const spot = new THREE.PointLight(0x8fffc0, 6, 3.2, 2);
  spot.position.set(x + .8, y + .5, z);
  scene.add(spot);
}

function refreshCareerDisplay() {
  if (!careerDisplayMesh) return;
  careerDisplayMesh.material.map?.dispose();
  careerDisplayMesh.material.map = careerDisplayTexture();
  careerDisplayMesh.material.needsUpdate = true;
}

function makeTrophyGallery() {
  box(5.7, .2, 6.5, materials.burgundy, 9.1, .12, 3.7);
  box(.25, 6.5, 6.5, materials.black, 11.85, 3.2, 3.7);
  box(.25, 6.5, 6.5, materials.black, 6.25, 3.2, 3.7);
  box(5.7, 6.5, .25, materials.black, 9.1, 3.2, 6.95);

  // Back wall, centered column: newspapers up top, championship belts below.
  framedClipping('The Archive', 'A Company Is Born', .72, 1.1, 8.15, 4.5, 6.78, Math.PI);
  framedClipping('Match Of The Year', 'Five Stars In The Main Event', .72, 1.1, 9.1, 4.5, 6.78, Math.PI);
  framedClipping('Hall Of Fame', 'The Night Everything Changed', .72, 1.1, 10.05, 4.5, 6.78, Math.PI, { headlineY: 130 });
  makeChampionshipDisplay(7.85, 2.15, 6.6, worldChampBeltUrl, 'WORLD HEAVYWEIGHT TITLE', { width: 1.68, height: 1.01 });
  makeChampionshipDisplay(10.35, 2.15, 6.6, tagBeltUrl, 'TAG TEAM TITLE', { width: 1.86, height: .63 });

  // Right wall: the trophy shelving.
  makeTrophyWall();

  // Left wall, directly opposite the shelving: the centered record book.
  makeRecordBookPlaque(6.55, 3.2, 3.7);
}


function makeLights() {
  scene.add(new THREE.HemisphereLight(0x8090a4, 0x271714, 1.1));
  const windowLight = new THREE.DirectionalLight(0xc1d0ef, 2.1);
  windowLight.position.set(0, 8, 9);
  scene.add(windowLight);
  const warm = new THREE.PointLight(0xffb155, 22, 17, 2);
  warm.position.set(5.5, 5.3, -1.5);
  scene.add(warm);
  const gallery = new THREE.PointLight(0xffd68b, 18, 9, 2);
  gallery.position.set(9, 4.9, 4.2);
  scene.add(gallery);
  scene.add(gallerySpotlight);
  const ringLight = new THREE.PointLight(0xc03942, 13, 8, 2);
  ringLight.position.set(-8.5, 3, 0);
  scene.add(ringLight);
}

makeArchitecture();
makeExecutiveOffice();
makeRingView();
makeLounge();
makeDesk();
makeCompanyWall();
makeCalendar();
makeBookingBoard();
makeVhsShelf();
makeTrophyGallery();
makeLights();

const stations = [
  { name: 'CALENDAR WALL', description: 'Plan your week and protect your energy', position: [-8.65, 3.05, -1.35], lookAt: [-8.65, 3.25, -7], panel: 'calendar' },
  { name: 'FINANCE DESK', description: 'Tickets, cash, pricing, and the company ledger', position: [-1.1, 2.6, -.5], lookAt: [-.8, 1.25, -2.12], panel: 'finances' },
  { name: 'COMPUTER', description: 'Company intelligence, roster, news, and email', position: [.25, 2.25, .2], lookAt: [.25, 1.35, -2.5], panel: 'computer' },
  { name: 'BOOKING BOARD', description: 'Build the first card. You do not choose winners.', position: [8.4, 2.7, -.1], lookAt: [8.8, 3.2, -7], panel: 'booking' },
  { name: 'VHS ARCHIVE', description: 'Every show ever run, in order — pick a tape to relive it', position: [11.3, 2.7, -3.6], lookAt: [12.7, 2.7, -3.6], panel: 'vhsShelf' },
  { name: 'TROPHY GALLERY', description: 'Archive, milestones, and championship history', position: [8.5, 3.6, -.55], lookAt: [9.1, 2.4, 4.55], panel: 'trophies' },
  { name: 'THE LOUNGE', description: 'A quiet skyline retreat between big decisions', position: [-7.55, 2.85, 2.15], lookAt: [-7.55, 1.9, 5.6], panel: 'lounge' },
  { name: 'GM LEGACY', description: 'Your career plaque, company emblem, and purchased paintings', position: [-1.1, 3.6, -2.85], lookAt: [3.98, 3.45, -2.85], panel: 'career' },
];

const loungeExhibits = [
  { name: 'VENDING MACHINE', description: 'Match, Promo, Free Agent, and Variety packs', position: [-6.35, 2.2, 2.15], lookAt: [-5.45, 1.95, 6.2], panel: 'packVending' },
  { name: 'CARD BOOK', description: 'Your wrestler, Match, and Promo card collection', position: [-7.47, 1.6, 3.7], lookAt: [-7.47, .69, 4.88], panel: 'cardBook' },
  { name: 'LOUNGE CATALOG', description: 'Browse new furniture, records, and arcade upgrades', position: [-7.55, 2.05, 3.05], lookAt: [-8.19, .7, 4.95], panel: 'loungeCatalog' },
  { itemId: 'vinyl-library', name: 'VINYL LIBRARY', description: 'Browse the collection and set the next record', position: [-9.05, 2.45, 3.35], lookAt: [-12.25, 2.65, 3.35], panel: 'vinylLibrary' },
  { itemId: 'arcade-cabinet', name: 'RIVAL ARCADE', description: 'A private game corner off the main floor', position: [-6.35, 2.05, 3.5], lookAt: [-3.3, 1.5, 3.5], panel: 'arcadeCabinet' },
  { paintingSlot: 0, name: 'LEFT PAINTING', description: 'Choose an owned painting for this wall position', position: [.1, 3.45, -5.2], lookAt: [3.98, 3.45, -5.2], panel: 'wallArt' },
  { paintingSlot: 1, name: 'RIGHT PAINTING', description: 'Choose an owned painting for this wall position', position: [.1, 3.45, -.5], lookAt: [3.98, 3.45, -.5], panel: 'wallArt' },
];

function activeLoungeExhibits() {
  const owned = new Set(getState().lounge?.owned ?? []);
  const displayed = getDisplayedPaintings();
  return loungeExhibits.filter(exhibit => exhibit.paintingSlot != null ? Boolean(displayed[exhibit.paintingSlot]) : !exhibit.itemId || owned.has(exhibit.itemId));
}

const galleryExhibits = [
  { name: 'TROPHY WALL', description: 'Every milestone the company has earned, on display', position: [6.8, 3.9, 4.6], lookAt: [11.6, 2.4, 3.2], panel: 'milestones', light: [10.6, 4.4, 3.7] },
  { name: 'NEWS ARCHIVE', description: 'Classic matches, landmark events, and the Hall of Fame', position: [9.1, 3.4, 2.4], lookAt: [9.1, 4.5, 6.8], panel: 'archive', light: [9.1, 4.6, 6.3] },
  { name: 'CHAMPIONSHIP SHRINE', description: 'Current holders, reigns, and title prestige', position: [9.1, 2.2, 2.6], lookAt: [9.1, 2.5, 6.8], panel: 'belts', light: [9.1, 3.6, 6.3] },
  { name: 'RECORD BOOK', description: 'Company bests, worsts, and season awards', position: [10.1, 3.2, 3.7], lookAt: [6.55, 3.2, 3.7], panel: 'recordbook', light: [7.5, 4, 3.7] },
];

function activeGalleryExhibits() {
  return galleryExhibits;
}

function activeTrophyExhibits() {
  const earned = getState().trophies;
  return trophyDisplays.filter(display => earned[display.id]).map(display => {
    const definition = TROPHIES.find(trophy => trophy.id === display.id);
    const { x, y, z } = display.group.position;
    return {
      name: definition?.name.toUpperCase() ?? 'TROPHY',
      description: definition?.flavor ?? 'Company achievement',
      position: [x - 1.5, y + .3, z],
      lookAt: [x, y + .25, z],
      trophyId: display.id,
      light: [x - .65, y + .85, z],
    };
  });
}

function updateStation(instant = false) {
  const selected = stations[station];
  targetPosition.set(...selected.position);
  targetLookAt.set(...selected.lookAt);
  camera.zoom = selected.name === 'GM LEGACY'
    ? Math.min(1, 2 * targetPosition.distanceTo(targetLookAt) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect / 3.5)
    : 1;
  camera.updateProjectionMatrix();
  stationName.textContent = selected.name;
  stationDescription.textContent = selected.description;
  stationIndex.textContent = `${String(station + 1).padStart(2, '0')} / ${String(stations.length).padStart(2, '0')}`;
  if (instant) {
    camera.position.copy(targetPosition);
    currentLookAt.copy(targetLookAt);
    camera.lookAt(currentLookAt);
  }
}

// So the first time the player exits the mandatory welcome email, they land in front
// of the terminal rather than wherever the camera happened to default to.
function focusComputerStation() {
  const index = stations.findIndex(entry => entry.panel === 'computer');
  if (index === -1) return;
  station = index;
  updateStation(true);
}

function focusCalendarStation() {
  const index = stations.findIndex(entry => entry.panel === 'calendar');
  if (index === -1) return;
  station = index;
  updateStation(true);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2200);
}

let terminalTab = 'rankings';
let statsPage = 'records'; // 'records' | 'belts'
let statsTypeFilter = 'all'; // 'all' or a MATCH_TYPES id
let selectedEmailId = null;
let selectedWrestlerId = null;
let wrestlerDetailTab = 'player';
let profileReturn = null;
let selectedTrophyId = null;
let onboardingStep = 'read';
let rosterFocusId = null;
let rosterSort = { key: 'popularity', dir: 'desc' };

// Dev/testing hook — open the browser console and run RP_DEBUG.killWrestler() (optionally
// with a wrestler id) to preview the tragedy/memorial flow without waiting on the odds.
window.RP_DEBUG = {
  killWrestler(wrestlerId) {
    const result = forceTragedy(wrestlerId ?? null);
    if (!result.ok) {
      console.warn(result.message);
      return result;
    }
    terminalTab = 'email';
    selectedEmailId = result.memorial.emailId;
    openPanel('computer');
    console.log(`${result.memorial.name} has passed away (${result.memorial.cause}). Check the email, then the Trophy Room for the memorial shrine.`);
    return result;
  },
  // RP_DEBUG.formNWO() picks whatever's eligible; pass 'trioA' (HBK/Hall/Nash),
  // 'trioB' (Hogan/Hall/Nash), or 'split' (Hall/Nash turn on each other) to force one.
  formNWO(outcome) {
    const result = forceNWO(outcome ?? null);
    if (!result.ok) {
      console.warn(result.message);
      return result;
    }
    terminalTab = 'email';
    selectedEmailId = result.result.emailId;
    openPanel('computer');
    console.log(`nWo event resolved as "${result.result.outcome}". Check the inbox.`);
    return result;
  },
};

const TROPHY_ROOM_KINDS = new Set(['trophies', 'archive', 'milestones', 'trophyDetail', 'belts', 'recordbook', 'career']);

function statBar(label, value) {
  return `<div class="stat-row"><small>${label}</small><div class="stat-track"><div class="stat-fill" style="width:${value}%"></div></div><b>${value}</b></div>`;
}

function initials(name) {
  return name.split(' ').map(part => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

// Compact text tag (title's short code) for contexts too small for the belt art, like the roster table row.
function championTagHtml(wrestlerId) {
  const titles = isChampion(wrestlerId);
  return titles.length ? `<span class="champion-tag" title="${titles.map(def => def.name).join(', ')}">${titles.map(def => def.short).join(' · ')}</span>` : '';
}

function profileLinkHtml(id, name) {
  return `<button type="button" class="profile-link" data-wrestler="${id}">${name}</button>`;
}

function rosterPortraitHtml(wrestler, className) {
  const url = wrestlerImageUrl(wrestler);
  const body = url ? `<img src="${url}" alt="${wrestler.name}">` : initials(wrestler.name);
  return `<div class="${className}">${body}</div>`;
}

function levelClass(value) {
  if (value >= 70) return 'good';
  if (value >= 40) return 'mid';
  return 'low';
}

const ROSTER_COLUMNS = [
  ['name', 'NAME', true],
  ['style', 'POS', true],
  ['popularity', 'RATE', false],
  ['wins', 'W', false],
  ['losses', 'L', false],
  ['satisfaction', 'SATISFACTION', false],
  ['stamina', 'STAMINA', false],
  ['strength', 'STR', false],
  ['agility', 'AGI', false],
  ['technique', 'TEC', false],
  ['toughness', 'TGH', false],
];

function rosterSortValue(w, key) {
  switch (key) {
    case 'name': return w.name;
    case 'style': return w.style;
    case 'popularity': return w.popularity;
    case 'wins': return w.record.w;
    case 'losses': return w.record.l;
    case 'satisfaction': return moraleFor(w.id);
    case 'stamina': return staminaFor(w.id);
    default: return w.stats[key] ?? 0;
  }
}

function sortedRoster() {
  const list = [...getSignedRoster()];
  const { key, dir } = rosterSort;
  list.sort((a, b) => {
    const av = rosterSortValue(a, key);
    const bv = rosterSortValue(b, key);
    const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
    return dir === 'asc' ? cmp : -cmp;
  });
  return list;
}

function rosterPreviewHtml(w) {
  return `<div class="roster-preview">
    ${rosterPortraitHtml(w, 'roster-preview-photo')}
    <div class="roster-preview-info">
      <small>${w.style.toUpperCase()} · POP ${w.popularity}</small>
      <h3>${w.name}${championTagHtml(w.id)}</h3>
      <span class="card-nickname">"${w.nickname}"</span>
    </div>
    <div class="roster-preview-meta">
      <span><small>HT</small><b>${w.height}</b></span>
      <span><small>WT</small><b>${w.weight} lbs</b></span>
      <span><small>FROM</small><b>${w.hometown}</b></span>
    </div>
    <button class="roster-view-card" type="button" data-wrestler="${w.id}">View Player Card</button>
  </div>`;
}

function rosterTableHtml() {
  const rows = sortedRoster();
  const focusId = rosterFocusId && getWrestlerById(rosterFocusId) ? rosterFocusId : rows[0]?.id;
  return `${focusId ? rosterPreviewHtml(getWrestlerById(focusId)) : ''}
  <div class="roster-table-wrap">
    <table class="roster-table">
      <thead>
        <tr>
          <th class="roster-photo-col"></th>
          ${ROSTER_COLUMNS.map(([key, label]) => `<th><button type="button" class="roster-sort ${rosterSort.key === key ? 'active' : ''}" data-roster-sort="${key}">${label}${rosterSort.key === key ? `<em>${rosterSort.dir === 'asc' ? '▲' : '▼'}</em>` : ''}</button></th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map(w => `
          <tr class="${w.id === focusId ? 'selected' : ''}" data-roster-row="${w.id}">
            <td class="roster-photo-col">${rosterPortraitHtml(w, 'roster-thumb')}</td>
            <td class="roster-name-cell"><b>${w.name}${championTagHtml(w.id)}</b><small>"${w.nickname}"</small></td>
            <td>${w.style}</td>
            <td>${w.popularity}</td>
            <td>${w.record.w}</td>
            <td>${w.record.l}</td>
            <td class="stat-${levelClass(moraleFor(w.id))}">${moraleFor(w.id)}</td>
            <td class="stat-${levelClass(staminaFor(w.id))}">${staminaFor(w.id)}</td>
            <td>${w.stats.strength}</td>
            <td>${w.stats.agility}</td>
            <td>${w.stats.technique}</td>
            <td>${w.stats.toughness}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function wrestlerDetailHtml(id) {
  const w = getWrestlerById(id);
  if (!w) return '<p>Wrestler not found.</p>';
  const partners = topChemistryPartners(id, 3);
  const history = getMatchHistoryFor(id);
  const storyHistory = getPromoHistoryFor(id);
  const gold = statsBeltRows().find(row => row.id === id);
  const backLabel = currentPanelKind === 'cardBook' ? 'CARDS' : profileReturn?.label.toUpperCase() ?? { roster: 'ROSTER', rankings: 'RANKINGS', stats: 'STATS' }[terminalTab] ?? 'ROSTER';
  const playerCard = `<p class="card-bio">${w.bio}</p>
    <div class="card-columns">
      <div>
        <small class="section-label">In-Ring Ratings</small>
        ${statBar('Strength', w.stats.strength)}
        ${statBar('Agility', w.stats.agility)}
        ${statBar('Stamina', w.stats.stamina)}
        ${statBar('Technique', w.stats.technique)}
        ${statBar('Charisma', w.stats.charisma)}
        ${statBar('Toughness', w.stats.toughness)}
        <small class="section-label">Condition</small>
        ${statBar('Satisfaction', moraleFor(w.id))}
        ${statBar('Current Stamina', staminaFor(w.id))}
      </div>
      <div>
        <small class="section-label">Scouting File (Confidential)</small>
        ${statBar('Ego', w.hidden.ego)}
        ${statBar('Work Ethic', w.hidden.workEthic)}
        ${statBar('Risk Tolerance', w.hidden.riskTolerance)}
        ${statBar('Locker Room Impact', w.hidden.lockerRoomImpact)}
        <div class="card-facts"><span>Record ${recordString(w.record)}</span><span>Momentum: ${momentumLabel(w.momentum)} (${w.streak.count}-${w.streak.type})</span><span>Popularity ${w.popularity}</span>${gold?.worldReigns ? `<span>World title: ${gold.worldReigns} reign${gold.worldReigns === 1 ? '' : 's'} · ${gold.worldDays} days</span>` : ''}${gold?.tagReigns ? `<span>Tag titles: ${gold.tagReigns} reign${gold.tagReigns === 1 ? '' : 's'} · ${gold.tagDays} days</span>` : ''}</div>
      </div>
    </div>
    <div class="card-chemistry">
      <small class="section-label">Best Dance Partners</small>
      <div class="chemistry-list">${partners.map(p => `<article><b>${p.wrestler.name}</b><span>${p.score}% chemistry</span><small>${p.notes[0] || 'No strong signal either way.'}</small></article>`).join('')}</div>
    </div>
    <div class="card-history">
      <small class="section-label">Match History</small>
      <div class="history-list">${history.length ? history.map(m => `<article><span class="history-result result-${m.result}">${m.result}</span><div><b>vs. ${m.opponentName}</b><small>${m.event} · ${m.date}</small><p>${m.description}</p></div></article>`).join('') : '<p class="history-empty">No recorded bouts yet.</p>'}</div>
    </div>`;
  const storyTab = `<section class="profile-promo-history">
    <header><small class="section-label">ONE-OFF PROMOS · ${storyHistory.length} PLAYED</small><p>Promo cards are single-show stories. Once played, they stay here in the wrestlers’ record.</p></header>
    ${storyHistory.length ? `<div class="history-list">${storyHistory.map(entry => {
      const owner = getWrestlerById(entry.spotlightId)?.name ?? w.name;
      const opponents = entry.opponentIds.map(opponentId => getWrestlerById(opponentId)?.name ?? opponentId).join(' & ') || 'No opponent listed';
      return `<article class="promo-history-entry"><span class="history-result result-${entry.outcome === 'win' ? 'W' : entry.outcome === 'loss' ? 'L' : 'O'}">${entry.outcome.toUpperCase()}</span><div><b>${entry.promoName}</b><small>${entry.showName} · ${entry.date} · ${entry.matchType} · ${entry.rarity}</small><p>${entry.text}</p><p>Played for ${owner} vs. ${opponents} · match hype +${entry.effects.matchBuzz ?? 0}${entry.matchRating ? ` · rating ${entry.matchRating}` : ''}</p></div></article>`;
    }).join('')}</div>` : '<p class="history-empty">No Promo cards have been played by this wrestler yet.</p>'}
  </section>`;
  return `<button class="return-gallery" data-back="roster">← BACK TO ${backLabel}</button>
  <div class="card-detail">
    <header class="card-detail-head">
      ${rosterPortraitHtml(w, 'card-detail-photo')}
      <div><small>${w.style.toUpperCase()} · POP ${w.popularity}</small><h3>${w.name}</h3><span class="card-nickname">"${w.nickname}"</span></div>
      <div class="card-detail-meta"><span>${w.hometown}</span><span>${w.height} · ${w.weight} lbs</span><span>Age ${calculateAge(w.dob)} (DOB ${w.dob})</span><span>Debut ${w.debutYear}</span></div>
      ${isChampion(w.id).length ? `<div class="card-detail-titles">${isChampion(w.id).map(def => `<span class="title-chip">${def.name}</span>`).join('')}</div>` : ''}
    </header>
    <div class="terminal-tabs player-card-tabs" role="tablist">
      <button type="button" role="tab" aria-selected="${wrestlerDetailTab === 'player'}" class="${wrestlerDetailTab === 'player' ? 'selected' : ''}" data-wrestler-profile-tab="player">PLAYER CARD</button>
      <button type="button" role="tab" aria-selected="${wrestlerDetailTab === 'storylines'}" class="${wrestlerDetailTab === 'storylines' ? 'selected' : ''}" data-wrestler-profile-tab="storylines">STORYLINES <span>${storyHistory.length}</span></button>
    </div>
    <div class="player-card-tab-content">${wrestlerDetailTab === 'storylines' ? storyTab : playerCard}</div>
  </div>`;
}

function computerTabHtml() {
  const tabs = [
    ['roster', 'ROSTER'],
    ['teams', 'TAG TEAMS'],
    ['rankings', 'RANKINGS'],
    ['stats', 'STATS'],
    ['news', 'NEWS'],
    ['email', 'EMAIL'],
  ];
  return `<div class="browser-address"><span>http://intranet.${getCompanyIdentity().acronym.toLowerCase()}/${terminalTab}.htm</span></div>
    <div class="terminal-tabs">${tabs.map(([key, label]) => `<button class="${terminalTab === key ? 'selected' : ''}" data-tab="${key}"><span aria-hidden="true">${key === 'rankings' ? '◆' : key === 'roster' ? '♟' : key === 'teams' ? '♧' : key === 'stats' ? '▤' : key === 'news' ? '▥' : '✉'}</span>${label}</button>`).join('')}</div>`;
}

function computerScreenHtml() {
  const legacy = terminalTab === 'email';
  return `<div class="retro-browser">${computerTabHtml()}<main class="browser-page ${legacy ? 'browser-page--legacy' : 'browser-page--modern'}">${computerBodyHtml()}</main></div>`;
}

function companySentCardHtml() {
  const { acronym, name, logoStyle, logoAccent } = getCompanyIdentity();
  return `<div class="email-reply-sent">
    <small class="section-label">YOUR REPLY</small>
    <img src="${companyLogoUrl(acronym, name, logoStyle, logoAccent)}" alt="${name} logo" />
    <b>${acronym} — ${name}</b>
  </div>`;
}

// The dedicated "next screen" shown after clicking through the welcome email, styled as a reply compose window.
function companyReplyScreenHtml() {
  const welcome = getInbox().find(email => email.id === 'welcome');
  const from = welcome?.from.split(' / ')[0] ?? "Rick O'Shea";
  const originalPrompt = welcome?.body.at(-1) ?? 'What are we calling this company?';
  return `<section class="email-compose">
    <header class="email-compose-head">
      <div class="email-compose-title"><span aria-hidden="true">✉</span><div><small>NEW MESSAGE</small><b>Reply to welcome message</b></div></div>
      <span class="email-compose-draft">DRAFT · UNSENT</span>
    </header>
    <div class="email-compose-layout">
      <form id="company-reply-form" class="email-reply">
        <div class="email-compose-fields">
          <div><b>To</b><span>${from}</span></div>
          <div><b>Subject</b><span>RE: okay so this is actually happening</span></div>
        </div>
        <div class="email-compose-body">
          <h2>What are we calling this thing?</h2>
          <p>Give the promotion its name and letterhead.</p>
          <div class="company-identity-editor">
          <div class="company-identity-controls">
          <div class="email-reply-fields">
            <label><span>Acronym (3 letters)</span><input id="company-acronym" type="text" maxlength="3" autocomplete="off" placeholder="RPW" required /></label>
            <label><span>Company name</span><input id="company-name" type="text" maxlength="40" autocomplete="off" placeholder="Rival Promotion" required /></label>
          </div>
          <div class="company-logo-options">
            <fieldset class="company-logo-presets">
              <legend>Logo Style</legend>
              <div role="group" aria-label="Choose logo style">
                ${COMPANY_LOGO_STYLES.map((style, index) => `<button type="button" class="${index === 0 ? 'selected' : ''}" data-logo-style="${style}" aria-pressed="${index === 0}">${COMPANY_LOGO_STYLE_LABELS[style]}</button>`).join('')}
              </div>
              <input id="company-logo-style" type="hidden" value="seal" />
            </fieldset>
            <label class="company-logo-color" for="company-logo-accent">
              <span>Accent color</span>
              <input id="company-logo-accent" type="color" value="#c49a46" aria-label="Choose logo accent color" />
              <output id="company-logo-accent-value">#C49A46</output>
            </label>
          </div>
          </div>
          <img id="company-logo-preview" class="company-logo-preview" alt="" hidden />
          </div>
          <details class="email-compose-original">
            <summary>Original message · JAN 02, 1996</summary>
            <h3>okay so this is actually happening</h3>
            <p>${originalPrompt}</p>
            <div><b>From</b><span>${from}</span></div>
            <div><b>To</b><span>YOU</span></div>
          </details>
        </div>
        <footer class="email-compose-actions">
          <span>Identity and logo will be set when this reply is sent.</span>
          <button id="company-reply-submit" type="submit">Send reply</button>
        </footer>
      </form>
    </div>
  </section>`;
}

function refreshCompanyLogoPreview() {
  const acronym = document.querySelector('#company-acronym')?.value.trim() ?? '';
  const name = document.querySelector('#company-name')?.value.trim() ?? '';
  const style = document.querySelector('#company-logo-style')?.value ?? 'seal';
  const accentInput = document.querySelector('#company-logo-accent');
  const preview = document.querySelector('#company-logo-preview');
  if (!preview) return;
  const validIdentity = acronym.length === 3 && Boolean(name);
  if (validIdentity && accentInput && !accentInput.dataset.customized) {
    accentInput.value = companyLogoAccent(acronym.toUpperCase(), name);
  }
  const accent = accentInput?.value ?? null;
  const accentValue = document.querySelector('#company-logo-accent-value');
  if (accentValue) accentValue.value = accent?.toUpperCase() ?? '';
  if (!validIdentity) { preview.hidden = true; return; }
  preview.src = companyLogoUrl(acronym.toUpperCase(), name, style, accent);
  preview.hidden = false;
}

function emailBodyHtml() {
  const emails = getInbox();
  const selected = emails.find(email => email.id === selectedEmailId) ?? emails[0];
  if (!selected) return '<div class="email-empty">NO MESSAGES</div>';
  const dateLabel = selected.date === 'AFTER SHOW 4' ? `AFTER SHOW ${getState().career.showsRun}` : selected.date;
  const isWelcome = selected.id === 'welcome';
  const isFamilyMail = selected.id.startsWith('family-');
  return `<div class="email-client">
    <aside class="email-sidebar">
      <div class="email-account"><b>${getCompanyIdentity().acronym} MAIL</b><small>${getCompanyIdentity().name.toUpperCase()}</small></div>
      <button class="email-folder selected" type="button"><span>INBOX</span><b>${emails.filter(email => email.unread).length || ''}</b></button>
      <span class="email-folder muted">SENT</span><span class="email-folder muted">TRASH</span>
      <small class="email-status">${emails.length} MESSAGE${emails.length === 1 ? '' : 'S'}</small>
    </aside>
    <section class="email-inbox">
      <header class="email-toolbar"><b>Inbox</b><small>${getCompanyIdentity().acronym} NETWORK MAIL SERVICE · 1996</small></header>
      <div class="email-list">${emails.map(email => `<button class="email-row ${email.id === selected.id ? 'selected' : ''} ${email.unread ? 'unread' : ''}" type="button" data-email="${email.id}"><span class="email-row-dot">${email.unread ? '●' : '○'}</span><span class="email-row-main"><b>${email.from}</b><strong>${email.subject}</strong></span><small>${email.date}</small></button>`).join('')}</div>
    </section>
    <article class="email-reader"><header><small>FROM ${selected.address}</small><b>${selected.subject}</b><span>${dateLabel}</span></header><div class="email-paper">${selected.body.map(paragraph => `<p>${paragraph}</p>`).join('')}${selected.vendingRewardId ? '<button class="bk-primary" type="button" data-visit-vending>VISIT VENDING MACHINE</button>' : ''}${isFamilyMail ? '' : `<p class="email-signoff">Regards,<br>${selected.from.split(' / ')[0]}</p>`}${isWelcome && !hasNamedCompany() ? '<p class="email-continue-hint">Click anywhere to write back →</p>' : ''}${isWelcome && hasNamedCompany() ? companySentCardHtml() : ''}</div></article>
  </div>`;
}

// All wrestlers who ever appear in a flagship-show match of a given type, across the
// (capped) show history — used to build the STATS match-type filter dynamically so it
// never lists a format that has never actually been booked.
function matchTypesInHistory() {
  const shows = getState().history ?? [];
  const ids = new Set();
  shows.forEach(show => show.matches.forEach(m => ids.add(m.typeId)));
  return MATCH_TYPES.filter(t => ids.has(t.id));
}

// A side count of 0 (Battle Royale) or 3+ (triple threat, fatal four-way) means a
// non-winner reads as a non-decisive "other" outcome rather than a straight loss —
// matches the W-L-O convention used on the wrestler's own career record.
function statsRecordRows(typeFilter) {
  const shows = getState().history ?? [];
  const rows = new Map();
  shows.forEach(show => show.matches.forEach(match => {
    if (typeFilter !== 'all' && match.typeId !== typeFilter) return;
    const type = getMatchType(match.typeId);
    const sideCount = type?.slots.teams || 0;
    const multiPerson = sideCount === 0 || sideCount >= 3;
    const winnerIds = match.winnerIds ?? [];
    const decisive = winnerIds.length > 0;
    (match.participantIds ?? []).forEach(id => {
      const row = rows.get(id) ?? { id, name: getWrestlerById(id)?.name ?? id, wins: 0, losses: 0, other: 0 };
      if (!decisive) row.other += 1;
      else if (winnerIds.includes(id)) row.wins += 1;
      else if (multiPerson) row.other += 1;
      else row.losses += 1;
      rows.set(id, row);
    });
  }));
  return [...rows.values()].map(row => {
    const decisiveBouts = row.wins + row.losses;
    return { ...row, bouts: decisiveBouts + row.other, winPct: decisiveBouts ? Math.round((row.wins / decisiveBouts) * 100) : 0 };
  }).sort((a, b) => b.wins - a.wins || b.winPct - a.winPct);
}

// Reign history only stores holder names (tag reigns join two names with ' & '), so
// past reigns are matched back to a roster id by name — fine for this small a roster.
function statsBeltRows() {
  const state = getState();
  const today = new Date(`${state.date}T12:00:00`);
  const rows = new Map();
  const ensure = id => {
    if (!rows.has(id)) rows.set(id, { id, name: getWrestlerById(id)?.name ?? id, worldReigns: 0, worldDays: 0, tagReigns: 0, tagDays: 0 });
    return rows.get(id);
  };
  CHAMPIONSHIPS.forEach(def => {
    const title = state.titles?.[def.id];
    if (!title) return;
    const isTag = def.kind === 'tag';
    if (title.holders?.length && title.since) {
      const days = Math.max(1, Math.round((today - new Date(`${title.since}T12:00:00`)) / 86400000));
      title.holders.forEach(id => {
        const row = ensure(id);
        if (isTag) { row.tagReigns += 1; row.tagDays += days; } else { row.worldReigns += 1; row.worldDays += days; }
      });
    }
    (title.history ?? []).forEach(reign => {
      const days = Math.max(1, Math.round((new Date(`${reign.to}T12:00:00`) - new Date(`${reign.from}T12:00:00`)) / 86400000));
      (reign.holderNames ?? '').split(' & ').forEach(name => {
        const w = wrestlers.find(entry => entry.name === name.trim());
        if (!w) return;
        const row = ensure(w.id);
        if (isTag) { row.tagReigns += 1; row.tagDays += days; } else { row.worldReigns += 1; row.worldDays += days; }
      });
    });
  });
  return [...rows.values()].filter(row => row.worldReigns || row.tagReigns)
    .sort((a, b) => (b.worldDays + b.tagDays) - (a.worldDays + a.tagDays));
}

function statsSectionHtml() {
  const pageNav = `<div class="stats-subnav">${[['records', 'RECORDS'], ['belts', 'BELTS']].map(([id, label]) => `<button class="${statsPage === id ? 'selected' : ''}" data-stats-page="${id}">${label}</button>`).join('')}</div>`;

  if (statsPage === 'belts') {
    const rows = statsBeltRows();
    return `<div class="stats-screen">
      <header class="stats-head"><small>CHAMPIONSHIP LEDGER</small><b>TITLE HISTORY</b><p>World and tag title reigns across every wrestler who has held gold.</p></header>
      ${pageNav}
      <div class="stats-table-wrap"><table class="stats-table"><thead><tr><th>WRESTLER</th><th>WORLD TITLE WINS</th><th>DAYS HELD</th><th>TAG TITLE WINS</th><th>DAYS HELD</th></tr></thead><tbody>
        ${rows.length ? rows.map(row => `<tr><td>${profileLinkHtml(row.id, row.name)}</td><td>${row.worldReigns}</td><td>${row.worldDays}</td><td>${row.tagReigns}</td><td>${row.tagDays}</td></tr>`).join('') : '<tr><td colspan="5">No championships won yet.</td></tr>'}
      </tbody></table></div>
    </div>`;
  }

  const typeOptions = [{ id: 'all', name: 'ALL' }, ...matchTypesInHistory().map(t => ({ id: t.id, name: t.name.toUpperCase() }))];
  const filterNav = `<div class="stats-type-filter">${typeOptions.map(t => `<button class="${statsTypeFilter === t.id ? 'selected' : ''}" data-stats-type="${t.id}">${t.name}</button>`).join('')}</div>`;
  const rows = statsRecordRows(statsTypeFilter);
  return `<div class="stats-screen">
    <header class="stats-head"><small>PERFORMANCE LEDGER</small><b>WIN-LOSS RECORDS</b><p>Filter by match type to see how a wrestler performs in a specific format.</p></header>
    ${pageNav}
    ${filterNav}
    <div class="stats-table-wrap"><table class="stats-table"><thead><tr><th>WRESTLER</th><th>W</th><th>L</th><th>O</th><th>WIN %</th></tr></thead><tbody>
      ${rows.length ? rows.map(row => `<tr><td>${profileLinkHtml(row.id, row.name)}</td><td class="stats-good">${row.wins}</td><td class="stats-bad">${row.losses}</td><td>${row.other}</td><td>${row.winPct}%</td></tr>`).join('') : '<tr><td colspan="5">No completed matches yet.</td></tr>'}
    </tbody></table></div>
  </div>`;
}

function computerBodyHtml() {
  if (selectedWrestlerId && terminalTab !== 'email') return `<div class="term-modern">${wrestlerDetailHtml(selectedWrestlerId)}</div>`;
  if (terminalTab === 'roster') {
    return `<div class="term-modern"><div class="roster-summary"><b>${getSignedRoster().length} SIGNED</b><span>Full roster active as of ${showDateLabel()}</span></div>${rosterTableHtml()}</div>`;
  }
  if (terminalTab === 'teams') return teamsViewHtml({ embedded: true });
  if (terminalTab === 'news') {
    const state = getState();
    const latest = state.results[0];
    const latestPromo = state.promoHistory?.[0];
    const companyStories = [
      latest
        ? { kicker: 'INDUSTRY WIRE', headline: `${latest.showName.toUpperCase()} POSTS A ${latest.rating}`, body: `${latest.attendance.toLocaleString()} fans watched ${latest.city} host the latest flagship event.` }
        : { kicker: 'INDUSTRY WIRE', headline: 'THE WAR IS COMING', body: 'Every promotion is watching your first move.' },
      latestPromo
        ? { kicker: 'LATEST PROMO', headline: latestPromo.promoName.toUpperCase(), body: `${getWrestlerById(latestPromo.spotlightId)?.name ?? 'The roster'} played this one-off at ${latestPromo.showName}.` }
        : { kicker: 'LOCKER ROOM', headline: 'ROSTER SET', body: `${getSignedRoster().length} wrestlers are currently under contract.` },
    ];
    const stories = [...companyStories, ...worldNewsForDate(state.date)];
    return `<div class="terminal-grid">${stories.map(story => `<article><small>${story.kicker}</small><b>${story.headline}</b><p>${story.body}</p></article>`).join('')}</div>`;
  }
  if (terminalTab === 'rankings') {
    const state = getState();
    const champions = new Set(state.titles.world?.holders ?? []);
    const ranked = getSignedRoster().map(w => ({ w, score: w.popularity + w.momentum * 4 + w.record.w * 1.5 - w.record.l * .5 + (champions.has(w.id) ? 12 : 0) })).sort((a, b) => {
      const championOrder = Number(champions.has(b.w.id)) - Number(champions.has(a.w.id));
      const contenderOrder = Number(b.w.id === state.numberOneContenderId) - Number(a.w.id === state.numberOneContenderId);
      return championOrder || contenderOrder || b.score - a.score;
    });
    let contenderRank = 0;
    const rankingRows = ranked.map(({ w }) => {
      const rank = champions.has(w.id) ? 'Champion' : `#${++contenderRank}`;
      return `<tr><td>${rank}</td><td>${profileLinkHtml(w.id, w.name)}<small>${w.style}</small></td><td>${recordString(w.record)}</td><td>${momentumLabel(w.momentum)}</td></tr>`;
    }).join('');
    return `<div class="term-modern computer-list-screen"><header><small>CONTENDER INDEX</small><b>THE TITLE PICTURE</b></header><div class="ranking-table-wrap"><table class="computer-ranking-table"><thead><tr><th>RANK</th><th>WRESTLER</th><th>RECORD</th><th>MOMENTUM</th></tr></thead><tbody>${rankingRows}</tbody></table></div></div>`;
  }
  if (terminalTab === 'stats') {
    return statsSectionHtml();
  }
  if (terminalTab === 'email') {
    const emails = getInbox();
    const effectiveId = selectedEmailId ?? emails[0]?.id;
    if (!hasNamedCompany() && effectiveId === 'welcome' && onboardingStep === 'reply') return companyReplyScreenHtml();
    return emailBodyHtml();
  }
  return `<div class="computer-list-screen"><header><small>CONTENDER INDEX</small><b>THE TITLE PICTURE</b><p>Use the terminal tabs to inspect the roster, rankings, company history, and mail.</p></header></div>`;
}

function refreshComputerPanel() {
  panelContent.innerHTML = computerScreenHtml();
  updateAltMenuActiveItem('computer');
}

function refreshEmailNotification() {
  const notification = document.querySelector('#email-notification');
  const count = unreadEmailCount();
  notification.classList.toggle('visible', count > 0);
  document.querySelector('#email-notification-count').textContent = count;
}

// Re-renders whichever panel is currently open. Re-invoking openPanel (rather than
// touching the DOM directly) keeps gallery-hosted screens like Journal/History correct,
// since their "return to gallery" wrapper has to be rebuilt every time too.
function refreshCurrentPanel() {
  if (currentPanelKind) openPanel(currentPanelKind);
  refreshWorldSigns();
}

// Keeps the physical office signage (calendar wall, booking board) in sync with the
// actual game clock instead of forever reading opening night.
function refreshWorldSigns() {
  const state = getState();
  const show = getShow();
  refreshHud();
  updateSign(calendarHeaderSign, [`SHOW ${state.showNumber}`, showDateLabel().toUpperCase()], { background: '#201f21', border: '#d0a94f' });
  refreshCalendarWall();
  refreshBookingPoster();
  refreshPpvLogo();
  if (!isDraftComplete()) {
    updateSign(bookingBoardSign, ['DRAFT DAY', 'SIGN YOUR ROSTER'], { background: '#261518', border: '#c49a46', accent: '#db3540' });
  } else {
    const ready = getProjection().readyToRun;
    updateSign(bookingBoardSign, [show.name.toUpperCase(), showDateLabel().toUpperCase(), ready ? 'CARD: READY' : 'CARD: UNBOOKED'], { background: '#261518', border: '#c49a46', accent: '#db3540' });
  }
  refreshTrophyWall();
  refreshRecordPlaque();
  refreshCareerDisplay();
  refreshVhsShelf();
  refreshEmailNotification();
}

// Builds the {title, kicker, body} for a given panel kind without any DOM side
// effects — shared by the 3D-hotspot panel (openPanel) and the alt-menu sidebar,
// so both surfaces render the exact same screens from one source of truth.
function packProductsHtml() {
  return getCribPacks().map(pack => {
    const disabled = !pack.affordable || pack.soldOut;
    const status = pack.soldOut ? 'SOLD OUT' : !pack.affordable ? 'NOT ENOUGH CASH' : `$${pack.cost.toLocaleString()}`;
    const artwork = `<div class="catalog-art catalog-art-pack" style="--pack-color:${pack.color}" aria-hidden="true"><i></i><span><small>RIVAL PROMOTIONS</small><b>${pack.customWrestler ? 'CREATE A WRESTLER' : pack.name.replace(' Pack', '').toUpperCase()}</b><em>TRADING CARDS</em></span></div>`;
    return `<article class="catalog-item ${pack.soldOut ? 'owned' : ''}">${artwork}<small>${status}</small><b>${pack.name}</b><p>${pack.blurb}</p><button class="catalog-buy" data-pack-buy="${pack.id}" ${disabled ? 'disabled' : ''}>Purchase · $${pack.cost.toLocaleString()}</button></article>`;
  }).join('');
}

function packShopHtml() {
  if (getPurchasedPackReveal()) return purchasedPackRevealHtml(purchasedPackFlipped);
  const rewards = getTutorialPacks().filter(reward => !reward.claimed);
  return `<section class="pack-vending-shop">${rewards.length ? `<div class="vending-rewards">${rewards.map(reward => `<div class="vending-reward" style="--pack-color:${reward.pack.color}"><div><small>${reward.year ? `YEAR ${reward.year} REWARD · PACK ${reward.packNumber}/3` : `COMPLIMENTARY · AFTER SHOW ${reward.afterShow}`}</small><b>${reward.pack.name}</b><p>${reward.pack.blurb}</p></div><button class="catalog-buy" type="button" data-claim-pack="${reward.id}">OPEN FREE PACK</button></div>`).join('')}</div>` : ''}<div class="catalog-issue-header"><div><small>Vending Machine</small><h4>Choose your pack</h4></div><span>$${getState().bankroll.toLocaleString()} available</span></div><div class="catalog-product-grid">${packProductsHtml()}</div></section>`;
}

function customWrestlerFormHtml() {
  const pack = getCribPacks().find(entry => entry.customWrestler);
  return `<form id="custom-wrestler-form" class="custom-wrestler-form">
    <label>NAME<input name="name" maxlength="32" required></label>
    <label>NICKNAME<input name="nickname" maxlength="32"></label>
    <label>STYLE<select name="style">${STYLES.map(style => `<option>${style}</option>`).join('')}</select></label>
    <label>ALIGNMENT<select name="alignment"><option value="face">Face</option><option value="heel">Heel</option></select></label>
    <label>AGE<input name="age" type="number" min="18" max="55" value="25" required></label>
    <label>HOMETOWN<input name="hometown" maxlength="64" placeholder="Parts Unknown"></label>
    <label class="custom-wrestler-wide">FINISHER<input name="finisher" maxlength="48" placeholder="Running Lariat"></label>
    <label class="custom-wrestler-wide">BIO<textarea name="bio" maxlength="400" rows="3"></textarea></label>
    <div class="custom-wrestler-wide custom-wrestler-start"><span>CONTENDER · POP 45</span><span>STR 50 · AGI 50 · STA 50 · TEC 50 · CHA 50 · TGH 50</span></div>
    <div class="custom-wrestler-wide custom-wrestler-actions"><button class="bk-chip" type="button" data-custom-wrestler-cancel>CANCEL</button><button class="bk-primary" type="submit" ${pack.affordable ? '' : 'disabled'}>CREATE & PURCHASE · $${pack.cost.toLocaleString()}</button></div>
  </form>`;
}

function wallArtPanelHtml() {
  const displayed = getDisplayedPaintings();
  const owned = LOUNGE_ITEMS.filter(item => LOUNGE_PAINTING_IDS.includes(item.id) && getState().lounge.owned.includes(item.id));
  return `<section class="wall-art-picker"><div class="bk-chips">${[0, 1].map(slot => `<button class="bk-chip ${selectedPaintingSlot === slot ? 'selected' : ''}" type="button" data-wall-art-slot="${slot}" aria-pressed="${selectedPaintingSlot === slot}">${slot === 0 ? 'LEFT' : 'RIGHT'} FRAME</button>`).join('')}</div>
    ${owned.length ? `<div class="bk-grid">${owned.map(item => `<button class="bk-option ${displayed[selectedPaintingSlot] === item.id ? 'selected' : ''}" type="button" data-display-painting="${item.id}" aria-pressed="${displayed[selectedPaintingSlot] === item.id}"><img src="${paintingArtUrls[item.id]}" alt="${item.name}" style="width:100%;height:160px;object-fit:contain"><b>${item.name}</b></button>`).join('')}</div>` : '<p class="bk-empty">No paintings owned.</p>'}</section>`;
}

function resolvePanelContent(kind) {
  return {
    packVending: () => ({ title: 'Vending Machine', kicker: 'LOUNGE / VENDING MACHINE', body: packShopHtml() }),
    customWrestler: () => ({ title: 'Create Your Own Wrestler', kicker: 'VENDING MACHINE / CUSTOM CONTRACT', body: customWrestlerFormHtml() }),
    cardBook: () => ({ title: 'Card Book', kicker: 'LOUNGE / COLLECTION', body: cardBookProfileId ? `<div class="card-book-detail">${wrestlerDetailHtml(cardBookProfileId)}</div>` : cardBookHtml(selectedCardBookSection) }),
    calendar: () => {
      if (!panelOpen) setBookingView('calendar');
      // Only the month grid itself is the Calendar Wall; every other booking screen
      // reached from it is the Booking Board.
      const onCalendar = getBookingView() === 'calendar';
      return { title: onCalendar ? 'Calendar Wall' : 'Booking Board', kicker: bookingPanelKicker(), body: bookingPanelHtml() };
    },
    computer: () => ({ title: 'Computer', kicker: `${getCompanyIdentity().acronym}NET EXPLORER`, body: computerScreenHtml() }),
    finances: () => ({ title: 'Finance Office', kicker: 'PRICING STRATEGY', body: financePanelHtml() }),
    wallArt: () => ({ title: 'GM Legacy Art', kicker: 'PURCHASED PAINTINGS', body: wallArtPanelHtml() }),
    booking: () => { if (!panelOpen) setBookingView('card'); return { title: 'Booking Board', kicker: bookingPanelKicker(), body: bookingPanelHtml() }; },
    lounge: () => ({ title: 'The Lounge', kicker: 'PRIVATE FLOOR / SKYLINE VIEW', body: '<div class="terminal-grid"><article><small>THE LOUNGE</small><b>OFF THE CLOCK</b><p>A private room for future cosmetic upgrades, furniture, and your record collection.</p></article></div>' }),
    loungeCatalog: () => {
      const state = getState();
      const owned = new Set(state.lounge?.owned ?? []);
      const money = value => `$${value.toLocaleString()}`;
      const loungeArtUrls = { 'arcade-cabinet': cabinetUrl, rothko: rothkoUrl, dali: daliUrl, goya: goyaUrl };
      const packSection = `<section class="catalog-page catalog-page-main" data-catalog-page="packs" ${selectedLoungeCatalogTab !== 'packs' ? 'hidden' : ''}><div class="catalog-page-topline"><span>SHOPPING GUIDE</span><strong>QRD / PACK DROP</strong></div><div class="catalog-issue-header"><div><small>special feature</small><h4>Available packs</h4></div><span>$${state.bankroll.toLocaleString()} available</span></div><div class="catalog-product-grid">${packProductsHtml()}</div></section>`;
      const items = LOUNGE_ITEMS.map(item => {
        const bought = owned.has(item.id);
        const locked = getGMLevel() < item.unlockLevel;
        const disabled = bought || locked || state.bankroll < item.cost;
        const status = bought ? 'OWNED' : locked ? `GM LEVEL ${item.unlockLevel}` : state.bankroll < item.cost ? 'NOT ENOUGH CASH' : money(item.cost);
        const artwork = item.id === 'vinyl-library'
          ? '<div class="catalog-art catalog-art-turntable" aria-hidden="true"><span class="turntable-platter"><i></i></span><span class="turntable-arm"></span><span class="turntable-controls"></span></div>'
          : `<div class="catalog-art catalog-art-upgrade ${item.id}"><img src="${loungeArtUrls[item.id]}" alt="${item.name}"></div>`;
        return `<article class="catalog-item ${bought ? 'owned' : ''}">${artwork}<small>${status}</small><b>${item.name}</b><p>${item.description}</p>${bought ? '<span class="catalog-status">INSTALLED</span>' : `<button class="catalog-buy" data-lounge-buy="${item.id}" ${disabled ? 'disabled' : ''}>Purchase · ${money(item.cost)}</button>`}</article>`;
      }).join('');
      let vinylSection = `<section class="catalog-page catalog-page-side" data-catalog-page="vinyl" ${selectedLoungeCatalogTab !== 'vinyl' ? 'hidden' : ''}><div class="catalog-page-topline"><span>ARCHIVE</span><strong>VINYL / FITTINGS</strong></div><div class="catalog-issue-header"><div><small>collection</small><h4>Quiet additions</h4></div><span>coming soon</span></div><p class="catalog-empty">The record shelf and furniture still live in the main catalog pages.</p></section>`;
      if (owned.has('vinyl-library')) {
        const ownedVinyls = new Set(getOwnedVinyls());
        const vinylItems = VINYL_RECORDS.map(record => {
          const bought = ownedVinyls.has(record.id);
          const disabled = bought || state.bankroll < record.cost;
          const status = bought ? 'OWNED' : state.bankroll < record.cost ? 'NOT ENOUGH CASH' : money(record.cost);
          const cover = vinylCoverUrl(record);
          const artwork = cover ? `<div class="catalog-art catalog-art-record"><img src="${cover}" alt="${record.title} album cover"></div>` : '<div class="catalog-art catalog-art-record fallback" aria-hidden="true"></div>';
          return `<article class="catalog-item ${bought ? 'owned' : ''}">${artwork}<small>${status}</small><b>${record.title}</b><p>${record.artist}</p>${bought ? '<span class="catalog-status">ON THE SHELF</span>' : `<button class="catalog-buy" data-vinyl-buy="${record.id}" ${disabled ? 'disabled' : ''}>Purchase · ${money(record.cost)}</button>`}</article>`;
        }).join('');
        vinylSection = `<section class="catalog-page catalog-page-side" data-catalog-page="vinyl" ${selectedLoungeCatalogTab !== 'vinyl' ? 'hidden' : ''}><div class="catalog-page-topline"><span>ARCHIVE</span><strong>VINYL / FITTINGS</strong></div><div class="catalog-issue-header"><div><small>collection</small><h4>Record shelf</h4></div><span>${ownedVinyls.size}/${VINYL_RECORDS.length}</span></div><div class="catalog-product-grid">${vinylItems}</div></section>`;
      }
      return {
        title: 'Lounge Catalog',
        kicker: `GM LEVEL ${getGMLevel()} / CAPITAL ${money(state.bankroll)}`,
        body: `<div class="catalog-magazine">
          <div class="catalog-rail">
            <span class="catalog-rail-label">magazine</span>
            <button class="catalog-tab ${selectedLoungeCatalogTab === 'packs' ? 'active' : ''}" type="button" data-catalog-tab="packs" aria-selected="${selectedLoungeCatalogTab === 'packs'}">packs</button>
            <button class="catalog-tab ${selectedLoungeCatalogTab === 'furniture' ? 'active' : ''}" type="button" data-catalog-tab="furniture" aria-selected="${selectedLoungeCatalogTab === 'furniture'}">furniture</button>
            <button class="catalog-tab ${selectedLoungeCatalogTab === 'vinyl' ? 'active' : ''}" type="button" data-catalog-tab="vinyl" aria-selected="${selectedLoungeCatalogTab === 'vinyl'}">vinyl</button>
          </div>
          <div class="catalog-spread">
            ${packSection}
            ${items ? `<section class="catalog-page catalog-page-side" data-catalog-page="furniture" ${selectedLoungeCatalogTab !== 'furniture' ? 'hidden' : ''}><div class="catalog-page-topline"><span>DEPARTMENT</span><strong>FURNITURE</strong></div><div class="catalog-issue-header"><div><small>lounge buildout</small><h4>Home upgrades</h4></div><span>for your home</span></div><div class="catalog-product-grid">${items}</div></section>` : ''}
            ${vinylSection}
          </div>
        </div>`
      };
    },
    vinylLibrary: () => {
      const ownedVinyls = new Set(getOwnedVinyls());
      const nowPlayingId = getNowPlayingVinyl();
      const nowPlaying = nowPlayingId ? getVinylRecord(nowPlayingId) : null;
      const collected = VINYL_RECORDS.filter(record => ownedVinyls.has(record.id));
      const nowPlayingHtml = nowPlaying
        ? `<article><small>NOW PLAYING</small><b>${nowPlaying.title}</b><p>${nowPlaying.artist}</p></article>`
        : '<article><small>NOW PLAYING</small><b>Silence</b><p>The turntable is ready for an owned record. Buy albums from the Lounge Catalog, then pick one below.</p></article>';
      const shelfHtml = collected.length
        ? `<div class="terminal-grid">${collected.map(record => `<article class="catalog-item ${record.id === nowPlayingId ? 'owned' : ''}"><small>${record.id === nowPlayingId ? 'PLAYING' : 'IN COLLECTION'}</small><b>${record.title}</b><p>${record.artist}</p><button class="catalog-buy" data-vinyl-play="${record.id}" ${record.id === nowPlayingId ? 'disabled' : ''}>${record.id === nowPlayingId ? 'Now Playing' : 'Play This'}</button></article>`).join('')}</div>`
        : '<p class="catalog-empty">No records yet — the Lounge Catalog has 24 to choose from once the shelf is installed.</p>';
      return {
        title: 'Vinyl Library',
        kicker: `${collected.length}/${VINYL_RECORDS.length} OWNED / NOW PLAYING`,
        body: `<div class="terminal-grid">${nowPlayingHtml}<article><small>COLLECTION</small><b>${collected.length} OF ${VINYL_RECORDS.length} SLOTS FILLED</b><p>Buy the rest from the Lounge Catalog.</p></article></div>${shelfHtml}`,
      };
    },
    arcadeCabinet: () => ({ title: 'Rival Arcade', kicker: 'PRIVATE FLOOR / HIGH SCORE', body: '<div class="terminal-grid"><article><small>CABINET ONLINE</small><b>RIVAL ARCADE</b><p>A dedicated Lounge machine for future arcade games, high scores, and visiting-talent challenges.</p></article></div>' }),
    archive: () => ({ title: 'The Archive', kicker: 'CLASSIC MATCHES / EVENTS / HALL OF FAME', body: `${archiveHtml()}<button class="return-gallery" data-back="close">← RETURN</button>` }),
    milestones: () => ({ title: 'Trophy Wall', kicker: 'COMPANY ACHIEVEMENTS', body: `${trophyCaseHtml()}<button class="return-gallery" data-back="close">← RETURN</button>` }),
    trophyDetail: () => {
      const definition = TROPHIES.find(trophy => trophy.id === selectedTrophyId);
      const earned = getState().trophies[selectedTrophyId];
      const earnedDate = earned?.date
        ? new Date(`${earned.date}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : 'Unknown date';
      return {
        title: definition?.name ?? 'Company Trophy',
        kicker: `${(definition?.tier ?? 'bronze').toUpperCase()} ACHIEVEMENT`,
        body: `<div class="terminal-grid"><article><small>WHAT IT MARKS</small><b>${definition?.name ?? 'Company achievement'}</b><p>${definition?.flavor ?? 'A milestone in company history.'}</p></article><article><small>WHEN YOU WON IT</small><b>${earned?.show ?? 'Unknown event'}</b><p>${earnedDate}</p></article></div><button class="return-gallery" data-back="close">← RETURN</button>`,
      };
    },
    belts: () => ({ title: 'Championship Shrine', kicker: 'CURRENT HOLDERS / REIGNS / PRESTIGE', body: `${bookingPanelHtml().includes('belt-detail-panel') ? titleDetailViewHtml() : championshipShrineHtml()}<button class="return-gallery" data-back="close">← RETURN</button>` }),
    recordbook: () => ({ title: 'The Record Book', kicker: 'COMPANY BESTS / SEASON AWARDS', body: `${recordBookHtml()}<button class="return-gallery" data-back="close">← RETURN</button>` }),
    career: () => ({ title: 'GM Legacy', kicker: 'GM RESUME', body: careerPlaqueHtml() }),
    history: () => {
      setBookingView('history');
      return { title: 'Show History', kicker: bookingPanelKicker(), body: `${bookingPanelHtml()}<button class="return-gallery" data-back="close">← RETURN</button>` };
    },
    vhsShelf: () => {
      const archive = getState().archive ?? [];
      const rows = archive.map((entry, index) => `<article class="bk-history"><header><b>${(entry.eventBranding?.name || entry.showName || 'SHOW').toUpperCase()}</b><span>${entry.date} · Rating ${entry.rating}</span></header><p>${entry.stars}</p><button class="catalog-buy" data-vhs-view="${index}">View Tape →</button></article>`).join('');
      return {
        title: 'VHS Archive',
        kicker: `${archive.length} SHOW${archive.length === 1 ? '' : 'S'} ON FILE`,
        body: archive.length ? `<div class="bk-stack">${rows}</div>` : '<p class="catalog-empty">No shows recorded yet — run your first event.</p>',
      };
    },
    vhsDetail: () => {
      const entry = (getState().archive ?? [])[selectedVhsIndex];
      if (!entry) {
        return { title: 'VHS Archive', kicker: 'TAPE NOT FOUND', body: `<p>That tape is missing from the shelf.</p><button class="return-gallery" data-back="close">← RETURN</button>` };
      }
      const fillPercent = entry.capacity ? Math.round((entry.attendance / entry.capacity) * 100) : 0;
      const matchRows = (entry.matches ?? []).map(match => {
        const participants = match.sideNames?.length ? match.sideNames.join(' vs. ') : (match.participantIds ?? []).map(id => getWrestlerById(id)?.name ?? id).join(' vs. ');
        const winner = Array.isArray(match.winnerNames) ? match.winnerNames.join(' & ') : match.winnerNames;
        const draw = ['draw', 'time-limit draw'].includes(match.outcome);
        return `<article class="bk-history"><header><b>${match.label}</b><span>${match.typeName}${match.stakeName ? ` · ${match.stakeName}` : ''}</span></header><p>${participants}</p><p>${draw ? 'Result: Draw' : `Winner: ${winner || 'No decisive winner'}`} · Rating ${match.rating}</p></article>`;
      }).join('');
      return {
        title: entry.showName,
        kicker: `${entry.date} · ${entry.venueName}, ${entry.city}`,
        body: `<div class="terminal-grid">
          <article><small>SHOW RATING</small><b>${entry.rating} — ${entry.ratingLabel}</b><p>${entry.stars}</p></article>
          <article><small>ATTENDANCE</small><b>${entry.attendance.toLocaleString()} / ${entry.capacity.toLocaleString()}</b><p>${fillPercent}% capacity</p></article>
        </div>
        <div class="bk-stack">${matchRows}</div>
        <button class="return-gallery" data-back="close">← RETURN</button>`,
      };
    },
  }[kind]();
}

function openPanel(kind) {
  currentPanelKind = kind;
  if (kind === 'computer') { selectedWrestlerId = null; profileReturn = null; }
  const content = resolvePanelContent(kind);
  const compactPicker = content.kicker === 'HOUSE_PICKER_COMPACT';
  panelTitle.textContent = compactPicker ? '' : content.title;
  panelKicker.textContent = compactPicker ? '' : content.kicker;
  panelContent.innerHTML = content.body;
  // A pack break is a full-screen ceremony, not a modal. Flagged with a real class
  // rather than a :has() selector so the layout never depends on selector support.
  const packBreak = Boolean(panelContent.querySelector('.pack-break'));
  const bookingBoardHome = kind === 'booking' && getBookingView() === 'card';
  panel.classList.toggle('pack-break-mode', packBreak);
  panelFrame.classList.toggle('pack-break-mode', packBreak);
  panelFrame.classList.toggle('booking-board-home', bookingBoardHome);
  panelFrame.classList.toggle('trophy-room', TROPHY_ROOM_KINDS.has(kind));
  panelFrame.classList.toggle('career-plaque-mode', kind === 'career');
  panelFrame.classList.toggle('computer-screen', kind === 'computer');
  panelFrame.classList.toggle('card-book-mode', kind === 'cardBook');
  panelFrame.classList.toggle('compact-picker', compactPicker);
  panelFrame.classList.toggle('no-footer', kind === 'calendar');
  panelFrame.classList.toggle('match-booking', ['booking', 'calendar'].includes(kind) && getBookingView() === 'match');
  panelFrame.classList.toggle('results-poster', ['booking', 'calendar'].includes(kind) && getBookingView() === 'results');
  panel.classList.toggle('computer-workspace', kind === 'computer');
  panel.classList.toggle('card-book-workspace', kind === 'cardBook');
  panelOpen = true;
  panel.inert = false;
  panel.setAttribute('aria-hidden', 'false');
  panel.classList.add('open');
  updateAltMenuActiveItem(kind);
}

function closePanel() {
  // While the alt-menu sidebar is up, "closing" a screen just means the sidebar
  // stays put — actual exit only happens through closeAltMenu() (Escape / The Crib).
  if (altMenuOpen) return;
  // Onboarding is not optional: until the company is named, every exit attempt
  // (close button, ESC, Space) bounces the player back to that same email.
  if (!hasNamedCompany()) {
    terminalTab = 'email';
    selectedEmailId = 'welcome';
    openPanel('computer');
    return;
  }
  const returningToBookingBoard = currentPanelKind === 'calendar' && getBookingView() === 'card';
  panelOpen = false;
  panel.classList.remove('open');
  panel.inert = true;
  panel.setAttribute('aria-hidden', 'true');
  if (returningToBookingBoard) focusBookingStation();
}

function focusBookingStation() {
  const index = stations.findIndex(entry => entry.panel === 'booking');
  if (index === -1) return;
  station = index;
  updateStation(true);
}

// The Esc menu's shortlist; everything else is reached by walking the crib.
const ALT_MENU_ITEMS = [
  { kind: 'calendar', label: 'Calendar' },
  { kind: 'computer', tab: 'email', label: 'Email' },
  { kind: 'finances', label: 'Finance Office' },
  { kind: 'loungeCatalog', label: 'Shopping Catalog' },
  { kind: 'computer', tab: 'stats', label: 'Stats' },
  { kind: 'belts', label: 'Championship Shrine' },
  { kind: 'history', label: 'Show History' },
  { kind: 'recordbook', label: 'Records' },
  { kind: 'career', label: 'GM Legacy' },
];
document.querySelector('#alt-menu-list').innerHTML = ALT_MENU_ITEMS
  .map(item => `<li><button type="button" class="alt-menu-item" data-alt-panel="${item.kind}"${item.tab ? ` data-alt-tab="${item.tab}"` : ''}>${item.label}</button></li>`)
  .join('');

// Highlights whichever sidebar entry matches the currently displayed panel — a
// no-op (and harmless) when the alt-menu isn't open, since the buttons are hidden.
function updateAltMenuActiveItem(kind) {
  altMenuNav.querySelectorAll('[data-alt-panel]').forEach(button => {
    const tabMatches = !button.dataset.altTab || button.dataset.altTab === terminalTab;
    button.classList.toggle('active', button.dataset.altPanel === kind && tabMatches);
  });
}

function openAltMenu() {
  altMenuOpen = true;
  panel.classList.add('open', 'alt-menu-active');
  panel.classList.remove('alt-menu-collapsed');
  altMenuToggle.textContent = '←';
  altMenuToggle.setAttribute('aria-label', 'Collapse menu');
  altMenuToggle.setAttribute('aria-expanded', 'true');
  panel.inert = false;
  panel.setAttribute('aria-hidden', 'false');
  if (!currentPanelKind || currentPanelKind === 'lounge' || currentPanelKind === 'loungeCatalog' || currentPanelKind === 'vinylLibrary' || currentPanelKind === 'arcadeCabinet') {
    openPanel('calendar');
  }
}

function closeAltMenu() {
  altMenuOpen = false;
  panelOpen = false;
  currentPanelKind = null;
  panel.classList.remove('open', 'alt-menu-active', 'alt-menu-collapsed');
  panel.inert = true;
  panel.setAttribute('aria-hidden', 'true');
}

altMenuToggle.addEventListener('click', () => {
  const collapsed = panel.classList.toggle('alt-menu-collapsed');
  altMenuToggle.textContent = collapsed ? '→' : '←';
  altMenuToggle.setAttribute('aria-label', collapsed ? 'Open menu' : 'Collapse menu');
  altMenuToggle.setAttribute('aria-expanded', String(!collapsed));
});

function moveStation(direction) {
  station = (station + direction + stations.length) % stations.length;
  updateStation();
}

function moveCrib(direction) {
  if (panelOpen || !started || isBroadcastActive() || altMenuOpen) return;
  if (galleryMode) {
    if (trophyGalleryMode) {
      const exhibits = activeTrophyExhibits();
      if (exhibits.length) trophyExhibit = (trophyExhibit - direction + exhibits.length) % exhibits.length;
      updateTrophyExhibit();
    } else {
      const exhibits = activeGalleryExhibits();
      galleryExhibit = (galleryExhibit + direction + exhibits.length) % exhibits.length;
      updateGalleryExhibit();
    }
    return;
  }
  if (loungeMode) {
    const exhibits = activeLoungeExhibits();
    loungeExhibit = (loungeExhibit + direction + exhibits.length) % exhibits.length;
    updateLoungeExhibit();
    return;
  }
  if (vhsMode) {
    const exhibits = activeVhsExhibits();
    if (exhibits.length) vhsExhibit = (vhsExhibit + direction + exhibits.length) % exhibits.length;
    updateVhsExhibit();
    return;
  }
  moveStation(direction);
}

document.querySelectorAll('[data-crib-move]').forEach(button => {
  button.addEventListener('click', () => moveCrib(Number(button.dataset.cribMove)));
});

let cribTouchStartX = null;
canvas.addEventListener('touchstart', event => {
  if (event.touches.length === 1) cribTouchStartX = event.touches[0].clientX;
}, { passive: true });
canvas.addEventListener('touchend', event => {
  if (cribTouchStartX === null || event.changedTouches.length !== 1) return;
  const distance = event.changedTouches[0].clientX - cribTouchStartX;
  cribTouchStartX = null;
  if (Math.abs(distance) < 45) return;
  moveCrib(distance < 0 ? 1 : -1);
}, { passive: true });

function updateGalleryExhibit(instant = false) {
  const exhibits = activeGalleryExhibits();
  galleryExhibit = Math.min(galleryExhibit, exhibits.length - 1);
  const exhibit = exhibits[galleryExhibit];
  targetPosition.set(...exhibit.position);
  targetLookAt.set(...exhibit.lookAt);
  gallerySpotlight.position.set(...exhibit.light);
  gallerySpotlight.intensity = 20;
  stationName.textContent = exhibit.name;
  stationDescription.textContent = exhibit.description;
  stationIndex.textContent = `${String(galleryExhibit + 1).padStart(2, '0')} / ${String(exhibits.length).padStart(2, '0')} · GALLERY`;
  if (instant) {
    camera.position.copy(targetPosition);
    currentLookAt.copy(targetLookAt);
    camera.lookAt(currentLookAt);
  }
}

function enterGallery() {
  galleryMode = true;
  galleryExhibit = 0;
  updateGalleryExhibit();
  showToast('Gallery exhibits: use left and right to explore');
}

function exitGallery() {
  galleryMode = false;
  trophyGalleryMode = false;
  gallerySpotlight.intensity = 0;
  updateStation();
}

function activateGalleryExhibit() {
  const exhibit = activeGalleryExhibits()[galleryExhibit];
  // The 3D per-trophy walk only ever shows physical trophy props. When a wrestler
  // has died, route to the full Trophy Wall panel instead so the memorial shrine
  // (which has no 3D prop of its own) is actually reachable.
  if (exhibit.panel === 'milestones' && !getState().memorials?.length) {
    trophyGalleryMode = true;
    trophyExhibit = 0;
    updateTrophyExhibit(true);
    showToast('Trophy wall: use left and right to inspect each earned trophy');
    return;
  }
  openPanel(exhibit.panel);
}

function updateTrophyExhibit(instant = false) {
  const exhibits = activeTrophyExhibits();
  if (!exhibits.length) {
    stationName.textContent = 'TROPHY WALL';
    stationDescription.textContent = 'No trophies earned yet';
    stationIndex.textContent = '00 / 00 · TROPHIES';
    return;
  }
  trophyExhibit = Math.min(trophyExhibit, exhibits.length - 1);
  const exhibit = exhibits[trophyExhibit];
  targetPosition.set(...exhibit.position);
  targetLookAt.set(...exhibit.lookAt);
  gallerySpotlight.position.set(...exhibit.light);
  gallerySpotlight.intensity = 20;
  stationName.textContent = exhibit.name;
  stationDescription.textContent = exhibit.description;
  stationIndex.textContent = `${String(trophyExhibit + 1).padStart(2, '0')} / ${String(exhibits.length).padStart(2, '0')} · TROPHIES`;
  if (instant) {
    camera.position.copy(targetPosition);
    currentLookAt.copy(targetLookAt);
    camera.lookAt(currentLookAt);
  }
}

function activateTrophyExhibit() {
  const exhibit = activeTrophyExhibits()[trophyExhibit];
  if (!exhibit) return;
  selectedTrophyId = exhibit.trophyId;
  openPanel('trophyDetail');
}

function updateLoungeExhibit(instant = false) {
  camera.zoom = 1;
  camera.updateProjectionMatrix();
  const exhibits = activeLoungeExhibits();
  loungeExhibit = Math.min(loungeExhibit, exhibits.length - 1);
  const exhibit = exhibits[loungeExhibit];
  if (exhibit.paintingSlot != null) selectedPaintingSlot = exhibit.paintingSlot;
  targetPosition.set(...exhibit.position);
  targetLookAt.set(...exhibit.lookAt);
  if (exhibit.panel === 'packVending') {
    const distance = Math.max(5.4, 3 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
    targetPosition.copy(targetLookAt).add(new THREE.Vector3(-.9, 1.2, -3.5).normalize().multiplyScalar(distance));
  }
  if (exhibit.panel === 'cardBook') {
    const distance = Math.max(2.4, 1.3 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
    targetPosition.copy(targetLookAt).add(new THREE.Vector3(0, 1.8, -.12).normalize().multiplyScalar(distance));
  }
  stationName.textContent = exhibit.name;
  stationDescription.textContent = exhibit.description;
  stationIndex.textContent = `${String(loungeExhibit + 1).padStart(2, '0')} / ${String(exhibits.length).padStart(2, '0')} · LOUNGE`;
  if (instant) {
    camera.position.copy(targetPosition);
    currentLookAt.copy(targetLookAt);
    camera.lookAt(currentLookAt);
  }
}

function enterLounge() {
  loungeMode = true;
  loungeExhibit = 0;
  updateLoungeExhibit();
  showToast('Lounge: use left and right to explore, Space to select');
}

function exitLounge() {
  loungeMode = false;
  updateStation();
}

function updateVhsExhibit(instant = false) {
  const exhibits = activeVhsExhibits();
  if (!exhibits.length) {
    stationName.textContent = 'VHS ARCHIVE';
    stationDescription.textContent = 'No shows recorded yet — run your first event.';
    stationIndex.textContent = '00 / 00 · ARCHIVE';
    return;
  }
  vhsExhibit = Math.min(vhsExhibit, exhibits.length - 1);
  const exhibit = exhibits[vhsExhibit];
  targetPosition.set(...exhibit.position);
  targetLookAt.set(...exhibit.lookAt);
  stationName.textContent = exhibit.name;
  stationDescription.textContent = exhibit.description;
  stationIndex.textContent = `${String(vhsExhibit + 1).padStart(2, '0')} / ${String(exhibits.length).padStart(2, '0')} · ARCHIVE`;
  if (instant) {
    camera.position.copy(targetPosition);
    currentLookAt.copy(targetLookAt);
    camera.lookAt(currentLookAt);
  }
}

function enterVhsShelf() {
  vhsMode = true;
  vhsExhibit = Math.max(0, activeVhsExhibits().length - 1);
  updateVhsExhibit();
  showToast('VHS Archive: use left and right to browse, Space to watch the tape');
}

function exitVhsShelf() {
  vhsMode = false;
  updateStation();
}

function activateVhsExhibit() {
  const exhibit = activeVhsExhibits()[vhsExhibit];
  if (!exhibit) { exitVhsShelf(); return; }
  selectedVhsIndex = exhibit.archiveIndex;
  openPanel('vhsDetail');
}

function activateCurrentArea() {
  if (panelOpen || !started || isBroadcastActive()) return;
  if (galleryMode) {
    activateGalleryExhibit();
    return;
  }
  if (vhsMode) {
    activateVhsExhibit();
    return;
  }
  if (loungeMode) {
    const exhibit = activeLoungeExhibits()[loungeExhibit];
    if (exhibit.panel) openPanel(exhibit.panel);
    else exitLounge();
    return;
  }
  if (stations[station].panel === 'trophies') enterGallery();
  else if (stations[station].panel === 'lounge') enterLounge();
  else if (stations[station].panel === 'vhsShelf') enterVhsShelf();
  else openPanel(stations[station].panel);
}

document.querySelector('#enter-button').addEventListener('click', () => {
  started = true;
  intro.classList.add('hidden');
  app.classList.add('playing');
  if (!hasNamedCompany()) {
    focusComputerStation();
    terminalTab = 'email';
    selectedEmailId = 'welcome';
    openPanel('computer');
  }
});
document.querySelector('#new-game-button').addEventListener('click', () => {
  if (!confirm(`Start a new game? Your current ${getCompanyIdentity().name} campaign will be replaced.`)) return;
  startNewGame();
  location.reload();
});
document.querySelector('#email-notification').addEventListener('click', () => {
  terminalTab = 'email';
  selectedEmailId = null;
  openPanel('computer');
});
document.querySelector('#save-game-button').addEventListener('click', () => {
  const blob = new Blob([exportGameData()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${getCompanyIdentity().acronym.toLowerCase()}-save-${getState().showNumber}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Save file downloaded.');
});
const loadGameInput = document.querySelector('#load-game-input');
document.querySelector('#load-game-button').addEventListener('click', () => loadGameInput.click());
loadGameInput.addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      importGameData(reader.result);
      location.reload();
    } catch {
      showToast('That file is not a valid Rival Promotion save.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
});
document.querySelector('#close-panel').addEventListener('click', closePanel);
altMenuNav.addEventListener('click', event => {
  const panelButton = event.target.closest('[data-alt-panel]');
  if (panelButton) {
    if (panelButton.dataset.altTab) terminalTab = panelButton.dataset.altTab;
    openPanel(panelButton.dataset.altPanel);
    return;
  }
  if (event.target.closest('[data-alt-crib]')) { closeAltMenu(); return; }
  if (event.target.closest('[data-alt-save]')) { document.querySelector('#save-game-button').click(); return; }
  if (event.target.closest('[data-alt-load]')) { document.querySelector('#load-game-button').click(); return; }
  if (event.target.closest('[data-alt-new]')) { document.querySelector('#new-game-button').click(); }
});
renderer.domElement.addEventListener('click', event => {
  if (!panelOpen && started && !isBroadcastActive()) {
    const bounds = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      (event.clientX - bounds.left) / bounds.width * 2 - 1,
      -(event.clientY - bounds.top) / bounds.height * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);
    const tapeCount = Math.min((getState().archive ?? []).length, vhsTapeSlots.length);
    const tapeHits = raycaster.intersectObjects(vhsTapeSlots.slice(0, tapeCount).map(slot => slot.group), true);
    if (tapeHits.length) {
      const slotIndex = vhsTapeSlots.findIndex(slot => {
        let object = tapeHits[0].object;
        while (object) {
          if (object === slot.group) return true;
          object = object.parent;
        }
        return false;
      });
      if (slotIndex >= 0) {
        selectedVhsIndex = tapeCount - 1 - slotIndex;
        openPanel('vhsDetail');
        return;
      }
    }
    if (companyWallEmblem && raycaster.intersectObject(companyWallEmblem, true).length) {
      openPanel('career');
      return;
    }
    for (let slot = 0; slot < wallPaintings.length; slot += 1) {
      if (wallPaintings[slot] && raycaster.intersectObject(wallPaintings[slot], true).length) {
        selectedPaintingSlot = slot;
        openPanel('wallArt');
        return;
      }
    }
    if (financeDeskItems && raycaster.intersectObject(financeDeskItems, true).length) {
      openPanel('finances');
      return;
    }
    if (loungeMode && raycaster.intersectObject(loungeCardBook, true).length) {
      openPanel('cardBook');
      return;
    }
    if (loungeMode && raycaster.intersectObject(packVendingMachine, true).length) {
      openPanel('packVending');
      return;
    }
  }
  activateCurrentArea();
});
panelContent.addEventListener('submit', event => {
  if (event.target.id === 'custom-wrestler-form') {
    event.preventDefault();
    const result = buyCustomWrestlerPack(Object.fromEntries(new FormData(event.target)));
    if (!result.ok) { showToast(result.message); return; }
    purchasedPackFlipped = [];
    openPanel('packVending');
    return;
  }
  if (event.target.id !== 'company-reply-form') return;
  event.preventDefault();
  const acronym = document.querySelector('#company-acronym').value;
  const name = document.querySelector('#company-name').value;
  const logoStyle = document.querySelector('#company-logo-style')?.value ?? 'seal';
  const logoAccent = document.querySelector('#company-logo-accent')?.value ?? null;
  if (!setCompanyIdentity({ acronym, name, logoStyle, logoAccent })) return;
  applyCompanyBranding();
  refreshCompanyWallEmblem();
  onboardingStep = 'read';
  markEmailRead('welcome');
  markEmailRead('welcome-reply');
  selectedEmailId = 'welcome-reply';
  // Naming the company hands you straight to the pack break; the ceremony drops the
  // player at the calendar wall when it is done.
  setBookingView('calendar');
  openPanel('calendar');
  refreshEmailNotification();
});
panelContent.addEventListener('input', event => {
  handleBookingInput(event);
  if (event.target.dataset?.event || event.target.dataset?.bk === 'show-name') refreshBookingPoster();
  if (event.target.matches('#company-logo-accent')) event.target.dataset.customized = 'true';
  if (event.target.matches('#company-acronym, #company-name, #company-logo-accent')) {
    refreshCompanyLogoPreview();
  }
});
panelContent.addEventListener('change', event => {
  handleBookingInput(event);
  if (event.target.dataset?.ppvLogo !== undefined || event.target.dataset?.ppvColor !== undefined) refreshCurrentPanel();
});
panelContent.addEventListener('click', event => {
  if (event.target.closest('[data-custom-wrestler-cancel]')) {
    openPanel('packVending');
    return;
  }
  const wallSlot = event.target.closest('[data-wall-art-slot]');
  if (wallSlot) {
    selectedPaintingSlot = Number(wallSlot.dataset.wallArtSlot);
    openPanel('wallArt');
    return;
  }
  const paintingChoice = event.target.closest('[data-display-painting]');
  if (paintingChoice) {
    if (setDisplayedPainting(selectedPaintingSlot, paintingChoice.dataset.displayPainting)) {
      refreshWallPaintings();
      openPanel('wallArt');
    }
    return;
  }
  if (event.target.closest('[data-visit-vending]')) {
    galleryMode = false;
    trophyGalleryMode = false;
    vhsMode = false;
    station = stations.findIndex(entry => entry.panel === 'lounge');
    loungeMode = true;
    loungeExhibit = activeLoungeExhibits().findIndex(entry => entry.panel === 'packVending');
    updateLoungeExhibit();
    openPanel('packVending');
    return;
  }
  const freePack = event.target.closest('[data-claim-pack]');
  if (freePack) {
    purchasedPackFlipped = [];
    const result = claimTutorialPack(freePack.dataset.claimPack);
    if (!result.ok) showToast(result.message);
    openPanel('packVending');
    return;
  }
  const reveal = event.target.closest('[data-bk="purchase-reveal"], [data-bk="purchase-reveal-all"], [data-bk="purchase-reveal-done"]');
  if (reveal) {
    const pending = getPurchasedPackReveal();
    purchasedPackFlipped = reveal.dataset.bk === 'purchase-reveal-all'
      ? (pending?.cards ?? []).map((card, index) => index).filter(index => !pending.revealed.includes(index))
      : reveal.dataset.bk === 'purchase-reveal' ? [Number(reveal.dataset.value)] : [];
    if (reveal.dataset.bk === 'purchase-reveal-done') finishPurchasedPackReveal();
    else revealPurchasedPackCard(reveal.dataset.bk === 'purchase-reveal-all' ? null : Number(reveal.dataset.value));
    openPanel('packVending');
    return;
  }
  if (event.target.closest('[data-pack-intake]')) {
    if (finishPurchasedPackReveal()) openPanel('booking');
    return;
  }
  const bookSection = event.target.closest('[data-card-book-section]');
  if (bookSection) {
    selectedCardBookSection = bookSection.dataset.cardBookSection;
    openPanel('cardBook');
    return;
  }
  const logoStyleButton = event.target.closest('[data-logo-style]');
  if (logoStyleButton) {
    const style = logoStyleButton.dataset.logoStyle;
    panelContent.querySelector('#company-logo-style').value = style;
    panelContent.querySelectorAll('[data-logo-style]').forEach(button => {
      const selected = button === logoStyleButton;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    refreshCompanyLogoPreview();
    return;
  }
  const catalogTab = event.target.closest('[data-catalog-tab]');
  const legacyExport = event.target.closest('[data-legacy-export]');
  if (legacyExport) {
    const source = panelContent.querySelector('.career-plaque');
    const buttons = [...panelContent.querySelectorAll('[data-legacy-export]')];
    const status = panelContent.querySelector('.legacy-export-status');
    buttons.forEach(button => { button.disabled = true; });
    status.textContent = 'Creating resume image...';
    exportCareerResume(source, legacyExport.dataset.legacyExport, getCompanyIdentity().acronym)
      .then(message => { status.textContent = message; })
      .catch(() => { status.textContent = 'Image could not be created. Please try again.'; })
      .finally(() => { buttons.forEach(button => { button.disabled = false; }); });
    return;
  }
  if (catalogTab) {
    const nextCategory = catalogTab.dataset.catalogTab;
    if (nextCategory === selectedLoungeCatalogTab) return;
    const categories = ['packs', 'furniture', 'vinyl'];
    const direction = categories.indexOf(nextCategory) > categories.indexOf(selectedLoungeCatalogTab) ? 'forward' : 'back';
    selectedLoungeCatalogTab = nextCategory;
    const magazine = panelContent.querySelector('.catalog-magazine');
    magazine.dataset.turnDirection = direction;
    magazine.querySelectorAll('[data-catalog-tab]').forEach(tab => {
      const active = tab.dataset.catalogTab === nextCategory;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    magazine.querySelectorAll('[data-catalog-page]').forEach(page => {
      const active = page.dataset.catalogPage === nextCategory;
      page.hidden = !active;
      page.classList.remove('turning');
      if (active) {
        void page.offsetWidth;
        page.classList.add('turning');
        page.addEventListener('animationend', () => page.classList.remove('turning'), { once: true });
      }
    });
    return;
  }
  const continueToReply = event.target.closest('.email-reader');
  if (continueToReply && !hasNamedCompany() && terminalTab === 'email' && onboardingStep === 'read'
    && (selectedEmailId ?? getInbox()[0]?.id) === 'welcome' && !event.target.closest('form, input, button')) {
    onboardingStep = 'reply';
    refreshComputerPanel();
    return;
  }
  const loungePurchase = event.target.closest('[data-lounge-buy]');
  if (loungePurchase) {
    const result = buyLoungeItem(loungePurchase.dataset.loungeBuy);
    showToast(result.message);
    if (result.ok) location.reload();
    return;
  }
  const vinylPurchase = event.target.closest('[data-vinyl-buy]');
  if (vinylPurchase) {
    const result = buyVinyl(vinylPurchase.dataset.vinylBuy);
    showToast(result.message);
    if (result.ok) location.reload();
    return;
  }
  const packPurchase = event.target.closest('[data-pack-buy]');
  if (packPurchase) {
    if (packPurchase.dataset.packBuy === 'custom-wrestler') {
      openPanel('customWrestler');
      return;
    }
    purchasedPackFlipped = [];
    const result = buyPack(packPurchase.dataset.packBuy);
    showToast(result.ok ? `${result.pack.name}: ${result.cards.map(card => card.name).join(', ')}` : result.message);
    if (result.ok) openPanel('packVending');
    return;
  }
  const vinylPlay = event.target.closest('[data-vinyl-play]');
  if (vinylPlay) {
    setNowPlayingVinyl(vinylPlay.dataset.vinylPlay);
    refreshComputerPanel();
    return;
  }
  const vhsView = event.target.closest('[data-vhs-view]');
  if (vhsView) {
    selectedVhsIndex = Number(vhsView.dataset.vhsView);
    openPanel('vhsDetail');
    return;
  }
  const profileTab = event.target.closest('[data-wrestler-profile-tab]');
  if (profileTab) {
    wrestlerDetailTab = profileTab.dataset.wrestlerProfileTab;
    if (currentPanelKind === 'cardBook') openPanel('cardBook');
    else refreshComputerPanel();
    return;
  }
  const profileLink = event.target.closest('[data-profile]');
  if (profileLink) {
    if (currentPanelKind === 'cardBook') {
      cardBookScrollTop = panelContent.scrollTop;
      cardBookProfileId = profileLink.dataset.profile;
      wrestlerDetailTab = 'player';
      openPanel('cardBook');
      panelContent.scrollTop = 0;
      return;
    }
    const returnTo = { kind: currentPanelKind, label: panelTitle.textContent };
    terminalTab = 'roster';
    openPanel('computer');
    selectedWrestlerId = profileLink.dataset.profile;
    wrestlerDetailTab = 'player';
    profileReturn = returnTo;
    refreshComputerPanel();
    return;
  }
  const bookingHandled = handleBookingEvent(event, {
    toast: showToast,
    refresh: () => { if (panelOpen) refreshCurrentPanel(); },
    onReturnToCalendarWall: () => {
      closePanel();
      focusCalendarStation();
    },
    onOpenBookingBoard: () => openPanel('booking'),
    onOpenVending: () => { purchasedPackFlipped = []; openPanel('packVending'); },
    onShowRun: result => {
      playBroadcast(result, {
        onComplete: finished => {
          if (result.tragedy) {
            terminalTab = 'email';
            selectedEmailId = result.tragedy.emailId;
            openPanel('computer');
            showToast(`${result.tragedy.name} has passed away. The next show will be a tribute.`);
            return;
          }
          if (result.showNumber === 3) {
            terminalTab = 'email';
            selectedEmailId = 'free-agent-introduction';
            markEmailRead(selectedEmailId);
            openPanel('computer');
            showToast('A free Free Agent Pack is waiting in the vending machine.');
            return;
          }
          refreshCurrentPanel();
          showToast(`${finished.showName}: ${finished.rating} rating · ${finished.attendance.toLocaleString()} fans`);
        },
      });
    },
  });
  if (bookingHandled) {
    // 'in-place' means the panel already updated the DOM itself — re-rendering would
    // throw away the card flip mid-animation.
    if (bookingHandled !== 'in-place') refreshCurrentPanel();
    return;
  }
  const tab = event.target.closest('[data-tab]');
  if (tab) {
    terminalTab = tab.dataset.tab;
    selectedWrestlerId = null;
    profileReturn = null;
    rosterFocusId = null;
    selectedEmailId = null;
    refreshComputerPanel();
  }
  const statsPageButton = event.target.closest('[data-stats-page]');
  if (statsPageButton) {
    statsPage = statsPageButton.dataset.statsPage;
    refreshComputerPanel();
    return;
  }
  const statsTypeButton = event.target.closest('[data-stats-type]');
  if (statsTypeButton) {
    statsTypeFilter = statsTypeButton.dataset.statsType;
    refreshComputerPanel();
    return;
  }
  const emailRow = event.target.closest('[data-email]');
  if (emailRow) {
    selectedEmailId = emailRow.dataset.email;
    markEmailRead(selectedEmailId);
    refreshComputerPanel();
    refreshEmailNotification();
  }
  const wrestlerCard = event.target.closest('[data-wrestler]');
  if (wrestlerCard) {
    selectedWrestlerId = wrestlerCard.dataset.wrestler;
    wrestlerDetailTab = 'player';
    refreshComputerPanel();
  }
  if (event.target.closest('[data-back="roster"]')) {
    if (currentPanelKind === 'cardBook') {
      cardBookProfileId = null;
      openPanel('cardBook');
      panelContent.scrollTop = cardBookScrollTop;
      return;
    }
    selectedWrestlerId = null;
    if (profileReturn) {
      const { kind } = profileReturn;
      profileReturn = null;
      openPanel(kind);
      return;
    }
    refreshComputerPanel();
  }
  if (event.target.closest('[data-back="close"]')) {
    // The pack break hides the alt-menu rail, so its exit has to close that too.
    if (altMenuOpen) closeAltMenu();
    else closePanel();
  }
  const rosterSortButton = event.target.closest('[data-roster-sort]');
  if (rosterSortButton) {
    const key = rosterSortButton.dataset.rosterSort;
    if (rosterSort.key === key) rosterSort.dir = rosterSort.dir === 'asc' ? 'desc' : 'asc';
    else rosterSort = { key, dir: key === 'name' || key === 'style' ? 'asc' : 'desc' };
    refreshComputerPanel();
  }
  const rosterRow = event.target.closest('[data-roster-row]');
  if (rosterRow) {
    rosterFocusId = rosterRow.dataset.rosterRow;
    refreshComputerPanel();
  }
});

addEventListener('keydown', event => {
  if (!started || isBroadcastActive()) return;
  if (altMenuOpen) {
    if (event.code === 'Escape') { closeAltMenu(); event.preventDefault(); }
    return;
  }
  if (panelOpen) {
    const typing = ['INPUT', 'TEXTAREA'].includes(event.target.tagName);
    if (event.code === 'Escape' || (event.code === 'Space' && !typing)) closePanel();
    return;
  }
  if (galleryMode) {
    if (trophyGalleryMode) {
      if (event.code === 'Escape') {
        trophyGalleryMode = false;
        gallerySpotlight.intensity = 0;
        updateGalleryExhibit(true);
      }
      if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
        const direction = event.code === 'ArrowLeft' ? -1 : 1;
        const exhibits = activeTrophyExhibits();
        if (exhibits.length) {
          trophyExhibit = (trophyExhibit - direction + exhibits.length) % exhibits.length;
          updateTrophyExhibit();
        }
      }
      if (event.code === 'Space') activateTrophyExhibit();
      if (['Escape', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
      return;
    }
    if (event.code === 'Escape') exitGallery();
    if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
      const direction = event.code === 'ArrowLeft' ? -1 : 1;
      const exhibits = activeGalleryExhibits();
      galleryExhibit = (galleryExhibit + direction + exhibits.length) % exhibits.length;
      updateGalleryExhibit();
    }
    if (event.code === 'Space') activateGalleryExhibit();
    if (['Escape', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    return;
  }
  if (loungeMode) {
    if (event.code === 'Escape') exitLounge();
    if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
      const direction = event.code === 'ArrowLeft' ? -1 : 1;
      const exhibits = activeLoungeExhibits();
      loungeExhibit = (loungeExhibit + direction + exhibits.length) % exhibits.length;
      updateLoungeExhibit();
    }
    if (event.code === 'Space') {
      const exhibit = activeLoungeExhibits()[loungeExhibit];
      if (exhibit.panel) openPanel(exhibit.panel);
      else exitLounge();
    }
    if (['Escape', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    return;
  }
  if (vhsMode) {
    if (event.code === 'Escape') exitVhsShelf();
    if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
      const direction = event.code === 'ArrowLeft' ? -1 : 1;
      const exhibits = activeVhsExhibits();
      if (exhibits.length) {
        vhsExhibit = (vhsExhibit + direction + exhibits.length) % exhibits.length;
        updateVhsExhibit();
      }
    }
    if (event.code === 'Space' || event.code === 'Enter') activateVhsExhibit();
    if (['Escape', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter'].includes(event.code)) event.preventDefault();
    return;
  }
  if (event.code === 'Escape') { openAltMenu(); event.preventDefault(); return; }
  if (event.code === 'ArrowLeft') moveStation(-1);
  if (event.code === 'ArrowRight') moveStation(1);
  if (event.code === 'Space') {
    if (stations[station].panel === 'trophies') enterGallery();
    else if (stations[station].panel === 'lounge') enterLounge();
    else if (stations[station].panel === 'vhsShelf') {
      enterVhsShelf();
      if (activeVhsExhibits().length) activateVhsExhibit();
      else openPanel('vhsShelf');
    }
    else openPanel(stations[station].panel);
  }
  if (['ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
});

updateStation(true);
refreshWorldSigns();
renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), .05);
  const elapsed = clock.getElapsedTime();
  windowReflectionTextures.forEach((texture, index) => {
    texture.offset.x = (elapsed * .0025 + index * .17) % 1;
  });
  camera.position.lerp(targetPosition, 1 - Math.exp(-delta * 4.8));
  currentLookAt.lerp(targetLookAt, 1 - Math.exp(-delta * 4.8));
  camera.lookAt(currentLookAt);
  renderer.render(scene, camera);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  if (!loungeMode && stations[station].name === 'GM LEGACY') updateStation();
  if (loungeMode) updateLoungeExhibit();
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
});
