import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.direct.paisa',
  appName: 'Direct Paisa',
  webDir: 'dist/public',
  server: {
    url: 'http://10.0.2.2:8000',
    cleartext: true
  }
};

export default config;
