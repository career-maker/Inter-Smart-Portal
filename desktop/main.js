// Inter Smart desktop shell: loads the LIVE web portal, so screens and database are identical to the browser version.
const { app, BrowserWindow, Tray, Menu, shell, powerMonitor, nativeImage, session } = require("electron");
const path = require("path");

const APP_URL = "https://www.workplace.intersmart.in/login";
const HOSTS = ["www.workplace.intersmart.in", "workplace.intersmart.in"];

app.setAppUserModelId("in.intersmart.portal.desktop"); // needed for Windows toast notifications
if (!app.requestSingleInstanceLock()) app.quit();

let win, tray, quitting = false, retryTimer;

function load() { win.loadURL(APP_URL).catch(() => {}); }

function createWindow() {
  win = new BrowserWindow({
    width: 1366, height: 860, minWidth: 900, minHeight: 600,
    title: "Inter Smart Portal", backgroundColor: "#0f172a", autoHideMenuBar: true,
    icon: path.join(__dirname, "build/icon.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), backgroundThrottling: false, contextIsolation: true }, // no throttling: chat/notification polling keeps running when minimised
  });
  load();

  // Links to other sites open in the default browser; portal links stay in the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    try { if (HOSTS.includes(new URL(url).hostname)) return { action: "allow" }; } catch {}
    shell.openExternal(url); return { action: "deny" };
  });

  // Network failure -> friendly offline page that retries by itself.
  win.webContents.on("did-fail-load", (_e, code, _d, url, isMain) => {
    if (!isMain || code === -3) return;
    win.loadFile(path.join(__dirname, "offline.html"));
    clearTimeout(retryTimer); retryTimer = setTimeout(load, 5000);
  });
  win.webContents.on("render-process-gone", () => load()); // crash recovery

  // Close button hides to tray so notifications keep arriving.
  win.on("close", (e) => { if (!quitting) { e.preventDefault(); win.hide(); } });
}

// Refresh without a browser: F5 / Ctrl+R reload, Ctrl+Shift+R hard reload.
function wireShortcuts() {
  win.webContents.on("before-input-event", (e, i) => {
    if (i.type !== "keyDown") return;
    const k = i.key.toLowerCase();
    if (k === "f5" || (i.control && k === "r")) { e.preventDefault(); i.shift ? win.webContents.reloadIgnoringCache() : win.webContents.reload(); }
    if (i.alt && k === "arrowleft" && win.webContents.canGoBack()) win.webContents.goBack();
  });
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(["notifications", "media", "clipboard-read", "clipboard-sanitized-write", "fullscreen"].includes(perm)));
  createWindow(); wireShortcuts();

  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, "build/icon.png")).resize({ width: 16, height: 16 }));
  tray.setToolTip("Inter Smart Portal");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open", click: () => { win.show(); win.focus(); } },
    { label: "Reload", click: () => win.webContents.reload() },
    { type: "separator" },
    { label: "Quit", click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on("click", () => { win.show(); win.focus(); });

  // Wake from sleep: reload so data and sockets are fresh.
  powerMonitor.on("resume", () => setTimeout(() => win.webContents.reload(), 3000));
});

app.on("second-instance", () => { if (win) { win.show(); win.focus(); } });
app.on("before-quit", () => { quitting = true; });
