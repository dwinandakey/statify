// datasets.mjs — registri dataset Track D (dipakai run_statify.mjs). Jalur relatif terhadap akar repo.
import path from "node:path";
import { repoRoot } from "../headless/statify_wasm.mjs";

const ACC = path.join(repoRoot, "testing", "text_analytics_eval", "accuracy");

export const DATASETS = {
  // Berkas ASLI yang dipakai skripsi (tidak diubah, tidak ada split baru).
  pilkada: {
    train: path.join(repoRoot, "Claude outputs", "pilkada_train.csv"),
    test: path.join(repoRoot, "Claude outputs", "pilkada_test.csv"),
    idCol: "Id", textCol: "Text Tweet", labelCol: "Sentiment", excluded: ["Id", "Pasangan Calon"],
    outDir: path.join(ACC, "out"),
  },
  // Dua dataset tambahan: split CSV disimpan di accuracy/datasets/ (lihat MANIFEST.md).
  sms_spam: {
    train: path.join(ACC, "datasets", "sms_spam_train.csv"),
    test: path.join(ACC, "datasets", "sms_spam_test.csv"),
    idCol: "Id", textCol: "Text", labelCol: "Label", excluded: ["Id"],
    outDir: path.join(ACC, "out", "sms_spam"),
  },
  smsa: {
    train: path.join(ACC, "datasets", "smsa_train.csv"),
    test: path.join(ACC, "datasets", "smsa_test.csv"),
    idCol: "Id", textCol: "Text", labelCol: "Label", excluded: ["Id"],
    outDir: path.join(ACC, "out", "smsa"),
  },
};
