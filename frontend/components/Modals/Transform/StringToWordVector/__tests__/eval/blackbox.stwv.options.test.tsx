// Track C1 (Black-box STWV) — BB-04, BB-05, BB-07, BB-08, BB-09, BB-10 sisi antarmuka.
//
// OptionsTab dirender apa adanya (komponen produksi, tanpa mock UI) di dalam pembungkus
// berstatus yang meniru modal: state config + awalan kolom, validateStwvConfig, dan tombol OK
// yang nonaktif bila ada galat. Pengujian memastikan (1) kontrol yang diklik pengguna
// menghasilkan payload Rust (toRustConfig) yang benar, dan (2) pesan validasi + OK nonaktif.
// Sisi KOMPUTASI skenario yang sama diuji di Rust: statify-text-core/tests/eval_blackbox_stwv.rs.

import React from "react";
import fs from "fs";
import path from "path";
import { render, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OptionsTab } from "../../OptionsTab";
import {
    STWV_DEFAULT_CONFIG,
    toRustConfig,
    validateStwvConfig,
    type StwvConfig,
} from "../../config";
import { validateColumnPrefix, DEFAULT_COLUMN_PREFIX } from "../../utils/columnPrefix";
import { INDONESIAN_STOPWORDS } from "../../constants/stopwords";

const REPO_ROOT = path.resolve(__dirname, "../../../../../../../");
const DATA_DIR = path.join(REPO_ROOT, "testing", "text_analytics_eval", "blackbox", "data");

/** Keadaan terakhir pembungkus (dibaca tes setelah interaksi). */
const latest: { config: StwvConfig; prefix: string } = { config: STWV_DEFAULT_CONFIG, prefix: DEFAULT_COLUMN_PREFIX };

/** Pembungkus berstatus: meniru logika validasi + tombol OK pada StringToWordVectorModal. */
const Harness: React.FC = () => {
    const [config, setConfig] = React.useState<StwvConfig>(STWV_DEFAULT_CONFIG);
    const [prefix, setPrefix] = React.useState<string>(DEFAULT_COLUMN_PREFIX);
    latest.config = config;
    latest.prefix = prefix;
    const errors = validateStwvConfig(config);
    const prefixError = validateColumnPrefix(prefix);
    return (
        <div>
            <OptionsTab
                config={config}
                setConfig={setConfig}
                columnPrefix={prefix}
                setColumnPrefix={setPrefix}
                columnPrefixError={prefixError}
            />
            <ul data-testid="validation-errors">
                {errors.map((e) => (
                    <li key={e}>{e}</li>
                ))}
            </ul>
            <button type="button" disabled={errors.length > 0 || prefixError !== null}>
                OK
            </button>
        </div>
    );
};

const byId = (container: HTMLElement, id: string): HTMLElement => {
    const el = container.querySelector<HTMLElement>(`#${id}`);
    if (!el) throw new Error(`Elemen #${id} tidak ditemukan`);
    return el;
};
const isChecked = (el: HTMLElement): boolean => el.getAttribute("aria-checked") === "true";
const okButton = (): HTMLElement => screen.getByRole("button", { name: "OK" });

describe("BB-04 n-gram min=1 max=2 (antarmuka ke payload)", () => {
    it("memilih N-gram lalu max=2 dan min=1 menghasilkan ngram_min=1, ngram_max=2 tanpa galat", async () => {
        const { container } = render(<Harness />);
        // Default: tokenizer Word → payload dipaksa 1..1
        expect(toRustConfig(latest.config).ngram_min).toBe(1);
        expect(toRustConfig(latest.config).ngram_max).toBe(1);

        await userEvent.click(byId(container, "tok-ngram"));
        fireEvent.change(byId(container, "ngram-max"), { target: { value: "2" } });
        fireEvent.change(byId(container, "ngram-min"), { target: { value: "1" } });

        const payload = toRustConfig(latest.config);
        expect(payload.ngram_min).toBe(1);
        expect(payload.ngram_max).toBe(2);
        expect(screen.getByTestId("validation-errors").children).toHaveLength(0);
        expect(okButton()).toBeEnabled();
    });
});

describe("BB-05 n-gram tidak sah (antarmuka)", () => {
    it("min lebih besar dari max menampilkan pesan dan menonaktifkan OK", async () => {
        const { container } = render(<Harness />);
        await userEvent.click(byId(container, "tok-ngram"));
        fireEvent.change(byId(container, "ngram-max"), { target: { value: "2" } });
        fireEvent.change(byId(container, "ngram-min"), { target: { value: "3" } });

        expect(screen.getByText("N-gram min size cannot be greater than max size.")).toBeInTheDocument();
        expect(okButton()).toBeDisabled();
    });

    it("max di atas 5 dipotong (clamp) menjadi 5 oleh kolom isian sehingga tidak ada pesan", async () => {
        const { container } = render(<Harness />);
        await userEvent.click(byId(container, "tok-ngram"));
        fireEvent.change(byId(container, "ngram-max"), { target: { value: "6" } });

        expect(latest.config.tokenizer.maxSize).toBe(5);
        expect((byId(container, "ngram-max") as HTMLInputElement).value).toBe("5");
        expect(screen.getByTestId("validation-errors").children).toHaveLength(0);
        expect(okButton()).toBeEnabled();
    });

    it("validateStwvConfig menolak ukuran n-gram 6 (jaring pengaman bila clamp terlewati)", () => {
        const cfg: StwvConfig = {
            ...STWV_DEFAULT_CONFIG,
            tokenizer: { type: "ngram", minSize: 1, maxSize: 6 },
        };
        expect(validateStwvConfig(cfg)).toEqual(["N-gram min and max sizes must be whole numbers between 1 and 5."]);
    });
});

describe("BB-07 stopwords Indonesian lalu Custom (antarmuka ke payload)", () => {
    it("Indonesian mengirim stopwords_method=indonesian dan seluruh daftar bawaan sebagai JSON", async () => {
        const { container } = render(<Harness />);
        expect(toRustConfig(latest.config).stopwords_method).toBe("none");
        expect(toRustConfig(latest.config).custom_stopwords).toBeNull();

        await userEvent.click(byId(container, "sw-id"));
        const payload = toRustConfig(latest.config);
        expect(payload.stopwords_method).toBe("indonesian");
        expect(payload.custom_stopwords).toBe(JSON.stringify(INDONESIAN_STOPWORDS));
        const sent: string[] = JSON.parse(payload.custom_stopwords ?? "[]");
        expect(sent).toContain("saya");
        expect(sent).toContain("tidak");
        expect(sent).not.toContain("suka");

        // Daftar yang tampil di kotak teks = daftar bawaan
        const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
        expect(textarea.value.split("\n")).toEqual(INDONESIAN_STOPWORDS);
    });

    it("berkas acuan Rust c1_stopwords_indonesian.json identik dengan daftar bawaan aplikasi", () => {
        const file = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "c1_stopwords_indonesian.json"), "utf-8"));
        expect(file).toEqual(INDONESIAN_STOPWORDS);
    });

    it("Custom dengan daftar yang diketik mengirim array JSON (dipangkas, tanpa baris kosong)", async () => {
        const { container } = render(<Harness />);
        await userEvent.click(byId(container, "sw-custom"));
        const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: "suka\n  nasi  \n\n" } });

        const payload = toRustConfig(latest.config);
        expect(payload.stopwords_method).toBe("custom");
        expect(payload.custom_stopwords).toBe('["suka","nasi"]');
    });

    it("mengetik di kotak teks saat Indonesian terpilih otomatis berpindah ke Custom", async () => {
        const { container } = render(<Harness />);
        await userEvent.click(byId(container, "sw-id"));
        const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: "saya" } });
        expect(latest.config.stopwords.method).toBe("custom");
        expect(toRustConfig(latest.config).custom_stopwords).toBe('["saya"]');
        expect(isChecked(byId(container, "sw-custom"))).toBe(true);
    });
});

describe("BB-08 stemming Sastrawi dan Porter (antarmuka ke payload)", () => {
    it("Indonesian (Sastrawi) mengirim stemming_method=indonesian", async () => {
        const { container } = render(<Harness />);
        expect(toRustConfig(latest.config).stemming_method).toBe("none");
        await userEvent.click(byId(container, "stem-id"));
        expect(toRustConfig(latest.config).stemming_method).toBe("indonesian");
        expect(isChecked(byId(container, "stem-id"))).toBe(true);
    });

    it("English (Porter) mengirim stemming_method=english dan catatan lowercase tampil", async () => {
        const { container } = render(<Harness />);
        await userEvent.click(byId(container, "stem-en"));
        expect(toRustConfig(latest.config).stemming_method).toBe("english");
        expect(
            screen.getByText(
                "Stemming always converts tokens to lowercase, so the Lowercase option has no effect while stemming is on."
            )
        ).toBeInTheDocument();
    });
});

describe("BB-09 standar rumus scikit-learn (antarmuka ke payload)", () => {
    it("default adalah Weka: Word count, IDF None, Normalization None", () => {
        const { container } = render(<Harness />);
        expect(isChecked(byId(container, "std-weka"))).toBe(true);
        expect(isChecked(byId(container, "tf-raw"))).toBe(true);
        expect(isChecked(byId(container, "idf-none"))).toBe(true);
        expect(isChecked(byId(container, "norm-none"))).toBe(true);
    });

    it("memilih scikit-learn otomatis menjadi hitungan (raw), smooth, dan L2", async () => {
        const { container } = render(<Harness />);
        await userEvent.click(byId(container, "std-sklearn"));

        expect(isChecked(byId(container, "std-sklearn"))).toBe(true);
        expect(isChecked(byId(container, "tf-raw"))).toBe(true);
        expect(isChecked(byId(container, "idf-smooth"))).toBe(true);
        expect(isChecked(byId(container, "norm-l2"))).toBe(true);

        const payload = toRustConfig(latest.config);
        expect(payload.formula_standard).toBe("sklearn");
        expect(payload.tf_method).toBe("raw");
        expect(payload.idf_method).toBe("smooth");
        expect(payload.normalization).toBe("l2");
        expect(screen.getByTestId("validation-errors").children).toHaveLength(0);
        expect(okButton()).toBeEnabled();
    });

    it("opsi yang tampil mengikuti standar: sklearn tidak menawarkan log(1+f), Weka tidak menawarkan L2", async () => {
        const { container } = render(<Harness />);
        expect(container.querySelector("#tf-log1p")).not.toBeNull(); // Weka
        expect(container.querySelector("#norm-l2")).toBeNull();
        await userEvent.click(byId(container, "std-sklearn"));
        expect(container.querySelector("#tf-log1p")).toBeNull();
        expect(container.querySelector("#tf-sublinear")).not.toBeNull();
        expect(container.querySelector("#norm-l2")).not.toBeNull();
    });
});

describe("BB-10 Words to Keep dan Min term frequency (antarmuka ke payload)", () => {
    it("Words to Keep=10 dan Min term frequency=2 dikirim sebagai words_to_keep=10, min_term_freq=2", () => {
        const { container } = render(<Harness />);
        fireEvent.change(byId(container, "words-to-keep"), { target: { value: "10" } });
        fireEvent.change(byId(container, "min-term-freq"), { target: { value: "2" } });
        const payload = toRustConfig(latest.config);
        expect(payload.words_to_keep).toBe(10);
        expect(payload.min_term_freq).toBe(2);
        expect(okButton()).toBeEnabled();
    });

    it("Min term frequency 0 menampilkan pesan dan menonaktifkan OK", () => {
        const { container } = render(<Harness />);
        fireEvent.change(byId(container, "min-term-freq"), { target: { value: "0" } });
        expect(screen.getByText("Min term frequency must be a whole number of 1 or more.")).toBeInTheDocument();
        expect(okButton()).toBeDisabled();
    });
});

describe("Kontrak payload default (dipakai juga oleh tes Rust BB-02)", () => {
    it("toRustConfig(default) identik dengan berkas c1_payload_default.json yang dibaca tes Rust", () => {
        const file = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "c1_payload_default.json"), "utf-8"));
        expect(toRustConfig(STWV_DEFAULT_CONFIG)).toEqual(file);
    });
});
