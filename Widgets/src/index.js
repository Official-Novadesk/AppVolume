import { widgetWindow, addon } from "novadesk";

const widget = new widgetWindow({
  id: "app-volume",
  width: 360,
  height: 220,
  backgroundColor: "#000000",
  script: "ui/script.ui.js",
});

const appVolume = addon.load(
  "addon//AppVolume.dll"
);

function getSessions() {
  try {
    const sessions = appVolume.listSessions();
    console.log("[AppVolume] sessions:", Array.isArray(sessions) ? sessions.length : "n/a");
    return sessions;
  } catch (e) {
    console.log("[AppVolume] listSessions error:", String(e));
    return [];
  }
}

function pushSessions() {
  ipcMain.send("appVolume_update", getSessions());
}

pushSessions();
setInterval(() => {
  pushSessions();
}, 1000);

ipcMain.on("appVolume_request", () => {
  pushSessions();
});

ipcMain.on("appVolume_set", (event, data) => {
  const pid = data && typeof data.pid === "number" ? data.pid : 0;
  const volume = data && typeof data.volume === "number" ? data.volume : null;
  console.log("[AppVolume] setVolume request:", pid, volume);
  if (pid > 0 && volume !== null) {
    const clamped = Math.max(0, Math.min(1, volume));
    appVolume.setVolumeByPid(pid, clamped);
  }
});

ipcMain.on("appVolume_toggleMute", (event, data) => {
  const pid = data && typeof data.pid === "number" ? data.pid : 0;
  const muted = data && typeof data.muted === "boolean" ? data.muted : null;
  console.log("[AppVolume] toggleMute request:", pid, muted);
  if (pid > 0 && muted !== null) {
    appVolume.setMuteByPid(pid, muted);
  }
});
