import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

function syncVersion() {
  const rootPkgPath = path.join(rootDir, 'package.json');
  const workerPkgPath = path.join(rootDir, 'worker', 'package.json');
  const workerIndexPath = path.join(rootDir, 'worker', 'src', 'index.ts');

  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
  const version = rootPkg.version;

  console.log(`Syncing version ${version} across the project...`);

  // 1. Sync worker/package.json
  if (fs.existsSync(workerPkgPath)) {
    const workerPkg = JSON.parse(fs.readFileSync(workerPkgPath, 'utf8'));
    workerPkg.version = version;
    fs.writeFileSync(workerPkgPath, JSON.stringify(workerPkg, null, 2) + '\n');
    console.log(`- Updated worker/package.json to ${version}`);
  }

  // 2. Sync worker/src/index.ts comment
  if (fs.existsSync(workerIndexPath)) {
    let content = fs.readFileSync(workerIndexPath, 'utf8');
    const updatedContent = content.replace(
      /WUEM Sim Intel Worker - v\d+\.\d+\.\d+/,
      `WUEM Sim Intel Worker - v${version}`
    );
    if (content !== updatedContent) {
      fs.writeFileSync(workerIndexPath, updatedContent);
      console.log(`- Updated worker/src/index.ts comment to v${version}`);
    }
  }
  
  console.log('✓ Project versions synchronized.');
}

syncVersion();
