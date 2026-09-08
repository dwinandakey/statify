"use client";

import React from "react";
import { RankCasesUI } from "./RankCasesUI";

interface RankCasesProps {
  onClose: () => void;
  containerType?: "dialog" | "sidebar";
}

const RankCases: React.FC<RankCasesProps> = ({
  onClose,
  containerType = "dialog",
}) => {
  return (
    <div className={`rank-cases-container ${containerType}`}>
      <RankCasesUI onClose={onClose} containerType={containerType} />
    </div>
  );
};

export default RankCases;
