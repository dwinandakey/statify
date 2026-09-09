/**
 * Checks the model-information XML the Save dialog exports: that it is
 * well-formed, that it carries the numbers a consumer would need to score a new
 * case, and that the file name is sanitized.
 */

import { DiscriminantDefault } from "@/components/Modals/Analyze/Classify/discriminant/constants/discriminant-default";
import {
    buildDiscriminantModelXml,
    normalizeXmlFileName,
    type DiscriminantExportModel,
} from "@/components/Modals/Analyze/Classify/discriminant/services/discriminant-xml-export";

const model: DiscriminantExportModel = {
    canonical_functions: {
        coefficients: [
            { variable: "income", values: [0.5] },
            { variable: "age", values: [-0.25] },
            { variable: "(Constant)", values: [1.75] },
        ],
        standardized_coefficients: [
            { variable: "income", values: [0.8] },
            { variable: "age", values: [-0.4] },
        ],
        function_at_centroids: [
            { group: "1", values: [-1.2] },
            { group: "2", values: [1.2] },
        ],
    },
    classification_function_coefficients: {
        coefficients: [
            { variable: "income", values: [2, 3] },
            { variable: "age", values: [1, 0.5] },
        ],
        constant_terms: [-10, -14],
    },
    prior_probabilities: {
        groups: ["1", "2"],
        prior_probabilities: [0.5, 0.5],
        total: 1,
    },
    eigen_description: {
        functions: ["1"],
        eigenvalue: [1.44],
        variance_percentage: [100],
        cumulative_percentage: [100],
        canonical_correlation: [0.768],
    },
};

const config = {
    ...DiscriminantDefault,
    main: { ...DiscriminantDefault.main, GroupingVariable: "grp" },
    defineRange: { minRange: 1, maxRange: 2 },
};

describe("buildDiscriminantModelXml", () => {
    const xml = buildDiscriminantModelXml(model, config);

    it("produces a document the DOM parser accepts", () => {
        const doc = new DOMParser().parseFromString(xml, "application/xml");
        expect(doc.getElementsByTagName("parsererror").length).toBe(0);
        expect(doc.documentElement.tagName).toBe("DiscriminantModel");
    });

    it("lists only the predictors, keeping the constant out of them", () => {
        const doc = new DOMParser().parseFromString(xml, "application/xml");
        const names = Array.from(doc.querySelectorAll("Predictors > Predictor")).map((n) =>
            n.getAttribute("name"),
        );
        expect(names).toEqual(["income", "age"]);
    });

    it("carries the centroids, priors, and function constant", () => {
        const doc = new DOMParser().parseFromString(xml, "application/xml");

        const groups = Array.from(doc.querySelectorAll("Groups > Group"));
        expect(groups.map((g) => g.getAttribute("label"))).toEqual(["1", "2"]);
        expect(groups.map((g) => g.getAttribute("prior"))).toEqual(["0.5", "0.5"]);
        expect(groups[0].querySelector("Centroid")?.textContent).toBe("-1.2");

        const fn = doc.querySelector("CanonicalDiscriminantFunctions > Function");
        expect(fn?.getAttribute("index")).toBe("1");
        expect(fn?.querySelector("Constant")?.textContent).toBe("1.75");
        expect(fn?.querySelector("Eigenvalue")?.textContent).toBe("1.44");
    });

    it("writes one Fisher classification function per group", () => {
        const doc = new DOMParser().parseFromString(xml, "application/xml");
        const fns = Array.from(doc.querySelectorAll("ClassificationFunction"));
        expect(fns.map((f) => f.getAttribute("group"))).toEqual(["1", "2"]);
        expect(fns[1].querySelector("Constant")?.textContent).toBe("-14");
    });

    it("escapes variable names that would otherwise break the markup", () => {
        const hostile = buildDiscriminantModelXml(model, {
            ...config,
            main: { ...config.main, GroupingVariable: `a<b & "c"` },
        });
        const doc = new DOMParser().parseFromString(hostile, "application/xml");
        expect(doc.getElementsByTagName("parsererror").length).toBe(0);
        expect(doc.querySelector("GroupingVariable")?.textContent).toBe(`a<b & "c"`);
    });
});

describe("normalizeXmlFileName", () => {
    it("falls back to a default when nothing is typed", () => {
        expect(normalizeXmlFileName(null)).toBe("discriminant_model.xml");
        expect(normalizeXmlFileName("   ")).toBe("discriminant_model.xml");
    });

    it("appends the extension only when it is missing", () => {
        expect(normalizeXmlFileName("model")).toBe("model.xml");
        expect(normalizeXmlFileName("model.xml")).toBe("model.xml");
        expect(normalizeXmlFileName("MODEL.XML")).toBe("MODEL.XML");
    });

    it("strips path separators and characters a file system would reject", () => {
        expect(normalizeXmlFileName("C:\\tmp\\my model?.xml")).toBe("C__tmp_my model_.xml");
    });
});
