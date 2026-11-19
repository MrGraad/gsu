/* Лёгкий локальный HTTP-сервер без сторонних зависимостей. Альтернатива Live Server. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 5500);
const appVersion = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2" };

http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname); }
  catch { res.writeHead(400); res.end("Bad Request"); return; }
  if (pathname.endsWith("/")) pathname += "index.html";
  const target = path.resolve(root, `.${pathname}`);
  if (!target.startsWith(root + path.sep) && target !== root) { res.writeHead(403); res.end("Forbidden"); return; }
  fs.readFile(target, (error, content) => {
    if (error) { res.writeHead(error.code === "ENOENT" ? 404 : 500); res.end(error.code === "ENOENT" ? "Not Found" : "Server Error"); return; }
    res.writeHead(200, { "Content-Type": types[path.extname(target).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(content);
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`\nРасписание v${appVersion} доступно: http://127.0.0.1:${port}`);
  console.log("Остановить сервер: Ctrl+C\n");
});
