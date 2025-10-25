import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Terminal, Users, Send, LogOut, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Member {
  id: string;
  name: string;
  isHost: boolean;
}

const Session = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [command, setCommand] = useState("");
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "Welcome to TermDesk Session",
    `Session ID: ${sessionId}`,
    "Waiting for commands...",
  ]);
  const [members, setMembers] = useState<Member[]>([
    { id: "1", name: "Host (You)", isHost: true },
  ]);
  const [copied, setCopied] = useState(false);

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
    if (command.trim()) {
      setTerminalOutput((prev) => [
        ...prev,
        `$ ${command}`,
        `> Executing command... (backend integration needed)`,
      ]);
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
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm">
                    {member.name}
                    {member.isHost && (
                      <span className="ml-2 text-xs text-primary">[HOST]</span>
                    )}
                  </span>
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
              <div className="space-y-1 text-[hsl(var(--terminal-text))]">
                {terminalOutput.map((line, index) => (
                  <div
                    key={index}
                    className={line.startsWith("$") ? "text-primary font-semibold" : ""}
                  >
                    {line}
                  </div>
                ))}
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
                />
                <Button type="submit" variant="default" className="gap-2">
                  <Send className="w-4 h-4" />
                  Execute
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-2">
                Commands will be executed on the host machine. Backend integration required for live execution.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Session;
