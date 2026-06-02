# Toyota Dealer Incentive Engine (DMS)

**Live Demo:** [https://assignment-toyota.vercel.app/](https://assignment-toyota.vercel.app/)

A  dealer management portal to track car sales, calculate sales officer incentives, manage showroom inventory, and handle monthly targets.

---

## How to Run Locally

### 1. Prerequisites
* [Node.js (v18+)](https://nodejs.org/)
* A [Supabase](https://supabase.com) PostgreSQL database

### 2. Backend Setup
1. Go to the `server/` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `server/` directory with:
   ```env
   PORT=3000
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_service_role_key
   JWT_SECRET=any_secret_key_for_jwt
   ```
4. Run the queries in the root `schema.sql` in your Supabase SQL editor to create the tables and insert mock data.
5. Start the server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Go to the root directory and install dependencies:
   ```bash
   npm install
   ```
2. Start the Angular application:
   ```bash
   npx ng serve
   ```
3. Open `http://localhost:4200` in your browser.

*Note: The frontend is set up to talk to the Vercel backend (`https://assignment-toyota-backend.vercel.app/api`) by default. If you want to use your local server, update the API base URLs in `src/app/services/database.service.ts` and `src/app/services/auth.service.ts`.*

---

## Test Accounts

| Role | Username | Password | Can test... |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Managing cars, incentive slabs, assigning targets, and overrides. |
| **Sales Officer** | `officer1` | `sales123` | Submitting monthly sales (Rahul Sharma), checking target progress, reading announcements, and viewing earnings. |
| **Sales Officer** | `officer2` | `sales123` | Logging sales and viewing ledger (Priya Patel). |

---

## Incentive Rules & Logic

1. **Volume Slabs (Base rate per car):**
   * 1–3 cars sold: ₹1,000 / car
   * 4–7 cars sold: ₹2,000 / car
   * 8+ cars sold: ₹3,500 / car

2. **Model Overrides:**
   * **Flat Override:** Replaces the base slab rate (e.g. Fortuner pays flat ₹5,000/car).
   * **Bonus Override:** Adds to the base slab rate (e.g. Hilux pays base rate + ₹1,500/car).

3. **Target Completion Bonus:**
   * Reaching 100% of target adds a bonus (flat amount or multiplier).

### Math Example (Rahul Sharma, Target = 10 cars):
If Rahul sells **16 cars**:
* **10 x Fortuner** (Flat override ₹5,000) = ₹50,000
* **4 x Corolla Altis** (Qualifies for Slab 3 standard rate of ₹3,500 because eligible sales = 14) = 4 * ₹3,500 = ₹14,000
* **2 x Glanza** (Ineligible model) = ₹0
* **Target Achievement Bonus** (14 eligible sales >= 10 target) = ₹5,000 flat bonus.

**Total Payout:** ₹50,000 + ₹14,000 + ₹5,000 = **₹69,000**