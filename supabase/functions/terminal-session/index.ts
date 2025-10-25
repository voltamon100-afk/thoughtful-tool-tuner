import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Store active sessions and their WebSocket connections
const sessions = new Map<string, Set<WebSocket>>();

// Store session-level state (file system and current directory)
interface SessionState {
  currentDir: string;
  fileSystem: Map<string, { type: 'file' | 'dir'; content?: string }>;
}

const sessionStates = new Map<string, SessionState>();

function initSessionState(sessionId: string) {
  if (!sessionStates.has(sessionId)) {
    const fileSystem = new Map<string, { type: 'file' | 'dir'; content?: string }>();
    fileSystem.set('/home/termdesk', { type: 'dir' });
    fileSystem.set('/home/termdesk/README.md', { type: 'file', content: '# TermDesk\n\nCollaborative terminal sharing application.\n\nFeatures:\n- Real-time terminal sharing\n- Multi-user sessions\n- WebSocket communication\n\n' });
    fileSystem.set('/home/termdesk/config.json', { type: 'file', content: '{\n  "name": "termdesk",\n  "version": "1.0.0",\n  "port": 8080\n}\n' });
    fileSystem.set('/home/termdesk/src', { type: 'dir' });
    fileSystem.set('/home/termdesk/docs', { type: 'dir' });
    fileSystem.set('/home/termdesk/start.sh', { type: 'file', content: '#!/bin/bash\necho "Starting TermDesk..."\n' });
    
    sessionStates.set(sessionId, {
      currentDir: '/home/termdesk',
      fileSystem
    });
  }
  return sessionStates.get(sessionId)!;
}

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

  // Validate session ID
  if (!sessionId) {
    return new Response("Session ID is required", { status: 400 });
  }
  
  // Validate session ID format (alphanumeric and hyphens only, max 50 chars)
  if (!/^[a-z0-9-]+$/.test(sessionId) || sessionId.length > 50) {
    return new Response("Invalid session ID format", { status: 400 });
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
    
    // Initialize session state if needed
    initSessionState(sessionId);
    
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
      
      // Validate message structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid message format');
      }

      if (data.type === 'command') {
        // Validate command
        if (typeof data.command !== 'string') {
          throw new Error('Command must be a string');
        }
        
        const command = data.command.trim();
        
        // Validate command length
        if (command.length === 0) {
          socket.send(JSON.stringify({
            type: 'error',
            error: 'Command cannot be empty'
          }));
          return;
        }
        
        if (command.length > 500) {
          socket.send(JSON.stringify({
            type: 'error',
            error: 'Command is too long'
          }));
          return;
        }
        
        // Sanitize command - remove potentially dangerous characters
        const sanitizedCommand = command.replace(/[;&|`$(){}[\]<>]/g, '');
        
        // Broadcast command to all clients in the session
        broadcastToSession(sessionId, {
          type: 'command_echo',
          command: sanitizedCommand,
          timestamp: new Date().toISOString()
        });

        // Simulate command execution with session state
        const sessionState = sessionStates.get(sessionId)!;
        const output = simulateCommand(sanitizedCommand, sessionState);
        
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
      sessionStates.delete(sessionId);
      console.log(`Session ${sessionId} cleaned up`);
    }
  };

  socket.onerror = (error) => {
    console.error(`WebSocket error in session ${sessionId}:`, error);
  };

  return response;
});

function simulateCommand(command: string, state: SessionState): string {
  const cmd = command.toLowerCase().split(' ')[0];
  const args = command.split(' ').slice(1);

  switch (cmd) {
    case 'ls': {
      const targetDir = args[0] || state.currentDir;
      const path = targetDir.startsWith('/') ? targetDir : `${state.currentDir}/${targetDir}`;
      
      const entries: string[] = [];
      state.fileSystem.forEach((entry, entryPath) => {
        if (entryPath.startsWith(path + '/') && entryPath !== path) {
          const relativePath = entryPath.substring(path.length + 1);
          if (!relativePath.includes('/')) {
            entries.push(relativePath);
          }
        }
      });
      
      if (args.includes('-la') || args.includes('-al')) {
        const detailed = entries.map(name => {
          const fullPath = `${path}/${name}`;
          const entry = state.fileSystem.get(fullPath);
          const isDir = entry?.type === 'dir';
          return `${isDir ? 'd' : '-'}rwxr-xr-x  1 user group  ${isDir ? '96' : '1234'} Oct 25 14:30 ${name}`;
        });
        return detailed.join('\n') + '\n';
      }
      return entries.join('  ') + '\n';
    }

    case 'pwd':
      return state.currentDir + '\n';

    case 'cd': {
      if (!args[0]) {
        state.currentDir = '/home/termdesk';
        return '';
      }
      
      const targetPath = args[0].startsWith('/') ? args[0] : `${state.currentDir}/${args[0]}`;
      const normalizedPath = targetPath.replace(/\/+/g, '/').replace(/\/$/, '');
      
      if (state.fileSystem.has(normalizedPath) && state.fileSystem.get(normalizedPath)?.type === 'dir') {
        state.currentDir = normalizedPath;
        return '';
      }
      return `cd: ${args[0]}: No such directory\n`;
    }

    case 'mkdir': {
      if (!args[0]) {
        return 'mkdir: missing operand\n';
      }
      
      const targetPath = args[0].startsWith('/') ? args[0] : `${state.currentDir}/${args[0]}`;
      const normalizedPath = targetPath.replace(/\/+/g, '/').replace(/\/$/, '');
      
      if (state.fileSystem.has(normalizedPath)) {
        return `mkdir: cannot create directory '${args[0]}': File exists\n`;
      }
      
      state.fileSystem.set(normalizedPath, { type: 'dir' });
      return '';
    }

    case 'rm': {
      if (!args[0]) {
        return 'rm: missing operand\n';
      }
      
      const targetPath = args[0].startsWith('/') ? args[0] : `${state.currentDir}/${args[0]}`;
      const normalizedPath = targetPath.replace(/\/+/g, '/').replace(/\/$/, '');
      
      if (!state.fileSystem.has(normalizedPath)) {
        return `rm: cannot remove '${args[0]}': No such file or directory\n`;
      }
      
      const entry = state.fileSystem.get(normalizedPath);
      if (entry?.type === 'dir' && !args.includes('-r')) {
        return `rm: cannot remove '${args[0]}': Is a directory\n`;
      }
      
      // Remove the entry and any subdirectories/files
      if (args.includes('-r')) {
        const toDelete: string[] = [];
        state.fileSystem.forEach((_, path) => {
          if (path === normalizedPath || path.startsWith(normalizedPath + '/')) {
            toDelete.push(path);
          }
        });
        toDelete.forEach(path => state.fileSystem.delete(path));
      } else {
        state.fileSystem.delete(normalizedPath);
      }
      
      return '';
    }

    case 'whoami':
      return 'termdesk-user\n';

    case 'date':
      return new Date().toString() + '\n';

    case 'echo':
      return args.join(' ') + '\n';

    case 'cat': {
      const targetPath = args[0]?.startsWith('/') ? args[0] : `${state.currentDir}/${args[0]}`;
      const normalizedPath = targetPath.replace(/\/+/g, '/');
      
      const entry = state.fileSystem.get(normalizedPath);
      if (!entry) {
        return `cat: ${args[0] || 'file'}: No such file or directory\n`;
      }
      if (entry.type === 'dir') {
        return `cat: ${args[0]}: Is a directory\n`;
      }
      return entry.content || '';
    }

    case 'help':
      return 'Available commands:\n  ls [-la] [dir] - List directory contents\n  pwd            - Print working directory\n  cd <dir>       - Change directory\n  mkdir <dir>    - Create directory\n  rm [-r] <file> - Remove file or directory\n  cat <file>     - Display file contents\n  whoami         - Print current user\n  date           - Show current date and time\n  echo <text>    - Print text\n  clear          - Clear terminal\n  uname          - Show system information\n  env            - Show environment variables\n  help           - Show this help message\n\nNote: This is a simulated terminal for demonstration.\n';

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
