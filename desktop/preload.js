const { contextBridge } = require("electron");
// Lets the web app detect it runs inside the desktop shell.
contextBridge.exposeInMainWorld("isDesktopApp", true);
window.addEventListener("online", () => location.reload());
