// serve.mjs — server HTTP statis kecil (stdlib) untuk harness peramban Track E. TIDAK memakai Next.js.
//   /            -> frontend/public  (worker ASLI aplikasi: /workers/Classify/NaiveBayes/..., /workers/Classify/ApplyModel/...)
//   /__stwv/     -> frontend/components/Modals/Transform/StringToWordVector/wasm-output  (glue + wasm STWV yang sama dengan aplikasi)
//   /__perf/     -> HANYA harness.html, harness.js, stwv_bench.worker.js dan data/payloads/*.json
// Header meniru berkas public/ Next.js: "Cache-Control: public, max-age=0" + ETag (revalidasi 304), sehingga wasm tidak diunduh ulang
// dari disk pada tiap Worker baru (perilaku yang sama dengan aplikasi). Payload JSON: "no-store".
// Pemakaian mandiri:  node testing/thesis-eval/perf/serve.mjs [--port 4173]    (Ctrl+C untuk berhenti)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(process.env.STATIFY_REPO_ROOT ?? path.join(HERE, "..", "..", ".."));
const PUBLIC = path.join(REPO, "frontend", "public");
const STWV = path.join(REPO, "frontend", "components", "Modals", "Transform", "StringToWordVector", "wasm-output");
const PERF_FILES = new Set(["harness.html", "harness.js", "stwv_bench.worker.js"]);

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".wasm": "application/wasm", ".css": "text/css; charset=utf-8",
  ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8",
};

function within(root, rel) {
  const p = path.resolve(root, "." + path.posix.normalize("/" + rel));
  return p.startsWith(root + path.sep) || p === root ? p : null;
}

function resolveUrl(pathname) {
  let p;
  try { p = decodeURIComponent(pathname); } catch { return null; }
  if (p.startsWith("/__stwv/")) return { file: within(STWV, p.slice(8)), cache: true };
  if (p.startsWith("/__perf/")) {
    const rel = p.slice(8);
    if (PERF_FILES.has(rel)) return { file: path.join(HERE, rel), cache: false };
    if (/^data\/payloads\/[A-Za-z0-9_.-]+\.json$/.test(rel)) return { file: path.join(HERE, rel), cache: false };
    return null;
  }
  return { file: within(PUBLIC, p === "/" ? "/index.html" : p), cache: true };
}

export function startServer({ port = 0, host = "127.0.0.1", quiet = true } = {}) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    const r = resolveUrl(url.pathname);
    if (!r || !r.file || !fs.existsSync(r.file) || !fs.statSync(r.file).isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404");
      if (!quiet) console.log("404", req.url);
      return;
    }
    const st = fs.statSync(r.file);
    const headers = { "Content-Type": MIME[path.extname(r.file).toLowerCase()] ?? "application/octet-stream" };
    if (r.cache) {
      const etag = `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
      headers["ETag"] = etag;
      headers["Cache-Control"] = "public, max-age=0";
      headers["Last-Modified"] = st.mtime.toUTCString();
      if (req.headers["if-none-match"] === etag) { res.writeHead(304, headers); res.end(); return; }
    } else {
      headers["Cache-Control"] = "no-store";
    }
    headers["Content-Length"] = st.size;
    res.writeHead(200, headers);
    if (req.method === "HEAD") { res.end(); return; }
    fs.createReadStream(r.file).pipe(res);
    if (!quiet) console.log(200, req.url);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve({ server, port: server.address().port, url: `http://${host}:${server.address().port}` }));
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf("--port");
  const { url } = await startServer({ port: i >= 0 ? Number(process.argv[i + 1]) : 4173, quiet: false });
  console.log(`serve.mjs: ${url}/__perf/harness.html   (akar = ${PUBLIC})`);
}
