import React from "react";
import DataTableRenderer from "@/components/Output/Table/DataTableRenderer";
import GeneralChartContainer from "@/components/Output/Chart/GeneralChartContainer";

interface HomoscedasticityTestProps {
  data: string;
}

const HomoscedasticityTest: React.FC<HomoscedasticityTestProps> = ({ data }) => {
  let parsedData: { tables?: any[]; charts?: any[] } = {};

  try {
    parsedData = typeof data === "string" ? JSON.parse(data) : data;
  } catch (error) {
    console.error("Failed to parse HomoscedasticityTest data:", error);
    return <div className="text-red-500">Error parsing results data.</div>;
  }

  const { tables, charts } = parsedData;

  // Extract key stats for English Interpretation Summary
  const testTable = tables?.find((t: any) => t.title?.includes("ARCH-LM Test"));
  const fStatRow = testTable?.rows?.find((r: any) => r.test?.includes("F-statistic"));
  const obsR2Row = testTable?.rows?.find((r: any) => r.test?.includes("Obs*R-squared"));

  const fStat = fStatRow?.stat;
  const fProb = parseFloat(fStatRow?.prob || "1.0");
  const obsR2 = obsR2Row?.stat;
  const obsR2Prob = parseFloat(obsR2Row?.prob || "1.0");
  const lagsMatch = testTable?.title?.match(/Lags\s*=\s*(\d+)/i);
  const lags = lagsMatch ? parseInt(lagsMatch[1]) : 1;

  const isHomo = obsR2Prob >= 0.05;

  return (
    <div className="space-y-8">
      {tables && tables.length > 0 && (
        <div className="space-y-4">
          <DataTableRenderer data={JSON.stringify({ tables })} />
        </div>
      )}

      {charts && charts.length > 0 && (
        <div className="grid grid-cols-1 gap-6">
          {charts.map((chartConfig: any, index: number) => (
            <div key={index} className="border rounded-lg p-4 shadow-sm bg-white">
              <GeneralChartContainer data={JSON.stringify(chartConfig)} />
            </div>
          ))}
        </div>
      )}

      {/* ARCH-LM Test Interpretation Summary */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800/80 border border-slate-200 dark:border-slate-850 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
          <span className="p-1.5 bg-indigo-500 text-white rounded-lg">📊</span>
          ARCH-LM Test Interpretation (Heteroskedasticity)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Test Hypothesis and Conclusion */}
          <div className="space-y-3 p-4 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-850">
            <h4 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
              <span>🔗 Hypothesis Testing & Decision</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isHomo ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' : 'bg-rose-50 text-rose-700 border border-rose-250'}`}>
                {isHomo ? 'Homoscedastic' : 'Heteroscedastic (ARCH Effects)'}
              </span>
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed">
              {isHomo ? (
                `Fail to reject the null hypothesis (H₀: No ARCH effects) at the 5% significance level, since the Obs*R-squared p-value (${obsR2Prob.toFixed(4)}) is greater than 0.05. The residuals of the model are homoscedastic, indicating no significant autoregressive conditional heteroskedasticity.`
              ) : (
                `Reject the null hypothesis (H₀: No ARCH effects) at the 5% significance level, since the Obs*R-squared p-value (${obsR2Prob.toFixed(4)}) is less than 0.05. The residuals exhibit significant autoregressive conditional heteroskedasticity (ARCH effects).`
              )}
            </p>
          </div>

          {/* Statistics Summary & Recommendations */}
          <div className="space-y-3 p-4 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-850">
            <h4 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
              <span>⚡ Statistical Metrics & Recommendations</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-250">
                Lags Checked: {lags}
              </span>
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed">
              {isHomo ? (
                `With Obs*R-squared = ${obsR2} (p = ${obsR2Prob.toFixed(4)}) and F-statistic = ${fStat} (p = ${fProb.toFixed(4)}), there is no evidence of volatility clustering in the residuals. Standard linear OLS assumptions are satisfied, and advanced volatility modeling (like GARCH) is not statistically necessary.`
              ) : (
                `With Obs*R-squared = ${obsR2} (p = ${obsR2Prob.toFixed(4)}) and F-statistic = ${fStat} (p = ${fProb.toFixed(4)}), the residuals have volatility clustering. It is highly recommended to estimate a volatility model (e.g., ARCH, GARCH, EGARCH) to properly capture this conditional variance and avoid inefficient standard error estimates.`
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomoscedasticityTest;
