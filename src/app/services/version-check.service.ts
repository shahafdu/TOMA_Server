import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { first } from 'rxjs/operators';
import { ConfirmationDialogService } from './confirmation-dialog.service';

@Injectable()
export class VersionCheckService {
  // this will be replaced by actual hash post-build.js
  private currentHash = '{{POST_BUILD_ENTERS_HASH_HERE}}';

  constructor(private http: HttpClient, private confirmServ: ConfirmationDialogService) { }

  public initVersionCheck(url: string, frequency: number = 1000 * 60 * 60) {
    setInterval(() => {
      this.checkVersion(url);
    }, frequency);
  }

  private checkVersion(url: string) {
    // timestamp these requests to invalidate caches
    this.http.get(url + '?t=' + new Date().getTime())
      .pipe(first())
      .subscribe(
        (response: any) => {
          const hash = response.hash;
          const hashChanged = this.hasHashChanged(this.currentHash, hash);

          // If new version, do something
          if (hashChanged) {
            // ENTER YOUR CODE TO DO SOMETHING UPON VERSION CHANGE
            // for an example: location.reload();
            this.onHashChanged();
          }
          // store the new hash so we wouldn't trigger versionChange again
          // only necessary in case you did not force refresh
          this.currentHash = hash;
        },
        (err) => {
          console.error(err, 'Could not get version');
        }
      );
  }

  private hasHashChanged(currentHash: string, newHash: string) {
    if (!currentHash || currentHash === '{{POST_BUILD_ENTERS_HASH_HERE}}') {
      return false;
    }

    return currentHash !== newHash;
  }

  private onHashChanged() {
    this.confirmServ
      .confirm(
        'New version available!',
        'In order for evertyhing to work as it should, you need to refresh the page.\r\n' +
        'You can refresh now, or cancal and refresh after you save.',
        'Refresh Now',
        'Cancel, I will refresh'
      )
      .then(confirmed => {
        if (confirmed) {
          window.location.reload();
        } else {
          this.remindRefresh();
        }
      })
      .catch(() => {
        this.remindRefresh();
      });
  }

  private remindRefresh() {
    setTimeout(() => {
      this.confirmServ
      .confirm(
        'Reminder - Refresh needed!',
        'You promised you will refresh the page :(',
        'Refresh Now',
        'Cancel, I will refresh'
      )
      .then(confirmed => {
        if (confirmed) {
          window.location.reload();
        } else {
          this.remindRefresh();
        }
      })
      .catch(() => {
        this.remindRefresh();
      });
    }, 1000 * 60 * 5);
  }
}
