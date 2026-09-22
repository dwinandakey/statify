/**
 * Unit tests untuk useTourGuide hook
 *
 * Hook ini mengelola tour guide interaktif di modal Bartlett Test
 */

import { renderHook, act } from '@testing-library/react';
import { useTourGuide } from '../hooks/useTourGuide';
import { baseTourSteps } from '../hooks/tourConfig';
import type { TabControlProps } from '../types';

describe('useTourGuide', () => {
    const mockTabControl: TabControlProps = {
        setActiveTab: jest.fn(),
        currentActiveTab: 'variables',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('State Awal', () => {
        it('harus menginisialisasi dengan tour tidak aktif', () => {
            const { result } = renderHook(() =>
                useTourGuide(baseTourSteps, 'dialog', mockTabControl)
            );

            expect(result.current.tourActive).toBe(false);
            expect(result.current.currentStep).toBe(0);
        });

        it('harus memiliki semua tour steps', () => {
            const { result } = renderHook(() =>
                useTourGuide(baseTourSteps, 'dialog', mockTabControl)
            );

            expect(result.current.tourSteps.length).toBe(baseTourSteps.length);
        });
    });

    describe('Kontrol Tour', () => {
        it('harus memulai tour dengan startTour', () => {
            const { result } = renderHook(() =>
                useTourGuide(baseTourSteps, 'dialog', mockTabControl)
            );

            act(() => {
                result.current.startTour();
            });

            expect(result.current.tourActive).toBe(true);
            expect(result.current.currentStep).toBe(0);
        });

        it('harus mengakhiri tour dengan endTour', () => {
            const { result } = renderHook(() =>
                useTourGuide(baseTourSteps, 'dialog', mockTabControl)
            );

            act(() => {
                result.current.startTour();
            });

            expect(result.current.tourActive).toBe(true);

            act(() => {
                result.current.endTour();
            });

            expect(result.current.tourActive).toBe(false);
            expect(result.current.currentStep).toBe(0);
        });

        it('harus pindah ke step berikutnya dengan nextStep', () => {
            const { result } = renderHook(() =>
                useTourGuide(baseTourSteps, 'dialog', mockTabControl)
            );

            act(() => {
                result.current.startTour();
            });

            expect(result.current.currentStep).toBe(0);

            act(() => {
                result.current.nextStep();
            });

            expect(result.current.currentStep).toBe(1);
        });

        it('harus pindah ke step sebelumnya dengan prevStep', () => {
            const { result } = renderHook(() =>
                useTourGuide(baseTourSteps, 'dialog', mockTabControl)
            );

            act(() => {
                result.current.startTour();
            });

            act(() => {
                result.current.nextStep();
            });

            expect(result.current.currentStep).toBe(1);

            act(() => {
                result.current.prevStep();
            });

            expect(result.current.currentStep).toBe(0);
        });

        it('tidak harus pindah ke step negatif', () => {
            const { result } = renderHook(() =>
                useTourGuide(baseTourSteps, 'dialog', mockTabControl)
            );

            act(() => {
                result.current.startTour();
            });

            expect(result.current.currentStep).toBe(0);

            act(() => {
                result.current.prevStep();
            });

            expect(result.current.currentStep).toBe(0);
        });

        it('harus mengakhiri tour saat mencapai step terakhir', () => {
            const { result } = renderHook(() =>
                useTourGuide(baseTourSteps, 'dialog', mockTabControl)
            );

            act(() => {
                result.current.startTour();
            });

            // Pindah ke semua step
            for (let i = 0; i < baseTourSteps.length; i++) {
                act(() => {
                    result.current.nextStep();
                });
            }

            // Tour harus selesai setelah step terakhir
            expect(result.current.tourActive).toBe(false);
        });
    });

    describe('Container Type', () => {
        it('harus menyesuaikan posisi untuk sidebar', () => {
            const { result } = renderHook(() =>
                useTourGuide(baseTourSteps, 'sidebar', mockTabControl)
            );

            // Untuk sidebar, horizontal position harus 'left'
            result.current.tourSteps.forEach((step) => {
                expect(step.horizontalPosition).toBe('left');
            });
        });

        it('harus menggunakan posisi default untuk dialog', () => {
            const { result } = renderHook(() =>
                useTourGuide(baseTourSteps, 'dialog', mockTabControl)
            );

            // Untuk dialog, gunakan posisi default dari config
            result.current.tourSteps.forEach((step, index) => {
                expect(step.position).toBe(baseTourSteps[index].defaultPosition);
            });
        });
    });

    describe('Tab Switching', () => {
        it('harus memanggil setActiveTab saat step memerlukan tab berbeda', () => {
            const tabControl: TabControlProps = {
                setActiveTab: jest.fn(),
                currentActiveTab: 'variables',
            };

            const { result } = renderHook(() =>
                useTourGuide(baseTourSteps, 'dialog', tabControl)
            );

            act(() => {
                result.current.startTour();
            });

            // Cari step yang memerlukan tab options
            const optionsStepIndex = baseTourSteps.findIndex(
                (step) => step.requiredTab === 'options'
            );

            if (optionsStepIndex >= 0) {
                // Pindah ke step options
                for (let i = 0; i < optionsStepIndex; i++) {
                    act(() => {
                        result.current.nextStep();
                    });
                }

                // Seharusnya setActiveTab dipanggil dengan 'options'
                expect(tabControl.setActiveTab).toHaveBeenCalled();
            }
        });
    });
});
