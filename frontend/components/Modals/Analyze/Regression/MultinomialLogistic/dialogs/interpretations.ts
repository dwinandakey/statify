/**
 * Generate interpretive descriptions for multinomial logistic regression output tables
 * Based on statistical values returned from WASM analysis
 */

/**
 * Generate interpretation for Case Processing Summary
 */
export function generateCaseProcessingDescription(
    validN: number | string,
    missingN: number | string,
    totalN: number | string,
    isWeighted: boolean
): string {
    const parseNum = (n: any) => {
        const num = typeof n === 'string' ? parseFloat(n) : Number(n);
        return Number.isFinite(num) ? num : 0;
    };

    const valid = parseNum(validN);
    const missing = parseNum(missingN);
    const total = parseNum(totalN);

    const formatNum = (num: number) =>
        Number.isInteger(num) ? String(num) : num.toFixed(1);

    const validPct = total > 0 ? ((valid / total) * 100).toFixed(1) : "0.0";
    const weightText = isWeighted ? " (weighted)" : "";
    const missingText = missing > 0 ? ` Missing cases: ${formatNum(missing)}${weightText}.` : '';

    return `Analysis includes ${formatNum(valid)}${weightText} valid cases (${validPct}%) out of total ${formatNum(total)}.${missingText} Data processed using listwise deletion of incomplete observations.`;
}

/**
 * Generate interpretation for Model Fitting Information
 */
export function generateModelFittingDescription(
    nullNeg2LL: number,
    finalNeg2LL: number,
    chiSquare: number,
    pValue: number,
    df: number
): string {
    if (!Number.isFinite(nullNeg2LL) || !Number.isFinite(finalNeg2LL) || !Number.isFinite(chiSquare)) {
        return "Model fitting information comparing intercept-only baseline to final model with predictors.";
    }

    const pText = pValue < 0.001
        ? "p < .001"
        : `p = ${pValue.toFixed(3)}`;

    if (pValue < 0.05) {
        return `The Final model significantly improves fit over the Intercept-Only baseline model (χ²(${df}) = ${chiSquare.toFixed(2)}, ${pText}), reducing -2 Log Likelihood from ${nullNeg2LL.toFixed(2)} to ${finalNeg2LL.toFixed(2)}. The set of predictors reliably predicts outcome category membership.`;
    }

    return `The Final model does not show a statistically significant improvement over the Intercept-Only baseline (χ²(${df}) = ${chiSquare.toFixed(2)}, ${pText}). The baseline -2 Log Likelihood was ${nullNeg2LL.toFixed(2)} compared to ${finalNeg2LL.toFixed(2)} for the full model.`;
}

/**
 * Generate interpretation for Step Summary / Model Information
 */
export function generateStepSummaryDescription(
    iterations: number,
    converged: boolean
): string {
    if (converged) {
        return `Newton-Raphson parameter estimation converged successfully after ${iterations} iteration${iterations !== 1 ? 's' : ''} based on specified convergence criteria.`;
    }

    return `Newton-Raphson estimation did not achieve convergence within the maximum limit of ${iterations} iterations. Results should be interpreted with caution, and increasing the iteration limit is recommended.`;
}

/**
 * Generate interpretation for Pseudo R-Square
 */
export function generatePseudoRSquareDescription(
    coxSnell: number,
    nagelkerke: number,
    mcFadden: number
): string {
    if (!Number.isFinite(nagelkerke)) {
        return "Pseudo R-Square measures indicate the proportion of variance in the outcome explained by the model.";
    }

    const interpretation =
        nagelkerke >= 0.40 ? "substantial" :
            nagelkerke >= 0.20 ? "moderate" :
                nagelkerke >= 0.10 ? "small" :
                    "weak";

    const nagPct = (nagelkerke * 100).toFixed(1);

    return `Pseudo R-Square measures: Cox & Snell R² = ${coxSnell.toFixed(3)}, Nagelkerke R² = ${nagelkerke.toFixed(3)} (${interpretation} effect size), and McFadden R² = ${mcFadden.toFixed(3)}. The model explains approximately ${nagPct}% of the variance in outcome category membership.`;
}

/**
 * Generate interpretation for Parameter Estimates
 */
export function generateParameterEstimatesDescription(
    nPredictors: number,
    nCategories: number,
    nSignificant: number,
    totalParams?: number,
    refCategoryName?: string,
    significantParamNames?: string[]
): string {
    const calcTotal = totalParams ?? (nPredictors * (nCategories - 1) + (nCategories - 1));
    const percentSig = calcTotal > 0 ? ((nSignificant / calcTotal) * 100).toFixed(1) : '0.0';
    const refText = refCategoryName ? ` (reference category: '${refCategoryName}')` : '';

    let details = `Logit coefficients for ${nCategories} outcome categories${refText} with ${nPredictors} predictor term${nPredictors !== 1 ? 's' : ''}. Out of ${calcTotal} estimated parameters, ${nSignificant} (${percentSig}%) are statistically significant at p < .05 level.`;

    if (significantParamNames && significantParamNames.length > 0) {
        details += ` Significant parameters: ${significantParamNames.join(', ')}.`;
    }

    return details;
}

/**
 * Generate interpretation for Classification Table
 */
export function generateClassificationDescription(
    overallPercentage: number,
    categoryPercentages?: number[],
    categoryNames?: string[]
): string {
    if (!Number.isFinite(overallPercentage)) {
        return "Model's ability to correctly classify observations into outcome categories.";
    }

    // Accept ratio (0-1) or percentage (0-100)
    const pct = overallPercentage > 1 ? overallPercentage : overallPercentage * 100;
    const overallStr = pct.toFixed(1);

    const accuracyInterpretation =
        pct >= 90 ? "excellent" :
            pct >= 80 ? "very good" :
                pct >= 70 ? "good" :
                    pct >= 60 ? "fair" :
                        "poor";

    let text = `Overall classification accuracy: ${overallStr}% (${accuracyInterpretation}). The model correctly predicts outcome category membership ${overallStr}% of the time.`;

    if (categoryPercentages && categoryPercentages.length > 0) {
        const catBreakdown = categoryPercentages.map((cAcc, i) => {
            const val = cAcc > 1 ? cAcc : cAcc * 100;
            const name = categoryNames?.[i] ? `'${categoryNames[i]}'` : `Category ${i + 1}`;
            return `${name}: ${val.toFixed(1)}%`;
        }).join(', ');
        text += ` Per-category accuracy breakdown: ${catBreakdown}.`;
    }

    return text;
}

/**
 * Generate interpretation for Goodness-of-Fit Tests
 */
export function generateGoodnessOfFitDescription(
    pearsonChiSquare: number,
    pearsonDf: number,
    pearsonPValue: number,
    deviance: number,
    devianceDf: number,
    deviancePValue: number
): string {
    if (!Number.isFinite(pearsonChiSquare) || !Number.isFinite(deviance)) {
        return "Goodness-of-fit tests (Pearson and Deviance) assess whether the model adequately fits the observed data.";
    }

    const formatP = (p: number) => (p < 0.001 ? "< .001" : `= ${p.toFixed(3)}`);

    const pearsonFit = pearsonPValue >= 0.05 ? "adequate fit (p ≥ .05)" : `potential lack of fit (p ${formatP(pearsonPValue)})`;
    const devianceFit = deviancePValue >= 0.05 ? "adequate fit (p ≥ .05)" : `potential lack of fit (p ${formatP(deviancePValue)})`;

    const overallFit = (pearsonPValue >= 0.05 && deviancePValue >= 0.05)
        ? "Non-significant p-values (p ≥ .05) indicate that the model fits the observed data adequately."
        : "Significant p-values (p < .05) suggest potential discrepancy between observed counts and model predictions.";

    return `Goodness-of-Fit tests: Pearson χ²(${pearsonDf}) = ${pearsonChiSquare.toFixed(2)} (${pearsonFit}); Deviance χ²(${devianceDf}) = ${deviance.toFixed(2)} (${devianceFit}). ${overallFit}`;
}

/**
 * Generate interpretation for Likelihood Ratio Tests
 */
export function generateLikelihoodRatioDescription(
    variableCount: number,
    significantCount: number,
    testOverallP: number,
    significantVariableNames?: string[]
): string {
    const percentSig = variableCount > 0
        ? ((significantCount / variableCount) * 100).toFixed(0)
        : "0";

    const pText = testOverallP < 0.001 ? "p < .001" : `p = ${testOverallP.toFixed(3)}`;
    const overallInterpret = testOverallP < 0.05
        ? `significant (${pText}), indicating the predictors collectively improve model fit`
        : `not significant (${pText}), indicating predictors do not significantly improve fit over baseline`;

    let text = `Likelihood ratio tests show ${significantCount} of ${variableCount} predictor term${variableCount !== 1 ? 's' : ''} with significant overall main effects (${percentSig}% significant at p < .05). Overall model test is ${overallInterpret}.`;

    if (significantVariableNames && significantVariableNames.length > 0) {
        text += ` Predictors with significant main effects: ${significantVariableNames.join(', ')}.`;
    }

    return text;
}

/**
 * Generate interpretation for Asymptotic Covariances
 */
export function generateAsymptoticCovariancesDescription(nParams: number): string {
    return `Asymptotic covariance matrix of ${nParams} parameter estimates. Diagonal elements represent squared standard errors of logit coefficients.`;
}

/**
 * Generate interpretation for Asymptotic Correlations
 */
export function generateAsymptoticCorrelationsDescription(nParams: number): string {
    return `Asymptotic correlation matrix of ${nParams} parameter estimates. Values range from -1 to +1, indicating potential collinearity or interdependence among parameter estimates.`;
}

/**
 * Generate interpretation for Monotonicity Measures
 */
export function generateMonotonicityDescription(
    spearmanRho: number,
    sampleN: number
): string {
    if (!Number.isFinite(spearmanRho)) {
        return "Monotonic association measures assess the strength of alignment between observed and predicted outcome categories.";
    }

    const absRho = Math.abs(spearmanRho);
    const interpretation =
        absRho >= 0.5 ? "strong" :
            absRho >= 0.3 ? "moderate" :
                absRho >= 0.1 ? "weak" :
                    "negligible";

    return `Spearman rank correlation r_s = ${spearmanRho.toFixed(3)} (N = ${sampleN}) indicates a ${interpretation} monotonic association between observed and predicted outcome categories.`;
}

/**
 * Generate interpretation for Cell Probabilities
 */
export function generateCellProbabilitiesDescription(
    nRows: number,
    nCategories: number,
    categoryNames?: string[]
): string {
    const catText = categoryNames && categoryNames.length > 0 ? ` (${categoryNames.join(', ')})` : '';
    return `Predicted cell probabilities for membership across ${nCategories} outcome categories${catText} for ${nRows} observation${nRows !== 1 ? 's' : ''}. Probabilities sum to 1.0 within each observation row.`;
}

