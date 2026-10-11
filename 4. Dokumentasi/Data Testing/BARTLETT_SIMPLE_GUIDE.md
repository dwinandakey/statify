# Bartlett Test - Simple Test Cases

## 🎯 Purpose
Data sederhana untuk testing Bartlett Test implementation dengan hasil yang mudah diprediksi.

---

## 📁 File Data

### **1. bartlett_minimal.csv** (RECOMMENDED FOR FIRST TEST)
**Size:** 15 rows, 3 columns
**Best for:** Quick testing, debugging

```
id    group    score
1     1        10, 12, 11, 13, 9     (5 obs)
2     2        15, 17, 16, 18, 14    (5 obs)
3     3        20, 22, 21, 23, 19    (5 obs)
```

**Characteristics:**
- ✅ **3 groups** (equal size: 5 each)
- ✅ **Homogeneous variances** (all groups: variance ≈ 2.5)
- ✅ **Simple numbers** (easy to verify manually)
- ✅ **All NUMERIC** (no string issues)

**Expected Result:**
- Chi-square ≈ 0 (very small)
- p-value > 0.05 (variances equal)
- df = 2

---

### **2. bartlett_simple.csv**
**Size:** 60 rows, 6 columns
**Best for:** Full feature testing

```
All variables NUMERIC (1, 2, 3 instead of "Young", "Middle", "Old")
age_group: 1=Young, 2=Middle, 3=Old
gender: 1=Male, 2=Female
```

---

## 🧪 Testing Steps

### **STEP 1: Import Minimal Data**

1. **Open Statify**
2. **File > Import CSV**
3. Select: `bartlett_minimal.csv`
4. Click **Import**

---

### **STEP 2: Verify Variables**

**Go to Variable View:**

| Name | Type | Decimals | Measure | Label |
|------|------|----------|---------|-------|
| id | NUMERIC | 0 | Scale | ID |
| group | NUMERIC | 0 | **Ordinal** | Group Number |
| score | NUMERIC | 0 | **Scale** | Test Score |

**IMPORTANT:** Set measure untuk `group`:
1. Click cell di kolom **Measure** untuk row `group`
2. Select **Ordinal** dari dropdown
3. (Atau biarkan default, numeric biasanya auto-detect)

---

### **STEP 3: Open Bartlett Test**

1. **Analyze > Compare Means > Bartlett's Test**
2. Modal should open without errors

---

### **STEP 4: Select Variables**

**Available Variables should show:**
- ✅ id
- ✅ group (should NOT be disabled/grey)
- ✅ score

**Action:**
1. **Double-click `score`** → Moves to **Test Variable(s)**
2. **Double-click `group`** → Moves to **Grouping Variable**

**OR Manual Drag:**
- Drag `score` to "Test Variable(s)" box
- Drag `group` to "Grouping Variable" box

---

### **STEP 5: Run Analysis**

1. (Optional) Go to **Options** tab
2. ☑ Check "Descriptive statistics"
3. Go back to **Variables** tab
4. Click **OK**

---

### **STEP 6: Check Output**

**Expected Output Window:**

```
BARTLETT TEST OF HOMOGENEITY OF VARIANCES

Test Variable(s): score
Grouping Variable: group

Bartlett Test Results
┌──────────┬────────────┬────┬───────┐
│ Variable │ Chi-Square │ df │  Sig. │
├──────────┼────────────┼────┼───────┤
│ score    │    0.000   │ 2  │ 1.000 │
└──────────┴────────────┴────┴───────┘

Interpretation: p = 1.000 > 0.05
→ Fail to reject H₀
→ Variances are HOMOGENEOUS (equal) ✅

Descriptive Statistics
┌───────┬───┬──────┬─────┬──────────┐
│ Group │ N │ Mean │ SD  │ Variance │
├───────┼───┼──────┼─────┼──────────┤
│   1   │ 5 │ 11.0 │ 1.6 │   2.5    │
│   2   │ 5 │ 16.0 │ 1.6 │   2.5    │
│   3   │ 5 │ 21.0 │ 1.6 │   2.5    │
└───────┴───┴──────┴─────┴──────────┘
```

---

## ✅ Validation Checklist

### **Before Running Test:**
- [ ] Modal opens without "Worker error"
- [ ] All 3 variables visible in Available Variables
- [ ] `group` is NOT grey/disabled
- [ ] `score` is NOT grey/disabled
- [ ] Double-click moves variables correctly

### **After Running Test:**
- [ ] No error messages
- [ ] Output window shows results
- [ ] Chi-square value appears (should be ≈ 0)
- [ ] p-value appears (should be ≈ 1.000)
- [ ] df = 2 (k-1 where k=3 groups)

---

## 🔍 Manual Calculation (For Verification)

### **Data Summary:**
```
Group 1: 10, 12, 11, 13, 9  → Mean=11, Variance=2.5
Group 2: 15, 17, 16, 18, 14 → Mean=16, Variance=2.5
Group 3: 20, 22, 21, 23, 19 → Mean=21, Variance=2.5
```

### **Bartlett Formula:**
```
sp² = [(n₁-1)s₁² + (n₂-1)s₂² + (n₃-1)s₃²] / (N-k)
    = [(4×2.5) + (4×2.5) + (4×2.5)] / (15-3)
    = [10 + 10 + 10] / 12
    = 30 / 12
    = 2.5

M = (N-k)×ln(sp²) - Σ(nᵢ-1)×ln(sᵢ²)
  = 12×ln(2.5) - [4×ln(2.5) + 4×ln(2.5) + 4×ln(2.5)]
  = 12×ln(2.5) - 12×ln(2.5)
  = 0

C = 1 + 1/(3(k-1)) × [Σ(1/(nᵢ-1)) - 1/(N-k)]
  = 1 + 1/6 × [3/4 - 1/12]
  = 1 + 1/6 × 8/12
  = 1.111

T = M / C = 0 / 1.111 = 0

p-value = P(χ² > 0) = 1.000
```

**Result:** p = 1.000 > 0.05 → Variances equal ✅

---

## 🐛 Troubleshooting

### **Issue 1: `group` variable grey/disabled**

**Problem:** Filter tidak mengizinkan numeric grouping
**Check:**
```typescript
// In VariablesTab.tsx
// Should allow NUMERIC for factor/grouping
```

**Workaround:**
- Set `group` measure to **Ordinal** di Variable View
- Or restart browser with hard refresh

---

### **Issue 2: "Worker error occurred"**

**Possible causes:**
1. Worker module type not set
2. Chi-square library failed to load
3. Browser doesn't support module workers

**Solutions:**
- Check browser console (F12) for detailed error
- Try in Chrome/Edge (best ES module support)
- Clear cache and hard refresh

---

### **Issue 3: Variables not moving**

**Check:**
1. Variable is not disabled (should be black, not grey)
2. Double-click event is registered
3. Try manual drag instead

---

## 📊 Advanced Test Cases

### **Case 1: Heterogeneous Variances**

Create new CSV with DIFFERENT variances:
```csv
id,group,score
1,1,10
2,1,10
3,1,10
4,1,10
5,1,10
6,2,10
7,2,20
8,2,10
9,2,20
10,2,10
11,3,15
12,3,15
13,3,15
14,3,15
15,3,15
```

**Expected:**
- Group 1: variance = 0
- Group 2: variance = 33.3 (high variability)
- Group 3: variance = 0
- **Chi-square > 0**
- **p-value < 0.05** (variances NOT equal)

---

### **Case 2: Two Groups Only**

```csv
id,group,score
1,1,10
2,1,12
3,1,11
4,1,13
5,1,9
6,2,15
7,2,17
8,2,16
9,2,18
10,2,14
```

**Expected:**
- df = 1 (k-1 = 2-1)
- Test still works
- Compare with F-test for 2 groups

---

## 📚 Requirements for Bartlett Test

### **Minimum Requirements:**
- ✅ **Minimum 2 groups** (k ≥ 2)
- ✅ **Minimum 2 observations per group** (nᵢ ≥ 2)
- ✅ **Numeric test variable** (continuous/scale)
- ✅ **Categorical grouping variable** (nominal/ordinal)

### **Assumptions:**
- ⚠️ **Normality:** Data should be approximately normal
  - Bartlett is sensitive to non-normality
  - Use Shapiro-Wilk test to check normality first
  - If not normal, use Levene's Test instead

### **Recommended Sample Sizes:**
- Small: n ≥ 5 per group (like our test data)
- Medium: n ≥ 10 per group
- Large: n ≥ 30 per group (for better power)

---

## 🎓 Statistical Interpretation

### **Hypothesis:**
- **H₀:** σ₁² = σ₂² = ... = σₖ² (all variances equal)
- **H₁:** At least one variance differs

### **Decision Rule:**
| p-value | Decision | Interpretation |
|---------|----------|----------------|
| p < 0.05 | Reject H₀ | Variances NOT equal (heterogeneous) |
| p ≥ 0.05 | Fail to reject H₀ | Variances equal (homogeneous) |

### **Practical Use:**
1. **Before ANOVA:** Check homogeneity of variance assumption
   - If p > 0.05: Use regular ANOVA ✅
   - If p < 0.05: Use Welch's ANOVA or transform data

2. **Quality Control:** Check consistency across batches
   - If p > 0.05: Process is consistent ✅
   - If p < 0.05: Investigate variability sources

---

## ✅ Success Criteria

**Test is working correctly if:**
1. ✅ Modal opens without errors
2. ✅ Variables can be selected
3. ✅ Analysis runs without crashes
4. ✅ Output shows:
   - Chi-square statistic
   - Degrees of freedom
   - p-value (Sig.)
5. ✅ Results match manual calculation
6. ✅ Descriptive statistics appear (if checked)

---

**Start with `bartlett_minimal.csv` for quickest validation!** 🚀

If this works, then move to `bartlett_simple.csv` for full testing.
