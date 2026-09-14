import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type FieldHelpProps = {
  show: boolean;
  text: string;
};

export const FieldHelp = ({ show, text }: FieldHelpProps) => {
  if (!show) return null;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50"
            aria-label={text}
          >
            <Info className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px]">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
