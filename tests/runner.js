import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}`;
const MAX_WAIT_MS = 20000; // Increased to 20s for slow setups
const POLL_INTERVAL_MS = 250;

// Helper to check if server is up
function pingServer() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE_URL}/`, (res) => {
      // Any response (200, 404, etc.) means the server is listening
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

// Wait for server to become responsive
async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    const isUp = await pingServer();
    if (isUp) return true;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Server failed to start on port ${PORT} within ${MAX_WAIT_MS}ms`);
}

async function main() {
  console.log('--- Starting Reelist Elite E2E Test Runner ---');
  
  // Set offline-mock variables
  const env = {
    ...process.env,
    PORT: PORT.toString(),
    NODE_ENV: 'test',
    SUPABASE_MOCK: 'true',
    PIPELINE_MOCK: 'true',
    DATABASE_URL: 'sqlite://test.db'
  };

  const isWin = process.platform === 'win32';
  const npmCmd = isWin ? 'npm.cmd' : 'npm';
  
  console.log(`Starting Next.js server on port ${PORT}...`);
  const serverProcess = spawn(npmCmd, ['run', 'dev', '--', '-p', PORT.toString()], {
    env,
    stdio: 'ignore', // Suppress console noise from dev server
    shell: true
  });

  let exitCode = 0;
  try {
    await waitForServer();
    console.log('Server is responsive. Running E2E tests...');

    // Determine target files based on arguments
    const args = process.argv.slice(2);
    let testPath = '';
    
    if (args.includes('--tier1')) testPath = 'tests/tier1';
    else if (args.includes('--tier2')) testPath = 'tests/tier2';
    else if (args.includes('--tier3')) testPath = 'tests/tier3';
    else if (args.includes('--tier4')) testPath = 'tests/tier4';
    else testPath = 'tests';

    // Check if we have vitest installed
    let useVitest = false;
    const pkgPath = path.join(__dirname, '../package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if ((pkg.devDependencies && pkg.devDependencies.vitest) || (pkg.dependencies && pkg.dependencies.vitest)) {
          useVitest = true;
        }
      } catch (err) {
        console.warn('Failed to parse package.json:', err.message);
      }
    }

    let testProcess;
    if (useVitest) {
      console.log(`Running tests via Vitest: npx vitest run ${testPath}`);
      const vitestCmd = isWin ? 'npx.cmd' : 'npx';
      testProcess = spawn(vitestCmd, ['vitest', 'run', testPath], {
        stdio: 'inherit',
        shell: true
      });
    } else {
      const globPattern = testPath === 'tests' ? 'tests/**/*.test.js' : `${testPath}/**/*.test.js`;
      console.log(`Running tests via Node Test Runner: node --test ${globPattern}`);
      testProcess = spawn('node', ['--test', globPattern], {
        stdio: 'inherit',
        shell: true
      });
    }

    exitCode = await new Promise((resolve) => {
      testProcess.on('close', (code) => resolve(code || 0));
    });
    
  } catch (err) {
    console.error('E2E Test Runner Error:', err.message);
    exitCode = 1;
  } finally {
    console.log('Shutting down Next.js server...');
    serverProcess.kill('SIGINT');
    
    // Clean up SQLite/JSON files
    const dbPath = path.join(__dirname, '..', 'test.db');
    if (fs.existsSync(dbPath)) {
      try {
        fs.unlinkSync(dbPath);
        console.log('Cleaned up test database.');
      } catch (e) {
        console.warn('Could not delete test database file:', e.message);
      }
    }
    
    // Cleanup local .data folder if it exists
    const localDbFolder = path.join(__dirname, '..', '.data');
    if (fs.existsSync(localDbFolder)) {
      try {
        const files = fs.readdirSync(localDbFolder);
        for (const file of files) {
          fs.unlinkSync(path.join(localDbFolder, file));
        }
        fs.rmdirSync(localDbFolder);
        console.log('Cleaned up local .data folder.');
      } catch (e) {
        console.warn('Could not clean up .data folder:', e.message);
      }
    }
    
    console.log(`E2E Runner finished with exit code ${exitCode}`);
    process.exit(exitCode);
  }
}

main();
