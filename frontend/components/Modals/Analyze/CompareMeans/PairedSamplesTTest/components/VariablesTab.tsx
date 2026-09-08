import type { FC } from "react";
import type { VariablesTabProps } from "../types";
import PairedVariablesTab from "@/components/Common/PairedVariablesTab";

const VariablesTab: FC<VariablesTabProps> = (props) => {
    return <PairedVariablesTab {...props} idPrefix="paired-samples-t-test" />;
};

export default VariablesTab;
