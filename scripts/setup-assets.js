const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");

const DISCORD_ID = "1135288643070738464";

const COPIES = [
  ["images", "images"],
  ["videos", "videos"],
  ["sfx", "sfx"],
];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    console.warn(`[setup-assets] skip (not found): ${srcDir}`);
    return;
  }
  ensureDir(destDir);
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dest);
    } else if (entry.isFile()) {
      fs.copyFileSync(src, dest);
      console.log(`[setup-assets] ${path.relative(ROOT, src)} -> ${path.relative(ROOT, dest)}`);
    }
  }
}

function updateEnvLocal(discordId) {
  const envPath = path.join(ROOT, ".env.local");
  const key = "NEXT_PUBLIC_DISCORD_ID";
  const line = `${key}=${discordId}`;

  let content = "";
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, "utf8");
  }

  const lines = content.split("\n").filter((l) => !l.startsWith(`${key}=`));
  lines.push(line);
  fs.writeFileSync(envPath, lines.join("\n").replace(/\n+$/, "") + "\n", "utf8");
  console.log(`[setup-assets] discord id -> ${discordId}`);
}

async function main() {
  ensureDir(PUBLIC);
  for (const [srcRel, destRel] of COPIES) {
    copyDir(path.join(ROOT, srcRel), path.join(PUBLIC, destRel));
  }

  updateEnvLocal(DISCORD_ID);

  console.log("[setup-assets] done");
}

main().catch((err) => {
  console.error("[setup-assets] error:", err);
  process.exit(1);
});
