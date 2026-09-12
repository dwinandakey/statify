import React from 'react';
import { HelpCircle, ClipboardList, CheckCircle } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OverviewTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "What is Discriminant Analysis?" : "Apa itu Analisis Diskriminan?"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              Discriminant Analysis (Linear Discriminant Analysis) forms a linear combination of several numeric
              variables that <strong>best separates the groups</strong> of one categorical variable. This linear
              combination is called a <strong>discriminant function</strong>, and it serves two purposes at once:
              explaining which variables distinguish the groups, and classifying cases into one of the groups.
            </>
          ) : (
            <>
              Analisis Diskriminan (Linear Discriminant Analysis) membentuk kombinasi linear dari beberapa variabel
              numerik yang <strong>paling memisahkan kelompok-kelompok</strong> pada satu variabel kategorikal.
              Kombinasi linear itu disebut <strong>fungsi diskriminan</strong>, dan dipakai untuk dua tujuan sekaligus:
              menjelaskan variabel mana yang membedakan kelompok, serta mengklasifikasikan kasus ke salah satu kelompok.
            </>
          )}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "When to Use Discriminant Analysis?" : "Kapan Menggunakan Analisis Diskriminan?"} icon={HelpCircle} variant="feature">
        <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
          {isEn ? (
            <>
              <li>The dependent variable is <strong>categorical</strong> (2 or more groups) and predictors are numeric</li>
              <li>You want to know which variables best distinguish between groups</li>
              <li>You want to build a classification rule to predict a case's group membership</li>
              <li>You want to measure classification accuracy (hit ratio) and validate it with leave-one-out</li>
              <li>You want to visualize group separation in discriminant space</li>
            </>
          ) : (
            <>
              <li>Variabel terikat bersifat <strong>kategorikal</strong> (2 kelompok atau lebih) dan variabel bebasnya numerik</li>
              <li>Ingin mengetahui variabel mana yang paling kuat membedakan antar kelompok</li>
              <li>Ingin membangun aturan klasifikasi untuk memprediksi keanggotaan kelompok suatu kasus</li>
              <li>Ingin mengukur ketepatan klasifikasi model (hit ratio) dan memvalidasinya dengan leave-one-out</li>
              <li>Ingin memvisualisasikan pemisahan antar kelompok pada ruang diskriminan</li>
            </>
          )}
        </ul>
      </HelpCard>

      <HelpCard title={isEn ? "How to Open the Module" : "Cara Membuka Modul"} icon={ClipboardList} variant="default">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Analyze -> Classify -> Discriminant"
            description={isEn ? "Open the Analyze menu, choose the Classify submenu, then click Discriminant. The dialog opens with the Variables tab active." : "Buka menu Analyze pada menu bar, pilih submenu Classify, lalu klik Discriminant. Modal akan terbuka dengan tab Variables aktif."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Fill in the Variables Tab First" : "Isi Tab Variables Terlebih Dahulu"}
            description={isEn ? "The OK button only activates once the Grouping Variable is set and at least one Independent Variable is chosen. Other tabs are optional and add extra output tables." : "Tombol OK baru aktif setelah Grouping Variable terisi dan minimal ada satu Independent Variable. Tab lain bersifat opsional dan menambah tabel keluaran."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Results Appear in the Output Viewer" : "Hasil Muncul di Output Viewer"}
            description={isEn ? "After clicking OK, computation runs in the background (Rust/WebAssembly inside a Web Worker) and every table and chart is written sequentially to the Output Viewer." : "Setelah menekan OK, perhitungan dijalankan di latar belakang (Rust/WebAssembly di dalam Web Worker) dan seluruh tabel serta grafik ditulis berurutan ke Output Viewer."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "The Question Mark Button Inside the Dialog" : "Tombol Tanda Tanya di Dalam Modal"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              The <strong>?</strong> icon at the bottom-left of the dialog runs a <strong>feature tour</strong>: a
              short walkthrough that highlights each part of the dialog in turn, from the method selection, the
              variable boxes and how to select several variables at once, the Statistics, Classify, Save, and
              Assumptions tabs, all the way to the OK button. Use this tour the first time you open the module, then
              come back to this guide for more detail.
            </>
          ) : (
            <>
              Ikon <strong>?</strong> di pojok kiri bawah modal menjalankan <strong>feature tour</strong>: panduan singkat
              yang menyorot satu per satu bagian modal, mulai dari pemilihan metode, kotak variabel beserta cara memilih
              banyak variabel sekaligus, tab Statistics, Classify, Save, Assumptions, sampai tombol OK. Gunakan tour ini
              ketika baru pertama kali membuka modul, lalu kembali ke halaman panduan ini untuk penjelasan yang lebih rinci.
            </>
          )}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Data Requirements" : "Syarat Data"} icon={CheckCircle} variant="feature">
        <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
          {isEn ? (
            <>
              <li><strong>Grouping Variable</strong>: categorical, coded with integers, e.g. 1, 2, 3</li>
              <li><strong>Independents</strong>: numeric (scale), at least one variable</li>
              <li>The number of cases per group should exceed the number of predictors so the covariance matrix isn't singular</li>
              <li>Ideally the assumptions of multivariate normality and covariance-matrix homogeneity hold — use the Assumptions tab and Box's M to check them</li>
            </>
          ) : (
            <>
              <li><strong>Grouping Variable</strong>: kategorikal dengan kode berupa bilangan bulat, misalnya 1, 2, 3</li>
              <li><strong>Independents</strong>: numerik (scale), minimal satu variabel</li>
              <li>Jumlah kasus per kelompok sebaiknya lebih banyak dari jumlah variabel bebas agar matriks kovarians tidak singular</li>
              <li>Idealnya asumsi normalitas multivariat dan homogenitas matriks kovarians terpenuhi, gunakan tab Assumptions dan Box's M untuk memeriksanya</li>
            </>
          )}
        </ul>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "How Many Discriminant Functions Are Formed?" : "Berapa Banyak Fungsi Diskriminan yang Terbentuk?"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              The number of discriminant functions equals the smaller of <strong>(number of groups − 1)</strong> and
              the <strong>number of predictors</strong>. So 2 groups always yield only 1 function, while 3 groups
              with at least 2 predictors yield 2 functions. The Territorial Map and 2-D plot are only meaningful when
              at least 2 functions are formed.
            </>
          ) : (
            <>
              Jumlah fungsi diskriminan adalah nilai terkecil antara <strong>(jumlah kelompok - 1)</strong> dan{' '}
              <strong>jumlah variabel bebas</strong>. Jadi untuk 2 kelompok hanya terbentuk 1 fungsi, sedangkan 3 kelompok
              dengan minimal 2 variabel bebas menghasilkan 2 fungsi. Territorial Map dan plot dua dimensi hanya bermakna
              jika terbentuk minimal 2 fungsi.
            </>
          )}
        </p>
      </HelpAlert>
    </div>
  );
};
