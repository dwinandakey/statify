# Bartlett Test - Sample Data Guide

## 📊 File Data
**File:** `bartlett_test_sample.csv`
**Lokasi:** `4. Dokumentasi/Data Testing/`

## 📋 Deskripsi Data

Data ini berisi hasil pengukuran dari **60 partisipan** yang dibagi dalam 3 kelompok umur:

| Variabel | Type | Measure | Deskripsi |
|----------|------|---------|-----------|
| **id** | Numeric | Scale | ID partisipan (1-60) |
| **age_group** | String | Ordinal | Kelompok umur: Young, Middle, Old |
| **gender** | String | Nominal | Jenis kelamin: Male, Female |
| **test_score** | Numeric | Scale | Nilai tes kognitif (0-100) |
| **reaction_time** | Numeric | Scale | Waktu reaksi dalam ms |
| **blood_pressure** | Numeric | Scale | Tekanan darah sistolik (mmHg) |

### 📈 Karakteristik Data

**Age Group Distribution:**
- Young: 20 orang (10 Male, 10 Female)
- Middle: 20 orang (10 Male, 10 Female)
- Old: 20 orang (10 Male, 10 Female)

**Test Score:**
- Young: Mean ≈ 87, variance rendah (homogen)
- Middle: Mean ≈ 80, variance sedang
- Old: Mean ≈ 69, variance rendah (homogen)

**Reaction Time:**
- Young: Mean ≈ 247ms, variance rendah
- Middle: Mean ≈ 277ms, variance sedang
- Old: Mean ≈ 316ms, variance rendah

**Blood Pressure:**
- Young: Mean ≈ 119 mmHg
- Middle: Mean ≈ 135 mmHg
- Old: Mean ≈ 145 mmHg

## 🧪 Testing Scenarios

### **Scenario 1: Test Score by Age Group**
✅ **Expected Result: Homogeneous Variances**

```
Test Variable: test_score
Grouping Variable: age_group
Expected p-value: > 0.05 (variances equal)
```

**Interpretasi:**
Varians nilai tes **relatif sama** di semua kelompok umur, meskipun mean berbeda.

---

### **Scenario 2: Reaction Time by Age Group**
⚠️ **Expected Result: Heterogeneous Variances**

```
Test Variable: reaction_time
Grouping Variable: age_group
Expected p-value: < 0.05 (variances NOT equal)
```

**Interpretasi:**
Kelompok Middle memiliki variabilitas waktu reaksi yang **lebih tinggi** dibanding Young dan Old.

---

### **Scenario 3: Blood Pressure by Gender**
✅ **Expected Result: Homogeneous Variances**

```
Test Variable: blood_pressure
Grouping Variable: gender
Expected p-value: > 0.05 (variances equal)
```

**Interpretasi:**
Varians tekanan darah **sama** antara Male dan Female dalam data ini.

---

### **Scenario 4: Multiple Variables by Age Group**
📊 **Test Multiple Variables at Once**

```
Test Variables: test_score, reaction_time, blood_pressure
Grouping Variable: age_group
```

**Expected Output:**
| Variable | Chi-Square | df | Sig. |
|----------|-----------|----|----|
| test_score | Low | 2 | > 0.05 |
| reaction_time | High | 2 | < 0.05 |
| blood_pressure | Low | 2 | > 0.05 |

---

## 📥 Cara Import Data ke Statify

### **Langkah 1: Import CSV**
1. Buka Statify
2. Menu: **File > Import CSV** atau **File > Read CSV File**
3. Pilih file: `bartlett_test_sample.csv`
4. Click **Import**

### **Langkah 2: Set Variable Properties**
Setelah import, set measure untuk setiap variabel:

1. Buka **Variable View** (tab di bawah)
2. Set **Measure** untuk setiap kolom:

| Variable | Measure | Values/Labels |
|----------|---------|---------------|
| id | Scale | - |
| age_group | Ordinal | 1=Young, 2=Middle, 3=Old |
| gender | Nominal | 1=Male, 2=Female |
| test_score | Scale | - |
| reaction_time | Scale | - |
| blood_pressure | Scale | - |

### **Langkah 3: Run Bartlett Test**
1. Menu: **Analyze > Compare Means > Bartlett's Test...**
2. **Variables Tab:**
   - Drag `test_score` ke **Test Variable(s)**
   - Drag `age_group` ke **Grouping Variable**
3. **Options Tab:**
   - ☑ Descriptive statistics (optional)
4. Click **OK**

### **Langkah 4: Interpret Results**
Check **Output** window untuk:
- **Bartlett Test Table**: Chi-square statistic, df, p-value
- **Descriptive Statistics**: N, Mean, SD, Variance per group

---

## 🎯 Expected Output Examples

### **Example 1: test_score by age_group**

**Bartlett Test of Homogeneity of Variances**

| Variable | Chi-Square | df | Sig. |
|----------|-----------|----|----|
| test_score | 2.145 | 2 | 0.342 |

**Interpretation:**
- p = 0.342 > 0.05
- **Fail to reject H₀**: Variances are **homogeneous**
- ANOVA assumption satisfied ✅

---

### **Example 2: reaction_time by age_group**

**Bartlett Test of Homogeneity of Variances**

| Variable | Chi-Square | df | Sig. |
|----------|-----------|----|----|
| reaction_time | 8.923 | 2 | 0.012 |

**Interpretation:**
- p = 0.012 < 0.05
- **Reject H₀**: Variances are **NOT homogeneous**
- Consider using Welch's ANOVA or transformation ⚠️

---

## 📚 Statistical Notes

### **When to use Bartlett's Test:**
- ✅ Testing homogeneity of variances assumption for ANOVA
- ✅ Comparing variability across groups
- ✅ Data is approximately normally distributed

### **Important:**
- Bartlett's Test is **sensitive to departures from normality**
- If data is not normal, use **Levene's Test** instead
- For k=2 groups, F-test is also an option

### **Null Hypothesis:**
H₀: σ₁² = σ₂² = ... = σₖ² (all variances are equal)

### **Alternative Hypothesis:**
H₁: At least one variance differs

### **Decision Rule:**
- If p < α (usually 0.05): Reject H₀ (variances NOT equal)
- If p ≥ α: Fail to reject H₀ (variances equal)

---

## 🔧 Troubleshooting

### **Issue: Variables not showing**
- **Solution**: Check Variable View, ensure measure is set correctly

### **Issue: "Worker error occurred"**
- **Solution**: Refresh browser (Ctrl + Shift + R), check console for details

### **Issue: "Factor variable must have at least 2 groups"**
- **Solution**: Select a grouping variable with multiple distinct values

### **Issue: "Some groups have insufficient data"**
- **Solution**: Each group needs minimum 2 observations

---

## 📖 References

1. Bartlett, M. S. (1937). "Properties of sufficiency and statistical tests". Proceedings of the Royal Society of London, Series A, 160: 268-282.

2. Snedecor, G. W., & Cochran, W. G. (1989). Statistical Methods (8th ed.). Iowa State University Press.

3. Box, G. E. P. (1953). "Non-normality and tests on variances". Biometrika, 40(3/4): 318-335.

---

**Happy Testing! 🎉**

Jika ada pertanyaan atau issue, silakan konsultasikan dengan dokumentasi atau check error di browser console.
