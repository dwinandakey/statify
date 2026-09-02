import React from 'react';
import { Calculator, BookOpen } from 'lucide-react';
import { HelpCard, HelpAlert } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const AlgorithmTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "Box-Jenkins Algorithm in Statify" : "Algoritma Box-Jenkins di Statify"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Statify uses the Box-Jenkins framework with Durbin-Levinson & Innovation parameter initialization, CSS estimation, and L-BFGS optimization."
            : "Statify menggunakan pendekatan Box-Jenkins dengan inisialisasi parameter (Durbin-Levinson & Innovation), estimasi CSS, dan optimasi L-BFGS."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "1. AR Parameter Initialization — Durbin-Levinson" : "1. Inisialisasi Parameter AR — Durbin-Levinson"} icon={Calculator} variant="feature">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border mt-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border font-mono text-sm whitespace-pre-line">
{`φ₁₁ = γ(1) / γ(0)
For k=2..p:
  φₖₖ = [γ(k) − Σ φₖ₋₁,ⱼ × γ(k−j)] / vₖ₋₁
  vₖ = vₖ₋₁ × (1 − φₖₖ²)`}
          </div>
        </div>
      </HelpCard>
    </div>
  );
};
