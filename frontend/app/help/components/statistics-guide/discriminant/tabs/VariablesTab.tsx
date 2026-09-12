import React from 'react';
import { Layers, Table } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const VariablesTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Choosing the Analysis Method" : "Memilih Metode Analisis"} icon={Layers} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Enter Independents Together (Default)"
            description={isEn ? "All predictors are entered into the model at once. Choose this when you're already confident which variables are theoretically relevant." : "Seluruh variabel bebas dimasukkan sekaligus ke dalam model. Pilih ini jika Anda sudah yakin variabel mana saja yang relevan secara teori."}
          />
          <HelpStep
            number={2}
            title="Use Stepwise Method"
            description={isEn ? "Variables are entered or removed one at a time based on a statistical criterion. Choose this to let the system filter out the most contributing variables itself." : "Variabel dimasukkan atau dikeluarkan satu per satu berdasarkan kriteria statistik. Pilih ini jika ingin sistem menyaring sendiri variabel yang paling berkontribusi."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="warning" title={isEn ? "Method Choice Changes Which Tabs Are Available" : "Pilihan Metode Mengubah Tab yang Tersedia"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              The <strong>Method</strong> tab only appears when Use stepwise method is selected, while the{' '}
              <strong>Bootstrap</strong> tab only appears when Enter independents together is selected. If you
              switch to stepwise after enabling bootstrap, the bootstrap option is automatically turned off so it
              never runs silently.
            </>
          ) : (
            <>
              Tab <strong>Method</strong> hanya muncul saat memilih Use stepwise method, sedangkan tab{' '}
              <strong>Bootstrap</strong> hanya muncul saat memilih Enter independents together. Jika Anda beralih ke
              stepwise setelah mengaktifkan bootstrap, opsi bootstrap otomatis dimatikan agar tidak berjalan diam-diam.
            </>
          )}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Filling the Variable Boxes" : "Mengisi Kotak Variabel"} icon={Table} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Grouping Variable"
            description={isEn ? "Drag a single categorical variable into this box. This is the variable whose groups will be distinguished, e.g. graduation status or customer category." : "Seret satu variabel kategorikal ke kotak ini. Variabel inilah yang kelompoknya akan dibedakan, misalnya status kelulusan atau kategori nasabah."}
          />
          <HelpStep
            number={2}
            title="Define Range..."
            description={isEn ? "Click this button, then fill in Minimum and Maximum to set the range of group codes included in the analysis. Example: Minimum 1 and Maximum 3 means only cases coded 1 to 3 are processed. Click Continue to save." : "Klik tombol ini lalu isi Minimum dan Maximum untuk menentukan rentang kode kelompok yang ikut dianalisis. Contoh: Minimum 1 dan Maximum 3 berarti hanya kasus dengan kode 1 sampai 3 yang diproses. Klik Continue untuk menyimpan."}
          />
          <HelpStep
            number={3}
            title="Independents"
            description={isEn ? "Move numeric variables to use as predictors into this box. Several can be moved at once with Ctrl+click or Shift+click, and their order doesn't affect the result under the Together method." : "Masukkan variabel numerik yang akan menjadi prediktor ke kotak ini. Bisa dipindahkan beberapa sekaligus dengan Ctrl+klik atau Shift+klik, dan urutannya tidak memengaruhi hasil pada metode Together."}
          />
          <HelpStep
            number={4}
            title={isEn ? "Selection Variable (Optional)" : "Selection Variable (Opsional)"}
            description={isEn ? "Drag a single selector variable, then click Value... and enter its value. Only cases matching that value are used to estimate the discriminant function, while other cases are still classified." : "Seret satu variabel penyeleksi, lalu klik tombol Value... dan isi nilainya. Hanya kasus yang nilainya sama dengan nilai tersebut yang dipakai untuk mengestimasi fungsi diskriminan, sedangkan kasus lain tetap ikut diklasifikasikan."}
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Selecting Multiple Variables at Once" : "Memilih Banyak Variabel Sekaligus"} icon={Table} variant="default">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Simple Click" : "Klik Biasa"}
            description={isEn ? "Click one variable in the Available Variables list to select it. Click the same variable again to deselect it." : "Klik satu variabel di daftar Available Variables untuk memilihnya. Klik lagi pada variabel yang sama untuk membatalkan pilihan."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Ctrl+Click to Select Several" : "Ctrl+Klik untuk Memilih Beberapa"}
            description={isEn ? "Hold Ctrl (or Command on Mac) and click several non-adjacent variables. Each click adds or removes one variable from the selection." : "Tahan Ctrl (atau Command di Mac) lalu klik beberapa variabel yang letaknya berjauhan. Setiap klik menambah atau mengurangi satu variabel dari pilihan."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Shift+Click to Select a Range" : "Shift+Klik untuk Memilih Rentang"}
            description={isEn ? "Click the first variable, then hold Shift and click the last one. Every variable in between is selected at once." : "Klik variabel pertama, lalu tahan Shift dan klik variabel terakhir. Seluruh variabel di antaranya ikut terpilih sekaligus."}
          />
          <HelpStep
            number={4}
            title={isEn ? "Move with the Arrow Button or Drag" : "Pindahkan dengan Tombol Panah atau Drag"}
            description={isEn ? "Once several variables are selected, click the arrow button next to the target box to move them all at once, or drag one of the selected variables so the whole selection moves together." : "Setelah beberapa variabel terpilih, klik tombol panah di sebelah kiri kotak tujuan untuk memindahkan semuanya sekaligus, atau seret salah satu variabel yang terpilih sehingga seluruh pilihan ikut terbawa."}
          />
          <HelpStep
            number={5}
            title={isEn ? "Remove All to Clear Independents" : "Remove All untuk Mengosongkan Independents"}
            description={isEn ? "A Remove All button appears next to the Independents label once the box has content, along with a count of variables inside it. One click empties the box and returns every variable to Available Variables." : "Tombol Remove All muncul di sebelah kanan label Independents begitu kotaknya terisi, lengkap dengan jumlah variabel di dalamnya. Sekali klik, seluruh isi kotak dikosongkan dan semua variabel kembali ke daftar Available Variables."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Removing a Variable and Single-Value Target Boxes" : "Menghapus Variabel dan Kotak Tujuan Bernilai Tunggal"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              To remove a variable from a box, simply <strong>click its badge</strong>, and it returns to the
              Available Variables list. The <strong>Grouping Variable</strong> and <strong>Selection Variable</strong>{' '}
              boxes only hold a single variable, so if your selection contains several, only the first is moved.
              A variable already used in one box automatically disappears from Available Variables so it can't be
              selected twice.
            </>
          ) : (
            <>
              Untuk mengeluarkan variabel dari sebuah kotak, cukup <strong>klik badge variabel</strong> tersebut, dan
              variabel itu akan kembali muncul di daftar Available Variables. Kotak <strong>Grouping Variable</strong> dan{' '}
              <strong>Selection Variable</strong> hanya menampung satu variabel, sehingga bila pilihan Anda berisi beberapa
              variabel, hanya variabel pertama yang dipindahkan. Variabel yang sudah dipakai di salah satu kotak otomatis
              hilang dari daftar Available Variables agar tidak terpilih dua kali.
            </>
          )}
        </p>
      </HelpAlert>

      <HelpAlert variant="info" title={isEn ? "Reset and Cancel Buttons" : "Tombol Reset dan Cancel"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              Dialog settings are saved automatically, so your latest entries are still there next time you open it.
              Press <strong>Reset</strong> to restore every tab to its default values, or <strong>Cancel</strong> to
              close the dialog without running the analysis.
            </>
          ) : (
            <>
              Pengaturan modal tersimpan otomatis, sehingga saat dibuka kembali isian terakhir Anda masih ada. Tekan{' '}
              <strong>Reset</strong> untuk mengembalikan seluruh tab ke nilai bawaan, atau <strong>Cancel</strong> untuk
              menutup modal tanpa menjalankan analisis.
            </>
          )}
        </p>
      </HelpAlert>
    </div>
  );
};
