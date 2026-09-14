"use client";

import React from "react";
import type { BaseModalProps } from "@/types/modalTypes";
import { KMedoidsClusterContainer } from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/dialogs/k-medoids-cluster-main";

const ModalKMedoidsCluster: React.FC<BaseModalProps> = ({ onClose }) => {
  return <KMedoidsClusterContainer onClose={onClose} />;
};

export default ModalKMedoidsCluster;
