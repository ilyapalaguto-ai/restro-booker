import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/auth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Calendar, DollarSign } from "lucide-react";

export default function AdminDashboard() {
  const [selectedDate] = useState(new Date());
  
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

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto">
        <Header 
          title="Админская панель"
          subtitle={`Общий обзор системы - ${selectedDate.toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}`}
          showNewBooking={false}
        />
        
        <div className="p-6 space-y-6">
          {/* System Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card data-testid="card-restaurants">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Всего ресторанов</p>
                    <p className="text-2xl font-semibold text-foreground mt-1">{restaurants.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-users">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Всего пользователей</p>
                    <p className="text-2xl font-semibold text-foreground mt-1">{users.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-bookings">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Бронирований сегодня</p>
                    <p className="text-2xl font-semibold text-foreground mt-1">-</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-revenue">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Общая выручка</p>
                    <p className="text-2xl font-semibold text-foreground mt-1">-</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Restaurants Management */}
          <Card data-testid="card-restaurants-list">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Управление ресторанами</CardTitle>
                  <CardDescription>Список всех ресторанов в системе</CardDescription>
                </div>
                <Button data-testid="button-add-restaurant">
                  Добавить ресторан
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {restaurants.length === 0 ? (
                <div className="text-center py-8" data-testid="empty-restaurants">
                  <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Рестораны не найдены</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {restaurants.map((restaurant: any) => (
                    <div 
                      key={restaurant.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`restaurant-item-${restaurant.id}`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{restaurant.name}</h3>
                          <p className="text-sm text-muted-foreground">{restaurant.address}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={restaurant.isActive ? "default" : "secondary"}>
                          {restaurant.isActive ? "Активный" : "Неактивный"}
                        </Badge>
                        <Button variant="outline" size="sm">
                          Управление
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Users Management */}
          <Card data-testid="card-users-list">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Управление пользователями</CardTitle>
                  <CardDescription>Список всех пользователей системы</CardDescription>
                </div>
                <Button data-testid="button-add-user">
                  Добавить пользователя
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-center py-8" data-testid="empty-users">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Пользователи не найдены</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {users.map((user: any) => (
                    <div 
                      key={user.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`user-item-${user.id}`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{user.firstName} {user.lastName}</h3>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          {user.role === 'admin' ? 'Администратор' : 
                           user.role === 'restaurant_manager' ? 'Менеджер' : 'Клиент'}
                        </Badge>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Активный" : "Неактивный"}
                        </Badge>
                        <Button variant="outline" size="sm">
                          Редактировать
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
