import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAuthHeaders } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Table } from "@shared/schema";
import { Plus, Save, Utensils, Crown } from "lucide-react";
import DraggableTable from "./draggable-table";

interface FloorPlanEditorProps {
  restaurantId: string;
}

export default function FloorPlanEditor({ restaurantId }: FloorPlanEditorProps) {
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'tables'],
    queryFn: async () => {
      const response = await fetch(`/api/restaurants/${restaurantId}/tables`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch tables');
      return response.json() as Promise<Table[]>;
    }
  });

  const updateTableMutation = useMutation({
    mutationFn: async ({ tableId, updates }: { tableId: string; updates: Partial<Table> }) => {
      const response = await apiRequest('PUT', `/api/tables/${tableId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'tables'] });
      toast({
        title: "Изменения сохранены",
        description: "Расположение столов обновлено",
      });
      setHasChanges(false);
    }
  });

  const handleTableMove = (tableId: string, position: { x: number; y: number }) => {
    setHasChanges(true);
    // Update local state immediately for smooth UX
    queryClient.setQueryData(
      ['/api/restaurants', restaurantId, 'tables'],
      (oldTables: Table[] = []) =>
        oldTables.map(table =>
          table.id === tableId
            ? { ...table, position: { x: position.x, y: position.y } }
            : table
        )
    );
  };

  const handleSaveChanges = async () => {
    const currentTables = queryClient.getQueryData(['/api/restaurants', restaurantId, 'tables']) as Table[];
    
    try {
      await Promise.all(
        currentTables.map(table =>
          updateTableMutation.mutateAsync({
            tableId: table.id,
            updates: { position: table.position }
          })
        )
      );
    } catch (error) {
      toast({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить изменения",
        variant: "destructive",
      });
    }
  };

  const getTableStatusBorder = (status: string) => {
    switch (status) {
      case 'occupied': return 'table-status-occupied';
      case 'reserved': return 'table-status-reserved';
      case 'maintenance': return 'table-status-maintenance';
      default: return 'table-status-available';
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="floor-plan-loading">
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Card data-testid="floor-plan-editor">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Схема зала</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Перетащите столы для изменения расположения
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" data-testid="button-add-table">
                <Plus className="w-4 h-4 mr-2" />
                Добавить стол
              </Button>
              <Button
                onClick={handleSaveChanges}
                disabled={!hasChanges || updateTableMutation.isPending}
                data-testid="button-save-changes"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateTableMutation.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div 
            className="bg-muted/30 rounded-xl p-8 min-h-96 relative overflow-hidden"
            style={{
              backgroundImage: `url("data:image/svg+xml,<svg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'><defs><pattern id='grid' width='20' height='20' patternUnits='userSpaceOnUse'><path d='M 20 0 L 0 0 0 20' fill='none' stroke='%23e5e7eb' stroke-width='1'/></pattern></defs><rect width='100%' height='100%' fill='url(%23grid)' /></svg>")`,
            }}
            data-testid="floor-plan-canvas"
          >
            {/* Kitchen Area */}
            <div className="absolute top-4 left-4 bg-gray-300 rounded-lg p-4 w-32 h-20 flex items-center justify-center">
              <div className="text-center">
                <Utensils className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                <p className="text-xs text-gray-600 font-medium">Кухня</p>
              </div>
            </div>

            {/* Bar Area */}
            <div className="absolute top-4 right-4 bg-amber-200 rounded-lg p-4 w-40 h-16 flex items-center justify-center">
              <div className="text-center">
                <div className="w-4 h-4 bg-amber-700 rounded mx-auto mb-1"></div>
                <p className="text-xs text-amber-700 font-medium">Бар</p>
              </div>
            </div>

            {/* VIP Area */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-purple-100 border-2 border-purple-300 rounded-xl p-6 w-48 h-32 flex items-center justify-center">
              <div className="text-center">
                <Crown className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-purple-700 font-medium">VIP Зал</p>
                <p className="text-xs text-purple-600">до 12 человек</p>
              </div>
            </div>

            {/* Draggable Tables */}
            {tables.map(table => (
              <DraggableTable
                key={table.id}
                table={table}
                onMove={handleTableMove}
              />
            ))}

            {/* Legend */}
            <div className="absolute bottom-4 right-4 bg-white rounded-lg p-4 shadow-lg border border-border">
              <h4 className="text-sm font-semibold mb-3">Статус столов</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 border-2 border-green-400 rounded-full"></div>
                  <span className="text-xs">Занят</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 border-2 border-yellow-400 rounded-full"></div>
                  <span className="text-xs">Забронирован</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 border-2 border-gray-300 rounded-full"></div>
                  <span className="text-xs">Свободен</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 border-2 border-red-400 rounded-full"></div>
                  <span className="text-xs">Обслуживание</span>
                </div>
              </div>
            </div>
          </div>

          {tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center" data-testid="empty-tables">
              <div className="text-center">
                <Plus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Столы не найдены</h3>
                <p className="text-muted-foreground mb-4">Добавьте столы для создания схемы зала</p>
                <Button data-testid="button-add-first-table">
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить первый стол
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </DndProvider>
  );
}
