const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const scriptsDir = path.join(__dirname, 'src', 'scripts');
const distDir = path.join(__dirname, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Function to auto-generate tsconfig.json if missing
function ensureTsConfig(scriptName, scriptDirPath) {
  const tsConfigPath = path.join(scriptDirPath, 'tsconfig.json');
  if (!fs.existsSync(tsConfigPath)) {
    const tsConfig = {
      extends: "../../../tsconfig.base.json",
      compilerOptions: {
        rootDir: "../../../.."
      },
      tstl: {
        luaBundle: `../../../dist/${scriptName}.lua`,
        luaBundleEntry: "./main.ts"
      },
      include: [
        "./**/*",
        "../../shared/**/*",
        "../../../../common/**/*"
      ]
    };
    fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
    console.log(`[Auto-Config] Generated tsconfig.json for script "${scriptName}"`);
  }
  return tsConfigPath;
}

// Target specific script or build all scripts
const targetScript = process.argv[2];

if (!fs.existsSync(scriptsDir)) {
  console.error('No src/scripts directory found.');
  process.exit(1);
}

const entries = fs.readdirSync(scriptsDir, { withFileTypes: true });
const scriptFolders = entries
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name);

const toBuild = targetScript ? [targetScript] : scriptFolders;

if (toBuild.length === 0) {
  console.log('No scripts found to build.');
  process.exit(0);
}

console.log(`Building CC scripts: ${toBuild.join(', ')}...`);

for (const scriptName of toBuild) {
  const scriptDirPath = path.join(scriptsDir, scriptName);
  if (!fs.existsSync(scriptDirPath)) {
    console.error(`Script directory "${scriptName}" does not exist in src/scripts/`);
    continue;
  }

  const tsConfigPath = ensureTsConfig(scriptName, scriptDirPath);
  
  console.log(`Building ${scriptName}...`);
  try {
    const tstlBin = path.join(__dirname, 'node_modules', '.bin', process.platform === 'win32' ? 'tstl.cmd' : 'tstl');
    const cmd = fs.existsSync(tstlBin) ? `"${tstlBin}" -p "tsconfig.json"` : `npx tstl -p "tsconfig.json"`;
    execSync(cmd, { stdio: 'inherit', cwd: scriptDirPath, shell: true });
    console.log(`✓ Built dist/${scriptName}.lua`);
  } catch (err) {
    console.error(`✕ Failed to build ${scriptName}`);
  }
}
