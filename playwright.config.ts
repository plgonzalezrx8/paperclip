import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";

async function reserveTcpPort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const reservation = net.createServer();
    reservation.unref();
    reservation.on("error", reject);
    reservation.listen(0, "127.0.0.1", () => {
      const address = reservation.address();
      if (!address || typeof address === "string") {
        reservation.close(() => reject(new Error("Failed to reserve a Playwright port")));
        return;
      }
      reservation.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(address.port);
      });
    });
  });
}

const port =
  Number(process.env.PAPERCLIP_E2E_PORT ?? "") || await reserveTcpPort();
process.env.PAPERCLIP_E2E_PORT = String(port);

const paperclipHome =
  process.env.PAPERCLIP_E2E_HOME ??
  fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-playwright-"));
process.env.PAPERCLIP_E2E_HOME = paperclipHome;

const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "pnpm start",
    url: `${baseURL}/api/health`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      CI: "1",
      PORT: String(port),
      PAPERCLIP_HOME: paperclipHome,
      PAPERCLIP_INSTANCE_ID: "playwright",
      PAPERCLIP_E2E_PORT: String(port),
      PAPERCLIP_E2E_HOME: paperclipHome,
      PAPERCLIP_MIGRATION_PROMPT: "never",
      PAPERCLIP_MIGRATION_AUTO_APPLY: "true",
      HEARTBEAT_SCHEDULER_ENABLED: "false",
      BRIEFING_SCHEDULER_ENABLED: "false",
    },
  },
});
