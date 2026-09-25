import { applyEffectSizePowerColumns } from "@/components/Modals/Analyze/general-linear-model/shared/effect-size-columns";
import type { ResultJson } from "@/types/Table";

const make = (): ResultJson => ({
    tables: [
        {
            key: "multivariate_tests",
            title: "Multivariate Tests",
            columnHeaders: [
                { header: "Effect", key: "effect" },
                { header: "F", key: "f" },
                { header: "Partial Eta Squared", key: "partial_eta_squared" },
                { header: "Noncent. Parameter", key: "noncent_parameter" },
                { header: "Observed Power", key: "observed_power" },
            ],
            rows: [{ rowHeader: [], effect: "jk", f: "1.1000", partial_eta_squared: "0.0022", noncent_parameter: "3.3000", observed_power: "0.2991" }],
        },
        {
            key: "rm",
            title: "Tests of Within-Subjects Effects",
            columnHeaders: [
                { header: "Source", key: "source" },
                { header: "Stats", children: [{ header: "F", key: "f" }, { header: "Partial Eta Squared", key: "eta2" }, { header: "Observed Power", key: "power" }] },
            ],
            rows: [{ rowHeader: [], source: "sesi", f: "11.4070", eta2: "0.4320", power: "0.9900" }],
        },
    ],
});

describe("applyEffectSizePowerColumns", () => {
    it("drops all three columns when neither option is checked (SPSS default)", () => {
        const r = applyEffectSizePowerColumns(make(), { effectSize: false, observedPower: false });
        expect(r.tables[0].columnHeaders.map((h) => h.key)).toEqual(["effect", "f"]);
        expect(Object.keys(r.tables[0].rows[0])).toEqual(["rowHeader", "effect", "f"]);
        expect(r.tables[1].columnHeaders[1].children!.map((h) => h.key)).toEqual(["f"]);
        expect(r.tables[1].rows[0]).toEqual({ rowHeader: [], source: "sesi", f: "11.4070" });
    });

    it("keeps Partial Eta Squared only with Estimates of effect size", () => {
        const r = applyEffectSizePowerColumns(make(), { effectSize: true, observedPower: false });
        expect(r.tables[0].columnHeaders.map((h) => h.key)).toEqual(["effect", "f", "partial_eta_squared"]);
        expect(r.tables[1].columnHeaders[1].children!.map((h) => h.key)).toEqual(["f", "eta2"]);
    });

    it("keeps Noncent. Parameter and Observed Power only with Observed power", () => {
        const r = applyEffectSizePowerColumns(make(), { effectSize: false, observedPower: true });
        expect(r.tables[0].columnHeaders.map((h) => h.key)).toEqual(["effect", "f", "noncent_parameter", "observed_power"]);
        expect(r.tables[1].rows[0]).toEqual({ rowHeader: [], source: "sesi", f: "11.4070", power: "0.9900" });
    });

    it("keeps every column when both options are checked", () => {
        const r = applyEffectSizePowerColumns(make(), { effectSize: true, observedPower: true });
        expect(r).toEqual(make());
    });
});
