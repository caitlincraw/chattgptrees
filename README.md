This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app), with a NestJS backend using Supabase for data storage.

## Project Structure

- `src/` - Next.js frontend application
- `backend/` - NestJS backend API with Supabase integration

## Getting Started

### Frontend (Next.js)

1. Create a `.env.local` file in the root directory with the following content (optional):
```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Note: Address search uses Photon (Komoot) geocoding API which is free and requires no API key.

2. Install dependencies and run the development server:

```bash
npm install
npm run dev

```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

### Backend (NestJS)

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following content:
```env
# Server Configuration
PORT=3001
FRONTEND_URL=http://localhost:3000

# Supabase Configuration
# Get these values from your Supabase project settings: https://app.supabase.com/project/_/settings/api
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Configure your Supabase credentials:
   - Get your Supabase URL and anon key from your [Supabase project settings](https://app.supabase.com/project/_/settings/api)
   - Update `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the `.env` file

5. Start the backend server:
```bash
npm run start:dev
```

The backend will start on `http://localhost:3001` (or the port specified in your `.env` file).

For more details about the backend, see [backend/README.md](./backend/README.md).

## Learn More

To learn more about Next.js, look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
