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
    content: "Susun model location dengan main effect dan interaction antar factor maupun covariate.",
    targetId: "ordinal-regression-location-tab-trigger",
    defaultPosition: "bottom",
    defaultHorizontalPosition: null,
    icon: null,
    requiredTab: TABS.LOCATION,
    forceChangeTab: true,
  },
  {
    title: "Scale Tab",
    content: "Tambahkan predictor scale untuk model non-constant scale ketika analisis mendukung struktur skala tambahan.",
    targetId: "ordinal-regression-scale-tab-trigger",
    defaultPosition: "bottom",
    defaultHorizontalPosition: null,
    icon: null,
    requiredTab: TABS.SCALE,
    forceChangeTab: true,
  },
  {
    title: "Options Tab",
    content: "Atur batas iterasi, kriteria konvergensi, interval kepercayaan, toleransi singularitas, dan zero-cell adjustment.",
    targetId: "ordinal-regression-options-tab-trigger",
    defaultPosition: "bottom",
    defaultHorizontalPosition: null,
    icon: null,
    requiredTab: TABS.OPTIONS,
    forceChangeTab: true,
  },
  {
    title: "Output Tab",
    content: "Pilih tabel output, diagnostic, riwayat iterasi, dan saved variables yang ingin ditampilkan atau disimpan.",
    targetId: "ordinal-regression-output-tab-trigger",
    defaultPosition: "bottom",
    defaultHorizontalPosition: null,
    icon: null,
    requiredTab: TABS.OUTPUT,
    forceChangeTab: true,
  },
];
