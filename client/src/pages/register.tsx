import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Utensils } from "lucide-react";

export default function Register() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { register } = useAuth();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register(form);
      toast({
        title: "Регистрация успешна",
        description: "Добро пожаловать! Вы вошли в систему.",
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Ошибка регистрации",
        description: error.message || "Не удалось создать аккаунт",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Utensils className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Создать аккаунт</CardTitle>
          <CardDescription>
            Зарегистрируйтесь для использования RestaurantCRM
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Имя</Label>
                <Input id="firstName" name="firstName" value={form.firstName} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Фамилия</Label>
                <Input id="lastName" name="lastName" value={form.lastName} onChange={handleChange} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" name="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон (необязательно)</Label>
              <Input id="phone" type="tel" name="phone" value={form.phone} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input id="password" type="password" name="password" value={form.password} onChange={handleChange} required minLength={6} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Подтверждение пароля</Label>
              <Input id="confirmPassword" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Регистрация..." : "Зарегистрироваться"}
            </Button>
          </form>
          <p className="text-sm text-center text-muted-foreground mt-4">
            Уже есть аккаунт? <Link href="/login" className="text-primary underline">Войти</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
