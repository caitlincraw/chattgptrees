# ChatGPTrees Backend

NestJS backend API for ChatGPTrees with Supabase integration.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account and project

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the `backend` directory:
```bash
cp .env.example .env
```

3. Configure your Supabase credentials in `.env`:
   - Sign in to [Supabase Dashboard](https://app.supabase.com)
   - Select your project (or create a new one)
   - Go to **Settings** (gear icon) → **API**
   - Copy the **Project URL** → use for `SUPABASE_URL`
   - Copy the **anon public** key → use for `SUPABASE_ANON_KEY`
   - Go to **Settings** → **API** → **JWT Settings** and copy the **JWT Secret** → use for `SUPABASE_JWT_SECRET` (optional but recommended)
   - Update these values in your `.env` file

4. Set up your Supabase database (choose one method):

   **Method A: Using Supabase CLI (Recommended)**
   ```bash
   # Option 1: Install via Homebrew (macOS/Linux)
   brew install supabase/tap/supabase
   
   # Option 2: Use npx (no installation needed - recommended)
   # Just use npx commands directly
   
   # First, login to Supabase (one-time setup)
   npx supabase login
   
   # Then link to your project (get project ref from Dashboard → Settings → General)
   npm run db:link -- --project-ref your-project-ref
   # Or: npx supabase link --project-ref your-project-ref
   
   # Push migrations to your Supabase project
   npm run db:push
   ```
   See `MIGRATION_SETUP.md` for detailed instructions.
   
   **Note:** Supabase CLI requires Node.js 20.17.0+ or 22.9.0+. If you're on Node 18, use `npx` (no installation needed) or upgrade Node.js.

   **Method B: Manual SQL (Alternative)**
   - In Supabase Dashboard, go to **SQL Editor**
   - Click **"New query"**
   - Copy and paste the SQL from `supabase/migrations/20240101000000_initial_schema.sql`
   - Click **"Run"** or press `Cmd/Ctrl + Enter`
   
   This creates a standalone `users` table and a `trees` table with proper Row Level Security policies.

5. Start the development server:
```bash
npm run start:dev
```

The server will start on `http://localhost:3001` (or the port specified in your `.env` file).

## Project Structure

```
backend/
├── src/
│   ├── app.module.ts          # Root application module
│   ├── app.controller.ts      # Root controller
│   ├── app.service.ts         # Root service
│   ├── main.ts                # Application entry point
│   ├── supabase/              # Supabase integration
│   │   ├── supabase.module.ts
│   │   └── supabase.service.ts
│   └── example/               # Example module (can be removed)
│       ├── example.module.ts
│       ├── example.controller.ts
│       ├── example.service.ts
│       └── dto/
└── ...
```

## API Endpoints

### Health Check
- `GET /` - Welcome message
- `GET /health` - Health check endpoint

### Authentication Endpoints
- `POST /auth/register` - Register a new user
  - Body: `{ "email": "user@example.com", "password": "password123", "fullName": "John Doe" }`
- `POST /auth/login` - Login user
  - Body: `{ "email": "user@example.com", "password": "password123" }`
  - Returns: `{ "user": {...}, "access_token": "..." }`
- `POST /auth/forgot-password` - Request password reset
  - Body: `{ "email": "user@example.com" }`

### Example Endpoints (for reference)
- `GET /example` - Get all examples
- `GET /example/:id` - Get example by ID
- `POST /example` - Create new example
- `PUT /example/:id` - Update example
- `DELETE /example/:id` - Delete example

## Using Supabase

The `SupabaseService` is available globally. Inject it into any service:

```typescript
import { Injectable } from '@nestjs/common';
import { SupabaseService } from './supabase/supabase.service';

@Injectable()
export class YourService {
  constructor(private supabaseService: SupabaseService) {}

  async getData() {
    const { data, error } = await this.supabaseService
      .from('your_table')
      .select('*');
    
    return data;
  }
}
```

## Scripts

- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build the application
- `npm run start:prod` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3001) |
| `FRONTEND_URL` | Frontend URL for CORS | No (default: http://localhost:3000) |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret (found in Settings > API > JWT Settings) | No (recommended) |

## Next Steps

1. Remove the example module if you don't need it
2. Create your own modules, controllers, and services
3. Set up your Supabase database tables
4. Implement authentication if needed
5. Add more features as required

