import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { ConfirmationDialogService } from './services';

export interface ComponentCanDeactivate {
  canDeactivate: () => boolean | Promise<boolean>;
}

@Injectable()
export class PendingChangesGuard implements CanDeactivate<ComponentCanDeactivate> {

  constructor(private confirmServ: ConfirmationDialogService) {}
  canDeactivate(component: ComponentCanDeactivate): boolean | Promise<boolean> {
    // if there are no pending changes, just allow deactivation; else confirm first
    return component.canDeactivate() ?
      true :
      this.confirmServ.confirm('Wait, do you really want to cancel?', 'All the informaiton you\'ve typed will be dismissed' ,
      'Yes, Dismiss', 'Sorry, No')
      .then((confirmed) => confirmed)
      .catch(() => false);  }
}
