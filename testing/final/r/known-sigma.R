# Validasi uji χ² dengan Σ diketahui (Bagian 1) terhadap R dasar.
# Masukan : testing/final/bagian1/known-sigma-statify.json
#           (keluaran testing/final/harness/known-sigma-wasm.mjs)
# Keluaran: testing/final/bagian1/known-sigma-vs-r.txt dan known-sigma-r.csv
# Jalankan dari root repo:
#   "C:/Program Files/R/R-4.3.2/bin/Rscript.exe" testing/final/r/known-sigma.R
#
# Rumus (R dasar, tanpa paket statistik tambahan):
#   satu populasi / berpasangan: χ² = n·mahalanobis(x̄, μ₀, Σ)
#   dua populasi:                χ² = mahalanobis(x̄₁ − x̄₂, δ₀, V),
#                                V = (1/n₁ + 1/n₂)Σ atau Σ₁/n₁ + Σ₂/n₂
#   Sig. = pchisq(χ², p, lower.tail = FALSE)
#   interval: est ± sqrt(qchisq(1 − α, p))·√Vᵢᵢ dan est ± qnorm(1 − α/(2p))·√Vᵢᵢ
suppressMessages(library(jsonlite))

DATA <- "testing/glm-mv-reference/data"
cases <- fromJSON("testing/final/bagian1/known-sigma-statify.json", simplifyVector = FALSE)
TOL <- 1e-8
mat <- function(x) do.call(rbind, lapply(x, function(r) unlist(r)))

lines <- c(
  "Validasi uji χ² Σ diketahui terhadap R dasar",
  sprintf("R %s; kriteria: selisih mutlak < %g", paste(R.version$major, R.version$minor, sep = "."), TOL),
  sprintf("Statify: %s", "testing/final/bagian1/known-sigma-statify.json (WASM MV, get_known_covariance_test)"),
  ""
)
rows <- list()
all_pass <- TRUE
n_values <- 0

for (c in cases) {
  d <- read.csv(file.path(DATA, c$csv))
  alpha <- c$alpha
  s <- c$statify
  if (!is.null(c$pairs)) {
    X <- sapply(c$pairs, function(pr) d[[pr[[1]]]] - d[[pr[[2]]]])
    X <- X[complete.cases(X), , drop = FALSE]
  } else {
    dep <- unlist(c$dep)
    keep <- complete.cases(d[, c(dep, if (!is.null(c$factor)) c$factor)])
    d <- d[keep, ]
    X <- as.matrix(d[, dep])
  }
  p <- ncol(X)
  delta0 <- if (is.null(c$delta0)) rep(0, p) else unlist(c$delta0)
  if (c$design == "one_sample") {
    n <- nrow(X)
    mu0 <- unlist(c$mu0)
    Sigma <- mat(c$sigma)
    xbar <- colMeans(X)
    chi <- n * mahalanobis(xbar, mu0, Sigma)
    V <- Sigma / n
    est <- xbar
    est_statify <- unlist(lapply(s$intervals, `[[`, "estimate"))
    shift <- rep(0, p)
    ns <- n
  } else {
    lv <- sort(unique(d[[c$factor]]))
    X1 <- X[d[[c$factor]] == lv[1], , drop = FALSE]
    X2 <- X[d[[c$factor]] == lv[2], , drop = FALSE]
    n1 <- nrow(X1); n2 <- nrow(X2)
    V <- if (c$design == "two_sample_common") (1 / n1 + 1 / n2) * mat(c$sigma) else mat(c$sigma1) / n1 + mat(c$sigma2) / n2
    est <- colMeans(X1) - colMeans(X2)
    chi <- mahalanobis(est, delta0, V)
    # Statify menguji pada data dengan δ₀ dikurangkan dari level pertama;
    # formatter menambahkan δ₀ kembali pada estimasi dan batas interval.
    shift <- delta0
    ns <- c(n1, n2)
  }
  sig <- pchisq(chi, p, lower.tail = FALSE)
  crit <- sqrt(qchisq(1 - alpha, p))
  z <- qnorm(1 - alpha / (2 * p))
  se <- sqrt(diag(V))
  r_vals <- c(chi = chi, sig = sig, crit = crit, z = z,
              setNames(est, paste0("est", 1:p)), setNames(se, paste0("se", 1:p)),
              setNames(est - crit * se, paste0("chiL", 1:p)), setNames(est + crit * se, paste0("chiU", 1:p)),
              setNames(est - z * se, paste0("bonL", 1:p)), setNames(est + z * se, paste0("bonU", 1:p)))
  iv <- s$intervals
  g <- function(k) unlist(lapply(iv, `[[`, k))
  s_vals <- c(chi = s$chi_square, sig = s$significance, crit = s$chi_square_critical, z = s$z_critical,
              setNames(g("estimate") + shift, paste0("est", 1:p)), setNames(g("std_error"), paste0("se", 1:p)),
              setNames(g("chi_square_lower") + shift, paste0("chiL", 1:p)), setNames(g("chi_square_upper") + shift, paste0("chiU", 1:p)),
              setNames(g("bonferroni_lower") + shift, paste0("bonL", 1:p)), setNames(g("bonferroni_upper") + shift, paste0("bonU", 1:p)))
  diffs <- abs(r_vals - s_vals[names(r_vals)])
  n_ok <- identical(as.numeric(unlist(s$sample_sizes)), as.numeric(ns)) && s$df == p
  pass <- all(diffs < TOL) && n_ok
  all_pass <- all_pass && pass
  n_values <- n_values + length(diffs)
  lines <- c(lines, sprintf("%-7s %-45s n = %-7s p = %d  χ² = %.10g  Sig. = %.6g  nilai = %d  selisih maks = %.3g  %s",
                            c$id, c$note, paste(ns, collapse = "/"), p, chi, sig, length(diffs), max(diffs), if (pass) "LULUS" else "GAGAL"))
  # Pemeriksaan sifat.
  if (c$id %in% c("K1-S", "K4-S")) {
    t2_r <- nrow(X) * mahalanobis(colMeans(X), unlist(c$mu0), cov(X))
    ok <- abs(s$chi_square - t2_r) < TOL && abs(s$chi_square - c$t2_multivariate_tests) < TOL
    all_pass <- all_pass && ok
    lines <- c(lines, sprintf("        sifat Σ = S: χ² Statify = %.12g, T² R = %.12g, T² Multivariate Tests = %.12g  %s",
                              s$chi_square, t2_r, c$t2_multivariate_tests, if (ok) "LULUS" else "GAGAL"))
  }
  if (c$id == "K2-S") {
    Sp <- ((n1 - 1) * cov(X1) + (n2 - 1) * cov(X2)) / (n1 + n2 - 2)
    t2_r <- mahalanobis(est, rep(0, p), (1 / n1 + 1 / n2) * Sp)
    ok <- abs(s$chi_square - t2_r) < TOL && abs(s$chi_square - c$t2_multivariate_tests) < TOL
    all_pass <- all_pass && ok
    lines <- c(lines, sprintf("        sifat Σ = S_pooled: χ² Statify = %.12g, T² R = %.12g, T² Multivariate Tests = %.12g  %s",
                              s$chi_square, t2_r, c$t2_multivariate_tests, if (ok) "LULUS" else "GAGAL"))
  }
  if (c$id == "K1-I") {
    direct <- nrow(X) * sum((colMeans(X) - unlist(c$mu0))^2)
    ok <- abs(s$chi_square - direct) < TOL * max(1, direct)
    all_pass <- all_pass && ok
    lines <- c(lines, sprintf("        sifat Σ = I: χ² Statify = %.12g, n·Σ(x̄ − μ₀)² = %.12g (selisih relatif %.3g)  %s",
                              s$chi_square, direct, abs(s$chi_square - direct) / direct, if (ok) "LULUS" else "GAGAL"))
  }
  rows[[length(rows) + 1]] <- data.frame(case = c$id, key = names(r_vals), r = unname(r_vals), statify = unname(s_vals[names(r_vals)]), abs_diff = unname(diffs))
}
lines <- c(lines, "", sprintf("Total %d kasus, %d nilai dibandingkan. Hasil: %s", length(cases), n_values, if (all_pass) "SEMUA LULUS" else "ADA YANG GAGAL"))
writeLines(lines, "testing/final/bagian1/known-sigma-vs-r.txt", useBytes = FALSE)
write.csv(do.call(rbind, rows), "testing/final/bagian1/known-sigma-r.csv", row.names = FALSE)
cat(lines, sep = "\n")
