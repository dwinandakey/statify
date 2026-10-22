/**
 * UI helpers for the Discriminant integration tests: test data, opening the real
 * dialog with saved settings, and reading what the user sees afterwards.
 */
import fs from "fs";
import path from "path";
import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { clearFormData, saveFormData } from "@/hooks/useIndexedDB";
import { DiscriminantDefault } from "@/components/Modals/Analyze/Classify/discriminant/constants/discriminant-default";
import type { DiscriminantType } from "@/components/Modals/Analyze/Classify/discriminant/types/discriminant";
import { DiscriminantMain } from "@/components/Modals/Analyze/Classify/discriminant/dialogs/discriminant-main";
import { dataState, recorder, resetRecorder, variableState } from "./harness-state";

// ---- Test data ----------------------------------------------------------------------------
/** Dataset as the Data store holds it (rows of strings) with its variable definitions. */
export type Dataset = { data: string[][]; variables: any[] };

function variable(name: string, columnIndex: number, measure: "scale" | "nominal") {
    return {
        id: columnIndex + 1, columnIndex, name, type: "NUMERIC", width: 8, decimals: 2, label: "",
        values: [], missing: null, columns: 8, align: "right", measure, role: "input",
    };
}

/**
 * Iris (150 cases, species 1–3) with three extra columns:
 * noise = uniform random numbers (no group information), combo = sl + pl (an exact
 * linear combination), sel = selection variable (every 4th case 0, the rest 1).
 */
export function iris(): Dataset {
    const lines = fs.readFileSync(path.join(__dirname, "fixtures", "iris.csv"), "utf8").trim().split(/\r?\n/);
    const names = lines[0].split(",");
    return {
        data: lines.slice(1).map((l) => l.split(",")),
        variables: names.map((n, i) => variable(n, i, n === "species" || n === "sel" ? "nominal" : "scale")),
    };
}

/** Six cases, groups 1 and 2 with three cases each (for Generate Split). */
export function sixCases(): Dataset {
    return {
        data: [["1", "2.1"], ["1", "2.9"], ["1", "3.4"], ["2", "5.0"], ["2", "5.6"], ["2", "6.1"]],
        variables: [variable("grp", 0, "nominal"), variable("x1", 1, "scale")],
    };
}

// ---- Dialog ---------------------------------------------------------------------------------
type Settings = { [K in keyof DiscriminantType]?: Partial<DiscriminantType[K]> };

/**
 * The four iris predictors with grouping variable species, Enter, Summary table.
 * Define Range is left empty: tests enter it through the Define Range panel.
 */
export const BASE: Settings = {
    main: { GroupingVariable: "species", IndependentVariables: ["sl", "sw", "pl", "pw"], Together: true, Stepwise: false, SelectionVariable: null },
    defineRange: { minRange: null, maxRange: null },
    classify: { Summary: true },
};

export function settings(...parts: Settings[]): DiscriminantType {
    const out: any = JSON.parse(JSON.stringify(DiscriminantDefault));
    out.bootstrap.Variables = [];
    out.bootstrap.StrataVariables = [];
    for (const part of parts) {
        for (const [section, fields] of Object.entries(part)) out[section] = { ...out[section], ...fields };
    }
    return out;
}

/**
 * Saves the dialog settings (as a previous session would), opens the real dialog and,
 * when `range` is given, enters Define Range through its panel.
 */
export async function openDialog(dataset: Dataset, config: DiscriminantType, range?: [string, string]) {
    resetRecorder();
    dataState.data = dataset.data;
    variableState.variables = dataset.variables.map((v) => ({ ...v }));
    variableState.error = null;
    await clearFormData("Discriminant");
    await saveFormData("Discriminant", config);
    const user = userEvent.setup();
    render(<DiscriminantMain />);
    // Let the dialog load the saved settings from IndexedDB.
    await act(async () => {
        await new Promise((r) => setTimeout(r, 150));
    });
    if (range) await defineRange(user, range[0], range[1]);
    return user;
}

export const okButton = () => document.getElementById("discriminant-ok-button") as HTMLButtonElement;

/** Clicks OK and waits until the analysis has finished (output, error or nothing to do). */
export async function clickOk(user: ReturnType<typeof userEvent.setup>) {
    await user.click(okButton());
    await waitFor(
        () => {
            const finished = !okButton().textContent?.includes("Analyzing");
            const reacted = recorder.toasts.length > 0 || recorder.statistics.length > 0;
            expect(finished && reacted).toBe(true);
        },
        { timeout: 20000 },
    );
    // handleReply continues with Save and XML after the output is stored.
    await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
    });
}

// ---- What the user sees ------------------------------------------------------------------------
export const outputTitles = () => recorder.statistics.map((s) => s.title);
export const toasts = (type: "success" | "error" | "warning") =>
    recorder.toasts.filter((t) => t.type === type).map((t) => t.message);

// ---- Panels ------------------------------------------------------------------------------------
function inputUnder(label: string): HTMLInputElement {
    return screen.getByText(label).parentElement!.querySelector("input") as HTMLInputElement;
}

export async function defineRange(user: ReturnType<typeof userEvent.setup>, min: string, max: string) {
    await user.click(screen.getByRole("button", { name: "Define Range..." }));
    const minInput = inputUnder("Minimum");
    const maxInput = inputUnder("Maximum");
    await user.clear(minInput);
    if (min) await user.type(minInput, min);
    await user.clear(maxInput);
    if (max) await user.type(maxInput, max);
    await user.click(screen.getByRole("button", { name: "Continue" }));
}

export async function generateSplit(
    user: ReturnType<typeof userEvent.setup>,
    options: { percent?: string; seed?: string; uncheckStratify?: boolean } = {},
) {
    await user.click(screen.getByRole("button", { name: "Generate Split..." }));
    if (options.percent !== undefined) {
        await user.clear(inputUnder("Training (%)"));
        await user.type(inputUnder("Training (%)"), options.percent);
    }
    if (options.seed !== undefined) {
        await user.clear(inputUnder("Seed"));
        await user.type(inputUnder("Seed"), options.seed);
    }
    if (options.uncheckStratify) await user.click(document.getElementById("discriminant-split-stratified")!);
    await user.click(screen.getByRole("button", { name: "Generate" }));
    await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
    });
}

export async function openAssumptionsTab(user: ReturnType<typeof userEvent.setup>) {
    await user.click(document.getElementById("discriminant-assumptions-tab-trigger")!);
}

export const runButton = () => screen.getByRole("button", { name: /Run Assumption Tests|Running/ }) as HTMLButtonElement;
