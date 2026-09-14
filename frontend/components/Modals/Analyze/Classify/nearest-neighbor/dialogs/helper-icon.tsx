import { useEffect, useId, useState } from "react";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type HelperIconProps = {
  text: string;
};

const HELPER_ICON_OPEN_EVENT = "knn-helper-icon-open";

export const HelperIcon = ({ text }: HelperIconProps) => {
  const id = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const closeOtherHelpers = (event: Event) => {
      const helperEvent = event as CustomEvent<string>;
      if (helperEvent.detail !== id) {
        setOpen(false);
      }
    };

    window.addEventListener(HELPER_ICON_OPEN_EVENT, closeOtherHelpers);

    return () => {
      window.removeEventListener(HELPER_ICON_OPEN_EVENT, closeOtherHelpers);
    };
  }, [id]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (nextOpen) {
      window.dispatchEvent(
        new CustomEvent(HELPER_ICON_OPEN_EVENT, { detail: id }),
      );
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="ml-auto inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Show helper text"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="max-w-[280px] text-sm">
        {text}
      </PopoverContent>
    </Popover>
  );
};
