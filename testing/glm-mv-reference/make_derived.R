# Derived datasets for the extended validation (Langkah 7), written as .sav
# (haven, keeps variable and value labels) and .csv (exact values, same
# format as sav_to_csv.R). Run from testing/glm-mv-reference:
#   Rscript make_derived.R
#
# mv6 two-way tak seimbang: "two-way manova.sav" without cases 4, 11, 12, 21,
#     26, 31 (1-based case numbers) -> cells A1B1 3, A1B2 4, A1B3 2, A1B4 4,
#     A2B1 4, A2B2 3, A2B3 3, A2B4 3 (N = 26, no empty cell).
# mv7 one-way dengan nilai hilang di tengah: "hotelling 2 populasi
#     independen.sav" with x2 of case 15 (jk = 1, was 18) and x4 of case 45
#     (jk = 2, was 28) set to system-missing; every other value and row,
#     including the 3 empty trailing rows, unchanged.
suppressWarnings(suppressMessages(library(haven)))

exact <- function(v) {
  if (is.na(v)) return("")
  for (d in 15:17) { s <- trimws(formatC(v, digits = d, format = "g")); if (as.numeric(s) == v) return(s) }
  stop("no exact representation for ", v)
}
write_csv_exact <- function(x, out) {
  fmt <- as.data.frame(lapply(x, function(col) vapply(as.numeric(col), exact, "")), stringsAsFactors = FALSE, check.names = FALSE)
  names(fmt) <- names(x)
  con <- file(out, "wb"); writeLines(c(paste(names(fmt), collapse = ","), apply(fmt, 1, paste, collapse = ",")), con, sep = "\n"); close(con)
  back <- read.csv(out, check.names = FALSE)
  stopifnot(identical(dim(back), dim(x)), all(is.na(as.matrix(back)) == is.na(as.matrix(zap_labels(x)))),
            all(as.matrix(back) == as.matrix(zap_labels(x)), na.rm = TRUE))
}

# mv6
src6 <- read_sav(file.path("data", "two-way manova.sav"))
drop6 <- c(4, 11, 12, 21, 26, 31)
mv6 <- src6[-drop6, ]
stopifnot(nrow(mv6) == 26, all(table(mv6$faktorA, mv6$faktorB) > 0))
write_sav(mv6, file.path("data", "two-way manova tak seimbang.sav"))
write_csv_exact(mv6, file.path("data", "two-way manova tak seimbang.csv"))
cat("mv6 cells (faktorA x faktorB):\n"); print(table(mv6$faktorA, mv6$faktorB))
cat("mv6 removed cases:\n"); print(as.data.frame(zap_labels(src6[drop6, ])))

# mv7
src7 <- read_sav(file.path("data", "hotelling 2 populasi independen.sav"))
mv7 <- src7
cells7 <- list(c(15, "x2"), c(45, "x4"))
for (cell in cells7) {
  r <- as.integer(cell[1]); v <- cell[2]
  cat(sprintf("mv7: case %d %s was %s (jk = %s) -> system-missing\n", r, v, format(mv7[[v]][r]), format(mv7$jk[r])))
  mv7[[v]][r] <- NA
}
changed <- which(is.na(as.matrix(zap_labels(mv7))) != is.na(as.matrix(zap_labels(src7))), arr.ind = TRUE)
stopifnot(nrow(changed) == 2, nrow(mv7) == nrow(src7))
write_sav(mv7, file.path("data", "hotelling 2 populasi independen dengan nilai hilang.sav"))
write_csv_exact(mv7, file.path("data", "hotelling 2 populasi independen dengan nilai hilang.csv"))
cat(sprintf("mv7 rows %d, complete %d\n", nrow(mv7), sum(complete.cases(zap_labels(mv7)))))

# Round trip of the written .sav files
for (f in c("two-way manova tak seimbang.sav", "hotelling 2 populasi independen dengan nilai hilang.sav")) {
  a <- read_sav(file.path("data", f))
  b <- if (grepl("^two-way", f)) mv6 else mv7
  stopifnot(isTRUE(all.equal(zap_labels(a), zap_labels(b), check.attributes = FALSE)))
  cat(f, ": variable labels", paste(vapply(a, function(col) { l <- attr(col, "label", exact = TRUE); if (is.null(l)) "-" else paste(l, collapse = " ") }, ""), collapse = " | "),
      "; value labels", paste(names(Filter(Negate(is.null), lapply(a, attr, "labels"))), collapse = ", "), "\n")
}
