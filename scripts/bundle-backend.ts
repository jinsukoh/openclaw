
import * as esbuild from "esbuild";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, "..");
const entryPoint = path.join(projectRoot, "src/index.ts");
const outDir = path.join(projectRoot, "apps/windows/backend/dist");
const outFile = path.join(outDir, "index.js");

// Ensure output directory exists
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

async function bundle() {
    console.log("Bundling backend for Windows...");

    try {
        await esbuild.build({
            entryPoints: [entryPoint],
            outfile: outFile,
            bundle: true,
            platform: "node",
            target: "node22", // Matching the node version in CI
            format: "esm",    // Output as ESM
            external: [
                // Mark native modules and things we want to install separately as external
                "electron",
                "better-sqlite3",
                "sqlite-vec",
                "sharp",
                "@lydell/node-pty",
                "@napi-rs/canvas",
                "fsevents",
                "node-llama-cpp",
                "playwright-core"
            ],
            sourcemap: true,
            logLevel: "info",
            banner: {
                js: "import { createRequire as _createRequire } from 'module'; const require = _createRequire(import.meta.url);",
            },
        });
        console.log(`Backend bundled successfully to: ${outFile}`);

        // Copy extensions directory
        const extensionsDir = path.join(projectRoot, "extensions");
        const outExtensionsDir = path.join(outDir, "../extensions"); // sibling to dist, e.g. apps/windows/backend/extensions

        if (fs.existsSync(extensionsDir)) {
            console.log(`Copying extensions from ${extensionsDir} to ${outExtensionsDir}...`);
            // fs.cpSync was added in Node 16.7.0
            fs.cpSync(extensionsDir, outExtensionsDir, { recursive: true });
            console.log("Extensions copied successfully.");
        } else {
            console.warn(`Warning: Extensions directory not found at ${extensionsDir}`);
        }
    } catch (e) {
        console.error("Bundling failed:", e);
        process.exit(1);
    }
}

bundle();
