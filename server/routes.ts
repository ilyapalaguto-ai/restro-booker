import type { Express } from "express";
import { createServer, type Server } from "http";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { 
  loginSchema, 
  registerSchemaWithConfirm as registerSchema, 
  insertRestaurantSchema,
  insertTableSchema,
  insertCustomerSchema,
  insertBookingSchema,
  type User 
} from "@shared/schema";
import { ZodError } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

// Middleware for authentication
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getUser(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Middleware for role checking
const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

// Middleware for restaurant access (restaurant managers can only access their restaurant)
const checkRestaurantAccess = (req: any, res: any, next: any) => {
  const { restaurantId } = req.params;
  const user = req.user;

  if (user.role === 'admin') {
    return next();
  }

  if (user.role === 'restaurant_manager' && user.restaurantId === restaurantId) {
    return next();
  }

  return res.status(403).json({ message: 'Access denied to this restaurant' });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user || !await storage.verifyPassword(password, user.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: 'Account is disabled' });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
      }
      console.error('[auth.login] unexpected error', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      const { confirmPassword, ...rest } = data;

      const existingUser = await storage.getUserByEmail(rest.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Enforce safe defaults and role
      const user = await storage.createUser({
        email: rest.email,
        password: rest.password,
        firstName: rest.firstName ?? "",
        lastName: rest.lastName ?? "",
        // role omitted -> DB default 'customer' is applied
      } as any);
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
      
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword, token });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get("/api/auth/me", authenticateToken, (req: any, res) => {
    const { password: _, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  app.post("/api/auth/logout", (req, res) => {
    res.json({ message: 'Logged out successfully' });
  });

  // Restaurants routes
  app.get("/api/restaurants", authenticateToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role === 'admin') {
        const restaurants = await storage.getRestaurants();
        res.json(restaurants);
      } else if (user.role === 'restaurant_manager' && user.restaurantId) {
        const restaurant = await storage.getRestaurant(user.restaurantId);
        res.json(restaurant ? [restaurant] : []);
      } else {
        const restaurants = await storage.getRestaurants();
        res.json(restaurants);
      }
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get("/api/restaurants/:id", authenticateToken, async (req, res) => {
    try {
      const restaurant = await storage.getRestaurantWithTables(req.params.id);
      if (!restaurant) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }
      res.json(restaurant);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post("/api/restaurants", authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const restaurantData = insertRestaurantSchema.parse(req.body);
      const restaurant = await storage.createRestaurant(restaurantData);
      res.status(201).json(restaurant);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put("/api/restaurants/:id", authenticateToken, checkRestaurantAccess, async (req, res) => {
    try {
      const updates = insertRestaurantSchema.partial().parse(req.body);
      const restaurant = await storage.updateRestaurant(req.params.id, updates);
      res.json(restaurant);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete("/api/restaurants/:id", authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      await storage.deleteRestaurant(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Tables routes
  app.get("/api/restaurants/:restaurantId/tables", authenticateToken, checkRestaurantAccess, async (req, res) => {
    try {
      const tables = await storage.getTablesByRestaurant(req.params.restaurantId);
      res.json(tables);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post("/api/restaurants/:restaurantId/tables", authenticateToken, checkRestaurantAccess, async (req, res) => {
    try {
      const tableData = insertTableSchema.parse({
        ...req.body,
        restaurantId: req.params.restaurantId
      });
      const table = await storage.createTable(tableData);
      res.status(201).json(table);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put("/api/tables/:id", authenticateToken, async (req: any, res) => {
    try {
      const table = await storage.getTable(req.params.id);
      if (!table) {
        return res.status(404).json({ message: 'Table not found' });
      }

      // Check access to restaurant
      const user = req.user;
      if (user.role !== 'admin' && 
          (user.role !== 'restaurant_manager' || user.restaurantId !== table.restaurantId)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const updates = insertTableSchema.partial().parse(req.body);
      const updatedTable = await storage.updateTable(req.params.id, updates);
      res.json(updatedTable);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete("/api/tables/:id", authenticateToken, async (req: any, res) => {
    try {
      const table = await storage.getTable(req.params.id);
      if (!table) {
        return res.status(404).json({ message: 'Table not found' });
      }

      // Check access to restaurant
      const user = req.user;
      if (user.role !== 'admin' && 
          (user.role !== 'restaurant_manager' || user.restaurantId !== table.restaurantId)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      await storage.deleteTable(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Customers routes
  app.get("/api/customers", authenticateToken, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get("/api/customers/:id", authenticateToken, async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post("/api/customers", authenticateToken, async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      
      // Check if customer already exists by phone
      const existing = await storage.getCustomerByPhone(customerData.phone);
      if (existing) {
        return res.status(400).json({ message: 'Customer with this phone already exists' });
      }

      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put("/api/customers/:id", authenticateToken, async (req, res) => {
    try {
      const updates = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, updates);
      res.json(customer);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Bookings routes
  app.get("/api/bookings", authenticateToken, async (req: any, res) => {
    try {
      const { restaurantId, date } = req.query;
      const user = req.user;

      let targetRestaurantId = restaurantId;
      
      // Restaurant managers can only see their restaurant's bookings
      if (user.role === 'restaurant_manager') {
        targetRestaurantId = user.restaurantId;
      }

      const searchDate = date ? new Date(date) : undefined;
      const bookings = await storage.getBookings(targetRestaurantId, searchDate);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get("/api/bookings/:id", authenticateToken, async (req: any, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      const user = req.user;
      
      // Check access permissions
      if (user.role === 'customer') {
        // Customers can only see their own bookings
        if (booking.customerId !== user.customerId) {
          return res.status(403).json({ message: 'Access denied' });
        }
      } else if (user.role === 'restaurant_manager') {
        // Restaurant managers can only see bookings for their restaurant
        if (booking.restaurantId !== user.restaurantId) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }

      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post("/api/bookings", authenticateToken, async (req: any, res) => {
    try {
      const bookingData = insertBookingSchema.parse(req.body);
      const user = req.user;

      // If user is restaurant manager, ensure booking is for their restaurant
      if (user.role === 'restaurant_manager' && bookingData.restaurantId !== user.restaurantId) {
        return res.status(403).json({ message: 'Can only create bookings for your restaurant' });
      }

      // Set the user who created the booking
      if (user.role !== 'customer') {
        bookingData.userId = user.id;
      }

      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put("/api/bookings/:id", authenticateToken, async (req: any, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      const user = req.user;
      
      // Check access permissions
      if (user.role === 'restaurant_manager' && booking.restaurantId !== user.restaurantId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const updates = insertBookingSchema.partial().parse(req.body);
      const updatedBooking = await storage.updateBooking(req.params.id, updates);
      res.json(updatedBooking);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete("/api/bookings/:id", authenticateToken, async (req: any, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      const user = req.user;
      
      // Check access permissions
      if (user.role === 'restaurant_manager' && booking.restaurantId !== user.restaurantId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      await storage.deleteBooking(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Analytics routes
  app.get("/api/restaurants/:restaurantId/stats", authenticateToken, checkRestaurantAccess, async (req, res) => {
    try {
      const { date } = req.query;
      const searchDate = date ? new Date(date as string) : new Date();
      
      const stats = await storage.getRestaurantStats(req.params.restaurantId, searchDate);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // User management routes (admin only)
  app.get("/api/users", authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const users = await storage.getUsers?.() || [];
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
