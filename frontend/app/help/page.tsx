"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    GettingStarted,
    FAQ,
    HelpContent,
    StatisticsGuide,
    FileGuide,
    type SectionItem,
} from "@/app/help/components";
import {
    DataGuide
} from "@/app/help/components/data-guide";
import { useHelpLanguageStore } from "@/stores/useHelpLanguageStore";

export default function HelpPage() {
    const { language } = useHelpLanguageStore();
    const isEn = language === 'en';
    const [selected, setSelected] = useState("getting-started");
    const [search, setSearch] = useState("");
    const [activeChild, setActiveChild] = useState<string | null>(null);
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set(["statistics-guide"]));
    const [mounted, setMounted] = useState(false);

    // For mounting animation
    useEffect(() => {
        setMounted(true);
    }, []);
    //  SECTIONS DATA
    const sectionsData: SectionItem[] = useMemo(() => ([
        {
            key: "getting-started",
            label: isEn ? "Getting Started" : "Memulai",
            content: <GettingStarted />,
        },
        {
            key: "file-guide",
            label: isEn ? "File Management" : "Manajemen File",
            content: <FileGuide section={activeChild ?? undefined} />,
            children: [
                { key: "import-sav", label: isEn ? "Import .sav" : "Impor .sav", parentKey: "file-guide", childContent: "import-sav" },
                { key: "import-csv", label: isEn ? "Import CSV" : "Impor CSV", parentKey: "file-guide", childContent: "import-csv" },
                { key: "import-excel", label: isEn ? "Import Excel" : "Impor Excel", parentKey: "file-guide", childContent: "import-excel" },
                { key: "import-clipboard", label: isEn ? "Import from Clipboard" : "Impor dari Clipboard", parentKey: "file-guide", childContent: "import-clipboard" },
                { key: "export-csv", label: isEn ? "Export CSV" : "Ekspor CSV", parentKey: "file-guide", childContent: "export-csv" },
                { key: "export-excel", label: isEn ? "Export Excel" : "Ekspor Excel", parentKey: "file-guide", childContent: "export-excel" },
                { key: "example-data", label: isEn ? "Example Data" : "Data Contoh", parentKey: "file-guide", childContent: "example-data" },
                { key: "print", label: isEn ? "Print" : "Cetak", parentKey: "file-guide", childContent: "print" },
            ],
        },
        {
            key: "data-guide",
            label: isEn ? "Data Management" : "Manajemen Data",
            content: <DataGuide section={activeChild ?? undefined} />,
            children: [
                { key: "aggregate", label: "Aggregate", parentKey: "data-guide", childContent: "aggregate" },
                { key: "define-datetime", label: "Define Date and Time", parentKey: "data-guide", childContent: "define-datetime" },
                { key: "define-var-props", label: "Define Variable Properties", parentKey: "data-guide", childContent: "define-var-props" },
                { key: "duplicate-cases", label: "Identify Duplicate Cases", parentKey: "data-guide", childContent: "duplicate-cases" },
                { key: "restructure", label: "Restructure", parentKey: "data-guide", childContent: "restructure" },
                { key: "select-cases", label: "Select Cases", parentKey: "data-guide", childContent: "select-cases" },
                { key: "set-measurement-level", label: "Set Measurement Level", parentKey: "data-guide", childContent: "set-measurement-level" },
                { key: "sort-cases", label: "Sort Cases", parentKey: "data-guide", childContent: "sort-cases" },
                { key: "sort-vars", label: "Sort Variables", parentKey: "data-guide", childContent: "sort-vars" },
                { key: "weight-cases", label: "Weight Cases", parentKey: "data-guide", childContent: "weight-cases" },
            ],
        },
        {
            key: "statistics-guide",
            label: isEn ? "Statistics Guide" : "Panduan Statistik",
            content: <StatisticsGuide section={activeChild ?? undefined} />,
            children: [
                { key: "frequencies", label: "Frequencies", parentKey: "statistics-guide", childContent: "frequencies" },
                { key: "descriptives", label: "Descriptives", parentKey: "statistics-guide", childContent: "descriptives" },
                { key: "explore", label: "Explore", parentKey: "statistics-guide", childContent: "explore" },
                { key: "linear", label: "Linear Regression", parentKey: "statistics-guide", childContent: "linear" },
                { key: "binary-logistic", label: "Binary Logistic Regression", parentKey: "statistics-guide", childContent: "binary-logistic" },
                { key: "ordinal-regression", label: "Ordinal Regression", parentKey: "statistics-guide", childContent: "ordinal-regression" },
                { key: "multinomial-logistic", label: "Multinomial Logistic Regression", parentKey: "statistics-guide", childContent: "multinomial-logistic" },
                { key: "crosstabs", label: "Crosstabs", parentKey: "statistics-guide", childContent: "crosstabs" },
                { key: "smoothing", label: "Smoothing", parentKey: "statistics-guide", childContent: "smoothing" },
                { key: "decomposition", label: "Decomposition", parentKey: "statistics-guide", childContent: "decomposition" },
                { key: "autocorrelation", label: "Autocorrelation", parentKey: "statistics-guide", childContent: "autocorrelation" },
                { key: "unit-root-test", label: "Unit Root Test", parentKey: "statistics-guide", childContent: "unit-root-test" },
                { key: "box-jenkins-model", label: "Box-Jenkins Model", parentKey: "statistics-guide", childContent: "box-jenkins-model" },
                { key: "factor-analysis", label: "Factor Analysis", parentKey: "statistics-guide", childContent: "factor-analysis" },
                { key: "homoscedasticity-test", label: "Homoscedasticity Test (ARCH-LM)", parentKey: "statistics-guide", childContent: "homoscedasticity-test" },
                { key: "heteroscedasticity", label: "Heteroscedasticity Models (ARCH/GARCH)", parentKey: "statistics-guide", childContent: "heteroscedasticity" },
                { key: "ardl", label: "ARDL", parentKey: "statistics-guide", childContent: "ardl" },
                { key: "ecm", label: "ECM (Error Correction Model)", parentKey: "statistics-guide", childContent: "ecm" },
                { key: "k-means", label: "K-Means Clustering", parentKey: "statistics-guide", childContent: "k-means" },
                { key: "k-medoids", label: "K-Medoids Clustering", parentKey: "statistics-guide", childContent: "k-medoids" },
                { key: "discriminant", label: "Discriminant Analysis", parentKey: "statistics-guide", childContent: "discriminant" },
                { key: "univariate", label: "GLM Univariate", parentKey: "statistics-guide", childContent: "univariate" },
                { key: "univariate-design-matrix", label: "GLM Univariate: Design Matrix", parentKey: "statistics-guide", childContent: "univariate-design-matrix" },
                { key: "univariate-contrast-factors", label: "GLM Univariate: Contrast Factors", parentKey: "statistics-guide", childContent: "univariate-contrast-factors" },
                { key: "univariate-heteroscedasticity-tests", label: "GLM Univariate: Heteroscedasticity Tests", parentKey: "statistics-guide", childContent: "univariate-heteroscedasticity-tests" },
                { key: "univariate-lack-of-fit-tests", label: "GLM Univariate: Lack of Fit Tests", parentKey: "statistics-guide", childContent: "univariate-lack-of-fit-tests" },
                { key: "univariate-sum-of-squares", label: "GLM Univariate: Sum of Squares", parentKey: "statistics-guide", childContent: "univariate-sum-of-squares" },
                { key: "univariate-emmeans", label: "GLM Univariate: EM Means", parentKey: "statistics-guide", childContent: "univariate-emmeans" },
                { key: "univariate-parameter-estimates", label: "GLM Univariate: Parameter Estimates", parentKey: "statistics-guide", childContent: "univariate-parameter-estimates" },
                { key: "univariate-levenes-test", label: "GLM Univariate: Levene's Test", parentKey: "statistics-guide", childContent: "univariate-levenes-test" },
                { key: "multivariate", label: "GLM Multivariate", parentKey: "statistics-guide", childContent: "multivariate" },
                { key: "repeated-measures", label: "GLM Repeated Measures", parentKey: "statistics-guide", childContent: "repeated-measures" },
            ],
        },
        {
            key: "faq",
            label: isEn ? "FAQs" : "FAQ",
            content: <FAQ />,
        },
    ]), [activeChild, isEn]);
    // ------------------ END SECTIONS DATA ------------------

    // Sync in-page navigation with URL hash: /help#<parentKey>:<childKey?>
    const applyHash = useCallback(() => {
        if (typeof window === 'undefined') return;
        const hash = window.location.hash.replace(/^#/, "");
        if (!hash) return;
        const [parentKey, maybeChild] = hash.split(":");
        // ignore unknown sections (e.g. old #feedback links) and keep the current one
        if (!parentKey || !sectionsData.some(s => s.key === parentKey)) return;
        // set selected only if changed
        setSelected((prev) => (prev !== parentKey ? parentKey : prev));
        // expand the parent
        setExpandedKeys((prev) => {
            if (prev.has(parentKey)) return prev;
            const next = new Set(prev);
            next.add(parentKey);
            return next;
        });
        // validate and set child if present
        if (maybeChild) {
            const parent = sectionsData.find(s => s.key === parentKey);
            const isValidChild = !!parent?.children?.some(c => c.key === maybeChild);
            setActiveChild((prev) => (isValidChild ? (prev !== maybeChild ? maybeChild : prev) : (prev !== null ? null : prev)));
        } else {
            setActiveChild((prev) => (prev !== null ? null : prev));
        }
    }, [sectionsData]);

    useEffect(() => {
        // Apply on mount and on hash changes
        applyHash();
        if (typeof window !== 'undefined') {
            window.addEventListener('hashchange', applyHash);
            return () => window.removeEventListener('hashchange', applyHash);
        }
    }, [applyHash]);

    const searchLower =
        typeof search === "string" && typeof search.toLowerCase === "function"
            ? search.toLowerCase()
            : "";

    const filteredSectionsResult = sectionsData.filter(
        (s) =>
            s.label.toLowerCase().includes(searchLower) ??
            s.children?.some(
                    (child) =>
                        child.label.toLowerCase().includes(searchLower) ??
                        child.children?.some((subchild) =>
                            subchild.label.toLowerCase().includes(searchLower)
                        )
                )
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);

        // If the current selected section isn't in the search results,
        // select the first result automatically
        if (
            e.target.value &&
            filteredSectionsResult.length > 0 &&
            !filteredSectionsResult.some((s) => s.key === selected)
        ) {
            setSelected(filteredSectionsResult[0].key);
            setActiveChild(null);
        }
    };

    const handleSectionSelect = (key: string) => {
        const findItem = (
            items: SectionItem[],
            k: string
        ): SectionItem | undefined => {
            for (const item of items) {
                if (item.key === k) return item;
                if (item.children) {
                    const found = findItem(item.children, k);
                    if (found) return found;
                }
            }
        };

        const item = findItem(sectionsData, key);
        if (!item) return;

        if (item.children && item.children.length > 0) {
            // It's a parent item, toggle its expansion
            setExpandedKeys((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(key)) {
                    newSet.delete(key);
                } else {
                    newSet.add(key);
                }
                return newSet;
            });
            // If it's a top-level item, also select it to show its main content
            if (!item.parentKey) {
                setSelected(item.key);
                setActiveChild(null);
                // update hash to parent only
                if (typeof window !== 'undefined') {
                    window.history.replaceState(null, '', `#${item.key}`);
                }
            }
        } else {
            // It's a leaf item, set it as active
            setActiveChild(key);

            // Find the top-level parent and set it as selected
            let parentKey = item.parentKey;
            let topLevelKey = item.key; // Default to self if no parent

            // Make sure all parent sections are expanded
            if (parentKey) {
                const newExpandedKeys = new Set(expandedKeys);
                while (parentKey) {
                    newExpandedKeys.add(parentKey);
                    const parent = sectionsData.find(s => s.key === parentKey);
                    if (parent) {
                        topLevelKey = parent.key;
                        parentKey = parent.parentKey;
                    } else {
                        break;
                    }
                }
                setExpandedKeys(newExpandedKeys);
            }

            setSelected(topLevelKey);
            // update hash to parent:child
            if (typeof window !== 'undefined') {
                window.history.replaceState(null, '', `#${topLevelKey}:${key}`);
            }
        }
    };

    const sectionsToDisplayInSidebar = search ? filteredSectionsResult : sectionsData;

    return (
        <div
            className={`bg-background h-screen overflow-hidden transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        >
            <HelpContent
                sections={sectionsData}
                selectedSectionKey={selected}
                activeChildKey={activeChild}
                onSectionSelect={handleSectionSelect}
                searchValue={search}
                onSearchChange={handleSearchChange}
                displaySections={sectionsToDisplayInSidebar}
                expandedKeys={expandedKeys}
            />
        </div>
    );
}
