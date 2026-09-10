import React, { lazy, Suspense } from "react";
import type { BaseModalProps } from "@/types/modalTypes";
import { ModalType } from "@/types/modalTypes";

/**
 * LoadingModal - Displayed while modal components are loading
 */
const LoadingModal: React.FC<BaseModalProps> = ({ onClose }) => (
    <div className="p-6 text-center">
        <div className="animate-pulse mx-auto h-8 w-8 rounded-full bg-primary/20 mb-4" />
        <p className="text-sm text-muted-foreground">Loading clustering modal...</p>
    </div>
);

/**
 * withSuspense - HOC for wrapping lazy-loaded components with Suspense
 */
function withSuspense(
    Component: React.ComponentType<BaseModalProps>
): React.ComponentType<BaseModalProps> {
    const WrappedComponent = (props: BaseModalProps) => (
        <Suspense fallback={<LoadingModal onClose={props.onClose} />}>
            <Component {...props} />
        </Suspense>
    );

    WrappedComponent.displayName = `withSuspense(${Component.displayName || Component.name || "Component"})`;
    return WrappedComponent;
}

// Lazy load Clustering modals
const KMeansClusterModal = lazy(
    () =>
        import(
            "@/components/Modals/Analyze/Classify/k-means-cluster/dialogs/k-means-cluster-main"
        )
);
const KMedoidsClusterModal = lazy(() =>
    import(
        "@/components/Modals/Analyze/Clustering/k-medoids-cluster/dialogs/k-medoids-cluster-main"
    )
);

/**
 * CLUSTERING_MODAL_COMPONENTS - Registry for clustering modal components
 */
export const CLUSTERING_MODAL_COMPONENTS: Record<
    string,
    React.ComponentType<BaseModalProps>
> = {
    [ModalType.ModalKMeansCluster]: withSuspense(
        KMeansClusterModal as any
    ) as React.ComponentType<BaseModalProps>,
    [ModalType.ModalKMedoidsCluster]: withSuspense(
        KMedoidsClusterModal as any
    ) as React.ComponentType<BaseModalProps>,
};

/**
 * getClusteringModalComponent - Get a clustering modal component by type
 */
export function getClusteringModalComponent(
    type: ModalType
): React.ComponentType<BaseModalProps> | null {
    const Component = CLUSTERING_MODAL_COMPONENTS[type];

    if (!Component) {
        console.warn(`No clustering modal component registered for type: ${type}`);
        return null;
    }

    return Component;
}

/**
 * CLUSTERING_MODAL_CONTAINER_PREFERENCES - Container preferences for clustering modals
 */
export const CLUSTERING_MODAL_CONTAINER_PREFERENCES: Partial<
    Record<ModalType, "dialog" | "sidebar">
> = {
    [ModalType.ModalKMeansCluster]: "sidebar",
    [ModalType.ModalKMedoidsCluster]: "sidebar",
};
