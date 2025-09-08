import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingWithDetails } from "@shared/schema";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface BookingCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  bookings: BookingWithDetails[];
}

export default function BookingCalendar({ selectedDate, onDateSelect, bookings }: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  const getBookingsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.startTime).toISOString().split('T')[0];
      return bookingDate === dateStr;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'booking-status-confirmed';
      case 'pending': return 'booking-status-pending';
      case 'cancelled': return 'booking-status-cancelled';
      default: return 'bg-gray-500';
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1; // Convert Sunday (0) to be last (6)
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onDateSelect(newDate);
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayOffset = getFirstDayOfMonth(currentMonth);
  
  // Get previous month's last days
  const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  const daysInPrevMonth = getDaysInMonth(prevMonth);
  const prevMonthDays = Array.from({ length: firstDayOffset }, (_, i) => 
    daysInPrevMonth - firstDayOffset + i + 1
  );

  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  const totalCells = prevMonthDays.length + currentMonthDays.length;
  const nextMonthDays = Array.from({ length: 42 - totalCells }, (_, i) => i + 1);

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  return (
    <Card data-testid="booking-calendar">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Календарь бронирований</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth('prev')}
              data-testid="button-prev-month"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium px-3" data-testid="current-month">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth('next')}
              data-testid="button-next-month"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {/* Previous month days */}
          {prevMonthDays.map(day => (
            <div
              key={`prev-${day}`}
              className="calendar-day p-3 text-center text-sm text-muted-foreground hover:bg-muted rounded-lg cursor-pointer"
              data-testid={`calendar-day-prev-${day}`}
            >
              {day}
            </div>
          ))}

          {/* Current month days */}
          {currentMonthDays.map(day => {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const dayBookings = getBookingsForDate(date);
            const isCurrentDay = isToday(date);
            const isSelectedDay = isSelected(date);

            return (
              <div
                key={day}
                onClick={() => handleDateClick(day)}
                className={cn(
                  "calendar-day p-3 text-center text-sm hover:bg-muted rounded-lg cursor-pointer font-medium relative transition-all duration-200",
                  isCurrentDay && "bg-primary text-primary-foreground font-semibold",
                  isSelectedDay && !isCurrentDay && "bg-accent text-accent-foreground",
                  "hover:transform hover:-translate-y-0.5"
                )}
                data-testid={`calendar-day-${day}`}
              >
                {day}
                {dayBookings.length > 0 && (
                  <div className="flex justify-center mt-1 space-x-1">
                    {dayBookings.slice(0, 4).map((booking, index) => (
                      <div
                        key={booking.id}
                        className={cn(
                          "w-2 h-2 rounded-full",
                          isCurrentDay ? "bg-white" : getStatusColor(booking.status)
                        )}
                        title={`${booking.customer.firstName} ${booking.customer.lastName} - ${booking.status}`}
                      />
                    ))}
                    {dayBookings.length > 4 && (
                      <div className="text-xs">+{dayBookings.length - 4}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Next month days */}
          {nextMonthDays.map(day => (
            <div
              key={`next-${day}`}
              className="calendar-day p-3 text-center text-sm text-muted-foreground hover:bg-muted rounded-lg cursor-pointer"
              data-testid={`calendar-day-next-${day}`}
            >
              {day}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
