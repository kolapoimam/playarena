import React, { useState } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { modalAction, modalCancel } from "@/components/ui/modal-styles";
import { cn } from "@/lib/utils";

/**
 * The confirm step used across the app, for things like signing out or cancelling.
 * The confirm button shows a spinner while the action runs and the modal closes after.
 */
export default function ConfirmModal({
  open, onOpenChange, icon: Icon, tone = "default", title, description, confirmLabel, cancelLabel = "Not now", onConfirm, children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  icon?: LucideIcon;
  tone?: "default" | "danger";
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const danger = tone === "danger";
  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AlertDialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <AlertDialogContent className="sm:max-w-[380px] text-center">
        <AlertDialogHeader className="items-center text-center gap-2">
          {Icon && (
            <span className={cn("w-16 h-16 rounded-[22px] flex items-center justify-center mb-1", danger ? "bg-sport-red-bg text-sport-red-fg" : "bg-sc-green/10 text-sc-green")}>
              <Icon size={28} strokeWidth={2.2} />
            </span>
          )}
          <AlertDialogTitle className="text-center">{title}</AlertDialogTitle>
          {description && <AlertDialogDescription className="text-center">{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter className="sm:flex-col-reverse sm:[&>*]:w-full">
          <button type="button" className={modalCancel} disabled={busy} onClick={() => onOpenChange(false)}>{cancelLabel}</button>
          <button type="button" className={cn(modalAction, danger && "bg-[#DC2626] hover:bg-[#DC2626]/90")} disabled={busy} onClick={run}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : confirmLabel}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
