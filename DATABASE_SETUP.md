# PostgreSQL Database Setup Guide

## Prerequisites
- PostgreSQL installed and running
- Database admin credentials

## Setup Steps

### 1. Create the Database
```sql
CREATE DATABASE chama_db;
```

### 2. Connect to the Database
```bash
psql -U postgres -d chama_db
```

### 3. Run the Schema
Execute the SQL commands in `src/config/schema.sql`:
```sql
\i src/config/schema.sql
```

Or paste the entire schema.sql content into your PostgreSQL client.

### 4. Environment Variables
Copy `.env.example` to `.env` and update with your PostgreSQL credentials:
```bash
cp .env.example .env
```

Update the following in `.env`:
```
DB_USER=postgres          # Your PostgreSQL username
DB_PASSWORD=your_password # Your PostgreSQL password
DB_HOST=localhost         # Database host (default: localhost)
DB_PORT=5432              # Database port (default: 5432)
DB_NAME=chama_db          # Database name
JWT_SECRET=your_secret    # Generate a strong JWT secret
```

### 5. Start the Server
```bash
npm install
npm run dev
```

## Database Tables

The schema creates the following tables:
- **users** - User accounts with roles (admin/member)
- **deposits** - Financial deposits with transaction tracking
- **withdrawals** - Withdrawal requests with approval workflow
- **audit_logs** - Complete audit trail of all actions

## Indexes
Performance indexes are automatically created on:
- `deposits.user_id`
- `withdrawals.user_id`
- `audit_logs.user_id`
- `audit_logs.created_at`

## Troubleshooting

### Connection Error
- Ensure PostgreSQL is running
- Verify credentials in `.env` file
- Check DB_HOST and DB_PORT are correct

### Schema Error
- Ensure the database exists
- Check that you're connected to the correct database
- Run `\l` in psql to list all databases

### Table Already Exists
- The schema uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times
- To reset: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
