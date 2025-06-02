import { supabase } from './supabase';

// Types
export interface AdminMetrics {
  total_users: number;
  total_events: number;
  pending_cashouts: number;
  total_revenue: number;
  active_venues: number;
  new_notifications: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'suspended';
  created_at: string;
  events_organized: number;
  events_participated: number;
  badges: string[];
}

export interface AdminEvent {
  id: string;
  title: string;
  sport: string;
  organizer: string;
  date: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  participants: number;
  venue: string;
  tickets_sold: number;
  feedback: number;
}

export interface AdminCashout {
  id: string;
  organizer_name: string;
  organizer_type: 'Event Organizer' | 'Venue Owner';
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  requested_at: string;
  event_details: string;
  checked_in_participants: number;
  bank_details: {
    account_name: string;
    bank_name: string;
    account_number: string;
  };
  rejection_reason?: string;
}

// Database Operations
export const adminOperations = {
  // Get dashboard metrics
  async getMetrics(): Promise<AdminMetrics> {
    const { data, error } = await supabase
      .from('admin_metrics')
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  // Get users with pagination and filters
  async getUsers(page: number = 1, limit: number = 10, status?: string): Promise<{ users: AdminUser[], total: number }> {
    let query = supabase
      .from('profiles')
      .select('*, events_organized:matches(count), events_participated:cycling_attendees(count)', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    const users = data.map(user => ({
      id: user.id,
      name: user.full_name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      created_at: user.created_at,
      events_organized: user.events_organized?.[0]?.count || 0,
      events_participated: user.events_participated?.[0]?.count || 0,
      badges: user.badges || []
    }));

    return { users, total: count || 0 };
  },

  // Get events with pagination and filters
  async getEvents(page: number = 1, limit: number = 10, status?: string, sport?: string): Promise<{ events: AdminEvent[], total: number }> {
    let query = supabase
      .from('matches')
      .select(`
        *,
        organizer:profiles(full_name),
        venue:venues(name),
        tickets_sold:tickets(count),
        feedback:match_feedback(avg(rating))
      `, { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }
    if (sport) {
      query = query.eq('sport', sport);
    }

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    const events = data.map(event => ({
      id: event.id,
      title: event.title,
      sport: event.sport,
      organizer: event.organizer?.full_name,
      date: event.date,
      status: event.status,
      participants: event.participants,
      venue: event.venue?.name,
      tickets_sold: event.tickets_sold?.[0]?.count || 0,
      feedback: event.feedback?.[0]?.avg || 0
    }));

    return { events, total: count || 0 };
  },

  // Get cashouts with pagination and filters
  async getCashouts(page: number = 1, limit: number = 10, status?: string): Promise<{ cashouts: AdminCashout[], total: number }> {
    let query = supabase
      .from('venue_booking_cashout')
      .select(`
        *,
        organizer:profiles(full_name, bank_details),
        venue:venues(name)
      `, { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    const cashouts = data.map(cashout => ({
      id: cashout.id,
      organizer_name: cashout.organizer?.full_name,
      organizer_type: cashout.type,
      amount: cashout.amount,
      status: cashout.status,
      requested_at: cashout.created_at,
      event_details: cashout.venue?.name,
      checked_in_participants: cashout.checked_in_participants,
      bank_details: cashout.organizer?.bank_details,
      rejection_reason: cashout.rejection_reason
    }));

    return { cashouts, total: count || 0 };
  },

  // Update cashout status
  async updateCashoutStatus(id: string, status: string, rejectionReason?: string): Promise<void> {
    const { error } = await supabase
      .from('venue_booking_cashout')
      .update({ 
        status,
        rejection_reason: rejectionReason,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  },

  // Update user status
  async updateUserStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  },

  // Update event status
  async updateEventStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('matches')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  },

  createFirstAdmin: async (email: string, password: string, secretKey: string) => {
    try {
      // Verify the secret key matches the environment variable
      if (secretKey !== process.env.FIRST_ADMIN_SECRET) {
        throw new Error('Invalid secret key');
      }

      // Check if any admin exists
      const { data: existingAdmins, error: checkError } = await supabase
        .from('admins')
        .select('id')
        .limit(1);

      if (checkError) throw checkError;

      if (existingAdmins && existingAdmins.length > 0) {
        throw new Error('Admin already exists');
      }

      // Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      // Create the admin record
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .insert({
          user_id: authData.user?.id,
          email: email,
          role: 'super_admin',
          permissions: ['*'],
          is_active: true
        })
        .select()
        .single();

      if (adminError) throw adminError;

      return adminData;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
}; 