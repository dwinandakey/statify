# v5 B2: SS Intercept Type I (dan II) pada mv6 (two-way manova tak seimbang).
#   Univariat per DV: Type I = anova() berurutan; Intercept Type I = R(μ) = n·ȳ²
#   (anova() tidak mencetak Intercept); Type II = car::Anova(type = 2);
#   Type III = car::Anova(type = 3, contr.sum) termasuk Intercept.
#   Multivariat: uji Intercept berurutan (Type I) dari
#   summary(manova(...), intercept = TRUE) (H = n·ȳȳᵀ).
# Pemakaian (root repo): Rscript testing/fitur-v5/r/b2_mv6.R
# Keluaran: testing/fitur-v5/r/b2_mv6_r.csv
suppressPackageStartupMessages(library(car))
d <- read.csv("testing/glm-mv-reference/data/two-way manova tak seimbang.csv")
d$faktorA <- factor(d$faktorA); d$faktorB <- factor(d$faktorB)
rows <- list()
add <- function(type, dv, source, stat, value) rows[[length(rows) + 1]] <<- data.frame(type = type, dv = dv, source = source, stat = stat, value = sprintf("%.17g", value))
for (dv in c("Y1A1", "Y2A1")) {
  f <- as.formula(paste(dv, "~ faktorA * faktorB")); y <- d[[dv]]
  a1 <- anova(lm(f, data = d))
  add("I", dv, "Intercept", "SS", length(y) * mean(y)^2)
  for (s in c("faktorA", "faktorB", "faktorA:faktorB")) add("I", dv, sub(":", "*", s), "SS", a1[s, "Sum Sq"])
  a2 <- Anova(lm(f, data = d), type = 2)
  add("II", dv, "Intercept", "SS", length(y) * mean(y)^2)   # R(μ): menunggu SPSS untuk Type II
  for (s in c("faktorA", "faktorB", "faktorA:faktorB")) add("II", dv, sub(":", "*", s), "SS", a2[s, "Sum Sq"])
  a3 <- Anova(lm(f, data = d, contrasts = list(faktorA = contr.sum, faktorB = contr.sum)), type = 3)
  for (s in c("(Intercept)", "faktorA", "faktorB", "faktorA:faktorB")) add("III", dv, sub(":", "*", sub("\\(Intercept\\)", "Intercept", s)), "SS", a3[s, "Sum Sq"])
}
fit <- manova(cbind(Y1A1, Y2A1) ~ faktorA * faktorB, data = d)
for (test in c("Pillai", "Wilks", "Hotelling-Lawley", "Roy")) {
  st <- summary(fit, test = test, intercept = TRUE)$stats["(Intercept)", ]
  add("I", "multivariat", "Intercept", paste(test, "value"), st[2])
  add("I", "multivariat", "Intercept", paste(test, "F"), st[3])
}
out <- do.call(rbind, rows)
write.csv(out, "testing/fitur-v5/r/b2_mv6_r.csv", row.names = FALSE)
cat(R.version.string, "; car", as.character(packageVersion("car")), "\n")
print(out)
