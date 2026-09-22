"use client";
// SPIKE PAGE (compare_web_workers.md §3.5). Copy this whole folder to frontend/app/glm-worker-spike/
// only while running the spike, then delete the copy (see ../README.md).
import { useEffect, useState } from "react";
import {
    runSpike,
    type SpikeOutcome,
} from "./spike-client";

export default function GlmWorkerSpikePage() {
    const [outcomes, setOutcomes] = useState<SpikeOutcome[] | null>(null);

    useEffect(() => {
        (async () => {
            const a = await runSpike("dotworker");
            const b = await runSpike("plain");
            const all = [a, b];
            (window as unknown as { __spike: SpikeOutcome[] }).__spike = all;
            setOutcomes(all);
        })();
    }, []);

    return (
        <pre id="spike-result" data-done={outcomes ? "1" : "0"}>
            {outcomes ? JSON.stringify(outcomes, null, 2) : "running..."}
        </pre>
    );
}
