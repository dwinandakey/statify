import React from "react";
import {
    MenubarSub,
    MenubarSubTrigger,
    MenubarSubContent,
    MenubarItem,
    MenubarSeparator,
} from "@/components/ui/menubar";
import { ModalType, useModal } from "@/hooks/useModal";

const TimeSeriesMenu: React.FC = () => {
    const { openModal } = useModal();
    return (
        <MenubarSub>
            <MenubarSubTrigger>Time Series</MenubarSubTrigger>
            <MenubarSubContent>
                <MenubarItem onClick={() => openModal(ModalType.Smoothing)}>
                    Smoothing...
                </MenubarItem>
                <MenubarItem onClick={() => openModal(ModalType.Decomposition)}>
                    Decomposition...
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem onClick={() => openModal(ModalType.Autocorrelation)}>
                    Autocorrelation...
                </MenubarItem>
                <MenubarItem onClick={() => openModal(ModalType.UnitRootTest)}>
                    Unit Root Test...
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem onClick={() => openModal(ModalType.BoxJenkinsModel)}>
                    Box-Jenkins Model...
                </MenubarItem>
                 <MenubarItem onClick={() => openModal(ModalType.ARDL)}>
                    Autoregressive Distributed Lag...
                </MenubarItem>
                <MenubarItem onClick={() => openModal(ModalType.ECM)}>
                    Error Correction Model...
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem onClick={() => openModal(ModalType.HomoscedasticityTest)}>
                    Homoscedasticity Test (ARCH-LM)...
                </MenubarItem>
                <MenubarItem onClick={() => openModal(ModalType.HeteroskedasticityModels)}>
                    Heteroskedasticity Models (ARCH/GARCH)...
                </MenubarItem>
            </MenubarSubContent>
        </MenubarSub>
    );
};

export default TimeSeriesMenu;