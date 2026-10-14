/* eslint-disable react/no-unescaped-entities */
import { HelpGuideTemplate } from '../../ui/HelpGuideTemplate';
import { HelpCard, HelpAlert, HelpSection } from '../../ui/HelpLayout';
import { SearchCheck, Settings, SlidersHorizontal } from 'lucide-react';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

const UnusualCasesGuide = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'overview',
      title: isEn ? 'Overview' : 'Ringkasan',
      description: isEn ? 'Identifying unusual cases based on an anomaly index' : 'Mengidentifikasi kasus yang tidak biasa berdasarkan indeks anomali',
      icon: SearchCheck,
      content: (
        <div className="space-y-4">
          <p>
            {isEn
              ? "The Identify Unusual Cases feature helps you find cases that differ significantly from their peers. You choose the analysis variables and (optionally) a case identifier variable, then set the identification criteria in the Options tab."
              : "Fitur Identify Unusual Cases membantu menemukan kasus yang berbeda secara signifikan dari rekan-rekannya. Anda memilih variabel analisis dan (opsional) variabel pengenal kasus, lalu menetapkan kriteria identifikasi di tab Options."}
          </p>
          <HelpAlert variant="info" title={isEn ? "Note" : "Catatan"}>
            {isEn
              ? "This guide currently covers the variable configuration and the criteria in the Options tab."
              : "Saat ini panduan ini mencakup konfigurasi variabel dan kriteria di tab Options."}
          </HelpAlert>
        </div>
      )
    },
    {
      id: 'variables',
      title: isEn ? 'Variable Configuration' : 'Konfigurasi Variabel',
      description: isEn ? 'Setting the analysis variables and case identifier' : 'Mengatur variabel analisis dan pengenal kasus',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <HelpSection title="Analysis Variables">
            <ul className="list-disc list-inside text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Drag variables from the Available list to Analysis Variables.</li>
                  <li>You can reorder them with drag-and-drop.</li>
                  <li>Select at least one analysis variable. Otherwise this message appears: "Please select at least one analysis variable."</li>
                </>
              ) : (
                <>
                  <li>Seret variabel dari daftar Available ke Analysis Variables.</li>
                  <li>Anda dapat menyusun ulang urutan dengan drag-and-drop.</li>
                  <li>Minimal pilih satu variabel analisis. Jika tidak, akan muncul pesan: "Please select at least one analysis variable."</li>
                </>
              )}
            </ul>
          </HelpSection>
          <HelpSection title={isEn ? "Case Identifier Variable (optional)" : "Case Identifier Variable (opsional)"}>
            <ul className="list-disc list-inside text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Place one variable in the Case Identifier Variable box to group cases (e.g. Subject ID).</li>
                  <li>This box accepts only one variable.</li>
                </>
              ) : (
                <>
                  <li>Letakkan satu variabel di kotak Case Identifier Variable untuk mengelompokkan kasus (misal: Subject ID).</li>
                  <li>Kotak ini hanya menerima satu variabel.</li>
                </>
              )}
            </ul>
          </HelpSection>
          <HelpCard title={isEn ? "Variable Selection Tips" : "Tips Pemilihan Variabel"} variant="step">
            <ul className="text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Use numeric scale variables for a stable anomaly index calculation.</li>
                  <li>Avoid adding too many variables at once so the results stay focused.</li>
                </>
              ) : (
                <>
                  <li>Gunakan variabel numerik bertipe scale untuk perhitungan indeks anomali yang stabil.</li>
                  <li>Hindari memasukkan terlalu banyak variabel sekaligus agar hasil lebih fokus.</li>
                </>
              )}
            </ul>
          </HelpCard>
        </div>
      )
    },
    {
      id: 'options',
      title: isEn ? 'Identification Criteria' : 'Kriteria Identifikasi',
      description: isEn ? 'Setting the thresholds and limits for unusual cases' : 'Menentukan ambang dan batasan untuk kasusu tidak biasa',
      icon: SlidersHorizontal,
      content: (
        <div className="space-y-6">
          <HelpCard title="Criteria for Identifying Unusual Cases" variant="feature">
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-medium">{isEn ? "Selection method" : "Metode pemilihan"}</div>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {isEn ? (
                    <>
                      <li><strong>Percentage</strong>: Select the top percentage by anomaly index value (the "Percentage" input).</li>
                      <li><strong>Fixed number</strong>: Select a set number of top cases (the "Number" input).</li>
                    </>
                  ) : (
                    <>
                      <li><strong>Percentage</strong>: Pilih persentase teratas berdasarkan nilai indeks anomali (input "Percentage").</li>
                      <li><strong>Fixed number</strong>: Pilih sejumlah kasus teratas (input "Number").</li>
                    </>
                  )}
                </ul>
              </div>
              <div>
                <div className="font-medium">{isEn ? "Minimum threshold (optional)" : "Ambang minimum (opsional)"}</div>
                <p>
                  {isEn
                    ? "Check \"Identify only cases whose anomaly index value meets or exceeds a minimum value\" and then fill in \"Cutoff\"."
                    : "Centang \"Identify only cases whose anomaly index value meets or exceeds a minimum value\" lalu isi \"Cutoff\"."}
                </p>
              </div>
            </div>
          </HelpCard>
          <HelpCard title="Peer Groups" variant="feature">
            <p className="text-sm">
              {isEn
                ? "Set the minimum and maximum number of peer groups used for comparison."
                : "Atur batas minimum dan maksimum jumlah peer group yang digunakan saat pembandingan."}
            </p>
          </HelpCard>
          <HelpCard title="Reasons" variant="feature">
            <p className="text-sm">
              {isEn
                ? "Limit the maximum number of reasons per case for reporting anomaly causes."
                : "Batasi maksimum jumlah alasan per kasus untuk pelaporan penyebab anomali."}
            </p>
          </HelpCard>
        </div>
      )
    }
  ];

  const prerequisites = isEn
    ? [
        'The data is loaded and the variables have appropriate measurement levels (scale/nominal/ordinal).',
        'You know which numeric variables are relevant for the anomaly assessment.'
      ]
    : [
        'Data telah dimuat dan variabel memiliki pengukuran yang sesuai (scale/nominal/ordinal).',
        'Anda mengetahui variabel numerik mana yang relevan untuk penilaian anomali.'
      ];

  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'Start small' : 'Mulai dari kecil',
      content: isEn
        ? 'Test with 2-3 analysis variables first to understand how the anomaly index behaves in your dataset.'
        : 'Uji dengan 2-3 variabel analisis terlebih dahulu untuk memahami karakter indeks anomali di dataset Anda.'
    },
    {
      type: 'warning' as const,
      title: isEn ? 'Interpreting the results' : 'Interpretasi hasil',
      content: isEn
        ? 'An "unusual" case is not necessarily wrong; use domain context to judge it.'
        : 'Kasus “tidak biasa” tidak selalu berarti salah; gunakan konteks domain untuk menilai.'
    }
  ];

  return (
    <HelpGuideTemplate
      title="Identify Unusual Cases"
      description={isEn
        ? "Find cases that differ significantly from their peers by setting the right variables and criteria."
        : "Temukan kasus-kasus yang berbeda secara signifikan dari peer-nya dengan mengatur variabel dan kriteria yang tepat."}
      lastUpdated="2025-08-10"
      sections={sections}
      prerequisites={prerequisites}
      tips={tips}
    />
  );
};

export default UnusualCasesGuide;
