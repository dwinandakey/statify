# Converts the five SPSS .sav files in data/ to CSV (same base name) without
# changing any value, and prints the metadata used for the README
# (variables, value labels, variable labels, user-missing definitions).
#   "C:\Program Files\R\R-4.3.2\bin\Rscript.exe" sav_to_csv.R   (from testing/glm-mv-reference)
#
# - Every number is written in the shortest decimal form that reads back as
#   exactly the same double (15, 16 or 17 significant digits, checked per
#   value), so the CSV holds the stored values without any rounding.
# - System-missing values are written as empty fields, so rows that are
#   empty in the .sav stay as empty rows (",,,,") in the CSV.
# - Values are the stored codes (value labels are listed below, not applied).
# - Line endings are LF.
suppressWarnings(library(foreign))
files <- c("hotelling 1 populasi.sav", "hotelling 2 populasi independen.sav",
           "hotelling berpasangan (data asli).sav", "one-way manova.sav", "two-way manova.sav")

exact <- function(v) {
  if (is.na(v)) return("")
  for (d in 15:17) {
    s <- trimws(formatC(v, digits = d, format = "g"))
    if (as.numeric(s) == v) return(s)
  }
  stop("no exact representation for ", v)
}

for (f in files) {
  path <- file.path("data", f)
  raw <- suppressWarnings(read.spss(path, use.value.labels = FALSE, use.missings = FALSE))
  x <- suppressWarnings(read.spss(path, to.data.frame = TRUE, use.value.labels = FALSE, use.missings = FALSE))
  out <- file.path("data", sub("\\.sav$", ".csv", f))
  fmt <- as.data.frame(lapply(x, function(col) vapply(col, exact, "")), stringsAsFactors = FALSE, check.names = FALSE)
  names(fmt) <- names(x)

  # Check: parsing the CSV text gives back exactly the stored values.
  orig <- unname(as.matrix(as.data.frame(lapply(x, as.numeric))))
  back <- suppressWarnings(matrix(as.numeric(unname(as.matrix(fmt))), nrow = nrow(fmt)))
  stopifnot(all(is.na(back) == is.na(orig)), all(back == orig, na.rm = TRUE))

  con <- file(out, "wb")
  writeLines(c(paste(names(fmt), collapse = ","), apply(fmt, 1, paste, collapse = ",")), con, sep = "\n")
  close(con)

  cat("=====", f, "->", basename(out), "\n")
  cat("rows:", nrow(x), " complete rows:", sum(complete.cases(x)), " vars:", paste(names(x), collapse = ", "), "\n")
  vl <- attr(x, "variable.labels"); vl <- vl[nzchar(vl)]
  if (length(vl)) cat("variable labels:", paste(names(vl), "=", shQuote(vl), collapse = "; "), "\n")
  lt <- attr(raw, "label.table")
  for (nm in names(lt)) if (length(lt[[nm]])) cat("value labels", nm, ":", paste(lt[[nm]], "=", shQuote(names(lt[[nm]])), collapse = "; "), "\n")
  ms <- attr(raw, "missings")
  um <- Filter(function(m) !identical(m$type, "none"), ms)
  cat("user-missing definitions:", if (length(um)) paste(names(um), collapse = ", ") else "none", "\n")
}
