# from flask import Flask, abort, request
from flask import Flask, request, redirect, render_template, url_for, flash, jsonify, send_from_directory
from flask_cors import CORS
import os
import datetime
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

import psycopg2.pool

# Get database configuration from environment variables
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_NAME = os.getenv('DB_NAME', 'defaultdb')
DB_SSL_MODE = os.getenv('DB_SSL_MODE', 'prefer')

# Check if password is provided
if not DB_PASSWORD:
    raise ValueError("DB_PASSWORD environment variable is required")

# Create a connection pool with a minimum of 2 connections and
# a maximum of 5 connections
pool = psycopg2.pool.SimpleConnectionPool(
    2, 5, 
    user=DB_USER, 
    password=DB_PASSWORD,
    host=DB_HOST, 
    port=DB_PORT, 
    database=DB_NAME,
    sslmode=DB_SSL_MODE
)

# Define your connection parameters
import psycopg2
import psycopg2.extras


@app.route('/register_customer', methods=["POST"])
def register_customer():
    conn = pool.getconn()
    # ... rest of the existing code would continue here
