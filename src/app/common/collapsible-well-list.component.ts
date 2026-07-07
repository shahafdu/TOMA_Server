import { Component, OnInit, Input, Output, EventEmitter, TemplateRef, ContentChild } from '@angular/core';

@Component({
  selector: 'coma-collapsible-well-list',
  template: `
  <div class='well'>
    <div class='row'>
      <div class="col-md-{{12/numOfCols}}" *ngFor='let item of itemList'>
        <button mat-raised-button disableRipple class='name-thumbnail' [draggable]='isDraggable' (dragstart)='drag($event,item)'
                    (dragover)='allowDrop($event,item)' (drop)='dropped($event,item)' [ngStyle]='item ? item.style : {}'>
          <coma-collapsible-well [title]='item[titleField]' (isCollapsed)='visStateChanged($event, item)' [visible]='item === visibleItem'>
            <template [ngTemplateOutletContext]='{item: item}' [ngTemplateOutlet]="templateVariable"></template>
          </coma-collapsible-well>
        </button>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .name-thumbnail {
      margin: 5px;
      width: 100%;
      text-align: left;
      white-space:normal;
    }
  `]
})
export class CollapsibleWellListComponent implements OnInit {
  @Input() numOfCols: number = 1;
  @Input() itemList: any[] = [];
  @Input() titleField: string = '';
  @Input() isDraggable: boolean = false;
  @Input() isDroppable: boolean = false;
  @Input() borderProp: string = '';
  @Output() dragStartItem: EventEmitter<{event: DragEvent, item: any}> = new EventEmitter<{event: DragEvent, item: any}>();
  @Output() dropItem: EventEmitter<{event: DragEvent, item: any}> = new EventEmitter<{event: DragEvent, item: any}>();
  @Output() opened: EventEmitter<any> = new EventEmitter<any>();
  @ContentChild(TemplateRef) templateVariable: TemplateRef<any> | undefined;
  visibleItem = null;

  constructor() {}

  ngOnInit() {}

  drag(event: DragEvent, item: any) {
    if (this.isDraggable) {
      this.dragStartItem.emit({event, item});
    }
  }

  allowDrop(ev: DragEvent) {
    // if (this.isDroppable && item === this.visibleItem) {
      ev.preventDefault();
    // }
  }

  dropped(event: DragEvent, item: any) {
    // if (this.isDroppable && item === this.visibleItem) {
      this.dropItem.emit({event, item});
    // }
  }

  visStateChanged(event: boolean, item: any) {
    if (event === true) {
      this.opened.emit(item);
      this.visibleItem = item;
    } else {
      this.opened.emit('');
      this.visibleItem = null;
    }
  }
}
