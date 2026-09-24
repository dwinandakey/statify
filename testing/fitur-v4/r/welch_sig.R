# Uji Welch dua populasi (Krishnamoorthy–Yu 2004) dengan R dasar, sebagai
# pembanding Sig. Statify dengan df pecahan (v4, butir 2).
#   V = S₁/n₁ + S₂/n₂, d = x̄₁ − x̄₂, T² = dᵀV⁻¹d,
#   1/ν = Σᵢ [1/(nᵢ − 1)] {tr((VᵢV⁻¹)²) + (tr(VᵢV⁻¹))²} / (p² + p),
#   F = (ν − p + 1)/(pν) · T² ~ F(p, ν − p + 1).
# sig_fraksional = pf(F, p, ν − p + 1, lower.tail = FALSE)   (sesudah)
# sig_bulat      = pf(F, round(p), round(ν − p + 1), lower.tail = FALSE)
#                  (sebelum: df dibulatkan seperti calculate_f_significance)
# Keluaran: testing/fitur-v4/r/welch_sig_r.csv (angka 17 digit).
#
# Pemakaian (root repo): Rscript testing/fitur-v4/r/welch_sig.R

out_file <- "testing/fitur-v4/r/welch_sig_r.csv"
dvs <- c("x1", "x2", "x3", "x4")

welch <- function(dat) {
  dat <- na.omit(dat)
  X1 <- as.matrix(dat[dat$jk == 1, dvs]); X2 <- as.matrix(dat[dat$jk == 2, dvs])
  n1 <- nrow(X1); n2 <- nrow(X2); p <- ncol(X1)
  V1 <- cov(X1) / n1; V2 <- cov(X2) / n2; Vi <- solve(V1 + V2)
  d <- colMeans(X1) - colMeans(X2)
  t2 <- drop(t(d) %*% Vi %*% d)
  term <- function(Vk, nk) { M <- Vk %*% Vi; (sum(diag(M %*% M)) + sum(diag(M))^2) / (nk - 1) }
  nu <- 1 / ((term(V1, n1) + term(V2, n2)) / (p^2 + p))
  df2 <- nu - p + 1
  f <- (nu - p + 1) / (p * nu) * t2
  data.frame(t_squared = t2, nu = nu, df1 = p, df2 = df2, f = f,
             sig_fraksional = pf(f, p, df2, lower.tail = FALSE),
             sig_bulat = pf(f, round(p), round(df2), lower.tail = FALSE))
}

asli <- read.csv("testing/glm-mv-reference/data/hotelling 2 populasi independen.csv")
geser <- read.csv("testing/fitur-v4/data/mv2-geser.csv")
out <- rbind(
  cbind(data = "asli (mv2 Welch, mv2wci, BB-KF03-02, BB-KF03-11)", welch(asli)),
  cbind(data = "geser (mv2wd, mv2ws, BB-KF03-05)", welch(geser))
)
num_cols <- sapply(out, is.numeric)
out[num_cols] <- lapply(out[num_cols], function(v) sprintf("%.17g", v))
write.csv(out, out_file, row.names = FALSE)
cat(R.version.string, "\n")
print(out)
