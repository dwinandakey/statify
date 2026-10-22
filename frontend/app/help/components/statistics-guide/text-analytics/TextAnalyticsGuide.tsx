import React from "react";
import { Workflow, GraduationCap, Lightbulb, Wrench } from "lucide-react";
import StandardizedGuideLayout from "../shared/StandardizedGuideLayout";
import { HelpAlert, HelpCard, HelpStep } from "@/app/help/ui/HelpLayout";
import { useHelpLanguageStore } from "@/stores/useHelpLanguageStore";
import { TutorialTab } from "./tabs/TutorialTab";
import { SettingsTipsTab } from "./tabs/SettingsTipsTab";
import { TroubleshootingTab } from "./tabs/TroubleshootingTab";

/** Ringkasan alur kerja modul Text Analytics (halaman awal seksi). */
const WorkflowTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === "en";

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Text Analytics Workflow" : "Alur Kerja Text Analytics"} icon={Workflow} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="String to Word Vector"
            description={
              isEn
                ? "Transform > String to Word Vector converts a text variable into numeric word-vector columns that are added to the dataset."
                : "Transform > String to Word Vector mengubah variabel teks menjadi kolom vektor kata numerik yang ditambahkan ke dataset."
            }
          />
          <HelpStep
            number={2}
            title="Naive Bayes"
            description={
              isEn
                ? "Analyze > Classify > Naive Bayes trains and evaluates a classifier from categorical, numeric, and text features (a raw text variable or word-vector columns), then lets you export the model."
                : "Analyze > Classify > Naive Bayes melatih dan mengevaluasi model klasifikasi dari fitur kategorik, numerik, dan teks (variabel teks mentah atau kolom vektor kata), lalu modelnya dapat diekspor."
            }
          />
          <HelpStep
            number={3}
            title="Apply Model"
            description={
              isEn
                ? "Analyze > Classify > Apply Model applies a trained model to the active dataset and writes the predictions as new variables."
                : "Analyze > Classify > Apply Model menerapkan model yang sudah dilatih ke dataset aktif dan menulis hasil prediksi sebagai variabel baru."
            }
          />
        </div>
      </HelpCard>
      <HelpAlert variant="tip" title={isEn ? "Tip" : "Tips"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Each dialog also has a help button (?) at the bottom left that walks you through every tab and field."
            : "Setiap dialog juga memiliki tombol bantuan (?) di kiri bawah yang menjelaskan setiap tab dan kolom secara bertahap."}
        </p>
      </HelpAlert>
    </div>
  );
};

/** Ringkasan modul Text Analytics di Panduan Statistik; panduan tiap menu terdaftar terpisah. */
export const TextAnalyticsGuide: React.FC = () => {
  return (
    <StandardizedGuideLayout
      title="Text Analytics"
      titleEn="Text Analytics"
      description="Mengolah data teks menjadi fitur numerik, melatih model Naive Bayes, dan menerapkan model ke data baru di Statify."
      descriptionEn="Turn text data into numeric features, train a Naive Bayes model, and apply the model to new data in Statify."
      tabs={[
        { id: "workflow", label: "Alur Kerja", labelEn: "Workflow", icon: Workflow, component: WorkflowTab },
        { id: "tutorial", label: "Tutorial Klasifikasi Teks", labelEn: "Tutorial", icon: GraduationCap, component: TutorialTab },
        { id: "tips", label: "Tips Pengaturan", labelEn: "Settings Tips", icon: Lightbulb, component: SettingsTipsTab },
        { id: "troubleshooting", label: "Pemecahan Masalah", labelEn: "Troubleshooting", icon: Wrench, component: TroubleshootingTab },
      ]}
      defaultTab="workflow"
    />
  );
};
