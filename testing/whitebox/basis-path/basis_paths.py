"""Spesifikasi basis path testing (McCabe) untuk lima fungsi GLM MV/RM.

Untuk tiap fungsi: node flow graph (dengan baris kode), sisi, predikat, dan
himpunan jalur basis. Skrip ini memeriksa:
  1. V(G) = E - N + 2 sama dengan jumlah predikat + 1;
  2. setiap jalur adalah walk sah dari node masuk ke node keluar;
  3. vektor sisi seluruh jalur bebas linear (rank = V(G)), sehingga
     himpunan jalur benar-benar basis;
  4. setiap sisi dilalui minimal satu jalur.
Keluaran: <fungsi>.mmd (Mermaid) dan basis-path.json/.md (tabel).

Konvensi: predikat = keputusan eksplisit di kode sumber (if, if let, match
dua lengan, operator ?, setiap operand ||, header loop for). Pemanggilan
pustaka (min/max/unwrap_or_else/any di dalam iterator) tidak dihitung.
Jalur ber-loop ditulis dengan iterasi minimal; data uji boleh
mengulang badan loop lebih banyak (struktur keputusan sama).

Jalankan: python testing/whitebox/basis-path/basis_paths.py
"""
import json
import pathlib
from fractions import Fraction

HERE = pathlib.Path(__file__).resolve().parent


def rank(rows):
    """Rank matriks bilangan bulat (eliminasi Gauss eksak, Fraction)."""
    m = [[Fraction(x) for x in r] for r in rows]
    r, cols = 0, len(m[0]) if m else 0
    for c in range(cols):
        piv = next((i for i in range(r, len(m)) if m[i][c] != 0), None)
        if piv is None:
            continue
        m[r], m[piv] = m[piv], m[r]
        for i in range(len(m)):
            if i != r and m[i][c] != 0:
                f = m[i][c] / m[r][c]
                m[i] = [a - f * b for a, b in zip(m[i], m[r])]
        r += 1
    return r


class Fn:
    def __init__(self, key, name, file, lang, nodes, edges, predicates, entry, exit_):
        self.key, self.name, self.file, self.lang = key, name, file, lang
        self.nodes, self.edges, self.predicates = nodes, edges, predicates
        self.entry, self.exit = entry, exit_
        self.paths = []

    def path(self, pid, seq, scenario, expected, oracle, test, feasible=True, reason=""):
        self.paths.append(dict(id=pid, seq=seq, scenario=scenario, expected=expected, oracle=oracle,
                               test=test, feasible=feasible, reason=reason))

    def check(self):
        edge_set = set(self.edges)
        assert len(edge_set) == len(self.edges), f"{self.key}: sisi ganda"
        for a, b in self.edges:
            assert a in self.nodes and b in self.nodes, (self.key, a, b)
        n, e = len(self.nodes), len(self.edges)
        v1, v2 = e - n + 2, len(self.predicates) + 1
        assert v1 == v2, f"{self.key}: E-N+2 = {v1} != predikat+1 = {v2}"
        # Jumlah sisi keluar node predikat = 2, node lain = 1 (kecuali keluar).
        for node in self.nodes:
            out = sum(1 for a, _ in self.edges if a == node)
            want = 0 if node == self.exit else (2 if node in self.predicates else 1)
            assert out == want, f"{self.key}: node {node} punya {out} sisi keluar, seharusnya {want}"
        vectors = []
        for p in self.paths:
            s = p["seq"]
            assert s[0] == self.entry and s[-1] == self.exit, (self.key, p["id"])
            for a, b in zip(s, s[1:]):
                assert (a, b) in edge_set, f"{self.key} {p['id']}: {a}->{b} bukan sisi"
            vectors.append([sum(1 for a, b in zip(s, s[1:]) if (a, b) == ed) for ed in self.edges])
        r = rank(vectors)
        covered = {(a, b) for p in self.paths for a, b in zip(p["seq"], p["seq"][1:])}
        missing = [ed for ed in self.edges if ed not in covered]
        assert len(self.paths) == v1, f"{self.key}: {len(self.paths)} jalur, V(G) = {v1}"
        assert r == v1, f"{self.key}: rank jalur {r} < V(G) {v1}"
        assert not missing, f"{self.key}: sisi tak tercakup {missing}"
        return dict(N=n, E=e, P=len(self.predicates), V_EN=v1, V_P=v2, rank=r)

    def dot(self, metrics):
        """Flow graph gaya McCabe: node bernomor; predikat diarsir."""
        lines = ["digraph G {", '  graph [rankdir=TB, fontname="Helvetica", labelloc=t, fontsize=16, nodesep=0.35, ranksep=0.35,',
                 f'         label="{self.name}  ({self.file})\\nN = {metrics["N"]}, E = {metrics["E"]}, '
                 f'V(G) = E - N + 2 = {metrics["V_EN"]} = predikat + 1 = {metrics["V_P"]}"];',
                 '  node [shape=circle, fontname="Helvetica", fontsize=11, width=0.42, fixedsize=true];',
                 '  edge [arrowsize=0.6];']
        for k in self.nodes:
            style = ', style=filled, fillcolor="#d9e6f5"' if k in self.predicates else ""
            if k == self.exit:
                style = ", shape=doublecircle, width=0.36"
            lines.append(f'  n{k} [label="{k}"{style}];')
        for a, b in self.edges:
            lines.append(f"  n{a} -> n{b};")
        lines.append("}")
        return "\n".join(lines) + "\n"

    def mermaid(self):
        lines = ["flowchart TD"]
        for k, label in self.nodes.items():
            text = label.replace('"', "'")
            shape = ('{{"%s"}}' if k in self.predicates else '["%s"]') % f"{k}: {text}"
            lines.append(f"    n{k}{shape}")
        for a, b in self.edges:
            lines.append(f"    n{a} --> n{b}")
        return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# 1. test_df (MV, stats/multivariate_tests.rs:625)
tdf = Fn("test_df", "test_df", "multivariate/rust/src/stats/multivariate_tests.rs:625", "Rust",
         nodes={1: "r = df.round(); if |df - r| < 1e-9 (P1)", 2: "r.max(1.0)", 3: "df", 4: "keluar"},
         edges=[(1, 2), (1, 3), (2, 4), (3, 4)], predicates={1}, entry=1, exit_=4)
tdf.path("TDF-J1", [1, 2, 4], "df = 4.0 (bulat); juga batas df = 0 -> 1", "4.0; 1.0",
         "SPSS mv4 treatment Pillai Hypothesis df = 4; spesifikasi (komentar v5: minimal 1)", "tdf_j1_df_bulat")
tdf.path("TDF-J2", [1, 3, 4], "df = 48.82535052622494 (pecahan)", "48.82535052622494 (tidak dibulatkan)",
         "SPSS mv9 kelompok Wilks' Lambda Error df = 48.82535052622494", "tdf_j2_df_pecahan")

# ---------------------------------------------------------------------------
# 2. parse_within_subject_factors (RM, stats/parse_factors.rs:11)
pwf = Fn("parse_within_subject_factors", "parse_within_subject_factors",
         "repeated-measures/rust/src/stats/parse_factors.rs:11", "Rust",
         nodes={1: "measures = {}; Regex::new(..)? (P1)", 2: "return Err(regex)", 3: "for var_defs in subject_data_defs (P2)",
                4: "for var_def in var_defs (P3)", 5: "if let Some(captures) (P4)", 6: "ambil faktor, level, measure; if let Some(def_factors) (P5)",
                7: "factor_names = split(';')", 8: "for (i, level) in levels (P6)", 9: "if i < factor_names.len() (P7)",
                10: "insert(factor_names[i])", 11: "insert(Factor{i+1})", 12: "for (i, level) in levels (P8)",
                13: "insert(Level{i+1})", 14: "measures[measure].push(factor)", 15: "return Ok(measures)", 16: "keluar"},
         edges=[(1, 2), (1, 3), (2, 16), (3, 4), (3, 15), (4, 5), (4, 3), (5, 6), (5, 4), (6, 7), (6, 12), (7, 8), (8, 9),
                (8, 14), (9, 10), (9, 11), (10, 8), (11, 8), (12, 13), (12, 14), (13, 12), (14, 4), (15, 16)],
         predicates={1, 3, 4, 5, 6, 8, 9, 12}, entry=1, exit_=16)
pwf.path("PWF-J1", [1, 2, 16], "Regex::new gagal", "Err", "-", "-", False,
         "Pola regex adalah literal konstan yang valid; Regex::new tidak pernah gagal.")
pwf.path("PWF-J2", [1, 3, 15, 16], "subject_data_defs = []", "Ok, measures kosong", "spesifikasi", "pwf_j2_tanpa_definisi")
pwf.path("PWF-J3", [1, 3, 4, 3, 15, 16], "subject_data_defs = [[]]", "Ok, measures kosong", "spesifikasi", "pwf_j3_grup_kosong")
pwf.path("PWF-J4", [1, 3, 4, 5, 4, 3, 15, 16], "nama 'skor' (tidak berformat var_(level,measure))", "Ok, measures kosong",
         "spesifikasi (format nama)", "pwf_j4_nama_tidak_cocok")
pwf.path("PWF-J5", [1, 3, 4, 5, 6, 7, 8, 14, 4, 3, 15, 16], "nama cocok dengan nol level", "-", "-", "-", False,
         "Regex mensyaratkan minimal satu level (\\d+), sehingga loop level selalu berjalan >= 1 kali.")
pwf.path("PWF-J6", [1, 3, 4, 5, 6, 7, 8, 9, 10, 8, 14, 4, 3, 15, 16], "'w1_(1,skor)', DefFactors 'waktu'",
         "skor: [{waktu: 1}]", "spesifikasi (DefFactors menamai level)", "pwf_j6_satu_level_bernama")
pwf.path("PWF-J7", [1, 3, 4, 5, 6, 7, 8, 9, 10, 8, 9, 11, 8, 14, 4, 3, 15, 16], "'w1_(1,2,skor)', DefFactors 'waktu'",
         "skor: [{waktu: 1, Factor2: 2}]", "spesifikasi (nama cadangan FactorN)", "pwf_j7_level_tanpa_nama")
pwf.path("PWF-J8", [1, 3, 4, 5, 6, 12, 14, 4, 3, 15, 16], "DefFactors kosong dan nol level", "-", "-", "-", False,
         "Sama dengan PWF-J5: minimal satu level.")
pwf.path("PWF-J9", [1, 3, 4, 5, 6, 12, 13, 12, 14, 4, 3, 15, 16], "'w1_(1,skor)', DefFactors = null",
         "skor: [{Level1: 1}]", "spesifikasi (nama bawaan LevelN)", "pwf_j9_tanpa_def_factors")

# ---------------------------------------------------------------------------
# 3. calculate_mauchly_test (RM, stats/mauchly_test.rs:29)
mau_nodes = {
    1: "parse_within_subject_factors(..)? (P1)", 2: "return Err", 3: "for (measure, factors) (P2)",
    4: "if factors.len() < 2 (P3)", 5: "for record_group in subject_data (P4)", 6: "for var_name in var_names (P5)",
    7: "for record in record_group (P6)", 8: "if let Some(v) = record.get(var) (P7)", 9: "match v: Number (P8)",
    10: "push(v); found = true; break", 11: "if !found (P9)", 12: "push(0.0)", 13: "if len == n_vars (P10)",
    14: "data_matrix.push(row)", 15: "if n_subjects < 2 (P11)", 16: "|| n_vars < 2 (P12)", 17: "for (i, row) (P13)",
    18: "for (j, val) in row (P14)", 19: "matrix[i,j] = val", 20: "for i in 0..n (P15)", 21: "for j in 0..k (P16)",
    22: "centered[i,j] -= mean[j]", 23: "cov, S_t, det, trace; if mean_eig < 1e-12 (P17)", 24: "W = 0",
    25: "W = det / mean_eig^p", 26: "if W > 0 (P18)", 27: "chi = -(n-1-c) ln W", 28: "chi = INF",
    29: "df, Sig.; if sum_sq_eig < 1e-12 (P19)", 30: "GG = 1", 31: "GG = (sum l)^2/(p sum l^2)", 32: "if n <= k (P20)",
    33: "HF = min(GG, 1)", 34: "num, den; if |den| < 1e-12 (P21)", 35: "HF = min(GG, 1)", 36: "HF = rumus, [GG, 1]",
    37: "LB; if chi finite (P22)", 38: "chi_square = chi", 39: "chi_square = 0", 40: "tests.insert; if design.is_none() (P23)",
    41: "design = Some(..)", 42: "return Ok(MauchlyTest)", 43: "keluar"}
mau_edges = [(1, 2), (1, 3), (2, 43), (3, 4), (3, 42), (4, 3), (4, 5), (5, 6), (5, 15), (6, 7), (6, 13), (7, 8), (7, 11),
             (8, 7), (8, 9), (9, 10), (9, 7), (10, 11), (11, 12), (11, 6), (12, 6), (13, 14), (13, 5), (14, 5),
             (15, 3), (15, 16), (16, 3), (16, 17), (17, 18), (17, 20), (18, 19), (18, 17), (19, 18), (20, 21), (20, 23),
             (21, 22), (21, 20), (22, 21), (23, 24), (23, 25), (24, 26), (25, 26), (26, 27), (26, 28), (27, 29), (28, 29),
             (29, 30), (29, 31), (30, 32), (31, 32), (32, 33), (32, 34), (33, 37), (34, 35), (34, 36), (35, 37), (36, 37),
             (37, 38), (37, 39), (38, 40), (39, 40), (40, 41), (40, 3), (41, 3), (42, 43)]
mau = Fn("calculate_mauchly_test", "calculate_mauchly_test", "repeated-measures/rust/src/stats/mauchly_test.rs:29", "Rust",
         mau_nodes, mau_edges, predicates={1, 3, 4, 5, 6, 7, 8, 9, 11, 13, 15, 16, 17, 18, 20, 21, 23, 26, 29, 32, 34, 37, 40},
         entry=1, exit_=43)

# Segmen per variabel (mulai setelah node 6, berakhir sebelum kembali ke 6).
V_OK = [7, 8, 9, 10, 11]            # ditemukan pada record pertama, bernilai angka
V_EMPTY = [7, 11, 12]               # record_group kosong
V_NULL = [7, 8, 9, 7, 11, 12]       # nilai bukan angka (null)
V_ABSENT = [7, 8, 7, 11, 12]        # kunci tidak ada di record mana pun
V_SPLIT = [7, 8, 7, 8, 9, 10, 11]   # kunci ada di record kedua
V_EXHAUST_FOUND = [7, 11]           # loop record habis lalu found = true (tak layak)


def subject(*vars_):
    seq = [5, 6]
    for v in vars_:
        seq += v + [6]
    return seq + [13, 14]


LOOPS = [17, 18, 19, 18, 17, 20, 21, 22, 21, 20]
TAIL = dict(w=[23, 25, 26, 27], gg=[29, 31], hf=[32, 34, 36], chi=[37, 38], design=[40, 41])


def tail(**over):
    t = {**TAIL, **over}
    return t["w"] + t["gg"] + t["hf"] + t["chi"] + t["design"]


def measure(subjects, n_ok=True, **over):
    seq = [3, 4]
    for s in subjects:
        seq += s
    seq += [5, 15]
    if not n_ok:
        return seq
    return seq + [16] + LOOPS + tail(**over)


def mau_path(*measures):
    seq = [1]
    for m in measures:
        seq += m
    return seq + [3, 42, 43]


S2 = [subject(V_OK, V_OK), subject(V_OK, V_OK)]
ORC = "testing/whitebox/oracle/oracle-rm-mauchly.json"
mau.path("MAU-J01", mau_path(measure(S2)), "gambar51 (15 subjek, 4 level, 1 measure)",
         "W .6189, chi 6.1035, df 5, Sig .2975, GG .7467, HF .8957, LB .3333", "SPSS 27 (rm_gambar51.xlsx)", "mau_j01_dasar_gambar51")
mau.path("MAU-J02", [1, 2, 43], "parse_within_subject_factors gagal", "Err", "-", "-", False,
         "parse_within_subject_factors hanya gagal bila Regex::new gagal (PWF-J1, tak layak).")
mau.path("MAU-J03", [1, 3, 42, 43], "nama variabel tanpa format measure", "Ok, tests kosong", "spesifikasi",
         "mau_j03_tanpa_measure")
mau.path("MAU-J04", [1, 3, 4, 3, 42, 43], "measure dengan 1 level", "Ok, tests kosong (butuh >= 2 level)",
         "spesifikasi (komentar: need at least 2 levels)", "mau_j04_satu_level")
mau.path("MAU-J05", mau_path([3, 4, 5, 15]), "tanpa subjek (subject_data = [])", "Ok, tests kosong",
         "spesifikasi (Not enough data)", "mau_j05_tanpa_subjek")
mau.path("MAU-J06", mau_path([3, 4, 5, 6, 13, 14, 5, 15]), "measure tanpa variabel", "-", "-", "-", False,
         "factors.len() >= 2 sudah dijamin P3, sehingga loop var_names tidak pernah kosong.")
mau.path("MAU-J07", mau_path(measure([subject(V_OK, V_OK), subject(V_EMPTY, V_EMPTY)])),
         "gambar51, record subjek 15 kosong", "W .6102, GG .7430, HF .9039 (subjek 15 dikeluarkan, listwise)",
         f"R listwise_tanpa_subjek15 ({ORC})", "mau_j07_record_kosong")
mau.path("MAU-J08", mau_path(measure([subject(V_SPLIT, V_SPLIT), subject(V_OK, V_OK)])),
         "gambar51, tiap subjek dipecah ke dua record", "sama dengan J01", "SPSS 27 (rm_gambar51.xlsx)", "mau_j08_record_terpecah")
mau.path("MAU-J09", mau_path(measure([subject(V_OK, V_NULL), subject(V_OK, V_OK)])),
         "gambar51, perlakuan2 subjek 1 = null", "W .5056, GG .6866, HF .8176 (subjek 1 dikeluarkan, listwise)",
         f"R listwise_tanpa_subjek1 ({ORC})", "mau_j09_nilai_null")
mau.path("MAU-J10", mau_path(measure([subject(V_OK, V_OK), subject(V_OK, V_EXHAUST_FOUND)])),
         "loop record habis tanpa break, found = true", "-", "-", "-", False,
         "found hanya bernilai true lewat break (node 10); bila loop record habis (7 -> 11), found selalu false, "
         "sehingga 7 -> 11 selalu diikuti 11 -> 12.")
mau.path("MAU-J11", mau_path([3, 4, 5, 6] + V_OK + [6] + V_OK + [6, 13, 5, 15]), "panjang baris != n_vars", "-", "-", "-", False,
         "Setiap variabel menambah tepat satu nilai (angka atau 0.0), sehingga panjang baris selalu n_vars.")
mau.path("MAU-J12", mau_path(measure([subject(V_OK, V_OK)], n_ok=False)), "satu subjek", "Ok, tests kosong",
         "spesifikasi (Not enough data)", "mau_j12_satu_subjek")
mau.path("MAU-J13", mau_path(measure(S2, n_ok=False) + [16]), "n_vars < 2", "-", "-", "-", False,
         "n_vars = factors.len() >= 2 (P3).")
mau.path("MAU-J14", mau_path(measure(S2)[:measure(S2).index(17)] + [17, 20, 21, 22, 21, 20] + tail()), "loop baris matriks nol kali",
         "-", "-", "-", False, "n_subjects >= 2 (P11).")
mau.path("MAU-J15", mau_path(measure(S2)[:measure(S2).index(17)] + [17, 18, 17, 20, 21, 22, 21, 20] + tail()),
         "baris data kosong", "-", "-", "-", False, "Setiap baris berisi n_vars >= 2 nilai.")
mau.path("MAU-J16", mau_path(measure(S2)[:measure(S2).index(17)] + [17, 18, 19, 18, 17, 20] + tail()), "loop centering nol kali",
         "-", "-", "-", False, "n_subjects >= 2 (P11).")
mau.path("MAU-J17", mau_path(measure(S2)[:measure(S2).index(17)] + [17, 18, 19, 18, 17, 20, 21, 20] + tail()),
         "loop kolom centering nol kali", "-", "-", "-", False, "n_vars >= 2 (P12).")
mau.path("MAU-J18", mau_path(measure(S2, w=[23, 24, 26, 28], gg=[29, 30], chi=[37, 39])),
         "y_ij = a_i + b_j (S_t = 0), n = 5, k = 4", "W = 0; LB = 1/3", "spesifikasi (konvensi W = 0 untuk matriks singular, rm_model.rs)",
         "mau_j18_st_nol")
mau.path("MAU-J19", mau_path(measure(S2, w=[23, 25, 26, 28], chi=[37, 39])), "y2 = y1 + 5 (kontras singular), n = 4, k = 3",
         "W = 0; GG .5; HF .5; LB .5", f"R kontras_singular ({ORC})", "mau_j19_kontras_singular")
mau.path("MAU-J20", mau_path(measure(S2, gg=[29, 30])), "gambar51 x 1e-5", "W .6189, GG .7467, HF .8957 (invarian skala)",
         f"SPSS 27 gambar51 + R skala_1e_5 ({ORC})", "mau_j20_skala_kecil")
mau.path("MAU-J21", mau_path(measure(S2, hf=[32, 33])), "n = k = 4", "GG .6520, HF 1 (rumus HF, dibatasi 1)",
         f"R n_sama_k ({ORC})", "mau_j21_n_sama_k")
mau.path("MAU-J22", mau_path(measure(S2, hf=[32, 34, 35])), "|den| < 1e-12 dengan n > k", "-", "-", "-", False,
         "Untuk n > k dan GG <= 1: den = p(n - 1 - p GG) >= p(n - k) > 0.")
mau.path("MAU-J23", mau_path(measure(S2, chi=[37, 39])), "chi tak hingga dengan W > 0", "-", "-", "-", False,
         "W > 0 berhingga memberi -(n-1-c) ln W berhingga; chi tak hingga hanya lewat W <= 0 (J18, J19).")
mau.path("MAU-J24", mau_path(measure(S2), measure(S2, design=[40])), "dataset a (2 measure, waktu 3 level)",
         "cemas W .8590 ... stres W .9975 (14 nilai)", "SPSS 27 (rm_a.xlsx)", "mau_j24_dua_measure")

# Uji tambahan (bukan anggota basis): struktur keputusan sama dengan
# kombinasi J07/J08, dicatat terpisah.
MAU_EXTRA = [dict(id="MAU-T1", scenario="gambar51, kunci perlakuan4 subjek 15 tidak ada di record",
                  expected="W .6102, GG .7430, HF .9039 (subjek 15 dikeluarkan, listwise)",
                  oracle=f"R listwise_tanpa_subjek15 ({ORC})", test="mau_t1_kunci_tidak_ada",
                  nodes="J01 dengan segmen variabel 7-8-7-11-12 (kombinasi linear J07 dan J08)")]

# ---------------------------------------------------------------------------
# 4. emptyFactorCells (MV, services/empty-cells.ts:13)
efc = Fn("emptyFactorCells", "emptyFactorCells", "multivariate/services/empty-cells.ts:13", "TypeScript",
         nodes={1: "if factors.length < 2 (P1)", 2: "return null", 3: "n, cells, levels", 4: "for i < n (P2)",
                5: "values; if values.some(missing) (P3)", 6: "if otherSlices.some(missing) (P4)",
                7: "levels.add, cells.add", 8: "total; return {empty, total}", 9: "keluar"},
         edges=[(1, 2), (1, 3), (2, 9), (3, 4), (4, 5), (4, 8), (5, 4), (5, 6), (6, 4), (6, 7), (7, 4), (8, 9)],
         predicates={1, 4, 5, 6}, entry=1, exit_=9)
efc.path("EFC-J1", [1, 2, 9], "1 faktor", "null", "spesifikasi (JSDoc: < 2 faktor -> null)", "EFC-J1")
efc.path("EFC-J2", [1, 3, 4, 8, 9], "2 faktor, 0 baris", "{empty: 0, total: 0}", "spesifikasi (hitung tangan)", "EFC-J2")
efc.path("EFC-J3", [1, 3, 4, 5, 4, 8, 9], "2 faktor, faktor hilang", "{empty: 0, total: 0}", "spesifikasi (listwise)", "EFC-J3")
efc.path("EFC-J4", [1, 3, 4, 5, 6, 4, 8, 9], "2 faktor, DV hilang", "{empty: 0, total: 0}", "spesifikasi (listwise)", "EFC-J4")
efc.path("EFC-J5", [1, 3, 4, 5, 6, 7, 4, 8, 9], "2x2, 3 sel terisi", "{empty: 1, total: 4}", "spesifikasi (hitung tangan)", "EFC-J5")

# ---------------------------------------------------------------------------
# 5. known_matrix (MV, wasm/constructor.rs:654)
km = Fn("known_matrix", "known_matrix", "multivariate/rust/src/wasm/constructor.rs:654", "Rust",
        nodes={1: "rows.ok_or_else(..)? (P1)", 2: "return Err(missing)", 3: "if rows.len() != p (P2)",
               4: "|| any row.len() != p (P3)", 5: "return Err(ukuran)", 6: "m; if any !finite (P4)", 7: "return Err(angka)",
               8: "if any m_ii <= 0 (P5)", 9: "return Err(diagonal)", 10: "scale; for i in 0..p (P6)",
               11: "for j in i+1..p (P7)", 12: "if |m_ij - m_ji| > 1e-12 scale (P8)", 13: "return Err(simetris)",
               14: "if cholesky().is_none() (P9)", 15: "return Err(definit positif)", 16: "return Ok(m)", 17: "keluar"},
        edges=[(1, 2), (1, 3), (2, 17), (3, 5), (3, 4), (4, 5), (4, 6), (5, 17), (6, 7), (6, 8), (7, 17), (8, 9), (8, 10),
               (9, 17), (10, 11), (10, 14), (11, 12), (11, 10), (12, 13), (12, 11), (13, 17), (14, 15), (14, 16), (15, 17), (16, 17)],
        predicates={1, 3, 4, 6, 8, 10, 11, 12, 14}, entry=1, exit_=17)
km.path("KM-J01", [1, 2, 17], "rows = None", "Err 'is missing'", "spesifikasi (pesan galat)", "km_j01_tidak_ada")
km.path("KM-J02", [1, 3, 5, 17], "p = 2, 3 baris", "Err 'must be 2 x 2'", "spesifikasi", "km_j02_jumlah_baris")
km.path("KM-J03", [1, 3, 4, 5, 17], "p = 2, baris kedua 1 kolom", "Err 'must be 2 x 2'", "spesifikasi", "km_j03_panjang_baris")
km.path("KM-J04", [1, 3, 4, 6, 7, 17], "berisi NaN", "Err 'every entry must be a number'", "spesifikasi", "km_j04_nan")
km.path("KM-J05", [1, 3, 4, 6, 8, 9, 17], "diagonal 0", "Err 'diagonal entries ... greater than 0'", "spesifikasi", "km_j05_diagonal")
km.path("KM-J06", [1, 3, 4, 6, 8, 10, 14, 16, 17], "p = 0 (matriks 0 x 0)", "Ok (0 x 0)",
        "spesifikasi (tak ada syarat dilanggar)", "km_j06_p_nol")
km.path("KM-J07", [1, 3, 4, 6, 8, 10, 11, 10, 14, 16, 17], "[[4]]", "Ok([[4]])", "matematis (4 > 0)", "km_j07_p_satu")
km.path("KM-J08", [1, 3, 4, 6, 8, 10, 11, 12, 13, 17], "[[2, 1], [0.5, 2]]", "Err 'must be symmetric'",
        "matematis (m12 != m21)", "km_j08_tidak_simetris")
km.path("KM-J09", [1, 3, 4, 6, 8, 10, 11, 12, 11, 10, 11, 10, 14, 15, 17], "[[1, 2], [2, 1]]",
        "Err 'not positive definite'", "R: eigen = 3, -1", "km_j09_tidak_definit_positif")
km.path("KM-J10", [1, 3, 4, 6, 8, 10, 11, 12, 11, 10, 11, 10, 14, 16, 17], "Sigma_A (K1, 4 x 4)", "Ok(Sigma_A)",
        "R: eigen Sigma_A > 0 (known-sigma.R, K1)", "km_j10_sigma_a")

FUNCTIONS = [tdf, pwf, mau, efc, km]


def main():
    out = {}
    for fn in FUNCTIONS:
        metrics = fn.check()
        (HERE / f"{fn.key}.mmd").write_text(fn.mermaid(), encoding="utf-8")
        (HERE / f"{fn.key}.dot").write_text(fn.dot(metrics), encoding="utf-8")
        out[fn.key] = dict(file=fn.file, lang=fn.lang, **metrics, predicates=sorted(fn.predicates),
                           node_labels={str(k): v for k, v in fn.nodes.items()},
                           feasible=sum(p["feasible"] for p in fn.paths), infeasible=sum(not p["feasible"] for p in fn.paths),
                           paths=[{k: v for k, v in p.items() if k != "seq"} | {"nodes": "-".join(map(str, p["seq"]))}
                                  for p in fn.paths])
        print(f"{fn.key:32s} N={metrics['N']:2d} E={metrics['E']:2d} V(G)=E-N+2={metrics['V_EN']:2d} "
              f"predikat+1={metrics['V_P']:2d} rank={metrics['rank']:2d} layak={out[fn.key]['feasible']:2d} "
              f"tak-layak={out[fn.key]['infeasible']:2d}")
    out["calculate_mauchly_test"]["extra"] = MAU_EXTRA
    (HERE / "basis-path.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
