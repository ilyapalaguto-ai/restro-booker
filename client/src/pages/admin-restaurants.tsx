import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getAuthHeaders } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Loader2, Trash2 } from "lucide-react";

// Day schema and helper for opening hours (auto form UI instead of raw JSON)
const daySchema = z.object({
  open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Формат HH:MM'),
  close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Формат HH:MM'),
  closed: z.boolean().optional().default(false)
}).refine(d => d.closed || d.open < d.close, { message: 'Время закрытия должно быть позже открытия', path: ['close'] });

const restaurantFormSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  description: z.string().optional(),
  address: z.string().min(5, 'Минимум 5 символов'),
  phone: z.string().min(5, 'Телефон обязателен'),
  email: z.string().email('Неверный email'),
  website: z.string().url('Неверный URL').optional().or(z.literal('')),
  timezone: z.string().min(2).default('Europe/Moscow'),
  isActive: z.boolean().default(true),
  openingHours: z.object({
    monday: daySchema,
    tuesday: daySchema,
    wednesday: daySchema,
    thursday: daySchema,
    friday: daySchema,
    saturday: daySchema,
    sunday: daySchema,
  }),
});

type RestaurantFormValues = z.infer<typeof restaurantFormSchema>;

const defaultOpeningHours: RestaurantFormValues['openingHours'] = {
  monday: { open: "09:00", close: "22:00", closed: false },
  tuesday: { open: "09:00", close: "22:00", closed: false },
  wednesday: { open: "09:00", close: "22:00", closed: false },
  thursday: { open: "09:00", close: "22:00", closed: false },
  friday: { open: "09:00", close: "23:00", closed: false },
  saturday: { open: "10:00", close: "23:00", closed: false },
  sunday: { open: "10:00", close: "21:00", closed: false },
};

const dayLabels: Record<keyof typeof defaultOpeningHours, string> = {
  monday: 'Понедельник',
  tuesday: 'Вторник',
  wednesday: 'Среда',
  thursday: 'Четверг',
  friday: 'Пятница',
  saturday: 'Суббота',
  sunday: 'Воскресенье'
};

export default function AdminRestaurantsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<RestaurantFormValues>({
    resolver: zodResolver(restaurantFormSchema),
    defaultValues: {
      name: '',
      description: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      timezone: 'Europe/Moscow',
      isActive: true,
  openingHours: defaultOpeningHours,
    }
  });

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ['/api/restaurants'],
    queryFn: async () => {
      const auth = getAuthHeaders();
      const res = await fetch('/api/restaurants', { headers: auth as Record<string, string> });
      if (!res.ok) throw new Error('Не удалось загрузить рестораны');
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (values: RestaurantFormValues) => {
      const payload = {
        name: values.name,
        description: values.description || undefined,
        address: values.address,
        phone: values.phone,
        email: values.email,
        website: values.website || undefined,
  openingHours: values.openingHours,
        timezone: values.timezone,
        isActive: values.isActive,
        settings: {},
      };
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(getAuthHeaders() as Record<string, string>) },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(formatError(err));
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Ресторан создан' });
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants'] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message })
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: RestaurantFormValues }) => {
      const payload = {
        name: values.name,
        description: values.description || undefined,
        address: values.address,
        phone: values.phone,
        email: values.email,
        website: values.website || undefined,
  openingHours: values.openingHours,
        timezone: values.timezone,
        isActive: values.isActive,
        settings: {},
      };
      const res = await fetch(`/api/restaurants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(getAuthHeaders() as Record<string, string>) },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(formatError(err));
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Изменения сохранены' });
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants'] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/restaurants/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders() as Record<string, string>
      });
      if (!res.ok && res.status !== 204) {
        const err = await safeJson(res);
        throw new Error(formatError(err));
      }
      return true;
    },
    onSuccess: () => {
      toast({ title: 'Ресторан удален' });
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants'] });
      setDeleteConfirmOpen(false);
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message })
  });

  function safeJson(res: Response) {
    return res.text().then(t => { try { return JSON.parse(t); } catch { return { message: t || 'Ошибка' }; } });
  }

  function formatError(err: any) {
    if (err?.errors && Array.isArray(err.errors)) {
      return err.errors.map((e: any) => e.message).join(', ');
    }
    return err?.message || 'Неизвестная ошибка';
  }

  function onCreate() {
    setEditingId(null);
    form.reset({
      name: '',
      description: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      timezone: 'Europe/Moscow',
      isActive: true,
  openingHours: defaultOpeningHours,
    });
    setDialogOpen(true);
  }

  // Auto-open create dialog if ?create=1 in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('create') === '1' && !dialogOpen && !editingId) {
        onCreate();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onEdit(r: any) {
    setEditingId(r.id);
    form.reset({
      name: r.name || '',
      description: r.description || '',
      address: r.address || '',
      phone: r.phone || '',
      email: r.email || '',
      website: r.website || '',
      timezone: r.timezone || 'Europe/Moscow',
      isActive: r.isActive ?? true,
  openingHours: normalizeOpeningHours(r.openingHours),
    });
    setDialogOpen(true);
  }

  function onSubmit(values: RestaurantFormValues) {
    if (editingId) {
      updateMutation.mutate({ id: editingId, values });
    } else {
      createMutation.mutate(values);
    }
  }

  function normalizeOpeningHours(input: any): RestaurantFormValues['openingHours'] {
    const base = { ...defaultOpeningHours };
    if (!input || typeof input !== 'object') return base;
    for (const k of Object.keys(base) as (keyof typeof base)[]) {
      const day = input[k];
      if (day && typeof day === 'object') {
        base[k] = {
          open: day.open || base[k].open,
          close: day.close || base[k].close,
          closed: !!day.closed
        };
      }
    }
    return base;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Header 
          title="Рестораны"
          subtitle="Создание, редактирование и удаление ресторанов"
          showNewBooking={false}
        />
        <div className="p-6 space-y-6">
          <Card data-testid="card-restaurants-manage">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Рестораны</CardTitle>
                <CardDescription>Всего: {restaurants.length}</CardDescription>
              </div>
              <Button onClick={onCreate} data-testid="button-open-create" size="sm">
                <Plus className="w-4 h-4 mr-1" /> Новый ресторан
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-10 text-center text-muted-foreground" data-testid="loading-restaurants">
                  Загрузка...
                </div>
              ) : restaurants.length === 0 ? (
                <div className="text-center py-10" data-testid="empty-restaurants-admin">
                  <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">Нет ресторанов</p>
                  <Button variant="outline" onClick={onCreate} size="sm">Создать первый</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {restaurants.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`restaurant-row-${r.id}`}>
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.address}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? 'Активный' : 'Неактивный'}</Badge>
                        <Button variant="outline" size="sm" onClick={() => onEdit(r)} data-testid={`button-edit-${r.id}`}>Редактировать</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl" data-testid="dialog-restaurant-form">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Редактирование ресторана' : 'Новый ресторан'}</DialogTitle>
            <DialogDescription>Заполните обязательные поля ниже</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} data-testid="form-restaurant">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="name" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название</FormLabel>
                    <FormControl><Input placeholder="Ресторан" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="email" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="info@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="phone" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Телефон</FormLabel>
                    <FormControl><Input placeholder="+7..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="website" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Сайт</FormLabel>
                    <FormControl><Input placeholder="https://" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="timezone" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Часовой пояс</FormLabel>
                    <FormControl><Input placeholder="Europe/Moscow" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="isActive" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Активен</FormLabel>
                    <FormControl>
                      <div className="flex items-center h-10">
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField name="address" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Адрес</FormLabel>
                  <FormControl><Input placeholder="Адрес" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="description" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl><Textarea rows={3} placeholder="Краткое описание" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="space-y-2">
                <FormLabel>Часы работы</FormLabel>
                <div className="border rounded-md divide-y bg-muted/30" data-testid="opening-hours-grid">
                  {(Object.keys(defaultOpeningHours) as (keyof typeof defaultOpeningHours)[]).map(dayKey => (
                    <div key={dayKey} className="flex items-center gap-4 px-3 py-2 text-sm">
                      <div className="w-32 font-medium">{dayLabels[dayKey]}</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          className="h-8 px-2 rounded border bg-background disabled:opacity-40"
                          disabled={form.watch(`openingHours.${dayKey}.closed`)}
                          value={form.watch(`openingHours.${dayKey}.open`)}
                          onChange={e => form.setValue(`openingHours.${dayKey}.open`, e.target.value)}
                          data-testid={`time-open-${dayKey}`}
                        />
                        <span>-</span>
                        <input
                          type="time"
                          className="h-8 px-2 rounded border bg-background disabled:opacity-40"
                          disabled={form.watch(`openingHours.${dayKey}.closed`)}
                          value={form.watch(`openingHours.${dayKey}.close`)}
                          onChange={e => form.setValue(`openingHours.${dayKey}.close`, e.target.value)}
                          data-testid={`time-close-${dayKey}`}
                        />
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Выходной</span>
                        <Switch
                          checked={!!form.watch(`openingHours.${dayKey}.closed`)}
                          onCheckedChange={val => form.setValue(`openingHours.${dayKey}.closed`, val)}
                          data-testid={`closed-switch-${dayKey}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </div>
              <DialogFooter className="flex justify-between gap-2">
                <div className="flex-1 flex items-center gap-2">
                  {editingId && (
                    <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)} data-testid="button-delete-restaurant">
                      {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
                      Удалить
                    </Button>
                  )}
                </div>
                <div className="space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel">
                    Отмена
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-restaurant">
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                    {editingId ? 'Сохранить' : 'Создать'}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent data-testid="dialog-delete-confirm">
          <DialogHeader>
            <DialogTitle>Удалить ресторан?</DialogTitle>
            <DialogDescription>Это действие нельзя отменить.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(false)} data-testid="button-delete-cancel">Отмена</Button>
            <Button variant="destructive" size="sm" onClick={() => editingId && deleteMutation.mutate(editingId)} disabled={deleteMutation.isPending} data-testid="button-delete-confirm">
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Удалить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
