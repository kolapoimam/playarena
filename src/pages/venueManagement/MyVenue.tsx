import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronRight, KeyRound, Loader2, MapPin, Plus, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Bubble, Cover, ListGroup, ListRow, PageHeader, Screen } from "@/components/sc/ui";
import { RowsSkeleton } from "@/components/sc/skeletons";
import { getMyVenues, linkVenueWithPin, type MyVenue as Venue } from "@/lib/myVenues";

const MyVenue = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const id = data.session?.user?.id;
      if (!id) {
        navigate("/auth", { replace: true });
        return;
      }
      setUserId(id);
      try {
        setVenues(await getMyVenues(id));
      } catch (e) {
        console.error("Loading venues failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const link = async () => {
    if (!userId) return;
    if (!/^[a-zA-Z0-9]{6}$/.test(code.trim())) {
      setError("The access code has 6 letters or numbers.");
      return;
    }
    setLinking(true);
    setError(null);
    try {
      const res = await linkVenueWithPin(userId, code);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      toast({ title: res.already ? "Already yours" : "Venue linked", description: res.already ? `${res.venue.name} is already linked to your account.` : `You now manage ${res.venue.name}.` });
      setCode("");
      navigate(`/venuemanager/dashboard/${res.venue.id}`);
    } finally {
      setLinking(false);
    }
  };

  return (
    <Screen>
      <PageHeader back backTo="/profile" title="My venues" subtitle="Manage bookings, payouts and access codes for venues you run." />

      <main className="px-5 pt-5 flex flex-col gap-5">
        {loading ? (
          <RowsSkeleton />
        ) : (
          venues.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {venues.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => navigate(`/venuemanager/dashboard/${v.id}`)}
                  className="w-full bg-white rounded-[24px] p-3 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
                >
                  <span className="relative w-[64px] h-[64px] rounded-[18px] overflow-hidden shrink-0">
                    <Cover src={v.image_urls?.[0]} kind="venue" alt={v.name} />
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col gap-1">
                    <span className="text-[16px] font-extrabold truncate">{v.name}</span>
                    <span className="text-[13px] text-sc-ink3 truncate inline-flex items-center gap-1">
                      <MapPin size={13} className="shrink-0" /> {[v.city, v.state].filter(Boolean).join(", ") || "Location not set"}
                    </span>
                    {v.is_verified && (
                      <span className="text-[12px] font-bold text-sc-green inline-flex items-center gap-1"><CheckCircle2 size={13} /> Verified</span>
                    )}
                  </span>
                  <ChevronRight size={18} className="text-[#9AA19C] shrink-0" />
                </button>
              ))}
            </div>
          )
        )}

        <div className="bg-white rounded-[24px] p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Bubble icon={KeyRound} sport="venue" size={42} />
            <span className="flex flex-col min-w-0">
              <span className="text-[16px] font-extrabold">{venues.length ? "Link another venue" : "Link your venue"}</span>
              <span className="text-[13px] text-sc-ink3">Enter the 6 character access code SportCliq gave you.</span>
            </span>
          </div>
          <div className="flex gap-2 min-w-0">
            <input
              value={code}
              onChange={(e) => { setError(null); setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()); }}
              onKeyDown={(e) => e.key === "Enter" && link()}
              placeholder="ABC123"
              autoCapitalize="characters"
              autoComplete="off"
              aria-label="Access code"
              className="flex-1 min-w-0 h-12 rounded-2xl bg-sc-bg px-4 text-[18px] font-extrabold tracking-[0.25em] uppercase outline-none border border-transparent focus:bg-white focus:border-sc-ink/20 placeholder:text-sc-ink3/50 placeholder:tracking-[0.25em]"
            />
            <button
              type="button"
              onClick={link}
              disabled={linking || code.length < 6}
              className="h-12 px-5 rounded-2xl bg-sc-ink text-white font-bold inline-flex items-center gap-2 disabled:opacity-40 shrink-0"
            >
              {linking ? <Loader2 size={18} className="animate-spin" /> : "Link"}
            </button>
          </div>
          {error && <p className="m-0 text-[13px] font-semibold text-[#B91C1C]">{error}</p>}
        </div>

        <ListGroup title="New venue">
          <ListRow icon={Plus} sport="venue" title="List a new venue" subtitle="Add your pitch so players can book it" onClick={() => navigate("/venue-create")} />
          <ListRow icon={Store} sport="gray" title="Browse venues" subtitle="See how venues show to players" onClick={() => navigate("/venues")} />
        </ListGroup>
      </main>
      <Navbar />
    </Screen>
  );
};

export default MyVenue;
