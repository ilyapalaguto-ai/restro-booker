import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { getAuthHeaders } from '@/lib/auth';

interface UserCreateDialogProps {
  open: boolean;
  onClose: () => void;
  restaurants: any[];
}

export function UserCreateDialog({ open, onClose, restaurants }: UserCreateDialogProps) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [isActive, setIsActive] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const UNASSIGNED = 'none';

  const reset = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRole('customer');
    setIsActive(true);
    setRestaurantId(null);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { firstName, lastName, email, phone, password, role, isActive };
      payload.restaurantId = role === 'restaurant_manager' ? restaurantId : null;
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(getAuthHeaders() as Record<string,string>) },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Не удалось создать пользователя');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Пользователь создан' });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      onClose();
      reset();
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message })
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !createMutation.isPending && onClose()}>
      <DialogContent className="max-w-lg" data-testid="dialog-create-user">
        <DialogHeader>
          <DialogTitle>Создание пользователя</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="c-firstName">Имя</Label>
              <Input id="c-firstName" value={firstName} onChange={e=>setFirstName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="c-lastName">Фамилия</Label>
              <Input id="c-lastName" value={lastName} onChange={e=>setLastName(e.target.value)} required />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="c-email">Email</Label>
              <Input id="c-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="c-phone">Телефон</Label>
              <Input id="c-phone" value={phone} onChange={e=>setPhone(e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="c-password">Пароль</Label>
              <Input id="c-password" type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Роль</Label>
              <Select value={role} onValueChange={(v)=> setRole(v)}>
                <SelectTrigger className="h-9" data-testid="select-role-create">
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
                <Switch checked={isActive} onCheckedChange={setIsActive} id="c-active" />
                <Label htmlFor="c-active" className="text-sm">{isActive ? 'Активный' : 'Неактивный'}</Label>
              </div>
            </div>
            {role === 'restaurant_manager' && (
              <div className="space-y-1 md:col-span-2">
                <Label>Ресторан</Label>
                <Select value={restaurantId ?? UNASSIGNED} onValueChange={(v)=> setRestaurantId(v === UNASSIGNED ? null : v)}>
                  <SelectTrigger className="h-9" data-testid="select-restaurant-create">
                    <SelectValue placeholder="Выберите ресторан" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>— Не назначен —</SelectItem>
                    {restaurants.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={createMutation.isPending}>Отмена</Button>
            <Button type="submit" size="sm" disabled={createMutation.isPending} data-testid="btn-create-user">
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
