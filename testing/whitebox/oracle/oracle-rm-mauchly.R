# Oracle R untuk basis path calculate_mauchly_test (RM) dan uji skala
# epsilon RmModel.
#
# Rumus (Mauchly 1940; Greenhouse-Geisser 1959; Huynh-Feldt 1976, bentuk
# SPSS untuk desain within-only, df galat n - 1):
#   S_t = C S C' (C kontras ortonormal, (k-1) x k), p = k - 1
#   W   = det(S_t) / (tr(S_t)/p)^p
#   chi = -(n - 1 - (2p^2 + p + 2)/(6p)) ln W,  df = p(p+1)/2 - 1
#   GG  = (sum lambda)^2 / (p sum lambda^2)
#   HF  = min(1, (n p GG - 2) / (p (n - 1 - p GG)))
# Prosedur ini lebih dulu dicocokkan dengan SPSS 27 (gambar51, dataset a)
# dan W dengan stats::mauchly.test.
#
# Jalankan dari akar repositori:
#   Rscript testing/whitebox/oracle/oracle-rm-mauchly.R
suppressPackageStartupMessages(library(jsonlite))
options(digits = 17)

contr <- function(k) t(qr.Q(qr(cbind(1, diag(k))[, 1:k]))[, -1])  # ortonormal, baris jumlah 0
sph <- function(Y) {
  Y <- as.matrix(Y); n <- nrow(Y); k <- ncol(Y); p <- k - 1
  C <- contr(k)
  St <- C %*% cov(Y) %*% t(C)
  lam <- eigen(St, symmetric = TRUE, only.values = TRUE)$values
  W <- det(St) / (sum(diag(St)) / p)^p
  chi <- -(n - 1 - (2 * p^2 + p + 2) / (6 * p)) * log(W)
  gg <- sum(lam)^2 / (p * sum(lam^2))
  hf <- min(1, (n * p * gg - 2) / (p * (n - 1 - p * gg)))
  list(n = n, k = k, w = W, chi_square = chi, df = p * (p + 1) / 2 - 1, gg = gg, hf = hf, lb = 1 / p,
       w_mauchly_test = if (n > k - 1 && W > 0) unname(mauchly.test(lm(Y ~ 1), X = ~1)$statistic) else NA)
}

root <- "testing/glm-rm-reference"
spss <- fromJSON(file.path(root, "spss-output/spss-values.json"), simplifyVector = FALSE)
spss_m <- function(dataset, measure, field) {
  for (r in spss) if (r$dataset == dataset && r$table == "mauchly" && r$measure == measure && r$field == field) return(r$value)
  NA_real_
}

g51 <- read.csv(file.path(root, "data/gambar51.csv"))
a <- read.csv(file.path(root, "data/rm_a.csv"))

# ---- 1. Validasi terhadap SPSS 27 ---------------------------------------
val <- list()
chk <- function(label, r, s) val[[length(val) + 1]] <<- list(label = label, r = r, spss = s, diff = abs(r - s), pass = abs(r - s) <= 1e-3)
for (case in list(list("gambar51", "anjing", g51), list("a", "cemas", a[, c("cemas1", "cemas2", "cemas3")]),
                  list("a", "stres", a[, c("stres1", "stres2", "stres3")]))) {
  s <- sph(case[[3]])
  chk(paste(case[[1]], case[[2]], "W"), s$w, spss_m(case[[1]], case[[2]], "Mauchly's W"))
  chk(paste(case[[1]], case[[2]], "W (mauchly.test)"), s$w_mauchly_test, spss_m(case[[1]], case[[2]], "Mauchly's W"))
  chk(paste(case[[1]], case[[2]], "chi"), s$chi_square, spss_m(case[[1]], case[[2]], "Approx. Chi-Square"))
  chk(paste(case[[1]], case[[2]], "GG"), s$gg, spss_m(case[[1]], case[[2]], "Greenhouse-Geisser"))
  chk(paste(case[[1]], case[[2]], "HF"), s$hf, spss_m(case[[1]], case[[2]], "Huynh-Feldt"))
  chk(paste(case[[1]], case[[2]], "LB"), s$lb, spss_m(case[[1]], case[[2]], "Lower-bound"))
}
cat(sprintf("Validasi rumus R vs SPSS 27: %d nilai, lulus %d, selisih maks %.3e\n",
            length(val), sum(sapply(val, `[[`, "pass")), max(sapply(val, `[[`, "diff"))))
for (v in val) cat(sprintf("  %-32s R %.15g  SPSS %.15g  %s\n", v$label, v$r, v$spss, if (v$pass) "LULUS" else "GAGAL"))

# ---- 2. Kasus basis path ------------------------------------------------
cases <- list(
  # Listwise (seperti SPSS): subjek dengan nilai hilang dikeluarkan.
  listwise_tanpa_subjek1  = sph(g51[-1, ]),
  listwise_tanpa_subjek15 = sph(g51[-15, ]),
  # Skala: epsilon dan W invarian terhadap Y -> c Y (c = 1e-5).
  skala_1e_5 = sph(g51 * 1e-5),
  # n = k = 4 (cabang n <= k).
  n_sama_k = sph(data.frame(x1 = c(10, 8, 12, 9), x2 = c(12, 11, 12, 14), x3 = c(15, 13, 18, 16), x4 = c(11, 14, 13, 12))),
  # Kontras singular: y2 = y1 + 5 (k = 3, n = 4) -> det(S_t) = 0.
  kontras_singular = sph(data.frame(y1 = c(2, 4, 7, 11), y2 = c(7, 9, 12, 16), y3 = c(5, 9, 6, 12)))
)
for (nm in names(cases)) {
  s <- cases[[nm]]
  cat(sprintf("\n%s: n %d k %d  W %.15g  chi %.15g  GG %.15g  HF %.15g  LB %.15g\n", nm, s$n, s$k, s$w, s$chi_square, s$gg, s$hf, s$lb))
}
write_json(list(generated_with = R.version.string, validation = val, cases = cases),
           "testing/whitebox/oracle/oracle-rm-mauchly.json", auto_unbox = TRUE, digits = NA, pretty = TRUE)
