import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
  phone: string | null;
  status: 'active' | 'suspended';
  created_at: string;
  updated_at: string;
  events_organized: number;
  events_participated: number;
  badges: string[];
  event_name: string | null;
  venue_name: string | null;
  value: string;
  slots_paid_for: number;
  event_status: 'Registered' | 'Checked In' | 'Absent' | null;
  total_earned: number;
  total_spent: number;
  super_code: string | null;
  last_cashout: string | null;
  last_activity: string;
  category: 'Organizer' | 'Host' | 'Cycler' | 'Player' | 'Venue Owner' | 'User';
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
    try {
      const { data, error } = await supabase.rpc('get_admin_metrics');
      
      if (error) {
        console.error('Error fetching metrics via RPC:', {
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint
        });
        throw new Error(`Failed to fetch metrics: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn('No data returned from get_admin_metrics RPC');
        return {
          total_users: 0,
          total_events: 0,
          pending_cashouts: 0,
          total_revenue: 0,
          active_venues: 0,
          new_notifications: 0
        };
      }

      const metrics = data[0];
      return {
        total_users: metrics.total_users || 0,
        total_events: metrics.total_events || 0,
        pending_cashouts: metrics.pending_cashouts || 0,
        total_revenue: metrics.total_revenue || 0,
        active_venues: metrics.active_venues || 0,
        new_notifications: metrics.new_notifications || 0
      };
    } catch (error: any) {
      console.error('Unexpected error in getMetrics:', {
        message: error.message,
        stack: error.stack
      });
      return {
        total_users: 0,
        total_events: 0,
        pending_cashouts: 0,
        total_revenue: 0,
        active_venues: 0,
        new_notifications: 0
      };
    }
  },

  // Get users with pagination, filters, and additional data
  async getUsers(
    page: number = 1,
    limit: number = 20,
    status?: string,
    dateFilter?: 'today' | 'last_7_days' | 'custom',
    customDateStart?: string,
    customDateEnd?: string,
    category?: 'Organizer' | 'Host' | 'Cycler' | 'Player' | 'Venue Owner' | 'User'
  ): Promise<{ users: AdminUser[], total: number }> {
    let query = supabase
      .from('profiles')
      .select(
        `
          *,
          events_organized:matches!matches_organizer_id_fkey(count),
          events_participated:cycling_attendees(count),
          user_badges(badge_id!inner(badges(name))),
          user_joined_matches!user_joined_matches_user_id_fkey(
            match_id,
            checked_in,
            matches!inner(title, fee, venue_id, venues!inner(name))
          ),
          user_joined_cycling!user_joined_cycling_user_id_fkey(
            cycling_event_id,
            checked_in,
            cycling_events!inner(event_name, fee, venue_id, venues!inner(name))
          ),
          cashouts(amount, created_at, status),
          cycling_cashouts(amount, created_at, status),
          venue_booking_cashout(amount, created_at, status),
          user_transactions(amount, transaction_type, created_at)
        `,
        { count: 'exact' }
      );

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Apply date filter
    if (dateFilter) {
      const now = new Date();
      if (dateFilter === 'today') {
        query = query.gte('updated_at', new Date(now.setHours(0, 0, 0, 0)).toISOString());
      } else if (dateFilter === 'last_7_days') {
        query = query.gte('updated_at', new Date(now.setDate(now.getDate() - 7)).toISOString());
      } else if (dateFilter === 'custom' && customDateStart && customDateEnd) {
        query = query
          .gte('updated_at', customDateStart)
          .lte('updated_at', customDateEnd);
      }
    }

    // Apply category filter
    if (category) {
      if (category === 'Organizer') {
        query = query.not('id', 'in', '(SELECT organizer_id FROM matches WHERE organizer_id IS NULL)');
      } else if (category === 'Host') {
        query = query.not('id', 'in', '(SELECT host_id FROM cycling_events WHERE host_id IS NULL)');
      } else if (category === 'Cycler') {
        query = query.not('id', 'in', '(SELECT user_id FROM user_joined_cycling WHERE user_id IS NULL)');
      } else if (category === 'Player') {
        query = query.not('id', 'in', '(SELECT user_id FROM user_joined_matches WHERE user_id IS NULL)');
      } else if (category === 'Venue Owner') {
        query = query.not('id', 'in', '(SELECT user_id FROM venues WHERE user_id IS NULL)');
      }
    }

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error('Supabase query error in getUsers:', error);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    const users = data.map(user => {
      // Determine the latest event (match or cycling event)
      let eventName = null;
      let venueName = null;
      let fee = 0;
      let slotsPaidFor = 0;
      let eventStatus: 'Registered' | 'Checked In' | 'Absent' | null = null;

      // Check matches
      if (user.user_joined_matches && user.user_joined_matches.length > 0) {
        const latestMatch = user.user_joined_matches[user.user_joined_matches.length - 1];
        eventName = latestMatch.matches.title;
        venueName = latestMatch.matches.venues?.name || 'Unknown';
        fee = latestMatch.matches.fee || 0;
        slotsPaidFor = user.user_joined_matches.length;
        eventStatus = latestMatch.checked_in ? 'Checked In' : 'Registered';
      }
      // Check cycling events (prioritize cycling if both exist)
      if (user.user_joined_cycling && user.user_joined_cycling.length > 0) {
        const latestCyclingEvent = user.user_joined_cycling[user.user_joined_cycling.length - 1];
        eventName = latestCyclingEvent.cycling_events.event_name;
        venueName = latestCyclingEvent.cycling_events.venues?.name || 'Unknown';
        fee = latestCyclingEvent.cycling_events.fee || 0;
        slotsPaidFor = user.user_joined_cycling.length;
        eventStatus = latestCyclingEvent.checked_in ? 'Checked In' : 'Registered';
      }

      // Compute financials
      const totalEarned = [
        ...(user.cashouts || []),
        ...(user.cycling_cashouts || []),
        ...(user.venue_booking_cashout || [])
      ]
        .filter(cashout => cashout.status === 'Successful')
        .reduce((sum: number, cashout: any) => sum + (cashout.amount || 0), 0);

      const totalSpent = (user.user_transactions || [])
        .filter((tx: any) => tx.transaction_type === 'payment')
        .reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);

      // Last cashout
      const allCashouts = [
        ...(user.cashouts || []),
        ...(user.cycling_cashouts || []),
        ...(user.venue_booking_cashout || [])
      ]
        .filter(cashout => cashout.status === 'Successful')
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const lastCashout = allCashouts.length > 0 ? allCashouts[0].created_at : null;

      // Last activity
      const lastActivitySources = [
        user.updated_at,
        ...(user.user_joined_matches || []).map((ujm: any) => ujm.created_at),
        ...(user.user_joined_cycling || []).map((ujc: any) => ujc.created_at)
      ].filter(Boolean);
      const lastActivity = lastActivitySources.length > 0
        ? new Date(Math.max(...lastActivitySources.map((date: string) => new Date(date).getTime()))).toISOString()
        : user.created_at;

      // Determine user category
      let userCategory: 'Organizer' | 'Host' | 'Cycler' | 'Player' | 'Venue Owner' | 'User' = 'User';
      if (user.id in (await supabase.from('matches').select('organizer_id'))) {
        userCategory = 'Organizer';
      } else if (user.id in (await supabase.from('cycling_events').select('host_id'))) {
        userCategory = 'Host';
      } else if (user.user_joined_cycling && user.user_joined_cycling.length > 0) {
        userCategory = 'Cycler';
      } else if (user.user_joined_matches && user.user_joined_matches.length > 0) {
        userCategory = 'Player';
      } else if (user.id in (await supabase.from('venues').select('user_id'))) {
        userCategory = 'Venue Owner';
      }

      return {
        id: user.id,
        name: user.full_name || 'Unknown',
        email: user.email,
        phone: user.phone || null,
        status: user.status || 'active',
        created_at: user.created_at,
        updated_at: user.updated_at,
        events_organized: user.events_organized?.[0]?.count || 0,
        events_participated: user.events_participated?.[0]?.count || 0,
        badges: user.user_badges?.map((ub: any) => ub.badges.name) || [],
        event_name: eventName,
        venue_name: venueName,
        value: fee === 0 ? 'Free' : `Paid (₦${fee.toLocaleString()})`,
        slots_paid_for: slotsPaidFor,
        event_status: eventStatus,
        total_earned: totalEarned,
        total_spent: totalSpent,
        super_code: user.super_code || null, // Assumed field; adjust if needed
        last_cashout: lastCashout,
        last_activity: lastActivity,
        category: userCategory
      };
    });

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
