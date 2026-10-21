// lernkit: Erzeugt die Link-Sperrliste für maps aus den UT1-Listen der
// Université Toulouse Capitole (CC BY-SA 4.0, https://dsi.ut-capitole.fr/blacklists/,
// Spiegel github.com/olbat/ut1-blacklists).
//
// Gespeichert werden nur 64-Bit-Fingerabdrücke (erste 8 Byte von SHA-256) der
// Domains, sortiert als little-endian uint64 (~8 Byte je Domain). So passen
// rund 5 Mio. Domains in ~40 MB, ohne nennenswerte Fehlsperren (Kollisionen
// praktisch ausgeschlossen).
//
// Aufruf: node build-blocklist.mjs <Zielordner>
// Läuft beim Docker-Build; bricht bei Download-Fehlern ab, damit nie
// unbemerkt ein Image ohne Sperrliste entsteht.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ZIEL = process.argv[2];
if (!ZIEL) {
  console.error('Aufruf: node build-blocklist.mjs <Zielordner>');
  process.exit(1);
}
const QUELLE = 'https://raw.githubusercontent.com/olbat/ut1-blacklists/master/blacklists';
// adult ist in mehrere Teildateien aufgeteilt (domains.0, domains.1, ...)
const KATEGORIEN = {
  adult: ['domains.0', 'domains.1', 'domains.2'],
  agressif: ['domains'],
  dangerous_material: ['domains'],
  drogue: ['domains'],
  gambling: ['domains'],
  malware: ['domains'],
  phishing: ['domains'],
};

const fingerabdruck = (domain) =>
  createHash('sha256').update(domain).digest().readBigUInt64LE(0);

async function lade(url) {
  for (let versuch = 1; versuch <= 3; versuch++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.text();
    } catch (e) {
      if (versuch === 3) throw new Error(`Download fehlgeschlagen: ${url} (${e.message})`);
      await new Promise((r) => setTimeout(r, 2000 * versuch));
    }
  }
}

const werte = [];
const zaehler = {};
for (const [kat, dateien] of Object.entries(KATEGORIEN)) {
  zaehler[kat] = 0;
  for (const datei of dateien) {
    const text = await lade(`${QUELLE}/${kat}/${datei}`);
    if (text === null) continue; // Teildatei existiert (noch) nicht
    for (const zeile of text.split('\n')) {
      const d = zeile.trim().toLowerCase().replace(/^\*\./, '').replace(/\.$/, '');
      if (!d || d.startsWith('#') || !d.includes('.')) continue;
      werte.push(fingerabdruck(d));
      zaehler[kat]++;
    }
  }
  if (zaehler[kat] === 0) throw new Error(`Kategorie ${kat} ist leer`);
}
if (zaehler.adult < 1_000_000) throw new Error('adult-Liste unvollständig');

const arr = BigUint64Array.from(werte).sort();
let n = 0;
for (let i = 0; i < arr.length; i++) if (i === 0 || arr[i] !== arr[n - 1]) arr[n++] = arr[i];
const eindeutig = arr.subarray(0, n);

mkdirSync(ZIEL, { recursive: true });
writeFileSync(join(ZIEL, 'blocklist.bin'), Buffer.from(eindeutig.buffer, eindeutig.byteOffset, eindeutig.byteLength));
writeFileSync(join(ZIEL, 'blocklist.json'), JSON.stringify({
  quelle: 'UT1-Blacklists, Université Toulouse Capitole (CC BY-SA 4.0)',
  erstellt: new Date().toISOString(),
  kategorien: zaehler,
  eintraege: n,
}, null, 2));
console.log(`Sperrliste: ${n} Domains`, zaehler);
