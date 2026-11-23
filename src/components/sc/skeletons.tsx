// Skeleton loaders shaped like the real screens, so content swaps in without a jump.
import { cn } from "@/lib/utils";

export const Skel = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <span aria-hidden="true" className={cn("sc-skel block rounded-xl", className)} style={style} />
);

const Busy = ({ children, label = "Loading" }: { children: React.ReactNode; label?: string }) => (
  <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-3.5">
    <span className="sr-only">{label}</span>
    {children}
  </div>
);

/** Match, ride or booking cards with a date block. */
export const EventCardSkeleton = () => (
  <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-3.5">
    <div className="flex gap-3.5 items-center">
      <Skel className="w-[60px] h-[66px] rounded-[18px]" />
      <div className="flex-1 flex flex-col gap-2">
        <Skel className="h-[18px] w-3/4" />
        <Skel className="h-3 w-1/2" />
      </div>
    </div>
    <Skel className="h-3.5 w-2/3" />
    <div className="flex gap-1.5">
      <Skel className="h-6 w-20 rounded-full" />
      <Skel className="h-6 w-16 rounded-full" />
    </div>
    <Skel className="h-2 w-full rounded-full" />
    <div className="flex justify-between items-center pt-1">
      <div className="flex items-center gap-2.5">
        <Skel className="w-[34px] h-[34px] rounded-full" />
        <Skel className="h-3 w-24" />
      </div>
      <Skel className="h-10 w-20 rounded-full" />
    </div>
  </div>
);

export const EventListSkeleton = ({ count = 3, label }: { count?: number; label?: string }) => (
  <Busy label={label}>
    {Array.from({ length: count }).map((_, i) => (
      <EventCardSkeleton key={i} />
    ))}
  </Busy>
);

/** Venue cards with a photo area. */
export const VenueListSkeleton = ({ count = 2 }: { count?: number }) => (
  <Busy label="Loading venues">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white rounded-[26px] overflow-hidden">
        <Skel className="h-[150px] rounded-none" />
        <div className="p-4 flex flex-col gap-2.5">
          <Skel className="h-[18px] w-2/3" />
          <Skel className="h-3 w-1/2" />
          <div className="flex gap-1.5">
            <Skel className="h-6 w-14 rounded-full" />
            <Skel className="h-6 w-20 rounded-full" />
          </div>
        </div>
      </div>
    ))}
  </Busy>
);

/** Rows inside a white group, like profile or bookings lists. */
export const RowsSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <Busy>
    <div className="bg-white rounded-[22px] px-4 py-1 divide-y divide-sc-line">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skel className="w-[42px] h-[42px] rounded-full" />
          <div className="flex-1 flex flex-col gap-2">
            <Skel className="h-3.5 w-2/3" />
            <Skel className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  </Busy>
);

/** Detail pages: hero, fact tiles and two cards. */
export const DetailSkeleton = () => (
  <div role="status" aria-busy="true" className="min-h-screen bg-sc-bg">
    <span className="sr-only">Loading</span>
    <Skel className="h-[300px] rounded-none rounded-b-[36px]" />
    <div className="px-5 pt-[18px] flex flex-col gap-3.5">
      <Skel className="h-8 w-3/4" />
      <div className="flex gap-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 bg-white rounded-[20px] p-3.5 flex flex-col gap-2">
            <Skel className="w-[34px] h-[34px] rounded-full" />
            <Skel className="h-3 w-1/2" />
            <Skel className="h-4 w-3/4" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-3">
        <Skel className="h-4 w-1/3" />
        <Skel className="h-2.5 w-full rounded-full" />
        <div className="flex">
          {[0, 1, 2, 3].map((i) => (
            <Skel key={i} className="w-[34px] h-[34px] rounded-full border-[3px] border-white" style={{ marginLeft: i ? -10 : 0 }} />
          ))}
        </div>
      </div>
      <div className="bg-white rounded-3xl p-[18px] flex items-center gap-3">
        <Skel className="w-[52px] h-[52px] rounded-2xl" />
        <div className="flex-1 flex flex-col gap-2">
          <Skel className="h-4 w-1/2" />
          <Skel className="h-3 w-1/3" />
        </div>
      </div>
    </div>
  </div>
);

/** Horizontal cards on Home. */
export const HomeRailSkeleton = () => (
  <div aria-hidden="true" className="flex gap-3 px-5 overflow-hidden">
    {[0, 1].map((i) => (
      <div key={i} className="shrink-0 w-[250px] bg-white rounded-[26px] p-4 flex flex-col gap-3">
        <Skel className="h-24 rounded-[18px]" />
        <Skel className="h-4 w-3/4" />
        <Skel className="h-3 w-2/3" />
        <Skel className="h-11 rounded-full" />
      </div>
    ))}
  </div>
);

export const BadgesSkeleton = () => (
  <Busy label="Loading badges">
    <Skel className="h-7 w-1/2" />
    <Skel className="h-2.5 w-full rounded-full" />
    <div className="grid grid-cols-2 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-3xl p-4 flex flex-col items-center gap-2.5">
          <Skel className="w-[72px] h-[72px] rounded-full" />
          <Skel className="h-3.5 w-2/3" />
          <Skel className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  </Busy>
);

/** Generic page: header block and a couple of cards. Used where a page waits for its first load. */
export const PageSkeleton = () => (
  <div role="status" aria-busy="true" className="min-h-screen bg-sc-bg px-5 pt-16 flex flex-col gap-4">
    <span className="sr-only">Loading</span>
    <Skel className="h-9 w-1/2" />
    <Skel className="h-4 w-2/3" />
    <EventCardSkeleton />
    <EventCardSkeleton />
  </div>
);
