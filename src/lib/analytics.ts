/*
 * SportCliq analytics (Google Analytics 4)
 *
 * One place that loads gtag, sends page views on every route change and
 * tracks what people do in the app. Most tracking is automatic:
 *   clicks on buttons and links, form starts and submits (form_started, form_submitted), searches,
 *   scroll depth, shares, PWA install, errors, sign in and sign up,
 *   payments and every key write to Supabase (join match, host ride ...).
 *
 * Add data-track="name" to any element to give its click a clear label.
 * Call track("event_name", { ...params }) for anything custom.
 *
 * Privacy: we never send typed values, emails, phone numbers or names.
 * The only id we send is the Supabase user id, which is anonymous.
 */

type Params = Record<string, string | number | boolean | undefined | null>;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
    __scAnalytics?: boolean;
  }
}

export const GA_ID: string = import.meta.env.VITE_GA_ID || "G-73ZTXVB63Y";
const SITE = "app";
const DEBUG = import.meta.env.DEV;

let ready = false;

export function initAnalytics() {
  if (typeof window === "undefined" || window.__scAnalytics) return;
  window.__scAnalytics = true;

  window.dataLayer = window.dataLayer || [];
  // gtag must push the arguments object, not an array
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);

  window.gtag("js", new Date());
  window.gtag("set", { site: SITE });
  window.gtag("config", GA_ID, {
    send_page_view: false, // we send page views ourselves on route changes
    cookie_flags: "SameSite=None;Secure",
    debug_mode: DEBUG || undefined,
  });
  ready = true;

  autoTrack();
}

export function track(name: string, params: Params = {}) {
  if (!ready || typeof window.gtag !== "function") return;
  const clean: Params = {};
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") clean[k] = v;
  window.gtag("event", name, clean);
  if (DEBUG) console.debug("[analytics]", name, clean);
}

let lastPath = "";
export function pageview(path: string) {
  if (path === lastPath) return;
  lastPath = path;
  scrollMarks.clear();
  // give the page a moment to set its title
  setTimeout(() => {
    track("page_view", {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
      page_type: pageType(path),
    });
  }, 50);
}

export function setUser(id?: string | null) {
  if (!ready) return;
  window.gtag("set", { user_id: id || null });
  window.gtag("set", "user_properties", { signed_in: id ? "yes" : "no" });
}

/** Turns /match/some-slug into "match" so reports group pages sensibly. */
function pageType(path: string) {
  const p = path.split("?")[0].split("/").filter(Boolean);
  return p[0] || "home";
}

// ---------- automatic tracking ----------

const scrollMarks = new Set<number>();
const startedForms = new WeakSet<HTMLFormElement>();

function labelOf(el: Element): string {
  const raw =
    el.getAttribute("data-track") ||
    el.getAttribute("aria-label") ||
    (el as HTMLElement).innerText ||
    el.getAttribute("title") ||
    el.querySelector("img")?.getAttribute("alt") ||
    el.querySelector("svg title")?.textContent ||
    "";
  return raw.replace(/\s+/g, " ").trim().slice(0, 80);
}

function sectionOf(el: Element): string | undefined {
  const s = el.closest("[data-section], section[id], header, nav, footer, [role=dialog]");
  if (!s) return undefined;
  return s.getAttribute("data-section") || s.id || s.getAttribute("aria-label") || s.tagName.toLowerCase();
}

function linkKind(href: string): string | undefined {
  if (href.startsWith("mailto:")) return "email";
  if (href.startsWith("tel:")) return "phone";
  if (/wa\.me|whatsapp\.com/.test(href)) return "whatsapp";
  if (/instagram\.com|x\.com|twitter\.com|tiktok\.com|facebook\.com|linkedin\.com|youtube\.com/.test(href)) return "social";
  if (/maps\.google|google\.com\/maps|maps\.apple/.test(href)) return "maps";
  if (/apps\.apple\.com|play\.google\.com/.test(href)) return "store";
  return undefined;
}

function onClick(e: MouseEvent) {
  const t = e.target as Element | null;
  const el = t?.closest("a, button, [role=button], [role=tab], [role=menuitem], [role=switch], [role=checkbox], [data-track], summary, input[type=submit], input[type=button]");
  if (!el || el.hasAttribute("data-no-track")) return;

  const label = labelOf(el);
  const base: Params = {
    label,
    element: el.getAttribute("role") || el.tagName.toLowerCase(),
    section: sectionOf(el),
    page_path: window.location.pathname,
  };

  if (el.tagName === "A") {
    const href = (el as HTMLAnchorElement).href || "";
    const kind = linkKind(href);
    let host = "";
    try { host = new URL(href, window.location.href).hostname; } catch { /* ignore */ }
    const external = !!host && host !== window.location.hostname;
    if (kind) track(`${kind}_click`, { ...base, link_url: href.startsWith("mailto:") || href.startsWith("tel:") ? kind : href });
    else if (external) track("outbound_click", { ...base, link_url: href, link_domain: host });
    else track("link_click", { ...base, link_url: (el as HTMLAnchorElement).pathname });
    return;
  }
  if (el.getAttribute("role") === "tab") { track("tab_select", base); return; }
  if (el.getAttribute("role") === "switch" || el.getAttribute("role") === "checkbox") {
    track("toggle", { ...base, state: el.getAttribute("aria-checked") === "true" ? "off" : "on" });
    return;
  }
  track("button_click", base);
}

function formName(f: HTMLFormElement) {
  return f.getAttribute("data-track") || f.getAttribute("name") || f.id || f.getAttribute("aria-label") ||
    f.querySelector("h1, h2, h3, legend")?.textContent?.trim().slice(0, 60) || window.location.pathname;
}

function onFocusIn(e: FocusEvent) {
  const f = (e.target as Element | null)?.closest?.("form") as HTMLFormElement | null;
  if (!f || startedForms.has(f)) return;
  startedForms.add(f);
  track("form_started", { form_name: formName(f), page_path: window.location.pathname });
}

function onSubmit(e: Event) {
  const f = e.target as HTMLFormElement;
  if (!f || f.tagName !== "FORM") return;
  track("form_submitted", { form_name: formName(f), page_path: window.location.pathname, fields: f.elements.length });
}

let searchTimer: number | undefined;
function onInput(e: Event) {
  const i = e.target as HTMLInputElement;
  if (!i || i.tagName !== "INPUT") return;
  const isSearch = i.type === "search" || /search/i.test(i.placeholder || "") || /search/i.test(i.name || "") || /search/i.test(i.getAttribute("aria-label") || "");
  if (!isSearch) return;
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    const term = i.value.trim();
    if (term.length >= 2 && !/@|\d{6,}/.test(term)) track("search", { search_term: term.slice(0, 60), page_path: window.location.pathname });
  }, 1200);
}

function onScroll() {
  const doc = document.documentElement;
  const max = doc.scrollHeight - window.innerHeight;
  if (max < 200) return;
  const pct = Math.round((window.scrollY / max) * 100);
  for (const m of [25, 50, 75, 90]) {
    if (pct >= m && !scrollMarks.has(m)) {
      scrollMarks.add(m);
      track("scroll_depth", { percent: m, page_path: window.location.pathname });
    }
  }
}

function autoTrack() {
  document.addEventListener("click", onClick, { capture: true, passive: true });
  document.addEventListener("focusin", onFocusIn, { capture: true, passive: true });
  document.addEventListener("submit", onSubmit, { capture: true });
  document.addEventListener("input", onInput, { capture: true, passive: true });
  let raf = 0;
  window.addEventListener("scroll", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(onScroll); }, { passive: true });

  window.addEventListener("error", (e) => track("exception", { description: String(e.message || "error").slice(0, 150), fatal: false }));
  window.addEventListener("unhandledrejection", (e) => track("exception", { description: String((e.reason && e.reason.message) || e.reason || "rejection").slice(0, 150), fatal: false }));

  window.addEventListener("beforeinstallprompt", () => track("pwa_install_prompt"));
  window.addEventListener("appinstalled", () => track("pwa_installed"));
  if (window.matchMedia?.("(display-mode: standalone)").matches) window.gtag("set", "user_properties", { launched_as: "installed_app" });

  // native share sheet
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
  if (nav.share) {
    const orig = nav.share.bind(nav);
    nav.share = (d: ShareData) => orig(d).then(
      (r) => { track("share", { method: "share_sheet", content_url: d?.url, page_path: window.location.pathname }); return r; },
      (err) => { track("share_cancel", { page_path: window.location.pathname }); throw err; },
    );
  }
  // copy link buttons
  if (navigator.clipboard?.writeText) {
    const orig = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = (txt: string) => orig(txt).then((r) => {
      if (/^https?:\/\//.test(txt)) track("share", { method: "copy_link", content_url: txt, page_path: window.location.pathname });
      return r;
    });
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") track("page_hidden", { page_path: window.location.pathname }); });
}

// ---------- Supabase actions ----------

/** Which writes mean something to the business, and what to call them. */
const WRITE_EVENTS: Record<string, Partial<Record<"insert" | "upsert" | "update" | "delete", string>>> = {
  matches: { insert: "create_match", update: "edit_match", delete: "delete_match" },
  players: { insert: "join_match", delete: "leave_match" },
  user_joined_matches: { insert: "join_match_record" },
  tickets: { insert: "get_ticket" },
  cycling_events: { insert: "host_ride", update: "edit_ride", delete: "delete_ride" },
  cycling_attendees: { insert: "join_ride", delete: "leave_ride" },
  venues: { insert: "list_venue", update: "edit_venue" },
  bookings: { insert: "book_venue", update: "update_booking" },
  feedback: { insert: "submit_feedback" },
  team_assignments: { insert: "assign_teams", update: "update_teams" },
  match_events: { insert: "log_match_event" },
  cashout_requests: { insert: "request_cashout" },
  cycling_cashouts: { insert: "request_cashout" },
  venue_booking_cashout: { insert: "request_cashout" },
  user_venue_favourites: { insert: "favourite_venue", delete: "unfavourite_venue" },
  user_landmark_favourites: { insert: "favourite_landmark", delete: "unfavourite_landmark" },
  profiles: { update: "update_profile", upsert: "update_profile" },
  organizers: { insert: "become_organiser" },
  landmarks: { insert: "add_landmark" },
};

const ITEM_TYPE: Record<string, string> = {
  match_id: "match", event_id: "ride", cycling_event_id: "ride", venue_id: "venue_booking", booking_id: "venue_booking",
};

type AnyClient = {
  from: (t: string) => unknown;
  functions: { invoke: (n: string, o?: { body?: unknown }) => Promise<{ data: unknown; error: unknown }> };
  auth: Record<string, unknown> & { onAuthStateChange: (cb: (ev: string, s: { user?: { id: string } } | null) => void) => unknown };
};

function wrapThen(builder: { then: (a?: unknown, b?: unknown) => unknown }, onOk: (res: { error?: unknown }) => void) {
  const origThen = builder.then.bind(builder);
  builder.then = (res?: unknown, rej?: unknown) =>
    (origThen((r: { error?: unknown }) => { try { if (!r?.error) onOk(r); } catch { /* never break the app */ } return r; }) as Promise<unknown>)
      .then(res as never, rej as never);
}

const instrumented = new WeakSet<object>();
// kept in sessionStorage because Paystack can reload the page before we verify
const CK = "sc_checkout";
const getCheckout = (): { value?: number; item_type?: string } => { try { return JSON.parse(sessionStorage.getItem(CK) || "{}"); } catch { return {}; } };
const setCheckout = (v: { value?: number; item_type?: string } | null) => { try { if (v) sessionStorage.setItem(CK, JSON.stringify(v)); else sessionStorage.removeItem(CK); } catch { /* ignore */ } };

export function instrumentSupabase(client: unknown) {
  const c = client as AnyClient;
  if (!c || instrumented.has(c)) return;
  instrumented.add(c);

  // writes
  const origFrom = c.from.bind(c);
  c.from = (table: string) => {
    const qb = origFrom(table) as Record<string, (...a: unknown[]) => { then: (a?: unknown, b?: unknown) => unknown }>;
    const map = WRITE_EVENTS[table];
    if (!map) return qb;
    for (const op of ["insert", "upsert", "update", "delete"] as const) {
      const name = map[op];
      const orig = qb[op];
      if (!name || typeof orig !== "function") continue;
      qb[op] = (...args: unknown[]) => {
        const b = orig.apply(qb, args);
        const rows = Array.isArray(args[0]) ? (args[0] as unknown[]).length : 1;
        wrapThen(b, () => track(name, { table, operation: op, rows, page_path: window.location.pathname }));
        return b;
      };
    }
    return qb;
  };

  // payments
  const origInvoke = c.functions.invoke.bind(c.functions);
  c.functions.invoke = async (fn: string, opts?: { body?: unknown }) => {
    const body = (opts?.body || {}) as Record<string, unknown>;
    const amount = Number(body.amount) || undefined;
    const itemType = Object.keys(ITEM_TYPE).find((k) => k in body);
    const result = await origInvoke(fn, opts);
    try {
      const ok = !result.error;
      if (fn.startsWith("initialize-paystack")) {
        const item_type = itemType ? ITEM_TYPE[itemType] : fn.replace("initialize-paystack-", "");
        if (ok) setCheckout({ value: amount, item_type });
        track(ok ? "begin_checkout" : "checkout_error", { currency: "NGN", value: amount, item_type, page_path: window.location.pathname });
      } else if (fn === "verify-paystack-transaction") {
        const d = (result.data || {}) as Record<string, unknown>;
        const verified = ok && d.verified !== false;
        const lastCheckout = getCheckout();
        track(verified ? "purchase" : "payment_failed", {
          currency: "NGN",
          value: lastCheckout.value,
          transaction_id: typeof body.reference === "string" ? body.reference : undefined,
          item_type: d.match_id ? "match" : d.event_id ? "ride" : d.venue_id || d.booking_id ? "venue_booking" : lastCheckout.item_type,
          page_path: window.location.pathname,
        });
        if (verified) setCheckout(null);
      } else if (fn !== "verify-recaptcha") {
        track(ok ? "server_action" : "server_action_error", { function_name: fn });
      }
    } catch { /* never break the app */ }
    return result;
  };

  // auth
  const a = c.auth as Record<string, (...x: unknown[]) => Promise<{ error?: unknown }>>;
  const wrapAuth = (method: string, ok: string, params: Params) => {
    const orig = a[method];
    if (typeof orig !== "function") return;
    a[method] = async (...x: unknown[]) => {
      const r = await orig.apply(c.auth, x);
      if (r && !r.error) track(ok, params);
      else track(`${ok}_error`, params);
      return r;
    };
  };
  wrapAuth("signUp", "sign_up", { method: "email" });
  wrapAuth("signInWithPassword", "login", { method: "email" });
  wrapAuth("signInWithOAuth", "login_start", { method: "google" });
  wrapAuth("signInWithOtp", "login_start", { method: "otp" });
  wrapAuth("resetPasswordForEmail", "password_reset_request", {});
  wrapAuth("signOut", "logout", {});

  c.auth.onAuthStateChange((ev, session) => {
    setUser(session?.user?.id);
    if (ev === "SIGNED_IN" && /access_token|code=/.test(window.location.href)) track("login", { method: "oauth_return" });
  });
}
