import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useWalletBalance = (
  matchId: string | null,
  isPaid: boolean,
  price: number | undefined,
  matchStatus: string | null // Added to handle match status checks
) => {
  const { toast } = useToast();
  const [walletBalance, setWalletBalance] = useState<number>(0);

  useEffect(() => {
    if (!matchId || matchStatus === 'cancelled') {
      setWalletBalance(0);
      return;
    }

    const fetchWalletBalance = async () => {
      try {
        // Fetch player data
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('player_status, number_of_slots')
          .eq('match_id', matchId);

        if (playersError) {
          console.error('Players Query Error:', playersError);
          throw playersError;
        }

        let balance = 0;
        if (isPaid && price) {
          const checkedInPlayers = playersData.filter((p) => p.player_status === 'Checked In');
          balance = checkedInPlayers.reduce(
            (sum, player) => sum + ((player.number_of_slots || 1) * (price || 0)),
            0
          );
        }

        // Subtract cashout amounts
        const { data: cashoutData, error: cashoutError } = await supabase
          .from('cashout_requests')
          .select('amount, status')
          .eq('match_id', matchId)
          .in('status', ['Review', 'Processed', 'Successful']);

        if (cashoutError) {
          console.error('Cashout Query Error:', cashoutError);
          throw cashoutError;
        }

        if (cashoutData) {
          const cashoutTotal = cashoutData.reduce((sum, request) => sum + (request.amount || 0), 0);
          balance -= cashoutTotal;
        }

        setWalletBalance(balance < 0 ? 0 : balance);
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
        toast({
          title: 'Error',
          description: 'Failed to calculate wallet balance.',
          variant: 'destructive',
        });
        setWalletBalance(0);
      }
    };

    fetchWalletBalance();

    // Set up real-time subscription for cashout_requests
    const channel = supabase
      .channel(`cashout_requests_match_${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cashout_requests',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          console.log('Cashout update received');
          fetchWalletBalance();
        }
      )
      .subscribe((status) => {
        console.log('Cashout Subscription Status:', status);
      });

    // Set up real-time subscription for players (to catch check-in updates)
    const playerChannel = supabase
      .channel(`players_match_${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'players',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          console.log('Player update received');
          fetchWalletBalance();
        }
      )
      .subscribe((status) => {
        console.log('Player Subscription Status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(playerChannel);
    };
  }, [matchId, isPaid, price, matchStatus, toast]);

  return walletBalance;
};
