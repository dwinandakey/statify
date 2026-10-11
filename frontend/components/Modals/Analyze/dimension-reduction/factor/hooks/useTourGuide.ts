import { useCallback, useEffect, useMemo, useState } from "react";
import type { HorizontalPosition, TourStep } from "@/types/tourTypes";

export const useTourGuide = (initialSteps: TourStep[]) => {
    const [tourActive, setTourActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [targetElements, setTargetElements] = useState<
        Record<string, HTMLElement | null>
    >({});

    const tourSteps = useMemo(
        () =>
            initialSteps.map((step) => ({
                ...step,
                horizontalPosition:
                    step.defaultHorizontalPosition as HorizontalPosition | null,
                position: step.defaultPosition,
            })),
        [initialSteps]
    );

    const refreshTargetElements = useCallback(() => {
        if (!tourActive) return;
        const elements: Record<string, HTMLElement | null> = {};
        tourSteps.forEach((step) => {
            elements[step.targetId] = document.getElementById(step.targetId);
        });
        setTargetElements(elements);
    }, [tourActive, tourSteps]);

    const startTour = useCallback(() => {
        setCurrentStep(0);
        setTourActive(true);
    }, []);

    const endTour = useCallback(() => {
        setTourActive(false);
        setCurrentStep(0);
    }, []);

    const nextStep = useCallback(() => {
        if (currentStep + 1 < tourSteps.length) {
            setCurrentStep((step) => step + 1);
        } else {
            endTour();
        }
    }, [currentStep, endTour, tourSteps.length]);

    const prevStep = useCallback(() => {
        if (currentStep > 0) setCurrentStep((step) => step - 1);
    }, [currentStep]);

    useEffect(() => {
        if (tourActive) refreshTargetElements();
    }, [currentStep, refreshTargetElements, tourActive]);

    useEffect(() => {
        if (!tourActive) return;
        window.addEventListener("resize", refreshTargetElements);
        return () => window.removeEventListener("resize", refreshTargetElements);
    }, [refreshTargetElements, tourActive]);

    return {
        tourActive,
        currentStep,
        tourSteps,
        currentTargetElement: tourActive
            ? targetElements[tourSteps[currentStep]?.targetId] ?? null
            : null,
        startTour,
        nextStep,
        prevStep,
        endTour,
    };
};