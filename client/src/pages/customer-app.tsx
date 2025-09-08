import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getAuthHeaders } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Search, MapPin, Clock, Users, Star } from "lucide-react";
import BookingForm from "@/components/booking/booking-form";

export default function CustomerApp() {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);

  const { data: restaurants = [] } = useQuery({
    queryKey: ['/api/restaurants'],
    queryFn: async () => {
      const response = await fetch('/api/restaurants', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch restaurants');
      return response.json();
    }
  });

  const { data: myBookings = [] } = useQuery({
    queryKey: ['/api/bookings', 'my'],
    queryFn: async () => {
      const response = await fetch('/api/bookings', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch bookings');
      return response.json();
    }
  });

  const filteredRestaurants = restaurants.filter((restaurant: any) =>
    restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    restaurant.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBookRestaurant = (restaurantId: string) => {
    setSelectedRestaurant(restaurantId);
    setShowBookingForm(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">RestaurantCRM</h1>
              <p className="text-sm text-muted-foreground">Бронирование столиков</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
              <span className="text-sm font-medium">{user?.firstName} {user?.lastName}</span>
            </div>
            <Button variant="outline" onClick={logout} data-testid="button-logout">
              Выйти
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Search */}
        <Card data-testid="card-search">
          <CardHeader>
            <CardTitle>Найти ресторан</CardTitle>
            <CardDescription>Найдите и забронируйте столик в лучших ресторанах</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию или адресу..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
          </CardContent>
        </Card>

        {/* Restaurants */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRestaurants.map((restaurant: any) => (
            <Card key={restaurant.id} className="hover:shadow-lg transition-shadow" data-testid={`restaurant-card-${restaurant.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{restaurant.name}</CardTitle>
                      <div className="flex items-center space-x-1 mt-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm text-muted-foreground">4.5 (123 отзыва)</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">Открыт</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-2" />
                    {restaurant.address}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-2" />
                    09:00 - 23:00
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="w-4 h-4 mr-2" />
                    До 50 человек
                  </div>
                </div>
                
                {restaurant.description && (
                  <p className="text-sm text-muted-foreground">{restaurant.description}</p>
                )}
                
                <Button 
                  className="w-full" 
                  onClick={() => handleBookRestaurant(restaurant.id)}
                  data-testid={`button-book-${restaurant.id}`}
                >
                  Забронировать стол
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredRestaurants.length === 0 && (
          <Card data-testid="empty-restaurants">
            <CardContent className="text-center py-12">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Рестораны не найдены</h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'В системе пока нет доступных ресторанов'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* My Bookings */}
        <Card data-testid="card-my-bookings">
          <CardHeader>
            <CardTitle>Мои бронирования</CardTitle>
            <CardDescription>История и активные бронирования</CardDescription>
          </CardHeader>
          <CardContent>
            {myBookings.length === 0 ? (
              <div className="text-center py-8" data-testid="empty-bookings">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">У вас пока нет бронирований</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myBookings.map((booking: any) => (
                  <div 
                    key={booking.id} 
                    className="flex items-center justify-between p-4 border rounded-lg"
                    data-testid={`booking-item-${booking.id}`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{booking.restaurant?.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(booking.startTime).toLocaleDateString('ru-RU')} в{' '}
                          {new Date(booking.startTime).toLocaleTimeString('ru-RU', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {booking.partySize} {booking.partySize === 1 ? 'человек' : 'человека'}
                          {booking.table && ` • ${booking.table.name}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={
                          booking.status === 'confirmed' ? 'default' :
                          booking.status === 'pending' ? 'secondary' :
                          'destructive'
                        }
                      >
                        {booking.status === 'confirmed' ? 'Подтверждено' :
                         booking.status === 'pending' ? 'Ожидает' : 'Отменено'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showBookingForm && selectedRestaurant && (
        <BookingForm
          restaurantId={selectedRestaurant}
          onClose={() => {
            setShowBookingForm(false);
            setSelectedRestaurant(null);
          }}
          onSuccess={() => {
            setShowBookingForm(false);
            setSelectedRestaurant(null);
          }}
        />
      )}
    </div>
  );
}
