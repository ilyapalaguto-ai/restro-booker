import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Calendar, 
  Users, 
  ChartBar, 
  FileText, 
  Settings, 
  Utensils,
  Layout,
  Building2,
  User
} from "lucide-react";

const navigationItems = {
  admin: [
    { icon: Building2, label: "Рестораны", href: "/admin/restaurants" },
    { icon: Users, label: "Пользователи", href: "/admin/users" },
    { icon: ChartBar, label: "Аналитика", href: "/admin/analytics" },
    { icon: FileText, label: "Отчеты", href: "/admin/reports" },
    { icon: Settings, label: "Настройки", href: "/admin/settings" },
  ],
  restaurant_manager: [
    { icon: Calendar, label: "Бронирования", href: "/restaurant/bookings" },
    { icon: Layout, label: "Схема зала", href: "/restaurant/floor-plan" },
    { icon: Users, label: "Клиенты", href: "/restaurant/customers" },
    { icon: ChartBar, label: "Аналитика", href: "/restaurant/analytics" },
    { icon: FileText, label: "Отчеты", href: "/restaurant/reports" },
    { icon: Settings, label: "Настройки", href: "/restaurant/settings" },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const items = navigationItems[user.role as keyof typeof navigationItems] || [];

  return (
    <aside className="w-64 sidebar-gradient text-white flex-shrink-0" data-testid="sidebar">
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Utensils className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-lg">RestaurantCRM</h1>
            <p className="text-xs text-gray-300">
              {user.role === 'admin' ? 'Админ панель' : 'Ресторан "Белая Дача"'}
            </p>
          </div>
        </div>
      </div>
      
      <nav className="px-4 pb-4">
        <ul className="space-y-2">
          {items.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors",
                    isActive
                      ? "bg-primary/20 text-white"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  )}
                  data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
        
        <div className="mt-8 pt-8 border-t border-gray-600">
          <div className="flex items-center space-x-3 px-4 mb-4">
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-sm">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-gray-400">
                {user.role === 'admin' ? 'Администратор' : 'Менеджер'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            data-testid="button-logout"
          >
            Выйти
          </button>
        </div>
      </nav>
    </aside>
  );
}
