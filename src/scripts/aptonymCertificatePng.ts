// Draws the aptonym certificate onto a canvas (2400×1697, landscape) and downloads it as a PNG, so a
// holder can post the image itself on LinkedIn. Mirrors src/components/AptonymCertificate.astro.

export interface PngData {
  before: string;
  apt: string;
  after: string;
  phrase: string;
  profession: string;
  fits: string;
  code: string;
  date: string;
  issuer: string;
  credential: string;
  registrar: string;
  motto: string;
  verify: string;
}

const W = 2400;
const H = Math.round(W / 1.414);
const INK = '#2b2118';
const GOLD = '#b0862f';
const SERIF = '"Cormorant Garamond", Georgia, serif';

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
  }
  return lines;
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  const chars = [...text];
  const total = chars.reduce((s, c) => s + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);
  let cx = x - total / 2;
  ctx.textAlign = 'left';
  for (const c of chars) {
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + spacing;
  }
  ctx.textAlign = 'center';
}

function seal(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, ring: string) {
  ctx.save();
  ctx.fillStyle = GOLD;
  for (let i = 0; i < 36; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((i * Math.PI) / 18);
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.1);
    ctx.lineTo(r * 0.07, -r * 0.88);
    ctx.lineTo(-r * 0.07, -r * 0.88);
    ctx.fill();
    ctx.restore();
  }
  ctx.shadowColor = 'rgba(0,0,0,.25)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#c99a3b';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.93, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#f4dd9c';
  ctx.lineWidth = 3;
  for (const rr of [0.89, 0.61]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#fff6dc';
  ctx.font = `700 ${r * 0.14}px ${SERIF}`;
  const chars = [...ring];
  const step = (Math.PI * 2) / chars.length;
  chars.forEach((c, i) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(i * step);
    ctx.fillText(c, 0, -r * 0.7);
    ctx.restore();
  });
  ctx.font = `700 ${r * 0.48}px ${SERIF}`;
  ctx.fillText('Ap', cx, cy + r * 0.14);
  ctx.font = `500 ${r * 0.12}px ${SERIF}`;
  spaced(ctx, 'CERTIFIED', cx, cy + r * 0.36, r * 0.02);
  ctx.restore();
}

export async function drawCertificate(d: PngData): Promise<HTMLCanvasElement> {
  await Promise.all([
    document.fonts.load(`700 40px "Cormorant Garamond"`),
    document.fonts.load(`italic 500 40px "Cormorant Garamond"`),
    document.fonts.load(`600 40px "Cormorant Garamond"`),
    document.fonts.load(`40px "Pinyon Script"`),
  ]).catch(() => {});

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Paper
  ctx.fillStyle = '#fbf6e9';
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, H * 0.4, 50, W / 2, H * 0.4, W * 0.6);
  glow.addColorStop(0, 'rgba(255,255,255,.75)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Borders and corners
  const m = W * 0.022;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = W * 0.0035;
  ctx.strokeRect(m, m, W - 2 * m, H - 2 * m);
  ctx.lineWidth = W * 0.0012;
  const m2 = m + W * 0.011;
  ctx.strokeRect(m2, m2, W - 2 * m2, H - 2 * m2);
  const k = W * 0.05;
  const o = m + W * 0.018;
  ctx.lineWidth = W * 0.003;
  for (const [x, y, sx, sy] of [[o, o, 1, 1], [W - o, o, -1, 1], [o, H - o, 1, -1], [W - o, H - o, -1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(x, y + sy * k);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * k, y);
    ctx.stroke();
  }

  const u = W / 100; // 1cqw
  let y = m + 3.2 * u + 1.6 * u;
  const drop = 4 * u; // balance the body between the header and the footer

  ctx.fillStyle = GOLD;
  ctx.font = `700 ${1.6 * u}px ${SERIF}`;
  spaced(ctx, d.issuer.toUpperCase(), W / 2, y, 0.6 * u);

  y += 5.4 * u + drop;
  ctx.fillStyle = INK;
  ctx.font = `700 ${4.6 * u}px ${SERIF}`;
  ctx.fillText('Certificate of Aptonymity', W / 2, y);

  y += 3.6 * u;
  ctx.font = `italic 500 ${1.85 * u}px ${SERIF}`;
  ctx.fillText('This is to certify that', W / 2, y);

  // Holder, with the aptonym gilded
  y += 6.2 * u;
  ctx.font = `600 ${5.4 * u}px ${SERIF}`;
  const parts = [d.before, d.apt, d.after];
  const widths = parts.map((p) => ctx.measureText(p).width);
  const total = widths.reduce((a, b) => a + b, 0);
  let x = W / 2 - total / 2;
  ctx.textAlign = 'left';
  parts.forEach((p, i) => {
    if (i === 1) {
      const g = ctx.createLinearGradient(0, y - 5 * u, 0, y);
      g.addColorStop(0, '#d9a93f');
      g.addColorStop(1, '#8c6418');
      ctx.fillStyle = g;
      ctx.fillText(p, x, y);
      ctx.fillStyle = 'rgba(176,134,47,.55)';
      ctx.fillRect(x, y + 0.7 * u, widths[1], 0.2 * u);
    } else {
      ctx.fillStyle = INK;
      ctx.fillText(p, x, y);
    }
    x += widths[i];
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(176,134,47,.6)';
  ctx.fillRect(W / 2 - total / 2 - 3 * u, y + 1.4 * u, total + 6 * u, 0.12 * u);

  y += 4.6 * u;
  ctx.fillStyle = INK;
  ctx.font = `italic 500 ${1.85 * u}px ${SERIF}`;
  ctx.fillText(`is a ${d.credential}, ${d.phrase} fits their calling as`, W / 2, y);

  y += 3.8 * u;
  ctx.font = `700 ${2.9 * u}px ${SERIF}`;
  ctx.fillText(d.profession, W / 2, y);

  y += 3.2 * u;
  ctx.fillStyle = '#4a3b2c';
  ctx.font = `italic 500 ${1.75 * u}px ${SERIF}`;
  for (const line of wrap(ctx, `“${d.fits}”`, 72 * u, 3)) {
    ctx.fillText(line, W / 2, y);
    y += 2.4 * u;
  }

  // Footer: signature · seal · credential
  const footY = H - m - 4.6 * u;
  const colL = W * 0.24;
  const colR = W * 0.76;
  ctx.fillStyle = '#1d2c4f';
  ctx.font = `${3.6 * u}px "Pinyon Script", cursive`;
  ctx.fillText(d.registrar, colL, footY - 2 * u);
  ctx.fillStyle = INK;
  ctx.fillRect(colL - 10 * u, footY - 1.2 * u, 20 * u, 0.1 * u);
  ctx.fillStyle = '#6b5a45';
  ctx.font = `500 ${1.2 * u}px ${SERIF}`;
  spaced(ctx, 'REGISTRAR', colL, footY + 0.6 * u, 0.2 * u);

  seal(ctx, W / 2, footY - 4 * u, 5.5 * u, `THE APTONYM REGISTRY · ${d.motto.toUpperCase()} · `);

  ctx.fillStyle = '#6b5a45';
  ctx.font = `500 ${1.2 * u}px ${SERIF}`;
  spaced(ctx, 'CREDENTIAL ID', colR, footY - 7 * u, 0.2 * u);
  ctx.fillStyle = INK;
  ctx.font = `700 ${1.4 * u}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.fillText(d.code, colR, footY - 5 * u);
  ctx.fillStyle = '#6b5a45';
  ctx.font = `500 ${1.2 * u}px ${SERIF}`;
  spaced(ctx, 'ISSUED', colR, footY - 3 * u, 0.2 * u);
  ctx.fillStyle = INK;
  ctx.font = `500 ${1.5 * u}px ${SERIF}`;
  ctx.fillText(d.date, colR, footY - 1.1 * u);
  ctx.fillStyle = '#6b5a45';
  ctx.font = `500 ${1.05 * u}px ${SERIF}`;
  ctx.fillText(d.verify, colR, footY + 0.8 * u);

  return c;
}

export async function downloadCertificate(d: PngData, filename: string) {
  const canvas = await drawCertificate(d);
  const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
