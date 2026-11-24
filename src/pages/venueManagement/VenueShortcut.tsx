import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getMyVenues } from "@/lib/myVenues";
import { RowsSkeleton } from "@/components/sc/skeletons";

/**
 * Profile shortcuts such as Bookings and Booking code open the matching tab of the
 * venue manager. With more than one venue, or none yet, the venue list opens instead.
 */
export default function VenueShortcut({ tab }: { tab: "bookings" | "codes" | "payouts" | "overview" }) {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid) return navigate("/auth", { replace: true });
      const venues = await getMyVenues(uid).catch(() => []);
      if (venues.length === 1) navigate(`/venuemanager/dashboard/${venues[0].id}?tab=${tab}`, { replace: true });
      else navigate("/profile/my-venue", { replace: true });
    })();
  }, [navigate, tab]);
  return (
    <div className="min-h-screen bg-sc-bg px-5 pt-16">
      <RowsSkeleton />
    </div>
  );
}
