import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'coma-confirmation-dialog',
  template: `
  <div class="modal-header">
    <button type="button" class="close" aria-label="Close" (click)="dismiss()">
      <span aria-hidden="true">&times;</span>
    </button>
    <h4 class="modal-title">{{ title }}</h4>
  </div>
  <div class="modal-body">
    {{ message }}
  </div>
  <div *ngIf="alertText !=''" class="modal-body" style ="color: red;">
  {{alertText}}
  </div>
  <div class="modal-footer">
    <button type="button" class="btn btn-danger" (click)="decline()">{{ btnCancelText }}</button>
    <button type="button" class="btn btn-success" (click)="accept()">{{ btnOkText }}</button>
  </div>
  `
})
export class ConfirmationDialogComponent implements OnInit {
  @Input() title: string = '';
  @Input() message: string = '';
  @Input() btnOkText: string = '';
  @Input() btnCancelText: string = '';
  @Input() alertText: string = '';

  constructor(private activeModal: NgbActiveModal) {}

  ngOnInit() {}

  public decline() {
    this.activeModal.close(false);
  }

  public accept() {
    this.activeModal.close(true);
  }

  public dismiss() {
    this.activeModal.dismiss();
  }
}
