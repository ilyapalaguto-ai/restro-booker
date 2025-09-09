import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import AdminDashboard from "@/pages/admin-dashboard";
import RestaurantDashboard from "@/pages/restaurant-dashboard";
import CustomerApp from "@/pages/customer-app";

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="loading-spinner">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Login />;
  }
  
  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="access-denied">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Доступ запрещен</h1>
          <p className="text-muted-foreground mt-2">У вас нет прав для доступа к этой странице</p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}

function Router() {
  const { user } = useAuth();
  
  return (
    <Switch>
      <Route path="/login" component={Login} />
  <Route path="/register" component={Register} />
      
      <Route path="/admin">
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/restaurant">
        <ProtectedRoute allowedRoles={['admin', 'restaurant_manager']}>
          <RestaurantDashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/customer">
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerApp />
        </ProtectedRoute>
      </Route>
      
      <Route path="/">
        {user ? (
          // Redirect to appropriate dashboard based on role
          user.role === 'admin' ? <AdminDashboard /> :
          user.role === 'restaurant_manager' ? <RestaurantDashboard /> :
          <CustomerApp />
        ) : (
          <Login />
        )}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
