import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CalendarDays, CheckCircle2, Clock, ExternalLink, Store, TrendingUp, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import VenueWallet from "@/components/venueManagement/VenueWallet";
import VenueAccessCode from "@/components/venueManagement/VenueAccessCode";
import VenueCalendar, { BookingRow, type VenueBooking } from "@/components/venueManagement/VenueCalendar";
import { BackButton, Bubble, Cover, FunEmpty, IconButton, Segmented, formatNaira, formatNairaExact } from "@/components/sc/ui";
import { RowsSkeleton } from "@/components/sc/skeletons";
import { canManageVenue } from "@/lib/myVenues";

type Tab = "overview" | "bookings" | "payouts" | "codes";
type Venue = { id: string; name: string; slug: string; city: string | null; state: string | null; image_urls: string[] | null; is_verified: boolean | null };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hoursOf = (b: VenueBooking) => {
  const t = (x?: string | null) => {
    if (!x) return null;
    const m = x.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!m) return null;
    let h = Number(m[1]) % (m[3] ? 12 : 24);
    if (m[3]?.toUpperCase() === "PM") h += 12;
    return h + Number(m[2]) / 60;
  };
  const s = t(b.start_time), e = t(b.end_time);
  return s != null && e != null && e > s ? e - s : 0;
};

const VenueManagerDashboard = () => {
  const { venueId } = useParams<{ venueId: string }>();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "overview";
  const setTab = (t: Tab) => setParams((p) => { p.set("tab", t); return p; }, { replace: true });
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [bookings, setBookings] = useState<VenueBooking[]>([]);
  const [paidOut, setPaidOut] = useState(0);
  const [availableFunds, setAvailableFunds] = useState(0);
  const [verifiedSince, setVerifiedSince] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!venueId) return navigate("/profile/my-venue", { replace: true });
      setLoading(true);
      try {
        const { data: s } = await supabase.auth.getSession();
        const uid = s.session?.user?.id;
        if (!uid) return navigate("/auth", { replace: true });
        if (!(await canManageVenue(uid, venueId))) {
          toast({ title: "Not your venue", description: "Link this venue with its access code first.", variant: "destructive" });
          return navigate("/profile/my-venue", { replace: true });
        }
        const [v, b, c, pin] = await Promise.all([
          supabase.from("venues").select("id, name, slug, city, state, image_urls, is_verified").eq("id", venueId).limit(1),
          supabase
            .from("bookings")
            .select("id, match_id, title, match_date, start_time, end_time, organizer_name, amount, payment_status, created_at, matches(slug, is_recurring, recurring_frequency, recurring_occurrences)")
            .eq("venue_id", venueId)
            .order("match_date", { ascending: false })
            .limit(500),
          supabase.from("venue_booking_cashout").select("amount, status").eq("venue_id", venueId).in("status", ["Review", "Processed", "Successful"]),
          supabase.from("access_pins").select("created_at, updated_at").eq("venue_id", venueId).eq("verified", "true").limit(1),
        ]);
        const venueRow = ((v.data as any[]) || [])[0];
        if (v.error || !venueRow) throw new Error("We could not load this venue.");
        setVenue(venueRow as Venue);
        const rows: VenueBooking[] = ((b.data as any[]) || []).map((r) => ({
          ...r,
          slug: r.matches?.slug ?? null,
          is_recurring: r.matches?.is_recurring ?? false,
          recurring_frequency: r.matches?.recurring_frequency ?? null,
          recurring_occurrences: r.matches?.recurring_occurrences ?? null,
        }));
        setBookings(rows);
        const earned = rows.filter((r) => (r.payment_status || "").toLowerCase() === "paid").reduce((s2, r) => s2 + (Number(r.amount) || 0), 0);
        const out = ((c.data as any[]) || []).reduce((s2, r) => s2 + (Number(r.amount) || 0), 0);
        setPaidOut(out);
        setAvailableFunds(Math.max(0, earned - out));
        const p = ((pin.data as any[]) || [])[0];
        setVerifiedSince(p?.updated_at || p?.created_at || null);
      } catch (e: any) {
        console.error("Venue dashboard", e);
        toast({ title: "Could not load venue", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [venueId, navigate, toast]);

  const stats = useMemo(() => {
    const today = iso(new Date());
    const paid = bookings.filter((b) => (b.payment_status || "").toLowerCase() === "paid");
    const earned = paid.reduce((s, b) => s + (Number(b.amount) || 0), 0);
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const inMonth = bookings.filter((b) => (b.match_date || "").startsWith(key));
      return {
        label: d.toLocaleDateString("en-GB", { month: "short" }),
        amount: inMonth.filter((b) => (b.payment_status || "").toLowerCase() === "paid").reduce((s, b) => s + (Number(b.amount) || 0), 0),
        count: inMonth.length,
      };
    });
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, i) => ({
      label,
      count: bookings.filter((b) => b.match_date && (new Date(`${b.match_date}T00:00:00`).getDay() + 6) % 7 === i).length,
    }));
    const upcoming = bookings
      .filter((b) => (b.match_date || "") >= today)
      .sort((a, b) => ((a.match_date || "") + (a.start_time || "")).localeCompare((b.match_date || "") + (b.start_time || "")));
    return {
      earned,
      thisMonth: months[5].amount,
      count: bookings.length,
      hours: Math.round(bookings.reduce((s, b) => s + hoursOf(b), 0)),
      months,
      days,
      upcoming,
    };
  }, [bookings]);

  const maxMonth = Math.max(1, ...stats.months.map((m) => m.amount));
  const maxDay = Math.max(1, ...stats.days.map((d) => d.count));

  return (
    <div className="min-h-screen bg-sc-bg text-sc-ink font-sans pb-32">
      <header className="sticky top-0 z-30 bg-sc-bg/95 backdrop-blur-xl px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)]">
        <div className="pt-3 flex items-center justify-between gap-3">
          <BackButton to="/profile/my-venue" />
          <h1 className="m-0 flex-1 text-center text-[17px] font-extrabold truncate">{venue?.name || "Venue manager"}</h1>
          {venue ? <IconButton icon={ExternalLink} label="View public page" onClick={() => navigate(`/venue/${venue.slug}`)} /> : <div className="min-w-11" />}
        </div>
      </header>

      <main className="px-5 pt-1 flex flex-col gap-3.5">
        {loading ? (
          <RowsSkeleton />
        ) : !venue ? (
          <FunEmpty icon={Store} sport="venue" title="No venue here" body="Link your venue with its access code to manage it." primary={{ label: "My venues", onClick: () => navigate("/profile/my-venue") }} />
        ) : (
          <>
            <div className="relative h-[150px] rounded-[28px] overflow-hidden">
              <Cover src={venue.image_urls?.[0]} kind="venue" alt={venue.name} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute left-5 right-5 bottom-4 text-white flex items-end justify-between gap-3">
                <span className="flex flex-col min-w-0">
                  <span className="text-[11px] font-bold tracking-[0.12em] opacity-80 uppercase">{[venue.city, venue.state].filter(Boolean).join(", ") || "Your venue"}</span>
                  <span className="text-[22px] leading-7 font-extrabold tracking-[-0.02em] truncate">{venue.name}</span>
                </span>
                {(venue.is_verified || verifiedSince) && (
                  <span className="h-8 px-3 rounded-full bg-white text-sc-ink text-xs font-extrabold inline-flex items-center gap-1 shrink-0"><CheckCircle2 size={14} className="text-sc-green" /> Verified</span>
                )}
              </div>
            </div>

            <Segmented
              options={[{ value: "overview", label: "Overview" }, { value: "bookings", label: "Calendar" }, { value: "payouts", label: "Payouts" }, { value: "codes", label: "Codes" }]}
              value={tab}
              onChange={(v) => setTab(v as Tab)}
            />

            {tab === "overview" && (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { icon: Wallet, sport: "money" as const, label: "Earned in total", value: formatNairaExact(stats.earned) },
                    { icon: TrendingUp, sport: "football" as const, label: "Earned this month", value: formatNairaExact(stats.thisMonth) },
                    { icon: CalendarDays, sport: "venue" as const, label: "Bookings", value: stats.count.toLocaleString() },
                    { icon: Clock, sport: "guide" as const, label: "Hours booked", value: stats.hours.toLocaleString() },
                  ].map((f) => (
                    <div key={f.label} className="min-w-0 bg-white rounded-[20px] p-3.5 flex flex-col gap-2">
                      <Bubble icon={f.icon} sport={f.sport} size={32} />
                      <span className="text-[20px] font-extrabold tracking-[-0.02em] truncate">{f.value}</span>
                      <span className="text-xs font-semibold text-sc-ink3">{f.label}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-[24px] p-4 flex flex-col gap-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[16px] font-extrabold">Earnings</span>
                    <span className="text-[12px] font-semibold text-sc-ink3">Last 6 months</span>
                  </div>
                  <div className="h-[140px] flex items-end gap-2">
                    {stats.months.map((m, i) => (
                      <div key={m.label + i} className="flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-1.5">
                        <span className="text-[10px] font-bold text-sc-ink3 truncate max-w-full">{m.amount ? formatNaira(m.amount) : ""}</span>
                        <span className="w-full rounded-t-[10px] rounded-b-[4px]" style={{ height: `${Math.max(4, (m.amount / maxMonth) * 100)}%`, background: i === 5 ? "#8B5CF6" : "#DDD6FE" }} />
                        <span className={`text-[11px] font-bold ${i === 5 ? "text-sc-ink" : "text-sc-ink3"}`}>{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-[24px] p-4 flex flex-col gap-3">
                  <span className="text-[16px] font-extrabold">Busiest days</span>
                  <div className="flex flex-col gap-2">
                    {stats.days.map((d) => (
                      <div key={d.label} className="flex items-center gap-3">
                        <span className="w-9 text-[12px] font-bold text-sc-ink3">{d.label}</span>
                        <span className="flex-1 h-2.5 rounded-full bg-black/[0.05] overflow-hidden">
                          <span className="block h-full rounded-full bg-sport-venue" style={{ width: `${(d.count / maxDay) * 100}%` }} />
                        </span>
                        <span className="w-6 text-right text-[12px] font-bold">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-[24px] px-4 pt-4 pb-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[16px] font-extrabold">Coming up</span>
                    <button type="button" onClick={() => setTab("bookings")} className="text-[13px] font-bold text-sport-venue-fg">Calendar</button>
                  </div>
                  {stats.upcoming.length ? (
                    <div className="divide-y divide-sc-line">{stats.upcoming.slice(0, 3).map((b) => <BookingRow key={b.id} b={b} />)}</div>
                  ) : (
                    <p className="m-0 py-4 text-[14px] text-sc-ink3">No bookings coming up yet. Share your venue page so organisers can book.</p>
                  )}
                </div>
              </>
            )}

            {tab === "bookings" && <VenueCalendar bookings={bookings} />}

            {tab === "payouts" && (
              <>
                <VenueWallet venueId={venue.id} availableFunds={availableFunds} setAvailableFunds={setAvailableFunds} />
                <p className="m-0 px-1 text-[12.5px] text-sc-ink3">Paid out or in review so far {formatNairaExact(paidOut)}.</p>
              </>
            )}

            {tab === "codes" && <VenueAccessCode venueId={venue.id} />}
          </>
        )}
      </main>
      <Navbar />
    </div>
  );
};

export default VenueManagerDashboard;
