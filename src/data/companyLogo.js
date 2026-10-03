// Generates a company mark from a small set of original shape/layout presets.

export const COMPANY_LOGO_STYLES = ['seal', 'block', 'condensed', 'italic'];
export const COMPANY_LOGO_STYLE_LABELS = {
  seal: 'Classic Seal',
  block: 'Power Block',
  condensed: 'Tall Type',
  italic: 'Speed Italic',
};

const PALETTES = [
  ['#c49a46', '#1a1610'], ['#b23831', '#141010'], ['#4b9fc1', '#0e1518'],
  ['#8b232b', '#160c0d'], ['#33a8ca', '#0c1518'], ['#d89b2a', '#1a1408'],
];

function seededValue(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function paletteForCompany(acronym, name) {
  const seed = [...`${acronym}${name}`].reduce((total, char) => total + char.charCodeAt(0), acronym.length);
  const random = seededValue(seed);
  return PALETTES[Math.floor(random() * PALETTES.length)];
}

export function companyLogoAccent(acronym, name) {
  return paletteForCompany(acronym, name)[0];
}

// Lays out `text` along a circular arc centered on `centerAngle`, one character at a time.
function drawArcText(ctx, text, radius, centerAngle) {
  const widths = [...text].map(char => ctx.measureText(char).width);
  const totalAngle = widths.reduce((sum, w) => sum + w / radius, 0);
  ctx.save();
  ctx.rotate(centerAngle - totalAngle / 2);
  widths.forEach((width, index) => {
    const charAngle = width / radius;
    ctx.rotate(charAngle / 2);
    ctx.save();
    ctx.translate(0, -radius);
    ctx.fillText(text[index], 0, 0);
    ctx.restore();
    ctx.rotate(charAngle / 2);
  });
  ctx.restore();
}

function drawPowerBlock(ctx, accent, ink, acronym, name) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${acronym.length > 3 ? 150 : 188}px 'Arial Black', Impact, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 18;
  ctx.strokeStyle = ink;
  ctx.strokeText(acronym, 5, 10, 438);
  ctx.lineWidth = 7;
  ctx.strokeStyle = accent;
  ctx.strokeText(acronym, 0, 0, 438);
  ctx.fillStyle = '#f4ead6';
  ctx.fillText(acronym, 0, 0, 438);
  drawNameRule(ctx, accent, name, 132);
  ctx.restore();
}

function drawTallType(ctx, accent, ink, acronym, name) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.scale(.86, 1.14);
  ctx.font = `900 ${acronym.length > 3 ? 144 : 184}px 'Barlow Condensed', Impact, sans-serif`;
  ctx.lineJoin = 'bevel';
  ctx.lineWidth = 13;
  ctx.strokeStyle = ink;
  ctx.strokeText(acronym, 0, -7, 490);
  ctx.fillStyle = accent;
  ctx.fillText(acronym, 0, -7, 490);
  ctx.restore();
  drawNameRule(ctx, ink, name, 144, accent);
}

function drawSpeedItalic(ctx, accent, ink, acronym, name) {
  ctx.save();
  ctx.transform(1, 0, -.16, 1, -10, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `italic 900 ${acronym.length > 3 ? 142 : 174}px 'Arial Black', Arial, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 20;
  ctx.strokeStyle = ink;
  ctx.strokeText(acronym, 0, 0, 390);
  ctx.lineWidth = 8;
  ctx.strokeStyle = accent;
  ctx.strokeText(acronym, 0, -6, 390);
  ctx.fillStyle = '#f4ead6';
  ctx.fillText(acronym, 0, -6, 390);
  ctx.restore();
  drawNameRule(ctx, accent, name, 120);
}

function drawNameRule(ctx, color, name, y, secondary = null) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f4ead6';
  ctx.font = "700 17px 'DM Mono', 'Courier New', monospace";
  ctx.fillText(name.toUpperCase(), 0, y, 400);
  ctx.strokeStyle = secondary ?? color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-128, y + 20);
  ctx.lineTo(128, y + 20);
  ctx.stroke();
  ctx.restore();
}

export function companyLogoUrl(acronym, name, style = 'seal', customAccent = null) {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  const [defaultAccent, ink] = paletteForCompany(acronym, name);
  const accent = /^#[\da-f]{6}$/i.test(customAccent ?? '') ? customAccent : defaultAccent;
  const compatibleStyle = ({ shield: 'block', banner: 'condensed', starburst: 'italic' })[style] ?? style;

  ctx.translate(240, 240);

  if (compatibleStyle === 'block') drawPowerBlock(ctx, accent, ink, acronym, name);
  else if (compatibleStyle === 'condensed') drawTallType(ctx, accent, ink, acronym, name);
  else if (compatibleStyle === 'italic') drawSpeedItalic(ctx, accent, ink, acronym, name);
  else drawSeal(ctx, accent, ink, acronym, name);

  return canvas.toDataURL('image/png');
}

function drawSeal(ctx, accent, ink, acronym, name) {
  // Outer ring
  ctx.beginPath();
  ctx.arc(0, 0, 218, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();

  // Inner seal face
  const faceRadius = 198;
  const faceGradient = ctx.createRadialGradient(-30, -60, 20, 0, 0, faceRadius);
  faceGradient.addColorStop(0, '#2a2620');
  faceGradient.addColorStop(1, ink);
  ctx.beginPath();
  ctx.arc(0, 0, faceRadius, 0, Math.PI * 2);
  ctx.fillStyle = faceGradient;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, faceRadius - 16, 0, Math.PI * 2);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Company name curved around the top rim
  ctx.fillStyle = accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = "700 21px Georgia, 'Times New Roman', serif";
  drawArcText(ctx, `\u2022 ${name.toUpperCase()} \u2022`, faceRadius - 40, -Math.PI / 2);

  // Acronym, centered — a condensed serif instead of the PPV generator's Impact/Arial Black
  ctx.fillStyle = '#f4ead6';
  ctx.strokeStyle = ink;
  ctx.lineWidth = 6;
  ctx.font = `italic 900 ${acronym.length > 3 ? 108 : 138}px Georgia, 'Big Caslon', 'Times New Roman', serif`;
  ctx.strokeText(acronym, 0, 6);
  ctx.fillText(acronym, 0, 6);

  // Small dots flanking a baseline rule, like a laurel seal
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-70, 62);
  ctx.lineTo(70, 62);
  ctx.stroke();
  [-92, 92].forEach(x => {
    ctx.beginPath();
    ctx.arc(x, 62, 5, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
  });

}

