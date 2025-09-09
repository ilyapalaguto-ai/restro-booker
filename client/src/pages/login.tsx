import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Utensils } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast({
        title: "Успешный вход",
        description: "Добро пожаловать в RestaurantCRM!",
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Ошибка входа",
        description: error.message || "Неверный email или пароль",
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
          <CardTitle className="text-2xl font-bold">RestaurantCRM</CardTitle>
          <CardDescription>
            Войдите в систему управления рестораном
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-password"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
              data-testid="button-submit"
            >
              {isLoading ? "Вход..." : "Войти"}
            </Button>
          </form>
          <p className="text-sm text-center text-muted-foreground mt-4">
            Нет аккаунта? <a href="/register" className="text-primary underline">Зарегистрироваться</a>
          </p>
          
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Демо-аккаунты для тестирования:
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-2 bg-muted rounded">
                <strong>Администратор:</strong><br />
                admin@restaurant.com / admin123
              </div>
              <div className="p-2 bg-muted rounded">
                <strong>Менеджер ресторана:</strong><br />
                manager@restaurant.com / manager123
              </div>
              <div className="p-2 bg-muted rounded">
                <strong>Клиент:</strong><br />
                customer@restaurant.com / customer123
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
