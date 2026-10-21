import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class UtilsService {
  private translateService = inject(TranslateService);

  /**
   * Gets the nested property of object
   */
  public static get = (
    obj: Record<string, unknown> | object,
    path: string[]
  ): unknown =>
    path.reduce(
      (nestedObj: unknown, currentPath: string) =>
        nestedObj != null &&
        typeof nestedObj === 'object' &&
        currentPath in nestedObj
          ? (nestedObj as Record<string, unknown>)[currentPath]
          : null,
      obj
    );

  /**
   * Return the word with the first letter capitalized.
   */
  public static capitalizeWord(word: string): string {
    if (word === undefined || word === '') return '';
    return word.charAt(0).toUpperCase() + word.toLowerCase().slice(1);
  }

  /**
   * Return an observable for drop events for images.
   */
  public static observableDroppedImages(): Observable<string> {
    return new Observable(subscriber => {
      window.document.ondragover = (event: DragEvent) => {
        event.preventDefault();
      };

      window.document.body.ondrop = (event: DragEvent) => {
        event.preventDefault();

        if (event.dataTransfer.files[0]) {
          const fileReader = new FileReader();

          fileReader.onload = () => {
            subscriber.next(fileReader.result.toString());
          };

          fileReader.onerror = subscriber.error;

          fileReader.readAsDataURL(event.dataTransfer.files[0]);
        } else {
          subscriber.next(
            event.dataTransfer
              .getData('text/html')
              .match(/src\s*=\s*"(.+?)"/)[1]
          );
        }
      };
    });
  }

  /**
   * Download a file with a fake link click.
   * lernkit: über eine Blob-URL statt eines (großen) data:-Links — Safari auf
   * iPhone/iPad lädt große data:-Links nicht herunter bzw. öffnet sie nur als Seite.
   */
  public static downloadFile(name: string, content: string | Blob) {
    const blob =
      typeof content === 'string'
        ? UtilsService.dataUriToBlob(content)
        : content;
    const url = URL.createObjectURL(blob);
    const fakeLink = document.createElement('a');

    fakeLink.href = url;
    fakeLink.download = name;
    fakeLink.rel = 'noopener';

    document.body.appendChild(fakeLink);

    fakeLink.click();

    document.body.removeChild(fakeLink);
    // iOS braucht die URL noch eine Weile nach dem Klick
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  /**
   * lernkit: data:-URI (base64 oder URL-kodiert) in einen Blob umwandeln.
   */
  public static dataUriToBlob(uri: string): Blob {
    const komma = uri.indexOf(',');
    const kopf = uri.slice(5, komma);
    const daten = uri.slice(komma + 1);
    const typ = kopf.split(';')[0] || 'application/octet-stream';
    if (kopf.includes(';base64')) {
      const binaer = atob(daten);
      const bytes = new Uint8Array(binaer.length);
      for (let i = 0; i < binaer.length; i++) bytes[i] = binaer.charCodeAt(i);
      return new Blob([bytes], { type: typ });
    }
    return new Blob([decodeURIComponent(daten)], { type: typ });
  }

  /**
   * Return the HTML image element from an image URI.
   */
  public static imageFromUri(uri: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        resolve(image);
      };
      image.onerror = reject;
      image.src = uri;
    });
  }

  /**
   * Return true if the string is a JSON Object.
   */
  public static isJSONString(JSONString: string) {
    try {
      JSON.parse(JSONString);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return false;
    }
    return true;
  }

  /**
   * Return true if the two objects have the same structure (same keys).
   */
  public static isSameJSONStructure(json1: object, json2: object): boolean {
    function checkObjectStructure(object1: object, object2: object): boolean {
      for (const key of Object.keys(object1)) {
        if (
          !Object.prototype.hasOwnProperty.call(object1, key) ||
          !Object.prototype.hasOwnProperty.call(object2, key)
        ) {
          return false;
        }

        if (typeof object1[key] === 'object') {
          if (!checkObjectStructure(object1[key], object2[key])) {
            return false;
          }
        }
      }

      return true;
    }

    return (
      checkObjectStructure(json1, json2) && checkObjectStructure(json2, json1)
    );
  }

  /**
   * Return a translated string with given message and values.
   */
  public translate(
    message: string,
    values?: Record<string, unknown>
  ): Promise<string> {
    return firstValueFrom(this.translateService.get(message, values));
  }

  /**
   * Show a dialog window to confirm a choice.
   */
  public async confirmDialog(message: string): Promise<boolean> {
    message = await this.translate(message);

    return confirm(message);
  }

  /**
   * Converts a blob to a data url
   */
  public blobToBase64(blob: Blob): Promise<string | ArrayBuffer> {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    return new Promise(resolve => {
      reader.onloadend = () => {
        resolve(reader.result);
      };
    });
  }
}
