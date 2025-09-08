# RestaurantCRM - Restaurant Booking Management System

## Overview

RestaurantCRM is a comprehensive SaaS platform for restaurant booking management with three distinct interfaces: an admin panel for system management, a web panel for restaurant operations, and a mobile interface for customers. The system supports multi-tenancy with role-based access control, drag-and-drop table management, real-time booking calendars, and comprehensive analytics. Built as a modern full-stack application with TypeScript throughout.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React 18 with TypeScript**: Component-based architecture using functional components and hooks
- **Tailwind CSS + Shadcn/ui**: Utility-first styling with pre-built accessible components
- **React Router (Wouter)**: Client-side routing with role-based protected routes
- **React Query (@tanstack/react-query)**: Server state management, caching, and synchronization
- **React DnD**: Drag-and-drop functionality for table arrangement in floor plan editor
- **Form Management**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Express.js with TypeScript**: REST API server with middleware-based architecture
- **JWT Authentication**: Token-based authentication with role-based authorization middleware
- **Drizzle ORM**: Type-safe database queries with PostgreSQL
- **Zod Validation**: Runtime type checking and input validation
- **Session Management**: Secure session handling with bcrypt password hashing

### Database Design
- **Multi-tenant Architecture**: Restaurant isolation with role-based data access
- **Relational Schema**: Users, restaurants, tables, customers, and bookings with proper foreign key relationships
- **Enum Types**: Status tracking for bookings and tables using PostgreSQL enums
- **JSONB Fields**: Flexible storage for restaurant settings, opening hours, and table positioning

### Authentication & Authorization
- **Three-tier Role System**: 
  - Admin: System-wide management and analytics
  - Restaurant Manager: Single restaurant operations
  - Customer: Booking creation and management
- **JWT Middleware**: Token validation and user context injection
- **Resource-level Authorization**: Restaurant managers can only access their assigned restaurant data

### State Management Strategy
- **Server State**: React Query for API data with intelligent caching and background updates
- **Client State**: React hooks (useState, useContext) for UI state and user session
- **Form State**: React Hook Form for complex form validation and submission

### Component Architecture
- **Shared UI Components**: Reusable shadcn/ui components with consistent styling
- **Feature-based Organization**: Components grouped by functionality (booking, dashboard, floor-plan)
- **Layout Components**: Sidebar and header components with role-based navigation
- **Custom Hooks**: Encapsulated business logic for data fetching and form handling

## External Dependencies

### Database & ORM
- **PostgreSQL**: Primary database with Neon serverless hosting
- **Drizzle ORM**: Type-safe database operations with schema migrations
- **Drizzle Kit**: Database schema management and migration tools

### UI & Styling
- **Radix UI**: Headless accessible components via shadcn/ui
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Consistent icon library throughout the application

### Development & Build Tools
- **Vite**: Frontend build tool with hot module replacement
- **TypeScript**: Static typing across frontend, backend, and shared schemas
- **ESBuild**: Fast backend bundling for production builds

### Authentication & Security
- **bcrypt**: Password hashing and verification
- **jsonwebtoken**: JWT token generation and validation
- **Zod**: Runtime schema validation for API endpoints

### Data Fetching & Caching
- **@tanstack/react-query**: Server state management with intelligent caching
- **React Hook Form**: Form state management with validation integration
- **@hookform/resolvers**: Zod integration for form validation

### Drag & Drop
- **React DnD**: Drag and drop functionality for table positioning
- **HTML5 Backend**: Native browser drag and drop support