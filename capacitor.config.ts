import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gekenye.ticket',
  appName: 'Ticketstream Events',
  webDir: 'dist',
  
  // ADD THIS SECTION BELOW
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;