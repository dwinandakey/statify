# Pembanding kedua CI simultan T²: paket CRAN MVTests (Bulut, 2023).
# OneSampleHT2 dan TwoSamplesHT2(Homogenity = TRUE) menghitung selang T²
# simultan dengan rumus Johnson & Wichern (Result 5.3 / Result 6.2); MVTests
# tidak menghitung selang Bonferroni.
# TwoSamplesHT2(Homogenity = FALSE) memakai selang dari aproksimasi F dengan ν
# Nel–van der Merwe, berbeda dari Statify (Result 6.4, khi-kuadrat), sehingga
# hanya dicatat sebagai informasi (kolom method).
#
# Pemakaian (root repo): Rscript testing/fitur-v4/r/ci_mvtests.R

suppressPackageStartupMessages(library(MVTests, warn.conflicts = FALSE))
data_dir <- "testing/glm-mv-reference/data"
out_file <- "testing/fitur-v4/r/ci_mvtests_r.csv"

rows <- list()
add <- function(config, method, ci) {
  rows[[length(rows) + 1]] <<- data.frame(config = config, method = method, dv = rownames(ci),
                                          t2_lower = ci$Lower, t2_upper = ci$Upper)
}

mv1 <- read.csv(file.path(data_dir, "hotelling 1 populasi.csv"))[, c("mpg", "disp", "hp", "wt")]
add("mv1ci", "OneSampleHT2", OneSampleHT2(mv1, mu0 = c(20, 200, 150, 3), alpha = 0.05)$CI)
add("mv1ci10", "OneSampleHT2", OneSampleHT2(mv1, mu0 = c(20, 200, 150, 3), alpha = 0.10)$CI)

mv3 <- read.csv(file.path(data_dir, "hotelling berpasangan (data asli).csv"))
d <- na.omit(data.frame(d_kedalaman1_minus_kedalaman2 = mv3$kedalaman1 - mv3$kedalaman2,
                        d_ukuran1_minus_ukuran2 = mv3$ukuran1 - mv3$ukuran2))
add("mv3ci", "OneSampleHT2", OneSampleHT2(d, mu0 = c(0, 0), alpha = 0.05)$CI)
add("mv3dci", "OneSampleHT2", OneSampleHT2(d, mu0 = c(8, 3), alpha = 0.05)$CI)

mv2 <- na.omit(read.csv(file.path(data_dir, "hotelling 2 populasi independen.csv")))
X <- mv2[, c("x1", "x2", "x3", "x4")]
add("mv2ci", "TwoSamplesHT2(Homogenity=TRUE)", TwoSamplesHT2(X, mv2$jk, alpha = 0.05, Homogenity = TRUE)$CI)
add("mv2dci", "TwoSamplesHT2(Homogenity=TRUE)", TwoSamplesHT2(X, mv2$jk, alpha = 0.05, Homogenity = TRUE)$CI)
add("mv2wci-info", "TwoSamplesHT2(Homogenity=FALSE), Nel-van der Merwe; bukan metode Statify",
    TwoSamplesHT2(X, mv2$jk, alpha = 0.05, Homogenity = FALSE)$CI)

out <- do.call(rbind, rows)
out$t2_lower <- sprintf("%.17g", out$t2_lower)
out$t2_upper <- sprintf("%.17g", out$t2_upper)
write.csv(out, out_file, row.names = FALSE, quote = TRUE)
cat(R.version.string, "| MVTests", as.character(packageVersion("MVTests")), "\n")
cat("ditulis:", out_file, nrow(out), "baris\n")
