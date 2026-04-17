import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const manifestPath = path.join(rootDir, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const pluginId = manifest.id;

const command = process.argv[2];
const vaultPath = process.env.OBSIDIAN_VAULT_PATH;

if (!vaultPath) {
  fail("Set OBSIDIAN_VAULT_PATH to your test vault root before running this script.");
}

const pluginBaseDir = path.join(vaultPath, ".obsidian", "plugins");
const pluginDir = path.join(pluginBaseDir, pluginId);

switch (command) {
  case "copy":
    copyPlugin();
    break;
  case "link":
    linkPlugin();
    break;
  default:
    fail(`Unknown command: ${command ?? "(none)"}. Use "copy" or "link".`);
}

function copyPlugin() {
  const requiredFiles = ["main.js", "manifest.json", "styles.css"];

  for (const file of requiredFiles) {
    const source = path.join(rootDir, file);
    if (!fs.existsSync(source)) {
      fail(`Missing ${file}. Run "npm run build" first.`);
    }
  }

  ensureDir(pluginBaseDir);

  if (fs.existsSync(pluginDir)) {
    const stat = fs.lstatSync(pluginDir);
    if (stat.isSymbolicLink()) {
      fs.unlinkSync(pluginDir);
    } else if (!stat.isDirectory()) {
      fail(`Target exists and is not a directory: ${pluginDir}`);
    }
  }

  ensureDir(pluginDir);

  for (const file of requiredFiles) {
    fs.copyFileSync(path.join(rootDir, file), path.join(pluginDir, file));
  }

  log(`Installed ${pluginId} into ${pluginDir}`);
}

function linkPlugin() {
  ensureDir(pluginBaseDir);

  if (fs.existsSync(pluginDir)) {
    const stat = fs.lstatSync(pluginDir);
    if (stat.isSymbolicLink()) {
      fs.unlinkSync(pluginDir);
    } else {
      fail(`Refusing to replace a real directory: ${pluginDir}`);
    }
  }

  fs.symlinkSync(rootDir, pluginDir, "dir");
  log(`Linked ${pluginDir} -> ${rootDir}`);
  log('Run "npm run build" once, or "npm run dev" for watch mode.');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function log(message) {
  process.stdout.write(`${message}\n`);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
