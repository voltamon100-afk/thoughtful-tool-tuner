import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Terminal, Plus, LogIn } from "lucide-react";
import SessionCard from "@/components/SessionCard";
import JoinSessionDialog from "@/components/JoinSessionDialog";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleStartSession = () => {
    const sessionId = `${Math.random().toString(36).substr(2, 3)}-${Math.random().toString(36).substr(2, 3)}-${Math.random().toString(36).substr(2, 3)}`;
    
    toast({
      title: "Session created",
      description: `Your session ID is ${sessionId}`,
    });
    
    navigate(`/session/${sessionId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.1)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="relative max-w-6xl mx-auto px-4 py-20 sm:py-32">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center gap-3 p-3 bg-primary/10 rounded-2xl">
              <Terminal className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-pulse">
                TermDesk
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Share your terminal in real-time. Collaborate seamlessly with your team, just like video calls but for terminals.
            </p>
            
            {/* Session Cards */}
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto pt-12">
              <SessionCard
                icon={Plus}
                title="Start Session"
                description="Create a new terminal session and share it with your team"
                buttonText="Create Session"
                onClick={handleStartSession}
              />
              <SessionCard
                icon={LogIn}
                title="Join Session"
                description="Join an existing terminal session using a session ID"
                buttonText="Join Session"
                onClick={() => setJoinDialogOpen(true)}
              />
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-16">
              <div className="p-6 bg-card/50 border border-border rounded-lg">
                <div className="text-primary font-mono text-lg mb-2">→ Real-time</div>
                <p className="text-sm text-muted-foreground">Live terminal sharing with instant command execution</p>
              </div>
              <div className="p-6 bg-card/50 border border-border rounded-lg">
                <div className="text-primary font-mono text-lg mb-2">→ Collaborative</div>
                <p className="text-sm text-muted-foreground">See all members and collaborate seamlessly</p>
              </div>
              <div className="p-6 bg-card/50 border border-border rounded-lg">
                <div className="text-primary font-mono text-lg mb-2">→ Secure</div>
                <p className="text-sm text-muted-foreground">Session-based access with unique IDs</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <JoinSessionDialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen} />
    </div>
  );
};

export default Index;
