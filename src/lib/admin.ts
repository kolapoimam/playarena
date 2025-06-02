import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Types
export interface AdminMetrics {
  total_organizers: number;
  total_hosts: number;
  total_players: number;
  total_attendees: number;
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
  phone: string | null;
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
      .eq('id', '509ef956-c36a-4b62-bdec-af565785c220')
      .single();

    if (error) {
      console.error('Supabase error fetching admin_metrics:', error);
      throw new Error(`Failed to fetch metrics: ${error.message}`);
    }

    if (!data) {
      console.warn('No admin_metrics data found for id: 509ef956-c36a-4b62-bdec-af565785c220');
      throw new Error('No metrics data found');
    }

    return data as AdminMetrics;
  },

  // Get users with pagination and filters
  async getUsers(page: number = 1, limit: number = 10, status?: string): Promise<{ users: AdminUser[], total: number }> {
    let query = supabase
      .from('profiles')
      .select(
        '*,events_organized:cycling_events(count),events_participated:cycling_attendees(count),user_badges(badge_id!inner(badges(name)))',
        { count: 'exact' }
      );

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error('Supabase query error in getUsers:', error);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    const users = data.map(user => ({
      id: user.id,
      name: user.full_name || 'Unknown',
      email: user.email,
      phone: user.phone || null,
      status: user.status || 'active',
      created_at: user.created_at,
      events_organized: user.events_organized?.[0]?.count || 0,
      events_participated: user.events_participated?.[0]?.count || 0,
      badges: user.user_badges?.map((ub: any) => ub.badges.name) || [],
    }));

    return { users, total: count || 0 };
  },

  // Get events with pagination and filters
  async getEvents(page: number = 1, limit: number = 10, status?: string, sport?: string): Promise<{ events: AdminEvent[], total: number }> {
    let query = supabase
      .from('matches')
      .select(
        '*,organizer:profiles(full_name),venue:venues(name),tickets_sold:tickets(count),feedback:match_feedback(avg(rating))',
        { count: 'exact' }
      );

    if (status) {
      query = query.eq('status', status);
    }
    if (sport) {
      query = query.eq('sport', sport);
    }

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error('Supabase query error in getEvents:', error);
      throw new Error(`Failed to fetch events: ${error.message}`);
    }

    const events = data.map(event => ({
      id: event.id,
      title: event.title,
      sport: event.sport,
      organizer: event.organizer?.full_name || 'Unknown',
      date: event.date,
      status: event.status,
      participants: event.participants || 0,
      venue: event.venue?.name || 'Unknown',
      tickets_sold: event.tickets_sold?.[0]?.count || 0,
      feedback: event.feedback?.[0]?.avg || 0,
    }));

    return { events, total: count || 0 };
  },

  // Get cashouts with pagination and filters
  async getCashouts(page: number = 1, limit: number = 10, status?: string): Promise<{ cashouts: AdminCashout[], total: number }> {
    let query = supabase
      .from('venue_booking_cashout')
      .select(
        '*,organizer:profiles(full_name, bank_details),venue:venues(name)',
        { count: 'exact' }
      );

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error('Supabase query error in getCashouts:', error);
      throw new Error(`Failed to fetch cashouts: ${error.message}`);
    }

    const cashouts = data.map(cashout => ({
      id: cashout.id,
      organizer_name: cashout.organizer?.full_name || 'Unknown',
      organizer_type: cashout.type || 'Unknown',
      amount: cashout.amount || 0,
      status: cashout.status,
      requested_at: cashout.created_at,
      event_details: cashout.venue?.name || 'Unknown',
      checked_in_participants: cashout.checked_in_participants || 0,
      bank_details: cashout.organizer?.bank_details || {
        account_name: '',
        bank_name: '',
        account_number: '',
      },
      rejection_reason: cashout.rejection_reason,
    }));

    return { cashouts, total: count || 0 };
  },

  // Update cashout status
  async updateCashoutStatus(id: string, status: string, rejectionReason?: string): Promise<void> {
    const updateData: { status: string; updated_at: string; rejection_reason?: string } = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }

    const { error } = await supabase
      .from('venue_booking_cashout')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Supabase error in updateCashoutStatus:', error);
      throw new Error(`Failed to update cashout status: ${error.message}`);
    }
  },

  // Update user status
  async updateUserStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Supabase error in updateUserStatus:', error);
      throw new Error(`Failed to update user status: ${error.message}`);
    }
  },

  // Update event status
  async updateEventStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('matches')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Supabase error in updateEventStatus:', error);
      throw new Error(`Failed to update event status: ${error.message}`);
    }
  },

  // Create first admin
  async createFirstAdmin(email: string, password: string, secretKey: string): Promise<any> {
    try {
      console.log('Received secret key:', secretKey);
      console.log('Expected secret key:', import.meta.env.VITE_FIRST_ADMIN_SECRET);

      if (secretKey !== import.meta.env.VITE_FIRST_ADMIN_SECRET) {
        throw new Error('Invalid secret key');
      }

      const { data: existingAdmins, error: checkError } = await supabase
        .from('admins')
        .select('id')
        .limit(1);

      if (checkError) {
        console.error('Supabase error checking existing admins:', checkError);
        throw new Error(`Failed to check existing admins: ${checkError.message}`);
      }

      if (existingAdmins && existingAdmins.length > 0) {
        throw new Error('Admin already exists');
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        console.error('Supabase auth error:', authError);
        throw new Error(`Failed to create admin user: ${authError.message}`);
      }

      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .insert({
          user_id: authData.user?.id,
          email,
          role: 'super_admin',
          permissions: ['*'],
          is_active: true,
        })
        .select()
        .single();

      if (adminError) {
        console.error('Supabase error creating admin record:', adminError);
        throw new Error(`Failed to create admin record: ${adminError.message}`);
      }

      return adminData;
    } catch (error: any) {
      console.error('Admin creation error:', error);
      throw new Error(`Failed to create admin: ${error.message}`);
    }
  },
};
