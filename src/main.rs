#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use dotenv::dotenv;
use tokio_postgres::NoTls;

// Helper function to get database connection string from environment variables
fn get_db_connection_string() -> Result<String, String> {
    let host = env::var("DB_HOST").unwrap_or_else(|_| "localhost".to_string());
    let port = env::var("DB_PORT").unwrap_or_else(|_| "5432".to_string());
    let user = env::var("DB_USER").unwrap_or_else(|_| "postgres".to_string());
    let password = env::var("DB_PASSWORD")
        .map_err(|_| "DB_PASSWORD environment variable is required".to_string())?;
    let dbname = env::var("DB_NAME").unwrap_or_else(|_| "defaultdb".to_string());
    let sslmode = env::var("DB_SSL_MODE").unwrap_or_else(|_| "require".to_string());

    Ok(format!(
        "host={} user={} password={} dbname={} port={} sslmode={}",
        host, user, password, dbname, port, sslmode
    ))
}

#[tauri::command]
fn my_custom_command() -> String {
    "Hello from Rust!".into()
}

#[tauri::command]
async fn greet(name: String) -> Result<String, String> {
    Ok(format!("Hello, {}! Welcome to Croissant.", name))
}

#[tauri::command]
async fn register_user(email: String, password: String) -> Result<bool, String> {
    let hashed = bcrypt::hash(password, bcrypt::DEFAULT_COST)
        .map_err(|e| format!("Hash error: {}", e))?;

    let connection_string = get_db_connection_string()?;
    let (client, connection) = tokio_postgres::connect(&connection_string, NoTls)
        .await
        .map_err(|e| format!("Connection error: {}", e))?;

    tauri::async_runtime::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });

    client.execute(
        "INSERT INTO dev_login_credentials (email, access_code) VALUES ($1, $2)",
        &[&email, &hashed],
    ).await.map_err(|e| format!("Insert error: {}", e))?;

    Ok(true)
}

#[tauri::command]
async fn check_login(email: String, password: String) -> Result<bool, String> {
    let connection_string = get_db_connection_string()?;
    let (client, connection) = tokio_postgres::connect(&connection_string, NoTls)
        .await
        .map_err(|e| format!("Connection error: {}", e))?;

    tauri::async_runtime::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });

    let row = client.query_opt(
        "SELECT access_code FROM dev_login_credentials WHERE email = $1",
        &[&email],
    ).await.map_err(|e| format!("Query error: {}", e))?;

    if let Some(row) = row {
        let hashed: String = row.get(0);
        Ok(bcrypt::verify(password, &hashed)
            .map_err(|e| format!("Verify error: {}", e))?)
    } else {
        Ok(false)
    }
}

#[derive(serde::Serialize)]
struct User {
    id: i32,
    name: String,
    email: String,
}

#[tauri::command]
async fn get_users() -> Result<Vec<User>, String> {
    let connection_string = get_db_connection_string()?;
    let (client, connection) = tokio_postgres::connect(&connection_string, NoTls)
        .await
        .map_err(|e| format!("Connection error: {}", e))?;

    tauri::async_runtime::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });

    let rows = client.query("SELECT id, name, email FROM dev_users", &[])
        .await.map_err(|e| format!("Query error: {}", e))?;

    Ok(rows.into_iter().map(|row| User {
        id: row.get(0),
        name: row.get(1),
        email: row.get(2),
    }).collect())
}

#[tauri::command]
async fn add_user(name: String, email: String) -> Result<User, String> {
    let connection_string = get_db_connection_string()?;
    let (client, connection) = tokio_postgres::connect(&connection_string, NoTls)
        .await
        .map_err(|e| format!("Connection error: {}", e))?;

    tauri::async_runtime::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });

    let row = client.query_one(
        "INSERT INTO dev_users (name, email) VALUES ($1, $2) RETURNING id, name, email",
        &[&name, &email],
    ).await.map_err(|e| format!("Insert error: {}", e))?;

    Ok(User {
        id: row.get(0),
        name: row.get(1),
        email: row.get(2),
    })
}

#[tauri::command]
async fn update_user(id: i32, name: String, email: String) -> Result<User, String> {
    let connection_string = get_db_connection_string()?;
    let (client, connection) = tokio_postgres::connect(&connection_string, NoTls)
        .await
        .map_err(|e| format!("Connection error: {}", e))?;

    tauri::async_runtime::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });

    let row = client.query_one(
        "UPDATE dev_users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email",
        &[&name, &email, &id],
    ).await.map_err(|e| format!("Update error: {}", e))?;

    Ok(User {
        id: row.get(0),
        name: row.get(1),
        email: row.get(2),
    })
}

#[tauri::command]
async fn delete_user(id: i32) -> Result<bool, String> {
    let connection_string = get_db_connection_string()?;
    let (client, connection) = tokio_postgres::connect(&connection_string, NoTls)
        .await
        .map_err(|e| format!("Connection error: {}", e))?;

    tauri::async_runtime::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });

    let result = client.execute("DELETE FROM dev_users WHERE id = $1", &[&id])
        .await.map_err(|e| format!("Delete error: {}", e))?;

    Ok(result > 0)
}

#[derive(serde::Serialize, serde::Deserialize)]
struct Config {
    demo: bool,
    local_dev: bool,
}

#[tauri::command]
async fn get_config() -> Result<Config, String> {
    Ok(Config {
        demo: true,
        local_dev: false,
    })
}

fn main() {
    // Load environment variables from .env file
    dotenv().ok();
    
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            get_users,
            add_user,
            update_user,
            delete_user,
            check_login,
            register_user,
            get_config,
            my_custom_command
        ])
        .setup(|_app| {
            // No get_window; avoid the issue entirely
            println!("App setup completed.");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}