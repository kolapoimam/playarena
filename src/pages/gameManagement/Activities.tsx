import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bike,
  BookOpen,
  CalendarDays,
  CircleDot,
  Dribbble,
  Footprints,
  Plus,
  Route,
  Store,
  Target,
  Trophy,
  Volleyball,
  LucideIcon,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Seo } from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { HorseIcon, PadelIcon } from "@/components/sc/sportIcons";
import { useAppMode } from "@/lib/appMode";
import { Bubble, ListGroup, ListRow, PageHeader, Pill, Screen, SPORT, Sport, formatShortDate, formatTime12 } from "@/components/sc/ui";

const META_KEYWORDS = "Football in Nigeria, Sports in Nigeria, Play Sports Near You, Football Fields Near Me, Livescore, Osimhen, Asisat Oshola, Nigeria Startup, Sportstech, Football venues in Lagos, Football venues in Ilorin, Sports Betting in Nigeria, Organize sports in Nigeria, Football Matches, Bicycle Training in Nigeria, Cycling in Nigeria, Nigerian football, Nigerian cycling, Nigerian sports, Play football in Lagos, Play football in Ilorin, Play football in Abuja, Play football in Nigeria, Play cycling in Nigeria, Play sports in Nigeria, Nigerian sports tech, Nigerian sports startup, Nigerian sports community, Football events Nigeria, Cycling events Nigeria, Sport Cliq, SportCliq, sportcliq.com.ng, sportcliq.ng, sportcliq, sport cliq, sportcliq app, sportcliq platform, sportcliq football, sportcliq cycling, sportcliq venues, sportcliq matches, sportcliq events, sportcliq sports, sportcliq nigeria, sportcliq lagos, sportcliq ilorin, sportcliq abuja, sportcliq startup, sportcliq tech, sportcliq community, sportcliq platform, sportcliq app, sportcliq website, sportcliq online, sportcliq booking, sportcliq organize, sportcliq join, sportcliq play, sportcliq find, sportcliq search, sportcliq discover, sportcliq connect, sportcliq join match, sportcliq join cycling, sportcliq join event, sportcliq join venue, sportcliq join football, sportcliq join sports, sportcliq join nigeria, sportcliq join lagos, sportcliq join ilorin, sportcliq join abuja, sportcliq join startup, sportcliq join tech, sportcliq join community, sportcliq join platform, sportcliq join app, sportcliq join website, sportcliq join online, sportcliq join booking, sportcliq join organize, sportcliq join play, sportcliq join find, sportcliq join search, sportcliq join discover, sportcliq join connect";

type SportItem = { name: string; icon: LucideIcon; sport: Sport; active: boolean; route?: string; sub?: string };

const sports: SportItem[] = [
  { name: "Football", icon: Trophy, sport: "football", active: true, route: "/matches", sub: "Matches near you" },
  { name: "Cycling", icon: Bike, sport: "cycling", active: true, route: "/cycling-activities", sub: "Group rides" },
  { name: "Tennis", icon: CircleDot, sport: "tennis", active: false },
  { name: "Basketball", icon: Dribbble, sport: "cycling", active: false },
  { name: "Volleyball", icon: Volleyball, sport: "guide", active: false },
  { name: "Running", icon: Footprints, sport: "red", active: false },
  { name: "Ping Pong", icon: CircleDot, sport: "venue", active: false },
  { name: "Walking", icon: Footprints, sport: "money", active: false },
  { name: "Horse Riding", icon: HorseIcon, sport: "pink", active: false },
  { name: "Padel", icon: PadelIcon, sport: "tennis", active: false },
  { name: "Paintball", icon: Target, sport: "red", active: false },
];

type Upcoming = { key: string; kind: "organised" | "joined" | "hosted"; title: string; date: string; time?: string | null; to: string; tag?: string };

const Activities = () => {
  const navigate = useNavigate();
  const [upcoming, setUpcoming] = useState<Upcoming[]>([]);
  const appMode = useAppMode();
  const modeName = { football: "Football", cycling: "Cycling", horse_riding: "Horse Riding", paintball: "Paintball" }[appMode];
  // The preferred sport leads, live sports stay ahead of the ones coming soon
  const ordered = [...sports].sort((a, b) => Number(b.name === modeName && b.active) - Number(a.name === modeName && a.active) || Number(b.active) - Number(a.active));

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) return;
      const today = new Date().toISOString().split("T")[0];
      const items: Upcoming[] = [];
      try {
        const [{ data: org }, { data: joined }, { data: hosted }] = await Promise.all([
          supabase
          .from("user_organized_matches")
          .select("matches(id, title, slug, match_date, match_time, total_slots, total_registered_players)")
          .eq("user_id", userId)
          .limit(10),
          supabase
          .from("user_joined_matches")
          .select("matches(id, title, slug, match_date, match_time)")
          .eq("user_id", userId)
          .limit(10),
          supabase
          .from("user_hosted_cycling")
          .select("cycling_event:cycling_events(id_uuid, slug, title, event_date, start_time)")
          .eq("user_id", userId),
        ]);
        (org || []).forEach((r: any) => {
          const m = r.matches;
          if (m && m.match_date >= today)
            items.push({
              key: "o" + m.id,
              kind: "organised",
              title: m.title,
              date: m.match_date,
              time: m.match_time,
              to: `/match/${m.slug}`,
              tag: m.total_slots ? `${m.total_registered_players ?? 0}/${m.total_slots}` : undefined,
            });
        });
        (joined || []).forEach((r: any) => {
          const m = r.matches;
          if (m && m.match_date >= today && !items.some((i) => i.key === "o" + m.id))
            items.push({ key: "j" + m.id, kind: "joined", title: m.title, date: m.match_date, time: m.match_time, to: `/match/${m.slug}` });
        });
        (hosted || []).forEach((r: any) => {
          const e = r.cycling_event;
          if (e && e.event_date >= today)
            items.push({ key: "h" + e.id_uuid, kind: "hosted", title: e.title, date: e.event_date, time: e.start_time, to: `/cycling/${e.slug}` });
        });
      } catch (err) {
        console.error("Error loading activities:", err);
      }
      items.sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
      setUpcoming(items.slice(0, 5));
    };
    load();
  }, []);


  const kindLabel = { organised: "You organise", joined: "You joined", hosted: "You host" };

  return (
    <>
      <Seo
        title="Activities | Sport Cliq"
        description="Explore and join a variety of sports activities including football, cycling, basketball, and more on Sport Cliq. Football in Nigeria, Play Sports Near You, Football Fields Near Me, Livescore, Osimhen, Asisat Oshola, Nigeria Startup, Sportstech."
        url={window.location.href}
        image={undefined}
        children={<meta name="keywords" content={META_KEYWORDS} />}
      />
      <Screen>
        <PageHeader title="Activities" subtitle="Everything you play, host and book" />

        <main className="px-5 pt-[18px] flex flex-col gap-5">

          <div className="flex flex-col gap-2.5">
            <span className="text-[13px] font-bold text-sc-ink2">Sports</span>
            <div className="grid grid-cols-2 gap-2.5">
              {ordered.map((s) => {
                const c = SPORT[s.sport];
                const Icon = s.icon;
                if (s.active) {
                  return (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => s.route && navigate(s.route)}
                      className="relative overflow-hidden h-[150px] rounded-3xl p-3.5 flex flex-col justify-between items-start text-left active:scale-[0.98] transition-transform"
                      style={{ background: c.solid, color: c.onSolid }}
                    >
                      <Icon aria-hidden="true" className="absolute opacity-25" size={110} strokeWidth={1.3} style={{ right: -20, bottom: -24 }} />
                      <span className="w-11 h-11 rounded-full bg-white/30 flex items-center justify-center">
                        <Icon size={24} />
                      </span>
                      <span className="relative flex flex-col">
                        <span className="text-xl font-extrabold">{s.name}</span>
                        <span className="text-xs font-bold opacity-85">{s.sub}</span>
                      </span>
                    </button>
                  );
                }
                return (
                  <div key={s.name} className="h-[84px] rounded-3xl bg-white p-3.5 flex items-center gap-2.5">
                    <Bubble icon={Icon} sport={s.sport} size={40} />
                    <span className="flex flex-col min-w-0">
                      <span className="text-[15px] font-extrabold leading-tight line-clamp-2">{s.name}</span>
                      <span className="text-xs font-bold text-sc-ink3">Coming soon</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {upcoming.length > 0 && (
            <ListGroup title="Your upcoming activities">
              {upcoming.map((u) => (
                <ListRow
                  key={u.key}
                  icon={u.kind === "hosted" ? Bike : Trophy}
                  sport={u.kind === "hosted" ? "cycling" : "football"}
                  title={u.title}
                  subtitle={`${kindLabel[u.kind]} · ${formatShortDate(u.date)}${u.time ? `, ${formatTime12(u.time)}` : ""}`}
                  right={u.tag ? <Pill sport="football">{u.tag}</Pill> : undefined}
                  onClick={() => navigate(u.to)}
                />
              ))}
            </ListGroup>
          )}

          <button
            type="button"
            onClick={() => navigate("/guides")}
            className="rounded-3xl p-[18px] flex items-center gap-3.5 text-left text-white active:scale-[0.99] transition-transform"
            style={{ background: SPORT.guide.solid }}
          >
            <BookOpen size={28} />
            <span className="flex-1 flex flex-col">
              <span className="text-[17px] font-extrabold">Guides and rules</span>
              <span className="text-[13px] font-semibold opacity-90">Learn to organise, host and play</span>
            </span>
            <ArrowRight size={22} />
          </button>
        </main>

        <Navbar />
      </Screen>
    </>
  );
};

export default Activities;
