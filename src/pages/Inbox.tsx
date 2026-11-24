import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNowStrict, isThisWeek, isToday, isYesterday, format } from "date-fns";
import { ArrowUpRight, BellOff, BellRing, CheckCheck, LogIn, Settings2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { BackButton, EmptyState, IconButton, ScButton, Segmented } from "@/components/sc/ui";
import ConfirmModal from "@/components/sc/ConfirmModal";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { fetchInbox, markAllInboxRead, markOpened, openInboxLink, trackInbox, type InboxItem } from "@/lib/inbox";

const PAGE = 20;

const groupOf = (iso: string) => {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  if (isThisWeek(d, { weekStartsOn: 1 })) return "This week";
  return "Earlier";
};

const ago = (iso: string) => {
  const d = new Date(iso);
  if (Date.now() - d.getTime() < 60_000) return "now";
  if (isToday(d)) return formatDistanceToNowStrict(d).replace(/ seconds?/, "s").replace(/ minutes?/, "m").replace(/ hours?/, "h");
  if (isThisWeek(d, { weekStartsOn: 1 })) return format(d, "EEE");
  return format(d, "d MMM");
};

function RowSkeleton() {
  return (
    <div className="flex gap-3 rounded-[22px] bg-white p-4 animate-pulse">
      <span className="h-11 w-11 rounded-2xl bg-black/[0.06]" />
      <span className="flex flex-1 flex-col gap-2 pt-1">
        <span className="h-3.5 w-2/3 rounded-full bg-black/[0.06]" />
        <span className="h-3 w-full rounded-full bg-black/[0.05]" />
        <span className="h-3 w-1/2 rounded-full bg-black/[0.05]" />
      </span>
    </div>
  );
}

/** The notification list. Used as a full page and inside the panel the bell opens. */
export function InboxView({ mode = "page", onClose }: { mode?: "page" | "panel"; onClose?: () => void }) {
  const panel = mode === "panel";
  const navigate = useNavigate();
  const [signedOut, setSignedOut] = useState(false);
  const { toast } = useToast();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [open, setOpen] = useState<InboxItem | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const seen = useRef(new Set<string>());

  const load = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) {
      if (panel) {
        setSignedOut(true);
        setLoading(false);
      } else navigate("/auth", { replace: true });
      return;
    }
    try {
      const res = await fetchInbox(PAGE, 0);
      setItems(res.items);
      setUnread(res.unread);
      setHasMore(res.items.length === PAGE);
    } catch {
      toast({ title: "Could not load notifications", description: "Check your connection and try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [navigate, toast, panel]);

  useEffect(() => {
    load();
  }, [load]);

  // Every message shown in the list counts as viewed once
  useEffect(() => {
    items.forEach((i) => {
      if (!seen.current.has(i.id)) {
        seen.current.add(i.id);
        trackInbox(i.id, "view");
      }
    });
  }, [items]);

  const more = async () => {
    setLoadingMore(true);
    try {
      const res = await fetchInbox(PAGE, items.length);
      setItems((old) => [...old, ...res.items.filter((n) => !old.some((o) => o.id === n.id))]);
      setHasMore(res.items.length === PAGE);
    } finally {
      setLoadingMore(false);
    }
  };

  const openItem = (item: InboxItem) => {
    if (!item.read) {
      markOpened(item);
      setUnread((n) => Math.max(0, n - 1));
      setItems((list) => list.map((x) => (x.id === item.id ? { ...x, read: true } : x)));
    } else {
      trackInbox(item.id, "open");
    }
    setOpen({ ...item, read: true });
  };

  const follow = (item: InboxItem) => {
    if (!item.link) return;
    trackInbox(item.id, "click");
    setOpen(null);
    if (item.link.startsWith("/")) onClose?.();
    openInboxLink(item.link, navigate);
  };

  const readAll = async () => {
    await markAllInboxRead();
    setItems((list) => list.map((x) => ({ ...x, read: true })));
    setUnread(0);
    toast({ title: "All caught up", description: "Every notification is marked as read." });
  };

  const shown = filter === "unread" ? items.filter((i) => !i.read) : items;
  const groups = useMemo(() => {
    const out: { label: string; items: InboxItem[] }[] = [];
    shown.forEach((i) => {
      const label = groupOf(i.sent_at);
      const g = out.find((x) => x.label === label);
      if (g) g.items.push(i);
      else out.push({ label, items: [i] });
    });
    return out;
  }, [shown]);

  return (
    <div className={cn("bg-sc-bg font-sans text-sc-ink", panel ? "flex h-full flex-col" : "min-h-screen pb-32")}>
      <header className={cn("z-20 bg-sc-bg/95 px-5 pb-3 backdrop-blur-xl", panel ? "shrink-0 pt-2" : "sticky top-0 pt-[max(env(safe-area-inset-top),1rem)]")}>
        {panel ? (
          <>
            <span aria-hidden="true" className="mx-auto mb-3 block h-1.5 w-11 rounded-full bg-black/15" />
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <h2 className="m-0 truncate text-[24px] font-extrabold leading-8 tracking-[-0.03em]">Notifications</h2>
              </div>
              <div className="flex shrink-0 gap-2">
                {!signedOut && <IconButton icon={CheckCheck} label="Mark all as read" onClick={() => (unread ? setConfirmAll(true) : toast({ title: "Nothing unread" }))} />}
                <IconButton icon={Settings2} label="Notification settings" onClick={() => { onClose?.(); navigate("/profile/notifications"); }} />
                <IconButton icon={X} label="Close" onClick={onClose} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex min-h-11 items-center justify-between pt-3">
              <BackButton />
              <div className="flex gap-2">
                <IconButton icon={CheckCheck} label="Mark all as read" onClick={() => (unread ? setConfirmAll(true) : toast({ title: "Nothing unread" }))} />
                <IconButton icon={Settings2} label="Notification settings" onClick={() => navigate("/profile/notifications")} />
              </div>
            </div>
            <div className="mt-3.5 flex items-end justify-between gap-3">
              <h1 className="m-0 text-[32px] font-extrabold leading-[38px] tracking-[-0.03em]">Notifications</h1>
              {unread > 0 && (
                <span className="mb-1.5 inline-flex h-7 items-center rounded-full bg-sc-ink px-3 text-xs font-extrabold text-white">{unread} new</span>
              )}
            </div>
          </>
        )}
        {!signedOut && <div className="mt-4">
          <Segmented
            value={filter}
            onChange={(v) => setFilter(v as "all" | "unread")}
            options={[
              { value: "all", label: "All" },
              { value: "unread", label: unread ? `Unread (${unread})` : "Unread" },
            ]}
          />
        </div>}
      </header>

      <main className={cn("flex flex-col gap-5 px-5 pt-2", panel && "min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(env(safe-area-inset-bottom),1.5rem)]")}>
        {signedOut ? (
          <div className="mt-4 rounded-[28px] bg-white py-6">
            <EmptyState icon={BellRing} title="Sign in to see notifications" subtitle="Match updates, offers and news from SportCliq show up here."
              action={<div className="mt-2 w-full max-w-[220px]"><ScButton icon={LogIn} size="md" onClick={() => { onClose?.(); navigate("/auth"); }}>Sign in</ScButton></div>} />
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-2.5">{[0, 1, 2, 3].map((i) => <RowSkeleton key={i} />)}</div>
        ) : shown.length === 0 ? (
          <div className="mt-6 rounded-[28px] bg-white py-6">
            {filter === "unread" ? (
              <EmptyState icon={CheckCheck} sport="football" title="You are all caught up" subtitle="New updates from SportCliq will show up here." />
            ) : (
              <EmptyState icon={BellOff} title="No notifications yet" subtitle="Match updates, offers and news from SportCliq will land here." />
            )}
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.label} className="flex flex-col gap-2.5">
              <h2 className="m-0 px-1 text-[13px] font-bold uppercase tracking-[0.06em] text-sc-ink3">{g.label}</h2>
              {g.items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openItem(n)}
                  className={cn(
                    "relative flex w-full gap-3 rounded-[22px] p-4 text-left shadow-card transition-transform active:scale-[0.99]",
                    n.read ? "bg-white" : "bg-[#EEF8F0]"
                  )}
                >
                  <span className="relative shrink-0">
                    <img src="/brand/sportcliq-mark.png" alt="" className="h-11 w-11 rounded-2xl" />
                    {!n.read && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-sc-green" aria-label="Unread" />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-start justify-between gap-2">
                      <span className={cn("truncate text-[15px]", n.read ? "font-bold" : "font-extrabold")}>{n.title || "SportCliq"}</span>
                      <span className="shrink-0 pt-0.5 text-xs font-semibold text-sc-ink3">{ago(n.sent_at)}</span>
                    </span>
                    <span className="line-clamp-2 text-[13.5px] leading-[19px] text-sc-ink2">{n.message}</span>
                    {n.link && (
                      <span className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-bold text-sc-green-dark">
                        View <ArrowUpRight size={14} strokeWidth={2.4} />
                      </span>
                    )}
                  </span>
                  {n.image_url && <img src={n.image_url} alt="" loading="lazy" className="h-14 w-14 shrink-0 self-center rounded-2xl object-cover" />}
                </button>
              ))}
            </section>
          ))
        )}

        {!loading && hasMore && filter === "all" && (
          <ScButton kind="white" size="md" onClick={more} disabled={loadingMore}>
            {loadingMore ? "Loading" : "Load older notifications"}
          </ScButton>
        )}
      </main>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="gap-0 p-0 overflow-hidden">
          {open && (
            <>
              {open.image_url ? (
                <img src={open.image_url} alt="" className="aspect-[16/9] w-full object-cover" />
              ) : (
                <div className="flex items-center gap-3 bg-[#EEF8F0] px-6 py-5 pr-16">
                  <img src="/brand/sportcliq-mark.png" alt="" className="h-10 w-10 rounded-xl" />
                  <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-sc-green-dark">
                    <BellRing size={14} /> From SportCliq
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-2 p-6">
                <span className="text-xs font-semibold text-sc-ink3">{format(new Date(open.sent_at), "EEEE d MMMM, h:mm a")}</span>
                <DialogTitle className="text-[22px] font-extrabold leading-7 tracking-[-0.02em]">{open.title || "SportCliq"}</DialogTitle>
                <DialogDescription className="whitespace-pre-line text-[15px] leading-[23px] text-sc-ink2">{open.message}</DialogDescription>
                <div className="mt-4 flex flex-col gap-2">
                  {open.link && <ScButton icon={ArrowUpRight} onClick={() => follow(open)}>Open</ScButton>}
                  <ScButton kind="soft" size="md" onClick={() => setOpen(null)}>Close</ScButton>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={confirmAll}
        onOpenChange={setConfirmAll}
        icon={CheckCheck}
        title="Mark all as read?"
        description="Every notification in your list will be marked as read."
        confirmLabel="Mark all read"
        onConfirm={readAll}
      />

      {!panel && <Navbar />}
    </div>
  );
}

const Inbox = () => <InboxView mode="page" />;

export default Inbox;
