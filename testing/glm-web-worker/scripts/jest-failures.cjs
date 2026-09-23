// Usage: node jest-failures.cjs <jest-json> <path-substring>
// Prints failed assertion titles + first lines of each failure message.
const fs = require("fs");
const r = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const sub = process.argv[3];
for (const t of r.testResults) {
    const name = t.name.split(String.fromCharCode(92)).join("/");
    if (!name.includes(sub)) continue;
    console.log(`## ${name.replace(/.*\/frontend\//, "")} [${t.status}]`);
    if (t.message && t.assertionResults.every((a) => a.status !== "failed")) {
        console.log("  suite error:", t.message.split("\n").slice(0, 8).join("\n  "));
    }
    for (const a of t.assertionResults.filter((x) => x.status === "failed")) {
        console.log(`  x ${a.fullName}`);
        const msg = (a.failureMessages[0] || "").replace(/\[[0-9;]*m/g, "");
        console.log("    " + msg.split("\n").slice(0, 6).join("\n    "));
    }
}
