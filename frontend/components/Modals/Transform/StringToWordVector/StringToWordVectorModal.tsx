import React from "react";
import { BaseModalProps } from "@/types/modalTypes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStringToWordVector } from "./hooks/useStringToWordVector";
import { VariablesTab } from "./VariablesTab";
import { OptionsTab } from "./OptionsTab";
import { toast } from "sonner";
import { validateStwvConfig } from "./config";
import { Loader2, AlertCircle, HelpCircle } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TabControlProps } from "@/components/Modals/Analyze/Descriptive/Descriptive/hooks/useTourGuide";
import { useTourGuide } from "@/components/Modals/Analyze/Descriptive/Descriptive/hooks/useTourGuide";
import { TourPopup, ActiveElementHighlight } from "@/components/Common/TourComponents";
import { useHelpLanguageStore } from "@/stores/useHelpLanguageStore";
import { STWV_TOUR_IDS, getStwvTourSteps } from "./hooks/tourConfig";
import { validateColumnPrefix } from "./utils/columnPrefix";
import { formatStwvError } from "./utils/formatStwvError";

/**
 * Komponen Content
 * Berisi tabulasi dan logic, namun TIDAK membungkus dirinya sendiri dengan `Dialog`.
 * Ini agar Sidebar bisa merendernya dengan lebar penuh dengan rapi!.
 */
const StringToWordVectorContent: React.FC<BaseModalProps> = ({ onClose, containerType }) => {
    const {
        availableVariables,
        selectedVariable,
        highlightedVariable,
        setHighlightedVariable,
        moveToTarget,
        removeTarget,
        config,
        setConfig,
        columnPrefix,
        setColumnPrefix,
        isLoading,
        error,
        runAndAddToDataset,
        reset,
    } = useStringToWordVector();

    const [activeTab, setActiveTab] = React.useState("variables");

    // Tur bantuan interaktif (pola Ordinal Regression); bahasa mengikuti halaman Help
    const helpLanguage = useHelpLanguageStore((state) => state.language);
    const baseTourSteps = React.useMemo(() => getStwvTourSteps(helpLanguage), [helpLanguage]);
    const tabControl = React.useMemo(
        (): TabControlProps => ({
            setActiveTab: (tab: string) => setActiveTab(tab),
            currentActiveTab: activeTab,
        }),
        [activeTab]
    );
    const { tourActive, currentStep, tourSteps, currentTargetElement, startTour, nextStep, prevStep, endTour } =
        useTourGuide(baseTourSteps, containerType === "sidebar" ? "sidebar" : "dialog", tabControl);

  // Gulirkan panel ke kolom yang sedang dijelaskan agar terlihat bersama pop-up-nya.
  React.useEffect(() => {
    currentTargetElement?.scrollIntoView?.({ block: "nearest" });
  }, [currentTargetElement]);

    // Validasi opsi: tombol Run dinonaktifkan dan pesan ditampilkan bila ada yang tidak sah
    const validationErrors = React.useMemo(() => validateStwvConfig(config), [config]);
    const prefixError = React.useMemo(() => validateColumnPrefix(columnPrefix), [columnPrefix]);
    const hasValidationErrors = validationErrors.length > 0 || prefixError !== null;

    // OK: jalankan STWV, tambahkan kolom ke dataset, tulis Output Viewer; tutup modal bila berhasil
    const handleOk = async () => {
        if (!selectedVariable) {
            toast.error("Select a text variable first.");
            return;
        }
        if (hasValidationErrors) {
            toast.error(validationErrors[0] ?? prefixError ?? "Some options are invalid.");
            return;
        }
        const success = await runAndAddToDataset();
        if (success) onClose();
    };

    const handleReset = () => {
        reset();
        setActiveTab("variables");
    };

    return (
        <div className="flex flex-col h-full bg-background">
            <AnimatePresence>
                {tourActive && tourSteps.length > 0 && currentStep < tourSteps.length && (
                    <TourPopup
                        step={tourSteps[currentStep]}
                        currentStep={currentStep}
                        totalSteps={tourSteps.length}
                        onNext={nextStep}
                        onPrev={prevStep}
                        onClose={endTour}
                        targetElement={currentTargetElement}
                    />
                )}
            </AnimatePresence>
            <ActiveElementHighlight active={tourActive} />

            <div className="flex-grow px-6 py-3 overflow-y-auto min-h-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                        <TabsTrigger value="variables" id={STWV_TOUR_IDS.variablesTab}>Variables</TabsTrigger>
                        <TabsTrigger value="options" id={STWV_TOUR_IDS.optionsTab}>Options</TabsTrigger>
                    </TabsList>

                    <div className="flex-grow min-h-0 overflow-hidden">
                        <TabsContent value="variables" className="h-full mt-0 pt-2">
                            <VariablesTab
                                availableVariables={availableVariables}
                                selectedVariable={selectedVariable}
                                highlightedVariable={highlightedVariable}
                                setHighlightedVariable={setHighlightedVariable}
                                onMoveToTarget={moveToTarget}
                                onRemoveTarget={removeTarget}
                            />
                        </TabsContent>

                        <TabsContent value="options" className="h-full mt-0 pt-2">
                            <OptionsTab
                                config={config}
                                setConfig={setConfig}
                                columnPrefix={columnPrefix}
                                setColumnPrefix={setColumnPrefix}
                                columnPrefixError={prefixError}
                            />
                        </TabsContent>
                    </div>
                </Tabs>

                {/* ── Area Hasil ────────────────────────────────────────────── */}
                {isLoading && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Processing... Please wait.</span>
                    </div>
                )}

                {hasValidationErrors && (
                    <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-semibold">Some options are invalid:</p>
                            {validationErrors.map((msg) => (
                                <p key={msg}>{msg}</p>
                            ))}
                        </div>
                    </div>
                )}

                {error && !isLoading && (
                    <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                            <p>{formatStwvError(error)}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Form Action Buttons */}
            <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-secondary flex-shrink-0">
                <div className="flex items-center text-muted-foreground">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    data-testid="stwv-help-button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={startTour}
                                    aria-label="Start feature tour"
                                    className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                                >
                                    <HelpCircle className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                <p className="text-xs">Start feature tour</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div className="flex items-center space-x-4">
                    <Button onClick={handleOk} disabled={isLoading || !selectedVariable || hasValidationErrors}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            "OK"
                        )}
                    </Button>
                    <Button variant="outline" onClick={handleReset} disabled={isLoading}>Reset</Button>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
                </div>
            </div>
        </div>
    );
};

/**
 * Entry Wrapper:
 * Mengidentifikasi apakah dipanggil mode "dialog" atau "sidebar"
 * berdasarkan logic yang dieksekusi modal manager.
 */
const StringToWordVectorModal: React.FC<BaseModalProps> = (props) => {
    // Mode Sidebar Kanan (default sekarang)
    if (props.containerType === "sidebar") {
        return <StringToWordVectorContent {...props} />;
    }

    // Fallback bila dibuka mode dialog tengah
    return (
        <Dialog open onOpenChange={props.onClose}>
            <DialogContent className="max-w-4xl p-0 h-[80vh] flex flex-col overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>String to Word Vector</DialogTitle>
                </DialogHeader>
                <div className="flex-grow overflow-hidden relative">
                    <StringToWordVectorContent {...props} />
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default StringToWordVectorModal;