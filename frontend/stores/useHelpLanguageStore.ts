import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type HelpLanguage = 'id' | 'en';

interface HelpLanguageState {
  language: HelpLanguage;
  setLanguage: (lang: HelpLanguage) => void;
  toggleLanguage: () => void;
}

export const useHelpLanguageStore = create<HelpLanguageState>()(
  persist(
    (set, get) => ({
      language: 'id',
      setLanguage: (lang: HelpLanguage) => set({ language: lang }),
      toggleLanguage: () => set({ language: get().language === 'id' ? 'en' : 'id' }),
    }),
    {
      name: 'statify-help-language',
    }
  )
);
