import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Makes auth.getUser() answer from the session saved on the device instead of
 * asking the server every time, which made every screen wait on a round trip.
 * The data itself is still protected by Row Level Security on the server, and a
 * call that passes a token, or a device with no session, behaves as before.
 */
export function fastGetUser(client: SupabaseClient<any, any, any>) {
  const auth = client.auth as any;
  if (auth.__fast) return client;
  const original = auth.getUser.bind(auth);
  auth.getUser = async (jwt?: string) => {
    if (jwt) return original(jwt);
    try {
      const { data } = await auth.getSession();
      const session = data?.session;
      if (session?.user && (!session.expires_at || session.expires_at * 1000 > Date.now())) {
        return { data: { user: session.user }, error: null };
      }
    } catch {
      // fall through to the normal call
    }
    return original();
  };
  auth.__fast = true;
  return client;
}
