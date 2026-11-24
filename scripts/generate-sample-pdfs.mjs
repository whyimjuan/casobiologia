// Genera los PDF y las imágenes de muestra del expediente (material ficticio).
import { writeFileSync, mkdirSync } from 'node:fs';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

const OUT = new URL('../public/case/docs/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const MARK = 'MATERIAL FICTICIO - SIMULACION ACADEMICA';
const INK = rgb(0.1, 0.13, 0.2);
const MUTED = rgb(0.35, 0.38, 0.45);
const GOLD = rgb(0.72, 0.59, 0.24);
const RED = rgb(0.56, 0.23, 0.23);

async function makePdf(file, { org, code, title, date, pages }) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${title} (${MARK})`);
  pdf.setSubject(MARK);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifB = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  pages.forEach((blocks, pi) => {
    const page = pdf.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.985, 0.978, 0.96) });
    page.drawRectangle({ x: 0, y: height - 18, width, height: 18, color: RED });
    page.drawText(MARK, { x: width / 2 - sansB.widthOfTextAtSize(MARK, 7.5) / 2, y: height - 12.5, size: 7.5, font: sansB, color: rgb(1, 1, 1) });
    page.drawRectangle({ x: 0, y: 0, width, height: 18, color: RED });
    page.drawText(MARK, { x: width / 2 - sansB.widthOfTextAtSize(MARK, 7.5) / 2, y: 5.5, size: 7.5, font: sansB, color: rgb(1, 1, 1) });

    page.drawCircle({ x: 72, y: height - 66, size: 17, borderColor: INK, borderWidth: 1.5 });
    page.drawText('AG', { x: 63.5, y: height - 70.5, size: 11, font: serifB, color: INK });
    page.drawText(org.toUpperCase(), { x: 100, y: height - 62, size: 10, font: sansB, color: INK });
    page.drawText(`Ref. ${code}  ·  ${date}`, { x: 100, y: height - 76, size: 8.5, font: mono, color: MUTED });
    page.drawLine({ start: { x: 54, y: height - 96 }, end: { x: width - 54, y: height - 96 }, thickness: 1.4, color: GOLD });

    let y = height - 130;
    if (pi === 0) {
      page.drawText(title, { x: 54, y, size: 19, font: serifB, color: INK });
      y -= 30;
    }
    const wrap = (text, font, size, maxW) => {
      const words = text.split(' ');
      const lines = [];
      let line = '';
      for (const w of words) {
        const t = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(t, size) > maxW) { lines.push(line); line = w; } else line = t;
      }
      if (line) lines.push(line);
      return lines;
    };
    for (const b of blocks) {
      if (b.h) {
        y -= 6;
        page.drawText(b.h.toUpperCase(), { x: 54, y, size: 9, font: sansB, color: MUTED });
        y -= 16;
      }
      if (b.p) {
        for (const l of wrap(b.p, serif, 11.5, width - 108)) {
          page.drawText(l, { x: 54, y, size: 11.5, font: serif, color: INK });
          y -= 16;
        }
        y -= 8;
      }
      if (b.table) {
        const cols = b.table[0].length;
        const cw = (width - 108) / cols;
        b.table.forEach((row, ri) => {
          if (ri === 0) page.drawRectangle({ x: 54, y: y - 5, width: width - 108, height: 18, color: rgb(0.92, 0.91, 0.88) });
          row.forEach((cell, ci) => page.drawText(cell, { x: 58 + ci * cw, y, size: 9, font: ri === 0 ? sansB : sans, color: INK }));
          page.drawLine({ start: { x: 54, y: y - 6 }, end: { x: width - 54, y: y - 6 }, thickness: 0.5, color: rgb(0.8, 0.78, 0.72) });
          y -= 20;
        });
        y -= 10;
      }
      if (b.sign) {
        y -= 20;
        page.drawLine({ start: { x: width - 260, y }, end: { x: width - 54, y }, thickness: 0.8, color: INK });
        page.drawText(b.sign, { x: width - 260, y: y - 13, size: 8.5, font: sans, color: MUTED });
        y -= 30;
      }
    }
    page.drawText('MATERIAL FICTICIO', { x: 120, y: 300, size: 54, font: sansB, color: RED, opacity: 0.12, rotate: degrees(32) });
    page.drawText('SIMULACION ACADEMICA', { x: 150, y: 250, size: 32, font: sansB, color: RED, opacity: 0.12, rotate: degrees(32) });
    page.drawText(`${code}`, { x: 54, y: 30, size: 8, font: mono, color: MUTED });
    const pn = `Pagina ${pi + 1} de ${pages.length}`;
    page.drawText(pn, { x: width - 54 - sans.widthOfTextAtSize(pn, 8), y: 30, size: 8, font: sans, color: MUTED });
  });
  writeFileSync(OUT + file, await pdf.save());
  console.log('PDF', file);
}

await makePdf('conocimiento-embarque.pdf', {
  org: 'Naviera Ficticia Transpacifico, S.A.',
  code: 'AGV-014/C-02/001',
  title: 'Conocimiento de embarque NFT-MZO-26-0198',
  date: '14/03/2026',
  pages: [
    [
      { table: [['Campo', 'Dato'], ['Cargador', 'Exportadora Ficticia del Altiplano'], ['Consignatario', 'Distribuidora Ficticia Mar del Norte'], ['Buque / viaje', 'MV Ficticio Andes / 026E'], ['Puerto de carga', 'Manzanillo (MX)'], ['Puerto de descarga', 'Valencia (ES)'], ['Contenedor', 'FICU 482913-7 · 40 RF'], ['Precinto', 'MX-77120'], ['Consigna de temperatura', '+15 C · ventilacion 25 m3/h']] },
      { h: 'Descripcion de la mercancia' },
      { p: '360 cajas (20 palets) que dicen contener hijuelos vivos de Agave tequilana var. azul. Peso bruto declarado: 9.540 kg. Flete pagado en origen.' },
      { h: 'Clausula' },
      { p: 'Recibido a bordo en aparente buen orden y condicion, salvo indicacion en contrario. Shipped on board 14/03/2026.' },
      { sign: 'Capitan / agente del transportista (firma simulada)' },
    ],
    [
      { h: 'Anotaciones de transbordo' },
      { p: 'Transbordo en Algeciras el 02/04/2026. El registrador de temperatura del contenedor reporta una interrupcion de suministro electrico de 9 h 40 min durante la maniobra de transbordo (ver documento AGV-014/C-02/003).' },
      { h: 'Entrega' },
      { p: 'Descarga en Valencia el 06/04/2026. Retirada por el consignatario el 07/04/2026 a las 10:15 h. Sin reservas escritas en el momento de la entrega.' },
      { sign: 'Terminal de contenedores de Valencia (firma simulada)' },
    ],
  ],
});

await makePdf('dictamen-laboratorio.pdf', {
  org: 'Laboratorio Ficticio de Sanidad Vegetal',
  code: 'AGV-014/C-06/001',
  title: 'Dictamen fitopatologico LFSV-2026-0417',
  date: '22/04/2026',
  pages: [
    [
      { h: 'Objeto' },
      { p: 'Determinar la presencia de plagas o enfermedades en las muestras de hijuelos de agave recibidas bajo cadena de custodia (precintos M-01 a M-12), procedentes del contenedor FICU 482913-7.' },
      { h: 'Metodologia' },
      { p: 'Inspeccion visual con lupa estereoscopica, diseccion de 120 hijuelos, siembra en medios PDA y King B, e identificacion morfologica de insectos adultos y larvas.' },
      { table: [['Muestra', 'Hijuelos', 'Galerias', 'Larvas', 'Pudricion']], },
      { table: [['M-01 a M-04', '40', '2', '0', 'leve'], ['M-05 a M-08', '40', '9', '3', 'moderada'], ['M-09 a M-12', '40', '1', '0', 'ausente']] },
    ],
    [
      { h: 'Resultados' },
      { p: 'Se identifican larvas compatibles con Scyphophorus acupunctatus en 3 de los 120 hijuelos analizados (2,5 %), concentradas en las muestras del bloque M-05 a M-08, correspondientes a las cajas de la zona proxima a la puerta del contenedor.' },
      { p: 'La pudricion observada es de tipo blando, con aislamiento de Pectobacterium spp., compatible con exposicion prolongada a temperaturas superiores a 25 C y humedad elevada.' },
      { h: 'Conclusiones' },
      { p: '1) La presencia de larvas indica una infestacion previa al embarque. 2) La pudricion es compatible con una ruptura de la cadena de temperatura durante el transporte. 3) Ambos factores no son excluyentes.' },
    ],
    [
      { h: 'Limitaciones' },
      { p: 'El muestreo representa el 0,67 % del lote. No se analizaron cajas de la zona central del contenedor. Los resultados no permiten estimar con precision la proporcion afectada del lote completo.' },
      { sign: 'Dra. responsable del laboratorio (firma simulada)' },
      { sign: 'Tecnico analista (firma simulada)' },
    ],
  ],
});

// Imágenes: láminas fotográficas ficticias en SVG
function plate({ file, title, code, scene }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1130" viewBox="0 0 1600 1130">
  <defs>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.18 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfd3cf"/><stop offset="1" stop-color="#8d928c"/></linearGradient>
    <radialGradient id="vig" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/></radialGradient>
  </defs>
  <rect width="1600" height="1130" fill="#f3eee3"/>
  <g transform="translate(70 90)">
    <rect width="1460" height="880" fill="url(#sky)"/>
    ${scene}
    <rect width="1460" height="880" fill="url(#vig)"/>
    <rect width="1460" height="880" filter="url(#grain)" opacity="0.9"/>
    <rect x="1250" y="800" width="190" height="56" fill="#111" opacity="0.6"/>
    <text x="1345" y="837" fill="#f5c04a" font-family="Courier, monospace" font-size="26" text-anchor="middle">${code.slice(-7)}</text>
  </g>
  <rect x="0" y="0" width="1600" height="40" fill="#8e3b3b"/>
  <text x="800" y="27" fill="#fff" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="20" letter-spacing="6" text-anchor="middle">MATERIAL FICTICIO — SIMULACIÓN ACADÉMICA</text>
  <text x="70" y="1020" fill="#1a2132" font-family="Georgia, serif" font-size="34" font-weight="600">${title}</text>
  <text x="70" y="1062" fill="#4a5368" font-family="Courier, monospace" font-size="22">${code} · Lámina fotográfica · Reproducción ilustrativa</text>
  <g transform="translate(800 560) rotate(-28)" opacity="0.18" font-family="Helvetica, Arial, sans-serif" font-weight="700" text-anchor="middle" fill="#8e3b3b">
    <text font-size="110">MATERIAL FICTICIO</text><text y="90" font-size="62" letter-spacing="8">SIMULACIÓN ACADÉMICA</text>
  </g>
</svg>`;
  writeFileSync(OUT + file, svg);
  console.log('SVG', file);
}

const agave = (x, y, s, rot = 0, rotten = false) => {
  let leaves = '';
  for (let i = -5; i <= 5; i++) {
    const len = (200 - Math.abs(i) * 14) * s;
    const col = rotten && i % 3 === 0 ? '#6b5a3a' : i % 2 ? '#5f7f78' : '#6f9088';
    leaves += `<path transform="rotate(${i * 15 + rot})" d="M -${14 * s} 0 Q -${12 * s} -${len * 0.6} 0 -${len} Q ${12 * s} -${len * 0.6} ${14 * s} 0 Z" fill="${col}" stroke="#3d544f" stroke-width="2"/>`;
  }
  return `<g transform="translate(${x} ${y})">${leaves}<ellipse rx="${46 * s}" ry="${20 * s}" fill="#7c6a4a"/>${rotten ? `<ellipse cx="${10 * s}" rx="${22 * s}" ry="${10 * s}" fill="#3b2a18"/>` : ''}</g>`;
};

plate({
  file: 'inspeccion-contenedor-1.svg',
  title: 'Apertura del contenedor FICU 482913-7 en destino',
  code: 'AGV-014/C-03/002-A',
  scene: `<rect x="160" y="120" width="1140" height="700" fill="#2d3a4a"/><rect x="200" y="160" width="1060" height="640" fill="#1b232d"/>
  ${Array.from({ length: 6 }, (_, r) => Array.from({ length: 8 }, (_, c) => `<rect x="${230 + c * 128}" y="${190 + r * 100}" width="118" height="88" fill="${(r + c) % 5 === 0 ? '#8a6f44' : '#a98b5a'}" stroke="#5a4528" stroke-width="3"/><circle cx="${260 + c * 128}" cy="${222 + r * 100}" r="7" fill="#3a2c18"/><circle cx="${318 + c * 128}" cy="${222 + r * 100}" r="7" fill="#3a2c18"/>`).join('')).join('')}
  <rect x="150" y="110" width="30" height="720" fill="#596b7d"/><rect x="1280" y="110" width="30" height="720" fill="#596b7d"/>
  <rect x="560" y="700" width="340" height="90" fill="#e9e2cf"/><text x="730" y="755" font-family="Helvetica" font-size="30" text-anchor="middle" fill="#8e3b3b">TESTIGO MÉTRICO 1 m</text>`,
});
plate({
  file: 'inspeccion-contenedor-2.svg',
  title: 'Detalle de cajas con humedad en la zona de puerta',
  code: 'AGV-014/C-03/002-B',
  scene: `<rect x="0" y="560" width="1460" height="320" fill="#6e6a60"/>
  ${[0, 1, 2].map((i) => `<rect x="${180 + i * 380}" y="${250 + (i % 2) * 30}" width="330" height="320" fill="#a98b5a" stroke="#5a4528" stroke-width="4"/><path d="M ${200 + i * 380} ${470 + (i % 2) * 30} q 80 -40 160 10 t 150 -5 v 110 h -310 z" fill="#5e4a2c" opacity="0.75"/>`).join('')}
  ${agave(360, 300, 0.7, 0, true)}${agave(740, 330, 0.75, 8, false)}${agave(1120, 300, 0.7, -6, true)}`,
});
plate({
  file: 'muestras-material-vegetal.svg',
  title: 'Muestras M-05 a M-08: hijuelos con galerías y pudrición basal',
  code: 'AGV-014/C-04/002',
  scene: `<rect x="0" y="0" width="1460" height="880" fill="#d9d4c6"/>
  ${[0, 1, 2, 3].map((i) => agave(230 + i * 330, 520, 0.95, (i - 1.5) * 6, i === 1 || i === 2)).join('')}
  ${[0, 1, 2, 3].map((i) => `<rect x="${170 + i * 330}" y="700" width="120" height="44" fill="#fff" stroke="#1a2132" stroke-width="2"/><text x="${230 + i * 330}" y="731" font-family="Courier" font-size="26" text-anchor="middle">M-0${5 + i}</text>`).join('')}
  <line x1="80" y1="820" x2="380" y2="820" stroke="#1a2132" stroke-width="6"/><text x="230" y="808" font-family="Helvetica" font-size="22" text-anchor="middle">10 cm</text>`,
});
