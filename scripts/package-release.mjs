import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "manifest.json"), "utf8"));
const version = manifest.version;
const releaseDir = path.join(rootDir, "release", version);
const files = ["main.js", "manifest.json", "styles.css"];

fs.rmSync(releaseDir, { recursive: true, force: true });
fs.mkdirSync(releaseDir, { recursive: true });

for (const file of files) {
  const source = path.join(rootDir, file);
  if (!fs.existsSync(source)) {
    fail(`Missing ${file}. Run "npm run build" first.`);
  }
  fs.copyFileSync(source, path.join(releaseDir, file));
}

log(`Release assets staged in ${releaseDir}`);

function log(message) {
  process.stdout.write(`${message}\n`);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
