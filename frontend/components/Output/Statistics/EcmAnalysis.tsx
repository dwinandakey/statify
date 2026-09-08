import React from "react";
import DataTableRenderer from "@/components/Output/Table/DataTableRenderer";
import GeneralChartContainer from "@/components/Output/Chart/GeneralChartContainer";

interface EcmAnalysisProps {
  data: string; // JSON string containing { tables: [...], charts: [...] }
}

const EcmAnalysis: React.FC<EcmAnalysisProps> = ({ data }) => {
  let parsedData: { tables?: any[]; charts?: any[] } = {};

  try {
    parsedData = typeof data === 'string' ? JSON.parse(data) : data;
  } catch (error) {
    console.error("Failed to parse ECM analysis data:", error);
    return <div className="text-red-500">Error parsing results data.</div>;
  }

  const { tables, charts } = parsedData;

  // Extract key stats for Interpretation Summary
  const cointeqTable = tables?.find((t: any) => t.title?.includes("Cointegration Test"));
  const shortRunTable = tables?.find((t: any) => t.title?.includes("Short Run"));
  const assumptionsTable = tables?.find((t: any) => t.title?.includes("Classical Assumptions"));
  
  const isCoint = cointeqTable?.rows?.find((r: any) => r.col === "Result")?.val === "Cointegrated";
  const adfVal = cointeqTable?.rows?.find((r: any) => r.col === "ADF Statistic" || r.col === "Statistic")?.val;
  const pVal = cointeqTable?.rows?.find((r: any) => r.col === "p-value")?.val;
  
  const ectRow = shortRunTable?.rows?.find((r: any) => r.var === "ECT(-1)");
  const ectCoef = ectRow ? parseFloat(ectRow.coef) : null;
  const ectProb = ectRow ? parseFloat(ectRow.prob) : null;

  const normality = assumptionsTable?.rows?.find((r: any) => r.test?.includes("Normality"))?.conc || assumptionsTable?.rows?.find((r: any) => r.test?.includes("Normality"))?.interp;
  const autocorrelation = assumptionsTable?.rows?.find((r: any) => r.test?.includes("Autocorrelation"))?.conc || assumptionsTable?.rows?.find((r: any) => r.test?.includes("Autocorrelation"))?.interp;
  const heteroskedasticity = assumptionsTable?.rows?.find((r: any) => r.test?.includes("Heteroskedasticity"))?.conc || assumptionsTable?.rows?.find((r: any) => r.test?.includes("Heteroskedasticity"))?.interp;

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

      {/* Model Interpretation Summary */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800/80 border border-slate-200 dark:border-slate-850 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
          <span className="p-1.5 bg-indigo-500 text-white rounded-lg">📊</span>
          Model Interpretation Summary (ECM)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cointegration & Long Run */}
          <div className="space-y-3 p-4 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-850">
            <h4 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
              <span>🔗 Long-Run Relationship (Cointegration)</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isCoint ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' : 'bg-amber-50 text-amber-700 border border-amber-250'}`}>
                {isCoint ? 'Cointegrated' : 'No Cointegration'}
              </span>
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed">
              {isCoint 
                ? `A stable long-run relationship (cointegration) exists between the dependent and independent variables (ADF = ${adfVal}, p-value = ${pVal}). The long-run equation is valid for structural interpretation.`
                : `No sufficient evidence of cointegration was found (ADF = ${adfVal}, p-value = ${pVal}). The long-run relationship among the variables is not statistically stable.`
              }
            </p>
          </div>
 
          {/* Short Run Adjustment */}
          <div className="space-y-3 p-4 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-850">
            <h4 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
              <span>⚡ Short-Run Correction (ECT)</span>
              {ectCoef !== null && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${ectCoef < 0 && (ectProb !== null && ectProb < 0.05) ? 'bg-indigo-50 text-indigo-700 border border-indigo-250' : 'bg-rose-50 text-rose-700 border border-rose-250'}`}>
                  ECT = {ectCoef.toFixed(4)}
                </span>
              )}
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed">
              {ectCoef !== null 
                ? (ectCoef < 0 && (ectProb !== null && ectProb < 0.05)
                    ? `The Error Correction Term (ECT) is negative (${ectCoef.toFixed(4)}) and statistically significant (p = ${ectProb?.toFixed(4)}). This confirms a valid adjustment mechanism from short-run deviations back to long-run equilibrium, with an adjustment speed of ${Math.abs(ectCoef * 100).toFixed(2)}% per period.`
                    : `The ECT coefficient is ${ectCoef.toFixed(4)} (p = ${ectProb?.toFixed(4)}). The short-run error correction mechanism is not operating ideally because the ECT coefficient does not satisfy the necessary conditions (must be negative and statistically significant).`
                  )
                : 'ECT information is not available for this estimation.'
              }
            </p>
          </div>
 
          {/* Classical OLS Assumptions */}
          <div className="md:col-span-2 space-y-3 p-4 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-850">
            <h4 className="font-semibold text-slate-700 dark:text-slate-200">
              🛠️ Model Assumptions Validation (Diagnostic Check)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-850">
                <span className="font-semibold block text-slate-500 dark:text-slate-400 mb-1">Normality (Jarque-Bera)</span>
                <span className={`font-bold ${normality?.toLowerCase().includes('normal') && !normality?.toLowerCase().includes('not') ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {normality || 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-850">
                <span className="font-semibold block text-slate-500 dark:text-slate-400 mb-1">Autocorrelation (Breusch-Godfrey)</span>
                <span className={`font-bold ${autocorrelation?.toLowerCase().includes('no') ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {autocorrelation || 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-850">
                <span className="font-semibold block text-slate-500 dark:text-slate-400 mb-1">Heteroskedasticity (Breusch-Pagan)</span>
                <span className={`font-bold ${heteroskedasticity?.toLowerCase().includes('homo') ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {heteroskedasticity || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EcmAnalysis;
