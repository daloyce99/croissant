#!/bin/bash
# filepath: create_dev_tables.sh
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
ADMIN_EMAIL="admin@croissant.dev"
ADMIN_PASSWORD="admin123"
HASHED_PASSWORD=$(python3 -c "import bcrypt; print(bcrypt.hashpw(b'$ADMIN_PASSWORD', bcrypt.gensalt()).decode())")

psql "host=$PGHOST port=$PGPORT user=$PGUSER dbname=$PGDATABASE sslmode=require" <<EOSQL
CREATE TABLE IF NOT EXISTS dev_users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS LiveClients (
    id SERIAL PRIMARY KEY,
    master_email VARCHAR(255) UNIQUE NOT NULL,
    access_code VARCHAR(255) NOT NULL
);

INSERT INTO LiveClients (master_email, access_code)
VALUES ('$ADMIN_EMAIL', '$HASHED_PASSWORD')
ON CONFLICT (master_email) DO NOTHING;
EOSQL

unset PGPASSWORD
echo "Development tables created and admin user inserted (if not already present)."