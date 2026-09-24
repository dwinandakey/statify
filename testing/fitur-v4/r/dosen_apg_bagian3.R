# Investigasi dosen APG, Bagian 3 (Sum of Squares Type I, II, III, IV).
#
# mv6 (two-way manova tak seimbang, tanpa sel kosong), per DV Y1A1 dan Y2A1,
# model penuh faktorA * faktorB:
#   Type I : anova() (berurutan: faktorA, faktorB, faktorA:faktorB);
#            Intercept Type I = n·ȳ² (tidak dicetak anova(); dihitung langsung).
#   Type II: car::Anova(type = 2).
#   Type III: car::Anova(type = 3) dengan contr.sum (termasuk Intercept).
#   Type IV: tidak ada di R dasar/car; tanpa sel kosong Type IV = Type III.
# RM tak seimbang (testing/fitur-v4/data/rm-c-tak-seimbang.csv, sesi p1–p3,
# between metode 7 dan 10): SS Intercept antarsubjek dan SS sesi (within)
# untuk Type I vs Type III, untuk menunjukkan bahwa keduanya seharusnya
# berbeda pada data tak seimbang.
#
# Pemakaian (root repo): Rscript testing/fitur-v4/r/dosen_apg_bagian3.R
# Keluaran: testing/fitur-v4/r/dosen_apg_bagian3_r.csv (SS 17 digit)

suppressPackageStartupMessages(library(car))
out_file <- "testing/fitur-v4/r/dosen_apg_bagian3_r.csv"
rows <- list()
add <- function(data, type, dv, source, ss) {
  rows[[length(rows) + 1]] <<- data.frame(data = data, type = type, dv = dv, source = source, ss = sprintf("%.17g", ss))
}

mv6 <- read.csv("testing/glm-mv-reference/data/two-way manova tak seimbang.csv")
mv6$faktorA <- factor(mv6$faktorA); mv6$faktorB <- factor(mv6$faktorB)
cat("mv6: n =", nrow(mv6), "; ukuran sel:\n"); print(table(mv6$faktorA, mv6$faktorB))
for (dv in c("Y1A1", "Y2A1")) {
  f <- as.formula(paste(dv, "~ faktorA * faktorB"))
  a1 <- anova(lm(f, data = mv6))
  y <- mv6[[dv]]
  add("mv6", "I", dv, "Intercept", length(y) * mean(y)^2)
  add("mv6", "I", dv, "faktorA", a1["faktorA", "Sum Sq"])
  add("mv6", "I", dv, "faktorB", a1["faktorB", "Sum Sq"])
  add("mv6", "I", dv, "faktorA*faktorB", a1["faktorA:faktorB", "Sum Sq"])
  a2 <- Anova(lm(f, data = mv6), type = 2)
  add("mv6", "II", dv, "faktorA", a2["faktorA", "Sum Sq"])
  add("mv6", "II", dv, "faktorB", a2["faktorB", "Sum Sq"])
  add("mv6", "II", dv, "faktorA*faktorB", a2["faktorA:faktorB", "Sum Sq"])
  fit3 <- lm(f, data = mv6, contrasts = list(faktorA = contr.sum, faktorB = contr.sum))
  a3 <- Anova(fit3, type = 3)
  add("mv6", "III", dv, "Intercept", a3["(Intercept)", "Sum Sq"])
  add("mv6", "III", dv, "faktorA", a3["faktorA", "Sum Sq"])
  add("mv6", "III", dv, "faktorB", a3["faktorB", "Sum Sq"])
  add("mv6", "III", dv, "faktorA*faktorB", a3["faktorA:faktorB", "Sum Sq"])
  add("mv6", "Error", dv, "Error", a3["Residuals", "Sum Sq"])
  cat(sprintf("%s: Type I A=%.6f B=%.6f AB=%.6f | Type II A=%.6f B=%.6f AB=%.6f | Type III A=%.6f B=%.6f AB=%.6f Int=%.6f | Int(I)=%.6f\n",
              dv, a1["faktorA", "Sum Sq"], a1["faktorB", "Sum Sq"], a1["faktorA:faktorB", "Sum Sq"],
              a2["faktorA", "Sum Sq"], a2["faktorB", "Sum Sq"], a2["faktorA:faktorB", "Sum Sq"],
              a3["faktorA", "Sum Sq"], a3["faktorB", "Sum Sq"], a3["faktorA:faktorB", "Sum Sq"], a3["(Intercept)", "Sum Sq"],
              length(y) * mean(y)^2))
}

# RM tak seimbang: antarsubjek memakai jumlah p1 + p2 + p3 dibagi √3 (skala
# SPSS: kontras rata-rata ternormalisasi), within "sesi" memakai kontras
# polinomial ortonormal (uji multivariat/univariat terhadap Intercept).
rm <- read.csv("testing/fitur-v4/data/rm-c-tak-seimbang.csv")
rm$metode <- factor(rm$metode)
Y <- as.matrix(rm[, c("p1", "p2", "p3")])
avg <- drop(Y %*% rep(1 / sqrt(3), 3))
cat("RM tak seimbang: ukuran metode:", paste(table(rm$metode), collapse = ", "), "\n")
# Intercept antarsubjek: Type I = n·ȳ² ; Type III (contr.sum) dari car.
int_I <- length(avg) * mean(avg)^2
fitb <- lm(avg ~ metode, data = rm, contrasts = list(metode = contr.sum))
int_III <- Anova(fitb, type = 3)["(Intercept)", "Sum Sq"]
add("rm-c-tak-seimbang", "I", "between", "Intercept", int_I)
add("rm-c-tak-seimbang", "III", "between", "Intercept", int_III)
# Within "sesi" (Sphericity Assumed): SS = jumlah SS Intercept dari tiap
# kontras polinomial ortonormal; Type I memakai rata-rata tertimbang (n·z̄²),
# Type III rata-rata tak tertimbang (car type 3, contr.sum).
P <- contr.poly(3)
ss_I <- 0; ss_III <- 0
for (j in 1:2) {
  z <- drop(Y %*% P[, j])
  ss_I <- ss_I + length(z) * mean(z)^2
  ss_III <- ss_III + Anova(lm(z ~ metode, data = rm, contrasts = list(metode = contr.sum)), type = 3)["(Intercept)", "Sum Sq"]
}
add("rm-c-tak-seimbang", "I", "within", "sesi", ss_I)
add("rm-c-tak-seimbang", "III", "within", "sesi", ss_III)
cat(sprintf("RM tak seimbang: Intercept Type I = %.6f, Type III = %.6f; sesi Type I = %.6f, Type III = %.6f\n", int_I, int_III, ss_I, ss_III))

write.csv(do.call(rbind, rows), out_file, row.names = FALSE)
cat(R.version.string, "; car", as.character(packageVersion("car")), "\nditulis:", out_file, "\n")
