import { supabase } from "@/integrations/supabase/client";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GUEST_KEY = "sc_guest_pay_id";

// Paystack shows fewer payment methods when every guest pays under one
// shared customer email. Use the player's own email when we have it, and
// otherwise a guest address that is unique to this device. The plus
// address still delivers receipts to the SportCliq inbox.
export async function payerEmail(formEmail?: unknown): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    const own = data.session?.user?.email;
    if (own && EMAIL.test(own)) return own;
  } catch {
    // fall through to the guest address
  }
  if (typeof formEmail === "string" && EMAIL.test(formEmail.trim())) return formEmail.trim();

  let id = "";
  try {
    id = localStorage.getItem(GUEST_KEY) || "";
    if (!id) {
      id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem(GUEST_KEY, id);
    }
  } catch {
    id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }
  return `sportcliqapp+guest${id}@gmail.com`;
}
