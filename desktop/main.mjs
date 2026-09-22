import { app, BrowserWindow, ipcMain, shell, dialog } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const PORTAL = Number(process.env.LUMEN_PORT || 3000);
const USER_ENV_FILE = path.join(os.homedir(), ".lumen", ".env");
const ATTACH = process.env.LUMEN_ATTACH === "1";

function readUserEnv() {
  try {
    const out = {};
    for (const line of fs.readFileSync(USER_ENV_FILE, "utf8").split("\n")) {
      const m = /^\s*([\w.-]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (!m || line.trim().startsWith("#")) continue;
      out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

const children = [];
let win = null;
let mini = null;
const PRELOAD = path.join(HERE, "preload.cjs");

function webPrefs(extra = {}) {
  return {
    nodeIntegration: false,
    contextIsolation: true,
    preload: PRELOAD,
    sandbox: true,
    ...extra,
  };
}

function run(name, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      ...readUserEnv(),
      PORT: String(PORTAL),
      HOSTNAME: "127.0.0.1",
      ...(command === process.execPath ? { ELECTRON_RUN_AS_NODE: "1" } : {}),
    },
  });
  const log = (buf) => process.stdout.write(`[${name}] ${buf}`);
  child.stdout.on("data", log);
  child.stderr.on("data", log);
  child.on("exit", (code) => console.log(`[${name}] exited (${code})`));
  children.push(child);
  return child;
}

async function answers(port, timeoutMs = 1500) {
  try {
    await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(timeoutMs) });
    return true;
  } catch {
    return false;
  }
}

function boot(fn, ...args) {
  if (!win || win.isDestroyed()) return;
  const call = `window.lumenBoot && window.lumenBoot.${fn}(${args.map((a) => JSON.stringify(a)).join(", ")})`;
  win.webContents.executeJavaScript(call).catch(() => {});
}

async function waitForPort(port, label, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  let slow = false;
  while (Date.now() < deadline) {
    if (await answers(port)) return true;
    if (!slow && Date.now() > deadline - timeoutMs + 12_000) {
      slow = true;
      boot("note", `${label} is taking a while — first start after an update usually does.`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`${label} did not start on port ${port}`);
}

async function ensure(name, port, command, args, cwd, label) {
  if (await answers(port)) {
    console.log(`[${name}] already running on ${port} — attaching`);
    boot("step", name, `${label} — already running`, "done");
    return;
  }
  boot("step", name, label, "active");
  run(name, command, args, cwd);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 900,
    minHeight: 600,
    show: false,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 14 },
    backgroundColor: "#0c0e10",
    webPreferences: webPrefs(),
  });

  win.once("ready-to-show", () => win?.show());
  win.on("closed", () => {
    win = null;
    closeMiniWindow();
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  return win.loadFile(path.join(HERE, "splash.html"));
}

function miniUrl() {
  return `http://127.0.0.1:${PORTAL}/focus-mini`;
}

function createMiniWindow() {
  if (mini && !mini.isDestroyed()) {
    mini.show();
    mini.focus();
    return mini;
  }
  mini = new BrowserWindow({
    width: 340,
    height: 72,
    useContentSize: true,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    fullscreenable: false,
    minimizable: false,
    maximizable: false,
    hasShadow: true,
    backgroundColor: "#00000000",
    show: false,
    webPreferences: webPrefs(),
  });
  mini.setAlwaysOnTop(true, "floating");
  mini.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mini.setWindowButtonVisibility?.(false);
  mini.once("ready-to-show", () => mini?.show());
  mini.on("closed", () => {
    mini = null;
  });
  void mini.loadURL(miniUrl());
  return mini;
}

function closeMiniWindow() {
  if (mini && !mini.isDestroyed()) {
    mini.close();
  }
  mini = null;
}

ipcMain.handle("lumen:open-mini", async () => {
  createMiniWindow();
});

ipcMain.handle("lumen:close-mini", async () => {
  closeMiniWindow();
});

ipcMain.handle("lumen:resize-mini", async (_event, size) => {
  if (!mini || mini.isDestroyed() || !size) return;
  const width = Math.max(240, Number(size.width) || 340);
  const height = Math.max(64, Number(size.height) || 72);
  mini.setContentSize(width, height);
});

app.whenReady().then(async () => {
  try {
    createWindow();
    await new Promise((r) => setTimeout(r, 50));

    if (!ATTACH) {
      const base = app.isPackaged ? process.resourcesPath : ROOT;
      if (app.isPackaged) {
        const webDir = path.join(base, "web");
        await ensure("portal", PORTAL, process.execPath, [path.join(webDir, "server.js")], webDir, "Starting Lumen");
      } else {
        await ensure("portal", PORTAL, "npm", ["run", "start"], path.join(ROOT, "web"), "Starting Lumen");
      }
    }

    await waitForPort(PORTAL, "Portal");
    boot("step", "portal", "Portal is up", "done");
    boot("step", "board", "Opening your board", "active");
    boot("done");
    await new Promise((r) => setTimeout(r, 450));
    if (win && !win.isDestroyed()) await win.loadURL(`http://127.0.0.1:${PORTAL}`);
  } catch (e) {
    const message = String(e instanceof Error ? e.message : e);
    boot("step", "portal", "Couldn't start", "failed");
    boot("failed", message);
    dialog.showErrorBox("Lumen couldn't start", message);
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

function shutdown() {
  for (const child of children.splice(0)) {
    child.kill("SIGTERM");
  }
}

app.on("before-quit", shutdown);
app.on("window-all-closed", () => {
  shutdown();
  app.quit();
});
process.on("exit", shutdown);
