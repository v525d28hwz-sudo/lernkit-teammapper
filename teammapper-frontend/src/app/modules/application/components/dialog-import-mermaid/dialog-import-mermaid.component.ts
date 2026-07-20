import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import { ImportService } from 'src/app/core/services/import/import.service';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'teammapper-dialog-import-mermaid',
  templateUrl: 'dialog-import-mermaid.component.html',
  styleUrls: ['./dialog-import-mermaid.component.scss'],
  imports: [
    MatDialogTitle,
    CdkScrollable,
    MatDialogContent,
    MatFormField,
    MatInput,
    CdkTextareaAutosize,
    FormsModule,
    MatDialogActions,
    MatButton,
    MatDialogClose,
    TranslatePipe,
  ],
})
export class DialogImportMermaidComponent {
  private importService = inject(ImportService);

  private dialogRef =
    inject<MatDialogRef<DialogImportMermaidComponent>>(MatDialogRef);
  private router = inject(Router);

  public mermaidInput = '';
  public fileName = '';

  // .mmd-/Textdatei einlesen und in das Textfeld übernehmen (gleicher Import-Pfad).
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.fileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      this.mermaidInput = String(reader.result || '');
    };
    reader.readAsText(file);
  }

  async import() {
    const success = await this.importService.importFromMermaid(
      this.mermaidInput
    );
    if (success) {
      this.dialogRef.close();
    }
  }
}
