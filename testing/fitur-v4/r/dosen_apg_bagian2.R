# Investigasi dosen APG, Bagian 2 (matriks kovarians pada uji T²), R dasar.
#
# Uji satu populasi H₀: μ = μ₀:
#   S (pembagi n − 1), T² = n (x̄ − μ₀)ᵀ S⁻¹ (x̄ − μ₀),
#   F = (n − p)/((n − 1)p) · T² ~ F(p, n − p);
#   Hotelling's Trace (Statify/SPSS) = tr(H E⁻¹) dengan H = n(x̄ − μ₀)(x̄ − μ₀)ᵀ,
#   E = (n − 1)S, sehingga T² = (n − 1) · Hotelling's Trace.
# Pembanding (Σ dianggap diketahui = S, sampel besar):
#   χ² = n (x̄ − μ₀)ᵀ S⁻¹ (x̄ − μ₀) ~ χ²_p  (nilainya sama dengan T², tetapi
#   rujukannya χ²_p, bukan (n − 1)p/(n − p) · F(p, n − p)).
#   Juga versi MLE: Σ̂ = (n − 1)/n · S (pembagi n).
#
# Data:
#   mv1: testing/glm-mv-reference/data/hotelling 1 populasi.csv, DV mpg, disp,
#        hp, wt, μ₀ = (20, 200, 150, 3) (divalidasi SPSS 27);
#   sleeping dog: testing/fitur-v4/data/sleeping-dog-kontras.csv, d1–d3, μ₀ = 0.
#
# Pemakaian (root repo): Rscript testing/fitur-v4/r/dosen_apg_bagian2.R
# Keluaran: testing/fitur-v4/r/dosen_apg_bagian2_r.csv

out_file <- "testing/fitur-v4/r/dosen_apg_bagian2_r.csv"
rows <- list()

one <- function(label, X, mu0) {
  X <- as.matrix(na.omit(X)); n <- nrow(X); p <- ncol(X)
  xbar <- colMeans(X); S <- cov(X); d <- xbar - mu0
  t2 <- drop(n * t(d) %*% solve(S) %*% d)
  H <- n * d %*% t(d); E <- (n - 1) * S
  trace <- sum(diag(H %*% solve(E)))
  f <- (n - p) / ((n - 1) * p) * t2
  p_f <- pf(f, p, n - p, lower.tail = FALSE)
  chi <- t2
  p_chi <- pchisq(chi, p, lower.tail = FALSE)
  S_mle <- (n - 1) / n * S
  chi_mle <- drop(n * t(d) %*% solve(S_mle) %*% d)
  p_chi_mle <- pchisq(chi_mle, p, lower.tail = FALSE)
  crit_t2 <- (n - 1) * p / (n - p) * qf(0.95, p, n - p)
  crit_chi <- qchisq(0.95, p)
  cat(sprintf("%s: n = %d, p = %d\n  Hotelling's Trace = %.10f, (n-1)·trace = %.10f, T² = %.10f\n  F = %.10f (df %d, %d), p = %.6g\n  χ² (S) = %.10f, p(χ²_%d) = %.6g;  χ² (MLE, pembagi n) = %.10f, p = %.6g\n  batas kritis 5%%: T² > %.4f, χ² > %.4f\n",
              label, n, p, trace, (n - 1) * trace, t2, f, p, n - p, p_f, chi, p, p_chi, chi_mle, p_chi_mle, crit_t2, crit_chi))
  for (k in c("n", "p", "trace", "t2", "f", "p_f", "chi", "p_chi", "chi_mle", "p_chi_mle", "crit_t2", "crit_chi")) {
    rows[[length(rows) + 1]] <<- data.frame(data = label, item = k, value = sprintf("%.17g", get(k)))
  }
}

mv1 <- read.csv("testing/glm-mv-reference/data/hotelling 1 populasi.csv")
one("mv1", mv1[, c("mpg", "disp", "hp", "wt")], c(20, 200, 150, 3))
dog <- read.csv("testing/fitur-v4/data/sleeping-dog-kontras.csv")
one("sleeping-dog", dog[, c("d1", "d2", "d3")], c(0, 0, 0))

write.csv(do.call(rbind, rows), out_file, row.names = FALSE)
cat(R.version.string, "\nditulis:", out_file, "\n")
