import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TerminalMessage {
  type: 'output' | 'command_echo' | 'error' | 'connected';
  output?: string;
  command?: string;
  error?: string;
  message?: string;
  success?: boolean;
  timestamp?: string;
}

export const useTerminalSession = (sessionId: string) => {
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  const connectWebSocket = useCallback(() => {
    // WebSocket URL for the edge function
    const wsUrl = `wss://gcmudbuiezbcmxbmzfji.supabase.co/functions/v1/terminal-session?sessionId=${sessionId}`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data: TerminalMessage = JSON.parse(event.data);
        console.log('Received message:', data);

        switch (data.type) {
          case 'connected':
            toast({
              title: "Connected",
              description: data.message,
            });
            break;
          case 'command_echo':
            setTerminalOutput(prev => [...prev, `$ ${data.command}`]);
            break;
          case 'output':
            if (data.output === '__CLEAR__') {
              setTerminalOutput([]);
            } else if (data.output) {
              setTerminalOutput(prev => [...prev, data.output!]);
            }
            break;
          case 'error':
            setTerminalOutput(prev => [...prev, `Error: ${data.error}`]);
            toast({
              title: "Error",
              description: data.error,
              variant: "destructive",
            });
            break;
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to terminal session",
        variant: "destructive",
      });
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    wsRef.current = ws;
  }, [sessionId, toast]);

  const sendCommand = useCallback((command: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast({
        title: "Not Connected",
        description: "Please wait for connection to establish",
        variant: "destructive",
      });
      return;
    }

    console.log('Sending command:', command);
    wsRef.current.send(JSON.stringify({
      type: 'command',
      command
    }));
  }, [toast]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  return {
    terminalOutput,
    isConnected,
    sendCommand
  };
};
