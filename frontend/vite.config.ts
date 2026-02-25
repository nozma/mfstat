import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const runtimeProcess = (globalThis as {
  process?: { env?: Record<string, string | undefined> };
}).process;

const appVersion =
  runtimeProcess?.env?.MFSTAT_APP_VERSION ?? runtimeProcess?.env?.npm_package_version ?? "0.1.0";

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
  },
  server: {
    port: 5173
  }
});
