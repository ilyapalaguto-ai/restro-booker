import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookingWithDetails, InsertBooking } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { getAuthHeaders } from "@/lib/auth";

export function useBookings(restaurantId?: string, date?: string) {
  return useQuery({
    queryKey: ['/api/bookings', restaurantId, date],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (restaurantId) params.append('restaurantId', restaurantId);
      if (date) params.append('date', date);
      
      const response = await fetch(`/api/bookings?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      
      return response.json() as Promise<BookingWithDetails[]>;
    }
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ['/api/bookings', id],
    queryFn: async () => {
      const response = await fetch(`/api/bookings/${id}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch booking');
      }
      
      return response.json() as Promise<BookingWithDetails>;
    }
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (bookingData: InsertBooking) => {
      const response = await apiRequest('POST', '/api/bookings', bookingData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
    }
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InsertBooking> }) => {
      const response = await apiRequest('PUT', `/api/bookings/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
    }
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/bookings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
    }
  });
}

export function useRestaurantStats(restaurantId: string, date?: string) {
  return useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'stats', date],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      
      const response = await fetch(`/api/restaurants/${restaurantId}/stats?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch restaurant stats');
      }
      
      return response.json() as Promise<{
        totalBookings: number;
        totalRevenue: number;
        averagePartySize: number;
        occupancyRate: number;
      }>;
    }
  });
}
