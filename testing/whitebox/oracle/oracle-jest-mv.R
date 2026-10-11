# Oracle R untuk test Jest GLM Multivariate (dataset sintetis A, B, C).
#
# Dataset A/B/C di multivariate/__test__/multivariate.test.ts dan
# multivariate/test/multivariate.test.ts tidak punya keluaran SPSS
# (fixtures/spss/dataset-*/README.md: "waiting for official SPSS export").
# Karena itu nilai harapan dihitung di R, dengan prosedur yang lebih dulu
# divalidasi terhadap keluaran SPSS 27 yang tersimpan
# (testing/glm-mv-reference/spss-output/spss-values.json: mv2, mv4, mv5, mv6).
#
# Jalankan dari akar repositori:
#   Rscript testing/whitebox/oracle/oracle-jest-mv.R
# Keluaran: testing/whitebox/oracle/oracle-jest-mv.json (presisi penuh)
#           dan ringkasan di stdout (disimpan sebagai oracle-jest-mv.txt).

suppressPackageStartupMessages({
  library(car)
  library(jsonlite)
})
options(digits = 17)

# ---- Statistik multivariat: fungsi R dasar (stats:::Pillai dkk.) --------
# Masukan: H (SSCP hipotesis), E (SSCP galat), df hipotesis, df galat.
mv_stats <- function(H, E, df_h, df_e) {
  eig <- Re(eigen(qr.coef(qr(E), H), symmetric = FALSE, only.values = TRUE)$values)
  eig <- pmax(eig, 0)
  rows <- list(
    "Pillai's Trace"     = stats:::Pillai(eig, df_h, df_e),
    "Wilks' Lambda"      = stats:::Wilks(eig, df_h, df_e),
    "Hotelling's Trace"  = stats:::HL(eig, df_h, df_e),
    "Roy's Largest Root" = stats:::Roy(eig, df_h, df_e)
  )
  lapply(rows, function(r) {
    list(value = unname(r[1]), f = unname(r[2]), df1 = unname(r[3]), df2 = unname(r[4]),
         sig = unname(pf(r[2], r[3], r[4], lower.tail = FALSE)))
  })
}

# Uji efek Type III (kontras sum-to-zero = parameterisasi SPSS Type III).
type3_effects <- function(formula, data) {
  op <- options(contrasts = c("contr.sum", "contr.poly"))
  on.exit(options(op))
  fit <- lm(formula, data = data)
  a <- car::Anova(fit, type = 3)
  out <- list()
  for (term in names(a$SSP)) {
    out[[term]] <- mv_stats(a$SSP[[term]], a$SSPE, a$df[[term]], a$error.df)
  }
  out
}

# Uji univariat Type III per variabel dependen (Tests of Between-Subjects Effects).
type3_univariate <- function(formula, data) {
  op <- options(contrasts = c("contr.sum", "contr.poly"))
  on.exit(options(op))
  a <- car::Anova(lm(formula, data = data), type = 3)
  res <- nrow(a)
  out <- list()
  for (term in rownames(a)[-res]) {
    out[[term]] <- list(ss = a[term, "Sum Sq"], df = a[term, "Df"],
                        ms = a[term, "Sum Sq"] / a[term, "Df"], f = a[term, "F value"],
                        sig = a[term, "Pr(>F)"])
  }
  out
}

# ---- Box's M dengan aproksimasi F (Box 1949; algoritme SPSS GLM) -------
# Sel dengan matriks kovarians singular (termasuk n_i - 1 < p) tidak ikut,
# seperti SPSS (mv4: grup n = 2 -> df1 = 3; mv6: sel n = 2 -> df1 = 18).
box_m <- function(Y, g) {
  g <- factor(g)
  Y <- as.matrix(Y)
  p <- ncol(Y)
  keep <- sapply(levels(g), function(l) {
    y <- Y[g == l, , drop = FALSE]
    nrow(y) > p && qr(cov(y))$rank == p
  })
  sel <- g %in% levels(g)[keep]
  Y <- Y[sel, , drop = FALSE]; g <- droplevels(g[sel])
  k <- nlevels(g); N <- nrow(Y)
  ni <- as.vector(table(g))
  Si <- lapply(levels(g), function(l) cov(Y[g == l, , drop = FALSE]))
  Sp <- Reduce(`+`, Map(function(S, n) (n - 1) * S, Si, ni)) / (N - k)
  M <- (N - k) * log(det(Sp)) - sum((ni - 1) * sapply(Si, function(S) log(det(S))))
  c1 <- (sum(1 / (ni - 1)) - 1 / (N - k)) * (2 * p^2 + 3 * p - 1) / (6 * (p + 1) * (k - 1))
  c2 <- (sum(1 / (ni - 1)^2) - 1 / (N - k)^2) * (p - 1) * (p + 2) / (6 * (k - 1))
  df1 <- (k - 1) * p * (p + 1) / 2
  # Keluaran SPSS 27 cocok dengan satu rumus untuk kedua tanda c2 - c1^2:
  # df2 = (df1 + 2) / |c2 - c1^2|, F = M (1 - c1 - df1/df2) / df1.
  # Cabang kedua versi buku teks (c2 < c1^2: F = df2 M / (df1 (b - M)),
  # b = df2 / (1 - c1 + 2/df2)) memberi F = 0,46753 pada mv4, sedangkan
  # SPSS 0,46554. Dataset A dan C berada di cabang c2 > c1^2, tempat kedua
  # rumus identik.
  df2 <- (df1 + 2) / abs(c2 - c1^2)
  F <- M * (1 - c1 - df1 / df2) / df1
  list(box_m = M, f = F, df1 = df1, df2 = df2, sig = pf(F, df1, df2, lower.tail = FALSE))
}

# ---- 1. Validasi prosedur R terhadap SPSS 27 ----------------------------
root <- "testing/glm-mv-reference"
spss <- fromJSON(file.path(root, "spss-output/spss-values.json"), simplifyVector = FALSE)
spss_value <- function(config, table, labels, field) {
  for (r in spss) {
    lab <- as.character(unlist(r$labels))
    if (r$config == config && r$table == table && length(lab) == length(labels) && all(lab == labels) && r$field == field) {
      return(r$value)
    }
  }
  NA_real_
}

validation <- list()
check <- function(config, table, labels, field, r_value) {
  s <- spss_value(config, table, labels, field)
  validation[[length(validation) + 1]] <<- list(
    config = config, table = table, labels = labels, field = field,
    spss = s, r = r_value, abs_diff = abs(r_value - s), pass = abs(r_value - s) <= 1e-3
  )
}
mv_fields <- c(value = "Value", f = "F", df1 = "Hypothesis df", df2 = "Error df", sig = "Sig.")
check_mv <- function(config, effects, spss_names) {
  for (term in names(spss_names)) {
    for (stat in names(effects[[term]])) {
      for (fld in names(mv_fields)) {
        check(config, "Multivariate Tests", c(spss_names[[term]], stat), mv_fields[[fld]],
              effects[[term]][[stat]][[fld]])
      }
    }
  }
}
box_fields <- c(box_m = "Box's M", f = "F", df1 = "df1", df2 = "df2", sig = "Sig.")
check_box <- function(config, b) {
  for (fld in names(box_fields)) {
    check(config, "Box's Test of Equality of Covariance Matrices", character(0), box_fields[[fld]], b[[fld]])
  }
}

d2 <- read.csv(file.path(root, "data/hotelling 2 populasi independen.csv"))
d2 <- d2[complete.cases(d2), ]
d2$jk <- factor(d2$jk)
check_mv("mv2", type3_effects(cbind(x1, x2, x3, x4) ~ jk, d2), list(jk = "jk"))
check_box("mv2", box_m(d2[, c("x1", "x2", "x3", "x4")], d2$jk))

d4 <- read.csv(file.path(root, "data/one-way manova.csv"))
d4$treatment <- factor(d4$treatment)
check_mv("mv4", type3_effects(cbind(y1, y2) ~ treatment, d4), list(treatment = "treatment"))
check_box("mv4", box_m(d4[, c("y1", "y2")], d4$treatment))

for (cfg in c("mv5", "mv6")) {
  f <- if (cfg == "mv5") "data/two-way manova.csv" else "data/two-way manova tak seimbang.csv"
  d <- read.csv(file.path(root, f))
  d$faktorA <- factor(d$faktorA); d$faktorB <- factor(d$faktorB)
  eff <- type3_effects(cbind(Y1A1, Y2A1) ~ faktorA * faktorB, d)
  check_mv(cfg, eff, list(faktorA = "faktorA", faktorB = "faktorB", "faktorA:faktorB" = "faktorA * faktorB"))
  check_box(cfg, box_m(d[, c("Y1A1", "Y2A1")], interaction(d$faktorA, d$faktorB)))
  for (dv in c("Y1A1", "Y2A1")) {
    lab <- if (dv == "Y1A1") "ultimate torque" else "ultimate strain"
    u <- type3_univariate(as.formula(paste(dv, "~ faktorA * faktorB")), d)
    for (term in c("faktorA", "faktorB", "faktorA:faktorB")) {
      spss_term <- sub(":", " * ", term)
      for (fld in c(ss = "Type III Sum of Squares", df = "df", ms = "Mean Square", f = "F", sig = "Sig.")) {
        key <- names(which(c(ss = "Type III Sum of Squares", df = "df", ms = "Mean Square", f = "F", sig = "Sig.") == fld))
        check(cfg, "Tests of Between-Subjects Effects", c(spss_term, lab), fld, u[[term]][[key]])
      }
    }
  }
}

n_val <- length(validation)
n_pass <- sum(sapply(validation, function(v) isTRUE(v$pass)))
n_na <- sum(sapply(validation, function(v) is.na(v$spss)))
max_diff <- max(sapply(validation, `[[`, "abs_diff"), na.rm = TRUE)
cat(sprintf("Validasi prosedur R vs SPSS 27: %d nilai, lulus %d (|R - SPSS| <= 0,001), tanpa nilai SPSS %d, selisih maks %.3e\n",
            n_val, n_pass, n_na, max_diff))
for (v in validation) if (!isTRUE(v$pass)) {
  cat(sprintf("  GAGAL/NA: %s | %s | %s | %s | SPSS %s | R %.17g\n", v$config, v$table,
              paste(v$labels, collapse = " / "), v$field, format(v$spss), v$r))
}

# ---- 2. Nilai harapan dataset A, B, C (sama persis dengan test Jest) ---
# Dataset A: 3 grup x 10, Y1 = 10 + 4g + noise1, Y2 = 20 + 3g + noise2.
noise1 <- c(-1.2, -0.9, -0.6, -0.3, 0.0, 0.2, 0.5, 0.8, 1.1, 1.4)
noise2 <- c(1.1, 0.8, 0.5, 0.2, 0.0, -0.1, -0.3, -0.6, -0.9, -1.2)
A <- do.call(rbind, lapply(0:2, function(g) data.frame(
  Group = c("A", "B", "C")[g + 1], Y1 = 10 + g * 4 + noise1, Y2 = 20 + g * 3 + noise2)))
A$Group <- factor(A$Group)
effA <- type3_effects(cbind(Y1, Y2) ~ Group, A)
boxA <- box_m(A[, c("Y1", "Y2")], A$Group)

# Dataset B: Group (3) x Treatment (2) x 10, kovariat Cov1, faktorial penuh + Cov1, Type III.
noise <- c(-0.7, -0.5, -0.2, -0.1, 0.0, 0.2, 0.3, 0.5, 0.7, 0.9)
B <- do.call(rbind, lapply(0:2, function(g) do.call(rbind, lapply(0:1, function(t) {
  i <- 0:9
  cov1 <- 0.5 + i * 0.3 + g * 0.2
  base <- 12 + g * 2.2 + t * 1.7
  data.frame(Group = c("A", "B", "C")[g + 1], Treatment = c("T1", "T2")[t + 1], Cov1 = cov1,
             Y1 = base + 0.5 * cov1 + noise,
             Y2 = base * 1.25 - 0.4 * cov1 + rev(noise),
             Y3 = 6 + g * 1.6 - t * 1.1 + 0.8 * cov1 + noise * 0.5)
}))))
B$Group <- factor(B$Group); B$Treatment <- factor(B$Treatment)
# Y1 - 2*Y3 = -1.0 g + 3.9 t - 1.1 Cov1 (kombinasi linear persis dari
# prediktor), sehingga residualnya nol dan SSCP galat E singular: uji
# multivariat dataset B tidak terdefinisi (car::Anova menolak). Yang dicatat:
# rank E, dan uji univariat Type III per DV.
op <- options(contrasts = c("contr.sum", "contr.poly"))
fitB <- lm(cbind(Y1, Y2, Y3) ~ Cov1 + Group * Treatment, data = B)
options(op)
E_B <- crossprod(residuals(fitB))
rankE_B <- qr(E_B, tol = 1e-9)$rank
effB_try <- tryCatch(type3_effects(cbind(Y1, Y2, Y3) ~ Cov1 + Group * Treatment, B),
                     error = function(e) conditionMessage(e))
effB <- NULL
uniB <- lapply(c(Y1 = "Y1", Y2 = "Y2", Y3 = "Y3"), function(dv)
  type3_univariate(as.formula(paste(dv, "~ Cov1 + Group * Treatment")), B))
boxB <- box_m(B[, c("Y1", "Y2", "Y3")], interaction(B$Group, B$Treatment))

# Dataset C: Species (8, 11, 13), SepalLength/SepalWidth dari sin/cos.
C <- do.call(rbind, lapply(1:3, function(s) {
  n <- c(8, 11, 13)[s]; i <- 0:(n - 1); ph <- i * 0.25; k <- s - 1
  data.frame(Species = c("setosa", "versicolor", "virginica")[s],
             SepalLength = 5 + k * 0.9 + sin(ph) * 0.3 + i * 0.03,
             SepalWidth = 3.4 - k * 0.25 + cos(ph) * 0.2 - i * 0.01)
}))
C$Species <- factor(C$Species)
effC <- type3_effects(cbind(SepalLength, SepalWidth) ~ Species, C)
boxC <- box_m(C[, c("SepalLength", "SepalWidth")], C$Species)

show <- function(name, eff, term, box) {
  cat(sprintf("\n%s, efek %s:\n", name, term))
  for (s in names(eff[[term]])) {
    e <- eff[[term]][[s]]
    cat(sprintf("  %-19s value %.15g  F %.15g  df %g, %g  Sig. %.6g\n", s, e$value, e$f, e$df1, e$df2, e$sig))
  }
  cat(sprintf("  Box's M %.15g  F %.15g  df1 %g  df2 %.10g  Sig. %.15g\n", box$box_m, box$f, box$df1, box$df2, box$sig))
}
show("Dataset A", effA, "Group", boxA)
cat(sprintf("
Dataset B: rank SSCP galat E = %d dari 3 (eigen E: %s)
", rankE_B,
            paste(format(eigen(E_B, symmetric = TRUE, only.values = TRUE)$values, digits = 6), collapse = ", ")))
cat(sprintf("  car::Anova multivariat: %s
", if (is.character(effB_try)) effB_try else "berhasil"))
for (dv in names(uniB)) {
  u <- uniB[[dv]]$Group
  cat(sprintf("  %s, Group (univariat Type III): SS %.15g  df %g  F %.15g  Sig. %.6g
", dv, u$ss, u$df, u$f, u$sig))
}
cat(sprintf("  Box's M %.15g  F %.15g  df1 %g  df2 %.10g  Sig. %.15g
", boxB$box_m, boxB$f, boxB$df1, boxB$df2, boxB$sig))
show("Dataset C", effC, "Species", boxC)

write_json(list(
  generated_with = paste(R.version.string, "; car", as.character(packageVersion("car"))),
  validation = list(n = n_val, pass = n_pass, max_abs_diff = max_diff, rows = validation),
  dataset_a = list(effects = effA, box = boxA),
  dataset_b = list(rank_error_sscp = rankE_B, multivariate_error = if (is.character(effB_try)) effB_try else NULL,
                   univariate = uniB, box = boxB),
  dataset_c = list(effects = effC, box = boxC)
), "testing/whitebox/oracle/oracle-jest-mv.json", auto_unbox = TRUE, digits = NA, pretty = TRUE)
