import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
    type SigmaCells,
    sigmaCell,
} from "@/components/Modals/Analyze/general-linear-model/multivariate/services/known-sigma";

// "Population covariance matrix (Σ) known" check box, shared by the Test
// Values, Test Values (δ₀) and Paired dialogs. Unchecked by default.
export const KnownSigmaCheckbox = ({
    id,
    checked,
    onCheckedChange,
}: {
    id: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
}) => (
    <div className="flex items-center space-x-2">
        <Checkbox
            id={id}
            checked={checked}
            onCheckedChange={(value) => onCheckedChange(value === true)}
        />
        <label htmlFor={id} className="text-sm font-medium leading-none">
            Population covariance matrix (Σ) known
        </label>
    </div>
);

// p × p grid labelled with the dependent variable (or pair) names. The upper
// triangle including the diagonal is editable; the lower triangle is
// read-only and shows the mirrored upper entry, so Σ is always symmetric.
// Cell ids: `${idPrefix}-${i}-${j}` (0-based row, column).
export const KnownSigmaMatrix = ({
    idPrefix,
    title,
    names,
    cells,
    onChange,
}: {
    idPrefix: string;
    title: string;
    names: string[];
    cells: SigmaCells;
    onChange: (i: number, j: number, value: string) => void;
}) => (
    <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold">{title}</span>
        <div className="overflow-x-auto">
            <table id={idPrefix} className="border-collapse text-xs">
                <thead>
                    <tr>
                        <th className="p-1" />
                        {names.map((name, j) => (
                            <th
                                key={`h-${j}`}
                                className="p-1 font-medium text-left max-w-[112px] truncate"
                                title={name}
                            >
                                {name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {names.map((rowName, i) => (
                        <tr key={`r-${i}`}>
                            <th
                                className="p-1 pr-2 font-medium text-left max-w-[160px] truncate"
                                title={rowName}
                            >
                                {rowName}
                            </th>
                            {names.map((_, j) => (
                                <td key={`c-${i}-${j}`} className="p-1">
                                    {j >= i ? (
                                        <Input
                                            id={`${idPrefix}-${i}-${j}`}
                                            type="text"
                                            inputMode="decimal"
                                            aria-label={`${title}, ${rowName} × ${names[j]}`}
                                            value={sigmaCell(cells, i, j)}
                                            onChange={(e) => onChange(i, j, e.target.value)}
                                            className="h-7 w-24 px-2 text-xs"
                                        />
                                    ) : (
                                        <Input
                                            id={`${idPrefix}-${i}-${j}`}
                                            type="text"
                                            readOnly
                                            disabled
                                            tabIndex={-1}
                                            aria-label={`${title}, ${rowName} × ${names[j]} (filled from the upper triangle)`}
                                            value={sigmaCell(cells, i, j)}
                                            className="h-7 w-24 px-2 text-xs bg-muted"
                                        />
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

export const KnownSigmaHint = () => (
    <p className="text-xs text-muted-foreground">
        Fill in the upper triangle including the diagonal; the lower triangle
        is filled in automatically (Σ is symmetric). The diagonal entries
        (variances) must be positive and Σ must be positive definite.
    </p>
);

export const KnownSigmaError = ({ id, message }: { id: string; message: string | null }) =>
    message ? (
        <p id={id} role="alert" className="text-sm text-destructive">
            {message}
        </p>
    ) : null;
