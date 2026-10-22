"use client";
// COMPUTE-ONLY HARNESS (../../README.md, measurement 4). Copied with the two
// timing-probe-*.js files to frontend/app/glm-perf-harness/ of the phase-2 git
// worktree only (setup-worktree.ps1), never into the main working tree.
// Driven by Playwright (run-compute.cjs) through window.__perfHarness.
//
// - load(cell): fetches the payload recorded from the real UI in phase 1
//   (/__perf/payload/<cell>.json, served by Playwright page.route) and keeps it.
// - run(module, cell): posts { id, payload } to the timing probe worker (the
//   unmodified production worker module) exactly as GlmWorkerClient does, and
//   returns the in-worker time (__probe.ms), the postMessage time and the
//   round trip.
//
// Do NOT import a GLM rust/pkg (or a GLM service) here: every GLM package is
// named "wasm@0.1.0" and one extra import can break the frontend type check
// (../../../glm-web-worker/README.md).
import { useEffect, useState } from "react";

type Mod = "multivariate" | "repeated-measures";

const workers: Partial<Record<Mod, Worker>> = {};
const payloads: Record<string, unknown> = {};
let nextId = 0;

function worker(mod: Mod): Worker {
    if (!workers[mod]) {
        workers[mod] = mod === "multivariate"
            ? new Worker(new URL("./timing-probe-mv.js", import.meta.url), { type: "module" })
            : new Worker(new URL("./timing-probe-rm.js", import.meta.url), { type: "module" });
    }
    return workers[mod]!;
}

async function load(cell: string) {
    const text = await (await fetch(`/__perf/payload/${cell}.json`)).text();
    payloads[cell] = JSON.parse(text).payload;
    return { chars: text.length };
}

async function run(mod: Mod, cell: string, keepResults: boolean) {
    const w = worker(mod);
    const id = ++nextId;
    let t1 = 0;
    const t0 = performance.now();
    const reply: any = await new Promise((resolve, reject) => {
        const onMessage = (e: MessageEvent) => {
            if (e.data?.id !== id) return;
            w.removeEventListener("message", onMessage);
            resolve(e.data);
        };
        w.addEventListener("message", onMessage);
        w.addEventListener("error", (e) => reject(new Error(e.message)), { once: true });
        w.postMessage({ id, payload: payloads[cell] });
        t1 = performance.now();
    });
    const t2 = performance.now();
    return {
        ok: reply.ok,
        error: reply.ok ? null : reply.error,
        errors: reply.ok ? reply.errors : null,
        inWorkerMs: reply.__probe?.ms ?? null,
        postMs: t1 - t0,
        roundTripMs: t2 - t0,
        results: keepResults && reply.ok ? JSON.stringify(reply.results) : null,
        resultsChars: reply.ok ? JSON.stringify(reply.results).length : null,
    };
}

export default function GlmPerfHarnessPage() {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        (window as any).__perfHarness = { load, run };
        setReady(true);
    }, []);
    return <div id="harness" data-ready={ready ? "1" : "0"}>GLM compute-only timing harness</div>;
}
