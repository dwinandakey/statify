import type { BaseModalProps } from '@/types/modalTypes';
import { ModalType } from '@/types/modalTypes';
import { isTimeSeriesModal } from '@/components/Modals/Analyze/TimeSeries/TimeSeriesModal';

// Import time series modals directly from their directories
import Smoothing from '@/components/Modals/Analyze/TimeSeries/Smoothing';
import Decomposition from '@/components/Modals/Analyze/TimeSeries/Decomposition';
import Autocorrelation from '@/components/Modals/Analyze/TimeSeries/Autocorrelation';
import UnitRootTest from '@/components/Modals/Analyze/TimeSeries/UnitRootTest';
import BoxJenkinsModel from '@/components/Modals/Analyze/TimeSeries/BoxJenkinsModel';
import ARDL from '@/components/Modals/Analyze/TimeSeries/ARDL';
import ECM from '@/components/Modals/Analyze/TimeSeries/ECM';
import ARCH from '@/components/Modals/Analyze/TimeSeries/HeteroskedasticityModels';
import GARCH from '@/components/Modals/Analyze/TimeSeries/HeteroskedasticityModels';
import HomoscedasticityTest from '@/components/Modals/Analyze/TimeSeries/HomoscedasticityTest';
import HeteroskedasticityModels from '@/components/Modals/Analyze/TimeSeries/HeteroskedasticityModels';

/**
 * TIME_SERIES_MODAL_COMPONENTS - Registry for time series modal components
 * 
 * Maps each time series related ModalType to its corresponding React component
 */
export const TIME_SERIES_MODAL_COMPONENTS: Record<string, React.ComponentType<BaseModalProps>> = {
  // Time series operations
  [ModalType.Smoothing]: Smoothing as React.ComponentType<BaseModalProps>,
  [ModalType.Decomposition]: Decomposition as React.ComponentType<BaseModalProps>,
  [ModalType.Autocorrelation]: Autocorrelation as React.ComponentType<BaseModalProps>,
  [ModalType.UnitRootTest]: UnitRootTest as React.ComponentType<BaseModalProps>,
  [ModalType.BoxJenkinsModel]: BoxJenkinsModel as React.ComponentType<BaseModalProps>,
  [ModalType.ARDL]: ARDL as React.ComponentType<BaseModalProps>,
  [ModalType.ECM]: ECM as React.ComponentType<BaseModalProps>,
  [ModalType.ARCH]: ARCH as React.ComponentType<BaseModalProps>,
  [ModalType.GARCH]: GARCH as React.ComponentType<BaseModalProps>,
  [ModalType.HomoscedasticityTest]: HomoscedasticityTest as React.ComponentType<BaseModalProps>,
  [ModalType.HeteroskedasticityModels]: HeteroskedasticityModels as React.ComponentType<BaseModalProps>
};

/**
 * TIME_SERIES_MODAL_CONTAINER_PREFERENCES - Container preferences for time series modals
 * 
 * Some modals work better in specific container types based on their complexity
 * and screen space requirements.
 */
export const TIME_SERIES_MODAL_CONTAINER_PREFERENCES: Partial<Record<ModalType, "dialog" | "sidebar">> = {
  // Time series modals
  [ModalType.Smoothing]: "sidebar",
  [ModalType.Decomposition]: "sidebar",
  [ModalType.Autocorrelation]: "sidebar",
  [ModalType.UnitRootTest]: "sidebar", 
  [ModalType.BoxJenkinsModel]: "sidebar",
  [ModalType.ARDL]: "sidebar",
  [ModalType.ECM]: "sidebar",
  [ModalType.ARCH]: "sidebar",
  [ModalType.GARCH]: "sidebar",
  [ModalType.HomoscedasticityTest]: "sidebar",
  [ModalType.HeteroskedasticityModels]: "sidebar"
};

// Re-export the imported components for convenience
export { Smoothing, Decomposition, Autocorrelation, UnitRootTest, BoxJenkinsModel, ARDL, ECM, ARCH, GARCH, HomoscedasticityTest, HeteroskedasticityModels };

// Re-export isTimeSeriesModal for convenience
export { isTimeSeriesModal }; 