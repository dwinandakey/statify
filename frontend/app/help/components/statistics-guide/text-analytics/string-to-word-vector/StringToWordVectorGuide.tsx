import React from 'react';
import { HelpCircle, ArrowRightLeft, SlidersHorizontal, FileText } from 'lucide-react';
import StandardizedGuideLayout from '../../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { VariablesTab } from './tabs/VariablesTab';
import { OptionsTab } from './tabs/OptionsTab';
import { OutputTab } from './tabs/OutputTab';

export const StringToWordVectorGuide: React.FC = () => {
  const tabs = [
    { id: 'overview', label: 'Ringkasan', labelEn: 'Overview', icon: HelpCircle, component: OverviewTab },
    { id: 'variables', label: 'Variabel', labelEn: 'Variables', icon: ArrowRightLeft, component: VariablesTab },
    { id: 'options', label: 'Opsi', labelEn: 'Options', icon: SlidersHorizontal, component: OptionsTab },
    { id: 'output', label: 'Output', labelEn: 'Output', icon: FileText, component: OutputTab },
  ];

  return (
    <StandardizedGuideLayout
      title="String to Word Vector"
      titleEn="String to Word Vector"
      description="Mengubah variabel teks menjadi kolom vektor kata numerik, mengatur pra-pemrosesan teks dan rumus pembobotan, serta membaca output proses di Statify."
      descriptionEn="Turn a text variable into numeric word-vector columns, set the text preprocessing and weighting formulas, and read the processing output in Statify."
      tabs={tabs}
      defaultTab="overview"
    />
  );
};
