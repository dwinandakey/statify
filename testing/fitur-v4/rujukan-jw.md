# Rujukan Johnson & Wichern untuk fitur v4 dan fitur final (Σ diketahui)

**Buku:** Johnson, R. A., & Wichern, D. W. *Applied Multivariate Statistical Analysis*, edisi 6.

**Aturan rujukan.** Sampai penulis memverifikasi dari buku, rujukan di komentar kode, catatan tabel, dan dokumen hanya menyebut subbab:
- §5.4 untuk satu populasi;
- §6.2 untuk berpasangan;
- §6.3 untuk dua populasi, termasuk Krishnamoorthy–Yu;
- §4.2 dan §4.4 untuk uji khi-kuadrat dengan Σ diketahui (fitur final, no. 13–17).

Nomor Result, nomor persamaan, dan halaman **belum diverifikasi**, jadi tidak dicantumkan. Kolom terakhir tabel di bawah diisi penulis.

**Notasi.**
- F(ν₁, ν₂; α) dan t(ν; α) adalah kuantil atas-α.
- sᵢᵢ adalah elemen diagonal matriks kovarians sampel (pembagi n − 1).
- p adalah jumlah variabel dependen (atau jumlah pasangan pada uji berpasangan).

| No. | Dipakai di | Rumus | Subbab | Nomor Result/persamaan dan halaman (diisi penulis) |
|---|---|---|---|---|
| 1 | CI T² satu populasi | x̄ᵢ ± √( p(n−1)/(n−p) · F(p, n−p; α) ) · √(sᵢᵢ/n) | §5.4 | |
| 2 | CI Bonferroni satu populasi | x̄ᵢ ± t(n−1; α/(2p)) · √(sᵢᵢ/n) | §5.4 | |
| 3 | CI T² berpasangan (pada selisih d) | d̄ᵢ ± √( p(n−1)/(n−p) · F(p, n−p; α) ) · √(s_d,ᵢᵢ/n) | §6.2 | |
| 4 | CI Bonferroni berpasangan | d̄ᵢ ± t(n−1; α/(2p)) · √(s_d,ᵢᵢ/n) | §6.2 | |
| 5 | Hipotesis berpasangan dengan δ₀ | H₀: μd = δ₀, diuji sebagai T² satu populasi pada d terhadap δ₀ | §6.2 | |
| 6 | Hipotesis dua populasi dengan δ₀ | H₀: μ₁ − μ₂ = δ₀; T² = (x̄₁ − x̄₂ − δ₀)ᵀ[(1/n₁ + 1/n₂)S_pooled]⁻¹(x̄₁ − x̄₂ − δ₀) | §6.3 | |
| 7 | CI T² dua populasi, Σ₁ = Σ₂ | (x̄₁ᵢ − x̄₂ᵢ) ± c · √( (1/n₁ + 1/n₂) · s_pooled,ᵢᵢ ), c² = (n₁+n₂−2)p/(n₁+n₂−p−1) · F(p, n₁+n₂−p−1; α) | §6.3 | |
| 8 | CI Bonferroni dua populasi, Σ₁ = Σ₂ | (x̄₁ᵢ − x̄₂ᵢ) ± t(n₁+n₂−2; α/(2p)) · √( (1/n₁ + 1/n₂) · s_pooled,ᵢᵢ ) | §6.3 | |
| 9 | Uji Welch dua populasi, Σ₁ ≠ Σ₂ (Multivariate Tests) | T² = dᵀV⁻¹d, V = S₁/n₁ + S₂/n₂, d = x̄₁ − x̄₂; F = (ν−p+1)/(pν) · T² ~ F(p, ν−p+1) | §6.3 (Krishnamoorthy–Yu) | |
| 10 | ν Krishnamoorthy–Yu | 1/ν = Σᵢ₌₁,₂ [1/(nᵢ−1)] · {tr((VᵢV⁻¹)²) + (tr(VᵢV⁻¹))²} / (p² + p), Vᵢ = Sᵢ/nᵢ | §6.3 (Krishnamoorthy–Yu) | |
| 11 | CI T² dua populasi, Σ₁ ≠ Σ₂ | (x̄₁ᵢ − x̄₂ᵢ) ± c · √( s₁ᵢᵢ/n₁ + s₂ᵢᵢ/n₂ ), c² = νp/(ν−p+1) · F(p, ν−p+1; α), ν dari no. 10 (tidak dibulatkan) | §6.3 (Krishnamoorthy–Yu) | |
| 12 | CI Bonferroni dua populasi, Σ₁ ≠ Σ₂ (Welch t per variabel) | (x̄₁ᵢ − x̄₂ᵢ) ± t(νᵢ; α/(2p)) · √( s₁ᵢᵢ/n₁ + s₂ᵢᵢ/n₂ ), νᵢ = (s₁ᵢᵢ/n₁ + s₂ᵢᵢ/n₂)² / ((s₁ᵢᵢ/n₁)²/(n₁−1) + (s₂ᵢᵢ/n₂)²/(n₂−1)) | §6.3 | |
| 13 | Dasar uji Σ diketahui | x ~ Nₚ(μ, Σ) ⇒ (x − μ)ᵀΣ⁻¹(x − μ) ~ χ²(p); kombinasi linear vektor normal tetap normal | §4.2 | |
| 14 | Sebaran rata-rata sampel | x̄ ~ Nₚ(μ, Σ/n) untuk sampel acak dari Nₚ(μ, Σ) | §4.4 | |
| 15 | Uji χ² satu populasi dan berpasangan | χ² = n(x̄ − μ₀)ᵀΣ⁻¹(x̄ − μ₀) ~ χ²(p) di bawah H₀ (berpasangan: d̄, Σd, δ₀); dari no. 13 dan 14 | §4.2, §4.4 | |
| 16 | Uji χ² dua populasi | χ² = (x̄₁ − x̄₂ − δ₀)ᵀV⁻¹(x̄₁ − x̄₂ − δ₀) ~ χ²(p), V = (1/n₁ + 1/n₂)Σ atau Σ₁/n₁ + Σ₂/n₂ (sampel independen: x̄₁ − x̄₂ ~ Nₚ(μ₁ − μ₂, V)) | §4.2, §4.4 | |
| 17 | CI simultan Σ diketahui | estimasiᵢ ± √χ²(p; α) · √Vᵢᵢ (χ² simultan) dan estimasiᵢ ± z(α/(2p)) · √Vᵢᵢ (Bonferroni) | §4.2, §4.4 (lihat catatan) | |

## Catatan untuk verifikasi

- **No. 9–11: sumber rumus.** Krishnamoorthy, K., & Yu, J. (2004). Modified Nel and Van der Merwe test for the multivariate Behrens–Fisher problem. *Statistics & Probability Letters*, 66, 161–169. Penulis perlu memastikan apakah §6.3 J&W edisi 6 memuat modifikasi ini atau hanya merujuknya. Bila hanya merujuk, naskah dapat mengutip Krishnamoorthy & Yu (2004) langsung.
- **No. 12: Welch–Satterthwaite univariat.** Penulis perlu memastikan apakah rumus ini ada di §6.3. Bila tidak, rujukan pembandingnya adalah Welch (1947) atau Satterthwaite (1946).
- **Sebelum revisi ini** (kode `8751e76c`–`22a8be47`), CI Σ₁ ≠ Σ₂ memakai selang khi-kuadrat sampel besar dan Bonferroni z(α/(2p)). Keduanya diganti oleh no. 11 dan 12 agar konsisten dengan uji Welch di aplikasi.

- **No. 17: argumen proyeksi.** Selang χ² simultan diturunkan dari no. 15/16 dengan argumen proyeksi yang sama seperti selang T² simultan §5.4, dengan Σ (atau V) di tempat S. Bentuknya sama dengan selang sampel besar §5.5, tetapi berlaku eksak karena Σ diketahui. Catatan tabel hanya menyebut §4.2 dan §4.4 (sesuai permintaan: rujukan bab 4, subbab saja); penulis dapat menambah rujukan §5.4 di naskah bila perlu.
- **Validasi no. 13–17:** R dasar (`testing/final/r/known-sigma.R`): `n * mahalanobis`, `pchisq`, `qchisq`, `qnorm`; selisih maks 3.6e-10 pada 300 nilai (`testing/final/bagian1/known-sigma-vs-r.txt`).

## Tempat rujukan dipakai

- **Komentar kode:** `frontend/components/Modals/Analyze/general-linear-model/multivariate/rust/src/wasm/constructor.rs` (`calculate_simultaneous_ci`, `krishnamoorthy_yu_nu`, `calculate_known_covariance_test`) dan `rust/src/stats/multivariate_tests.rs` (`calculate_welch_two_sample_t2`).
- **Catatan tabel:** "Simultaneous Confidence Intervals" (`services/multivariate-analysis-formatter.ts`, `formatSimultaneousCI`), "Chi-Square Test (Known Covariance Matrix)" dan "Simultaneous Confidence Intervals (Known Covariance Matrix)" (`formatKnownCovarianceTest`, `formatKnownCovarianceIntervals`).
- **Skrip pembanding:** `testing/fitur-v4/r/ci_simultan.R`, `welch_sig.R`, `ci_mvtests.R`.
- **Dokumen:** `investigasi.md`, `thesis-impact-v4.md`, `testing/RELEASE-NOTES.md` §v4, skenario black-box v4.
