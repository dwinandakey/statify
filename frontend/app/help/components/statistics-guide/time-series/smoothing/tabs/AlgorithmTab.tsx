import React from 'react';
import { Calculator, BookOpen } from 'lucide-react';
import { HelpCard, HelpAlert } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const AlgorithmTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "Smoothing Algorithm in Statify" : "Algoritma Smoothing di Statify"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Statify implements four smoothing algorithms: Simple Moving Average, Simple Exponential Smoothing, Holt's Linear Exponential, and Holt-Winters Triple Exponential."
            : "Statify mengimplementasikan empat metode pemulusan: Simple Moving Average, Simple Exponential Smoothing, Holt's Double Exponential, dan Holt-Winters Triple Exponential."}
        </p>
      </HelpAlert>

      <HelpCard title="1. Simple Moving Average (SMA)" icon={Calculator} variant="feature">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border mt-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border font-mono text-sm">
            SMAₜ = (1/k) × Σ Yₜ₋ᵢ,  i = 0..k−1
          </div>
        </div>
      </HelpCard>
    </div>
  );
};
