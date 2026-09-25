/* eslint-disable @typescript-eslint/no-explicit-any -- WASM result payloads are validated while building interpretations. */
// Builds the HTML interpretation shown in the output viewer "description" field
// for the KNN output items.
import type { KNNType } from "@/components/Modals/Analyze/Classify/nearest-neighbor/types/nearest-neighbor";

const STOPPING_REASON_TEXT: Record<string, string> = {
  zero_error:
    "error sudah mencapai 0 sehingga penambahan fitur tidak dapat memperbaiki model lagi",
  minimum_change_reached:
    "penurunan rasio error absolut dibanding langkah sebelumnya sudah kurang dari atau sama dengan batas perubahan minimum",
  no_error_change:
    "penambahan fitur terakhir tidak mengubah error sama sekali",
  error_deteriorated:
    "penambahan fitur terbaik berikutnya justru menaikkan error melebihi toleransi, sehingga fitur tersebut dibatalkan dan tidak masuk ke model",
  max_features_reached: "jumlah fitur maksimum yang ditentukan sudah tercapai",
  candidate_features_exhausted:
    "seluruh kandidat fitur sudah dievaluasi dan dimasukkan ke model",
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatFixed(value: number, digits: number) {
  return value.toFixed(digits);
}

// Classification errors arrive as percentages (0–100); regression errors as SSE.
function formatError(value: number, isRegression: boolean) {
  return isRegression
    ? `SSE ${formatFixed(value, 4)}`
    : `${formatFixed(value, 2)}%`;
}

function featureList(features: unknown) {
  const list = Array.isArray(features) ? features.map(String) : [];
  if (!list.length) return "-";
  return list.map((feature) => `<strong>${escapeHtml(feature)}</strong>`).join(", ");
}

function stoppingReasonText(reason: unknown) {
  const key = String(reason ?? "");
  return STOPPING_REASON_TEXT[key] ?? escapeHtml(key);
}

function paragraph(text: string) {
  return `<p>${text}</p>`;
}

function list(items: string[]) {
  if (!items.length) return "";
  return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function heading(text: string) {
  return `<p><strong>${text}</strong></p>`;
}

function partitionTotal(partition: any) {
  return Array.isArray(partition?.observed)
    ? partition.observed.reduce(
        (sum: number, value: unknown) => sum + (toFiniteNumber(value) ?? 0),
        0,
      )
    : 0;
}

export function isRegressionResult(rawResult?: any) {
  return (
    rawResult?.predictor_space?.target_measure === "scale" ||
    (!rawResult?.classification_table && !rawResult?.error_summary)
  );
}

/* =========================
   k SELECTION (CROSS-VALIDATION)
========================= */

export function describeKSelection(chart?: any): string {
  const candidates = (Array.isArray(chart?.candidates) ? chart.candidates : [])
    .map((candidate: any) => ({
      k: toFiniteNumber(candidate?.k),
      error: toFiniteNumber(candidate?.average_error ?? candidate?.averageError),
      folds: Array.isArray(candidate?.fold_errors) ? candidate.fold_errors.length : 0,
    }))
    .filter((candidate: any) => candidate.k !== null && candidate.error !== null);

  if (!candidates.length) return "k Selection Error Log";

  const isRegression = String(chart?.metric_name ?? chart?.metricName ?? "")
    .toLowerCase()
    .includes("sse");
  const selectedK = toFiniteNumber(chart?.selected_k ?? chart?.selectedK);
  const selected =
    candidates.find((candidate: any) => candidate.k === selectedK) ??
    candidates.reduce((best: any, candidate: any) =>
      candidate.error < best.error ? candidate : best,
    );
  const worst = candidates.reduce((max: any, candidate: any) =>
    candidate.error > max.error ? candidate : max,
  );
  const folds = candidates[0].folds;
  const metricLabel = isRegression
    ? "rata-rata Sum of Squared Error (SSE)"
    : "rata-rata persentase kasus yang salah diklasifikasikan";
  const tiedKs = candidates
    .filter(
      (candidate: any) =>
        candidate.k !== selected.k &&
        Math.abs(candidate.error - selected.error) <= 1e-9,
    )
    .map((candidate: any) => candidate.k);

  const detailItems = candidates.map((candidate: any) => {
    const text = `k = ${candidate.k}: ${formatError(candidate.error, isRegression)}`;
    return candidate.k === selected.k ? `<strong>${text} (terpilih)</strong>` : text;
  });

  const conclusion = [
    `Nilai <strong>k = ${selected.k}</strong> dipilih karena menghasilkan ${metricLabel} paling kecil, yaitu <strong>${formatError(selected.error, isRegression)}</strong>.`,
  ];
  if (tiedKs.length) {
    conclusion.push(
      `Nilai k = ${tiedKs.join(", ")} menghasilkan error yang sama, sehingga dipilih k yang paling kecil agar model lebih sederhana.`,
    );
  }
  if (worst.k !== selected.k) {
    conclusion.push(
      `Error terbesar terjadi pada k = ${worst.k} (${formatError(worst.error, isRegression)}).`,
    );
  }

  return [
    heading("Interpretasi Pemilihan k"),
    paragraph(
      `Nilai k dipilih secara otomatis dengan <em>${folds > 0 ? `${folds}-fold ` : ""}cross-validation</em> pada data training. Setiap kandidat k dievaluasi dengan ${metricLabel} di seluruh fold. Rincian error setiap k:`,
    ),
    list(detailItems),
    paragraph(conclusion.join(" ")),
    paragraph(
      `Model akhir (tabel klasifikasi, error summary, dan predictor space) dibangun menggunakan k = ${selected.k}.`,
    ),
  ].join("");
}

/* =========================
   FEATURE SELECTION (FIXED k & AUTO k)
========================= */

export function describeFeatureSelection(
  rawResult?: any,
  configData?: KNNType,
): string {
  const summary = rawResult?.feature_selection_summary;
  const steps = Array.isArray(rawResult?.feature_selection_steps)
    ? rawResult.feature_selection_steps
    : [];
  const kSummary = Array.isArray(rawResult?.k_feature_selection_summary)
    ? rawResult.k_feature_selection_summary
    : [];

  if (!summary && !kSummary.length) return "k and Predictor Selection";

  const isRegression = isRegressionResult(rawResult);
  const selectedEntry = kSummary.find((entry: any) => entry?.selected);
  const selectedK = toFiniteNumber(selectedEntry?.k);
  const isAutoK = kSummary.length > 1;
  const usesMinimumChange = summary?.stopping_method === "minimum_change";
  const minChange = toFiniteNumber(configData?.features?.MinChange);
  const maxToSelect = toFiniteNumber(configData?.features?.MaxToSelect);
  const errorMetric = isRegression
    ? "Sum of Squared Error (SSE)"
    : "persentase kasus training yang salah diklasifikasikan";
  const selectedFeatures: string[] = Array.isArray(summary?.selected_features)
    ? summary.selected_features.map(String)
    : [];
  const forcedFeatures: string[] = Array.isArray(summary?.forced_features)
    ? summary.forced_features.map(String)
    : [];
  const removedFeatures: string[] = Array.isArray(summary?.removed_features)
    ? summary.removed_features.map(String)
    : [];

  const parts: string[] = [heading("Interpretasi Seleksi Fitur")];

  const stoppingText = usesMinimumChange
    ? `proses berhenti ketika perubahan rasio error absolut dibanding langkah sebelumnya kurang dari atau sama dengan <strong>${minChange ?? "-"}</strong>`
    : `proses berhenti ketika jumlah fitur yang ditambahkan mencapai <strong>${maxToSelect ?? "batas maksimum"}</strong>`;

  parts.push(
    paragraph(
      `Seleksi fitur menggunakan metode <em>forward selection</em>: pada setiap langkah, setiap kandidat fitur dicoba satu per satu, dan fitur yang menghasilkan ${errorMetric} terkecil ditambahkan ke model. Error dihitung pada data training dengan setiap kasus tidak dihitung sebagai tetangganya sendiri. Kriteria berhenti: ${stoppingText}.`,
    ),
  );

  if (forcedFeatures.length) {
    parts.push(
      paragraph(
        `Fitur yang dipaksa masuk ke model (<em>forced entry</em>): ${featureList(forcedFeatures)}.`,
      ),
    );
  }

  if (isAutoK) {
    parts.push(
      paragraph(
        `Karena k dipilih otomatis, forward selection dijalankan terpisah untuk setiap kandidat k, lalu dipilih kombinasi k dan fitur dengan error akhir terkecil. Rincian hasil setiap k:`,
      ),
    );
    parts.push(
      list(
        kSummary.map((entry: any) => {
          const error = toFiniteNumber(entry?.error);
          const features: string[] = Array.isArray(entry?.selected_features)
            ? entry.selected_features.map(String)
            : [];
          const text = `k = ${escapeHtml(entry?.k)}: ${features.length} fitur (${escapeHtml(
            features.length ? features.join(", ") : "-",
          )}), error ${error === null ? "-" : formatError(error, isRegression)}`;
          return entry?.selected ? `<strong>${text} (terpilih)</strong>` : text;
        }),
      ),
    );
  } else if (selectedK !== null) {
    parts.push(paragraph(`Seleksi fitur dilakukan dengan k tetap, yaitu <strong>k = ${selectedK}</strong>.`));
  }

  if (steps.length) {
    const acceptedFeatures = new Set(selectedFeatures);
    parts.push(
      paragraph(
        `Langkah forward selection${isAutoK && selectedK !== null ? ` untuk k = ${selectedK}` : ""}:`,
      ),
    );
    parts.push(
      list(
        steps.map((step: any) => {
          const error = toFiniteNumber(step?.trial_error ?? step?.trialError);
          const improvement = toFiniteNumber(step?.improvement);
          const feature = String(step?.selected_feature ?? step?.selectedFeature ?? "");
          const rejected = !acceptedFeatures.has(feature);
          const changeText =
            improvement === null
              ? ""
              : improvement > 0
                ? `, turun ${formatFixed(improvement, isRegression ? 4 : 2)}${isRegression ? "" : " poin persen"} dari langkah sebelumnya`
                : improvement < 0
                  ? `, naik ${formatFixed(Math.abs(improvement), isRegression ? 4 : 2)}${isRegression ? "" : " poin persen"} dari langkah sebelumnya`
                  : ", tidak berubah dari langkah sebelumnya";
          return `Langkah ${escapeHtml(step?.step_number ?? "")}: <strong>${escapeHtml(feature)}</strong> — error ${
            error === null ? "-" : formatError(error, isRegression)
          }${changeText}${rejected ? " <em>(dibatalkan, tidak masuk model)</em>" : ""}`;
        }),
      ),
    );
  }

  const finalError = toFiniteNumber(summary?.final_error ?? selectedEntry?.error);
  const conclusion = [
    `Proses berhenti karena ${stoppingReasonText(summary?.stopping_reason ?? selectedEntry?.stopping_reason)}.`,
    `Model akhir${selectedK !== null ? ` menggunakan <strong>k = ${selectedK}</strong> dan` : " menggunakan"} <strong>${selectedFeatures.length} fitur</strong>: ${featureList(selectedFeatures)}${
      finalError === null ? "" : `, dengan error akhir ${formatError(finalError, isRegression)}`
    }.`,
  ];
  if (removedFeatures.length) {
    conclusion.push(
      `Fitur yang tidak digunakan: ${featureList(removedFeatures)}, karena tidak cukup memperbaiki error model.`,
    );
  }
  parts.push(paragraph(conclusion.join(" ")));

  return parts.join("");
}

/* =========================
   FEATURE WEIGHTING (PREDICTOR IMPORTANCE)
========================= */

export function describePredictorImportance(
  importance?: any,
  isRegression = false,
): string {
  const entries = (Array.isArray(importance?.entries) ? importance.entries : [])
    .map((entry: any) => ({
      name: String(entry?.featureName ?? entry?.feature_name ?? ""),
      baseError: toFiniteNumber(entry?.baseError ?? entry?.base_error),
      errorWithout: toFiniteNumber(
        entry?.errorWithoutFeature ?? entry?.error_without_feature,
      ),
      delta: toFiniteNumber(entry?.deltaError ?? entry?.delta_error),
      weight: toFiniteNumber(
        entry?.normalizedImportance ?? entry?.normalized_importance,
      ),
    }))
    .filter((entry: any) => entry.name && entry.weight !== null)
    .sort((left: any, right: any) => right.weight - left.weight);

  if (!entries.length) return "Predictor Importance";

  const baseError = entries[0].baseError;
  const top = entries[0];
  const bottom = entries[entries.length - 1];
  const helpful = entries.filter((entry: any) => (entry.delta ?? 0) > 0);
  const notHelpful = entries.filter((entry: any) => (entry.delta ?? 0) <= 0);

  const parts = [
    heading("Interpretasi Pembobotan Fitur"),
    paragraph(
      `Bobot setiap fitur dihitung dari kenaikan error ketika fitur tersebut dikeluarkan dari model${
        baseError === null ? "" : ` (error dengan semua fitur: ${formatError(baseError, isRegression)})`
      }. Semakin besar kenaikan error saat sebuah fitur dihapus, semakin penting fitur tersebut dan semakin besar bobotnya dalam perhitungan jarak. Bobot dinormalisasi sehingga jumlahnya 1.`,
    ),
    list(
      entries.map((entry: any, index: number) => {
        const deltaText =
          entry.delta === null
            ? ""
            : entry.delta > 0
              ? `error naik ${formatFixed(entry.delta, isRegression ? 4 : 2)}${isRegression ? "" : " poin persen"} jika dihapus`
              : entry.delta < 0
                ? `error justru turun ${formatFixed(Math.abs(entry.delta), isRegression ? 4 : 2)}${isRegression ? "" : " poin persen"} jika dihapus`
                : "error tidak berubah jika dihapus";
        return `${index + 1}. <strong>${escapeHtml(entry.name)}</strong> — bobot ${formatFixed(entry.weight, 4)} (${formatFixed(entry.weight * 100, 1)}%)${deltaText ? `; ${deltaText}` : ""}`;
      }),
    ),
  ];

  const conclusion = [
    `Fitur paling berpengaruh adalah <strong>${escapeHtml(top.name)}</strong> dengan bobot ${formatFixed(top.weight * 100, 1)}%, sedangkan fitur dengan pengaruh paling kecil adalah <strong>${escapeHtml(bottom.name)}</strong> (${formatFixed(bottom.weight * 100, 1)}%).`,
  ];
  if (helpful.length && notHelpful.length) {
    conclusion.push(
      `Fitur ${featureList(notHelpful.map((entry: any) => entry.name))} tidak menaikkan error ketika dihapus, sehingga kontribusinya terhadap ketepatan prediksi relatif kecil.`,
    );
  } else if (!helpful.length) {
    conclusion.push(
      "Tidak ada fitur yang menaikkan error ketika dihapus, sehingga bobot antar fitur relatif seimbang.",
    );
  }
  parts.push(paragraph(conclusion.join(" ")));

  return parts.join("");
}

/* =========================
   CLASSIFICATION TABLE
========================= */

function describeClassificationPartition(
  name: string,
  partition: any,
  categories: string[],
) {
  const matrix: number[][] = Array.isArray(partition?.confusion_matrix)
    ? partition.confusion_matrix.map((row: any) =>
        Array.isArray(row) ? row.map((cell: any) => toFiniteNumber(cell) ?? 0) : [],
      )
    : [];
  const total = matrix.reduce(
    (sum, row) => sum + row.reduce((rowSum, cell) => rowSum + cell, 0),
    0,
  );
  if (total <= 0) return "";

  const correct = matrix.reduce((sum, row, index) => sum + (row[index] ?? 0), 0);
  const accuracy = (correct / total) * 100;

  const categoryItems = categories.map((category, index) => {
    const row = matrix[index] ?? [];
    const observed = row.reduce((sum, cell) => sum + cell, 0);
    const hit = row[index] ?? 0;
    const recall = observed > 0 ? (hit / observed) * 100 : null;
    return { category, observed, hit, recall };
  });

  let largestMistake: { from: string; to: string; count: number } | null = null;
  matrix.forEach((row, rowIndex) => {
    row.forEach((count, columnIndex) => {
      if (rowIndex === columnIndex || count <= 0) return;
      if (!largestMistake || count > largestMistake.count) {
        largestMistake = {
          from: categories[rowIndex] ?? String(rowIndex),
          to: categories[columnIndex] ?? String(columnIndex),
          count,
        };
      }
    });
  });

  const measured = categoryItems.filter((item) => item.recall !== null);
  const best = measured.reduce<(typeof measured)[number] | null>(
    (current, item) => (!current || (item.recall ?? 0) > (current.recall ?? 0) ? item : current),
    null,
  );
  const worst = measured.reduce<(typeof measured)[number] | null>(
    (current, item) => (!current || (item.recall ?? 0) < (current.recall ?? 0) ? item : current),
    null,
  );

  const sentences = [
    `Pada data <strong>${name}</strong>, model mengklasifikasikan dengan benar ${correct} dari ${total} kasus (<strong>${formatFixed(accuracy, 1)}%</strong>).`,
  ];
  if (best && worst && best.category !== worst.category) {
    sentences.push(
      `Ketepatan tertinggi ada pada kategori <strong>${escapeHtml(best.category)}</strong> (${best.hit} dari ${best.observed} kasus, ${formatFixed(best.recall ?? 0, 1)}%), sedangkan terendah pada kategori <strong>${escapeHtml(worst.category)}</strong> (${worst.hit} dari ${worst.observed} kasus, ${formatFixed(worst.recall ?? 0, 1)}%).`,
    );
  }
  const mistake = largestMistake as { from: string; to: string; count: number } | null;
  if (mistake) {
    sentences.push(
      `Kesalahan terbanyak adalah kasus berkategori <strong>${escapeHtml(mistake.from)}</strong> yang diprediksi sebagai <strong>${escapeHtml(mistake.to)}</strong> (${mistake.count} kasus).`,
    );
  }

  // Majority-class baseline: accuracy of always predicting the most frequent category.
  const majority = categoryItems.reduce(
    (current, item) => (item.observed > current.observed ? item : current),
    categoryItems[0],
  );
  const baseline = majority ? (majority.observed / total) * 100 : null;
  if (baseline !== null && worst && (worst.recall ?? 100) < 50) {
    sentences.push(
      `Perlu diperhatikan bahwa jika semua kasus diprediksi sebagai kategori mayoritas (<strong>${escapeHtml(majority.category)}</strong>), ketepatannya sudah ${formatFixed(baseline, 1)}%. Karena ketepatan pada kategori ${escapeHtml(worst.category)} rendah, akurasi keseluruhan yang tinggi terutama didorong oleh kategori mayoritas.`,
    );
  }

  return paragraph(sentences.join(" "));
}

export function describeClassificationTable(table?: any): string {
  const categories: string[] = Array.isArray(table?.categories)
    ? table.categories.map(String)
    : [];
  if (!table || !categories.length) return "Classification Table";

  const training = describeClassificationPartition("training", table.training, categories);
  const holdout = describeClassificationPartition("holdout", table.holdout, categories);

  if (!training && !holdout) return "Classification Table";

  return [
    heading("Interpretasi Tabel Klasifikasi"),
    paragraph(
      "Tabel klasifikasi membandingkan kategori sebenarnya (baris <em>Observed</em>) dengan kategori hasil prediksi KNN (kolom <em>Predicted</em>). Angka pada diagonal adalah kasus yang diklasifikasikan dengan benar, sedangkan angka di luar diagonal adalah kasus yang salah diklasifikasikan. Kolom <em>Percent Correct</em> menunjukkan ketepatan untuk setiap kategori.",
    ),
    training,
    holdout,
  ].join("");
}

/* =========================
   ERROR SUMMARY
========================= */

export function describeErrorSummary(summary?: any, classificationTable?: any): string {
  const trainingError = toFiniteNumber(summary?.training);
  const holdoutError = toFiniteNumber(summary?.holdout);
  const hasTraining =
    trainingError !== null &&
    (!classificationTable || partitionTotal(classificationTable.training) > 0);
  const hasHoldout =
    holdoutError !== null &&
    (!classificationTable || partitionTotal(classificationTable.holdout) > 0);

  if (!hasTraining && !hasHoldout) return "Error Summary";

  const parts = [
    heading("Interpretasi Error Summary"),
    paragraph(
      "Tabel ini menunjukkan persentase kasus yang salah diklasifikasikan oleh model KNN pada setiap partisi. Semakin kecil persentasenya, semakin baik kemampuan model dalam memprediksi kategori target.",
    ),
  ];

  const sentences: string[] = [];
  if (hasTraining && trainingError !== null) {
    sentences.push(
      `Pada data <strong>training</strong>, ${formatFixed(trainingError, 1)}% kasus salah diklasifikasikan (ketepatan ${formatFixed(100 - trainingError, 1)}%).`,
    );
  }
  if (hasHoldout && holdoutError !== null) {
    sentences.push(
      `Pada data <strong>holdout</strong>, ${formatFixed(holdoutError, 1)}% kasus salah diklasifikasikan (ketepatan ${formatFixed(100 - holdoutError, 1)}%).`,
    );
  }
  parts.push(paragraph(sentences.join(" ")));

  if (hasTraining && hasHoldout && trainingError !== null && holdoutError !== null) {
    const gap = holdoutError - trainingError;
    let verdict: string;
    if (Math.abs(gap) <= 5) {
      verdict = `Selisih error training dan holdout hanya ${formatFixed(Math.abs(gap), 1)} poin persen, sehingga performa model pada data baru relatif konsisten dengan data training (tidak terindikasi <em>overfitting</em>).`;
    } else if (gap > 5) {
      verdict = `Error holdout lebih besar ${formatFixed(gap, 1)} poin persen dibanding training, yang mengindikasikan model kurang mampu menggeneralisasi ke data baru (<em>overfitting</em>). Pertimbangkan menaikkan nilai k atau meninjau kembali fitur yang digunakan.`;
    } else {
      verdict = `Error holdout lebih kecil ${formatFixed(Math.abs(gap), 1)} poin persen dibanding training, sehingga model tidak menunjukkan indikasi <em>overfitting</em>.`;
    }
    parts.push(paragraph(verdict));
  } else if (hasTraining && !hasHoldout) {
    parts.push(
      paragraph(
        "Tidak ada data holdout, sehingga kemampuan model pada data baru belum dapat dievaluasi.",
      ),
    );
  }

  return parts.join("");
}
