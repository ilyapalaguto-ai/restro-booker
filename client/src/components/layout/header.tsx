import { Button } from "@/components/ui/button";
import { Bell, Plus } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle: string;
  onNewBooking?: () => void;
  showNewBooking?: boolean;
}

export default function Header({ 
  title, 
  subtitle, 
  onNewBooking, 
  showNewBooking = true 
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-border px-6 py-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground" data-testid="header-title">
            {title}
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="header-subtitle">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {showNewBooking && onNewBooking && (
            <Button 
              onClick={onNewBooking}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-new-booking"
            >
              <Plus className="w-4 h-4 mr-2" />
              Новая бронь
            </Button>
          )}
          <Button variant="ghost" size="icon" data-testid="button-notifications">
            <Bell className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
