# mv9 (v5 B1): One-Way MANOVA dengan p = 3 DV dan satu faktor 4 level, data
# tak seimbang (n = 5, 7, 6, 8; N = 26), sehingga df hipotesis = 3, s = 3 dan
# df2 Wilks' Lambda (aproksimasi Rao) pecahan. Data deterministik (rumus,
# tanpa bilangan acak), dibulatkan 1 desimal.
#
# Pemakaian (root repo): Rscript testing/glm-mv-reference/make_mv9.R
# Keluaran:
#   testing/glm-mv-reference/data/one-way manova tiga dv empat level.csv
#   testing/glm-mv-reference/results/mv9-r/mv9_r.csv (statistik uji R dasar)

sizes <- c(5, 7, 6, 8)
g <- rep(1:4, times = sizes)
i <- seq_along(g)
eff1 <- c(0, 1.5, 3.0, 1.0)[g]
eff2 <- c(0, -1.0, 2.0, 2.5)[g]
eff3 <- c(0, 0.5, -1.5, 3.0)[g]
y1 <- round(20 + eff1 + 2.0 * sin(1.3 * i) + 0.8 * cos(0.7 * i^1.1), 1)
y2 <- round(15 + eff2 + 1.6 * cos(1.1 * i) + 0.5 * y1 / 10 + sin(0.4 * i^1.3), 1)
y3 <- round(30 + eff3 + 2.5 * sin(0.9 * i + 1) - 0.3 * y2 / 5 + cos(1.7 * i), 1)
d <- data.frame(y1 = y1, y2 = y2, y3 = y3, kelompok = g)
out_data <- "testing/glm-mv-reference/data/one-way manova tiga dv empat level.csv"
write.csv(d, out_data, row.names = FALSE, quote = FALSE)

dir.create("testing/glm-mv-reference/results/mv9-r", showWarnings = FALSE, recursive = TRUE)
d$kelompok <- factor(d$kelompok)
fit <- manova(cbind(y1, y2, y3) ~ kelompok, data = d)
rows <- list()
for (test in c("Pillai", "Wilks", "Hotelling-Lawley", "Roy")) {
  st <- summary(fit, test = test)$stats["kelompok", ]
  f <- unname(st["approx F"]); df1 <- unname(st["num Df"]); df2 <- unname(st["den Df"])
  pow <- 1 - pf(qf(0.95, df1, df2), df1, df2, ncp = f * df1)
  rows[[test]] <- data.frame(test = test, value = unname(st[2]), f = f, df1 = df1, df2 = df2,
                             sig = unname(st["Pr(>F)"]), noncent = f * df1, power = pow)
}
res <- do.call(rbind, rows)
num <- sapply(res, is.numeric)
res_out <- res; res_out[num] <- lapply(res[num], function(v) sprintf("%.17g", v))
write.csv(res_out, "testing/glm-mv-reference/results/mv9-r/mv9_r.csv", row.names = FALSE)
cat(R.version.string, "\n")
cat("ukuran kelompok:", table(d$kelompok), "\n")
print(res, digits = 10)
