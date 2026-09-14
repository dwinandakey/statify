import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

/**
 * Standardized layout for all statistics guide components
 * Enhanced with modern design patterns and animations
 * Follows the design system defined in globals.css
 */

export interface TabConfig {
  id: string;
  label: string;
  labelEn?: string;
  icon: LucideIcon;
  component: React.ComponentType;
}

interface StandardizedGuideLayoutProps {
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  tabs: TabConfig[];
  defaultTab?: string;
  className?: string;
  children?: React.ReactNode;
  summary?: React.ReactNode;
}

const DEFAULT_TAB_LABELS: Record<string, { id: string; en: string }> = {
  overview: { id: 'Ringkasan', en: 'Overview' },
  usage: { id: 'Penggunaan', en: 'Usage' },
  algorithm: { id: 'Algoritma', en: 'Algorithm' },
  variables: { id: 'Variabel', en: 'Variables' },
  statistics: { id: 'Statistik', en: 'Statistics' },
  charts: { id: 'Grafik', en: 'Charts' },
};

export const StandardizedGuideLayout: React.FC<StandardizedGuideLayoutProps> = ({
  title,
  titleEn,
  description,
  descriptionEn,
  tabs,
  defaultTab,
  className,
  children,
  summary
}) => {
  const { language } = useHelpLanguageStore();
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id ?? 'overview');

  const displayTitle = language === 'en' && titleEn ? titleEn : title;
  const displayDescription = language === 'en' && descriptionEn ? descriptionEn : description;

  return (
    <div className={cn(
      "w-full space-y-8 animate-fadeIn",
      "bg-background text-foreground",
      className
    )}>
      {/* Enhanced Header with gradient background */}
      <header className="space-y-4 pb-6 border-b border-border">
        <div className="space-y-3">
          <h1 className={cn(
            "text-3xl font-bold tracking-tight",
            "bg-gradient-to-r from-primary to-accent-foreground bg-clip-text text-transparent",
            "sm:text-4xl"
          )}>
            {displayTitle}
          </h1>
          <p className={cn(
            "text-lg text-muted-foreground leading-relaxed",
            "max-w-3xl"
          )}>
            {displayDescription}
          </p>
        </div>
      </header>

      {/* Enhanced Tabs with better responsive design */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="relative">
          <TabsList className={cn(
            "grid w-full h-auto p-1",
            "bg-muted/50 backdrop-blur-sm",
            "border border-border rounded-lg",
            "shadow-sm",
            // Responsive grid based on tab count
            tabs.length <= 2 && "grid-cols-1 sm:grid-cols-2",
            tabs.length === 3 && "grid-cols-1 sm:grid-cols-3",
            tabs.length === 4 && "grid-cols-2 sm:grid-cols-4",
            tabs.length === 5 && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
            tabs.length > 5 && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
          )}>
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const labelText = (language === 'en')
                ? (tab.labelEn || DEFAULT_TAB_LABELS[tab.id]?.en || tab.label)
                : (DEFAULT_TAB_LABELS[tab.id]?.id || tab.label);
              return (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id} 
                  className={cn(
                    "flex items-center justify-center gap-2",
                    "px-4 py-3 text-sm font-medium",
                    "transition-all duration-200 ease-out",
                    "hover:bg-accent/50 hover:text-accent-foreground",
                    "data-[state=active]:bg-background",
                    "data-[state=active]:text-foreground",
                    "data-[state=active]:shadow-sm",
                    "data-[state=active]:border-border",
                    "rounded-md"
                  )}
                >
                  <IconComponent className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{labelText}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Enhanced Tab Content with animations */}
        {tabs.map((tab) => {
          const TabComponent = tab.component;
          return (
            <TabsContent 
              key={tab.id} 
              value={tab.id} 
              className={cn(
                "mt-8 animate-fadeIn",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "rounded-lg"
              )}
            >
              {summary ? (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
                  <div className="space-y-6">
                    <TabComponent />
                  </div>
                  <aside className="hidden lg:block">
                    <div className="sticky top-24 space-y-4">
                      {summary}
                    </div>
                  </aside>
                </div>
              ) : (
                <div className="space-y-6">
                  <TabComponent />
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Additional Content */}
      {children && (
        <div className="mt-8 animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  );
};

export default StandardizedGuideLayout;