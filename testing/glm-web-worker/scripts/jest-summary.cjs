// Usage: node jest-summary.cjs <jest-json> <out-failed-list>
const fs = require("fs");
const r = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const norm = (n) => n.split(String.fromCharCode(92)).join("/").replace(/.*\/frontend\//, "");
const failed = r.testResults.filter((t) => t.status !== "passed").map((t) => norm(t.name)).sort();
fs.writeFileSync(process.argv[3], failed.join("\n") + "\n");
console.log({
    suites: r.numTotalTestSuites, failedSuites: r.numFailedTestSuites,
    tests: r.numTotalTests, passed: r.numPassedTests, failed: r.numFailedTests, pending: r.numPendingTests,
});
const glm = r.testResults
    .filter((t) => /general-linear-model/.test(norm(t.name)))
    .map((t) => `${t.status.padEnd(7)} ${norm(t.name)}`)
    .sort();
console.log("GLM suites:\n" + glm.join("\n"));
