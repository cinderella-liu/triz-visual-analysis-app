import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const assetsDir = path.join(distDir, "assets");

const html = await readFile(path.join(distDir, "index.html"), "utf8");
const files = await readdir(assetsDir);
const cssFile = files.find((file) => file.endsWith(".css"));
const jsFile = files.find((file) => file.endsWith(".js"));

if (!cssFile || !jsFile) {
  throw new Error("Missing Vite CSS or JS asset.");
}

const css = await readFile(path.join(assetsDir, cssFile), "utf8");
const js = await readFile(path.join(assetsDir, jsFile), "utf8");

const standalone = html
  .replace(/<script[^>]+src="\/assets\/[^"]+\.js"><\/script>/, `<script type="module">\n${js}\n</script>`)
  .replace(/<link[^>]+href="\/assets\/[^"]+\.css"[^>]*>/, `<style>\n${css}\n</style>`);

await writeFile(path.join(rootDir, "public-preview.html"), standalone, "utf8");

