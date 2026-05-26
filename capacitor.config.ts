import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.umbrellacorp.skyscan',
  appName: 'SkyScan',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
