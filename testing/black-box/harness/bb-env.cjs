// Lingkungan eksekusi black-box yang dicatat di setiap berkas hasil
// (iterasi 3 dst.): BUILD_ID berkas frontend/.next dan BUILD_ID yang dilayani
// server (dibaca dari HTML; harness berhenti bila berbeda), serta nama dan md5
// berkas WASM MV dan RM di .next/static/media yang sama dengan rust/pkg.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const REPO = path.resolve(__dirname, "../../..");
const md5 = (f) => crypto.createHash("md5").update(fs.readFileSync(f)).digest("hex");

function wasmOfBuild() {
    const media = path.join(REPO, "frontend/.next/static/media");
    const glm = "frontend/components/Modals/Analyze/general-linear-model";
    const out = {};
    for (const [key, dir] of [["mv", "multivariate"], ["rm", "repeated-measures"]]) {
        const want = md5(path.join(REPO, glm, dir, "rust/pkg/wasm_bg.wasm"));
        const hit = fs.readdirSync(media).find((f) => f.endsWith(".wasm") && md5(path.join(media, f)) === want);
        out[key] = { file: hit ?? null, md5: want };
    }
    return out;
}

async function buildEnv(base) {
    const buildIdFile = fs.readFileSync(path.join(REPO, "frontend/.next/BUILD_ID"), "utf8").trim();
    const html = await (await fetch(`${base}/dashboard/data`)).text();
    // App Router: BUILD_ID ada di payload RSC HTML sebagai \"b\":\"<BUILD_ID>\".
    const buildIdServed = html.match(/\\?"b\\?":\\?"([A-Za-z0-9_-]+)/)?.[1] ?? null;
    if (buildIdServed !== buildIdFile) throw new Error(`BUILD_ID server ${buildIdServed} != berkas ${buildIdFile}`);
    const wasm = wasmOfBuild();
    if (!wasm.mv.file || !wasm.rm.file) throw new Error(`WASM rust/pkg tidak ada di .next/static/media: ${JSON.stringify(wasm)}`);
    return { base, port: new URL(base).port, buildIdFile, buildIdServed, wasm };
}

// Berkas .wasm yang benar-benar diminta halaman (termasuk dari worker bila
// dilaporkan Playwright) selama satu skenario.
function tapWasm(context) {
    const seen = [];
    context.on("request", (r) => {
        const u = r.url();
        if (/\.wasm(\?|$)/.test(u)) seen.push(u.split("/").pop());
    });
    return seen;
}

module.exports = { buildEnv, tapWasm };
