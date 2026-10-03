// The annual pay-per-view calendar. Twelve themed flagship events repeat every year.
// Battle Royale is an optional match gimmick, not a fixed annual event.

export const PPV_CALENDAR = [
  { month: 1, id: 'day-one', name: 'Day 1', logoId: 'day1', color: '#d7dce1', theme: 'A new year begins with every contender making their first statement.' },
  { month: 2, id: 'valentines-massacre', name: "St. Valentine's Day Massacre", logoId: 'valentines', color: '#9e2436', theme: 'Valentine season — betrayals hit differently in February.' },
  { month: 3, id: 'spring-stampede', name: 'Spring Stampede', logoId: 'spring-stampede', color: '#d89b2a', theme: 'The road to summer starts here.' },
  { month: 4, id: 'in-your-house', name: 'In Your House', logoId: 'inyourhouse', color: '#4b9fc1', theme: 'Titles, careers, and contracts all feel closer to home.' },
  { month: 5, id: 'bash-at-the-beach', name: 'Bash at the Beach', logoId: 'BashAtTheBeach', color: '#33a8ca', theme: 'A sun-soaked spectacle built for chaos.' },
  { month: 6, id: 'super-brawl', name: 'SuperBrawl', logoId: 'SuperBrawl', color: '#b28b45', theme: 'A midyear collision where every contender can change the picture.' },
  { month: 7, id: 'summer-slam', name: 'SummerSlam', logoId: 'summerslam', color: '#f0a329', theme: 'The heat of summer, the heat of the ring.' },
  { month: 8, id: 'mayhem', name: 'Mayhem', logoId: 'mayhem', color: '#8b232b', theme: 'A late-summer card built to leave bruises.' },
  { month: 9, id: 'fall-brawl', name: 'Fall Brawl', logoId: 'fallbrawl', color: '#a97532', theme: 'Blue-collar main events for a blue-collar crowd.' },
  { month: 10, id: 'halloween-havoc', name: 'Halloween Havoc', logoId: 'halloween-havoc', color: '#e26a24', theme: 'A horror-themed spectacle card.' },
  { month: 11, id: 'badd-blood', name: 'Badd Blood', logoId: 'baddblood', color: '#941c2c', theme: 'Grudges are settled before the year runs out.' },
  { month: 12, id: 'wrestlemania', name: 'WrestleMania', logoId: 'wrestlemania', color: '#b82d31', theme: 'The year-end spectacular — every story pays off or carries over.', flagship: true },
];

export const PPV_LOGOS = [
  ['generated', 'Generated logo'],
  ['day1', 'Day 1'], ['valentines', 'Valentine\'s'], ['spring-stampede', 'Spring Stampede'],
  ['inyourhouse', 'In Your House'], ['BashAtTheBeach', 'Bash at the Beach'], ['royalrumble', 'Royal Rumble'],
  ['summerslam', 'SummerSlam'], ['mayhem', 'Mayhem'], ['fallbrawl', 'Fall Brawl'],
  ['halloween-havoc', 'Halloween Havoc'], ['baddblood', 'Badd Blood'], ['wrestlemania', 'WrestleMania'],
  ['SuperBrawl', 'SuperBrawl'], ['starrcade', 'Starrcade'], ['nitro', 'Nitro'],
];

export function lastMondayOfMonth(year, month) {
  const date = new Date(year, month, 0, 12);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
}

export function ppvDateForShowNumber(showNumber) {
  const monthIndex = (showNumber - 1) % PPV_CALENDAR.length;
  const year = 1996 + Math.floor((showNumber - 1) / PPV_CALENDAR.length);
  return lastMondayOfMonth(year, monthIndex + 1);
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function createEventBranding() {
  return Object.fromEntries(PPV_CALENDAR.map(event => [event.id, {
    name: event.name,
    logoId: event.logoId,
    color: event.color,
    colorCustomized: false,
    logoStyle: 0,
  }]));
}

function seededValue(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function generatedLogoUrl(name, color, style = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 420;
  const context = canvas.getContext('2d');
  const seed = [...`${name}${color}${style}`].reduce((total, char) => total + char.charCodeAt(0), style + 1);
  const random = seededValue(seed);
  const words = (name || 'MAIN EVENT').toUpperCase().split(/\s+/).filter(Boolean);
  const split = Math.ceil(words.length / 2);
  const lines = words.length > 1 ? [words.slice(0, split).join(' '), words.slice(split).join(' ')] : words;
  const fonts = ['Impact, sans-serif', 'Arial Black, sans-serif', 'Georgia, serif', 'Trebuchet MS, sans-serif'];
  const motifs = ['star', 'bolt', 'crown', 'rings'];
  const motif = motifs[Math.floor(random() * motifs.length)];
  const backgrounds = ['stripes', 'burst', 'vignette', 'dots'];
  const background = backgrounds[Math.floor(random() * backgrounds.length)];
  const accent = color || '#c49a46';

  context.fillStyle = '#101116';
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (background === 'stripes') {
    context.globalAlpha = .28;
    context.fillStyle = accent;
    for (let stripe = -420; stripe < 800; stripe += 76) {
      context.save();
      context.translate(stripe, 0);
      context.rotate(-.34);
      context.fillRect(0, -130, 26, 720);
      context.restore();
    }
    context.globalAlpha = 1;
  } else if (background === 'burst') {
    context.globalAlpha = .22;
    context.strokeStyle = accent;
    context.lineWidth = 10;
    for (let ray = 0; ray < 16; ray += 1) {
      const angle = (Math.PI * 2 * ray) / 16;
      context.save();
      context.translate(360, 210);
      context.rotate(angle);
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(420, 0);
      context.stroke();
      context.restore();
    }
    context.globalAlpha = 1;
  } else if (background === 'vignette') {
    const gradient = context.createRadialGradient(360, 210, 40, 360, 210, 430);
    gradient.addColorStop(0, `${accent}55`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    context.globalAlpha = .3;
    context.fillStyle = accent;
    for (let gx = 20; gx < canvas.width; gx += 46) {
      for (let gy = 20; gy < canvas.height; gy += 46) {
        context.beginPath();
        context.arc(gx, gy, 3, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.globalAlpha = 1;
  }

  context.strokeStyle = accent;
  context.lineWidth = 15;
  context.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
  context.save();
  context.translate(360, 205);
  context.strokeStyle = accent;
  context.lineWidth = 12;
  context.globalAlpha = .42;
  if (motif === 'star') {
    context.beginPath();
    for (let point = 0; point < 10; point += 1) {
      const radius = point % 2 ? 96 : 185;
      const angle = -Math.PI / 2 + point * Math.PI / 5;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      point ? context.lineTo(x, y) : context.moveTo(x, y);
    }
    context.closePath();
    context.stroke();
  } else if (motif === 'bolt') {
    context.beginPath(); context.moveTo(-50, -170); context.lineTo(80, -170); context.lineTo(12, -28); context.lineTo(118, -28); context.lineTo(-92, 176); context.lineTo(-32, 36); context.lineTo(-120, 36); context.closePath(); context.stroke();
  } else if (motif === 'crown') {
    context.beginPath(); context.moveTo(-160, 105); context.lineTo(-125, -115); context.lineTo(-45, -22); context.lineTo(0, -150); context.lineTo(48, -22); context.lineTo(128, -115); context.lineTo(160, 105); context.closePath(); context.stroke();
  } else {
    [75, 125, 175].forEach(radius => { context.beginPath(); context.arc(0, 0, radius, 0, Math.PI * 2); context.stroke(); });
  }
  context.restore();

  // Fit the font to the available width so long names can't spill past the border.
  const fontFamily = fonts[Math.floor(random() * fonts.length)];
  const maxTextWidth = canvas.width - 140;
  let fontSize = lines.length > 1 ? 94 : 124;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  lines.forEach(line => {
    context.font = `900 ${fontSize}px ${fontFamily}`;
    while (fontSize > 32 && context.measureText(line).width > maxTextWidth) {
      fontSize -= 4;
      context.font = `900 ${fontSize}px ${fontFamily}`;
    }
  });
  context.font = `900 ${fontSize}px ${fontFamily}`;
  context.fillStyle = '#f4ead6';
  context.strokeStyle = '#111116';
  context.lineWidth = 14;
  const lineHeight = fontSize * 1.05;
  const startY = 210 - (lineHeight * (lines.length - 1)) / 2;
  lines.forEach((line, index) => {
    const y = startY + index * lineHeight;
    context.strokeText(line, 360, y);
    context.fillText(line, 360, y);
  });
  context.fillStyle = accent;
  context.fillRect(150, 350, 420, 10);
  return canvas.toDataURL('image/png');
}

export function logoUrl(logoId, name, color, style) {
  if (logoId === 'generated') return generatedLogoUrl(name, color, style);
  return `${import.meta.env.BASE_URL}ppv-logos/${logoId}.png`;
}

export function eventDisplayName(event, showNumber, branding = {}) {
  const custom = branding[event.id] ?? event;
  const name = custom.name || event.name;
  const year = yearForShowNumber(showNumber);
  if (event.flagship) return `${name} ${ROMAN_NUMERALS[(year - 1996) % ROMAN_NUMERALS.length] ?? year - 1995}`;
  return `${name} '${String(year).slice(-2)}`;
}

// The short tag that goes on the show's VHS spine: a roman numeral for the yearly
// flagship supercard, or a two-digit year for every other themed event.
export function editionLabel(event, showNumber) {
  const year = yearForShowNumber(showNumber);
  if (event?.flagship) return ROMAN_NUMERALS[(year - 1996) % ROMAN_NUMERALS.length] ?? String(year - 1995);
  return `'${String(year).slice(-2)}`;
}

// Show 1 is always January's event; the calendar repeats every 12 shows thereafter.
export function calendarForShowNumber(showNumber) {
  const index = (showNumber - 1) % PPV_CALENDAR.length;
  return PPV_CALENDAR[index];
}

export function yearForShowNumber(showNumber) {
  return 1996 + Math.floor((showNumber - 1) / PPV_CALENDAR.length);
}
