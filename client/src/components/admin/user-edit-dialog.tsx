import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { getAuthHeaders } from '@/lib/auth';

interface UserEditDialogProps {
  user: any | null;
  restaurants: any[];
  onClose: () => void;
}

export function UserEditDialog({ user, restaurants, onClose }: UserEditDialogProps) {
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('customer');
  const [isActive, setIsActive] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const UNASSIGNED_VALUE = 'none';

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setRole(user.role || 'customer');
      setIsActive(user.isActive ?? true);
      setRestaurantId(user.restaurantId || null);
    }
  }, [user]);

  // When switching away from manager role, clear restaurantId locally
  useEffect(() => {
    if (role !== 'restaurant_manager') {
      setRestaurantId(null);
    }
  }, [role]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const payload: any = {
        firstName,
        lastName,
        email,
        phone,
        role,
        isActive,
  restaurantId: role === 'restaurant_manager' ? restaurantId : null,
      };
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(getAuthHeaders() as Record<string,string>) },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Не удалось обновить пользователя');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Пользователь обновлён' });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      onClose();
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message })
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && !updateMutation.isPending && onClose()}>
      <DialogContent className="max-w-lg" data-testid="dialog-edit-user">
        <DialogHeader>
          <DialogTitle>Редактирование пользователя{user ? ` – ${user.firstName} ${user.lastName}` : ''}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="firstName">Имя</Label>
              <Input id="firstName" data-testid="input-first-name" value={firstName} onChange={e=>setFirstName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">Фамилия</Label>
              <Input id="lastName" data-testid="input-last-name" value={lastName} onChange={e=>setLastName(e.target.value)} required />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" data-testid="input-email" value={email} onChange={e=>setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" data-testid="input-phone" value={phone} onChange={e=>setPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Роль</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger data-testid="select-role-edit" className="h-9">
                  <SelectValue placeholder="Роль" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Администратор</SelectItem>
                  <SelectItem value="restaurant_manager">Менеджер</SelectItem>
                  <SelectItem value="customer">Клиент</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 flex flex-col justify-end">
              <Label className="mb-1">Статус</Label>
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} data-testid="switch-active" id="active-switch" />
                <Label htmlFor="active-switch" className="text-sm">{isActive ? 'Активный' : 'Неактивный'}</Label>
              </div>
            </div>
            {role === 'restaurant_manager' && (
              <div className="space-y-1 md:col-span-2">
                <Label>Ресторан</Label>
                <Select
                  value={restaurantId ?? UNASSIGNED_VALUE}
                  onValueChange={(v)=> setRestaurantId(v === UNASSIGNED_VALUE ? null : v)}
                >
                  <SelectTrigger data-testid="select-restaurant-edit" className="h-9">
                    <SelectValue placeholder="Выберите ресторан" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_VALUE}>— Не назначен —</SelectItem>
                    {restaurants.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={updateMutation.isPending}>Отмена</Button>
            <Button type="submit" size="sm" disabled={updateMutation.isPending} data-testid="btn-save-user">
              {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
