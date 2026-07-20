import { Component, inject, signal, OnInit } from '@angular/core';
import {
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatButton } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslatePipe } from '@ngx-translate/core';
import { MmpService } from 'src/app/core/services/mmp/mmp.service';
import { UtilsService } from 'src/app/core/services/utils/utils.service';

interface IconEntry {
  file: string;
  label: string;
}
interface IconManifest {
  allgemein: IconEntry[];
  zsl: IconEntry[];
}

@Component({
  selector: 'teammapper-dialog-lernkit-icons',
  templateUrl: 'dialog-lernkit-icons.component.html',
  styleUrls: ['./dialog-lernkit-icons.component.scss'],
  imports: [
    MatDialogTitle,
    CdkScrollable,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    MatDialogClose,
    MatTabsModule,
    TranslatePipe,
  ],
})
export class DialogLernkitIconsComponent implements OnInit {
  private mmpService = inject(MmpService);
  private utilsService = inject(UtilsService);
  private dialogRef =
    inject<MatDialogRef<DialogLernkitIconsComponent>>(MatDialogRef);

  private readonly base = '/assets/lernkit-icons/';

  public allgemein = signal<IconEntry[]>([]);
  public zsl = signal<IconEntry[]>([]);

  async ngOnInit() {
    try {
      const res = await fetch(this.base + 'manifest.json');
      const man = (await res.json()) as IconManifest;
      this.allgemein.set(man.allgemein || []);
      this.zsl.set(man.zsl || []);
    } catch (_e) {
      // Manifest nicht ladbar – Dialog bleibt leer
    }
  }

  iconUrl(level: string, file: string): string {
    return this.base + level + '/' + file;
  }

  // Icon als Bild (Base64-Data-URI) an den ausgewählten Knoten hängen –
  // gleicher Weg wie beim Piktogramm-/Bild-Import (wandert beim Export/Kollab mit).
  async pick(level: string, file: string) {
    try {
      const res = await fetch(this.iconUrl(level, file));
      const blob = await res.blob();
      const dataUri = await this.utilsService.blobToBase64(blob);
      this.mmpService.addNodeImage(dataUri);
      this.dialogRef.close();
    } catch (_e) {
      // Fehler beim Laden – nichts einfügen
    }
  }
}
