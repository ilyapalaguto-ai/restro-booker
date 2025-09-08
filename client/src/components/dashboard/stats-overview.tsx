import { Card, CardContent } from "@/components/ui/card";
import { Calendar, PieChart, RussianRuble, Receipt } from "lucide-react";

interface StatsOverviewProps {
  stats?: {
    totalBookings: number;
    totalRevenue: number;
    averagePartySize: number;
    occupancyRate: number;
  };
}

export default function StatsOverview({ stats }: StatsOverviewProps) {
  const defaultStats = {
    totalBookings: 0,
    totalRevenue: 0,
    averagePartySize: 0,
    occupancyRate: 0,
  };

  const data = stats || defaultStats;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6" data-testid="stats-overview">
      <Card data-testid="stat-bookings">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Сегодня броней</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {data.totalBookings}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">+12%</span>
            <span className="text-muted-foreground ml-1">vs вчера</span>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="stat-occupancy">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Заполненность</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {data.occupancyRate}%
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <PieChart className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">+5%</span>
            <span className="text-muted-foreground ml-1">vs прошлая неделя</span>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="stat-revenue">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Выручка сегодня</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {formatCurrency(data.totalRevenue)}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <RussianRuble className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">+8%</span>
            <span className="text-muted-foreground ml-1">vs средний день</span>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="stat-average-party">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Средний размер группы</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {data.averagePartySize}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Receipt className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-red-600 font-medium">-2%</span>
            <span className="text-muted-foreground ml-1">vs прошлый месяц</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
