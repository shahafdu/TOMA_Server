import { Component, OnInit } from '@angular/core';
import { data_server } from '../../../src/urls';

@Component({
  selector: 'coma-about',
  template: `
    <div id="box" class="box container">
      <div *ngIf="!gameOn">
        <h2>All Rights Reserved, 2018</h2>
        <div class="data-field">
          <strong>Created By:</strong> Developer Team
        </div>
        <div class="data-field">
          <strong>Server Url:</strong>
          <a [href]="serverAddress" target="_blank"> {{ data_server }}</a>
        </div>
        <div class="data-field">
          <strong>Client Source Code:</strong>
          <a href="http://localhost:8080/cm_client" target="_blank">
            http://localhost:8080/cm_client</a
          >
        </div>
        <div class="data-field">
          <strong>Server Source Code:</strong>
          <a href="http://localhost:8080/cm_server" target="_blank">
            http://localhost:8080/cm_server</a
          >
        </div>
      </div>
      <div *ngIf="gameOn">
        <div class="data-field">
          <strong>Score: </strong> {{ score }}
        </div>
        <div class="data-field">
          <strong>Time: </strong> {{ time }}
        </div>
        <button (click)="restart()" *ngIf="!this.time">Start Again</button>
      </div>
      <img
        id="logo"
        class="logo"
        [src]="imageSrc"
        [style.left]="logoPositionLeft + 'px'"
        [style.top]="logoPositionTop + 'px'"
        [style.width]="logoWidth + 'px'"
        (click)="play()"
      />
    </div>
  `,
  styles: [
    '.box {width:100%; height:calc(100vh - 160px); border:solid}',
    '.logo {position:absolute; cursor:pointer; border-radius:50%;}',
    '.data-field {margin: 5px; font-size: 25px;}',
    '.game {position:absolute; left: 0px; top: 50%}'
  ]
})
export class AboutComponent implements OnInit {
  private minTop: number = 0;
  private maxTop: number = 0;
  private minLeft: number = 0;
  private maxLeft: number = 0;
  public data_server: string = '';
  private stepTop: number = 0;
  private stepLeft: number = 0;
  public gameOn: boolean = false;
  public logoPositionTop: number = 0;
  public logoPositionLeft: number = 0;
  public logosToRemove: any[] = [];
  public imageSrc: string = 'coma/assets/app_icon.jpg';
  public imageBorder = 'none';
  public logoWidth = 64;
  public score: number = 0;
  public time = 60;
  private gameLoop: any;
  private stepLoop: any;
  private stepSize: number = 0;

  constructor() {}

  ngOnInit() {
    this.gameOn = false;
    const box = document.getElementById('box');
    if (box) {
      const boxProp = box.getBoundingClientRect();
      this.minTop = boxProp.top;
      this.minLeft = boxProp.left;
      this.maxTop = boxProp.height + boxProp.top;
      this.maxLeft = boxProp.width + boxProp.left;
      this.createLogo();
    }
    this.data_server = data_server;
  }

  createLogo() {
    this.logoPositionTop =
      Math.random() * (this.maxTop - this.minTop) + this.minTop;
    this.logoPositionLeft =
      Math.random() * (this.maxLeft - this.minLeft) + this.minLeft;

    this.stepSize = 1;
    this.setStep();

    this.stepLoop = setInterval(() => this.step(), 50);
  }

  setStep(stepSize = 1) {
    let stepTop = Math.random() - 0.5;
    stepTop = stepTop ? stepTop : 0.5;
    let stepLeft = Math.random() - 0.5;
    stepLeft = stepLeft ? stepLeft : 0.5;
    const norm = Math.sqrt(stepTop * stepTop + stepLeft * stepLeft);
    stepTop /= norm;
    stepLeft /= norm;

    this.stepLeft = stepLeft * stepSize;
    this.stepTop = stepTop * stepSize;
  }

  step() {
    this.logoPositionTop = Math.min(
      Math.max(this.logoPositionTop + this.stepTop, this.minTop),
      this.maxTop - this.logoWidth
    );
    this.logoPositionLeft = Math.min(
      Math.max(this.logoPositionLeft + this.stepLeft, this.minLeft),
      this.maxLeft - this.logoWidth
    );
    if (
      this.logoPositionLeft <= this.minLeft ||
      this.logoPositionLeft + this.logoWidth >= this.maxLeft
    ) {
      this.stepLeft = 0 - this.stepLeft;
    }
    if (
      this.logoPositionTop <= this.minTop ||
      this.logoPositionTop + this.logoWidth >= this.maxTop
    ) {
      this.stepTop = 0 - this.stepTop;
    }
  }

  play() {
    if (!this.gameOn) {
      this.score = 0;
      this.time = 60;
      this.gameLoop = setInterval(() => {
        this.time--;
        if (!this.time) {
          clearInterval(this.gameLoop);
          clearInterval(this.stepLoop);
        }
      }, 1000);
      this.gameOn = true;
      this.setStep();
    } else {
      if (this.time) {
        this.score++;
        this.stepSize *= 1.2;
        this.setStep(this.stepSize);
      }
    }
  }

  restart() {
    this.gameOn = false;
    this.createLogo();
  }
}
