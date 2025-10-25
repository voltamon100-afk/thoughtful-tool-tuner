import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Store active sessions and their WebSocket connections
const sessions = new Map<string, Set<WebSocket>>();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    return new Response("Session ID is required", { status: 400 });
  }

  console.log(`WebSocket connection request for session: ${sessionId}`);

  const { socket, response } = Deno.upgradeWebSocket(req);

  // Add socket to session
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, new Set());
  }
  const sessionSockets = sessions.get(sessionId)!;

  socket.onopen = () => {
    console.log(`Client connected to session: ${sessionId}`);
    sessionSockets.add(socket);
    
    // Notify client of successful connection
    socket.send(JSON.stringify({
      type: 'connected',
      sessionId,
      message: 'Connected to terminal session'
    }));
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log(`Received message in session ${sessionId}:`, data);

      if (data.type === 'command') {
        const command = data.command;
        
        // Broadcast command to all clients in the session
        broadcastToSession(sessionId, {
          type: 'command_echo',
          command,
          timestamp: new Date().toISOString()
        });

        try {
          // Execute command using Deno subprocess
          const process = new Deno.Command("sh", {
            args: ["-c", command],
            stdout: "piped",
            stderr: "piped",
          });

          const { stdout, stderr, success } = await process.output();
          
          const output = new TextDecoder().decode(success ? stdout : stderr);
          
          // Broadcast output to all clients in the session
          broadcastToSession(sessionId, {
            type: 'output',
            output,
            success,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Command execution error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          broadcastToSession(sessionId, {
            type: 'error',
            error: `Failed to execute command: ${errorMessage}`,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Message processing error:', error);
      socket.send(JSON.stringify({
        type: 'error',
        error: 'Failed to process message'
      }));
    }
  };

  socket.onclose = () => {
    console.log(`Client disconnected from session: ${sessionId}`);
    sessionSockets.delete(socket);
    
    // Clean up empty sessions
    if (sessionSockets.size === 0) {
      sessions.delete(sessionId);
      console.log(`Session ${sessionId} cleaned up`);
    }
  };

  socket.onerror = (error) => {
    console.error(`WebSocket error in session ${sessionId}:`, error);
  };

  return response;
});

function broadcastToSession(sessionId: string, message: any) {
  const sessionSockets = sessions.get(sessionId);
  if (!sessionSockets) return;

  const messageStr = JSON.stringify(message);
  console.log(`Broadcasting to session ${sessionId}:`, message.type);
  
  sessionSockets.forEach((socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(messageStr);
    }
  });
}
