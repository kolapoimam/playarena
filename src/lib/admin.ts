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
  user_growth: { period: string; count: number }[];
  event_trends: { period: string; match_count: number; cycling_count: number }[];
  revenue_breakdown: { match: number; cycling: number; venue: number };
  commission_breakdown: { match: number; cycling: number; venue: number };
  top_sports: { sport: string; count: number }[];
  top_venues: { id: string; name: string; bookings: number; revenue: number }[];
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
  status: string;
  participants: number;
  venue: string;
  landmark?: string;
  tickets_sold: number;
  feedback: number;
  type: 'match' | 'cycling_event';
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

export interface AdminNotification {
  id: string;
  target_type: 'cashout' | 'booking' | 'event' | 'match' | 'cycling_event';
  category: string;
  title: string;
  message: string;
  sent_at: string;
  link: string;
  unread: boolean;
}

// New Venue interface
export interface Venue {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  status: 'pending' | 'verified' | 'rejected';
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  created_at: string;
  events_count: number;
  revenue: number;
  booking_fee: number;
  booking_history: { id: string; created_at: string; amount: number; status: string }[];
  documents: { id: string; document_type: string; document_url: string }[];
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
          new_notifications: 0,
          user_growth: [],
          event_trends: [],
          revenue_breakdown: { match: 0, cycling: 0, venue: 0 },
          commission_breakdown: { match: 0, cycling: 0, venue: 0 },
          top_sports: [],
          top_venues: []
        };
      }

      const metrics = data[0];
      return {
        total_users: metrics.total_users || 0,
        total_events: metrics.total_events || 0,
        pending_cashouts: metrics.pending_cashouts || 0,
        total_revenue: metrics.total_revenue || 0,
        active_venues: metrics.active_venues || 0,
        new_notifications: metrics.new_notifications || 0,
        user_growth: [],
        event_trends: [],
        revenue_breakdown: { match: 0, cycling: 0, venue: 0 },
        commission_breakdown: { match: 0, cycling: 0, venue: 0 },
        top_sports: [],
        top_venues: []
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
        new_notifications: 0,
        user_growth: [],
        event_trends: [],
        revenue_breakdown: { match: 0, cycling: 0, venue: 0 },
        commission_breakdown: { match: 0, cycling: 0, venue: 0 },
        top_sports: [],
        top_venues: []
      };
    }
  },

  // Get analytics data
  async getAnalytics(
    timeRange: '7d' | '30d' | '90d' | '1y' | 'custom',
    customStart?: string,
    customEnd?: string
  ): Promise<AdminMetrics> {
    try {
      const now = new Date();
      let startDate: string;
      switch (timeRange) {
        case '7d':
          startDate = new Date(now.setDate(now.getDate() - 7)).toISOString();
          break;
        case '30d':
          startDate = new Date(now.setDate(now.getDate() - 30)).toISOString();
          break;
        case '90d':
          startDate = new Date(now.setDate(now.getDate() - 90)).toISOString();
          break;
        case '1y':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
          break;
        case 'custom':
          if (!customStart || !customEnd) throw new Error('Custom date range requires start and end dates');
          startDate = new Date(customStart).toISOString();
          break;
        default:
          startDate = new Date(now.setDate(now.getDate() - 30).toISOString();
      }
      const endDate = customEnd ? new Date(customEnd).toISOString() : new Date().toISOString();

      // User growth (weekly/monthly)
      const { data: userGrowthData } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      const userGrowth = [];
      const period = timeRange === '1y' ? 'month' : 'week';
      const groupedUsers = userGrowthData?.reduce((acc: any, user: any) => {
        const date = new Date(user.created_at);
        const key = period === 'month'
          ? `${date.getFullYear()}-${date.getMonth() + 1}`
          : `${date.getFullYear()}-W${Math.floor(date.getDate() / 7) + 1}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}) || {};
      for (const [key, count] of Object.entries(groupedUsers)) {
        userGrowth.push({ period: key, count });
      }

      // Event trends
      const { data: matchEvents } = await supabase
        .from('matches')
        .select('created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      const { data: cyclingEvents } = await supabase
        .from('cycling_events')
        .select('created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      const eventTrends = [];
      const groupedEvents = { matches: {}, cycling: {} };
      for (const event of matchEvents || []) {
        const date = new Date(event.created_at);
        const key = period === 'month'
          ? `${date.getFullYear()}-${date.getMonth() + 1}`
          : `${date.getFullYear()}-W${Math.floor(date.getDate() / 7) + 1}`;
        groupedEvents.matches[key] = (groupedEvents.matches[key] || 0) + 1;
      }
      for (const event of cyclingEvents || []) {
        const date = new Date(event.created_at);
        const key = period === 'month'
          ? `${date.getFullYear()}-${date.getMonth() + 1}`
          : `${date.getFullYear()}-W${Math.floor(date.getDate() / 7) + 1}`;
        groupedEvents.cycling[key] = (groupedEvents.cycling[key] || 0) + 1;
      }
      const allPeriods = new Set([...Object.keys(groupedEvents.matches), ...Object.keys(groupedEvents.cycling)]);
      for (const p of allPeriods) {
        eventTrends.push({
          period: p,
          match_count: groupedEvents.matches[p] || 0,
          cycling_count: groupedEvents.cycling[p] || 0
        });
      }

      // Revenue breakdown
      const { data: matchRevenue } = await supabase
        .from('tickets')
        .select('total_price')
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      const { data: cyclingRevenue } = await supabase
        .from('cycling_attendees')
        .select('amount')
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      const { data: venueRevenue } = await supabase
        .from('venue_booking_cashout')
        .select('amount')
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      const revenue_breakdown = {
        match: matchRevenue?.reduce((sum, t) => sum + (t.total_price || 0), 0) || 0,
        cycling: cyclingRevenue?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
        venue: venueRevenue?.reduce((sum, v) => sum + (v.amount || 0), 0) || 0
      };

      // Commission breakdown
      const commission_breakdown = {
        match: revenue_breakdown.match * 0.05,
        cycling: revenue_breakdown.cycling * 0.05,
        venue: revenue_breakdown.venue * 0.10
      };

      // Top sports
      const { data: matchSports } = await supabase
        .from('matches')
        .select('match_type')
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      const { data: cyclingCount } = await supabase
        .from('cycling_events')
        .select('id')
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      const sportCounts = matchSports?.reduce((acc: any, m: any) => {
        acc[m.match_type] = (acc[m.match_type] || 0) + 1;
        return acc;
      }, { Cycling: cyclingCount?.length || 0 }) || { Cycling: cyclingCount?.length || 0 };
      const top_sports = Object.entries(sportCounts).map(([sport, count]) => ({ sport, count: count as number }));

      // Top venues
      const { data: venueBookings } = await supabase
        .from('bookings')
        .select('venue_id, venues!inner(name)')
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      const venueRevenueData = venueRevenue || [];
      const venueCounts = venueBookings?.reduce((acc: any, b: any) => {
        const venueId = b.venue_id;
        acc[venueId] = acc[venueId] || { name: b.venues.name, bookings: 0, revenue: 0 };
        acc[venueId].bookings += 1;
        acc[venueId].revenue = venueRevenueData
          .filter((v: any) => v.venue_id === venueId)
          .reduce((sum: number, v: any) => sum + (v.amount || 0), 0);
        return acc;
      }, {}) || {};
      const top_venues = Object.entries(venueCounts)
        .map(([id, v]: [string, any]) => ({ id, name: v.name, bookings: v.bookings, revenue: v.revenue }))
        .sort((a, b) => b.bookings - a.bookings)
        .slice(0, 5);

      // Base metrics
      const baseMetrics = await adminOperations.getMetrics();

      return {
        ...baseMetrics,
        user_growth: userGrowth,
        event_trends: eventTrends,
        revenue_breakdown,
        commission_breakdown,
        top_sports,
        top_venues
      };
    } catch (error: any) {
      console.error('Error in getAnalytics:', error);
      throw new Error(`Failed to fetch analytics: ${error.message}`);
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
        super_code: user.super_code || null,
        last_cashout: lastCashout,
        last_activity: lastActivity,
        category: userCategory
      };
    });

    return { users, total: count || 0 };
  },

  // Get events with pagination and filters
  async getEvents(
    page: number = 1,
    limit: number = 10,
    status?: string,
    sport?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<{ events: AdminEvent[], total: number }> {
    // Fetch matches
    let matchesQuery = supabase
      .from('matches')
      .select(
        `
          id,
          title,
          match_date,
          status,
          organizer_name,
          total_tickets_sold,
          total_checked_in_players,
          match_type,
          venues!matches_venue_id_fkey(name),
          feedback_summaries!matches_id_fkey(summary)
        `,
        { count: 'exact' }
      )
      .eq('cancellation_status', false);

    // Fetch cycling events
    let cyclingQuery = supabase
      .from('cycling_events')
      .select(
        `
          id_uuid,
          title,
          event_date,
          status,
          host_name,
          max_attendees,
          duration_type,
          landmarks!cycling_events_start_landmark_id_fkey(name),
          cycling_attendees(count)
        `,
        { count: 'exact' }
      )
      .eq('cancellation_status', false);

    // Apply filters
    if (status) {
      matchesQuery = matchesQuery.eq('status', status);
      cyclingQuery = cyclingQuery.eq('status', status);
    }
    if (sport && sport !== 'all') {
      matchesQuery = matchesQuery.eq('match_type', sport);
      cyclingQuery = cyclingQuery.ilike('duration_type', `%${sport}%`);
    }
    if (dateFrom && dateTo) {
      matchesQuery = matchesQuery.gte('match_date', dateFrom).lte('match_date', dateTo);
      cyclingQuery = cyclingQuery.gte('event_date', dateFrom).lte('event_date', dateTo);
    }

    // Pagination
    matchesQuery = matchesQuery.range((page - 1) * limit, page * limit - 1);
    cyclingQuery = cyclingQuery.range((page - 1) * limit, page * limit - 1);

    // Execute queries
    const [matchesRes, cyclingRes] = await Promise.all([matchesQuery, cyclingQuery]);

    if (matchesRes.error || cyclingRes.error) {
      console.error('Supabase query error in getEvents:', matchesRes.error || cyclingRes.error);
      throw new Error(`Failed to fetch events: ${matchesRes.error?.message || cyclingRes.error?.message}`);
    }

    const events: AdminEvent[] = [
      ...matchesRes.data.map(m => ({
        id: m.id,
        title: m.title,
        sport: m.match_type || 'Unknown',
        organizer: m.organizer_name || 'Unknown',
        date: m.match_date,
        status: m.status,
        participants: m.total_checked_in_players || 0,
        venue: m.venues?.name || 'TBD',
        landmark: 'N/A', // Placeholder: Adjust based on venue-landmark link
        tickets_sold: m.total_tickets_sold || 0,
        feedback: m.feedback_summaries?.['summary']?.average || 0,
        type: 'match' as const
      })),
      ...cyclingRes.data.map(c => ({
        id: c.id_uuid,
        title: c.title,
        sport: c.duration_type || 'Cycling',
        organizer: c.host_name || 'Unknown',
        date: c.event_date,
        status: c.status,
        participants: c.cycling_attendees?.[0]?.count || 0,
        venue: 'N/A',
        landmark: c.landmarks?.['name'] || 'N/A',
        tickets_sold: 0,
        feedback: 0,
        type: 'cycling_event' as const
      }))
    ];

    const total = (matchesRes.count || 0) + (cyclingRes.count || 0);
    return { events, total };
  },

  // Update event status
  async updateEventStatus(eventId: string, status: string, type: 'match' | 'cycling_event'): Promise<void> {
    const table = type === 'match' ? 'matches' : 'cycling_events';
    const idField = type === 'match' ? 'id' : 'id_uuid';
    const { error } = await supabase
      .from(table)
      .update({ status })
      .eq(idField, eventId);

    if (error) {
      console.error(`Supabase error in updateEventStatus for ${type}:`, error);
      throw new Error(`Failed to update ${type} status: ${error.message}`);
    }
  },

  // Update event details
  async updateEvent(
    eventId: string,
    type: 'match' | 'cycling_event',
    updates: Partial<AdminEvent>,
    adminId: string
  ): Promise<void> {
    const table = type === 'match' ? 'matches' : 'cycling_events';
    const idField = type === 'match' ? 'id' : 'id_uuid';
    const updateData: any = {
      title: updates.title,
      updated_at: new Date().toISOString()
    };

    if (type === 'match') {
      updateData.match_date = updates.date;
    } else {
      updateData.event_date = updates.date;
    }

    const { error } = await supabase
      .from(table)
      .update(updateData)
      .eq(idField, eventId);

    if (error) {
      console.error(`Supabase error in updateEvent for ${type}:`, error);
      throw new Error(`Failed to update ${type}: ${error.message}`);
    }

    // Log to admin_actions
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: adminId,
        action_type: 'update',
        target_id: eventId,
        details: updates,
        event_type: type,
        target_table: table,
        updated_at: new Date().toISOString()
      });
  },

  // Delete event (super admin only)
  async deleteEvent(eventId: string, type: 'match' | 'cycling_event', adminId: string): Promise<void> {
    // Check admin role
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('role')
      .eq('id', adminId)
      .single();

    if (adminError || admin?.role !== 'super_admin') {
      throw new Error('Only super admins can delete events');
    }

    const table = type === 'match' ? 'matches' : 'cycling_events';
    const idField = type === 'match' ? 'id' : 'id_uuid';
    const { error } = await supabase
      .from(table)
      .delete()
      .eq(idField, eventId);

    if (error) {
      console.error(`Supabase error in deleteEvent for ${type}:`, error);
      throw new Error(`Failed to delete ${type}: ${error.message}`);
    }
  },

  // Get cashouts with pagination and filters
  async getCashouts(
    page: number = 1,
    limit: number = 10,
    status?: string,
    dateFilter?: 'today' | 'last_7_days' | 'custom',
    customDateStart?: string,
    customDateEnd?: string
  ): Promise<{ cashouts: AdminCashout[], total: number }> {
    let query = supabase
      .from('venue_booking_cashout')
      .select(
        '*,venues!inner(name),profiles!inner(full_name, bank_details)',
        { count: 'exact' }
      );

    if (status) {
      query = query.eq('status', status);
    }

    if (dateFilter) {
      const now = new Date();
      if (dateFilter === 'today') {
        query = query.gte('created_at', new Date(now.setHours(0, 0, 0, 0)).toISOString());
      } else if (dateFilter === 'last_7_days') {
        query = query.gte('created_at', new Date(now.setDate(now.getDate() - 7)).toISOString());
      } else if (dateFilter === 'custom' && customDateStart && customDateEnd) {
        query = query
          .gte('created_at', customDateStart)
          .lte('created_at', customDateEnd);
      }
    }

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error('Supabase error in getCashouts:', error);
      throw new Error(`Failed to fetch cashouts: ${error.message}`);
    }

    const cashouts = data.map(cashout => ({
      id: cashout.id,
      organizer_name: cashout.profiles?.full_name || 'Unknown',
      organizer_type: cashout.venue_id ? 'Venue Owner' : 'Event Organizer',
      amount: cashout.amount || 0,
      status: cashout.status,
      requested_at: cashout.created_at,
      event_details: cashout.venues?.name || 'Unknown',
      checked_in_participants: cashout.checked_in_events || 0,
      bank_details: cashout.profiles?.bank_details || {
        account_name: cashout.account_holder_name || '',
        bank_name: cashout.bank_name || '',
        account_number: cashout.account_number || '',
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

    const { data: cashoutData, error: fetchError } = await supabase
      .from('venue_booking_cashout')
      .select('status,amount')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Supabase error fetching cashout:', fetchError);
      throw new Error(`Failed to fetch cashout: ${fetchError.message}`);
    }

    const { error } = await supabase
      .from('venue_booking_cashout')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Supabase error in updateCashoutStatus:', error);
      throw new Error(`Failed to update cashout status: ${error.message}`);
    }

    // Log to admin_actions
    const adminId = 'placeholder-admin-id'; // Replace with actual admin ID from auth context
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: adminId,
        action_type: 'update_status',
        target_id: id,
        details: {
          old_status: cashoutData.status,
          new_status: status,
          rejection_reason
        },
        event_type: 'cashout',
        target_table: 'venue_booking_cashout',
        timestamp: new Date().toISOString()
      });
  },

  // Get notifications
  async getNotifications(limit: number = 10): Promise<AdminNotification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('id,target_type,category,title,message,sent_at,link,unread')
      .in('target_type', ['cashout', 'booking', 'event', 'match', 'cycling_event'])
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase query error in getNotifications:', error);
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    return data.map(n => ({
      id: n.id,
      target_type: n.target_type,
      category: n.category,
      title: n.title,
      message: n.message,
      sent_at: n.sent_at,
      link: n.link || '/admin',
      unread: n.unread
    }));
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
        password
      });

      if (authError) {
        console.error('Supabase auth error:', authError);
        throw new Error(`Failed to create admin: ${authError.message}`);
      }

      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .insert({
          id: authData.user?.id,
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
      console.error('Error creating admin:', error);
      throw new Error(`Failed to create admin: ${error.message}`);
    }
  },

  // New venue-related functions
  async getVenues(
    page: number = 1,
    limit: number = 50,
    status?: string,
    city?: string
  ): Promise<{ venues: Venue[], total: number }> {
    try {
      let query = supabase
        .from('venues')
        .select(
          `
            id,
            name,
            city,
            state,
            address,
            status,
            created_at,
            booking_fee,
            owner:profiles(full_name, email, phone),
            events:matches(count),
            revenue:venue_booking_cashout(sum(amount)),
            bookings:venue_bookings(id, created_at, amount, status),
            documents:venue_documents(id, document_type, document_url)
          `,
          { count: 'exact' }
        );

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      if (city && city !== 'all') {
        query = query.eq('city', city);
      }

      query = query.range((page - 1) * limit, page * limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Supabase query error in getVenues:', error);
        throw new Error(`Failed to fetch venues: ${error.message}`);
      }

      const venues: Venue[] = data.map(venue => ({
        id: venue.id,
        name: venue.name,
        city: venue.city,
        state: venue.state,
        address: venue.address,
        status: venue.status,
        owner_name: venue.owner?.full_name || 'Unknown',
        owner_email: venue.owner?.email || 'N/A',
        owner_phone: venue.owner?.phone || 'N/A',
        created_at: venue.created_at,
        events_count: venue.events?.[0]?.count || 0,
        revenue: venue.revenue?.[0]?.sum || 0,
        booking_fee: venue.booking_fee || 0,
        booking_history: venue.bookings?.map(b => ({
          id: b.id,
          created_at: b.created_at,
          amount: b.amount,
          status: b.status
        })) || [],
        documents: venue.documents?.map(d => ({
          id: d.id,
          document_type: d.document_type,
          document_url: d.document_url
        })) || []
      }));

      return { venues, total: count || 0 };
    } catch (err: any) {
      console.error('Error in getVenues:', err);
      throw new Error(`Failed to fetch venues: ${err.message}`);
    }
  },

  async toggleVenueStatus(venueId: string, currentStatus: string, adminId: string): Promise<void> {
    const newStatus = currentStatus === 'verified' ? 'pending' : 'verified';
    try {
      const { error: venueError } = await supabase
        .from('venues')
        .update({ status: newStatus })
        .eq('id', venueId);

      if (venueError) {
        console.error('Supabase error in toggleVenueStatus (venues):', venueError);
        throw new Error(`Failed to update venue status: ${venueError.message}`);
      }

      const bookingStatus = newStatus === 'verified' ? 'active' : 'disabled';
      const { error: bookingError } = await supabase
        .from('venue_bookings')
        .update({ status: bookingStatus })
        .eq('venue_id', venueId)
        .neq('status', 'completed');

      if (bookingError) {
        console.error('Supabase error in toggleVenueStatus (bookings):', bookingError);
        throw new Error(`Failed to update booking status: ${bookingError.message}`);
      }

      await supabase
        .from('admin_actions')
        .insert({
          admin_id: adminId,
          action_type: 'toggle_status',
          target_id: venueId,
          details: { old_status: currentStatus, new_status: newStatus },
          event_type: 'venue',
          target_table: 'venues',
          timestamp: new Date().toISOString()
        });
    } catch (err: any) {
      console.error('Error in toggleVenueStatus:', err);
      throw new Error(`Failed to toggle venue status: ${err.message}`);
    }
  },

  async deleteVenue(venueId: string, adminId: string): Promise<void> {
    try {
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('id')
        .eq('id', adminId)
        .single();

      if (adminError || admin?.role !== 'super_admin') {
        throw new Error('Only super admins can delete venues');
      }

      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', venueId);

      if (error) {
        console.error('Supabase error in deleteVenue:', error);
        throw new Error(`Failed to delete venue: ${error.message}`);
      }
    } catch (err: any) {
      console.error('Error in deleteVenue:', err);
      throw new Error(`Failed to delete venue: ${err.message}`);
    }
  },
};
