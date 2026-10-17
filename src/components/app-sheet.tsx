import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * The one AutoJackie pop-up: centered dialog on desktop, bottom sheet on phones.
 * Layout lives in DialogContent + .app-sheet, so changing it here changes every pop-up.
 */
export function AppSheet({ open, onOpenChange, title, description, eyebrow, className, children, footer }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={cn("app-sheet", className)}>
      <DialogHeader>
        {eyebrow && <span className="app-sheet-eyebrow">{eyebrow}</span>}
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
      </DialogHeader>
      {children}
      {footer && <div className="app-sheet-footer">{footer}</div>}
    </DialogContent>
  </Dialog>;
}
