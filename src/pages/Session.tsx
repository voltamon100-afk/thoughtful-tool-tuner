import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Terminal, Users, Send, LogOut, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTerminalSession } from "@/hooks/useTerminalSession";
import { useSessionPresence } from "@/hooks/useSessionPresence";

const Session = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [command, setCommand] = useState("");
  const [copied, setCopied] = useState(false);
  const [username] = useState(`User-${Math.random().toString(36).substring(7)}`);
  const terminalRef = useRef<HTMLDivElement>(null);

  const { terminalOutput, isConnected, sendCommand } = useTerminalSession(sessionId || '');
  const { members } = useSessionPresence(sessionId || '', username);

  const handleCopySessionId = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Session ID copied to clipboard",
      });
    }
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim() && isConnected) {
      sendCommand(command);
      setCommand("");
    }
  };

  const handleLeaveSession = () => {
    toast({
      title: "Left session",
      description: "You have left the terminal session",
    });
    navigate("/");
  };

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Terminal className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">TermDesk Session</h1>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm text-muted-foreground">{sessionId}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopySessionId}
                  className="h-6 w-6 p-0"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
                <div className="flex items-center gap-2 ml-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-primary animate-pulse' : 'bg-destructive'}`} />
                  <span className="text-xs text-muted-foreground">
                    {isConnected ? 'Connected' : 'Connecting...'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <Button variant="destructive" onClick={handleLeaveSession}>
            <LogOut className="w-4 h-4 mr-2" />
            Leave Session
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Members Panel */}
          <Card className="lg:col-span-1 p-4 bg-card border-border">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Members ({members.length})</h2>
            </div>
            <div className="space-y-2">
              {members.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  Waiting for members...
                </div>
              )}
              {members.map((member, index) => (
                <div
                  key={`${member.userId}-${index}`}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm">{member.username}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Terminal & Command Bar */}
          <div className="lg:col-span-3 space-y-4">
            {/* Terminal Output */}
            <Card className="p-4 bg-[hsl(var(--terminal-bg))] border-primary/20 min-h-[500px] font-mono text-sm">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-primary/20">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-primary" />
                </div>
                <span className="text-xs text-muted-foreground ml-2">terminal</span>
              </div>
              <div 
                ref={terminalRef}
                className="space-y-1 text-[hsl(var(--terminal-text))] max-h-[450px] overflow-y-auto"
              >
                <div className="text-secondary">Welcome to TermDesk Session {sessionId}</div>
                <div className="text-muted-foreground mb-2">
                  {isConnected 
                    ? `Connected as ${username}. Start typing commands...`
                    : 'Connecting to terminal session...'}
                </div>
                
                {terminalOutput.map((line, index) => (
                  <div
                    key={index}
                    className={line.startsWith("$") ? "text-primary font-semibold" : "whitespace-pre-wrap"}
                  >
                    {line}
                  </div>
                ))}
                
                {terminalOutput.length === 0 && isConnected && (
                  <div className="text-muted-foreground">
                    Ready to execute commands. Try 'ls', 'pwd', 'date', or 'echo Hello'
                  </div>
                )}
                
                <div className="flex items-center">
                  <span className="text-primary animate-pulse">▮</span>
                </div>
              </div>
            </Card>

            {/* Command Bar */}
            <Card className="p-4 bg-card border-primary/30">
              <form onSubmit={handleCommand} className="flex gap-2">
                <Input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="Enter command (e.g., ls, pwd, echo 'Hello')..."
                  className="flex-1 bg-background border-border font-mono text-foreground focus:border-primary"
                  disabled={!isConnected}
                />
                <Button type="submit" variant="default" className="gap-2" disabled={!isConnected || !command.trim()}>
                  <Send className="w-4 h-4" />
                  Execute
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-2">
                {isConnected 
                  ? 'Commands are executed in real-time on the edge function environment.'
                  : 'Connecting to terminal session...'}
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Session;
