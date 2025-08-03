const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection using environment variables
const getDbClient = () => {
  return new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });
};

// API Routes

// Check login
app.post('/api/check_login', async (req, res) => {
  const { email, password } = req.body;
  const client = getDbClient();
  
  try {
    await client.connect();
    const result = await client.query(
      'SELECT * FROM LiveClients WHERE master_email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.json(false);
    }
    
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.access_code);
    res.json(isValid);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  } finally {
    await client.end();
  }
});

// Register user
app.post('/api/register_user', async (req, res) => {
  const { email, password } = req.body;
  const client = getDbClient();
  
  try {
    await client.connect();
    
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT * FROM LiveClients WHERE master_email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password and insert new user
    const hashedPassword = await bcrypt.hash(password, 10);
    await client.query(
      'INSERT INTO LiveClients (master_email, access_code) VALUES ($1, $2)',
      [email, hashedPassword]
    );
    
    res.json(true);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    await client.end();
  }
});

// Get users
app.get('/api/get_users', async (req, res) => {
  const client = getDbClient();
  
  try {
    await client.connect();
    const result = await client.query('SELECT * FROM dev_users ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  } finally {
    await client.end();
  }
});

// Add user
app.post('/api/add_user', async (req, res) => {
  const { name, email } = req.body;
  const client = getDbClient();
  
  try {
    await client.connect();
    const result = await client.query(
      'INSERT INTO dev_users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Add user error:', error);
    res.status(500).json({ error: 'Failed to add user' });
  } finally {
    await client.end();
  }
});

// Delete user
app.delete('/api/delete_user', async (req, res) => {
  const { id } = req.body;
  const client = getDbClient();
  
  try {
    await client.connect();
    await client.query('DELETE FROM dev_users WHERE id = $1', [id]);
    res.json(true);
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  } finally {
    await client.end();
  }
});

// Get messages
app.get('/api/get_messages', async (req, res) => {
  const client = getDbClient();
  
  try {
    await client.connect();
    const result = await client.query('SELECT * FROM messages ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  } finally {
    await client.end();
  }
});

// Add message
app.post('/api/add_message', async (req, res) => {
  const { master_email_address, department, text, content_type } = req.body;
  const client = getDbClient();
  
  try {
    await client.connect();
    const result = await client.query(
      'INSERT INTO messages (master_email_address, department, text, content_type, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [master_email_address, department, text, content_type]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ error: 'Failed to add message' });
  } finally {
    await client.end();
  }
});

// Delete message
app.delete('/api/delete_message', async (req, res) => {
  const { id } = req.body;
  const client = getDbClient();
  
  try {
    await client.connect();
    await client.query('DELETE FROM messages WHERE id = $1', [id]);
    res.json(true);
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  } finally {
    await client.end();
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Browser API Server is running', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`🌐 Browser API Server running at http://localhost:${port}`);
  console.log(`🔗 API endpoints available at http://localhost:${port}/api/*`);
});
