import * as DialogPrimitive from "@radix-ui/react-dialog";
import { lazy, Suspense } from "react";

const InboxView = lazy(() => import("@/pages/Inbox").then((m) => ({ default: m.InboxView })));

/** Slide up panel with the notification list. Opened from the bell on home and profile. */
export default function NotificationPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#0E1411]/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[92dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[30px] bg-sc-bg pt-2.5 shadow-[0_-12px_40px_rgba(14,20,17,0.18)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-300"
        >
          <DialogPrimitive.Title className="sr-only">Notifications</DialogPrimitive.Title>
          <Suspense fallback={<div className="flex-1 animate-pulse px-5 pt-4"><div className="h-8 w-44 rounded-xl bg-black/[0.06]" /><div className="mt-6 h-24 rounded-3xl bg-black/[0.05]" /><div className="mt-3 h-24 rounded-3xl bg-black/[0.05]" /></div>}>
            {open && <InboxView mode="panel" onClose={() => onOpenChange(false)} />}
          </Suspense>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
