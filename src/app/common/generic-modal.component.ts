import { Component, Input } from '@angular/core';

@Component({
  selector: 'coma-generic-modal',
  template: `
  <div id="{{elementId}}" #modalcontainer class="modal fade" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
          <h4 class="modal-title">{{title}}</h4>
        </div>
        <ng-template #content><ng-content></ng-content></ng-template>
        <div *ngIf="closeOnBodyClickBool" class="modal-body" data-dismiss="modal">
          <ng-container *ngTemplateOutlet="content"></ng-container>
        </div>
        <div *ngIf="!closeOnBodyClickBool" class="modal-body">
          <ng-container *ngTemplateOutlet="content"></ng-container>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .modal-body { height: 250px; overflow-y: scroll; }
  `]
})
export class GenericModalComponent {
  @Input() title: string = '';
  @Input() elementId: string = '';
  @Input() closeOnBodyClick: string = 'false';
  get closeOnBodyClickBool() {
    return this.closeOnBodyClick === 'true';
  }

  constructor() { }
}
