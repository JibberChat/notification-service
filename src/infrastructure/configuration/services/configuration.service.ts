import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  APP_NAME,
  APP_VERSION,
  AppConfiguration,
  NODE_ENV,
} from '../model/app-configuration';
import { LoggerService } from '@infrastructure/logger/services/logger.service';

@Injectable()
export class ConfigurationService {
  private logger = new LoggerService();

  private _appConfig!: AppConfiguration;

  public isProd!: boolean;

  get appConfig(): AppConfiguration {
    return this._appConfig;
  }

  constructor(private nestConfigService: ConfigService) {
    this.setupEnvironment();
    this.logger.log(
      'Configuration service initialized.',
      this.constructor.name,
    );
    this.logger.log(`App name: ${this._appConfig.name}`, this.constructor.name);
  }

  private setupEnvironment(): void {
    // APP
    const appEnv = this.getVariableFromEnvFile(NODE_ENV);

    this._appConfig = {
      name: this.getVariableFromEnvFile(APP_NAME),
      version: this.getVariableFromEnvFile(APP_VERSION),
      env: appEnv,
    };

    this.isProd = appEnv.includes('prod');
  }

  private getVariableFromEnvFile(key: string): string {
    const variable = this.nestConfigService.get<string>(key);
    if (!variable) {
      this.logger.error(
        `No ${key} could be found from env file.`,
        this.constructor.name,
      );
      throw new Error(`No ${key} could be found from env file.`);
    }
    return variable;
  }
}
