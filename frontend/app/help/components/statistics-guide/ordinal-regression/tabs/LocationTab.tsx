import React from 'react';
import { Layers } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const LocationTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Configuring the Location Model & Interactions" : "Mengatur Model Lokasi & Interaksi"} icon={Layers} variant="feature">
        <p className="text-sm text-muted-foreground mb-4">
          {isEn
            ? "This menu is used to decide whether you only want each variable's main effect included, or whether you also want to add interaction effects between variables."
            : "Menu ini digunakan untuk menentukan apakah Anda hanya ingin memasukkan pengaruh utama dari masing-masing variabel atau ingin menambah efek interaksi antar variabel."}
        </p>
        <div className="space-y-4">
          <HelpStep
            number={1}
            title="Main Effects"
            description={
              isEn
                ? "Creates a single-effect term for every selected predictor variable without accounting for interactions."
                : "Membuat istilah efek tunggal untuk setiap variabel prediktor yang dipilih tanpa memperhitungkan interaksi."
            }
          />
          <HelpStep
            number={2}
            title="Interaction"
            description={
              isEn
                ? "Creates the highest-order interaction term across every selected variable (the default option)."
                : "Membuat istilah interaksi tingkat tertinggi dari seluruh variabel terpilih (Opsi Bawaan/Default)."
            }
          />
          <HelpStep
            number={3}
            title={isEn ? "Custom Interaction Combinations" : "Kombinasi Interaksi Khusus"}
            description={
              isEn
                ? "You can choose 'All 2-way', 'All 3-way', up to 'All 5-way' to automatically create every 2-way, 3-way, and so on interaction combination from the variables you block-select."
                : "Anda dapat memilih opsi 'All 2-way', 'All 3-way', hingga 'All 5-way' untuk otomatis membuat seluruh kombinasi interaksi 2 arah, 3 arah, dan seterusnya dari variabel yang Anda blok."
            }
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Usage Tips" : "Tips Penggunaan"}>
        <p className="text-sm mt-2">
          {isEn
            ? "For beginners, it's recommended to choose Main Effects first so model interpretation stays simple before attempting to add complex interaction effects."
            : "Bagi pengguna awam, disarankan untuk memilih Main Effects terlebih dahulu agar interpretasi model tetap sederhana sebelum mencoba menambahkan efek interaksi kompleks."}
        </p>
      </HelpAlert>
    </div>
  );
};
