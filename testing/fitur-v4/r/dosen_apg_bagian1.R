# Investigasi dosen APG, Bagian 1 (effect size dan observed power), R dasar.
#
# 1. Data IBM HR (1470 baris; DV YearsAtCompany, TotalWorkingYears,
#    MonthlyIncome; Fixed Factor Gender): uji multivariat Type III (kontras
#    sum-to-zero, seperti SPSS) untuk Intercept dan Gender:
#      H = b̂ᵀ [L (XᵀX)⁻¹ Lᵀ]⁻¹ b̂,  E = SSCP residual,  s = 1,
#      Hotelling's Trace T = tr(HE⁻¹), F = T·(df_e − p + 1)/p (eksak),
#      Partial Eta Squared = T/(1 + T) (s = 1: sama untuk keempat statistik),
#      Noncent. Parameter λ = F·df1,
#      Observed Power = 1 − pf(qf(1 − α, df1, df2), df1, df2, ncp = λ).
#    Pembanding: rumus aproksimasi di main ter-deploy (1 − 0.1/F bila F > 1).
# 2. Uji Welch dua populasi (Krishnamoorthy–Yu; data mv2 asli dan geser):
#    Observed Power dengan df2 = ν − p + 1 pecahan vs df2 dibulatkan (v4).
#
# File HR tidak ada di repo; lokasi: <folder skripsi>/dataset/
# WA_Fn-UseC_-HR-Employee-Attrition.csv (md5 ad8207459e5732574372cf8ff619883f).
# Pemakaian (root repo):
#   Rscript testing/fitur-v4/r/dosen_apg_bagian1.R "../dataset/WA_Fn-UseC_-HR-Employee-Attrition.csv"
# Keluaran: testing/fitur-v4/r/dosen_apg_bagian1_r.csv

args <- commandArgs(trailingOnly = TRUE)
hr_file <- if (length(args) >= 1) args[1] else "../dataset/WA_Fn-UseC_-HR-Employee-Attrition.csv"
out_file <- "testing/fitur-v4/r/dosen_apg_bagian1_r.csv"
alpha <- 0.05
rows <- list()
add <- function(bagian, item, value) {
  rows[[length(rows) + 1]] <<- data.frame(bagian = bagian, item = item, value = sprintf("%.17g", value))
}
power_f <- function(f, df1, df2, a = alpha) 1 - pf(qf(1 - a, df1, df2), df1, df2, ncp = f * df1)

# ── 1. IBM HR ────────────────────────────────────────────────────────────────
hr <- read.csv(hr_file)
Y <- as.matrix(hr[, c("YearsAtCompany", "TotalWorkingYears", "MonthlyIncome")])
g <- factor(hr$Gender)
X <- cbind(1, ifelse(g == levels(g)[1], 1, -1))   # contr.sum untuk 2 level
n <- nrow(Y); p <- ncol(Y); df_e <- n - ncol(X)
XtXi <- solve(crossprod(X))
B <- XtXi %*% crossprod(X, Y)
E <- crossprod(Y - X %*% B)
cat(sprintf("HR: n = %d, p = %d, df error = %d, level Gender = %s\n", n, p, df_e, paste(levels(g), collapse = ", ")))
for (term in c("Intercept", "Gender")) {
  j <- if (term == "Intercept") 1 else 2
  b <- B[j, , drop = FALSE]
  H <- t(b) %*% b / XtXi[j, j]
  T <- sum(diag(H %*% solve(E)))
  df1 <- p; df2 <- df_e - p + 1
  F <- T * df2 / df1
  eta <- T / (1 + T)
  ncp <- F * df1
  pow <- power_f(F, df1, df2)
  sig <- pf(F, df1, df2, lower.tail = FALSE)
  main_power <- if (F > 1) min(1 - 0.1 / F, 1) else 0.5
  cat(sprintf("  %-9s F = %.6f (df %d, %d), Sig. = %.6g, Partial Eta Sq. = %.6f, Noncent. = %.6f, Power = %.6f; main (1 - 0.1/F) = %.6f\n",
              term, F, df1, df2, sig, eta, ncp, pow, main_power))
  for (k in c("F", "sig", "eta", "ncp", "pow", "main_power")) add("1.2 HR", paste(term, k), get(k))
}

# ── 2. Observed Power uji Welch: df pecahan vs dibulatkan ────────────────────
welch <- function(dat) {
  dat <- na.omit(dat); dvs <- c("x1", "x2", "x3", "x4")
  X1 <- as.matrix(dat[dat$jk == 1, dvs]); X2 <- as.matrix(dat[dat$jk == 2, dvs])
  n1 <- nrow(X1); n2 <- nrow(X2); p <- ncol(X1)
  V1 <- cov(X1) / n1; V2 <- cov(X2) / n2; Vi <- solve(V1 + V2)
  d <- colMeans(X1) - colMeans(X2); t2 <- drop(t(d) %*% Vi %*% d)
  term <- function(Vk, nk) { M <- Vk %*% Vi; (sum(diag(M %*% M)) + sum(diag(M))^2) / (nk - 1) }
  nu <- 1 / ((term(V1, n1) + term(V2, n2)) / (p^2 + p))
  df2 <- nu - p + 1; f <- df2 / (p * nu) * t2
  c(nu = nu, df2 = df2, f = f,
    power_pecahan = power_f(f, p, df2), power_bulat = power_f(f, p, round(df2)))
}
for (kind in c("asli", "geser")) {
  file <- if (kind == "asli") "testing/glm-mv-reference/data/hotelling 2 populasi independen.csv" else "testing/fitur-v4/data/mv2-geser.csv"
  w <- welch(read.csv(file))
  cat(sprintf("Welch data %s: ν = %.6f, df2 = %.6f, F = %.6f, Power df pecahan = %.12f, df dibulatkan = %.12f, selisih = %.3g\n",
              kind, w["nu"], w["df2"], w["f"], w["power_pecahan"], w["power_bulat"], w["power_pecahan"] - w["power_bulat"]))
  for (k in names(w)) add(paste("1.7 Welch", kind), k, w[[k]])
}

write.csv(do.call(rbind, rows), out_file, row.names = FALSE)
cat(R.version.string, "\nditulis:", out_file, "\n")
