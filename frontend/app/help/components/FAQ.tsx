import React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpGuideTemplate } from "../ui/HelpGuideTemplate";
import { HelpCard, HelpStep } from "../ui/HelpLayout";
import { FileCode, BarChart4, Clock, Save, BookOpen, ListOrdered } from "lucide-react";
import { useHelpLanguageStore } from "@/stores/useHelpLanguageStore";

export const FAQ = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  // Data FAQ khusus Statify
  const faqs = [
    {
      question: isEn ? "What is a .sav file?" : "Apa itu file .sav?",
      answer: isEn
        ? "A .sav file is the data format used by SPSS (Statistical Package for the Social Sciences). Statify can read and write this format, allowing seamless interoperability with SPSS."
        : "File .sav adalah format data yang digunakan oleh SPSS (Statistical Package for the Social Sciences). Statify dapat membaca dan menulis format ini, memungkinkan interoperabilitas yang mulus dengan SPSS."
    },
    {
      question: isEn ? "How do I import data from Excel?" : "Bagaimana cara mengimpor data dari Excel?",
      answer: isEn
        ? "To import data from Excel, click 'File' > 'Import Data' > 'Excel', then choose your file. You can adjust import settings such as the worksheet to read, the cell range, using the first row as variable names, and how empty cells are read."
        : "Untuk mengimpor data dari Excel, klik menu 'File' > 'Import Data' > 'Excel', lalu pilih file Anda. Anda dapat menyesuaikan pengaturan impor seperti worksheet yang akan dibaca, rentang sel, baris pertama sebagai nama variabel, dan cara membaca sel kosong."
    },
    {
      question: isEn ? "How do I run a descriptive analysis?" : "Bagaimana cara melakukan analisis deskriptif?",
      answer: isEn
        ? "To run a descriptive analysis, click 'Analyze' > 'Descriptive Statistics', then choose 'Descriptives' or 'Frequencies'. Select the variables you want to analyze in the dialog, then pick the statistics to display such as the mean, median, and standard deviation. The mode is available in 'Frequencies'."
        : "Untuk melakukan analisis deskriptif, klik menu 'Analyze' > 'Descriptive Statistics', lalu pilih 'Descriptives' atau 'Frequencies'. Pilih variabel yang ingin Anda analisis pada kotak dialog, kemudian tentukan statistik yang akan ditampilkan seperti mean, median, dan standar deviasi. Modus tersedia di 'Frequencies'."
    },
    {
      question: isEn ? "Can Statify create charts?" : "Bisakah Statify membuat grafik?",
      answer: isEn
        ? "Yes, Statify includes many chart types such as bar charts, histograms, scatter plots, and box plots. You can create a chart from 'Graphs' > 'Chart Builder', then choose the chart type you want."
        : "Ya, Statify menyertakan berbagai jenis grafik seperti bar chart, histogram, scatter plot, dan box plot. Anda dapat membuat grafik dengan memilih menu 'Graphs' > 'Chart Builder', kemudian memilih jenis grafik yang diinginkan."
    },
    {
      question: isEn ? "How do I run a hypothesis test?" : "Bagaimana cara melakukan uji hipotesis?",
      answer: isEn
        ? "To run a hypothesis test, open the 'Analyze' menu, then choose the appropriate test, for example T-Test and One-Way ANOVA under 'Compare Means', or Chi-square under 'Nonparametric Tests' > 'Legacy Dialogs'. Select the relevant variables and adjust the test parameters as needed."
        : "Untuk melakukan uji hipotesis, pilih menu 'Analyze', kemudian pilih jenis uji yang sesuai, misalnya T-Test dan One-Way ANOVA di 'Compare Means', atau Chi-square di 'Nonparametric Tests' > 'Legacy Dialogs'. Pilih variabel yang relevan dan sesuaikan parameter uji sesuai kebutuhan."
    },
    {
      question: isEn ? "Does Statify save data automatically?" : "Apakah Statify menyimpan data secara otomatis?",
      answer: isEn
        ? "Yes, Statify has an autosave feature that saves your work automatically when the app detects you have been inactive for a while. Even so, we still recommend saving your work regularly with 'File' > 'Save'."
        : "Ya, Statify memiliki fitur autosave yang akan menyimpan pekerjaan Anda secara otomatis jika aplikasi mendeteksi Anda tidak aktif untuk beberapa waktu. Namun, kami tetap merekomendasikan untuk menyimpan pekerjaan Anda secara rutin dengan mengklik 'File' > 'Save'."
    },
    {
      question: isEn ? "How do I export analysis results?" : "Bagaimana cara mengekspor hasil analisis?",
      answer: isEn
        ? "Analysis results can be exported to PDF from 'File' > 'Print...' by checking the 'Output Viewer (Results)' option. Charts can also be downloaded or copied as PNG or SVG images using the buttons on each chart."
        : "Hasil analisis dapat diekspor ke PDF melalui menu 'File' > 'Print...' dengan mencentang opsi 'Output Viewer (Results)'. Grafik juga dapat diunduh atau disalin sebagai gambar PNG maupun SVG melalui tombol yang tersedia pada grafik."
    },
    {
      question: isEn ? "How do I handle missing data in an analysis?" : "Bagaimana cara menangani data yang hilang dalam analisis?",
      answer: isEn
        ? "In Statify's statistical analyses you can choose how missing values are handled. In the analysis dialog, you can pick options such as 'Exclude cases listwise', 'Exclude cases pairwise', or 'Replace with mean', depending on the type of analysis."
        : "Dalam analisis statistik Statify, Anda dapat memilih cara menangani nilai yang hilang. Di kotak dialog analisis, Anda dapat memilih opsi seperti 'Exclude cases listwise', 'Exclude cases pairwise', atau 'Replace with mean', tergantung pada jenis analisisnya."
    }
  ];

  // Kategori FAQ
  const faqCategories = [
    {
      name: "Data & File",
      icon: <FileCode className="h-5 w-5 mr-2 text-primary/70" />,
      faqs: [faqs[0], faqs[1], faqs[5], faqs[6]]
    },
    {
      name: isEn ? "Statistical Analysis" : "Analisis Statistik",
      icon: <BarChart4 className="h-5 w-5 mr-2 text-primary/70" />,
      faqs: [faqs[2], faqs[3], faqs[4], faqs[7]]
    }
  ];

  const sections = [
    {
      id: 'how-to-search',
      title: isEn ? 'How to Find Answers' : 'Cara Mencari Jawaban',
      description: isEn ? 'A guide to quickly finding the information you need' : 'Panduan untuk menemukan informasi yang Anda butuhkan dengan cepat',
      icon: ListOrdered,
      content: (
        <div className="space-y-4">
          <HelpStep number={1} title={isEn ? "Browse the FAQ Categories" : "Jelajahi Kategori FAQ"}>
            <p className="text-sm">
              {isEn
                ? "Browse the FAQ categories below to find answers by topic:"
                : "Telusuri kategori FAQ di bawah ini untuk menemukan jawaban berdasarkan topik:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li><strong>Data & File</strong>: Import, export, and file management</li>
                  <li><strong>Statistical Analysis</strong>: Analysis procedures and interpreting results</li>
                </>
              ) : (
                <>
                  <li><strong>Data & File</strong>: Import, export, dan manajemen file</li>
                  <li><strong>Analisis Statistik</strong>: Prosedur analisis dan interpretasi hasil</li>
                </>
              )}
            </ul>
          </HelpStep>

          <HelpStep number={2} title={isEn ? "Check the Related Guides" : "Periksa Panduan Terkait"}>
            <p className="text-sm">
              {isEn
                ? "If you can't find the answer in the FAQ, open the complete guides from the sidebar, such as File Management, Data Management, or Statistics Guide."
                : "Jika tidak menemukan jawaban di FAQ, buka panduan lengkap melalui sidebar, seperti Manajemen File, Manajemen Data, atau Panduan Statistik."}
            </p>
          </HelpStep>
        </div>
      )
    },
    {
      id: 'overview',
      title: isEn ? 'Quick Help' : 'Bantuan Cepat',
      description: isEn ? 'Important information to get started' : 'Informasi penting untuk memulai',
      icon: BookOpen,
      content: (
        <div className="space-y-4">
          <HelpCard title={isEn ? "Autosave Feature" : "Fitur Autosave"} icon={Clock} variant="feature">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {isEn
                  ? "Statify automatically saves your work when the app detects a period of inactivity. This helps prevent data loss if the app is closed by accident."
                  : "Statify secara otomatis menyimpan pekerjaan Anda ketika aplikasi mendeteksi periode tidak aktif. Ini membantu mencegah kehilangan data jika aplikasi secara tidak sengaja ditutup."}
              </p>
              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <Save className="h-3.5 w-3.5" />
                <span>{isEn ? "Work saved automatically" : "Pekerjaan tersimpan otomatis"}</span>
              </div>
            </div>
          </HelpCard>
        </div>
      )
    },
    {
      id: 'data-file',
      title: 'Data & File',
      description: isEn ? 'Frequently asked questions about data and file management' : 'Pertanyaan yang sering diajukan tentang manajemen data dan file',
      icon: FileCode,
      content: (
        <div className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            {faqCategories[0].faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`data-file-${index}`}
                className="border-b border-border/50"
              >
                <AccordionTrigger className="text-left font-medium hover:text-primary py-3 text-foreground">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground py-2 pb-4 text-sm leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )
    },
    {
      id: 'statistics',
      title: isEn ? 'Statistical Analysis' : 'Analisis Statistik',
      description: isEn ? 'Frequently asked questions about statistical analysis' : 'Pertanyaan yang sering diajukan tentang analisis statistik',
      icon: BarChart4,
      content: (
        <div className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            {faqCategories[1].faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`statistics-${index}`}
                className="border-b border-border/50"
              >
                <AccordionTrigger className="text-left font-medium hover:text-primary py-3 text-foreground">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground py-2 pb-4 text-sm leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )
    }
  ];

  const tips = [
    {
      type: 'info' as const,
      title: isEn ? 'Bookmark Important Pages' : 'Bookmark Halaman Penting',
      content: isEn
        ? 'Bookmark the help pages you use most often for quick access in the future.'
        : 'Simpan halaman bantuan yang sering Anda gunakan sebagai bookmark untuk akses cepat di masa mendatang.'
    },
    {
      type: 'warning' as const,
      title: isEn ? 'Menus Not Yet Available' : 'Menu yang Belum Tersedia',
      content: isEn
        ? 'A menu that appears disabled (cannot be clicked) means the feature is not yet available in Statify.'
        : 'Menu yang tampil nonaktif (tidak bisa diklik) menandakan fiturnya belum tersedia di Statify.'
    }
  ];

  const relatedTopics = [
    { title: isEn ? 'Getting Started' : 'Memulai', href: '/help/getting-started' },
    { title: isEn ? 'File Guide' : 'Panduan File', href: '/help/file-guide' },
    { title: isEn ? 'Data Guide' : 'Panduan Data', href: '/help/data-guide' },
    { title: isEn ? 'Statistics Guide' : 'Panduan Statistik', href: '/help/statistics-guide' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "FAQ - Frequently Asked Questions" : "FAQ - Pertanyaan Umum"}
      description={isEn
        ? "Find quick answers to frequently asked questions about using Statify"
        : "Temukan jawaban cepat untuk pertanyaan yang sering diajukan tentang penggunaan Statify"}
      lastUpdated="2026-10-14"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};
