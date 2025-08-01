# Environment Setup

## Database Configuration

This application requires database credentials to be provided via environment variables for security. 

### Setup Steps:

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file with your actual database credentials:
   ```
   DB_HOST=your-database-host.com
   DB_PORT=25060
   DB_USER=your-username
   DB_PASSWORD=your-secure-password
   DB_NAME=your-database-name
   DB_SSL_MODE=require
   
   ADMIN_EMAIL=admin@croissant.dev
   ADMIN_PASSWORD=admin123
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the database setup script:
   ```bash
   ./create_dev_tables_safe.sh
   ```

### Security Notes:

- Never commit the `.env` file to version control
- Keep your database credentials secure
- Use strong passwords for production environments
- The `.env` file is already included in `.gitignore`
