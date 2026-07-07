//This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js/dist/zone-testing';
import { getTestBed, TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { CourseService } from './app/services';

declare const require: any;

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting()
);
// Then we find all the tests.
const context = require.context('./', true, /\.spec\.ts$/);
// And load the modules.
context.keys().map(context);


describe('TestSuitName', () => {
  // suite of tests here

  it('test_1', () => {
    expect(1).toEqual(1);
    // this is the body of the test
  });

});

describe('CourseService', () => {
  let service: CourseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CourseService],
    });

    service = TestBed.get(CourseService); // * inject service instance
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  /*it('should set the local', () => {
    // * act
  
    // * assert
    expect(service.getAllCoursesFromServer.length).toBeGreaterThan(0);
  });*/
});
