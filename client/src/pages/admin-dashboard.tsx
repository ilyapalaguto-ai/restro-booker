import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/auth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Calendar, DollarSign } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserEditDialog } from "@/components/admin/user-edit-dialog";
import { UserCreateDialog } from "@/components/admin/user-create-dialog";

export default function AdminDashboard() {
  const [selectedDate] = useState(new Date());
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [manageRestaurantId, setManageRestaurantId] = useState<string | null>(null);
  
  const { data: restaurants = [] } = useQuery({
    queryKey: ['/api/restaurants'],
    queryFn: async () => {
    const response = await fetch('/api/restaurants', { headers: getAuthHeaders() as Record<string,string> });
      if (!response.ok) throw new Error('Failed to fetch restaurants');
      return response.json();
    }
  });

  const [roleFilter, setRoleFilter] = useState<string>('all');
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users', roleFilter],
    queryFn: async () => {
    const url = roleFilter === 'all' ? '/api/users' : `/api/users?role=${roleFilter}`;
    const response = await fetch(url, { headers: getAuthHeaders() as Record<string,string> });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, restaurantId }: { id: string; restaurantId: string | null }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(getAuthHeaders() as Record<string,string>) },
        body: JSON.stringify({ restaurantId })
      });
      if (!res.ok) throw new Error('Failed to update user');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: 'Сохранено' });
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message })
  });

  const managers = users.filter((u: any) => u.role === 'restaurant_manager');
  const activeRestaurant = (restaurants as any[]).find(r => r.id === manageRestaurantId);

  // User edit state
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

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
                <Button data-testid="button-add-restaurant" onClick={() => navigate('/admin/restaurants?create=1')}>
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
                        <Button variant="outline" size="sm" onClick={() => setManageRestaurantId(restaurant.id)}>
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
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <CardTitle>Управление пользователями</CardTitle>
                  <CardDescription>Список всех пользователей системы</CardDescription>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-48">
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger data-testid="select-role-filter" className="h-9">
                        <SelectValue placeholder="Роль" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все роли</SelectItem>
                        <SelectItem value="admin">Администраторы</SelectItem>
                        <SelectItem value="restaurant_manager">Менеджеры</SelectItem>
                        <SelectItem value="customer">Клиенты</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {roleFilter !== 'all' && (
                    <Button variant="ghost" size="sm" onClick={() => setRoleFilter('all')} data-testid="btn-reset-role-filter">
                      Сбросить фильтр
                    </Button>
                  )}
                  <Button data-testid="button-add-user" onClick={()=> setCreateOpen(true)}>
                    Добавить пользователя
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-center py-8" data-testid="empty-users">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{roleFilter==='all' ? 'Пользователи не найдены' : 'Нет пользователей выбранной роли'}</p>
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
                        <Button variant="outline" size="sm" onClick={() => setEditingUser(user)} data-testid={`btn-edit-user-${user.id}`}>
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

      <Dialog open={!!manageRestaurantId} onOpenChange={(o)=> !o && setManageRestaurantId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Назначение менеджеров {activeRestaurant ? `– ${activeRestaurant.name}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto" data-testid="dialog-managers">
            {managers.length === 0 && (
              <p className="text-sm text-muted-foreground">Нет пользователей с ролью менеджер.</p>
            )}
            {managers.map((m: any) => {
              const assigned = m.restaurantId === manageRestaurantId;
              return (
                <div key={m.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">{m.firstName} {m.lastName}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                    {m.restaurantId && !assigned && (
                      <p className="text-xs text-amber-600 mt-1">Уже привязан к другому ресторану</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {assigned && <Badge variant="default">Назначен</Badge>}
                    <Button
                      size="sm"
                      variant={assigned ? 'destructive' : 'outline'}
                      disabled={updateUserMutation.isPending}
                      onClick={() => updateUserMutation.mutate({ id: m.id, restaurantId: assigned ? null : manageRestaurantId })}
                      data-testid={`btn-toggle-manager-${m.id}`}
                    >
                      {assigned ? 'Снять' : (m.restaurantId && m.restaurantId !== manageRestaurantId ? 'Переназначить' : 'Назначить')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end pt-4">
            <Button variant="outline" size="sm" onClick={()=> setManageRestaurantId(null)}>Закрыть</Button>
          </div>
        </DialogContent>
      </Dialog>

  <UserEditDialog user={editingUser} restaurants={restaurants} onClose={() => setEditingUser(null)} />
  <UserCreateDialog open={createOpen} restaurants={restaurants} onClose={()=> setCreateOpen(false)} />
    </div>
  );
}
