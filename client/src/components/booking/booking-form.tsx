import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { insertBookingSchema, insertCustomerSchema, type InsertBooking } from "@shared/schema";
import { useCreateBooking } from "@/hooks/use-bookings";
import { getAuthHeaders } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { z } from "zod";

const bookingFormSchema = insertBookingSchema.extend({
  customerFirstName: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  customerLastName: z.string().min(2, "Фамилия должна содержать минимум 2 символа"),
  customerPhone: z.string().min(10, "Телефон должен содержать минимум 10 цифр"),
  customerEmail: z.string().email("Неверный формат email").optional().or(z.literal("")),
  bookingDate: z.string().min(1, "Дата обязательна"),
  bookingTime: z.string().min(1, "Время обязательно"),
}).omit({ 
  startTime: true, 
  endTime: true, 
  customerId: true,
  bookingDate: true 
});

interface BookingFormProps {
  restaurantId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BookingForm({ restaurantId, onClose, onSuccess }: BookingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const createBooking = useCreateBooking();

  const { data: tables = [] } = useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'tables'],
    queryFn: async () => {
      const response = await fetch(`/api/restaurants/${restaurantId}/tables`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch tables');
      return response.json();
    }
  });

  const form = useForm<z.infer<typeof bookingFormSchema>>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      restaurantId,
      partySize: 2,
      status: 'pending',
      customerFirstName: "",
      customerLastName: "",
      customerPhone: "",
      customerEmail: "",
      bookingDate: new Date().toISOString().split('T')[0],
      bookingTime: "19:00",
      tableId: undefined,
      notes: "",
      specialRequests: "",
    },
  });

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 10; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  const getAvailableTables = () => {
    const partySize = form.watch('partySize');
    return tables.filter(table => table.capacity >= partySize && table.isActive);
  };

  const onSubmit = async (values: z.infer<typeof bookingFormSchema>) => {
    setIsSubmitting(true);
    try {
      // First, create or find customer
      const customerData = {
        firstName: values.customerFirstName,
        lastName: values.customerLastName,
        phone: values.customerPhone,
        email: values.customerEmail || undefined,
      };

      let customer;
      try {
        // Try to find existing customer by phone
        const existingCustomerResponse = await fetch(`/api/customers?phone=${values.customerPhone}`, {
          headers: getAuthHeaders()
        });
        
        if (existingCustomerResponse.ok) {
          const customers = await existingCustomerResponse.json();
          customer = customers[0];
        }
      } catch (error) {
        // Customer doesn't exist, we'll create a new one
      }

      if (!customer) {
        const customerResponse = await fetch('/api/customers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(customerData)
        });

        if (!customerResponse.ok) {
          throw new Error('Failed to create customer');
        }

        customer = await customerResponse.json();
      }

      // Create booking
      const bookingDateTime = new Date(`${values.bookingDate}T${values.bookingTime}`);
      const endTime = new Date(bookingDateTime);
      endTime.setHours(endTime.getHours() + 2); // Default 2-hour booking

      const bookingData: InsertBooking = {
        restaurantId: values.restaurantId,
        customerId: customer.id,
        tableId: values.tableId || undefined,
        bookingDate: bookingDateTime,
        startTime: bookingDateTime,
        endTime,
        partySize: values.partySize,
        status: values.status,
        notes: values.notes || undefined,
        specialRequests: values.specialRequests || undefined,
      };

      await createBooking.mutateAsync(bookingData);

      toast({
        title: "Бронирование создано",
        description: `Столик забронирован для ${values.customerFirstName} ${values.customerLastName}`,
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Ошибка создания бронирования",
        description: error.message || "Произошла ошибка при создании бронирования",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="booking-form-modal">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Новое бронирование</CardTitle>
              <CardDescription>Создание бронирования для клиента</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-modal"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Информация о клиенте</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerFirstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Имя</FormLabel>
                        <FormControl>
                          <Input placeholder="Введите имя" {...field} data-testid="input-first-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customerLastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Фамилия</FormLabel>
                        <FormControl>
                          <Input placeholder="Введите фамилию" {...field} data-testid="input-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Телефон</FormLabel>
                        <FormControl>
                          <Input placeholder="+7 (999) 123-45-67" {...field} data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (необязательно)</FormLabel>
                        <FormControl>
                          <Input placeholder="email@example.com" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Booking Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Детали бронирования</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="bookingDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Дата</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bookingTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Время</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-time">
                              <SelectValue placeholder="Выберите время" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {generateTimeSlots().map(time => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="partySize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Количество гостей</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger data-testid="select-party-size">
                              <SelectValue placeholder="Выберите количество" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                {num} {num === 1 ? 'человек' : 'человека'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="tableId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Предпочитаемый стол</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-table">
                            <SelectValue placeholder="Выберите стол (необязательно)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Любой доступный</SelectItem>
                          {getAvailableTables().map(table => (
                            <SelectItem key={table.id} value={table.id}>
                              {table.name} ({table.capacity} мест)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specialRequests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Особые пожелания</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Детское кресло, у окна, день рождения..."
                          {...field}
                          data-testid="textarea-special-requests"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Внутренние заметки</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Заметки для персонала..."
                          {...field}
                          data-testid="textarea-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  data-testid="button-cancel"
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="button-create-booking"
                >
                  {isSubmitting ? "Создание..." : "Создать бронирование"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
