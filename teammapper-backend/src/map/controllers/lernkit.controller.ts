import {
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Logger,
  NotFoundException,
  Param,
  Query,
  UnauthorizedException,
} from '@nestjs/common'
import { timingSafeEqual } from 'crypto'
import { MapsService } from '../services/maps.service'
import { YjsDocManagerService } from '../services/yjs-doc-manager.service'
import { YjsGateway } from './yjs-gateway.service'
import { isBlockedLink } from '../../lernkit/blocklist'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * lernkit-Erweiterungen:
 * - GET  /api/lernkit/link-pruefung?url=…  -> { gesperrt } (Sperrliste, für die
 *   Rückmeldung beim Einfügen eines Links; der Server entfernt gesperrte Links
 *   zusätzlich beim Speichern)
 * - DELETE /api/lernkit/betreiber/maps/:id  -> löscht eine gemeldete Map.
 *   Nur mit Header X-Lernkit-Betreiber-Token = Umgebungsvariable
 *   LERNKIT_BETREIBER_TOKEN (mind. 24 Zeichen); ohne Variable ist der Endpunkt aus.
 */
@Controller('api/lernkit')
export default class LernkitController {
  private readonly logger = new Logger('LernkitController')

  constructor(
    private mapsService: MapsService,
    private yjsDocManager: YjsDocManagerService,
    private yjsGateway: YjsGateway
  ) {}

  @Get('link-pruefung')
  linkPruefung(@Query('url') url?: string): { gesperrt: boolean } {
    return { gesperrt: isBlockedLink(String(url || '').slice(0, 2048)) }
  }

  @Delete('betreiber/maps/:id')
  @HttpCode(200)
  async betreiberLoeschen(
    @Param('id') mapId: string,
    @Headers('x-lernkit-betreiber-token') token?: string
  ): Promise<{ geloescht: true }> {
    const erwartet = process.env.LERNKIT_BETREIBER_TOKEN || ''
    if (erwartet.length < 24) throw new NotFoundException()
    const a = Buffer.from(String(token || ''))
    const b = Buffer.from(erwartet)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      // Bremse gegen Durchprobieren
      await new Promise((r) => setTimeout(r, 1500))
      throw new UnauthorizedException()
    }
    if (!UUID_REGEX.test(mapId)) throw new NotFoundException()
    const mmpMap = await this.mapsService.findMap(mapId)
    if (!mmpMap) throw new NotFoundException()
    this.yjsGateway.closeConnectionsForMap(mapId)
    // DB-Zeile vor dem Y.Doc löschen (wie MapsController.delete)
    await this.mapsService.deleteMap(mapId)
    this.yjsDocManager.destroyDoc(mapId)
    this.logger.log(`Map ${mapId} durch Betreiber gelöscht`)
    return { geloescht: true }
  }
}
