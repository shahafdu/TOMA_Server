import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'coma-collapsible-well',
  template: `
  <details (click)='toggleContent()'>
    <summary>
      <h4 class='well-title'>{{title}}</h4>      
    </summary>
    <div class='content'>
      <ng-content></ng-content>
    </div>
  </details>
  `,
})
export class CollapsibleWellComponent implements OnInit {
  @Input() title: string = '';
  @Input() visible: boolean = false;
  @Output() isCollapsed: EventEmitter<boolean> = new EventEmitter<boolean>();

  constructor() { }

  ngOnInit() {
  }

  toggleContent() {
    this.visible = !this.visible;
    this.isCollapsed.emit(this.visible);
  }
}
