# CI simultan T² dan Bonferroni dengan R dasar (paket stats saja: qf, qt,
# qchisq, qnorm, cov, colMeans), sebagai pembanding fitur v4 Statify.
# Rumus: Johnson & Wichern, Applied Multivariate Statistical Analysis, ed. 6
#   satu populasi (bab 5.4, Result 5.3) dan berpasangan (bab 6.2):
#     x̄ᵢ ± sqrt(p(n−1)/(n−p) F(p, n−p; α)) sqrt(sᵢᵢ/n);  Bonferroni t(n−1; α/(2p))
#   dua populasi Σ₁ = Σ₂ (bab 6.3, Result 6.2):
#     (x̄₁ᵢ − x̄₂ᵢ) ± c sqrt((1/n₁ + 1/n₂) s_pooled,ᵢᵢ),
#     c² = (n₁+n₂−2)p/(n₁+n₂−p−1) F(p, n₁+n₂−p−1; α);  Bonferroni t(n₁+n₂−2; α/(2p))
#   dua populasi Σ₁ ≠ Σ₂ (bab 6.3, Result 6.4, sampel besar):
#     (x̄₁ᵢ − x̄₂ᵢ) ± sqrt(χ²(p; α)) sqrt(s₁ᵢᵢ/n₁ + s₂ᵢᵢ/n₂);  Bonferroni z(α/(2p))
# Keluaran: testing/fitur-v4/r/ci_simultan_r.csv (angka 17 digit).
#
# Pemakaian (root repo): Rscript testing/fitur-v4/r/ci_simultan.R

data_dir <- "testing/glm-mv-reference/data"
out_file <- "testing/fitur-v4/r/ci_simultan_r.csv"

one_sample <- function(X, alpha) {
  X <- as.matrix(na.omit(X)); n <- nrow(X); p <- ncol(X)
  m <- colMeans(X); S <- cov(X); se <- sqrt(diag(S) / n)
  c_t2 <- sqrt(p * (n - 1) / (n - p) * qf(1 - alpha, p, n - p))
  c_bon <- qt(1 - alpha / (2 * p), n - 1)
  list(estimate = m, se = se, c_t2 = c_t2, c_bon = c_bon)
}

two_sample <- function(X1, X2, alpha, unequal) {
  X1 <- as.matrix(X1); X2 <- as.matrix(X2)
  n1 <- nrow(X1); n2 <- nrow(X2); p <- ncol(X1)
  d <- colMeans(X1) - colMeans(X2); S1 <- cov(X1); S2 <- cov(X2)
  if (unequal) {
    se <- sqrt(diag(S1) / n1 + diag(S2) / n2)
    c_t2 <- sqrt(qchisq(1 - alpha, p))
    c_bon <- qnorm(1 - alpha / (2 * p))
  } else {
    Sp <- ((n1 - 1) * S1 + (n2 - 1) * S2) / (n1 + n2 - 2)
    se <- sqrt((1 / n1 + 1 / n2) * diag(Sp))
    c_t2 <- sqrt((n1 + n2 - 2) * p / (n1 + n2 - p - 1) * qf(1 - alpha, p, n1 + n2 - p - 1))
    c_bon <- qt(1 - alpha / (2 * p), n1 + n2 - 2)
  }
  list(estimate = d, se = se, c_t2 = c_t2, c_bon = c_bon)
}

rows <- list()
add <- function(config, r) {
  for (i in seq_along(r$estimate)) {
    rows[[length(rows) + 1]] <<- data.frame(
      config = config, dv = names(r$estimate)[i],
      estimate = r$estimate[i], std_error = r$se[i],
      t2_lower = r$estimate[i] - r$c_t2 * r$se[i], t2_upper = r$estimate[i] + r$c_t2 * r$se[i],
      bonferroni_lower = r$estimate[i] - r$c_bon * r$se[i], bonferroni_upper = r$estimate[i] + r$c_bon * r$se[i],
      t2_critical = r$c_t2, bonferroni_critical = r$c_bon)
  }
}

mv1 <- read.csv(file.path(data_dir, "hotelling 1 populasi.csv"))[, c("mpg", "disp", "hp", "wt")]
add("mv1ci", one_sample(mv1, 0.05))
add("mv1ci10", one_sample(mv1, 0.10))

mv3 <- read.csv(file.path(data_dir, "hotelling berpasangan (data asli).csv"))
d <- na.omit(data.frame(d_kedalaman1_minus_kedalaman2 = mv3$kedalaman1 - mv3$kedalaman2,
                        d_ukuran1_minus_ukuran2 = mv3$ukuran1 - mv3$ukuran2))
add("mv3ci", one_sample(d, 0.05))
add("mv3dci", one_sample(d, 0.05))

mv2 <- na.omit(read.csv(file.path(data_dir, "hotelling 2 populasi independen.csv")))
X1 <- mv2[mv2$jk == 1, c("x1", "x2", "x3", "x4")]
X2 <- mv2[mv2$jk == 2, c("x1", "x2", "x3", "x4")]
add("mv2ci", two_sample(X1, X2, 0.05, FALSE))
add("mv2dci", two_sample(X1, X2, 0.05, FALSE))
add("mv2wci", two_sample(X1, X2, 0.05, TRUE))

out <- do.call(rbind, rows)
num_cols <- sapply(out, is.numeric)
out[num_cols] <- lapply(out[num_cols], function(v) sprintf("%.17g", v))
write.csv(out, out_file, row.names = FALSE, quote = FALSE)
cat(R.version.string, "\n")
cat("ditulis:", out_file, nrow(out), "baris\n")
