# Paisa Bazar 24×7 - Employee Management System

## Overview

This is **Paisa Bazar 24×7**, an Employee Attendance, Live Location Tracking & Lead Management System. It's a full-stack web application with a React frontend and Express.js backend, using PostgreSQL for data storage. The system supports a hierarchical role-based structure: Managing Director (MD) → Area Manager (AM) → Team Leader (TL) → Employee, where each level can create and manage users beneath them.

Key features include:
- JWT-based authentication with role-based access control
- Employee attendance tracking with geolocation (punch in/out)
- Live location tracking on interactive maps (Leaflet)
- Lead management with status tracking across lending companies
- Team/user management with hierarchical permissions
- Dashboard analytics per role

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled by Vite
- **Routing**: React Router DOM with protected routes based on auth state
- **State Management**: React Context API for auth (`AuthContext`), with `@tanstack/react-query` available for server state
- **UI Components**: shadcn/ui component library (new-york style) built on Radix UI primitives, styled with Tailwind CSS
- **Styling**: Tailwind CSS v4 with CSS variables for theming, custom color tokens defined in `client/src/styles/globals.css` and `client/src/index.css`
- **Maps**: Leaflet + react-leaflet for live location tracking
- **Entry point**: `client/src/main.tsx` → `App.tsx`
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript, executed via `tsx`
- **Architecture pattern**: Route-based with a storage abstraction layer (not strict MVC but similar separation)
- **Authentication**: JWT tokens (stored in localStorage on client, sent as `Authorization: Bearer <token>` header)
- **Password hashing**: bcryptjs
- **Authorization**: Role-based middleware (`authorizeRoles`) checking user roles (MD, AM, TL, EMPLOYEE)
- **API prefix**: All API routes start with `/api/`
- **Database seeding**: MD account (`md@paisabazar247.com` / `admin123`) is auto-seeded on startup
- **Dev server**: Vite dev server with HMR is integrated into Express during development via `server/vite.ts`
- **Production**: Client is built to `dist/public`, server is bundled with esbuild to `dist/index.cjs`

### Shared Code (`shared/` directory)
- **`schema.ts`**: Drizzle ORM schema definitions for PostgreSQL tables (`users`, `leads`, `attendance`) plus Zod insert schemas via `drizzle-zod`
- **`routes.ts`**: API route definitions with Zod validation schemas for inputs and responses — acts as a typed API contract between frontend and backend

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Connection**: `pg` Pool using `DATABASE_URL` environment variable
- **Schema management**: `drizzle-kit push` for schema migrations (`npm run db:push`)
- **Storage layer**: `server/storage.ts` provides a `DatabaseStorage` class implementing `IStorage` interface, abstracting all DB operations

### Database Tables
1. **users** — id, name, email, password, role (MD/AM/TL/EMPLOYEE), phone, employeeId, region, areaManagerId, teamLeaderId, isActive, lastLocationLat/Lng/Timestamp, createdAt
2. **leads** — id, customerName, phone, company, loanAmount, status (New/In Progress/Converted/Lost), notes, assignedToId, createdById, createdAt
3. **attendance** — id, and additional fields for date, punch-in/out times, location data

### API Structure
- `POST /api/auth/login` — Authenticate with email/password, returns JWT + user
- `GET /api/auth/me` — Get current authenticated user
- `GET /api/users` — List users (filtered by role permissions)
- `POST /api/users` — Create new user (role-restricted)
- `PUT /api/users/:id` — Update user
- `DELETE /api/users/:id` — Delete user
- `GET /api/leads` — List leads
- `POST /api/leads` — Create lead
- `PUT /api/leads/:id` — Update lead
- `GET /api/attendance` — List attendance records
- `POST /api/attendance` — Create attendance record (punch in/out)
- `GET /api/location/team` — Get team member locations for live tracking

### Build Process
- **Dev**: `npm run dev` — runs Express + Vite dev server with HMR on port 8000
- **Build**: `npm run build` — Vite builds frontend to `dist/public`, esbuild bundles server to `dist/index.cjs`
- **Production**: `npm start` — runs the bundled server serving static files

## External Dependencies

### Database
- **PostgreSQL** — Primary database, connected via `DATABASE_URL` environment variable
- **Drizzle ORM** — Type-safe SQL query builder and schema manager
- **drizzle-kit** — Schema migration tooling (`db:push` command)

### Authentication & Security
- **jsonwebtoken (JWT)** — Token generation and verification
- **bcryptjs** — Password hashing
- **express-session** + **connect-pg-simple** — Session management (available but JWT is primary auth)

### Frontend Libraries
- **React** + **React DOM** — UI framework
- **React Router DOM** — Client-side routing
- **@tanstack/react-query** — Server state management
- **Radix UI** — Accessible UI primitives (full suite of components)
- **shadcn/ui** — Pre-built component library on top of Radix
- **Tailwind CSS** — Utility-first CSS framework
- **Leaflet** + **react-leaflet** — Interactive maps for location tracking
- **Recharts** — Dashboard charts and data visualization
- **Framer Motion** — Animations
- **date-fns** — Date formatting
- **Lucide React** — Icon library
- **class-variance-authority** + **clsx** — Styling utilities
- **react-hook-form** + **@hookform/resolvers** — Form handling with Zod validation
- **cmdk** — Command palette component

### Build Tools
- **Vite** — Frontend dev server and bundler
- **esbuild** — Server bundling for production
- **tsx** — TypeScript execution for development
- **PostCSS** + **Autoprefixer** — CSS processing

### Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — Secret for JWT signing (falls back to "default_secret")