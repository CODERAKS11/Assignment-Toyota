# Smart Incentive Calculator with Dynamic Slab Engine
### Nippon Toyota Internship Assignment — Task 2 Submission (Angular Version)

A robust, enterprise-grade Angular 18+ single-page application built with a premium glassmorphic dark theme. It features a complete role-based workflow (RBAC) enabling administrators to configure vehicle lines and adjust slab milestones dynamically, while sales officers log volumes and track scheduled monthly payouts in real-time.

---

## 🚀 Key Features

### 👤 Role-Based Workflows
* **Role A: Administrative Dashboard**
  * **Vehicle Registry CRUD:** Add, edit, or archive showroom car model specifications (Model Name, Base Suffix, Engine/Variant).
  * **Dynamic Slab Engine:** An interactive tiered slab configuration engine (e.g. 1-3 cars = ₹1000/car, 4-7 = ₹2000/car, 8+ = ₹3500/car).
  * **Cascading Continuity Guards:** Modifying any slab automatically shifts boundaries in real-time to **prevent overlays or gaps**.
* **Role B: Sales Officer Portal**
  * **Month Selector:** Switch between logs for historical auditing or active record keeping.
  * **Showroom Quantities Logger:** satisfying counter widgets to adjust quantities sold per model.
  * **Live Payout Estimator:** Instantly computes combined volume, evaluates active incentive tier, calculates flat payout totals, and highlights matching active slabs.
  * **Progress Targets Bar:** Displays units needed to unlock the next payout tier, encouraging sales scaling.

### 🛡️ Core Infrastructure & Security
* **Flexible Database Adapter (Zero-Config DB):** Custom Angular service that connects to a **Supabase PostgreSQL** database in production, and automatically falls back to a **local browser localStorage state** in development. Runs perfectly instantly out-of-the-box!
* **Functional Route Guards:** Functional router interceptors securing `/admin` and `/sales-officer` endpoints.
* **Secure Sessions:** Safe client session serialization excluding passwords and leveraging browser-native SHA-256 Web Crypto hashing.

---

## 🛠️ Tech Stack & Architecture

* **Framework:** Angular 18+ (Standalone Components API)
* **Language:** TypeScript (Strict Mode)
* **Styling:** CSS Modules & Scoped CSS — Custom HSL color variables, CSS Grid, frosted panels, and micro-interactions.
* **Authentication:** Browser-native SHA-256 Web Crypto API & local storage sessions.
* **Database & ORM:** Supabase JS Client & Native Browser LocalStorage Adapter.

```
📁 d:/Angular/Toyota-Assignment/
├── 📄 angular.json                   # Angular Workspace config
├── 📄 package.json                   # Dependencies & npm scripts
├── 📄 schema.sql                     # Supabase database creation SQL
├── 📄 README.md                      # Documentation
├── 📁 public/                        # Favicon & assets
└── 📁 src/
    ├── 📄 index.html                 # Index file
    ├── 📄 main.ts                    # Application bootstrap
    ├── 📄 styles.css                 # Global HSL slate/indigo theme
    └── 📁 app/
        ├── 📄 app.routes.ts          # Angular Route definitions
        ├── 📄 app.config.ts          # Global app providers
        ├── 📄 app.ts                 # Main App Component
        ├── 📄 app.html
        ├── 📁 guards/
        │   └── 📄 auth.guard.ts      # Functional RBAC route guards
        ├── 📁 services/
        │   ├── 📄 auth.service.ts    # Web Crypto hashing & Session manager
        │   └── 📄 database.service.ts# Hybrid Supabase/LocalStorage Service
        └── 📁 components/
            ├── 📁 login/             # Glassmorphic Login Form
            ├── 📁 admin/             # Registry & Slabs CRUD Panels
            └── 📁 sales-officer/     # Reactive Calculator dashboard
```

---

## ⚙️ Quick Installation & Local Setup

### 1. Clone & Install Dependencies
1. Navigate to the project root directory in your terminal:
   ```bash
   cd Toyota-Assignment
   ```
2. Install standard dependencies:
   ```bash
   npm install
   ```

### 2. Database Connection (Standard / Supabase Mode)
By default, the application runs in **Zero-Config Hybrid Local Mode** using browser `localStorage` with seeded data. You do **not** need any environment variables or backend configuration to run it locally.

To connect to your **Live Supabase PostgreSQL instance**:
1. Copy the contents of `schema.sql` at the root of the project.
2. Go to your **Supabase Dashboard ➡️ SQL Editor** and paste & run the script to initialize tables, constraints, and mock seed data.
3. Open `src/app/services/database.service.ts` in your text editor and insert your credentials into the constructor:
   ```typescript
   const supabaseUrl = 'https://your-project-id.supabase.co';
   const supabaseKey = 'your-supabase-anon-key';
   ```
The app will automatically detect these values, bypass `localStorage`, and query your live Supabase database!

### 3. Run Development Server
Start the development server:
```bash
npx ng serve
```
Open your browser and navigate to **`http://localhost:4200`** to test.

---

## 🔑 Demo Test Credentials

To test both distinct workflows out of the box, use the following pre-configured credentials (hashed securely using SHA-256 internally):

| Portal Role | Username | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin` | `admin123` | Configure showroom models, pricing slabs |
| **Sales Officer** | `officer1` | `sales123` | Log monthly unit volumes, view payouts |
| **Sales Officer** | `officer2` | `sales123` | Separate profile tracking independent logs |

---

## 📐 Verification & Math Logic

The incentive payout structure is built using Toyota's **Flat Tier volume default** based on **total combined monthly unit sales** across all model lines:

* **Slab 1:** 1 – 3 cars sold ➡️ ₹1,000 per car
* **Slab 2:** 4 – 7 cars sold ➡️ ₹2,000 per car
* **Slab 3:** 8+ cars sold ➡️ ₹3,500 per car

#### Sample Calculations:
1. **Scenario A (Under threshold):** If you sell `0` units ➡️ **₹0** payout.
2. **Scenario B (Tier 1):** Sell 1 Camry + 1 RAV4 = `2` units sold. Falls into Slab 1 (1–3). 
   * *Incentive:* `2 × ₹1,000` = **₹2,000 total payout**.
3. **Scenario C (Tier 2):** Sell 2 Camry + 2 RAV4 + 1 Corolla = `5` units sold. Falls into Slab 2 (4–7). 
   * *Incentive:* `5 × ₹2,000` = **₹10,000 total payout**.
4. **Scenario D (Tier 3 limit):** Sell 4 Camry + 3 RAV4 + 2 Corolla = `9` units sold. Falls into Slab 3 (8+). 
   * *Incentive:* `9 × ₹3,500` = **₹31,500 total payout**.
