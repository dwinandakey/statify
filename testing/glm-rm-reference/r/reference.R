# Pembanding SEMENTARA untuk dataset acuan GLM Repeated Measures.
# Acuan UTAMA tetap keluaran SPSS 27 yang dijalankan pengguna (spss/*.sps).
#
# Setiap nilai dihitung dengan aljabar matriks GLM multivariat (matriks H dan E
# pada variabel tertransformasi, kontras polinomial ortonormal seperti
# WSFACTOR ... Polynomial di SPSS), lalu efek utama dan uji multivariat
# dicek silang dengan car::Anova (tipe III). Rumus yang spesifik SPSS
# (epsilon Huynh-Feldt, eta kuadrat parsial, parameter nonsentral, observed
# power, Box's M, Levene) ditulis eksplisit di bawah.
#
# Usage: Rscript reference.R <folder data> <folder keluaran>
args <- commandArgs(trailingOnly = TRUE)
data_dir <- if (length(args) >= 1) args[1] else "../data"
out_dir <- if (length(args) >= 2) args[2] else "../r-output"
dir.create(out_dir, showWarnings = FALSE, recursive = TRUE)
suppressPackageStartupMessages({ library(car); library(emmeans) })
options(contrasts = c("contr.sum", "contr.poly"))
ALPHA <- 0.05

power_f <- function(F, df1, df2) {
  if (!is.finite(F)) return(NA)
  1 - pf(qf(1 - ALPHA, df1, df2), df1, df2, ncp = F * df1)
}

# Orthonormal polynomial contrasts (k x (k-1)), as SPSS WSFACTOR Polynomial.
poly_c <- function(k) contr.poly(k)

# Hypothesis SSCP for the coefficients L %*% B of Y ~ X.
hyp_sscp <- function(X, Y, L) {
  XtXi <- solve(crossprod(X)); B <- XtXi %*% crossprod(X, Y)
  LB <- L %*% B
  t(LB) %*% solve(L %*% XtXi %*% t(L)) %*% LB
}
err_sscp <- function(X, Y) {
  H <- X %*% solve(crossprod(X)) %*% t(X)
  t(Y) %*% (diag(nrow(Y)) - H) %*% Y
}

# SPSS multivariate statistics from eigenvalues of E^-1 H.
mv_tests <- function(H, E, q, v) {
  p <- ncol(E)
  ev <- Re(eigen(solve(E) %*% H, only.values = TRUE)$values)
  ev <- pmax(ev, 0); s <- min(p, q); m <- (abs(p - q) - 1) / 2; nn <- (v - p - 1) / 2
  pillai <- sum(ev / (1 + ev)); wilks <- prod(1 / (1 + ev)); hot <- sum(ev); roy <- max(ev)
  # F approximations (SPSS GLM algorithms; exact when s = 1)
  Fp <- (2 * nn + s + 1) / (2 * m + s + 1) * pillai / (s - pillai); d1p <- s * (2 * m + s + 1); d2p <- s * (2 * nn + s + 1)
  if (p^2 + q^2 - 5 > 0) t_ <- sqrt((p^2 * q^2 - 4) / (p^2 + q^2 - 5)) else t_ <- 1
  r_ <- v - (p - q + 1) / 2; u_ <- (p * q - 2) / 4
  d1w <- p * q; d2w <- r_ * t_ - 2 * u_
  Fw <- (1 - wilks^(1 / t_)) / wilks^(1 / t_) * d2w / d1w
  d1h <- s * (2 * m + s + 1); d2h <- 2 * (s * nn + 1)
  Fh <- d2h * hot / (s^2 * (2 * m + s + 1))
  d1r <- max(p, q); d2r <- v - d1r + q
  Fr <- roy * d2r / d1r
  eta <- c(pillai / s, 1 - wilks^(1 / s), (hot / s) / (1 + hot / s), roy / (1 + roy))
  data.frame(
    test = c("Pillai's Trace", "Wilks' Lambda", "Hotelling's Trace", "Roy's Largest Root"),
    value = c(pillai, wilks, hot, roy), F = c(Fp, Fw, Fh, Fr),
    hypothesis_df = c(d1p, d1w, d1h, d1r), error_df = c(d2p, d2w, d2h, d2r),
    sig = c(pf(Fp, d1p, d2p, lower.tail = FALSE), pf(Fw, d1w, d2w, lower.tail = FALSE),
            pf(Fh, d1h, d2h, lower.tail = FALSE), pf(Fr, d1r, d2r, lower.tail = FALSE)),
    partial_eta_sq = eta,
    noncent = c(Fp * d1p, Fw * d1w, Fh * d1h, Fr * d1r),
    observed_power = c(power_f(Fp, d1p, d2p), power_f(Fw, d1w, d2w), power_f(Fh, d1h, d2h), power_f(Fr, d1r, d2r))
  )
}

# Mauchly + epsilons from the error SSCP of the transformed variables.
sphericity <- function(E, v, N, r) {
  p <- ncol(E); S <- E / v
  W <- det(S) / (sum(diag(S)) / p)^p
  d <- (2 * p^2 + p + 2) / (6 * p)
  chi <- -(v - d) * log(W); df <- p * (p + 1) / 2 - 1
  sig <- pchisq(chi, df, lower.tail = FALSE)
  w2 <- (p + 2) * (p - 1) * (p - 2) * (2 * p^3 + 6 * p^2 + 3 * p + 2) / (288 * p^2 * (v - d)^2)
  sig_anderson <- sig + w2 * (pchisq(chi, df + 4, lower.tail = FALSE) - sig)
  gg <- sum(diag(E))^2 / (p * sum(diag(E %*% E)))
  hf <- min(1, (N * p * gg - 2) / (p * (N - r - p * gg)))
  data.frame(mauchly_w = W, approx_chi_square = chi, df = df, sig = sig, sig_anderson = sig_anderson,
             greenhouse_geisser = gg, huynh_feldt = hf, lower_bound = 1 / p)
}

univ_rows <- function(source, SS, df, SSe, dfe, eps) {
  corr <- c("Sphericity Assumed" = 1, "Greenhouse-Geisser" = eps$greenhouse_geisser,
            "Huynh-Feldt" = eps$huynh_feldt, "Lower-bound" = eps$lower_bound)
  do.call(rbind, lapply(names(corr), function(nm) {
    e <- corr[[nm]]; d1 <- df * e; d2 <- dfe * e; F <- (SS / df) / (SSe / dfe)
    data.frame(source = source, correction = nm, type_III_ss = SS, df = d1, mean_square = SS / d1, F = F,
               sig = pf(F, d1, d2, lower.tail = FALSE), partial_eta_sq = SS / (SS + SSe),
               noncent = F * d1, observed_power = power_f(F, d1, d2),
               error_ss = SSe, error_df = d2, error_ms = SSe / d2)
  }))
}

analyse <- function(key, d, within, measures, between = NULL) {
  out <- list(); k <- within$levels; C <- poly_c(k); N <- nrow(d)
  grp <- if (!is.null(between)) factor(d[[between]]) else NULL
  X <- if (is.null(grp)) matrix(1, N, 1) else model.matrix(~ grp)
  r <- qr(X)$rank; v <- N - r
  L_int <- matrix(c(1, rep(0, ncol(X) - 1)), 1)
  L_grp <- if (ncol(X) > 1) cbind(0, diag(ncol(X) - 1)) else NULL

  # Descriptive statistics
  desc <- do.call(rbind, lapply(unlist(lapply(measures, `[[`, "columns")), function(col) {
    rows <- data.frame(variable = col, group = "Total", mean = mean(d[[col]]), sd = sd(d[[col]]), n = N)
    if (!is.null(grp)) rows <- rbind(do.call(rbind, lapply(levels(grp), function(g) {
      y <- d[[col]][grp == g]; data.frame(variable = col, group = g, mean = mean(y), sd = sd(y), n = length(y))
    })), rows)
    rows
  }))
  out$descriptive_statistics <- desc

  # Per measure: transformed variables, sphericity, univariate tests, contrasts, between effects
  Zall <- NULL; Tall <- NULL
  for (m in measures) {
    Y <- as.matrix(d[, m$columns]); Z <- Y %*% C; T <- Y %*% rep(1 / sqrt(k), k)
    Zall <- cbind(Zall, Z); Tall <- cbind(Tall, T)
    E <- err_sscp(X, Z)
    sph <- sphericity(E, v, N, r); sph$measure <- m$name; sph$effect <- within$name
    out$mauchly <- rbind(out$mauchly, sph)
    rows <- univ_rows(within$name, sum(diag(hyp_sscp(X, Z, L_int))), ncol(Z), sum(diag(E)), ncol(Z) * v, sph)
    if (!is.null(L_grp)) rows <- rbind(rows, univ_rows(paste0(within$name, " * ", between),
        sum(diag(hyp_sscp(X, Z, L_grp))), ncol(Z) * nrow(L_grp), sum(diag(E)), ncol(Z) * v, sph))
    rows$measure <- m$name
    out$within_effects <- rbind(out$within_effects, rows)
    # Within contrasts (polynomial): one row per contrast and source
    cn <- c("Linear", "Quadratic", "Cubic", paste0("Order ", 4:20))[seq_len(k - 1)]
    for (j in seq_len(k - 1)) {
      z <- Z[, j, drop = FALSE]; SSe <- err_sscp(X, z)[1, 1]
      srcs <- list(list(within$name, L_int)); if (!is.null(L_grp)) srcs[[2]] <- list(paste0(within$name, " * ", between), L_grp)
      for (s in srcs) {
        SS <- hyp_sscp(X, z, s[[2]])[1, 1]; df <- nrow(s[[2]]); F <- (SS / df) / (SSe / v)
        out$within_contrasts <- rbind(out$within_contrasts, data.frame(measure = m$name, source = s[[1]], contrast = cn[j],
          type_III_ss = SS, df = df, mean_square = SS / df, F = F, sig = pf(F, df, v, lower.tail = FALSE),
          partial_eta_sq = SS / (SS + SSe), noncent = F * df, observed_power = power_f(F, df, v), error_ss = SSe, error_df = v))
      }
    }
    SSe <- err_sscp(X, T)[1, 1]
    srcs <- list(list("Intercept", L_int)); if (!is.null(L_grp)) srcs[[2]] <- list(between, L_grp)
    for (s in srcs) {
      SS <- hyp_sscp(X, T, s[[2]])[1, 1]; df <- nrow(s[[2]]); F <- (SS / df) / (SSe / v)
      out$between_effects <- rbind(out$between_effects, data.frame(measure = m$name, source = s[[1]],
        type_III_ss = SS, df = df, mean_square = SS / df, F = F, sig = pf(F, df, v, lower.tail = FALSE),
        partial_eta_sq = SS / (SS + SSe), noncent = F * df, observed_power = power_f(F, df, v), error_ss = SSe, error_df = v))
    }
  }

  # Multivariate tests (doubly multivariate when > 1 measure)
  mv <- list()
  if (length(measures) > 1) {
    Eb <- err_sscp(X, Tall)
    mv[["Between Subjects: Intercept"]] <- mv_tests(hyp_sscp(X, Tall, L_int), Eb, 1, v)
    if (!is.null(L_grp)) mv[[paste0("Between Subjects: ", between)]] <- mv_tests(hyp_sscp(X, Tall, L_grp), Eb, nrow(L_grp), v)
  }
  Ew <- err_sscp(X, Zall)
  mv[[paste0("Within Subjects: ", within$name)]] <- mv_tests(hyp_sscp(X, Zall, L_int), Ew, 1, v)
  if (!is.null(L_grp)) mv[[paste0("Within Subjects: ", within$name, " * ", between)]] <- mv_tests(hyp_sscp(X, Zall, L_grp), Ew, nrow(L_grp), v)
  out$multivariate_tests <- do.call(rbind, lapply(names(mv), function(e) cbind(effect = e, mv[[e]])))

  # Cross-check with car::Anova (type III, one measure at a time)
  chk <- list()
  for (m in measures) {
    Y <- as.matrix(d[, m$columns]); idata <- data.frame(w = factor(seq_len(k)))
    fit <- if (is.null(grp)) lm(Y ~ 1) else lm(Y ~ grp)
    av <- Anova(fit, idata = idata, idesign = ~ w, type = 3)
    su <- suppressWarnings(summary(av, multivariate = TRUE))
    u <- su$univariate.tests; sp <- su$sphericity.tests; ad <- su$pval.adjustments
    we <- out$within_effects[out$within_effects$measure == m$name & out$within_effects$correction == "Sphericity Assumed", ]
    mau <- out$mauchly[out$mauchly$measure == m$name, ]
    wmv <- out$multivariate_tests[out$multivariate_tests$effect == paste0("Within Subjects: ", within$name), ]
    car_pillai <- if (length(measures) == 1) su$multivariate.tests[["w"]]$SSPH else NULL
    chk[[m$name]] <- data.frame(
      measure = m$name,
      abs_diff_SS_within = abs(u["w", "Sum Sq"] - we$type_III_ss[1]),
      abs_diff_F_within = abs(u["w", "F value"] - we$F[1]),
      abs_diff_mauchly_W = abs(sp["w", "Test statistic"] - mau$mauchly_w),
      abs_diff_GG = abs(ad["w", "GG eps"] - mau$greenhouse_geisser),
      abs_diff_SS_between_intercept = abs(u["(Intercept)", "Sum Sq"] - out$between_effects$type_III_ss[out$between_effects$measure == m$name & out$between_effects$source == "Intercept"]),
      car_HF_eps = ad["w", "HF eps"], spss_formula_HF = mau$huynh_feldt
    )
  }
  out$car_crosscheck <- do.call(rbind, chk)

  if (!is.null(grp)) {
    # Levene (SPSS: based on mean and on median) per dependent variable
    lev <- do.call(rbind, lapply(unlist(lapply(measures, `[[`, "columns")), function(col) {
      y <- d[[col]]
      one <- function(center, based) {
        z <- abs(y - ave(y, grp, FUN = center)); a <- anova(lm(z ~ grp))
        data.frame(variable = col, based_on = based, levene_statistic = a$`F value`[1], df1 = a$Df[1], df2 = a$Df[2], sig = a$`Pr(>F)`[1])
      }
      rbind(one(mean, "Mean"), one(median, "Median"))
    }))
    out$levene <- lev
    # Box's M with the F approximation (Box 1949), on all within cells of all measures
    Y <- as.matrix(d[, unlist(lapply(measures, `[[`, "columns"))]); p <- ncol(Y); g <- nlevels(grp)
    ni <- as.numeric(table(grp)); Sp <- err_sscp(X, Y) / (N - g)
    M <- (N - g) * log(det(Sp)) - sum(sapply(levels(grp), function(l) (sum(grp == l) - 1) * log(det(cov(Y[grp == l, , drop = FALSE])))))
    c1 <- (sum(1 / (ni - 1)) - 1 / (N - g)) * (2 * p^2 + 3 * p - 1) / (6 * (p + 1) * (g - 1))
    c2 <- (sum(1 / (ni - 1)^2) - 1 / (N - g)^2) * (p - 1) * (p + 2) / (6 * (g - 1))
    df1 <- (g - 1) * p * (p + 1) / 2
    if (c2 - c1^2 > 0) { df2 <- (df1 + 2) / (c2 - c1^2); b <- df1 / (1 - c1 - df1 / df2); Fb <- M / b }
    else { df2 <- (df1 + 2) / (c1^2 - c2); b <- df2 / (1 - c1 + 2 / df2); Fb <- df2 * M / (df1 * (b - M)) }
    out$box_m <- data.frame(box_m = M, F = Fb, df1 = df1, df2 = df2, sig = pf(Fb, df1, df2, lower.tail = FALSE))
  }
  out
}

emmeans_c <- function(d) {
  # Dataset (c): EMMeans as requested in spss/rm_c.sps (Bonferroni comparisons).
  Y <- as.matrix(d[, c("p1", "p2", "p3")]); d$metode <- factor(d$metode)
  fit <- lm(Y ~ metode, data = d)
  rg <- emmeans(fit, ~ sesi | metode, mult.name = "sesi")
  list(
    overall = as.data.frame(summary(emmeans(fit, ~ 1, mult.name = "sesi"))),
    metode = as.data.frame(summary(emmeans(fit, ~ metode, mult.name = "sesi"))),
    metode_pairs = as.data.frame(summary(pairs(emmeans(fit, ~ metode, mult.name = "sesi"), adjust = "bonferroni"), infer = TRUE)),
    sesi = as.data.frame(summary(emmeans(fit, ~ sesi, mult.name = "sesi"))),
    sesi_pairs = as.data.frame(summary(pairs(emmeans(fit, ~ sesi, mult.name = "sesi"), adjust = "bonferroni"), infer = TRUE)),
    metode_sesi = as.data.frame(summary(rg))
  )
}

# Values printed DIRECTLY by car (no own formulas), for the Jest test
# fixtures: one row per value with its car source. car::Anova type III on
# lm(Y ~ group) with idata/idesign, per measure; univariate per dependent
# variable with car::Anova(lm(y ~ group), type = 3); Levene with
# car::leveneTest(center = mean).
car_values <- function(key, d, within, measures, between = NULL) {
  rows <- list(); add <- function(...) rows[[length(rows) + 1]] <<- data.frame(dataset = key, lapply(list(...), unname), stringsAsFactors = FALSE, row.names = NULL)
  k <- within$levels; grp <- if (!is.null(between)) factor(d[[between]]) else NULL
  tag <- sprintf("R %s car %s", paste(R.version$major, R.version$minor, sep = "."), packageVersion("car"))
  for (m in measures) {
    Y <- as.matrix(d[, m$columns]); idata <- data.frame(w = factor(seq_len(k)))
    fit <- if (is.null(grp)) lm(Y ~ 1) else lm(Y ~ grp)
    av <- Anova(fit, idata = idata, idesign = ~ w, type = 3)
    su <- suppressWarnings(summary(av, multivariate = TRUE))
    u <- su$univariate.tests; sp <- su$sphericity.tests; ad <- su$pval.adjustments
    nm <- function(r) switch(r, "(Intercept)" = "Intercept", "grp" = between, "w" = within$name, "grp:w" = paste0(within$name, " * ", between), r)
    src <- paste0(tag, " Anova(type=3) summary: univariate.tests")
    for (r in rownames(u)) {
      table <- if (grepl("w", r)) "within_effects" else "between_effects"
      add(table = table, measure = m$name, source = nm(r), field = "SS", value = u[r, "Sum Sq"], r_source = src)
      add(table = table, measure = m$name, source = nm(r), field = "df", value = u[r, "num Df"], r_source = src)
      add(table = table, measure = m$name, source = nm(r), field = "error SS", value = u[r, "Error SS"], r_source = src)
      add(table = table, measure = m$name, source = nm(r), field = "error df", value = u[r, "den Df"], r_source = src)
      add(table = table, measure = m$name, source = nm(r), field = "F", value = u[r, "F value"], r_source = src)
      add(table = table, measure = m$name, source = nm(r), field = "Sig.", value = u[r, "Pr(>F)"], r_source = src)
    }
    src <- paste0(tag, " Anova(type=3) summary: sphericity.tests / pval.adjustments")
    for (r in rownames(sp)) {
      add(table = "mauchly", measure = m$name, source = nm(r), field = "W", value = sp[r, "Test statistic"], r_source = src)
      add(table = "mauchly", measure = m$name, source = nm(r), field = "Greenhouse-Geisser", value = ad[r, "GG eps"], r_source = src)
      add(table = "within_effects", measure = m$name, source = nm(r), field = "Sig. Greenhouse-Geisser", value = ad[r, "Pr(>F[GG])"], r_source = src)
    }
    if (length(measures) == 1) {
      src <- paste0(tag, " Anova(type=3) summary: multivariate.tests (car:::Pillai/Wilks/HL/Roy)")
      for (r in names(su$multivariate.tests)) if (grepl("w", r)) {
        t <- su$multivariate.tests[[r]]
        ev <- Re(eigen(qr.coef(qr(t$SSPE), t$SSPH), symmetric = FALSE)$values)
        fns <- list("Pillai's Trace" = car:::Pillai, "Wilks' Lambda" = car:::Wilks, "Hotelling's Trace" = car:::HL, "Roy's Largest Root" = car:::Roy)
        for (test in names(fns)) {
          st <- fns[[test]](ev, t$df, t$df.residual)
          add(table = "multivariate", measure = m$name, source = paste0(nm(r), " | ", test), field = "Value", value = st[1], r_source = src)
          add(table = "multivariate", measure = m$name, source = paste0(nm(r), " | ", test), field = "F", value = st[2], r_source = src)
          add(table = "multivariate", measure = m$name, source = paste0(nm(r), " | ", test), field = "Hypothesis df", value = st[3], r_source = src)
          add(table = "multivariate", measure = m$name, source = paste0(nm(r), " | ", test), field = "Error df", value = st[4], r_source = src)
          add(table = "multivariate", measure = m$name, source = paste0(nm(r), " | ", test), field = "Sig.", value = pf(st[2], st[3], st[4], lower.tail = FALSE), r_source = src)
        }
      }
    }
    for (j in seq_along(m$columns)) {
      col <- m$columns[j]; y <- d[[col]]
      a3 <- if (is.null(grp)) Anova(lm(y ~ 1), type = 3) else Anova(lm(y ~ grp), type = 3)
      src <- paste0(tag, " Anova(lm(", col, " ~ ", if (is.null(grp)) "1" else between, "), type=3)")
      for (r in rownames(a3)) {
        rr <- if (r == "Residuals") "Error" else nm(r)
        add(table = "univariate", measure = paste0(m$name, "|", j), source = rr, field = "SS", value = a3[r, "Sum Sq"], r_source = src)
        add(table = "univariate", measure = paste0(m$name, "|", j), source = rr, field = "df", value = a3[r, "Df"], r_source = src)
        if (r != "Residuals") add(table = "univariate", measure = paste0(m$name, "|", j), source = rr, field = "F", value = a3[r, "F value"], r_source = src)
      }
      if (!is.null(grp)) {
        lt <- leveneTest(y ~ grp, center = mean)
        src <- paste0(tag, " leveneTest(", col, " ~ ", between, ", center = mean)")
        add(table = "levene", measure = paste0(m$name, "|", j), source = "Based on Mean", field = "Levene Statistic", value = lt[1, "F value"], r_source = src)
        add(table = "levene", measure = paste0(m$name, "|", j), source = "Based on Mean", field = "df1", value = lt[1, "Df"], r_source = src)
        add(table = "levene", measure = paste0(m$name, "|", j), source = "Based on Mean", field = "df2", value = lt[2, "Df"], r_source = src)
        add(table = "levene", measure = paste0(m$name, "|", j), source = "Based on Mean", field = "Sig.", value = lt[1, "Pr(>F)"], r_source = src)
      }
    }
  }
  do.call(rbind, rows)
}

read <- function(f) read.csv(file.path(data_dir, f))
res <- list(
  gambar51 = analyse("gambar51", read("gambar51.csv"), list(name = "perlakuan", levels = 4),
                     list(list(name = "anjing", columns = paste0("perlakuan", 1:4)))),
  a = analyse("a", read("rm_a.csv"), list(name = "waktu", levels = 3),
              list(list(name = "cemas", columns = paste0("cemas", 1:3)), list(name = "stres", columns = paste0("stres", 1:3)))),
  b = analyse("b", read("rm_b.csv"), list(name = "waktu", levels = 4),
              list(list(name = "skor", columns = paste0("w", 1:4))), between = "kelompok"),
  c = analyse("c", read("rm_c.csv"), list(name = "sesi", levels = 3),
              list(list(name = "nilai", columns = paste0("p", 1:3))), between = "metode")
)
res$c$emmeans <- emmeans_c(read("rm_c.csv"))
car_rows <- rbind(
  car_values("gambar51", read("gambar51.csv"), list(name = "perlakuan", levels = 4), list(list(name = "anjing", columns = paste0("perlakuan", 1:4)))),
  car_values("a", read("rm_a.csv"), list(name = "waktu", levels = 3),
             list(list(name = "cemas", columns = paste0("cemas", 1:3)), list(name = "stres", columns = paste0("stres", 1:3)))),
  car_values("b", read("rm_b.csv"), list(name = "waktu", levels = 4), list(list(name = "skor", columns = paste0("w", 1:4))), between = "kelompok"),
  car_values("c", read("rm_c.csv"), list(name = "sesi", levels = 3), list(list(name = "nilai", columns = paste0("p", 1:3))), between = "metode")
)
jsonlite::write_json(car_rows, file.path(out_dir, "car-values.json"), digits = NA, pretty = TRUE)

meta <- list(source = "R pembanding sementara (BUKAN acuan utama; acuan utama = SPSS 27)",
             r = R.version.string, car = as.character(packageVersion("car")), emmeans = as.character(packageVersion("emmeans")),
             generated = format(Sys.time(), "%Y-%m-%d %H:%M:%S"))
if (requireNamespace("jsonlite", quietly = TRUE)) {
  jsonlite::write_json(c(list(meta = meta), res), file.path(out_dir, "reference-r.json"), digits = NA, auto_unbox = TRUE, pretty = TRUE)
} else {
  saveRDS(res, file.path(out_dir, "reference-r.rds"))
}
sink(file.path(out_dir, "reference-r.txt"))
cat("# ", meta$source, "\n# ", meta$r, " car ", meta$car, " emmeans ", meta$emmeans, "\n\n", sep = "")
op <- options(width = 200, digits = 10)
for (nm in names(res)) { cat("\n==================== dataset", nm, "====================\n"); for (t in names(res[[nm]])) if (TRUE) { cat("\n---", t, "---\n"); print(res[[nm]][[t]]) } }
options(op)
sink()
cat("written:", out_dir, "\n")
