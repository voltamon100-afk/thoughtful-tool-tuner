import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface SessionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  buttonText: string;
  onClick: () => void;
}

const SessionCard = ({ icon: Icon, title, description, buttonText, onClick }: SessionCardProps) => {
  return (
    <Card className="p-8 bg-card border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)] group">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="p-4 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors duration-300">
          <Icon className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
        <Button onClick={onClick} variant="terminal" size="lg" className="w-full mt-4">
          {buttonText}
        </Button>
      </div>
    </Card>
  );
};

export default SessionCard;
