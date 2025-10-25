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
        const command = data.command.trim();
        
        // Broadcast command to all clients in the session
        broadcastToSession(sessionId, {
          type: 'command_echo',
          command,
          timestamp: new Date().toISOString()
        });

        // Simulate command execution with predefined responses
        const output = simulateCommand(command);
        
        // Broadcast output to all clients in the session
        broadcastToSession(sessionId, {
          type: 'output',
          output,
          success: !output.startsWith('Error:'),
          timestamp: new Date().toISOString()
        });
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

function simulateCommand(command: string): string {
  const cmd = command.toLowerCase().split(' ')[0];
  const args = command.split(' ').slice(1);

  // Simulated file system
  const currentDir = '/home/termdesk';
  const fileList = [
    'drwxr-xr-x  5 user group   160 Oct 25 14:30 .',
    'drwxr-xr-x  8 user group   256 Oct 25 12:00 ..',
    '-rw-r--r--  1 user group  1234 Oct 25 13:45 README.md',
    '-rw-r--r--  1 user group  5678 Oct 25 14:20 config.json',
    'drwxr-xr-x  3 user group    96 Oct 25 10:15 src',
    'drwxr-xr-x  2 user group    64 Oct 25 09:30 docs',
    '-rwxr-xr-x  1 user group  2048 Oct 25 14:00 start.sh',
  ];

  switch (cmd) {
    case 'ls':
      if (args.includes('-la') || args.includes('-al')) {
        return fileList.join('\n') + '\n';
      }
      return 'README.md  config.json  docs  src  start.sh\n';

    case 'pwd':
      return currentDir + '\n';

    case 'whoami':
      return 'termdesk-user\n';

    case 'date':
      return new Date().toString() + '\n';

    case 'echo':
      return args.join(' ') + '\n';

    case 'cat':
      if (args[0] === 'README.md') {
        return '# TermDesk\n\nCollaborative terminal sharing application.\n\nFeatures:\n- Real-time terminal sharing\n- Multi-user sessions\n- WebSocket communication\n\n';
      } else if (args[0] === 'config.json') {
        return '{\n  "name": "termdesk",\n  "version": "1.0.0",\n  "port": 8080\n}\n';
      }
      return `cat: ${args[0] || 'file'}: No such file or directory\n`;

    case 'help':
      return 'Available commands:\n  ls [-la]    - List directory contents\n  pwd         - Print working directory\n  whoami      - Print current user\n  date        - Show current date and time\n  echo <text> - Print text\n  cat <file>  - Display file contents\n  clear       - Clear terminal\n  help        - Show this help message\n\nNote: This is a simulated terminal for demonstration.\n';

    case 'clear':
      return '__CLEAR__';

    case 'uname':
      return 'Linux termdesk-server 5.15.0 x86_64 GNU/Linux\n';

    case 'env':
      return 'USER=termdesk-user\nHOME=/home/termdesk\nSHELL=/bin/bash\nPATH=/usr/local/bin:/usr/bin:/bin\n';

    case '':
      return '';

    default:
      return `Command not found: ${cmd}\nType 'help' for available commands.\n`;
  }
}

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
