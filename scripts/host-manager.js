const http = require("http");
const { spawn, exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PORT = 9999;
let activeTargetDir = path.resolve(__dirname, "..");
let customDomain = "";
let customHttpsUrl = "";

let serverProcess = null;
let tunnelProcess = null;
let serverStatus = "OFFLINE";
let tunnelStatus = "OFFLINE";
let startTime = null;
let sessionEndTime = null;
let hostingTimerId = null;
let durationMinutes = 15;

// Parse optional CLI duration argument e.g. node host-manager.js 15
const cliArgs = process.argv.slice(2);
for (let i = 0; i < cliArgs.length; i++) {
  if (cliArgs[i] === "--duration" && cliArgs[i + 1]) {
    durationMinutes = parseInt(cliArgs[i + 1], 10) || 15;
  } else if (!isNaN(parseInt(cliArgs[i], 10))) {
    durationMinutes = parseInt(cliArgs[i], 10);
  }
}

let webPort = 3000;
let logs = [];
let lastPingTime = 0;
let lastPingLatency = -1;

function addLog(msg, type = "info") {
  const time = new Date().toLocaleTimeString();
  const logItem = { time, msg, type };
  logs.push(logItem);
  if (logs.length > 300) logs.shift();
  console.log(`[${time}] ${msg}`);
}

function checkWebHealth() {
  if (serverStatus !== "ONLINE") {
    lastPingLatency = -1;
    return;
  }
  const start = Date.now();
  const req = http.get(`http://localhost:${webPort}`, (res) => {
    lastPingLatency = Date.now() - start;
  });
  req.on("error", () => {
    lastPingLatency = -1;
  });
  req.setTimeout(2000, () => {
    req.destroy();
  });
}

setInterval(checkWebHealth, 3000);

function killPort(port, callback) {
  addLog(`Clearing port ${port}...`, "sys");
  if (os.platform() === "win32") {
    exec(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${port} ^| findstr LISTENING') do taskkill /F /PID %a`, () => {
      setTimeout(() => { if (callback) callback(); }, 600);
    });
  } else {
    exec(`fuser -k ${port}/tcp`, () => {
      setTimeout(() => { if (callback) callback(); }, 600);
    });
  }
}

function scanWebsiteFolder(folderPath) {
  const target = path.resolve(folderPath);
  const result = {
    path: target,
    exists: false,
    type: "UNKNOWN",
    ready: false,
    score: 0,
    checks: [],
    suggestedCmd: "npm run start",
  };

  if (!fs.existsSync(target)) {
    result.checks.push({ item: "Folder Path", pass: false, note: "Folder does not exist" });
    return result;
  }

  result.exists = true;
  result.checks.push({ item: "Folder Path", pass: true, note: "Valid folder path found" });

  const hasPkg = fs.existsSync(path.join(target, "package.json"));
  const hasIndexHtml = fs.existsSync(path.join(target, "index.html"));
  const hasPublicIndex = fs.existsSync(path.join(target, "public", "index.html"));
  const hasNextConfig = fs.existsSync(path.join(target, "next.config.js")) || fs.existsSync(path.join(target, "next.config.mjs"));
  const hasViteConfig = fs.existsSync(path.join(target, "vite.config.js")) || fs.existsSync(path.join(target, "vite.config.ts"));
  const hasNodeModules = fs.existsSync(path.join(target, "node_modules"));
  const hasNextBuild = fs.existsSync(path.join(target, ".next"));
  const hasDist = fs.existsSync(path.join(target, "dist")) || fs.existsSync(path.join(target, "build"));

  if (hasNextConfig || (hasPkg && fs.existsSync(path.join(target, "app")))) {
    result.type = "Next.js Web Application";
    result.checks.push({ item: "Framework", pass: true, note: "Next.js App Router / Pages" });

    if (hasNodeModules) {
      result.checks.push({ item: "Dependencies (node_modules)", pass: true, note: "Packages installed" });
      result.score += 40;
    } else {
      result.checks.push({ item: "Dependencies (node_modules)", pass: false, note: "Missing node_modules (Run 'npm install')" });
    }

    if (hasNextBuild) {
      result.checks.push({ item: "Production Build (.next)", pass: true, note: "Optimized production build ready" });
      result.score += 50;
      result.suggestedCmd = "npm run start";
    } else {
      result.checks.push({ item: "Production Build (.next)", pass: false, note: "Missing build (Run 'npm run build' or dev server)" });
      result.score += 20;
      result.suggestedCmd = "npm run dev";
    }
  } else if (hasViteConfig) {
    result.type = "Vite React App";
    result.checks.push({ item: "Framework", pass: true, note: "Vite App" });
    if (hasNodeModules) { result.score += 50; result.checks.push({ item: "Dependencies", pass: true, note: "Installed" }); }
    if (hasDist) { result.score += 40; result.checks.push({ item: "Dist Bundle", pass: true, note: "Built" }); }
    result.suggestedCmd = "npm run dev";
  } else if (hasIndexHtml || hasPublicIndex) {
    result.type = "Static HTML / JS Site";
    result.score = 100;
    result.checks.push({ item: "Entry File", pass: true, note: "index.html found" });
    result.suggestedCmd = "npx serve .";
  } else if (hasPkg) {
    result.type = "Node.js Web App";
    result.score = 70;
    result.checks.push({ item: "Package Manifest", pass: true, note: "package.json found" });
    result.suggestedCmd = "npm start";
  } else {
    result.type = "Generic Static Folder";
    result.checks.push({ item: "Entry Point", pass: false, note: "No index.html or package.json found" });
  }

  result.ready = result.score >= 60;
  return result;
}

function startServer(targetFolder = activeTargetDir) {
  if (serverProcess) {
    addLog("Server is already running! Stop previous server first.", "warning");
    return;
  }

  const scan = scanWebsiteFolder(targetFolder);
  if (!scan.exists) {
    addLog(`Error: Target folder does not exist: ${targetFolder}`, "stderr");
    return;
  }

  activeTargetDir = scan.path;

  killPort(webPort, () => {
    addLog(`Target Project: ${activeTargetDir} [Type: ${scan.type}]`, "sys");
    addLog(`Initiating Server launch (${scan.suggestedCmd} -p ${webPort})...`, "sys");

    const isWin = os.platform() === "win32";
    const cmd = isWin ? "cmd.exe" : "npm";
    const args = isWin ? ["/c", ...scan.suggestedCmd.split(" "), "--", "-p", String(webPort)] : [...scan.suggestedCmd.split(" "), "--", "-p", String(webPort)];

    serverProcess = spawn(cmd, args, { cwd: activeTargetDir, env: process.env });
    serverStatus = "ONLINE";
    startTime = Date.now();

    addLog(`Server PID: ${serverProcess.pid} — Listening on http://localhost:${webPort}`, "success");

    // Auto-start Cloudflare HTTPS Tunnel
    startHttpsTunnel();

    // Auto-stop hosting session after specified duration
    if (hostingTimerId) clearTimeout(hostingTimerId);
    if (durationMinutes > 0) {
      sessionEndTime = Date.now() + durationMinutes * 60 * 1000;
      addLog(`⏰ 15-Minute Hosting Session Started! Auto shutdown in ${durationMinutes} minutes.`, "sys");
      hostingTimerId = setTimeout(() => {
        addLog(`⌛ ${durationMinutes}-minute hosting session expired! Shutting down server...`, "warning");
        stopHttpsTunnel();
        stopServer();
        setTimeout(() => process.exit(0), 1500);
      }, durationMinutes * 60 * 1000);
    }

    serverProcess.stdout.on("data", (data) => {
      const text = data.toString().trim();
      if (text) addLog(text, "stdout");
    });

    serverProcess.stderr.on("data", (data) => {
      const text = data.toString().trim();
      if (text) addLog(text, "stderr");
    });

    serverProcess.on("close", (code) => {
      addLog(`Server stopped with code: ${code}`, "warning");
      serverStatus = "OFFLINE";
      serverProcess = null;
      startTime = null;
      sessionEndTime = null;
      if (hostingTimerId) clearTimeout(hostingTimerId);
    });
  });
}

function stopServer() {
  addLog("Terminating Web Server and clearing port 3000...", "sys");
  if (serverProcess) {
    if (os.platform() === "win32") {
      exec(`taskkill /pid ${serverProcess.pid} /T /F`, () => {
        serverProcess = null;
        serverStatus = "OFFLINE";
        startTime = null;
        killPort(webPort, () => {
          addLog("Server successfully stopped.", "success");
        });
      });
    } else {
      serverProcess.kill("SIGINT");
      serverProcess = null;
      serverStatus = "OFFLINE";
      startTime = null;
      killPort(webPort, () => {
        addLog("Server successfully stopped.", "success");
      });
    }
  } else {
    killPort(webPort, () => {
      serverStatus = "OFFLINE";
      startTime = null;
      addLog("Port 3000 force cleared and ready.", "success");
    });
  }
}

function startHttpsTunnel(customSubdomain = "") {
  if (tunnelProcess) {
    addLog("HTTPS Tunnel is already active!", "warning");
    return;
  }
  addLog(`Initiating Cloudflare HTTPS Tunnel [Alias: ${customSubdomain || 'Auto'}]...`, "sys");
  const tunnelArgs = ["tunnel", "--url", `http://localhost:${webPort}`];
  const npxCmd = os.platform() === "win32" ? "npx.cmd" : "npx";
  tunnelProcess = spawn(npxCmd, ["-y", "cloudflared", ...tunnelArgs], { shell: true });
  tunnelStatus = "CONNECTING";

  tunnelProcess.on("error", (err) => {
    addLog(`Tunnel Error: ${err.message}`, "stderr");
  });

  tunnelProcess.stdout.on("data", (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match) {
      customHttpsUrl = match[0];
      tunnelStatus = "ONLINE";
      addLog(`HTTPS Public Link Active: ${customHttpsUrl}`, "success");
    }
  });

  tunnelProcess.stderr.on("data", (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match) {
      customHttpsUrl = match[0];
      tunnelStatus = "ONLINE";
      addLog(`HTTPS Public Link Active: ${customHttpsUrl}`, "success");
    }
  });

  tunnelProcess.on("close", () => {
    tunnelStatus = "OFFLINE";
    customHttpsUrl = "";
    tunnelProcess = null;
    addLog("HTTPS Tunnel stopped.", "warning");
  });
}

function stopHttpsTunnel() {
  if (tunnelProcess) {
    tunnelProcess.kill();
    tunnelProcess = null;
    tunnelStatus = "OFFLINE";
    customHttpsUrl = "";
    addLog("HTTPS Tunnel terminated.", "sys");
  }
}

const hudHtml = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>PFP MULTI-WEB SERVER HOSTING HUD</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
    body { background: #0d0718; color: #f5eeff; min-height: 100vh; padding: 24px; }
    .bgGrid { position: fixed; inset: 0; background-image: linear-gradient(rgba(177,141,208,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(177,141,208,0.05) 1px, transparent 1px); background-size: 20px 20px; pointer-events: none; }
    .container { max-width: 1000px; margin: 0 auto; position: relative; z-index: 2; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(177,141,208,0.2); padding-bottom: 16px; margin-bottom: 24px; }
    .title { font-size: 18px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #ffffff; text-shadow: 0 0 12px rgba(177,141,208,0.6); display: flex; align-items: center; gap: 10px; }
    .pulseDot { width: 10px; height: 10px; border-radius: 50%; background: #23a55a; box-shadow: 0 0 10px #23a55a; animation: pulse 1.8s infinite alternate; }
    .pulseDot.offline { background: #ff4757; box-shadow: 0 0 10px #ff4757; }
    @keyframes pulse { 0% { opacity: 0.4; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1.2); } }
    
    .panel { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; backdrop-filter: blur(10px); margin-bottom: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
    .panelTitle { font-size: 12px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #b18dd0; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; }

    .inputRow { display: flex; gap: 10px; margin-bottom: 14px; }
    .input { flex: 1; background: rgba(8,5,18,0.7); border: 1px solid rgba(177,141,208,0.3); border-radius: 8px; padding: 10px 14px; color: #ffffff; font-size: 12px; font-family: monospace; outline: none; }
    .input:focus { border-color: #b18dd0; box-shadow: 0 0 10px rgba(177,141,208,0.3); }

    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; }
    .cardLabel { font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: rgba(235,222,248,0.5); margin-bottom: 6px; }
    .cardValue { font-size: 20px; font-weight: 700; color: #ffffff; }
    .cardValSub { font-size: 11px; color: #b18dd0; font-weight: 600; margin-top: 4px; word-break: break-all; }

    .scanResult { background: rgba(8,5,18,0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px; margin-top: 10px; }
    .checkItem { font-size: 11px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .pass { color: #23a55a; font-weight: 700; }
    .fail { color: #ff4757; font-weight: 700; }

    .btnGroup { display: flex; gap: 10px; flex-wrap: wrap; }
    .btn { padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; border: 1px solid transparent; transition: all 0.2s ease; }
    .btnStart { background: linear-gradient(135deg, rgba(35,165,90,0.3), rgba(35,165,90,0.1)); border-color: #23a55a; color: #ffffff; box-shadow: 0 0 14px rgba(35,165,90,0.3); }
    .btnStart:hover { background: #23a55a; transform: translateY(-2px); }
    .btnStop { background: linear-gradient(135deg, rgba(255,71,87,0.3), rgba(255,71,87,0.1)); border-color: #ff4757; color: #ffffff; }
    .btnStop:hover { background: #ff4757; transform: translateY(-2px); }
    .btnAction { background: rgba(177,141,208,0.2); border-color: rgba(177,141,208,0.5); color: #ffffff; }
    .btnAction:hover { background: #b18dd0; }

    .terminal { background: rgba(8,5,18,0.85); border: 1px solid rgba(177,141,208,0.2); border-radius: 12px; padding: 16px; font-family: monospace; font-size: 11px; height: 260px; overflow-y: auto; color: #e5d4f5; }
    .logLine { margin-bottom: 4px; word-break: break-all; }
    .logTime { color: rgba(255,255,255,0.4); margin-right: 8px; }
    .logType-stdout { color: #b18dd0; }
    .logType-success { color: #23a55a; font-weight: 700; }
    .logType-warning { color: #eccc68; }
    .logType-stderr { color: #ff4757; }
  </style>
</head>
<body>
  <div class="bgGrid"></div>
  <div class="container">
    <div class="header">
      <div class="title">
        <div id="dot" class="pulseDot offline"></div>
        PFP MULTI-WEB SERVER HOSTING HUD
      </div>
      <div style="font-size: 10px; color: rgba(255,255,255,0.4); letter-spacing: 0.12em;">CONTROL PANEL V2.1 (AUTO-PORT RESOLVER)</div>
    </div>

    <!-- Website Scanner & Folder Selector -->
    <div class="panel">
      <div class="panelTitle">
        🔍 WEBSITE SELECTOR & READINESS SCANNER
        <span id="scanBadge" style="background:rgba(35,165,90,0.2); border:1px solid #23a55a; padding:2px 8px; border-radius:4px; font-size:10px;">READY TO HOST</span>
      </div>
      <div class="inputRow">
        <input id="folderPathInput" class="input" type="text" placeholder="Enter website folder path (e.g. C:\\Users\\...\\PFP WEBSITE)" />
        <button class="btn btnAction" onclick="scanFolder()">SCAN WEBSITE</button>
      </div>
      <div id="scanBox" class="scanResult">
        <div style="font-size: 11px; color: rgba(255,255,255,0.5);">Press SCAN WEBSITE to analyze readiness status...</div>
      </div>
    </div>

    <!-- Custom Link & HTTPS Domain Manager -->
    <div class="panel">
      <div class="panelTitle">🌐 CUSTOM DOMAIN & HTTPS LINK SYSTEM</div>
      <div class="inputRow">
        <input id="customAliasInput" class="input" type="text" placeholder="Enter custom subdomain alias (e.g. my-cool-website)" />
        <button class="btn btnAction" onclick="startTunnel()">ENABLE HTTPS LINK</button>
        <button class="btn btnStop" onclick="stopTunnel()">DISABLE HTTPS</button>
      </div>
      <div style="font-size: 11px; color:#b18dd0;">
        ACTIVE HTTPS LINK: <a id="httpsLinkText" href="#" target="_blank" style="color:#ffffff; font-weight:700; text-decoration:none;">OFFLINE</a>
      </div>
    </div>

    <!-- Server Live Status Grid -->
    <div class="grid">
      <div class="card">
        <div class="cardLabel">SERVER STATUS</div>
        <div id="statusVal" class="cardValue" style="color:#ff4757;">OFFLINE</div>
        <div id="statusSub" class="cardValSub">STANDBY</div>
      </div>
      <div class="card">
        <div class="cardLabel">TARGET PROJECT</div>
        <div id="targetNameVal" class="cardValue" style="font-size: 14px;">PFP WEBSITE</div>
        <div id="targetPathVal" class="cardValSub">PATH</div>
      </div>
      <div class="card">
        <div class="cardLabel">15-MIN SESSION TIMER</div>
        <div id="uptimeVal" class="cardValue">15:00</div>
        <div id="timerSub" class="cardValSub">COUNTDOWN REMAINING</div>
      </div>
      <div class="card">
        <div class="cardLabel">RAM & LATENCY</div>
        <div id="ramVal" class="cardValue">0 MB</div>
        <div id="latencyVal" class="cardValSub">PING: -- ms</div>
      </div>
    </div>

    <!-- Controls -->
    <div class="btnGroup" style="margin-bottom: 24px;">
      <button class="btn btnStart" onclick="api('start')">▶ START HOSTING WEBSITE</button>
      <button class="btn btnStop" onclick="api('stop')">⏹ FORCE STOP & CLEAR PORT 3000</button>
      <button class="btn btnAction" onclick="openLocal()">🌐 OPEN LOCALHOST (PORT 3000)</button>
    </div>

    <!-- Log Console -->
    <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #b18dd0; margin-bottom: 8px;">SYSTEM DIAGNOSTIC & EVENT LOG CONSOLE</div>
    <div id="terminal" class="terminal"></div>
  </div>

  <script>
    let currentTargetPath = "";

    function scanFolder() {
      const pathVal = document.getElementById('folderPathInput').value.trim();
      if (!pathVal) return;
      fetch('/api/scan?path=' + encodeURIComponent(pathVal))
        .then(r => r.json())
        .then(data => {
          currentTargetPath = data.path;
          const box = document.getElementById('scanBox');
          const badge = document.getElementById('scanBadge');

          badge.innerText = data.ready ? 'READINESS: ' + data.score + '% [READY]' : 'READINESS: ' + data.score + '% [ACTION REQUIRED]';
          badge.style.borderColor = data.ready ? '#23a55a' : '#ff4757';
          badge.style.color = data.ready ? '#23a55a' : '#ff4757';

          let html = \`<div style="font-size: 12px; font-weight: 700; color: #ffffff; margin-bottom: 8px;">TYPE: \${data.type} (Score: \${data.score}%)</div>\`;
          html += data.checks.map(c => \`<div class="checkItem"><span>\${c.item}: \${c.note}</span><span class="\${c.pass ? 'pass' : 'fail'}">\${c.pass ? '✔ PASS' : '✘ CHECK'}</span></div>\`).join('');
          box.innerHTML = html;
        });
    }

    function startTunnel() {
      const alias = document.getElementById('customAliasInput').value.trim();
      fetch('/api/tunnel/start', { method: 'POST', body: JSON.stringify({ alias }), headers: { 'Content-Type': 'application/json' } })
        .then(() => setTimeout(updateHUD, 500));
    }

    function stopTunnel() {
      fetch('/api/tunnel/stop', { method: 'POST' }).then(() => setTimeout(updateHUD, 500));
    }

    function openLocal() {
      window.open('http://localhost:3000', '_blank');
    }

    function updateHUD() {
      fetch('/api/status')
        .then(r => r.json())
        .then(data => {
          const dot = document.getElementById('dot');
          const statusVal = document.getElementById('statusVal');
          const statusSub = document.getElementById('statusSub');
          const uptimeVal = document.getElementById('uptimeVal');
          const ramVal = document.getElementById('ramVal');
          const latencyVal = document.getElementById('latencyVal');
          const targetNameVal = document.getElementById('targetNameVal');
          const targetPathVal = document.getElementById('targetPathVal');
          const httpsLinkText = document.getElementById('httpsLinkText');
          const terminal = document.getElementById('terminal');

          if (data.status === 'ONLINE') {
            dot.className = 'pulseDot';
            statusVal.innerText = 'ONLINE (' + (data.durationMinutes || 15) + ' MIN SESSION)';
            statusVal.style.color = '#23a55a';
            statusSub.innerText = 'ACTIVE';
          } else {
            dot.className = 'pulseDot offline';
            statusVal.innerText = 'OFFLINE';
            statusVal.style.color = '#ff4757';
            statusSub.innerText = 'STANDBY';
          }

          uptimeVal.innerText = data.remaining || data.uptime;
          ramVal.innerText = data.ram + ' MB';
          latencyVal.innerText = data.latency >= 0 ? 'PING: ' + data.latency + ' ms' : 'PING: --';
          targetNameVal.innerText = data.targetPath.split('\\\\').pop().split('/').pop();
          targetPathVal.innerText = data.targetPath;

          if (data.httpsUrl) {
            httpsLinkText.innerText = data.httpsUrl;
            httpsLinkText.href = data.httpsUrl;
          } else {
            httpsLinkText.innerText = 'OFFLINE';
            httpsLinkText.removeAttribute('href');
          }

          terminal.innerHTML = data.logs.map(l => \`<div class="logLine"><span class="logTime">\${l.time}</span><span class="logType-\${l.type}">\${l.msg}</span></div>\`).join('');
          terminal.scrollTop = terminal.scrollHeight;
        })
        .catch(() => {});
    }

    function api(action) {
      const body = JSON.stringify({ targetPath: currentTargetPath });
      fetch('/api/' + action, { method: 'POST', body, headers: { 'Content-Type': 'application/json' } })
        .then(() => setTimeout(updateHUD, 400));
    }

    setInterval(updateHUD, 1200);
    updateHUD();
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  
  if (urlObj.pathname === "/" || urlObj.pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(hudHtml);
  } else if (urlObj.pathname === "/api/scan") {
    const folder = urlObj.searchParams.get("path") || activeTargetDir;
    const scanResult = scanWebsiteFolder(folder);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(scanResult));
  } else if (urlObj.pathname === "/api/status") {
    let uptime = "00:00:00";
    let remaining = "15:00";
    if (startTime) {
      const sec = Math.floor((Date.now() - startTime) / 1000);
      const h = String(Math.floor(sec / 3600)).padStart(2, "0");
      const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
      const s = String(sec % 60).padStart(2, "0");
      uptime = `${h}:${m}:${s}`;

      if (sessionEndTime) {
        const remSec = Math.max(0, Math.floor((sessionEndTime - Date.now()) / 1000));
        const rm = String(Math.floor(remSec / 60)).padStart(2, "0");
        const rs = String(remSec % 60).padStart(2, "0");
        remaining = `${rm}:${rs}`;
      }
    }

    const mem = Math.round(process.memoryUsage().rss / (1024 * 1024));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: serverStatus,
        targetPath: activeTargetDir,
        uptime,
        remaining,
        durationMinutes,
        ram: mem,
        latency: lastPingLatency,
        httpsUrl: customHttpsUrl,
        logs,
      })
    );
  } else if (urlObj.pathname === "/api/start" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body || "{}");
        startServer(parsed.targetPath || activeTargetDir);
      } catch (e) {
        startServer(activeTargetDir);
      }
      res.writeHead(200);
      res.end("OK");
    });
  } else if (urlObj.pathname === "/api/stop" && req.method === "POST") {
    stopServer();
    res.writeHead(200);
    res.end("OK");
  } else if (urlObj.pathname === "/api/tunnel/start" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      let alias = "";
      try { alias = JSON.parse(body || "{}").alias || ""; } catch(e){}
      startHttpsTunnel(alias);
      res.writeHead(200);
      res.end("OK");
    });
  } else if (urlObj.pathname === "/api/tunnel/stop" && req.method === "POST") {
    stopHttpsTunnel();
    res.writeHead(200);
    res.end("OK");
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  addLog(`Multi-Web Hosting Manager active at http://localhost:${PORT}`, "success");
  startServer(activeTargetDir);
});
