import { createHash } from 'crypto'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { Logger } from '@nestjs/common'

/**
 * lernkit: Link-Sperrliste (UT1-Blacklists der Université Toulouse Capitole,
 * CC BY-SA 4.0). Die Datei enthält sortierte 64-Bit-Fingerabdrücke (erste
 * 8 Byte von SHA-256) gesperrter Domains; erzeugt beim Docker-Build von
 * lernkit/blocklist/build-blocklist.mjs. Fehlt die Datei (z. B. lokale
 * Entwicklung), ist die Sperrliste aus und nichts wird gesperrt.
 */
const logger = new Logger('LernkitBlocklist')

const DEFAULT_DIR = join(__dirname, '..', '..', 'lernkit-blocklist')

let fingerprints: BigUint64Array | null = null
let loaded = false

const fingerprint = (domain: string): bigint =>
  createHash('sha256').update(domain).digest().readBigUInt64LE(0)

export const loadBlocklist = (
  dir: string = process.env.LERNKIT_BLOCKLIST_DIR || DEFAULT_DIR
): number => {
  loaded = true
  const file = join(dir, 'blocklist.bin')
  if (!existsSync(file)) {
    fingerprints = null
    logger.warn(`Keine Sperrliste gefunden (${file}) - Link-Sperre ist aus`)
    return 0
  }
  const buf = readFileSync(file)
  // Kopie in einen ausgerichteten Puffer, da BigUint64Array 8-Byte-Alignment braucht
  const copy = new ArrayBuffer(buf.byteLength - (buf.byteLength % 8))
  new Uint8Array(copy).set(buf.subarray(0, copy.byteLength))
  fingerprints = new BigUint64Array(copy)
  logger.log(`Sperrliste geladen: ${fingerprints.length} Domains`)
  return fingerprints.length
}

const contains = (value: bigint): boolean => {
  const list = fingerprints
  if (!list) return false
  let lo = 0
  let hi = list.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1
    const v = list[mid]
    if (v === value) return true
    if (v < value) lo = mid + 1
    else hi = mid - 1
  }
  return false
}

/** True, wenn der Host oder eine übergeordnete Domain gesperrt ist. */
export const isBlockedHost = (host: string): boolean => {
  if (!loaded) loadBlocklist()
  if (!fingerprints) return false
  const labels = host.toLowerCase().replace(/\.$/, '').split('.')
  // a.b.example.com -> a.b.example.com, b.example.com, example.com
  for (let i = 0; i < labels.length - 1; i++) {
    if (contains(fingerprint(labels.slice(i).join('.')))) return true
  }
  return false
}

/** True für http(s)-Links auf eine gesperrte Domain. */
export const isBlockedLink = (href: string | null | undefined): boolean => {
  if (!href) return false
  try {
    return isBlockedHost(new URL(href).hostname)
  } catch {
    return false
  }
}

/** Nur für Tests: Sperrliste direkt setzen. */
export const setBlocklistForTests = (domains: string[] | null): void => {
  loaded = true
  fingerprints = domains
    ? BigUint64Array.from(domains.map(fingerprint)).sort()
    : null
}
