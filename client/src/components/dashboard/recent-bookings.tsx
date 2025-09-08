import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookingWithDetails } from "@shared/schema";
import { useUpdateBooking, useDeleteBooking } from "@/hooks/use-bookings";
import { useToast } from "@/hooks/use-toast";
import { Edit, X, Phone, Clock } from "lucide-react";

interface RecentBookingsProps {
  bookings: BookingWithDetails[];
}

export default function RecentBookings({ bookings }: RecentBookingsProps) {
  const [editingBooking, setEditingBooking] = useState<string | null>(null);
  const { toast } = useToast();
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'completed': return 'outline';
      default: return 'secondary';
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

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      await updateBooking.mutateAsync({
        id: bookingId,
        updates: { status: newStatus as any }
      });
      
      toast({
        title: "Статус обновлен",
        description: `Бронирование ${getStatusText(newStatus).toLowerCase()}`,
      });
      
      setEditingBooking(null);
    } catch (error: any) {
      toast({
        title: "Ошибка обновления",
        description: error.message || "Не удалось обновить статус",
        variant: "destructive",
      });
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await updateBooking.mutateAsync({
        id: bookingId,
        updates: { status: 'cancelled' }
      });
      
      toast({
        title: "Бронирование отменено",
        description: "Бронирование успешно отменено",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка отмены",
        description: error.message || "Не удалось отменить бронирование",
        variant: "destructive",
      });
    }
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('ru-RU'),
      time: date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]?.toUpperCase() || ''}${lastName[0]?.toUpperCase() || ''}`;
  };

  const getAvatarColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-600';
      case 'pending': return 'bg-blue-100 text-blue-600';
      case 'cancelled': return 'bg-red-100 text-red-600';
      case 'completed': return 'bg-gray-100 text-gray-600';
      default: return 'bg-blue-100 text-blue-600';
    }
  };

  const sortedBookings = [...bookings].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Card data-testid="recent-bookings">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Последние бронирования</CardTitle>
          <Button variant="ghost" size="sm" data-testid="button-view-all">
            Посмотреть все
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {sortedBookings.length === 0 ? (
          <div className="text-center py-8" data-testid="empty-bookings">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Бронирования не найдены</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Клиент</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Дата и время</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Стол</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Гости</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Статус</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedBookings.slice(0, 10).map((booking) => {
                  const { date, time } = formatDateTime(booking.startTime);
                  return (
                    <tr 
                      key={booking.id}
                      className="hover:bg-muted/30 transition-colors"
                      data-testid={`booking-row-${booking.id}`}
                    >
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getAvatarColor(booking.status)}`}>
                            <span className="text-sm font-medium">
                              {getInitials(booking.customer.firstName, booking.customer.lastName)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {booking.customer.firstName} {booking.customer.lastName}
                            </p>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Phone className="w-3 h-3 mr-1" />
                              {booking.customer.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <div className="font-medium">{date}</div>
                          <div className="text-muted-foreground">{time}</div>
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        {booking.table?.name || <span className="text-muted-foreground">Не назначен</span>}
                      </td>
                      <td className="p-4 text-sm font-medium">
                        {booking.partySize}
                      </td>
                      <td className="p-4">
                        {editingBooking === booking.id ? (
                          <div className="space-y-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(booking.id, 'confirmed')}
                              className="w-full justify-start text-xs"
                            >
                              Подтвердить
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(booking.id, 'cancelled')}
                              className="w-full justify-start text-xs"
                            >
                              Отменить
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingBooking(null)}
                              className="w-full justify-start text-xs"
                            >
                              Закрыть
                            </Button>
                          </div>
                        ) : (
                          <Badge variant={getStatusVariant(booking.status)}>
                            {getStatusText(booking.status)}
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingBooking(booking.id === editingBooking ? null : booking.id)}
                            data-testid={`button-edit-${booking.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelBooking(booking.id)}
                            disabled={booking.status === 'cancelled'}
                            data-testid={`button-cancel-${booking.id}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
