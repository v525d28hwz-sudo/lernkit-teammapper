import { isBlockedHost, isBlockedLink, setBlocklistForTests } from './blocklist'
import { sanitizeLinkHref } from '../map/utils/sanitization'

describe('lernkit blocklist', () => {
  beforeEach(() => setBlocklistForTests(['gesperrt.example', 'boese.test']))
  afterAll(() => setBlocklistForTests(null))

  it('blocks a listed domain and its subdomains', () => {
    expect(isBlockedHost('gesperrt.example')).toBe(true)
    expect(isBlockedHost('www.gesperrt.example')).toBe(true)
    expect(isBlockedHost('a.b.GESPERRT.example')).toBe(true)
  })

  it('does not block other or look-alike domains', () => {
    expect(isBlockedHost('lernkit.de')).toBe(false)
    expect(isBlockedHost('nichtgesperrt.example')).toBe(false)
    expect(isBlockedHost('example')).toBe(false)
  })

  it('checks links and tolerates invalid input', () => {
    expect(isBlockedLink('https://www.boese.test/seite?x=1')).toBe(true)
    expect(isBlockedLink('https://lernkit.de/')).toBe(false)
    expect(isBlockedLink('kein link')).toBe(false)
    expect(isBlockedLink(undefined)).toBe(false)
  })

  it('removes blocked links during sanitization', () => {
    expect(sanitizeLinkHref('https://boese.test/')).toBe('')
    expect(sanitizeLinkHref('https://lernkit.de/')).toBe('https://lernkit.de/')
  })

  it('blocks nothing when no list is loaded', () => {
    setBlocklistForTests(null)
    expect(isBlockedLink('https://boese.test/')).toBe(false)
  })
})
