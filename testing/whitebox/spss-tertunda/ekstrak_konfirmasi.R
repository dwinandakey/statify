# Ekstrak nilai Mauchly dan Tests of Within-Subjects Effects dari keluaran
# SPSS 27 wb_rm_konfirmasi.xlsx (presisi penuh) ke wb_rm_konfirmasi-values.json.
# Jalankan dari akar repositori:
#   Rscript testing/whitebox/spss-tertunda/ekstrak_konfirmasi.R
suppressMessages({ library(readxl); library(jsonlite) })
dir <- "testing/whitebox/spss-tertunda"
d <- suppressMessages(read_excel(file.path(dir, "wb_rm_konfirmasi.xlsx"), col_names = FALSE, .name_repair = "minimal"))
rows <- lapply(seq_len(nrow(d)), function(i) { r <- unlist(d[i, ]); unname(r[!is.na(r)]) })
num <- function(x) as.numeric(sub("b$", "", x))
out <- list(); dataset <- NULL; table <- NULL; source <- NULL
for (r in rows) {
  if (length(r) == 1 && grepl("gambar51_skala_1e-5.csv", r[1])) dataset <- "gambar51_skala_1e-5"
  if (length(r) >= 1 && grepl("n_sama_k.csv", r[1])) dataset <- "n_sama_k"
  if (length(r) == 1 && r[1] %in% c("Mauchly's Test of Sphericitya", "Tests of Within-Subjects Effects", "Tests of Within-Subjects Contrasts", "Multivariate Testsa", "Tests of Between-Subjects Effects")) table <- r[1]
  if (is.null(dataset) || is.null(table)) next
  if (table == "Mauchly's Test of Sphericitya" && length(r) == 8 && r[1] %in% c("perlakuan", "t")) {
    f <- c("Mauchly's W", "Approx. Chi-Square", "df", "Sig.", "Greenhouse-Geisser", "Huynh-Feldt", "Lower-bound")
    for (j in seq_along(f)) out[[length(out) + 1]] <- list(dataset = dataset, table = "mauchly", source = r[1], correction = NA, field = f[j], value = num(r[j + 1]))
  }
  if (table == "Tests of Within-Subjects Effects") {
    corr <- c("Sphericity Assumed", "Greenhouse-Geisser", "Huynh-Feldt", "Lower-bound")
    if (length(r) >= 5 && r[1] %in% c("perlakuan", "t", "Error(perlakuan)", "Error(t)")) { source <- r[1]; r <- r[-1] }
    if (length(r) >= 4 && r[1] %in% corr && !is.null(source)) {
      f <- c("SS", "df", "Mean Square", "F", "Sig.")
      for (j in seq_len(length(r) - 1)) out[[length(out) + 1]] <- list(dataset = dataset, table = "within_effects", source = source, correction = r[1], field = f[j], value = num(r[j + 1]))
    }
  }
}
write_json(out, file.path(dir, "wb_rm_konfirmasi-values.json"), auto_unbox = TRUE, digits = NA, pretty = TRUE, na = "null")
cat(length(out), "nilai diekstrak\n")
tab <- table(sapply(out, `[[`, "dataset"), sapply(out, `[[`, "table")); print(tab)
