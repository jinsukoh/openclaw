import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as child_process from 'child_process';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let serverProcess: child_process.ChildProcess | null = null;

const isDev = !app.isPackaged;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: path.join(__dirname, '../../apps/macos/Sources/OpenClaw/Resources/OpenClaw.icns'), // Fallback for dev
    });

    // In production, we serve the static files or load the URL from the backend
    // For OpenClaw, the backend serves the UI at a specific port (usually determined by config or default)
    const uiUrl = 'http://localhost:3000'; // Default port, might need to parse output or config

    console.log('Loading UI from:', uiUrl);
    mainWindow.loadURL(uiUrl).catch((e) => {
        console.log('Failed to load UI, retrying in 1s...', e);
        setTimeout(() => mainWindow?.loadURL(uiUrl), 1000);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startBackend() {
    const root = app.getAppPath();

    // Locate the backend entry point
    // In dev: ../../dist/index.js (relative to apps/windows/src) -> resolved from __dirname
    // In prod: located in build resources

    let backendPath = '';

    if (isDev) {
        backendPath = path.join(root, '../../dist/index.js');
    } else {
        // In the packed app, files from ../../dist are copied.
        // Based on package.json files configuration, they might be at the root of resources/app or strictly mapped.
        // If mapped as ../../dist, electron-builder usually collapses the relative path or keeps directory structure.
        // Let's assume we search for it.

        // We'll try a few common locations
        const candidates = [
            path.join(root, 'dist/index.js'),            // flattened
            path.join(root, '../../dist/index.js'),      // relative preserved
            path.join(process.resourcesPath, 'dist/index.js') // extraResources
        ];

        // In our package.json, we included "../../dist/**/*". 
        // Electron builder usually puts files relative to the project root (apps/windows).
        // So "../../dist" implies it might try to put it outside? No, that's unsafe.
        // It likely puts it in a folder named 'dist' at the app root if we are lucky, 
        // or we should be explicit and copy it in a pre-build step.

        // For safety in this plan, let's assume we will copy files into `apps/windows/backend` 
        // during the GitHub Action BEFORE packing. 
        // That's more reliable than relying on relative path inclusion in 'files'.

        // Changing strategy slightly: The GH action will copy `dist` -> `apps/windows/backend/dist`
        // and `ui/dist` -> `apps/windows/backend/ui/dist`.

        backendPath = path.join(root, 'backend/dist/index.js');
    }

    console.log('Starting backend from:', backendPath);

    if (!fs.existsSync(backendPath)) {
        console.error('Backend entry point not found:', backendPath);
        // Fallback for current layout without copy (if we use file inclusion)
        // If electron-builder keeps the structure relative to project root 'apps/windows'
        // "../../dist" files usually end up in the root if we use 'from' or strict patterns.
        // Let's assume standard behavior:
        // If we use `files: ["../../dist"]` it might error or put it in `dist`.
        // Let's rely on the pre-build copy step in GH Action.
        return;
    }

    // Pass through arguments from the CLI
    // In dev: [electron binary, main script, ...args]
    // In prod: [executable, ...args]
    const args = isDev ? process.argv.slice(2) : process.argv.slice(1);

    serverProcess = child_process.fork(backendPath, args, {
        env: { ...process.env, OPENCLAW_IS_ELECTRON: '1' },
        stdio: ['inherit', 'pipe', 'pipe', 'ipc'], // Inherit stdin for interactive prompts
    });

    serverProcess.stdout?.on('data', (data) => console.log(`Backend: ${data}`));
    serverProcess.stderr?.on('data', (data) => console.error(`Backend Error: ${data}`));

    serverProcess.on('exit', (code) => {
        console.log(`Backend process exited with code ${code}`);
    });
}

app.on('ready', () => {
    startBackend();
    // Wait a moment for backend to listen? Or just poll.
    setTimeout(createWindow, 2000);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
