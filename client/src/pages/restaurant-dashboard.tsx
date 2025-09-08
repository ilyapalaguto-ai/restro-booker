import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useBookings, useRestaurantStats } from "@/hooks/use-bookings";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import StatsOverview from "@/components/dashboard/stats-overview";
import BookingCalendar from "@/components/booking/booking-calendar";
import TodayBookings from "@/components/dashboard/today-bookings";
import FloorPlanEditor from "@/components/floor-plan/floor-plan-editor";
import RecentBookings from "@/components/dashboard/recent-bookings";
import BookingForm from "@/components/booking/booking-form";

export default function RestaurantDashboard() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showBookingForm, setShowBookingForm] = useState(false);
  
  const restaurantId = user?.restaurantId || '';
  const todayStr = new Date().toISOString().split('T')[0];
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  
  const { data: todayBookings = [] } = useBookings(restaurantId, todayStr);
  const { data: selectedDateBookings = [] } = useBookings(restaurantId, selectedDateStr);
  const { data: stats } = useRestaurantStats(restaurantId, todayStr);

  if (!user || !restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="error-no-restaurant">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Ошибка</h1>
          <p className="text-muted-foreground mt-2">Ресторан не найден</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto">
        <Header 
          title="Управление бронированиями"
          subtitle={`Сегодня, ${new Date().toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}`}
          onNewBooking={() => setShowBookingForm(true)}
        />
        
        <div className="p-6 space-y-6">
          <StatsOverview stats={stats} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <BookingCalendar 
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                bookings={selectedDateBookings}
              />
            </div>
            
            <TodayBookings bookings={todayBookings} />
          </div>
          
          <FloorPlanEditor restaurantId={restaurantId} />
          
          <RecentBookings bookings={selectedDateBookings} />
        </div>
      </main>

      {showBookingForm && (
        <BookingForm
          restaurantId={restaurantId}
          onClose={() => setShowBookingForm(false)}
          onSuccess={() => {
            setShowBookingForm(false);
          }}
        />
      )}
    </div>
  );
}
