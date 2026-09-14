import React from "react";
import DataTableRenderer from "@/components/Output/Table/DataTableRenderer";
import GeneralChartContainer from "@/components/Output/Chart/GeneralChartContainer";

interface GarchAnalysisProps {
  data: string; // JSON string containing { tables: [...], charts: [...] }
}

const GarchAnalysis: React.FC<GarchAnalysisProps> = ({ data }) => {
  let parsedData: any = {};

  try {
    parsedData = typeof data === 'string' ? JSON.parse(data) : data;
  } catch (error) {
    console.error("Failed to parse GARCH analysis data:", error);
    return <div className="text-red-500">Error parsing results data.</div>;
  }

  const { tables, charts } = parsedData;

  // Extract key params/coefficients for dynamic interpretation
  const modelType = parsedData.modelType || "GARCH";
  const p = parsedData.p || 0;
  const q = parsedData.q || 0;
  const coefs = parsedData.coefficients || {};

  const muVal = parseFloat(coefs.mu || "0");
  const muP = parseFloat(coefs.mu_p || "1.0");
  const omegaVal = parseFloat(coefs.omega || "0");
  const omegaP = parseFloat(coefs.omega_p || "1.0");

  const alphas = coefs.alpha ? coefs.alpha.map((a: string) => parseFloat(a)) : [];
  const alphaPs = coefs.alpha_p ? coefs.alpha_p.map((ap: string) => parseFloat(ap)) : [];
  const alphaSum = alphas.reduce((a: number, b: number) => a + b, 0);

  const betas = coefs.beta ? coefs.beta.map((b: string) => parseFloat(b)) : [];
  const betaPs = coefs.beta_p ? coefs.beta_p.map((bp: string) => parseFloat(bp)) : [];
  const betaSum = betas.reduce((a: number, b: number) => a + b, 0);

  const gammas = coefs.gamma ? coefs.gamma.map((g: string) => parseFloat(g)) : [];
  const gammaPs = coefs.gamma_p ? coefs.gamma_p.map((gp: string) => parseFloat(gp)) : [];

  // Volatility persistence calculation
  let persistence = 0;
  if (modelType === "EGARCH") {
    persistence = betaSum;
  } else if (modelType === "IGARCH") {
    persistence = 1.0;
  } else {
    persistence = alphaSum + betaSum;
  }

  const hasAsymmetry = modelType === "EGARCH" || modelType === "TGARCH";
  const isSignificantAsymmetry = gammas.length > 0 && gammaPs[0] < 0.05;

  return (
    <div className="space-y-8">
      {/* Tables Section */}
      {tables && tables.length > 0 && (
        <div className="space-y-4">
          <DataTableRenderer data={JSON.stringify({ tables })} />
        </div>
      )}

      {/* Charts Section */}
      {charts && charts.length > 0 && (
        <div className="grid grid-cols-1 gap-6">
          {charts.map((chartConfig: any, index: number) => (
            <div key={index} className="border rounded-lg p-4 shadow-sm bg-white">
              <GeneralChartContainer data={JSON.stringify(chartConfig)} />
            </div>
          ))}
        </div>
      )}

      {/* Volatility Model Interpretation Summary */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800/80 border border-slate-200 dark:border-slate-850 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
          <span className="p-1.5 bg-indigo-500 text-white rounded-lg">📊</span>
          Volatility Model Interpretation ({modelType}({p}, {q}))
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Volatility Persistence */}
          <div className="space-y-3 p-4 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-850">
            <h4 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
              <span>📈 Volatility Persistence & Memory</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${persistence >= 0.95 ? 'bg-amber-50 text-amber-700 border border-amber-250' : 'bg-emerald-50 text-emerald-700 border border-emerald-250'}`}>
                Persistence: {persistence.toFixed(4)}
              </span>
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed">
              {modelType === "IGARCH" ? (
                "Under the IGARCH model, the persistence is constraint-bound to exactly 1.0000. This implies that shocks to conditional variance are permanent, meaning volatility memory does not decay over time and long-term forecasts of variance do not revert to a constant mean."
              ) : persistence >= 0.95 ? (
                `The conditional variance exhibits very high persistence (${persistence.toFixed(4)}). Shocks to volatility decay extremely slowly, which confirms significant volatility clustering—periods of high volatility will tend to linger for a long time before returning to baseline.`
              ) : persistence >= 0.85 ? (
                `The persistence is moderate-to-high (${persistence.toFixed(4)}). Shocks to volatility will persist for some periods but will eventually decay and mean-revert back to the baseline unconditional variance.`
              ) : (
                `The persistence is relatively low (${persistence.toFixed(4)}). Volatility clusters are short-lived, and shocks to the variance return back to their long-run average quickly.`
              )}
            </p>
          </div>

          {/* Short-run shock reaction */}
          <div className="space-y-3 p-4 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-850">
            <h4 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
              <span>⚡ News Impact & Shock Sensitivity</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-250">
                ARCH Sum: {alphaSum.toFixed(4)}
              </span>
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed">
              {alphaSum >= 0.15 ? (
                `The sensitivity to recent market news is high (ARCH sum = ${alphaSum.toFixed(4)}). Volatility reacts aggressively to sudden shocks (innovations), meaning that large positive or negative returns will cause immediate spikes in conditional variance.`
              ) : alphaSum >= 0.05 ? (
                `The sensitivity to recent shocks is moderate (ARCH sum = ${alphaSum.toFixed(4)}). Immediate shocks have a noticeable but controlled impact on variance, with GARCH persistence dominating the process.`
              ) : (
                `The sensitivity to immediate shocks is weak (ARCH sum = ${alphaSum.toFixed(4)}). Volatility spikes are not heavily driven by individual daily innovations; instead, the overall volatility level is governed by long-run persistence.`
              )}
            </p>
          </div>

          {/* Asymmetry and Leverage Effect */}
          {hasAsymmetry && (
            <div className="md:col-span-2 space-y-3 p-4 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-850">
              <h4 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                <span>🔄 Volatility Asymmetry & Leverage Effects</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isSignificantAsymmetry ? 'bg-purple-50 text-purple-700 border border-purple-250' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                  {isSignificantAsymmetry ? "Asymmetry Significant" : "No Significant Asymmetry"}
                </span>
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed">
                {isSignificantAsymmetry ? (
                  modelType === "EGARCH" ? (
                    gammas[0] < 0 ? (
                      `The asymmetry coefficient (Gamma) is negative (${gammas[0].toFixed(4)}) and statistically significant (p = ${gammaPs[0].toFixed(4)}). This confirms the presence of a strong leverage effect—negative shocks (bad news) increase volatility significantly more than positive shocks (good news) of the same magnitude.`
                    ) : (
                      `The asymmetry coefficient (Gamma) is positive (${gammas[0].toFixed(4)}) and statistically significant (p = ${gammaPs[0].toFixed(4)}). Good news has a larger impact on volatility than bad news in this series.`
                    )
                  ) : (
                    gammas[0] > 0 ? (
                      `The asymmetry coefficient (Gamma) is positive (${gammas[0].toFixed(4)}) and statistically significant (p = ${gammaPs[0].toFixed(4)}). Negative shocks (bad news) lead to a larger spike in conditional volatility than positive shocks of equal size, showing clear asymmetric behavior.`
                    ) : (
                      `The asymmetry coefficient (Gamma) is negative (${gammas[0].toFixed(4)}) and statistically significant (p = ${gammaPs[0].toFixed(4)}). positive shocks have a larger impact on conditional variance than negative shocks.`
                    )
                  )
                ) : (
                  "The asymmetry coefficient (Gamma) is not statistically significant (p > 0.05). Shocks to the series (both positive and negative returns) affect conditional volatility symmetrically."
                )}
              </p>
            </div>
          )}

          {/* Unconditional Variance & Constant */}
          <div className="md:col-span-2 space-y-3 p-4 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-850">
            <h4 className="font-semibold text-slate-700 dark:text-slate-200">
              🛠️ Baseline Volatility & Constant
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-850">
                <span className="font-semibold block text-slate-500 dark:text-slate-400 mb-1">Mean Equation Drift (Constant C)</span>
                <span className="text-foreground font-bold">
                  Value: {muVal.toFixed(6)} {muP < 0.05 ? "(Significant, p < 0.05)" : "(Insignificant, p > 0.05)"}
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-850">
                <span className="font-semibold block text-slate-500 dark:text-slate-400 mb-1">Variance Equation Baseline (Omega)</span>
                <span className="text-foreground font-bold">
                  Value: {omegaVal.toFixed(6)} {omegaP < 0.05 ? "(Significant, p < 0.05)" : "(Insignificant, p > 0.05)"}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default GarchAnalysis;
