# Soko Motors Kenya

Soko Motors Kenya is a production-style startup MVP for a trust-first Kenyan car marketplace built to outperform generic classifieds with seller verification, dealer tooling, pricing intelligence, featured inventory, and subscription monetization.

## Stack

- Next.js (App Router) + React
- Node.js + Express
- MongoDB + Mongoose
- Tailwind CSS
- JWT authentication

## Product Highlights

- Verified buyer, seller, dealer, and admin accounts
- Seller verification flow with simulated ID upload metadata
- Advanced car listing model for Kenyan inventory workflows
- Price intelligence labels: `Good Deal`, `Fair Price`, `Overpriced`
- Search and filtering for Kenyan cities, import status, and hire purchase
- Rich detail page with gallery, seller profile, ratings, reports, and WhatsApp lead capture
- Dealer dashboard for listing management, views, leads, saves, subscriptions, and featured boosts
- Admin panel for user verification, listing approval, and suspicious listing moderation

## Project Structure

```text
.
├─ apps/
│  ├─ api/   # Express + MongoDB backend
│  └─ web/   # Next.js + Tailwind frontend
├─ package.json
└─ README.md
```

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example files and update values:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Required values:

- `apps/api/.env`
  - `PORT`
  - `MONGO_URI`
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
  - `CLIENT_URL`
- `apps/web/.env.local`
  - `NEXT_PUBLIC_API_URL`

### 3. Seed the database

```bash
npm run seed
```

Seeded demo accounts:

- Admin: `admin@sokomotors.co.ke / Pass1234!`
- Dealer: `dealer@sokomotors.co.ke / Pass1234!`
- Buyer: `buyer@sokomotors.co.ke / Pass1234!`
- Seller: `seller@sokomotors.co.ke / Pass1234!`

### 4. Start the apps

```bash
npm run dev
```

- Frontend: `http://localhost:3000`
- API: `http://localhost:5000`

## Core API Areas

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/users/me/verify`
- `PATCH /api/users/me/subscription`
- `GET /api/users/me/dashboard`
- `GET /api/listings`
- `GET /api/listings/featured`
- `GET /api/listings/:id`
- `POST /api/listings`
- `PUT /api/listings/:id`
- `PATCH /api/listings/:id/sold`
- `POST /api/listings/:id/feature`
- `POST /api/listings/:id/favorite`
- `POST /api/listings/:id/lead`
- `POST /api/listings/:id/report`
- `POST /api/listings/:id/rate`
- `GET /api/admin/overview`
- `GET /api/admin/users`
- `GET /api/admin/listings`
- `PATCH /api/admin/users/:id/verify`
- `PATCH /api/admin/listings/:id/review`

## Notes

- Image uploads are simulated as URL-based inputs to keep the MVP deployable without object storage.
- Verification uploads are simulated by storing an ID number and file name for moderation.
- Pricing insight uses a stored average market-price collection with listing fallback aggregation.
- Listings created by sellers and dealers enter a moderation queue before approval.

## Scaling Ideas

- Add object storage for real uploads and KYC document review
- Introduce Redis caching for listings and filters
- Add payment integration for subscription billing and featured boosts
- Add dealer team accounts, CRM exports, and richer lead routing
- Expand price intelligence with make/model/year/location confidence bands
