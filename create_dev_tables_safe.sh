#!/bin/bash
# filepath: create_dev_tables_safe.sh
# Safe version that uses environment variables

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Database connection parameters from environment variables
PGHOST="${DB_HOST:-localhost}"
PGPORT="${DB_PORT:-5432}"
PGUSER="${DB_USER:-postgres}"
PGDATABASE="${DB_NAME:-defaultdb}"
PGPASSWORD="${DB_PASSWORD}"

export PGPASSWORD

# Check if required environment variables are set
if [ -z "$DB_PASSWORD" ]; then
    echo "Error: DB_PASSWORD environment variable is not set"
    echo "Please create a .env file or set the environment variable"
    exit 1
fi

# Hash the admin password using Python's bcrypt
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@croissant.dev}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"
HASHED_PASSWORD=$(python3 -c "import bcrypt; print(bcrypt.hashpw(b'$ADMIN_PASSWORD', bcrypt.gensalt()).decode())")

psql "host=$PGHOST port=$PGPORT user=$PGUSER dbname=$PGDATABASE sslmode=require" <<EOSQL
CREATE TABLE IF NOT EXISTS dev_users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dev_login_credentials (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    access_code VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert admin user if not exists
INSERT INTO dev_login_credentials (email, access_code) 
VALUES ('$ADMIN_EMAIL', '$HASHED_PASSWORD')
ON CONFLICT (email) DO NOTHING;

-- Insert a test user if not exists
INSERT INTO dev_users (name, email) 
VALUES ('Admin User', '$ADMIN_EMAIL')
ON CONFLICT (email) DO NOTHING;

EOSQL

echo "Database tables created successfully!"
