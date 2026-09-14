use crate::models::result::{HosmerLemeshowGroup, HosmerLemeshowResult};
use nalgebra::DVector;

// Helper struct untuk sorting
struct ProbPair {
    y: f64,
    prob: f64,
}

/// Hosmer-Lemeshow Goodness-of-Fit Test (Ĉ statistic)
///
/// Implementation based on Hosmer & Lemeshow (2000) "Applied Logistic Regression",
/// Chapter 5 — the decile-of-risk grouping approach:
///
/// 1. Sort cases by predicted probability π̂ (ascending).
/// 2. Form g groups of approximately equal size using greedy sequential
///    grouping.  All cases with identical π̂ are kept together (never split
///    across groups).
/// 3. When a large tie block causes a group to grow beyond its target size,
///    the number of remaining group "slots" is reduced proportionally via
///        groups_left = g − ⌈(cumulative_cases × g) / N⌉
///    This prevents the creation of tiny leftover groups.
/// 4. At each planned boundary, if the boundary falls inside a tie block,
///    snap to the nearer tie-block edge (extend forward or shrink backward)
///    whichever yields a group size closer to the target.
/// 5. Compute the Ĉ statistic:
///        Ĉ = Σ_{k=1}^{g'} [ (O₁ₖ − E₁ₖ)²/E₁ₖ  +  (O₀ₖ − E₀ₖ)²/E₀ₖ ]
/// 6. df = g' − 2  (actual number of non-empty groups minus 2).
/// 7. p-value from χ²(df).
pub fn calculate(
    y_true: &DVector<f64>,
    y_pred_prob: &DVector<f64>,
    g_groups: usize,
) -> Result<HosmerLemeshowResult, String> {
    if y_true.len() != y_pred_prob.len() {
        return Err("Length mismatch between Y true and predicted probabilities".to_string());
    }

    let n = y_true.len();
    if n < g_groups {
        return Err("Sample size too small for Hosmer-Lemeshow test".to_string());
    }

    // ====================================================================
    // 1. Sort by predicted probability (ascending, stable sort)
    // ====================================================================
    let mut data: Vec<ProbPair> = (0..n)
        .map(|i| ProbPair {
            y: y_true[i],
            prob: y_pred_prob[i],
        })
        .collect();
    data.sort_by(|a, b| a.prob.partial_cmp(&b.prob).unwrap());

    // ====================================================================
    // 2. Greedy sequential grouping — exactly g groups (SPSS-compatible)
    // ====================================================================
    //
    // Key principles (Hosmer & Lemeshow, 2000):
    //   - Groups are formed sequentially by ranked predicted probability.
    //   - All cases with identical predicted probabilities must reside in
    //     the same group (ties are never split across groups).
    //   - Groups should be approximately equal in size.
    //   - The result MUST have at most g groups.
    //
    // Algorithm:
    //   - Use a FIXED target size = round(N/g) for every group (NTILE-like).
    //     This ensures groups 1..g-1 get consistent boundaries regardless
    //     of how ties shift earlier groups.
    //   - The loop creates at most g−1 groups.
    //   - After the loop, all remaining cases form the g-th (final) group,
    //     absorbing any surplus from tie-induced group size changes.

    let g = g_groups;
    let mut group_ranges: Vec<(usize, usize)> = Vec::new(); // (start_incl, end_excl)
    let mut start = 0;

    // Fixed target: always aim for the ideal group size N/g.
    // This replicates NTILE behavior: each group targets the same size
    // regardless of how previous groups were affected by ties.
    // Any deficit from oversized/undersized groups accumulates in the last group.
    let target = ((n as f64) / (g as f64)).round().max(1.0) as usize;

    loop {
        // Stop when we have created g−1 groups: all remaining cases
        // go into the final (g-th) group after the loop.
        if group_ranges.len() >= g - 1 || start >= n {
            break;
        }

        // Planned end (exclusive)
        let planned_end = (start + target).min(n);

        // ----------------------------------------------------------
        // 2a. Snap to the nearest tie-block boundary
        // ----------------------------------------------------------
        // If the planned boundary falls inside a tie block, we must
        // move it to one of the block's edges.  Choose the edge that
        // makes the group size closest to the target.

        let end;
        if planned_end > start && planned_end < n {
            let boundary_prob = data[planned_end - 1].prob;

            // Option A — Extend forward: include the whole tie block
            let mut extend_end = planned_end;
            while extend_end < n && data[extend_end].prob == boundary_prob {
                extend_end += 1;
            }

            // Option B — Shrink backward: exclude the tie block
            let mut shrink_end = planned_end - 1;
            while shrink_end > start && data[shrink_end - 1].prob == boundary_prob {
                shrink_end -= 1;
            }
            // shrink_end is now the index of the first case in the
            // tie block (within this group).  Excluding the tie block
            // means the group ends at shrink_end (exclusive).

            let ext_size = extend_end - start;
            let shr_size = shrink_end - start;

            if shr_size == 0 {
                // Shrinking would create an empty group — must extend
                end = extend_end;
            } else {
                let ext_diff = (ext_size as f64 - target as f64).abs();
                let shr_diff = (shr_size as f64 - target as f64).abs();
                if shr_diff < ext_diff {
                    end = shrink_end;
                } else {
                    // When equidistant, prefer extending (larger groups are
                    // safer for the χ² approximation)
                    end = extend_end;
                }
            }
        } else {
            end = planned_end;
        }

        // Safety: prevent empty groups
        let final_end = if end <= start {
            let mut e = start + 1;
            while e < n && data[e].prob == data[start].prob {
                e += 1;
            }
            e
        } else {
            end
        };

        group_ranges.push((start, final_end));
        start = final_end;
    }

    // Final group: all remaining cases (the g-th group)
    if start < n {
        group_ranges.push((start, n));
    }

    // ====================================================================
    // 3. Compute per-group statistics
    // ====================================================================
    let mut groups_result: Vec<HosmerLemeshowGroup> = Vec::new();
    let mut chi_square_stat = 0.0;

    for (gstart, gend) in &group_ranges {
        let mut obs_1 = 0usize;
        let mut obs_0 = 0usize;
        let mut sum_prob = 0.0;

        for k in *gstart..*gend {
            if (data[k].y - 1.0).abs() < 1e-9 {
                obs_1 += 1;
            } else {
                obs_0 += 1;
            }
            sum_prob += data[k].prob;
        }

        let count = gend - gstart;
        let exp_1 = sum_prob;
        let exp_0 = count as f64 - sum_prob;

        // Chi-square contribution (guard against zero expected)
        if exp_1 > 1e-9 && exp_0 > 1e-9 {
            chi_square_stat += (obs_1 as f64 - exp_1).powi(2) / exp_1
                + (obs_0 as f64 - exp_0).powi(2) / exp_0;
        }

        groups_result.push(HosmerLemeshowGroup {
            group: groups_result.len() + 1, // 1-based sequential numbering
            size: count,
            observed_1: obs_1,
            expected_1: exp_1,
            observed_0: obs_0,
            expected_0: exp_0,
            total_observed: count,
        });
    }

    // ====================================================================
    // 4. Degrees of freedom and p-value
    // ====================================================================
    let actual_groups = groups_result.len();

    // SPSS behavior: when actual groups ≤ 2, df = g' - 2 = 0 (or negative),
    // the test is undefined. SPSS reports chi-square = .000, df = 0, sig = "."
    // We use NaN for sig so the formatter displays "." (matching SPSS).
    if actual_groups <= 2 {
        return Ok(HosmerLemeshowResult {
            chi_square: 0.0,
            df: 0,
            sig: f64::NAN,
            contingency_table: groups_result,
        });
    }

    let df = actual_groups - 2;
    let sig = crate::utils::probability::chi_square_significance(chi_square_stat, df as i32);

    Ok(HosmerLemeshowResult {
        chi_square: chi_square_stat,
        df,
        sig,
        contingency_table: groups_result,
    })
}
