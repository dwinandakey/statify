import type { TourStep as BaseTourStep } from "@/types/tourTypes";

export const TABS = {
  VARIABLES: "variables" as const,
  LOCATION: "location" as const,
  SCALE: "scale" as const,
  OPTIONS: "options" as const,
  OUTPUT: "output" as const,
};

export type TabType =
  | typeof TABS.VARIABLES
  | typeof TABS.LOCATION
  | typeof TABS.SCALE
  | typeof TABS.OPTIONS
  | typeof TABS.OUTPUT;

export type TourStep = BaseTourStep & {
  requiredTab?: TabType;
  forceChangeTab?: boolean;
};

export const baseTourSteps: TourStep[] = [
  {
    title: "Variables Tab",
    content: "Pilih variabel dependen ordinal, masukkan predictor sebagai factor atau covariate, dan tentukan link function model.",
    targetId: "ordinal-regression-variables-tab-trigger",
    defaultPosition: "bottom",
    defaultHorizontalPosition: null,
    icon: null,
    requiredTab: TABS.VARIABLES,
  },
  {
    title: "Location Tab",
    content: "Susun model lokasi dengan main effect dan interaction antar factor maupun covariate.",
    targetId: "ordinal-regression-location-tab-trigger",
    defaultPosition: "bottom",
    defaultHorizontalPosition: null,
    icon: null,
    requiredTab: TABS.LOCATION,
    forceChangeTab: true,
  },
  {
    title: "Daftar Variabel Independen",
    content: "Ini adalah daftar variabel yang tersedia (factors dan covariates). Masukkan masing-masing variabel untuk membuat model tanpa interaksi (main effect).",
    targetId: "location-x-list",
    defaultPosition: "top",
    defaultHorizontalPosition: null,
    icon: null,
    requiredTab: TABS.LOCATION,
  },
  {
    title: "Membuat Efek Interaksi",
    content: "Untuk membuat interaksi dari beberapa variabel, tahan tombol Shift atau Ctrl lalu klik beberapa variabel di kolom kiri. Setelah itu, tekan tombol panah untuk memasukkannya sebagai satu blok interaksi (misal: VariabelA * VariabelB).",
    targetId: "location-x-list",
    defaultPosition: "top",
    defaultHorizontalPosition: null,
    icon: null,
    requiredTab: TABS.LOCATION,
  },
  {
    title: "Menambahkan Main Effect",
    content: "Setelah memilih variabel, tekan tombol ini untuk memindahkannya ke kolom 'Location model'. Variabel yang dipindahkan akan bertindak sebagai main effect (jika 1 variabel) dan interaksi (jika >=2 variabel).",
    targetId: "location-add-button",
    defaultPosition: "top",
    defaultHorizontalPosition: null,
    icon: null,
    requiredTab: TABS.LOCATION,
  },
  {
    title: "Struktur Model Final",
    content: "Variabel yang berhasil dipindahkan akan tampil di sini. Jika ingin menghapus variabel dari model, cukup klik variabelnya pada kolom ini.",
    targetId: "location-model-list",
    defaultPosition: "bottom",
    defaultHorizontalPosition: null,
    icon: null,
    requiredTab: TABS.LOCATION,
  },
  {
    title: "Scale Tab",
    content: "Tambahkan predictor scale untuk model non-constant scale ketika analisis mendukung struktur skala tambahan. TAPI FITUR INI BELUM DIKEMBANGKAN LEBIH LANJUT",
    targetId: "ordinal-regression-scale-tab-trigger",
    defaultPosition: "bottom",
    defaultHorizontalPosition: null,
    icon: null,
    requiredTab: TABS.SCALE,
    forceChangeTab: true,
  },
  {
    title: "Options Tab",
    content: "Atur batas iterasi, kriteria konvergensi, interval kepercayaan, toleransi singularitas, dan opsi lainnya dalam membangun model.",
    targetId: "ordinal-regression-options-tab-trigger",
    defaultPosition: "bottom",
    defaultHorizontalPosition: null,
    icon: null,
    requiredTab: TABS.OPTIONS,
    forceChangeTab: true,
  },
  {
    title: "Output Tab",
    content: "Pilih tabel output, diagnostic, riwayat iterasi, dan buat variabel hasil estimasi yang ingin ditampilkan atau disimpan.",
    targetId: "ordinal-regression-output-tab-trigger",
    defaultPosition: "bottom",
    defaultHorizontalPosition: null,
    icon: null,
    requiredTab: TABS.OUTPUT,
    forceChangeTab: true,
  },
];
