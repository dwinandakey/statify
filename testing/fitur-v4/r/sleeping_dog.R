# Contoh sleeping dog (Johnson & Wichern, §6.2), R dasar, sebagai pembanding
# nilai yang tampil di Statify (butir 5).
#   Kontras: d1 = −y1 − y2 + y3 + y4 (halotan), d2 = y1 − y2 + y3 − y4 (CO2),
#            d3 = y1 − y2 − y3 + y4 (interaksi).
#   T² = n d̄ᵀ S_d⁻¹ d̄; Hotelling's Trace = T²/(n − 1);
#   F = (n − q + 1)/((n − 1)(q − 1)) · T² ~ F(q − 1, n − q + 1), q = 4;
#   CI T² (§5.4 pada kontras): d̄ᵢ ± √((n−1)(q−1)/(n−q+1) · F(q−1, n−q+1; α)) · √(s_d,ᵢᵢ/n).
# Keluaran ke layar dan testing/fitur-v4/r/sleeping_dog_r.csv.
#
# Pemakaian (root repo): Rscript testing/fitur-v4/r/sleeping_dog.R

dat <- read.csv("testing/fitur-v4/data/sleeping-dog-kontras.csv")
D <- as.matrix(dat[, c("d1", "d2", "d3")])
n <- nrow(D); p <- ncol(D)
m <- colMeans(D); S <- cov(D)
t2 <- drop(n * t(m) %*% solve(S) %*% m)
trace <- t2 / (n - 1)
f <- (n - p) / ((n - 1) * p) * t2
sig <- pf(f, p, n - p, lower.tail = FALSE)
c_t2 <- sqrt((n - 1) * p / (n - p) * qf(0.95, p, n - p))
half <- c_t2 * sqrt(diag(S) / n)

# Pembanding RM: uji multivariat faktor within (Hotelling's Trace dari E = S_d(n−1), H = n d̄d̄ᵀ).
Y <- as.matrix(dat[, c("y1", "y2", "y3", "y4")])
C <- cbind(Y[, 2] - Y[, 1], Y[, 3] - Y[, 2], Y[, 4] - Y[, 3])  # kontras lain; trace invarian
mc <- colMeans(C); Sc <- cov(C)
trace_rm <- drop(n * t(mc) %*% solve((n - 1) * Sc) %*% mc)

cat(R.version.string, "\n")
cat(sprintf("n = %d, p = %d\nT² = %.6f\nHotelling's Trace = %.6f (RM, kontras lain: %.6f)\nF(%d, %d) = %.6f, Sig. = %.3g\nc = %.6f\n", n, p, t2, trace, trace_rm, p, n - p, f, sig, c_t2))
out <- data.frame(dv = colnames(D), mean = m, half_width = half, lower = m - half, upper = m + half)
print(out, digits = 8)
write.csv(rbind(
  data.frame(item = c("T2", "hotelling_trace", "F", "df1", "df2", "sig", "c_t2"),
             value = sprintf("%.17g", c(t2, trace, f, p, n - p, sig, c_t2))),
  data.frame(item = paste0(out$dv, c("_mean", "_half", "_lower", "_upper")[rep(1:4, each = 3)]),
             value = sprintf("%.17g", c(out$mean, out$half_width, out$lower, out$upper)))
), "testing/fitur-v4/r/sleeping_dog_r.csv", row.names = FALSE)
