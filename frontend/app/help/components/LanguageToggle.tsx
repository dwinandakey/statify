import React from 'react';
import { Globe } from 'lucide-react';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';
import { cn } from '@/lib/utils';

export const LanguageToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { language, setLanguage } = useHelpLanguageStore();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 p-1 rounded-full bg-muted/80 border border-border shadow-xs text-xs select-none transition-all",
        className
      )}
    >
      <div className="flex items-center pl-1 text-muted-foreground">
        <Globe className="w-3.5 h-3.5" />
      </div>
      <button
        type="button"
        onClick={() => setLanguage('id')}
        className={cn(
          "px-2.5 py-0.5 rounded-full font-medium transition-all cursor-pointer",
          language === 'id'
            ? "bg-background text-foreground shadow-xs border border-border font-semibold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        ID
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={cn(
          "px-2.5 py-0.5 rounded-full font-medium transition-all cursor-pointer",
          language === 'en'
            ? "bg-background text-foreground shadow-xs border border-border font-semibold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        EN
      </button>
    </div>
  );
};

export default LanguageToggle;
