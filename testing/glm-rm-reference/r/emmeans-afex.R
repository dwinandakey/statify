# Pembanding SEMENTARA EMMeans dataset (c) dengan afex (acuan utama: SPSS 27,
# spss/rm_c.sps). afex::aov_car memakai model multivariat untuk emmeans
# (seperti SPSS GLM Repeated Measures): rata-rata marginal dengan bobot sama,
# SE dari model multivariat, perbandingan berpasangan Bonferroni.
# Usage: Rscript emmeans-afex.R <folder data> <folder keluaran>
args <- commandArgs(trailingOnly = TRUE)
data_dir <- if (length(args) >= 1) args[1] else "../data"
out_dir <- if (length(args) >= 2) args[2] else "../r-output"
suppressPackageStartupMessages({ library(afex); library(emmeans) })
afex_options(emmeans_model = "multivariate")

d <- read.csv(file.path(data_dir, "rm_c.csv"))
long <- reshape(d, direction = "long", varying = c("p1", "p2", "p3"), v.names = "nilai",
                timevar = "sesi", times = 1:3, idvar = "subjek")
long$sesi <- factor(long$sesi); long$metode <- factor(long$metode); long$subjek <- factor(long$subjek)
fit <- suppressMessages(aov_car(nilai ~ metode * sesi + Error(subjek / sesi), data = long))

tag <- sprintf("R %s.%s afex %s emmeans %s (emmeans_model = multivariate)", R.version$major, R.version$minor,
               packageVersion("afex"), packageVersion("emmeans"))
rows <- list()
# afex names within levels "X1", "X2", ...; SPSS/Statify print "1", "2", ...
norm <- function(x) sub("^X(?=[0-9])", "", trimws(as.character(x)), perl = TRUE)
add <- function(target, level, field, value, src) rows[[length(rows) + 1]] <<- data.frame(
  dataset = "c", table = "emmeans", measure = "nilai", source = paste0(target, " | ", level), field = field,
  value = unname(value), r_source = paste0(tag, ": ", src), stringsAsFactors = FALSE)
est <- function(target, spec) {
  s <- as.data.frame(summary(emmeans(fit, spec)))
  lev <- if (target == "(OVERALL)") rep("(OVERALL)", nrow(s)) else apply(s[, setdiff(names(s), c("emmean", "SE", "df", "lower.CL", "upper.CL")), drop = FALSE], 1, function(x) paste(norm(x), collapse = " · "))
  for (i in seq_len(nrow(s))) {
    src <- sprintf("summary(emmeans(fit, %s))", deparse(spec))
    add(target, trimws(lev[i]), "Mean", s$emmean[i], src)
    add(target, trimws(lev[i]), "Std. Error", s$SE[i], src)
    add(target, trimws(lev[i]), "Lower Bound", s$lower.CL[i], src)
    add(target, trimws(lev[i]), "Upper Bound", s$upper.CL[i], src)
  }
}
pairs_bonf <- function(target, spec) {
  s <- as.data.frame(summary(pairs(emmeans(fit, spec), adjust = "bonferroni"), infer = TRUE))
  for (i in seq_len(nrow(s))) {
    lv <- norm(gsub("^[a-z]+", "", strsplit(as.character(s$contrast[i]), " - ")[[1]]))
    key <- paste0(target, " | ", lv[1], " - ", lv[2])
    src <- sprintf("summary(pairs(emmeans(fit, %s), adjust = 'bonferroni'), infer = TRUE)", deparse(spec))
    rows[[length(rows) + 1]] <<- data.frame(dataset = "c", table = "emmeans_pairwise", measure = "nilai", source = key,
      field = c("Mean Difference", "Std. Error", "Sig.", "Lower Bound", "Upper Bound"),
      value = c(s$estimate[i], s$SE[i], s$p.value[i], s$lower.CL[i], s$upper.CL[i]),
      r_source = paste0(tag, ": ", src), stringsAsFactors = FALSE)
  }
}
est("(OVERALL)", ~ 1)
est("metode", ~ metode)
est("sesi", ~ sesi)
est("metode * sesi", ~ metode:sesi)
pairs_bonf("metode", ~ metode)
pairs_bonf("sesi", ~ sesi)
out <- do.call(rbind, rows)
jsonlite::write_json(out, file.path(out_dir, "afex-emmeans-c.json"), digits = NA, pretty = TRUE)
print(out[, c("source", "field", "value")], digits = 8)
