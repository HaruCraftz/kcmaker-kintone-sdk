import { AppConfig } from './types/appConfig';

export default function getAppsConfig(): Record<string, AppConfig> {
  // グローバル変数が定義されていない場合のチェック
  if (!APPS_CONFIG) {
    throw new Error('Global configuration (APPS_CONFIG) is not defined.');
  }
  return APPS_CONFIG;
}
