import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Table } from "@shared/schema";
import { cn } from "@/lib/utils";

interface DraggableTableProps {
  table: Table;
  onMove: (tableId: string, position: { x: number; y: number }) => void;
}

export default function DraggableTable({ table, onMove }: DraggableTableProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'table',
    item: { id: table.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'table',
    hover: (item: { id: string }, monitor) => {
      if (!ref.current) return;
      if (item.id === table.id) return;

      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const containerRect = ref.current.parentElement?.getBoundingClientRect();
      if (!containerRect) return;

      const x = clientOffset.x - containerRect.left - hoverBoundingRect.width / 2;
      const y = clientOffset.y - containerRect.top - hoverBoundingRect.height / 2;

      onMove(item.id, { x, y });
    },
  });

  drag(drop(ref));

  const getTableBorderColor = () => {
    switch (table.status) {
      case 'occupied': return 'border-green-400';
      case 'reserved': return 'border-yellow-400';
      case 'maintenance': return 'border-red-400';
      default: return 'border-gray-300';
    }
  };

  const getTableShape = () => {
    switch (table.shape) {
      case 'round': return 'rounded-full';
      case 'square': return 'rounded-lg';
      case 'rectangular': return 'rounded-lg';
      default: return 'rounded-lg';
    }
  };

  const getTableSize = () => {
    if (table.dimensions && typeof table.dimensions === 'object') {
      const dims = table.dimensions as { width?: number; height?: number };
      return {
        width: dims.width || (table.shape === 'round' ? 64 : table.capacity <= 4 ? 80 : 96),
        height: dims.height || (table.shape === 'round' ? 64 : table.capacity <= 4 ? 48 : 60),
      };
    }
    
    // Default sizes based on capacity
    if (table.capacity <= 2) return { width: 64, height: 64 };
    if (table.capacity <= 4) return { width: 80, height: 48 };
    if (table.capacity <= 6) return { width: 80, height: 64 };
    return { width: 96, height: 60 };
  };

  const size = getTableSize();
  const position = table.position && typeof table.position === 'object' 
    ? table.position as { x: number; y: number }
    : { x: 100 + (parseInt(table.id.slice(-1)) || 0) * 120, y: 100 };

  return (
    <div
      ref={ref}
      className={cn(
        "floor-plan-table absolute bg-white border-2 flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing transition-all duration-200",
        getTableBorderColor(),
        getTableShape(),
        isDragging && "opacity-50 transform scale-105",
        "hover:transform hover:scale-105 hover:shadow-lg"
      )}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
      data-testid={`table-${table.id}`}
    >
      <div className="text-center">
        <p className="text-xs font-semibold">{table.name}</p>
        <p className={cn(
          "text-xs",
          table.status === 'occupied' ? "text-green-600" :
          table.status === 'reserved' ? "text-yellow-600" :
          table.status === 'maintenance' ? "text-red-600" :
          "text-gray-600"
        )}>
          {table.capacity}
        </p>
      </div>
    </div>
  );
}
