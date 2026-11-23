// Location helpers. We only keep the user's state (no coordinates are stored or sent anywhere).
// The device location is matched to the nearest Nigerian state capital on the device itself.

export const NIGERIAN_STATES: { name: string; lat: number; lng: number }[] = [
  { name: "Abia", lat: 5.5249, lng: 7.4942 },
  { name: "Adamawa", lat: 9.2035, lng: 12.4954 },
  { name: "Akwa Ibom", lat: 5.0377, lng: 7.9128 },
  { name: "Anambra", lat: 6.2104, lng: 7.0699 },
  { name: "Bauchi", lat: 10.3158, lng: 9.8442 },
  { name: "Bayelsa", lat: 4.9267, lng: 6.2676 },
  { name: "Benue", lat: 7.7337, lng: 8.5214 },
  { name: "Borno", lat: 11.8333, lng: 13.15 },
  { name: "Cross River", lat: 4.9757, lng: 8.3417 },
  { name: "Delta", lat: 6.198, lng: 6.7319 },
  { name: "Ebonyi", lat: 6.3249, lng: 8.1137 },
  { name: "Edo", lat: 6.335, lng: 5.6037 },
  { name: "Ekiti", lat: 7.621, lng: 5.2215 },
  { name: "Enugu", lat: 6.4584, lng: 7.5464 },
  { name: "FCT", lat: 9.0765, lng: 7.3986 },
  { name: "Gombe", lat: 10.2897, lng: 11.1673 },
  { name: "Imo", lat: 5.4836, lng: 7.0333 },
  { name: "Jigawa", lat: 11.7564, lng: 9.3384 },
  { name: "Kaduna", lat: 10.5105, lng: 7.4165 },
  { name: "Kano", lat: 12.0022, lng: 8.592 },
  { name: "Katsina", lat: 12.9908, lng: 7.6018 },
  { name: "Kebbi", lat: 12.4539, lng: 4.1975 },
  { name: "Kogi", lat: 7.8023, lng: 6.7333 },
  { name: "Kwara", lat: 8.4966, lng: 4.5421 },
  { name: "Lagos", lat: 6.5244, lng: 3.3792 },
  { name: "Nasarawa", lat: 8.5378, lng: 8.3206 },
  { name: "Niger", lat: 9.6139, lng: 6.5569 },
  { name: "Ogun", lat: 7.1475, lng: 3.3619 },
  { name: "Ondo", lat: 7.2571, lng: 5.2058 },
  { name: "Osun", lat: 7.7827, lng: 4.5418 },
  { name: "Oyo", lat: 7.3775, lng: 3.947 },
  { name: "Plateau", lat: 9.8965, lng: 8.8583 },
  { name: "Rivers", lat: 4.8156, lng: 7.0498 },
  { name: "Sokoto", lat: 13.0059, lng: 5.2476 },
  { name: "Taraba", lat: 8.8937, lng: 11.3596 },
  { name: "Yobe", lat: 11.7469, lng: 11.9608 },
  { name: "Zamfara", lat: 12.1704, lng: 6.6641 },
];

const KEY = "sc_user_state";
export const LOCATION_EVENT = "sc-location-change";

export const getSavedState = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const saveState = (state: string | null) => {
  try {
    if (state) localStorage.setItem(KEY, state);
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(LOCATION_EVENT, { detail: state }));
};

export const nearestState = (lat: number, lng: number): string => {
  let best = NIGERIAN_STATES[0];
  let bestD = Infinity;
  for (const s of NIGERIAN_STATES) {
    const d = (s.lat - lat) ** 2 + ((s.lng - lng) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best.name;
};

/** Ask the browser for the user's position and save the nearest state. */
export const detectState = (): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Location is not supported on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const state = nearestState(pos.coords.latitude, pos.coords.longitude);
        saveState(state);
        resolve(state);
      },
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Location permission was denied. You can pick your state instead."
              : "We couldn't get your location. You can pick your state instead."
          )
        ),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 }
    );
  });

/** True when a stored state name matches (case insensitive, ignores "State" suffix). */
export const sameState = (a?: string | null, b?: string | null) => {
  const n = (x?: string | null) => (x || "").toLowerCase().replace(/\s*state$/, "").replace("federal capital territory", "fct").trim();
  return !!a && !!b && n(a) === n(b);
};
