const fs = require('fs');
const path = require('path');

const scriptName = process.argv[2];

if (!scriptName) {
	console.error('Usage: npm run create <script-name>');
	process.exit(1);
}

const scriptDir = path.join(__dirname, 'src', 'scripts', scriptName);
const mainTsPath = path.join(scriptDir, 'main.ts');
const tsConfigPath = path.join(scriptDir, 'tsconfig.json');

if (!fs.existsSync(scriptDir)) {
	fs.mkdirSync(scriptDir, { recursive: true });
}

if (!fs.existsSync(mainTsPath)) {
	const template = `// ComputerCraft Script: ${scriptName}
// Write your code here...
print("Hello from ${scriptName}!");
`;
	fs.writeFileSync(mainTsPath, template);
	console.log(`✓ Created ${mainTsPath}`);
}

if (!fs.existsSync(tsConfigPath)) {
	const tsConfig = {
		extends: '../../../tsconfig.base.json',
		compilerOptions: {
			rootDir: '../../../..'
		},
		tstl: {
			luaBundle: `../../../dist/${scriptName}.lua`,
			luaBundleEntry: './main.ts'
		},
		include: ['./**/*', '../../shared/**/*', '../../../../common/**/*']
	};
	fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
	console.log(`✓ Created ${tsConfigPath}`);
}

console.log(`\nScript "${scriptName}" successfully initialized! Run "npm run build" to compile.`);
