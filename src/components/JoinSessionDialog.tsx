import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
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

// Input validation schema
const joinSessionSchema = z.object({
  sessionId: z.string()
    .trim()
    .min(1, "Session ID is required")
    .max(50, "Session ID is too long")
    .regex(/^[a-z0-9-]+$/, "Session ID must contain only lowercase letters, numbers, and hyphens"),
  username: z.string()
    .trim()
    .min(1, "Username is required")
    .max(50, "Username must be less than 50 characters")
    .regex(/^[a-zA-Z0-9_\s-]+$/, "Username contains invalid characters"),
});

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
    // Validate inputs
    const result = joinSessionSchema.safeParse({ sessionId, username });
    
    if (!result.success) {
      const error = result.error.errors[0];
      toast({
        title: "Invalid input",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Joining session",
      description: `Connecting to session ${result.data.sessionId}...`,
    });
    
    navigate(`/session/${result.data.sessionId}`);
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
