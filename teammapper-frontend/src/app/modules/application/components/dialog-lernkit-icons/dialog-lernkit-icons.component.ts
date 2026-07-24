import { Component, inject, signal, computed, OnInit } from '@angular/core';
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
  kategorie: string;
  keywords?: string[];
}
interface IconManifest {
  symbole: IconEntry[];
  motive: IconEntry[];
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

  public symbole = signal<IconEntry[]>([]);
  public motive = signal<IconEntry[]>([]);

  public suche = signal('');
  public katSymbole = signal('Alle');
  public katMotive = signal('Alle');

  // ZSL-Motive: passwortgeschützt. Bis zur Freischaltung werden sie NICHT
  // angezeigt und NICHT durchsucht (gefiltertMotive liefert dann []).
  private readonly motivePasswort = 'ZSL2026';
  public motiveUnlocked = signal(false);
  public motivePwWrong = signal(false);

  public kategorienSymbole = computed(() => this.kategorien(this.symbole()));
  public kategorienMotive = computed(() => this.kategorien(this.motive()));
  public gefiltertSymbole = computed(() =>
    this.filter(this.symbole(), this.katSymbole())
  );
  public gefiltertMotive = computed(() =>
    this.motiveUnlocked() ? this.filter(this.motive(), this.katMotive()) : []
  );

  unlockMotive(pw: string) {
    if ((pw || '').trim() === this.motivePasswort) {
      this.motiveUnlocked.set(true);
      this.motivePwWrong.set(false);
    } else {
      this.motivePwWrong.set(true);
    }
  }

  async ngOnInit() {
    try {
      const res = await fetch(this.base + 'manifest.json');
      const man = (await res.json()) as IconManifest;
      this.symbole.set(man.symbole || []);
      this.motive.set(man.motive || []);
    } catch (_e) {
      // Manifest nicht ladbar – Dialog bleibt leer
    }
  }

  private kategorien(list: IconEntry[]): string[] {
    const set = Array.from(new Set(list.map(i => i.kategorie))).sort((a, b) =>
      a.localeCompare(b, 'de')
    );
    return ['Alle', ...set];
  }

  private filter(list: IconEntry[], kat: string): IconEntry[] {
    const q = this.suche().trim().toLowerCase();
    return list.filter(i => {
      const katOk = kat === 'Alle' || i.kategorie === kat;
      if (!katOk) return false;
      if (!q) return true;
      return (
        i.label.toLowerCase().includes(q) ||
        i.kategorie.toLowerCase().includes(q) ||
        (i.keywords || []).some(k => k.toLowerCase().includes(q))
      );
    });
  }

  onSearch(event: Event) {
    this.suche.set((event.target as HTMLInputElement).value || '');
  }

  iconUrl(group: string, file: string): string {
    return this.base + group + '/' + file;
  }

  // Icon als Bild (Base64-Data-URI) an den ausgewählten Knoten hängen.
  async pick(group: string, file: string) {
    try {
      const res = await fetch(this.iconUrl(group, file));
      const blob = await res.blob();
      const dataUri = await this.utilsService.blobToBase64(blob);
      this.mmpService.addNodeImage(dataUri);
      this.dialogRef.close();
    } catch (_e) {
      // Fehler beim Laden – nichts einfügen
    }
  }
}
