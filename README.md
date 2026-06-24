# Fast Pagination Product Catalog API

A production-ready Node.js & Express backend designed for browsing, filtering, and paginating through a catalog of **200,000 products** ordered newest first. Built to show-case clean architecture, sub-millisecond database queries, data consistency under concurrent writes, and high scalability.

## 🚀 Live Demo & Services
- **Database Service**: Neon Serverless PostgreSQL
- **Backend Service**: Render (Web Service)

---

## 🛠️ Technology Stack
*   **Runtime Environment**: Node.js (v18+)
*   **Web Framework**: Express (v5.x)
*   **Database**: PostgreSQL (Hosted on Neon)
*   **Database Driver**: node-postgres (`pg` Pool)
*   **Query Input Validation**: Joi
*   **Logging**: Winston (Structured JSON in production, custom colorized in development)

---

## ⚙️ Architecture & Design Decisions

### 1. Keyset/Cursor Pagination vs. Offset Pagination
This project uses **Cursor Pagination** rather than standard offset-limit pagination (`LIMIT Y OFFSET X`).
*   **Offset Pagination Risk**: As offsets increase, performance degrades to $O(N)$ because the database must scan and discard all preceding records. Furthermore, if products are inserted while a user is browsing, records shift, causing the user to see duplicate items on the next page.
*   **Cursor Pagination Solution**: By using the values of the last retrieved item (`created_at` and `id`) as a seek boundary (`WHERE (created_at, id) < (cursor_created_at, cursor_id)`), we query database indices with $O(\log N)$ complexity. The query is stable, preventing duplicate or skipped records when concurrent inserts occur.
*   **Opaque Cursor Encoding**: Raw database keys are encoded into a URL-safe Base64 token. This prevents clients from binding to physical database schemas.

### 2. High-Performance Indexing Strategy
To support pagination both globally and inside categories, two B-Tree indexes are created:
1.  **Global Catalog Pagination**: `CREATE INDEX idx_products_created_id ON products (created_at DESC, id DESC);`
    *   Allows index-only scanning for sorted listings without in-memory sorting.
2.  **Category Filter Pagination**: `CREATE INDEX idx_products_category_created_id ON products (category, created_at DESC, id DESC);`
    *   Narrows matching rows to a single category first (equality match), then performs an index seek using the keyset.

`id DESC` is included as a secondary key to ensure deterministic sort ordering since multiple products can have identical `created_at` timestamps.

### 3. "Fetch Limit + 1" Pattern
Instead of running a costly `SELECT COUNT(*)` count query to determine if there is another page (which scans the entire table), the repository fetches `limit + 1` rows. If the database returns `limit + 1` records, we know a next page exists. The extra row is discarded from the API response but its properties are used to serialize the `next_cursor`.

### 4. Fast Seeding (200,000 Records)
Seeding 200,000 products using single row inserts would make 200,000 round-trips to Neon, taking over 2 hours. Our seed script batches inserts into chunks of **5,000 products per SQL query**, executing the entire generation in **under 10 seconds** over standard connections.

---

## 📂 Project Directory Structure

```
├── src/
│   ├── config/
│   │   └── database.js          # DB Connection Pool configuration
│   ├── controllers/
│   │   └── productController.js # API Controller translating requests & formatting responses
│   ├── database/
│   │   ├── migrate.js           # Database migration runner
│   │   ├── schema.sql           # Database table & index definitions
│   │   └── seed.js              # 200k record fast batch seeder
│   ├── middleware/
│   │   ├── errorMiddleware.js   # Centralized error handler
│   │   └── validator.js         # Joi schema input sanitizer
│   ├── repositories/
│   │   └── productRepository.js # Data Access Object executing raw SQL queries
│   ├── routes/
│   │   └── productRoutes.js     # API Route bindings
│   ├── utils/
│   │   ├── cursorHelper.js      # Base64 cursor encoder/decoder
│   │   └── logger.js            # Winston environment logging utility
│   ├── app.js                   # Express application setup
│   └── server.js                # Process lifecycle and startup script
├── .env.example                 # Configuration blueprint
├── package.json                 # Dependency manifests
└── README.md                    # Submission documentation
```

---

## 🛠️ Local Development & Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org) (v18 or higher)
- A running PostgreSQL database (Local or Neon Cloud database instance)

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy the template and replace the `DATABASE_URL` with your actual Postgres credentials:
```bash
cp .env.example .env
```
Inside `.env`:
```ini
PORT=5000
NODE_ENV=development
DATABASE_URL=postgres://your_user:your_password@your_host/your_db?sslmode=require
```

### 4. Run Migrations (Create Table & Indexes)
```bash
npm run migrate
```

### 5. Seed 200,000 Products
```bash
npm run seed
```

### 6. Start the Server
*   For development mode (with hot-reloading):
    ```bash
    npm run dev
    ```
*   For production mode:
    ```bash
    npm start
    ```

---

## 📡 API Reference & Verification

### 1. Health Check
*   **Request**: `GET /health`
*   **Response**: `200 OK`
    ```json
    {
      "status": "UP",
      "timestamp": "2026-06-23T13:10:00.000Z"
    }
    ```

### 2. Get Products (Newest First)
*   **Endpoint**: `GET /api/v1/products`
*   **Query Parameters**:
    *   `limit` (Optional, integer: 1-100, default 20): Size of page.
    *   `category` (Optional, string): Filter by category.
    *   `cursor` (Optional, string): Base64 keyset pagination token.

#### Sample Request 1: Fetching first page (All products, limit 2)
*   **URL**: `GET http://localhost:5000/api/v1/products?limit=2`
*   **Response**:
    ```json
    {
      "status": "success",
      "results": 2,
      "data": {
        "products": [
          {
            "id": 200000,
            "name": "Eco-Friendly Apex Water Bottle #200000",
            "category": "Sports & Outdoors",
            "price": "542.10",
            "created_at": "2026-06-23T13:00:00.000Z",
            "updated_at": "2026-06-23T13:00:00.000Z"
          },
          {
            "id": 199999,
            "name": "Smart Nova Headphones #199999",
            "category": "Electronics",
            "price": "129.99",
            "created_at": "2026-06-23T12:59:50.000Z",
            "updated_at": "2026-06-23T12:59:50.000Z"
          }
        ],
        "pagination": {
          "limit": 2,
          "next_cursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi0wNi0yM1QxMjo1OTo1MC4wMDBaIiwiaWQiOjE5OTk5OX0="
        }
      }
    }
    ```

#### Sample Request 2: Fetching second page using the cursor
*   **URL**: `GET http://localhost:5000/api/v1/products?limit=2&cursor=eyJjcmVhdGVkX2F0IjoiMjAyNi0wNi0yM1QxMjo1OTo1MC4wMDBaIiwiaWQiOjE5OTk5OX0=`
*   **Response**:
    ```json
    {
      "status": "success",
      "results": 2,
      "data": {
        "products": [
          {
            "id": 199998,
            "name": "Classic Zenith Novel #199998",
            "category": "Books",
            "price": "14.95",
            "created_at": "2026-06-23T12:59:40.000Z",
            "updated_at": "2026-06-23T12:59:40.000Z"
          },
          {
            "id": 199997,
            "name": "Ergonomic Summit Chair #199997",
            "category": "Home & Kitchen",
            "price": "249.99",
            "created_at": "2026-06-23T12:59:30.000Z",
            "updated_at": "2026-06-23T12:59:30.000Z"
          }
        ],
        "pagination": {
          "limit": 2,
          "next_cursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi0wNi0yM1QxMjo1OTozMC4wMDBaIiwiaWQiOjE5OTk5N30="
        }
      }
    }
    ```

#### Sample Request 3: Filtering by Category
*   **URL**: `GET http://localhost:5000/api/v1/products?limit=2&category=Electronics`
*   **Response**:
    ```json
    {
      "status": "success",
      "results": 2,
      "data": {
        "products": [
          {
            "id": 199999,
            "name": "Smart Nova Headphones #199999",
            "category": "Electronics",
            "price": "129.99",
            "created_at": "2026-06-23T12:59:50.000Z",
            "updated_at": "2026-06-23T12:59:50.000Z"
          },
          {
            "id": 199994,
            "name": "Wireless Quantum Keyboard #199994",
            "category": "Electronics",
            "price": "89.50",
            "created_at": "2026-06-23T12:59:00.000Z",
            "updated_at": "2026-06-23T12:59:00.000Z"
          }
        ],
        "pagination": {
          "limit": 2,
          "next_cursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi0wNi0yM1QxMjo1OTowMC4wMDBaIiwiaWQiOjE5OTk5NH0="
        }
      }
    }
    ```

---

## 💾 SQL Queries Used Internally

### 1. Global Product Cursor Lookups
```sql
SELECT id, name, category, price, created_at, updated_at 
FROM products 
WHERE (created_at < $1 OR (created_at = $1 AND id < $2)) 
ORDER BY created_at DESC, id DESC 
LIMIT $3;
```

### 2. Category-Filtered Product Cursor Lookups
```sql
SELECT id, name, category, price, created_at, updated_at 
FROM products 
WHERE category = $1 AND (created_at < $2 OR (created_at = $2 AND id < $3)) 
ORDER BY created_at DESC, id DESC 
LIMIT $4;
```

---

## 🌐 Deployment Instructions

### A. Neon (PostgreSQL Database Setup)
1.  Sign in to [Neon Console](https://console.neon.tech).
2.  Create a new project (select desired region and Postgres version).
3.  Go to the **Connection Details** section on your Neon dashboard.
4.  Copy the connection string (ensure it uses `sslmode=require`).
5.  Save this string in your `.env` file or Render configurations as `DATABASE_URL`.
6.  Execute migrations locally targeting this Database URL by running:
    ```bash
    npm run migrate
    ```
7.  Populate the database by running:
    ```bash
    npm run seed
    ```

### B. Render (Backend API Service Setup)
1.  Create a new web service on [Render](https://render.com).
2.  Connect your GitHub repository containing the code.
3.  Set settings:
    -   **Environment**: `Node`
    -   **Build Command**: `npm install`
    -   **Start Command**: `npm start`
4.  Configure the following Environment Variables in Render:
    -   `NODE_ENV` = `production`
    -   `PORT` = `10000` (or leave empty, Render binds it automatically)
    -   `DATABASE_URL` = `postgres://your_neon_url_here?sslmode=require`
    -   `DB_POOL_MAX` = `10`
5.  Deploy the service. Render will automatically verify the `/health` endpoint to confirm the service is live.

---

## 📝 Submission Notes

### What I Chose and Why

I built this project using Node.js, Express.js, PostgreSQL, and Neon.

I chose Node.js and Express because I am most comfortable with JavaScript and have previously built projects using the MERN stack. For the database, I chose PostgreSQL on Neon because this assignment involves handling a large dataset and efficient pagination.

For pagination, I used cursor-based pagination instead of offset-based pagination. The main reason was the assignment requirement that users should not see duplicate products or miss products when new products are added while browsing. Using `created_at` and `id` as the cursor allows pagination to remain consistent even when data changes.

To generate the required 200,000 products, I created a seed script that inserts records in batches of 5,000 instead of inserting one record at a time. This significantly reduces the number of database queries and makes the seeding process much faster.

### What I Would Improve With More Time

If I had more time, I would focus on improvements that would make the project easier to maintain and demonstrate:

* Add automated tests for product listing, filtering, and cursor pagination.
* Build a simple frontend UI to visually browse products and test pagination.
* Add Swagger/OpenAPI documentation for easier API exploration.
* Add Docker configuration for simpler deployment and setup.
* Add request monitoring and better production logging.
* Perform load testing and benchmark the pagination queries under higher traffic.

My main focus for this submission was ensuring that the backend correctly handles large datasets and provides consistent pagination while data changes.

### How I Used AI

I used AI as a learning and development assistant during this assignment.

This was my first time working with PostgreSQL and Neon. AI helped me understand PostgreSQL concepts, connection pooling, indexing, schema creation, batch inserts, and cursor pagination. It also helped generate boilerplate code and explain unfamiliar concepts.

However, I did not rely solely on generated code. I reviewed the implementation, tested all API endpoints, verified the database behavior, studied the seed script, and learned how the cursor pagination logic works so that I can explain and modify the code myself.

During development I encountered issues that required debugging and manual verification, such as request validation problems and understanding how PostgreSQL differs from MongoDB. I used these situations as opportunities to learn rather than simply replacing code.

This assignment helped me gain hands-on experience with PostgreSQL, Neon, connection pooling, indexing, batch inserts, and cursor-based pagination, which were all new concepts for me before starting this project.
