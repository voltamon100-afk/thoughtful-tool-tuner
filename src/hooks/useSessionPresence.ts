import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Member {
  userId: string;
  username: string;
  online_at: string;
}

export const useSessionPresence = (sessionId: string, username: string) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    // Create a unique channel for this session
    const presenceChannel = supabase.channel(`session:${sessionId}`, {
      config: {
        presence: {
          key: username,
        },
      },
    });

    // Track sync events
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        console.log('Presence sync:', state);
        
        const membersList: Member[] = [];
        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          presences.forEach((presence) => {
            membersList.push({
              userId: presence.userId || key,
              username: presence.username || key,
              online_at: presence.online_at,
            });
          });
        });
        
        setMembers(membersList);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track this user's presence
          await presenceChannel.track({
            userId: username,
            username: username,
            online_at: new Date().toISOString(),
          });
        }
      });

    setChannel(presenceChannel);

    // Cleanup
    return () => {
      presenceChannel.unsubscribe();
    };
  }, [sessionId, username]);

  return { members, channel };
};
