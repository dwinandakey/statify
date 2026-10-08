# -*- coding: utf-8 -*-
"""Tahap 2 Track B: susun testing/text_analytics_eval/B_whitebox.md dari analisis + hasil Jest (logs/jest_B_vm.json)."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from wb_synth import *
from wb_gen import TESTFILES, EVAL, WB

_LOGW = os.path.join(EVAL, "logs", "jest_B_win.json")
_LOGV = os.path.join(EVAL, "logs", "jest_B_vm.json")
LOG = _LOGW if os.path.exists(_LOGW) else _LOGV      # Windows (config produksi) diutamakan
LABEL = "Win" if LOG == _LOGW else "VM"
LOGNAME = "jest_B_win.json" if LABEL == "Win" else "jest_B_vm.json"
res = {}
if os.path.exists(LOG):
    d = json.load(open(LOG, encoding="utf-8"))
    for s in d["testResults"]:
        fn = re.sub(r"\.thesis(?![A-Za-z_])", ".eval", re.split(r"[\\/]", s["name"])[-1])  # log lama memakai nama lama
        for a in s["assertionResults"]:
            res[(fn, re.sub(r"(?<![A-Za-z_.-])thesis(?= [A-F][(:\s])", "eval", a["fullName"]))] = a["status"]

MENU = {"WB-1": "String to Word Vector", "WB-2": "Naive Bayes", "WB-3": "Naive Bayes", "WB-4": "Apply Model"}
SRC = {
    "WB-1": "frontend/components/Modals/Transform/StringToWordVector/utils/columnPrefix.ts",
    "WB-2": "frontend/components/Modals/Analyze/Classify/naive-bayes/hooks/useNaiveBayesValidation.ts",
    "WB-3": "frontend/components/Modals/Analyze/Classify/naive-bayes/hooks/useNaiveBayesValidation.ts",
    "WB-4": "frontend/components/Modals/Analyze/Classify/apply-model/services/model-loader.ts",
}
esc = lambda s: s.replace("|", "\\|")


def marker(key, title):
    return f"⟦jest:{os.path.basename(TESTFILES[key][1])}::{title}⟧"


def node_table(g):
    num = g.num(); L = ["| Simpul | Pernyataan |", "|---|---|"]
    for nid in g.order:
        n = g.nodes[nid]; k = n["kind"]
        if k == "start":
            L.append(f"| S | Simpul awal (entry, sintetis): {n['label']} |")
        elif k == "end":
            L.append(f"| X | Simpul akhir (exit, sintetis): semua `return` bermuara ke sini |")
        else:
            tag = {"pred": "predikat", "stmt": "pernyataan", "ret": "return"}[k]
            ln = f", baris {n['line']}" if n["line"] else ""
            L.append(f"| {num[nid]} | `{esc(n['stmt'])}` ({tag}{ln}) |")
    return "\n".join(L)


def edge_list(g):
    num = g.num()
    return "; ".join(f"{num[a]}→{num[b]}" + (f" ({l})" if l else "") for a, b, l in g.edges)


def metrics_table(g):
    m = g.metrics()
    ok = "sama" if m["VG"] == m["P1"] else "BERBEDA"
    return (f"| N | E | P | V(G) = E − N + 2 | P + 1 | Verifikasi |\n|---|---|---|---|---|---|\n"
            f"| {m['N']} | {m['E']} | {m['P']} | {m['VG']} | {m['P1']} | {ok} |")


def basis_table(key, a):
    L = ["| Jalur | Simpul | Masukan | Keluaran yang diharapkan | Hasil |", "|---|---|---|---|---|"]
    for r in a["rows"]:
        L.append(f"| {r['k']} | {r['nodes']} | {esc(r['input'])} | {esc(r['expected'])} | {marker(key, r['title'])} |")
    return "\n".join(L)


def actual(key, a):
    fn = re.split(r"[\\/]", TESTFILES[key][1])[-1]
    ps = [res.get((fn, r["title"])) for r in a["rows"]]
    npass = sum(1 for x in ps if x == "passed")
    return npass, len(ps), ps


def section(key, a, intro, decisions, extra):
    g = a["g"]; name = TESTFILES[key][0]; base = f"{key}_{name}"
    npass, n, ps = actual(key, a)
    out = [f"## {key} — `{name}` ({MENU[key]})", "", f"Sumber: `{SRC[key]}`. Berkas tes: `{os.path.relpath(TESTFILES[key][1], os.path.join(EVAL, '..', '..')).replace(os.sep, '/')}`.", "", intro, "",
           "### Tabel simpul", "", decisions, "", node_table(g), "",
           "### Daftar sisi (edge list)", "", edge_list(g), "",
           f"Berkas CSV: [edges_{base}.csv](whitebox/edges_{base}.csv).", "",
           "### Flow graph", "", f"DOT: [{base}.dot](whitebox/{base}.dot); PNG: [{base}.png](whitebox/{base}.png).", "",
           f"![Flow graph {key}](whitebox/{base}.png)", "",
           "### Kompleksitas siklomatik", "", metrics_table(g), "", extra["metrics_note"], "",
           "### Basis set jalur independen", "", extra["basis_note"], "", basis_table(key, a), ""]
    if extra.get("after_basis"):
        out += [extra["after_basis"], ""]
    _src = ("Windows (`logs/jest_B_win.json`, konfigurasi Jest produksi, perangkat uji skripsi)" if LABEL == "Win"
            else "VM (`logs/jest_B_vm.json`, ts-jest, bukan perangkat uji skripsi)")
    out += [f"Hasil eksekusi di {_src}: {npass} dari {n} tes jalur lulus" + ("" if npass == n else "; ada yang tidak lulus, lihat log") + ".", ""]
    return "\n".join(out)


def main():
    A = {k: f() for k, f in ANALYZERS.items()}
    S = []
    S.append("# Track B — White-box testing dengan basis path (modul Text Analytics Statify)\n")
    S.append("""Dokumen ini memuat analisis basis path untuk empat fungsi (WB-1 sampai WB-4). Seluruh angka (N, E, P, V(G), rank, jumlah jalur) dihitung oleh skrip `tools/wb_core.py`, `wb_graphs.py`, `wb_synth.py` (Python + numpy) dari edge list yang ditulis tangan dari kode sumber; DOT, PNG, CSV, dan berkas tes dihasilkan oleh `tools/wb_gen.py`, dokumen ini oleh `tools/wb_doc.py`. Status "Lulus/Gagal" pada kolom Hasil berasal dari penanda `⟦jest:...⟧` yang diisi dari `logs/jest_B_win.json`, dengan `logs/jest_B_vm.json` sebagai cadangan (lihat bagian Hasil eksekusi).

## Konvensi dan keputusan metodologis

1. **Simpul awal/akhir.** S adalah simpul awal sintetis (masuk fungsi) dan X simpul akhir sintetis; setiap `return` memiliki sisi ke X. S dan X dihitung dalam N dan sisi dari/ke keduanya dalam E; rumus V(G) = E − N + 2 berlaku untuk graf terhubung dengan satu simpul awal dan satu simpul akhir.
2. **Pemecahan kondisi majemuk.** Operator `||`, `&&`, dan `??` dipecah menjadi simpul predikat tersendiri menurut urutan evaluasi hubung-singkat (short-circuit): operan kanan hanya dievaluasi bila operan kiri tidak menentukan hasil. Operator pembanding, `typeof`, dan `!` pada satu operan bukan percabangan. Ekspresi regex (`/.../.test(...)`) dihitung satu predikat.
3. **Pemanggilan fungsi tidak diperluas.** Pemanggilan `getEffectivePredictors`, `getEffectiveTextSource`, `validateStwvConfig`, `validateAnyModel`, dan `Number.isInteger/isFinite` dianggap satu pernyataan (percabangan di dalamnya bukan bagian V(G) fungsi yang dianalisis). Satu-satunya pengecualian adalah `finalizeLoad` pada WB-4 yang diperluas (inline) karena menentukan keluaran `loadModelFromFile`.
4. **Metode basis set.** Jalur dasar (baseline) dipilih sebagai jalur "normal" (masukan sah). Setiap jalur berikutnya dibangun dengan membalik satu predikat pada jalur yang sudah ada dan melanjutkan dengan penyelesaian layak terpendek (metode McCabe). Keindependenan diperiksa dengan rank matriks vektor-sisi (numpy `matrix_rank`) sampai rank sama dengan V(G) atau tidak ada lagi jalur layak yang independen. Kelayakan jalur diperiksa lewat pembacaan kode dan, pada WB-2/WB-3, lewat simulasi seluruh keadaan abstrak masukan.
5. **Nilai bertipe salah.** Predikat `typeof x !== "number"` pada fungsi bertipe `number` hanya bernilai benar untuk data yang melanggar tipe (mis. string dari input UI atau IndexedDB lama). Jalur-jalur itu *layak saat runtime*, sehingga dites dengan `as unknown as number`, sama seperti tes lama.
6. **Dua tingkat kelayakan.** "Layak" = ada masukan konkret yang melewati jalur itu dan sudah dites. "Infeasible" = tidak ada masukan apa pun yang dapat melewati jalur itu; jalur semacam ini tidak punya tes dan alasannya dijelaskan.
""")
    # ---------------- WB-1
    a = A["WB-1"]
    S.append(section("WB-1", a,
        "Fungsi memeriksa awalan nama kolom vektor dengan lima pemeriksaan berurutan (kosong, spasi, panjang, awal, karakter).",
        "Keputusan pemecahan: kondisi `prefix !== prefix.trim() || /\\s/.test(prefix)` pada baris 16 dipecah menjadi dua simpul predikat (3 dan 4) karena `||` hubung-singkat; keempat pemeriksaan lain masing-masing satu predikat (regex dihitung satu predikat).",
        dict(metrics_note="V(G) = 7 sesuai klaim awal. Alasannya: ada 6 simpul predikat (1, 3, 4, 6, 8, 10) setelah `||` pada baris 16 dipecah menjadi dua; bila kondisi majemuk itu dihitung sebagai satu predikat, hasilnya 5 predikat dan V(G) = 6, jadi angka 7 bergantung pada keputusan pemecahan tersebut. Dengan pemecahan, E − N + 2 = P + 1 = 7.",
             basis_note="Semua 7 jalur layak. Jalur 3 dan 4 sama-sama berakhir di simpul 5 tetapi berbeda sisi (3→5 vs 4→5): jalur 3 diwakili awalan dengan spasi di tepi (`prefix !== prefix.trim()` benar), jalur 4 spasi di tengah saja (`/\\s/` benar). Jalur 2 memakai string kosong; string hanya-spasi juga melewati jalur yang sama.",
             after_basis="Hubungan dengan tes lama: `StringToWordVector/__tests__/columnPrefix.test.ts` menguji perilaku (nilai sah, tidak sah, batas 32) memakai `it.each`, tanpa pemetaan ke jalur; tes evaluasi ini mandiri dan memetakan satu tes ke satu jalur.")))
    # ---------------- WB-2
    a = A["WB-2"]
    S.append(section("WB-2", a,
        "Fungsi memvalidasi angka lintas tab Options dan Validation dan mengembalikan pesan galat pertama atau `null`. Percabangan berurutan: Smoothing Alpha, Text Features (Text Alpha, Top-k), Training Percentage (holdout), jumlah fold (kfold), seed.",
        "Keputusan pemecahan: setiap `||` pada guard `typeof ... || !Number.isFinite(...)` / `typeof ... || !Number.isInteger(...) || x < a || x > b` dipecah per operan (2 predikat untuk Smoothing Alpha dan Text Alpha, 4 untuk Top-k, Training Percentage, dan seed, 3 untuk fold), sehingga setiap operan punya sisi sendiri. Pemanggilan `getEffectiveTextSource` pada baris 188 tidak diperluas.",
        dict(metrics_note=f"V(G) = 29 = P + 1 dengan P = 28 predikat. Dari {a['total_paths']} jalur struktural (enumerasi graf), {a['infeasible_paths']} tidak layak karena menuntut `ValidationMethod` sekaligus `\"holdout\"` dan `\"kfold\"` (simpul 25 dan 32 pada satu jalur); sisanya {len(a['feas'])} layak dan membentang rank {a['rank']}.",
             basis_note="Jalur dasar (1) adalah nilai bawaan formulir. Jalur 2–29 dibangun dengan membalik predikat. Membalik simpul 31 (`method = kfold`) dari jalur dasar **infeasible** (menuntut holdout dan kfold bersamaan); sisi `kfold` dicapai lewat jalur 20–22 dan 28 (kfold sah/tidak sah), dan sisi \"bukan holdout dan bukan kfold\" lewat jalur 27 (lihat catatan). Jalur 27 adalah satu-satunya jalur yang hanya layak lewat pelanggaran tipe: `ValidationMethod` di luar union `\"holdout\" | \"kfold\"` (diberi `\"none\"` lewat type assertion) sehingga kedua cabang `if` dilewati dan fungsi mengembalikan `null`. Tanpa jalur 27 rank hanya 28 (tes lama memuat 28 jalur bernomor dan tidak punya jalur seperti ini).",
             after_basis="Hubungan dengan tes lama: `naive-bayes/hooks/__tests__/whitebox.getNumericInputError.test.ts` (28 jalur bernomor + 1 catatan temuan `KFolds = 1`) memuat masukan serupa untuk jalur galat; perbedaan yang dapat diverifikasi dari berkasnya: tidak ada jalur dengan `ValidationMethod` di luar union (jalur 27 di sini), dan jalur galat Training Percentage setelah blok Text Features dilewati dengan dua cara berbeda (jalur 18 dan 19 di sini) tidak ada di tes lama.")))
    # ---------------- WB-3
    a = A["WB-3"]; g = a["g"]
    allp = g.enum_paths(); num = g.num()
    inf_base = [(n, l) for p, n, l in a["infeasible"] if p == a["baseline"]]
    # jalur struktural ke-13 yang infeasible: balik simpul 5 (c2) saja dari baseline
    cand = [q for q in allp if q[:5] == a["baseline"][:4] + ("c2",) and q[5] == "c3"]
    cand = [q for q in allp if q[:len(a["baseline"][:4])+1] == a["baseline"][:4] + ("c2",) and q[len(a["baseline"][:4])+1] == "c3"]
    inf13 = min(cand, key=lambda q: (len(q), q))
    S.append(section("WB-3", a,
        "Blok `useMemo` pada `useNaiveBayesValidation` (baris 120–170) membangun daftar `errors` untuk tombol OK: target kosong, predictor kosong (dengan aturan N5-8), Complement bercampur predictor, dan konfigurasi Text Preprocessing.",
        "Keputusan pemecahan: (a) `!TargetVar && (SpecificationMode ?? \"exclude\") === \"exclude\"` (baris 139–140) dipecah menjadi simpul 5 (`!TargetVar`), simpul 6 (cabang `??`, dengan dua pernyataan penetapan 7 dan 8), simpul 9 (`=== \"exclude\"`), dan penetapan `predictorBelumBermakna` (10 dan 11); (b) `(len === 0 || belumBermakna) && !hasText` (baris 142–143) menjadi simpul 12, 13, 14; (c) `hasText && complement && len > 0` (baris 152–156) menjadi simpul 16, 17, 18; (d) `for...of` atas hasil `validateStwvConfig` menjadi simpul predikat loop 21 (jalur dibatasi paling banyak satu iterasi). Pemanggilan `getEffectivePredictors`, `getEffectiveTextSource`, dan `validateStwvConfig` tidak diperluas. `errors.length === 0` pada `return` hanya ekspresi nilai, bukan percabangan.",
        dict(metrics_note=f"V(G) = 13 = P + 1 dengan P = 12. Dari {a['total_paths']} jalur struktural (loop ≤ 1 iterasi) hanya {len(a['feas'])} yang layak (simulasi 2·2·2·2·3·2·2 = 192 keadaan abstrak masukan), dan rank vektor-sisi himpunan jalur layak itu adalah **{a['rank']}**, bukan 13. Penyebabnya: simpul 2 dan simpul 5 membaca nilai yang sama (`formData.main.TargetVar`) sehingga selalu bernilai sama. Uji tandingan dengan skrip: bila simpul 5 dianggap independen dari simpul 2, rank himpunan jalur layak menjadi 13; jadi korelasi inilah yang menghilangkan satu derajat kebebasan.",
             basis_note=f"Jalur dasar (1): target terisi, ada predictor, tanpa fitur teks. Jalur 2–12 dipilih secara greedy dari himpunan jalur layak (urut dari masukan paling sederhana) dan diperiksa rank-nya (12 jalur layak independen). **Jalur 13 infeasible**: jalur independen ke-13 secara struktural adalah membalik simpul 5 saja dari jalur dasar, yaitu `{pstr(g, inf13)}` (simpul 2 salah, simpul 5 benar). Ini mustahil karena `TargetVar` tidak berubah di antara baris 123 dan 139: `!TargetVar` tidak mungkin salah di simpul 2 lalu benar di simpul 5. Dari jalur dasar ada {len(inf_base)} pembalikan tunggal yang infeasible (simpul {', '.join(num[n] for n,_ in inf_base)}: masing-masing memaksa nilai bertentangan dengan keadaan sebelumnya, mis. `belumBermakna` benar padahal target terisi, atau `textSource = raw` padahal `hasText` salah). Selama pembangkitan basis tercatat {len(a['infeasible'])} pembalikan predikat infeasible dari seluruh jalur yang ditelusuri; semuanya berasal dari ketergantungan antarpredikat (target kosong pada simpul 2/5/9, `belumBermakna` pada simpul 13, `hasText` pada simpul 14/16/20, jumlah predictor pada simpul 12/18) dan hanya ketergantungan simpul 2 dan 5 yang menurunkan rank.",
             after_basis="Hubungan dengan tes lama: `naive-bayes/hooks/__tests__/whitebox.useNaiveBayesValidation.test.ts` memuat 10 jalur (WB-3 lama) tanpa pemecahan `??` dan `&&` per operan; tes evaluasi ini memakai pemecahan yang lebih halus (V(G) = 13) dan membuktikan bahwa 12 jalur layak.")))
    # ---------------- WB-4
    a = A["WB-4"]
    S.append(section("WB-4", a,
        "`loadModelFromFile` memvalidasi ekstensi dan ukuran file, membaca dan mem-parse JSON, lalu memanggil `finalizeLoad` (validasi umum `validateAnyModel` dan penyusunan hasil).",
        "Keputusan pemecahan: blok `try/catch` dimodelkan dengan dua predikat eksepsi implisit (simpul 6: `file.text()` menolak; simpul 7: `JSON.parse` melempar) karena keduanya adalah sumber percabangan ke `catch` dengan sebab berbeda. `finalizeLoad` diperluas (inline) sehingga predikat `!validation.ok` menjadi simpul 10. `validateAnyModel` dan adapter tidak diperluas.",
        dict(metrics_note="V(G) = 6 = P + 1 dengan P = 5. Untuk perbandingan: `loadModelFromFile` saja (tanpa memperluas `finalizeLoad`) V(G) = 5 dan `finalizeLoad` sendiri V(G) = 2; hasil gabungan 5 + 2 − 1 = 6.",
             basis_note="Semua 6 jalur layak. Jalur 5 memakai `\"[]\"` (JSON sah tetapi bukan objek): `validateAnyModel` mengembalikan `AM_E_NOT_OBJECT` (tanpa `detail`). Jalur 6 memakai fixture NB asli `nb-model-v1_1.json`; `validateAnyModel` dan adapter dipakai asli (tidak dimock).",
             after_basis="Hubungan dengan tes lama: `apply-model/services/__tests__/model-loader.test.ts` memuat kasus fungsional (D1/D2, ekstensi, ukuran, parse, tipe model, dsb.) dan memberi pola mock `File`; tes evaluasi ini mengulang pola itu tetapi per jalur basis set.")))
    # ---------------- Rekap
    S.append("## Rekap\n")
    rows = ["| Fungsi | Menu | V(G) | Jalur independen | Kasus lulus |", "|---|---|---|---|---|"]
    tp = tn = 0
    for k in ("WB-1", "WB-2", "WB-3", "WB-4"):
        a = A[k]; npass, n, _ = actual(k, a); tp += npass; tn += n
        rows.append(f"| {k} `{TESTFILES[k][0]}` | {MENU[k]} | {a['g'].metrics()['VG']} | {n} (rank {a['rank']}) | {npass} dari {n} [{LABEL}] |")
    rows.append(f"| Total | | {sum(A[k]['g'].metrics()['VG'] for k in A)} | {tn} | {tp} dari {tn} [{LABEL}] |")
    S.append("\n".join(rows) + "\n")
    S.append("""Catatan rekap: "Jalur independen" adalah jumlah jalur layak yang dites (sama dengan rank). Pada WB-3 jumlah ini 12 < V(G) = 13 karena satu jalur basis infeasible. Angka "Kasus lulus" dibaca dari `logs/jest_B_win.json` (eksekusi di Windows dengan konfigurasi Jest produksi, 54 tes); `logs/jest_B_vm.json` (VM Linux, ts-jest) hanya pembanding dan dipakai bila log Windows tidak ada.

## Hubungan dengan tes whitebox lama

Tes lama milik pengguna tidak diubah dan tidak disalin: `naive-bayes/hooks/__tests__/whitebox.getNumericInputError.test.ts` (WB-2 lama, 28 jalur), `whitebox.useNaiveBayesValidation.test.ts` (WB-3 lama, 10 jalur), `StringToWordVector/__tests__/columnPrefix.test.ts` (WB-1, uji perilaku). Hasil jalannya ada di `logs/whitebox_nb.txt` dan `logs/whitebox_stwv.txt`. Perbedaan analisis: tes baru ini (i) memecah kondisi majemuk per operan secara konsisten, (ii) memverifikasi V(G) dengan skrip dan rank, (iii) menandai jalur infeasible secara eksplisit, dan (iv) menambahkan WB-4 yang belum ada di tes lama. Berkas baru berada di folder `__tests__/eval/` dan nama tesnya memuat ID jalur (mis. `WB-2 jalur 14: ...`).

## Temuan

Lihat `BUGS_B.md` (dua pengamatan berprioritas rendah; tidak ada kegagalan tes).
""")
    open(os.path.join(EVAL, "B_whitebox.md"), "w", encoding="utf-8", newline="\n").write("\n".join(S))
    print("ok", tp, tn)


if __name__ == "__main__":
    main()
