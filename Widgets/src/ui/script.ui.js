console.log("AppVolume widget loaded");
ipcRenderer.send("appVolume_request");

let bg_width = 360;
let bg_height = 220;
let fontColor = "rgb(255,255,255)";
let subFontColor = "rgb(150,150,150)";
let accentColor = "rgb(20,232,115)";

let currentSession = null;

function setElementProperty(id, property, value) {
  ui.setElementProperties(id, { [property]: value });
}

function pickSession(sessions) {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;
  let best = null;
  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    if (!s || typeof s !== "object") continue;
    if (!best) {
      best = s;
      continue;
    }
    const aPeak = typeof s.peak === "number" ? s.peak : 0;
    const bPeak = typeof best.peak === "number" ? best.peak : 0;
    if (aPeak > bPeak) {
      best = s;
      continue;
    }
    if (aPeak === bPeak) {
      const aVol = typeof s.volume === "number" ? s.volume : 0;
      const bVol = typeof best.volume === "number" ? best.volume : 0;
      if (aVol > bVol) best = s;
    }
  }
  return best;
}

function volumeLabel(v) {
  if (typeof v !== "number" || !isFinite(v)) return "0%";
  return Math.round(v * 100) + "%";
}

ipcRenderer.on("appVolume_update", (event, sessions) => {
  console.log("[AppVolume UI] update:", Array.isArray(sessions) ? sessions.length : "n/a");
  currentSession = pickSession(sessions);

  if (!currentSession) {
    setElementProperty("session_Text", "text", "No active session");
    setElementProperty("volume_Text", "text", "0%");
    setElementProperty("mute_Text", "text", "Mute: n/a");
    setElementProperty("volume_Bar", "value", 0);
    setElementProperty("peak_Bar", "value", 0);
    setElementProperty("app_Icon", "path", "app.png");
    return;
  }

  const name = currentSession.displayName || currentSession.processName || currentSession.fileName || "Unknown";
  const volume = typeof currentSession.volume === "number" ? currentSession.volume : 0;
  const peak = typeof currentSession.peak === "number" ? currentSession.peak : 0;
  const muted = !!currentSession.muted;
  const iconPath = currentSession.iconPath ? currentSession.iconPath : "app.png";

  console.log("[AppVolume UI] session:", name, "pid=", currentSession.pid, "vol=", volume, "muted=", muted);

  setElementProperty("app_Icon", "path", iconPath);
  setElementProperty("session_Text", "text", name);
  setElementProperty("volume_Text", "text", volumeLabel(volume));
  setElementProperty("mute_Text", "text", muted ? "Mute: on" : "Mute: off");
  setElementProperty("volume_Bar", "value", Math.max(0, Math.min(1, volume)));
  setElementProperty("peak_Bar", "value", Math.max(0, Math.min(1, peak)));
});

ui.addShape({
  id: "background",
  type: "rectangle",
  x: 0,
  y: 0,
  width: bg_width,
  height: bg_height,
  fillColor: "rgba(0,0,0,0.6)",
  strokeWidth: 0
});

ui.addText({
  id: "title_Text",
  x: 56,
  y: 16,
  text: "App Volume",
  fontSize: 18,
  fontColor: fontColor
});

ui.addImage({
  id: "app_Icon",
  x: 16,
  y: 12,
  width: 32,
  height: 32,
  path: "app.png"
});

ui.addText({
  id: "session_Text",
  x: 16,
  y: 52,
  text: "No active session",
  fontSize: 14,
  width: bg_width - 32,
  textClip: "ellipsis",
  fontColor: subFontColor
});

ui.addText({
  id: "volume_Text",
  x: 16,
  y: 82,
  text: "0%",
  fontSize: 14,
  fontColor: fontColor
});

ui.addText({
  id: "mute_Text",
  x: bg_width - 16,
  y: 82,
  text: "Mute: off",
  fontSize: 14,
  textAlign: "right",
  fontColor: subFontColor,
  onLeftMouseUp: function () {
    if (!currentSession || typeof currentSession.pid !== "number") return;
    ipcRenderer.send("appVolume_toggleMute", {
      pid: currentSession.pid,
      muted: !currentSession.muted
    });
  }
});

ui.addBar({
  id: "volume_Bar",
  x: 16,
  y: 118,
  width: bg_width - 32,
  height: 12,
  value: 0,
  barColor: accentColor,
  backgroundColor: "rgb(60,60,60)",
  onLeftMouseUp: function (e) {
    if (!currentSession || typeof currentSession.pid !== "number") return;
    const pct = Math.max(0, Math.min(100, e?.__offsetXPercent ?? 0));
    ipcRenderer.send("appVolume_set", {
      pid: currentSession.pid,
      volume: pct / 100
    });
  }
});

ui.addBar({
  id: "peak_Bar",
  x: 16,
  y: 142,
  width: bg_width - 32,
  height: 8,
  value: 0,
  barColor: "rgb(255,120,0)",
  backgroundColor: "rgb(40,40,40)"
});
