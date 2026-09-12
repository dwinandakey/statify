"use client";

import React from "react";
import {
  MenubarItem,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
} from "@/components/ui/menubar";
import { ModalType, useModal } from "@/hooks/useModal";

const ClusteringMenu: React.FC = () => {
  const { openModal } = useModal();

  return (
    <MenubarSub>
      <MenubarSubTrigger>Clustering</MenubarSubTrigger>
      <MenubarSubContent>
        <MenubarItem onClick={() => openModal(ModalType.ModalKMeansCluster)}>
          K-Means Cluster
        </MenubarItem>
        <MenubarItem onClick={() => openModal(ModalType.ModalKMedoidsCluster)}>
          K-Medoids Cluster
        </MenubarItem>
        <MenubarItem
          disabled={true}
          onClick={() => openModal(ModalType.ModalTwoStepCluster)}
        >
          Hierarchical Cluster
        </MenubarItem>
        <MenubarItem
          disabled={true}
          onClick={() => openModal(ModalType.ModalTwoStepCluster)}
        >
          TwoStep Cluster
        </MenubarItem>
        <MenubarItem
          disabled={true}
          onClick={() => openModal(ModalType.ModalClusterSilhouettes)}
        >
          Cluster Silhouettes
        </MenubarItem>
      </MenubarSubContent>
    </MenubarSub>
  );
};

export default ClusteringMenu;
