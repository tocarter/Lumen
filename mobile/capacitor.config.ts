import { loadEnvFile } from "node:process";

import type { CapacitorConfig } from "@capacitor/cli";

try {
  loadEnvFile();
} catch {
  // No .env is supported: the packaged connection-help page is shown.
}

const rawServerUrl = process.env.LUMEN_MOBILE_SERVER_URL?.trim() || process.env.SLATES_MOBILE_SERVER_URL?.trim();

if (rawServerUrl && !/^https?:\/\//i.test(rawServerUrl)) {
  throw new Error("LUMEN_MOBILE_SERVER_URL must start with http:// or https://");
}

const SHELL_BG = "#f4efe6";

const config: CapacitorConfig = {
  appId: "app.lumen.planner",
  appName: "Lumen",
  webDir: "www",
  backgroundColor: SHELL_BG,
  ios: {
    contentInset: "never",
    preferredContentMode: "mobile",
  },
  android: {
    backgroundColor: SHELL_BG,
  },
  server: rawServerUrl
    ? {
        url: rawServerUrl.replace(/\/$/, ""),
        cleartext: rawServerUrl.startsWith("http://"),
        errorPath: "connection-error.html",
      }
    : {
        androidScheme: "https",
        errorPath: "connection-error.html",
      },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 800,
      launchFadeOutDuration: 180,
      backgroundColor: SHELL_BG,
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: SHELL_BG,
      overlaysWebView: true,
    },
    Keyboard: {
      resize: "body",
    },
  },
};

export default config;
