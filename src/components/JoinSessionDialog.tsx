import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface JoinSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const JoinSessionDialog = ({ open, onOpenChange }: JoinSessionDialogProps) => {
  const [sessionId, setSessionId] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleJoin = () => {
    if (!sessionId.trim() || !username.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both session ID and username",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Joining session",
      description: `Connecting to session ${sessionId}...`,
    });
    
    navigate(`/session/${sessionId}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-primary/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="w-5 h-5 text-primary" />
            Join Session
          </DialogTitle>
          <DialogDescription>
            Enter the session ID shared by the host to join their terminal
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Your Name</Label>
            <Input
              id="username"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-id">Session ID</Label>
            <Input
              id="session-id"
              placeholder="e.g., abc-123-def"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="bg-background border-border font-mono"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleJoin} className="flex-1">
            Join Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JoinSessionDialog;
