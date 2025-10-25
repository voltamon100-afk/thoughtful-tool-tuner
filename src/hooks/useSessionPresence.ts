import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Sanitize username to prevent XSS
const sanitizeUsername = (username: string): string => {
  return username.replace(/[<>&"']/g, (char) => {
    const chars: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#x27;',
    };
    return chars[char] || char;
  }).substring(0, 50);
};

interface Member {
  userId: string;
  username: string;
  online_at: string;
}

export const useSessionPresence = (sessionId: string, username: string) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    // Sanitize username
    const sanitizedUsername = sanitizeUsername(username);
    
    // Create a unique channel for this session
    const presenceChannel = supabase.channel(`session:${sessionId}`, {
      config: {
        presence: {
          key: sanitizedUsername,
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
            // Sanitize user data from presence
            const sanitizedUsername = sanitizeUsername(presence.username || key);
            const sanitizedUserId = sanitizeUsername(presence.userId || key);
            
            membersList.push({
              userId: sanitizedUserId,
              username: sanitizedUsername,
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
          // Track this user's presence with sanitized username
          const sanitizedUsername = sanitizeUsername(username);
          await presenceChannel.track({
            userId: sanitizedUsername,
            username: sanitizedUsername,
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
