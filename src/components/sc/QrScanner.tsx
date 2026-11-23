// Camera QR scanner for match day check-in.
// Reads SportCliq ticket QR codes (plain 6 digit code, or a link or text that contains one).
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { CameraOff, Keyboard, ScanLine, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/** Pull the 6 digit SportCliq code out of whatever the QR contains. */
export const extractCode = (raw: string): string | null => {
  const text = (raw || "").trim();
  try {
    const url = new URL(text);
    const q = url.searchParams.get("code");
    if (q && /^\d{6}$/.test(q)) return q;
  } catch {
    /* not a url */
  }
  const m = text.match(/(?:^|\D)(\d{6})(?:\D|$)/);
  return m ? m[1] : null;
};

export function QrScanButton({ label = "Scan QR code", onClick, className = "" }: { label?: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-[54px] w-full rounded-full bg-sc-ink text-white text-base font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform ${className}`}
    >
      <ScanLine size={20} /> {label}
    </button>
  );
}

export default function QrScannerDialog({
  open,
  onOpenChange,
  onCode,
  title = "Scan to check in",
  hint = "Point the camera at the QR code on the player's ticket",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCode: (code: string) => void | Promise<void>;
  title?: string;
  hint?: string;
}) {
  const regionId = useRef(`sc-qr-${Math.random().toString(36).slice(2)}`).current;
  const scanner = useRef<Html5Qrcode | null>(null);
  const handled = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const onCodeRef = useRef(onCode);
  const onOpenChangeRef = useRef(onOpenChange);
  onCodeRef.current = onCode;
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (!open) return;
    handled.current = false;
    setError(null);
    setManual("");
    let cancelled = false;

    const start = async () => {
      // Wait for the dialog content to mount.
      await new Promise((r) => setTimeout(r, 120));
      if (cancelled || !document.getElementById(regionId)) return;
      try {
        const s = new Html5Qrcode(regionId, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
        scanner.current = s;
        await s.start(
          { facingMode: "environment" },
          { fps: 12, qrbox: (w, h) => ({ width: Math.min(w, h) * 0.72, height: Math.min(w, h) * 0.72 }), aspectRatio: 1 },
          async (decoded) => {
            if (handled.current) return;
            const code = extractCode(decoded);
            if (!code) {
              setError("That QR code isn't a SportCliq ticket.");
              return;
            }
            handled.current = true;
            if (navigator.vibrate) navigator.vibrate(60);
            await stop();
            setBusy(true);
            try {
              await onCodeRef.current(code);
              onOpenChangeRef.current(false);
            } finally {
              setBusy(false);
            }
          },
          () => {}
        );
      } catch (e) {
        const msg = String((e as Error)?.message || e);
        setError(
          /permission|denied|NotAllowed/i.test(msg)
            ? "Camera permission was denied. Allow camera access in your browser settings, or type the code below."
            : "We couldn't open the camera. You can type the code below."
        );
      }
    };

    const stop = async () => {
      const s = scanner.current;
      scanner.current = null;
      if (s) {
        try {
          if (s.isScanning) await s.stop();
          s.clear();
        } catch {
          /* already stopped */
        }
      }
    };

    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, regionId]);

  const submitManual = async () => {
    const code = extractCode(manual);
    if (!code) {
      setError("Codes are 6 digits.");
      return;
    }
    setBusy(true);
    try {
      await onCode(code);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 overflow-hidden bg-sc-ink text-white border-0 [&>button]:hidden">
        <div className="flex items-center justify-between px-5 pt-5">
          <DialogTitle className="text-lg font-extrabold text-white">{title}</DialogTitle>
          <button type="button" aria-label="Close scanner" onClick={() => onOpenChange(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <X size={20} />
          </button>
        </div>
        <DialogDescription className="px-5 pt-1 text-white/70 text-sm">{hint}</DialogDescription>

        <div className="relative mx-5 mt-4 aspect-square rounded-[28px] overflow-hidden bg-black">
          <div id={regionId} className="absolute inset-0 [&_video]:!w-full [&_video]:!h-full [&_video]:object-cover" />
          {/* Viewfinder corners */}
          <div className="pointer-events-none absolute inset-[14%]">
            {(["top-0 left-0 border-t-[5px] border-l-[5px] rounded-tl-[18px]", "top-0 right-0 border-t-[5px] border-r-[5px] rounded-tr-[18px]", "bottom-0 left-0 border-b-[5px] border-l-[5px] rounded-bl-[18px]", "bottom-0 right-0 border-b-[5px] border-r-[5px] rounded-br-[18px]"] as const).map((c) => (
              <span key={c} className={`absolute w-10 h-10 border-sc-green-bright ${c}`} />
            ))}
            <span className="absolute left-3 right-3 h-[3px] rounded bg-sc-green-bright shadow-[0_0_14px_#22C55E] animate-[sc-scan_2s_ease-in-out_infinite]" />
          </div>
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-sc-ink/85">
              <CameraOff size={32} />
              <span className="text-sm font-semibold">{error}</span>
            </div>
          )}
          {busy && <div className="absolute inset-0 flex items-center justify-center bg-sc-ink/70 text-sm font-bold">Checking in...</div>}
        </div>

        <div className="p-5 flex flex-col gap-2.5">
          <span className="text-xs font-bold uppercase tracking-[0.08em] text-white/60 flex items-center gap-1.5">
            <Keyboard size={14} /> Or type the code
          </span>
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              maxLength={6}
              value={manual}
              onChange={(e) => setManual(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6 digit code"
              aria-label="Confirmation code"
              className="flex-1 h-[52px] rounded-2xl bg-white/10 px-4 text-lg font-bold tracking-[0.3em] text-white placeholder:tracking-normal placeholder:text-white/40 outline-none focus:ring-2 focus:ring-sc-green-bright"
            />
            <button
              type="button"
              onClick={submitManual}
              disabled={busy || manual.length !== 6}
              className="h-[52px] px-5 rounded-2xl bg-sc-green text-white font-bold disabled:opacity-40"
            >
              Check in
            </button>
          </div>
        </div>
        <style>{`@keyframes sc-scan { 0%,100% { top: 8%; } 50% { top: 88%; } }`}</style>
      </DialogContent>
    </Dialog>
  );
}
