import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("lumenDesktop", {
  isDesktop: true,
  openMini: () => ipcRenderer.invoke("lumen:open-mini"),
  closeMini: () => ipcRenderer.invoke("lumen:close-mini"),
  resizeMini: (width, height) => ipcRenderer.invoke("lumen:resize-mini", { width, height }),
});
