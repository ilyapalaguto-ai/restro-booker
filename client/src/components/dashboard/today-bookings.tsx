import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookingWithDetails } from "@shared/schema";
import { Clock } from "lucide-react";

interface TodayBookingsProps {
  bookings: BookingWithDetails[];
}

export default function TodayBookings({ bookings }: TodayBookingsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Подтверждено';
      case 'pending': return 'Ожидает';
      case 'cancelled': return 'Отменено';
      case 'completed': return 'Завершено';
      default: return status;
    }
  };

  return (
    <Card data-testid="today-bookings">
      <CardHeader>
        <CardTitle>Сегодня</CardTitle>
        <p className="text-muted-foreground text-sm mt-1">
          {bookings.length} {bookings.length === 1 ? 'бронирование' : 'бронирований'}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4 max-h-96 overflow-y-auto">
        {bookings.length === 0 ? (
          <div className="text-center py-8" data-testid="empty-bookings">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Бронирований на сегодня нет</p>
          </div>
        ) : (
          bookings.map((booking) => (
            <div 
              key={booking.id} 
              className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
              data-testid={`booking-item-${booking.id}`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 ${getStatusColor(booking.status)} rounded-full`}></div>
                <div>
                  <p className="font-medium text-sm">
                    {booking.customer.firstName} {booking.customer.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {booking.table?.name || 'Стол не назначен'} • {booking.partySize} чел.
                  </p>
                </div>
              </div>
              <div className="text-right">
                {booking.status === 'cancelled' ? (
                  <Badge variant="destructive" className="text-xs">
                    {getStatusText(booking.status)}
                  </Badge>
                ) : (
                  <span className="text-sm font-medium">
                    {new Date(booking.startTime).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
