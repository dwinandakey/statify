# BARTLETT TEST - Panduan Lengkap dengan Bahasa Indonesia

## 📊 APA ITU BARTLETT TEST?

Bartlett Test adalah uji statistik untuk memeriksa apakah **varians (keberagaman data)** di beberapa kelompok itu **sama** atau **berbeda**.

---

## 🎯 KONSEP DASAR

### **1. Test Variable (Variabel yang Diuji)**

Variabel **NUMERIK** yang ingin kita uji kehomogenan variansnya.

**Karakteristik:**
- ✅ Harus numerik/kontinu
- ✅ Measure: **Scale**
- ✅ Bisa lebih dari 1 variabel

**Contoh:**
- Nilai ujian
- Tinggi badan
- Berat badan
- Waktu reaksi
- Tekanan darah

**Dalam data bartlett_minimal.csv:**
- `score` ← **INI TEST VARIABLE**

---

### **2. Grouping Variable (Variabel Pengelompokan)**

Variabel **KATEGORIKAL** yang membagi data menjadi kelompok-kelompok.

**Karakteristik:**
- ✅ Bisa numerik (kode: 1,2,3) atau string ("A","B","C")
- ✅ Measure: **Nominal** atau **Ordinal** (atau bahkan Scale jika kode numerik)
- ✅ Hanya 1 variabel
- ✅ Minimal 2 kelompok
- ✅ Setiap kelompok minimal 2 observasi

**Contoh:**
- Kelas (A, B, C atau 1, 2, 3)
- Gender (Male, Female atau 1, 2)
- Kelompok umur (Young, Middle, Old atau 1, 2, 3)

**Dalam data bartlett_minimal.csv:**
- `group` ← **INI GROUPING VARIABLE**

---

## 🧮 CARA KERJA BARTLETT TEST

### **Pertanyaan yang Dijawab:**

> "Apakah **variabilitas** (penyebaran data) di semua kelompok **SAMA**?"

### **Contoh Sederhana:**

Anda punya 3 kelas dan ingin tahu apakah **variabilitas nilai** di setiap kelas sama:

```
Kelas 1: [10, 12, 11, 13, 9]   → Rata-rata=11, Varians=2.5 (tidak terlalu menyebar)
Kelas 2: [15, 17, 16, 18, 14]  → Rata-rata=16, Varians=2.5 (tidak terlalu menyebar)
Kelas 3: [20, 22, 21, 23, 19]  → Rata-rata=21, Varians=2.5 (tidak terlalu menyebar)
```

**Bartlett Test mengecek:**
- ✅ Varians Kelas 1 = Varians Kelas 2 = Varians Kelas 3?

**Hasil:**
- Jika p-value > 0.05 → **YA, varians SAMA** (homogen) ✅
- Jika p-value < 0.05 → **TIDAK, varians BERBEDA** (heterogen) ❌

---

## 📐 RUMUS BARTLETT (Step by Step)

### **Input Data:**
```
Test Variable: score = [10, 12, 11, 13, 9,  15, 17, 16, 18, 14,  20, 22, 21, 23, 19]
Grouping:      group = [ 1,  1,  1,  1, 1,   2,  2,  2,  2,  2,   3,  3,  3,  3,  3]
```

### **LANGKAH 1: Kelompokkan Data**

```
Kelompok 1: [10, 12, 11, 13, 9]   → N₁ = 5
Kelompok 2: [15, 17, 16, 18, 14]  → N₂ = 5
Kelompok 3: [20, 22, 21, 23, 19]  → N₃ = 5

Total: N = 15
Jumlah kelompok: k = 3
```

### **LANGKAH 2: Hitung Varians Setiap Kelompok**

```
Kelompok 1:
  Mean = (10+12+11+13+9)/5 = 11
  Varians = [(10-11)²+(12-11)²+(11-11)²+(13-11)²+(9-11)²] / 4
          = [1+1+0+4+4] / 4
          = 2.5

Kelompok 2:
  Mean = 16
  Varians = 2.5

Kelompok 3:
  Mean = 21
  Varians = 2.5
```

**Hasil:** s₁² = 2.5, s₂² = 2.5, s₃² = 2.5

### **LANGKAH 3: Hitung Pooled Variance (Varians Gabungan)**

```
sp² = [(N₁-1)×s₁² + (N₂-1)×s₂² + (N₃-1)×s₃²] / (N-k)
    = [(4×2.5) + (4×2.5) + (4×2.5)] / (15-3)
    = [10 + 10 + 10] / 12
    = 30 / 12
    = 2.5
```

### **LANGKAH 4: Hitung Statistik M**

```
M = (N-k)×ln(sp²) - [(N₁-1)×ln(s₁²) + (N₂-1)×ln(s₂²) + (N₃-1)×ln(s₃²)]
  = 12×ln(2.5) - [4×ln(2.5) + 4×ln(2.5) + 4×ln(2.5)]
  = 12×0.916 - [4×0.916 + 4×0.916 + 4×0.916]
  = 10.997 - 10.997
  = 0
```

### **LANGKAH 5: Hitung Faktor Koreksi C**

```
C = 1 + [1/(3(k-1))] × [Σ(1/(Nᵢ-1)) - 1/(N-k)]
  = 1 + [1/(3×2)] × [(1/4 + 1/4 + 1/4) - 1/12]
  = 1 + [1/6] × [0.75 - 0.0833]
  = 1 + [1/6] × 0.6667
  = 1 + 0.1111
  = 1.1111
```

### **LANGKAH 6: Hitung Statistik Bartlett (T)**

```
T = M / C
  = 0 / 1.1111
  = 0
```

### **LANGKAH 7: Hitung P-value**

```
df = k - 1 = 3 - 1 = 2

T mengikuti distribusi chi-square dengan df=2
p-value = P(χ² > 0) = 1.000
```

---

## 💡 INTERPRETASI HASIL

### **Hipotesis:**
- **H₀** (Null Hypothesis): Semua varians SAMA (σ₁² = σ₂² = σ₃²)
- **H₁** (Alternative): Minimal ada 1 varians yang BERBEDA

### **Decision Rule:**

| p-value | Keputusan | Interpretasi | Tindakan |
|---------|-----------|--------------|----------|
| **≥ 0.05** | Terima H₀ | Varians HOMOGEN (sama) ✅ | ANOVA bisa dilanjutkan |
| **< 0.05** | Tolak H₀ | Varians HETEROGEN (beda) ❌ | Gunakan Welch ANOVA atau transform data |

### **Contoh Interpretasi:**

**Case 1: p = 1.000**
```
✅ p-value (1.000) > 0.05
→ Terima H₀
→ Varians di semua kelompok SAMA (homogen)
→ Asumsi ANOVA terpenuhi
→ Bisa lanjut ANOVA
```

**Case 2: p = 0.012**
```
❌ p-value (0.012) < 0.05
→ Tolak H₀
→ Varians di kelompok BERBEDA (heterogen)
→ Asumsi ANOVA dilanggar
→ Gunakan alternatif: Welch's ANOVA atau Games-Howell post-hoc
```

---

## 🔍 BEDANYA TEST VARIABLE vs GROUPING VARIABLE

### **Analogi: Ujian di 3 Kelas**

Anda ingin tahu: *"Apakah **variabilitas nilai** di semua kelas sama?"*

```
┌─────────────────────────────────────────┐
│  DATA MENTAH                            │
├─────────────┬──────────┬────────────────┤
│ Student ID  │  Kelas   │  Nilai Ujian  │ ← Ini yang kita analisis
│             │ (Group)  │   (Score)     │
├─────────────┼──────────┼────────────────┤
│     1       │    A     │      85       │
│     2       │    A     │      88       │
│     3       │    A     │      82       │
│     4       │    B     │      90       │
│     5       │    B     │      93       │
│     6       │    B     │      87       │
│     7       │    C     │      75       │
│     8       │    C     │      80       │
│     9       │    C     │      72       │
└─────────────┴──────────┴────────────────┘
             ↑            ↑
      GROUPING VAR   TEST VAR
```

**Pertanyaan:**
- "Apakah **penyebaran nilai** di Kelas A, B, C itu sama?"

**Bukan pertanyaan:**
- ❌ "Apakah **rata-rata nilai** di A, B, C sama?" ← Ini pertanyaan ANOVA
- ❌ "Apakah nilai saya lebih tinggi dari orang lain?" ← Bukan ini

**Bartlett Test fokus pada VARIABILITAS, bukan MEAN!**

---

## 📋 PERBEDAAN DENGAN UJI LAIN

| Uji | Yang Diuji | Kapan Digunakan |
|-----|-----------|----------------|
| **Bartlett Test** | Varians sama atau beda? | Sebelum ANOVA, cek asumsi homogenitas |
| **Levene's Test** | Varians sama atau beda? | Alternatif Bartlett jika data tidak normal |
| **ANOVA** | Mean sama atau beda? | Setelah Bartlett (jika varians homogen) |
| **T-Test** | Mean 2 grup sama atau beda? | Hanya 2 kelompok |

---

## ⚠️ ASUMSI & KETERBATASAN

### **Asumsi:**
1. ✅ Data berdistribusi **normal** di setiap kelompok
   - Bartlett **sangat sensitif** terhadap non-normalitas
   - Jika data tidak normal → gunakan **Levene's Test**

2. ✅ Observasi **independen** (tidak saling mempengaruhi)

3. ✅ Data **kontinu/numerik** untuk test variable

### **Keterbatasan:**
- ❌ Tidak robust terhadap outliers
- ❌ Tidak cocok untuk data non-normal
- ❌ Butuh minimal 2 kelompok dengan masing-masing 2+ observasi

### **Alternatif:**
- **Levene's Test**: Lebih robust, tidak se-sensitif terhadap non-normalitas
- **Brown-Forsythe Test**: Modifikasi Levene dengan median
- **F-Test**: Hanya untuk 2 kelompok

---

## 🎓 KAPAN MENGGUNAKAN BARTLETT TEST?

### **✅ Gunakan Bartlett Test jika:**
1. Data berdistribusi **normal** (sudah di-cek dengan Shapiro-Wilk)
2. Ingin **cek asumsi** sebelum ANOVA
3. Punya **3+ kelompok**
4. Butuh uji yang **powerful** (sensitive)

### **❌ JANGAN gunakan Bartlett Test jika:**
1. Data **tidak normal** → Gunakan **Levene's Test**
2. Ada **outliers** banyak → Gunakan **Brown-Forsythe**
3. Hanya **2 kelompok** → Gunakan **F-Test** (lebih sederhana)

---

## 📚 REFERENSI

1. **Bartlett, M. S. (1937)**
   "Properties of sufficiency and statistical tests"
   *Proceedings of the Royal Society of London, Series A*, 160: 268-282.

2. **Snedecor, G. W., & Cochran, W. G. (1989)**
   *Statistical Methods* (8th ed.)
   Iowa State University Press.

3. **Box, G. E. P. (1953)**
   "Non-normality and tests on variances"
   *Biometrika*, 40(3/4): 318-335.

---

## 💻 IMPLEMENTASI DI STATIFY

### **File Terkait:**
1. **Worker:** `frontend/public/workers/CompareMeans/bartlettTestWorker.js`
   - Perhitungan formula Bartlett
   - Semua komentar dalam Bahasa Indonesia

2. **Modal:** `frontend/components/Modals/Analyze/CompareMeans/BartlettTest/`
   - UI untuk input variables
   - Validasi dan error handling

3. **Hooks:**
   - `useVariableSelection.ts` - Manage variable selection
   - `useBartlettAnalysis.ts` - Orchestrate worker
   - `useTestSettings.ts` - Manage options

---

**Semoga panduan ini membantu memahami Bartlett Test! 🎉**

Untuk testing, gunakan file `bartlett_minimal.csv` yang sudah disediakan.
