import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

interface AppConfig {
  creator: string
}

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {

  private configuration: AppConfig = {creator: ''};

  constructor(
    private httpClient: HttpClient
  ) { }

  setConfig(): Promise<AppConfig> {
    return this.httpClient
      .get<AppConfig>('../assets/app-config.json')
      .toPromise()
      .then(config => this.configuration = config);
  }

  readConfig(): AppConfig {
    return this.configuration;
  }
}