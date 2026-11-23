// Ticket shown after a booking. It carries a QR code with the confirmation code for fast check-in,
// the code in large type for manual entry, and the key match day details. It can be saved as a PNG.
import { forwardRef, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Bike, CalendarDays, Clock, Download, Flag, Info, MapPin, QrCode, Ticket, Trophy, User, Users, Wallet } from "lucide-react";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import { SPORT, Sport } from "@/components/sc/ui";

export type TicketRow = { label: string; value: string };

type Props = {
  sport?: Sport;
  kind: string;
  title: string;
  rows: TicketRow[];
  code?: string | null;
  codeLabel?: string;
  /** Show a QR code for the code (player and spectator tickets). Off for secret organiser codes. */
  qr?: boolean;
  footnote?: string;
  onReady?: () => void;
};

export const useQr = (text?: string | null, size = 640) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!text) {
      setUrl(null);
      return;
    }
    QRCode.toDataURL(text, { width: size, margin: 1, errorCorrectionLevel: "M", color: { dark: "#0E1411", light: "#FFFFFF" } })
      .then(setUrl)
      .catch(() => setUrl(null));
  }, [text, size]);
  return url;
};

const rowIcon = (label: string) => {
  const l = label.toLowerCase();
  if (/date|day/.test(l)) return CalendarDays;
  if (/time|start(s)?$|kick/.test(l)) return Clock;
  if (/finish|end/.test(l)) return Flag;
  if (/venue|meet|location|where|start/.test(l)) return MapPin;
  if (/slot|ticket|qty|quantity|seats/.test(l)) return Users;
  if (/price|paid|amount|fee/.test(l)) return Wallet;
  if (/player|rider|name|host|holder|spectator/.test(l)) return User;
  return Info;
};

const TicketCard = forwardRef<HTMLDivElement, Props>(function TicketCard(
  { sport = "football", kind, title, rows, code, codeLabel = "Confirmation code", qr = true, footnote, onReady },
  ref
) {
  const c = SPORT[sport];
  const qrUrl = useQr(qr ? code : null);
  const [logoReady, setLogoReady] = useState(false);

  useEffect(() => {
    if (logoReady && (!qr || !code || qrUrl)) onReady?.();
  }, [logoReady, qrUrl, qr, code, onReady]);

  return (
    <div ref={ref} className="w-full max-w-[360px] mx-auto bg-white rounded-[28px] overflow-hidden font-sans text-sc-ink shadow-float" style={{ fontFamily: "Satoshi, 'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <div className="relative px-5 pt-5 pb-6 overflow-hidden" style={{ background: c.solid, color: c.onSolid }}>
        {sport === "cycling" ? (
          <svg aria-hidden="true" className="absolute inset-0 w-full h-full" viewBox="0 0 360 150" preserveAspectRatio="xMidYMid slice" fill="none">
            <path d="M-10 140 C 80 120 120 60 200 70 S 320 30 380 10" stroke="rgba(255,255,255,0.22)" strokeWidth="14" strokeLinecap="round" />
            <path d="M-10 140 C 80 120 120 60 200 70 S 320 30 380 10" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeDasharray="8 10" />
            <circle cx="300" cy="34" r="22" fill="rgba(255,255,255,0.16)" />
          </svg>
        ) : sport === "football" ? (
          <svg aria-hidden="true" className="absolute inset-0 w-full h-full" viewBox="0 0 360 150" preserveAspectRatio="xMidYMid slice" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3">
            <circle cx="300" cy="75" r="46" />
            <path d="M300 -10V160" />
            <rect x="230" y="-6" width="180" height="162" rx="8" />
            <circle cx="300" cy="75" r="4" fill="rgba(255,255,255,0.3)" />
          </svg>
        ) : (
          <>
            <span aria-hidden="true" className="absolute -right-10 -top-10 w-40 h-40 rounded-full border-[18px] border-white/15" />
            <span aria-hidden="true" className="absolute right-10 -bottom-12 w-24 h-24 rounded-full bg-white/10" />
          </>
        )}
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/brand/sportcliq-mark.png" alt="" width={30} height={30} className="w-[30px] h-[30px] rounded-[9px]" onLoad={() => setLogoReady(true)} onError={() => setLogoReady(true)} />
            <span className="text-[15px] font-extrabold tracking-[-0.02em]">SportCliq</span>
          </div>
          <span className="h-7 px-3 rounded-full bg-white/25 text-[11px] font-extrabold tracking-[0.08em] uppercase flex items-center gap-1.5">
            {sport === "cycling" ? <Bike size={13} /> : sport === "football" ? <Trophy size={13} /> : <Ticket size={13} />}
            {kind}
          </span>
        </div>
        <h3 className="relative m-0 mt-4 text-[24px] leading-[28px] font-extrabold tracking-[-0.02em] max-w-[260px]">{title}</h3>
      </div>

      <div className="px-4 pt-4 pb-3 grid grid-cols-2 gap-2">
        {rows.map((r) => {
          const Icon = rowIcon(r.label);
          return (
            <div key={r.label} className="flex items-start gap-2.5 min-w-0 rounded-2xl bg-sc-bg px-3 py-2.5">
              <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.bg, color: c.fg }}>
                <Icon size={16} />
              </span>
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-sc-ink3">{r.label}</span>
                <span className="text-[13.5px] font-extrabold leading-[17px] break-words">{r.value}</span>
              </span>
            </div>
          );
        })}
      </div>

      {code && (
        <>
          <div className="relative h-5">
            <span className="absolute left-[-10px] top-0 w-5 h-5 rounded-full bg-sc-bg" />
            <span className="absolute right-[-10px] top-0 w-5 h-5 rounded-full bg-sc-bg" />
            <span className="absolute left-4 right-4 top-1/2 border-t-2 border-dashed border-sc-line" />
          </div>
          <div className="px-5 pt-2 pb-6 flex flex-col items-center gap-3">
            {qr && (
              <div className="p-2.5 rounded-[20px] bg-white border border-sc-line">
                {qrUrl ? <img src={qrUrl} alt={`QR code for ${code}`} className="w-[168px] h-[168px]" /> : <div className="w-[168px] h-[168px] rounded-xl sc-skel" />}
              </div>
            )}
            <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-sc-ink3">{codeLabel}</span>
            <span className="text-[34px] leading-none font-extrabold tracking-[0.18em] font-mono">{code}</span>
            {footnote && <span className="text-xs text-sc-ink3 text-center max-w-[260px]">{footnote}</span>}
          </div>
        </>
      )}
    </div>
  );
});

export default TicketCard;

/** Render an element to a sharp PNG (4x) and download it. */
export const downloadElementAsPng = async (el: HTMLElement, filename: string) => {
  const canvas = await html2canvas(el, {
    scale: Math.max(4, window.devicePixelRatio || 1),
    useCORS: true,
    backgroundColor: null,
    logging: false,
    scrollX: 0,
    scrollY: -window.scrollY,
  });
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 1));
  if (!blob) throw new Error("Could not create image");
  const file = filename.replace(/[^\w.-]+/g, "-");
  // Prefer the share sheet on phones (saves straight to Photos), fall back to a download link.
  const asFile = new File([blob], file, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.canShare && nav.canShare({ files: [asFile] }) && /iphone|ipad|android/i.test(navigator.userAgent)) {
    try {
      await nav.share({ files: [asFile], title: "SportCliq ticket" });
      return;
    } catch {
      /* fall through to download */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Re-open a saved ticket from My matches or My cycling. */

export function ViewTicketButton({ ticket }: { ticket: Omit<Props, "onReady"> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  if (!ticket.code) return null;
  const solid = SPORT[ticket.sport || "football"].solid;
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="h-10 px-4 rounded-full bg-sc-ink text-white text-sm font-bold inline-flex items-center gap-1.5"
      >
        <QrCode size={16} /> View ticket
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-[calc(100%-1.5rem)] sm:max-w-[420px] max-h-[92vh] overflow-y-auto bg-sc-bg p-5">
          <DialogTitle className="text-xl font-extrabold text-sc-ink text-center">Your ticket</DialogTitle>
          <DialogDescription className="text-sm text-sc-ink2 text-center -mt-2">Show this at check in.</DialogDescription>
          <TicketCard ref={ref} {...ticket} />
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (!ref.current) return;
              setBusy(true);
              try {
                await downloadElementAsPng(ref.current, `SportCliq-Ticket-${ticket.title}-${ticket.code}.png`);
              } finally {
                setBusy(false);
              }
            }}
            className="h-[52px] rounded-full text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: solid }}
          >
            <Download size={18} /> {busy ? "Saving..." : "Save ticket as image"}
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
