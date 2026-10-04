import { PPV_CALENDAR, logoUrl } from '../data/calendar.js';
import { venues } from '../data/venues.js';
import { getMatchType } from '../data/matchTypes.js';
import { CHAMPIONSHIPS } from '../data/championships.js';
import { getWrestlerById } from '../data/wrestlers.js';
import { wrestlerImageUrl } from '../data/wrestlerImages.js';

export function createPpvPoster(show, branding = {}, companyName = '') {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1200;
  const context = canvas.getContext('2d');
  const event = PPV_CALENDAR.find(entry => entry.id === show.eventId);
  const identity = show.eventBranding ?? branding;
  const name = identity.name || show.showName || show.name;
  const venue = venues.find(entry => entry.id === show.venueId);
  const accent = /^#[\da-f]{6}$/i.test(identity.color ?? event?.color ?? '') ? identity.color || event.color : '#b73039';
  const logo = logoUrl(identity.logoId || event?.logoId || 'generated', name, accent, identity.logoStyle);
  const matches = [...show.matches].reverse().map((match, index) => {
    const sides = match.sideIds ?? match.teams ?? [[], []];
    return {
      label: index === 0 ? 'MAIN EVENT' : match.label || `MATCH ${show.matches.length - index}`,
      sides: sides.map(side => side.map(id => {
        const wrestler = getWrestlerById(id);
        return { name: wrestler?.name ?? 'TBA', image: wrestler ? wrestlerImageUrl(wrestler) : null };
      })),
      type: match.typeName || getMatchType(match.typeId)?.name || 'Match',
      title: CHAMPIONSHIPS.find(title => title.id === match.titleId)?.name || '',
    };
  });
  const images = new Map();
  let disposed = false;

  const text = (value, x, y, maxWidth, size, color = '#f3f1e9') => {
    context.fillStyle = color;
    context.font = `700 ${size}px Georgia, serif`;
    while (context.measureText(value).width > maxWidth && size > 12) {
      size -= 1;
      context.font = `700 ${size}px Georgia, serif`;
    }
    context.fillText(value, x, y, maxWidth);
  };
  const drawImage = (url, x, y, width, height, contain = false) => {
    const image = images.get(url);
    if (!image) return false;
    const scale = (contain ? Math.min : Math.max)(width / image.width, height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    context.save();
    context.beginPath();
    context.rect(x, y, width, height);
    context.clip();
    context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) * (contain ? .5 : .18), drawWidth, drawHeight);
    context.restore();
    return true;
  };
  const draw = () => {
    if (disposed) return;
    context.fillStyle = '#141619';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = accent;
    context.fillRect(20, 20, 860, 8);
    context.strokeStyle = '#d6d9d4';
    context.lineWidth = 2;
    context.strokeRect(20, 20, 860, 1160);
    context.textAlign = 'center';
    text(companyName.toUpperCase(), 450, 60, 790, 18, '#c7ccc9');
    if (!drawImage(logo, 150, 76, 600, 115, true)) text(name.toUpperCase(), 450, 155, 790, 48);
    text(String(show.date || '').toUpperCase(), 450, 216, 790, 22);
    text([show.venueName || venue?.name, show.city || venue?.city].filter(Boolean).join(' / '), 450, 244, 790, 18, '#c7ccc9');
    const availableHeight = 854;
    const normalHeight = Math.min(178, availableHeight / (matches.length + .5));
    let top = 274;
    matches.forEach((match, index) => {
      const height = normalHeight * (index === 0 ? 1.5 : 1);
      context.fillStyle = index === 0 ? '#252b2e' : index % 2 ? '#1c2023' : '#171b1e';
      context.fillRect(36, top, 828, height - 8);
      text(match.label.toUpperCase(), 450, top + 26, 790, 18, index === 0 ? '#e8c979' : '#a9c6cd');
      const sides = match.sides.length ? match.sides : [[], []];
      const sideWidth = 750 / sides.length;
      const photoHeight = Math.min(136, height - 94);
      const photoTop = top + 35;
      sides.forEach((side, sideIndex) => {
        const members = side.length ? side : [{ name: 'TBA', image: null }];
        const center = 75 + sideWidth * (sideIndex + .5);
        const photoWidth = Math.min(100, (sideWidth - 40) / members.length);
        members.forEach((member, memberIndex) => {
          const x = center - members.length * photoWidth / 2 + memberIndex * photoWidth;
          context.fillStyle = '#343d41';
          context.fillRect(x + 2, photoTop, photoWidth - 4, photoHeight);
          if (!drawImage(member.image, x + 2, photoTop, photoWidth - 4, photoHeight)) text('?', x + photoWidth / 2, photoTop + photoHeight * .65, photoWidth - 8, 30, '#a9c6cd');
        });
        text(members.map(member => member.name).join(' & '), center, photoTop + photoHeight + 24, sideWidth - 24, index === 0 ? 24 : 20);
        if (sideIndex < sides.length - 1) text('VS', 75 + sideWidth * (sideIndex + 1), photoTop + photoHeight / 2 + 8, 36, 16, '#e8c979');
      });
      text([match.type, match.title].filter(Boolean).join(' / '), 450, top + height - 19, 790, 16, '#c7ccc9');
      top += height;
    });
    text('PAY-PER-VIEW', 450, 1158, 790, 18, '#c7ccc9');
  };
  draw();
  const urls = [...new Set([logo, ...matches.flatMap(match => match.sides.flatMap(side => side.map(member => member.image)))].filter(Boolean))];
  const ready = Promise.all(urls.map(url => new Promise(resolve => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (!disposed) images.set(url, image);
      resolve();
    };
    image.onerror = () => resolve();
    image.src = url;
  }))).then(draw);
  return { canvas, ready, dispose: () => { disposed = true; images.clear(); } };
}