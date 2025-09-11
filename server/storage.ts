import { 
  users, restaurants, tables, customers, bookings,
  type User, type Restaurant, type Table, type Customer, type Booking,
  type InsertUser, type InsertRestaurant, type InsertTable, type InsertCustomer, type InsertBooking,
  type BookingWithDetails, type TableWithBookings, type RestaurantWithTables
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, count, sum, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;

  // Restaurants
  getRestaurants(): Promise<Restaurant[]>;
  getRestaurant(id: string): Promise<Restaurant | undefined>;
  getRestaurantWithTables(id: string): Promise<RestaurantWithTables | undefined>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: string, updates: Partial<InsertRestaurant>): Promise<Restaurant>;
  deleteRestaurant(id: string): Promise<void>;

  // Tables
  getTablesByRestaurant(restaurantId: string): Promise<Table[]>;
  getTable(id: string): Promise<Table | undefined>;
  getTableWithBookings(id: string, date: Date): Promise<TableWithBookings | undefined>;
  createTable(table: InsertTable): Promise<Table>;
  updateTable(id: string, updates: Partial<InsertTable>): Promise<Table>;
  deleteTable(id: string): Promise<void>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByPhone(phone: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;

  // Bookings
  getBookings(restaurantId?: string, date?: Date): Promise<BookingWithDetails[]>;
  getBooking(id: string): Promise<BookingWithDetails | undefined>;
  getBookingsByCustomer(customerId: string): Promise<BookingWithDetails[]>;
  getBookingsByDate(restaurantId: string, date: Date): Promise<BookingWithDetails[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, updates: Partial<InsertBooking>): Promise<Booking>;
  deleteBooking(id: string): Promise<void>;

  // Analytics
  getRestaurantStats(restaurantId: string, date: Date): Promise<{
    totalBookings: number;
    totalRevenue: number;
    averagePartySize: number;
    occupancyRate: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    const allowed = ['admin','restaurant_manager','customer'];
  if (!allowed.includes(role)) return [];
  return db.select().from(users).where(eq(users.role, role as any));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await this.hashPassword(insertUser.password);
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, password: hashedPassword })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    if (updates.password) {
      updates.password = await this.hashPassword(updates.password);
    }
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Restaurants
  async getRestaurants(): Promise<Restaurant[]> {
    return db.select().from(restaurants).where(eq(restaurants.isActive, true));
  }

  async getRestaurant(id: string): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, id));
    return restaurant || undefined;
  }

  async getRestaurantWithTables(id: string): Promise<RestaurantWithTables | undefined> {
    const restaurant = await this.getRestaurant(id);
    if (!restaurant) return undefined;

    const restaurantTables = await this.getTablesByRestaurant(id);
    return { ...restaurant, tables: restaurantTables };
  }

  async createRestaurant(insertRestaurant: InsertRestaurant): Promise<Restaurant> {
    const [restaurant] = await db
      .insert(restaurants)
      .values(insertRestaurant)
      .returning();
    return restaurant;
  }

  async updateRestaurant(id: string, updates: Partial<InsertRestaurant>): Promise<Restaurant> {
    const [restaurant] = await db
      .update(restaurants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(restaurants.id, id))
      .returning();
    return restaurant;
  }

  async deleteRestaurant(id: string): Promise<void> {
    await db.delete(restaurants).where(eq(restaurants.id, id));
  }

  // Tables
  async getTablesByRestaurant(restaurantId: string): Promise<Table[]> {
    return db.select().from(tables)
      .where(and(eq(tables.restaurantId, restaurantId), eq(tables.isActive, true)));
  }

  async getTable(id: string): Promise<Table | undefined> {
    const [table] = await db.select().from(tables).where(eq(tables.id, id));
    return table || undefined;
  }

  async getTableWithBookings(id: string, date: Date): Promise<TableWithBookings | undefined> {
    const table = await this.getTable(id);
    if (!table) return undefined;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const tableBookings = await db.select().from(bookings)
      .where(and(
        eq(bookings.tableId, id),
        gte(bookings.startTime, startOfDay),
        lte(bookings.startTime, endOfDay)
      ));

    return { ...table, bookings: tableBookings };
  }

  async createTable(insertTable: InsertTable): Promise<Table> {
    const [table] = await db
      .insert(tables)
      .values(insertTable)
      .returning();
    return table;
  }

  async updateTable(id: string, updates: Partial<InsertTable>): Promise<Table> {
    const [table] = await db
      .update(tables)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tables.id, id))
      .returning();
    return table;
  }

  async deleteTable(id: string): Promise<void> {
    await db.delete(tables).where(eq(tables.id, id));
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.phone, phone));
    return customer || undefined;
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db
      .insert(customers)
      .values(insertCustomer)
      .returning();
    return customer;
  }

  async updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer> {
    const [customer] = await db
      .update(customers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return customer;
  }

  async deleteCustomer(id: string): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  // Bookings
  async getBookings(restaurantId?: string, date?: Date): Promise<BookingWithDetails[]> {
    const base = db.select({
      id: bookings.id,
      restaurantId: bookings.restaurantId,
      tableId: bookings.tableId,
      customerId: bookings.customerId,
      userId: bookings.userId,
      bookingDate: bookings.bookingDate,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      partySize: bookings.partySize,
      status: bookings.status,
      notes: bookings.notes,
      specialRequests: bookings.specialRequests,
      amount: bookings.amount,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
      customer: customers,
      table: tables,
      restaurant: restaurants,
      user: users,
    }).from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .leftJoin(tables, eq(bookings.tableId, tables.id))
      .leftJoin(restaurants, eq(bookings.restaurantId, restaurants.id))
      .leftJoin(users, eq(bookings.userId, users.id));

    const whereClauses = [] as any[];
    if (restaurantId) {
      whereClauses.push(eq(bookings.restaurantId, restaurantId));
    }
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      whereClauses.push(and(gte(bookings.startTime, startOfDay), lte(bookings.startTime, endOfDay)));
    }

    const results = await (whereClauses.length
      ? base.where(and(...whereClauses))
      : base)
      .orderBy(desc(bookings.createdAt));
    
    return results.map(result => ({
      ...result,
      customer: result.customer!,
      restaurant: result.restaurant!,
    })) as BookingWithDetails[];
  }

  async getBooking(id: string): Promise<BookingWithDetails | undefined> {
    const [result] = await db.select({
      id: bookings.id,
      restaurantId: bookings.restaurantId,
      tableId: bookings.tableId,
      customerId: bookings.customerId,
      userId: bookings.userId,
      bookingDate: bookings.bookingDate,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      partySize: bookings.partySize,
      status: bookings.status,
      notes: bookings.notes,
      specialRequests: bookings.specialRequests,
      amount: bookings.amount,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
      customer: customers,
      table: tables,
      restaurant: restaurants,
      user: users,
    })
    .from(bookings)
    .leftJoin(customers, eq(bookings.customerId, customers.id))
    .leftJoin(tables, eq(bookings.tableId, tables.id))
    .leftJoin(restaurants, eq(bookings.restaurantId, restaurants.id))
    .leftJoin(users, eq(bookings.userId, users.id))
    .where(eq(bookings.id, id));

    if (!result) return undefined;

    return {
      ...result,
      customer: result.customer!,
      restaurant: result.restaurant!,
    } as BookingWithDetails;
  }

  async getBookingsByCustomer(customerId: string): Promise<BookingWithDetails[]> {
    const results = await db.select({
      id: bookings.id,
      restaurantId: bookings.restaurantId,
      tableId: bookings.tableId,
      customerId: bookings.customerId,
      userId: bookings.userId,
      bookingDate: bookings.bookingDate,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      partySize: bookings.partySize,
      status: bookings.status,
      notes: bookings.notes,
      specialRequests: bookings.specialRequests,
      amount: bookings.amount,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
      customer: customers,
      table: tables,
      restaurant: restaurants,
      user: users,
    })
    .from(bookings)
    .leftJoin(customers, eq(bookings.customerId, customers.id))
    .leftJoin(tables, eq(bookings.tableId, tables.id))
    .leftJoin(restaurants, eq(bookings.restaurantId, restaurants.id))
    .leftJoin(users, eq(bookings.userId, users.id))
    .where(eq(bookings.customerId, customerId))
    .orderBy(desc(bookings.createdAt));

    return results.map(result => ({
      ...result,
      customer: result.customer!,
      restaurant: result.restaurant!,
    })) as BookingWithDetails[];
  }

  async getBookingsByDate(restaurantId: string, date: Date): Promise<BookingWithDetails[]> {
    return this.getBookings(restaurantId, date);
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const [booking] = await db
      .insert(bookings)
      .values(insertBooking)
      .returning();

    // Update customer's total bookings and last visit
    await db.update(customers)
      .set({
        totalBookings: sql`${customers.totalBookings} + 1`,
        lastVisit: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, insertBooking.customerId));

    return booking;
  }

  async updateBooking(id: string, updates: Partial<InsertBooking>): Promise<Booking> {
    const [booking] = await db
      .update(bookings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  }

  async deleteBooking(id: string): Promise<void> {
    await db.delete(bookings).where(eq(bookings.id, id));
  }

  // Analytics
  async getRestaurantStats(restaurantId: string, date: Date): Promise<{
    totalBookings: number;
    totalRevenue: number;
    averagePartySize: number;
    occupancyRate: number;
  }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [stats] = await db
      .select({
        totalBookings: count(),
        totalRevenue: sum(bookings.amount),
        averagePartySize: sum(bookings.partySize),
      })
      .from(bookings)
      .where(and(
        eq(bookings.restaurantId, restaurantId),
        gte(bookings.startTime, startOfDay),
        lte(bookings.startTime, endOfDay),
        eq(bookings.status, 'confirmed')
      ));

    const totalTables = await db.select({ count: count() })
      .from(tables)
      .where(and(eq(tables.restaurantId, restaurantId), eq(tables.isActive, true)));

    const occupancyRate = totalTables[0]?.count > 0 
      ? Math.round((stats.totalBookings / totalTables[0].count) * 100)
      : 0;

    return {
      totalBookings: stats.totalBookings || 0,
      totalRevenue: Number(stats.totalRevenue) || 0,
      averagePartySize: stats.totalBookings > 0 
        ? Math.round((Number(stats.averagePartySize) || 0) / stats.totalBookings)
        : 0,
      occupancyRate,
    };
  }
}

export const storage = new DatabaseStorage();
