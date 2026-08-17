import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const assetsDir = path.join(distDir, "assets");
const serverDir = path.join(distDir, "server");
const hostingDir = path.join(distDir, ".openai");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function toRoute(filePath) {
  const relative = path.relative(distDir, filePath).split(path.sep).join("/");
  return `/${relative}`;
}

function contentTypeFor(filePath) {
  return contentTypes[path.extname(filePath)] ?? "application/octet-stream";
}

const files = [path.join(distDir, "index.html"), ...(await listFiles(assetsDir))];
const assets = [];

for (const file of files) {
  const body = await readFile(file, "utf8");
  assets.push({
    path: toRoute(file),
    contentType: contentTypeFor(file),
    body,
  });
}

const indexAsset = assets.find((asset) => asset.path === "/index.html");

await mkdir(serverDir, { recursive: true });
await mkdir(hostingDir, { recursive: true });
await copyFile(path.join(rootDir, ".openai", "hosting.json"), path.join(hostingDir, "hosting.json"));

const workerSource = `const assets = new Map(${JSON.stringify(
  assets.map((asset) => [asset.path, { contentType: asset.contentType, body: asset.body }]),
)});

const indexAsset = ${JSON.stringify(indexAsset)};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const asset = assets.get(url.pathname) ?? (url.pathname === "/" ? assets.get("/index.html") : null);
    const responseAsset = asset ?? indexAsset;

    return new Response(responseAsset.body, {
      headers: {
        "content-type": responseAsset.contentType,
        "cache-control": responseAsset.contentType.startsWith("text/html") ? "no-cache" : "public, max-age=31536000, immutable"
      }
    });
  }
};
`;

await writeFile(path.join(serverDir, "index.js"), workerSource, "utf8");

