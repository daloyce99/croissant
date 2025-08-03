use std::env;
use dotenv::dotenv;
use tokio_postgres::NoTls;
use chrono;

// Helper function to check if we're in mock mode
fn is_mock_mode() -> bool {
    env::var("DB_MODE").unwrap_or_else(|_| "database".to_string()) == "mock"
}

// Helper function to get database connection string from environment variables
fn get_db_connection_string() -> Result<String, String> {
    let host = env::var("DB_HOST").unwrap_or_else(|_| "localhost".to_string());
    let port = env::var("DB_PORT").unwrap_or_else(|_| "5432".to_string());
    let user = env::var("DB_USER").unwrap_or_else(|_| "postgres".to_string());
    let password = env::var("DB_PASSWORD")
        .map_err(|_| "DB_PASSWORD environment variable is required".to_string())?;
    let dbname = env::var("DB_NAME").unwrap_or_else(|_| "defaultdb".to_string());
    
    // Always disable SSL/TLS - no certificates needed
    let sslmode = "disable";

    Ok(format!(
        "host={} user={} password={} dbname={} port={} sslmode={}",
        host, user, password, dbname, port, sslmode
    ))
}

// Helper function to create database connection without TLS (matches create_dev_tables.sh approach)
async fn create_db_connection() -> Result<tokio_postgres::Client, String> {
    let connection_string = get_db_connection_string()?;
    
    // Always use NoTls - no SSL/TLS connections, same as create_dev_tables.sh
    let (client, connection) = tokio_postgres::connect(&connection_string, NoTls)
        .await
        .map_err(|e| format!("Connection error: {}", e))?;

    // Spawn the connection task
    tauri::async_runtime::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });

    Ok(client)
}

#[tauri::command]
async fn greet(name: String) -> Result<String, String> {
    Ok(format!("Hello, {}! Welcome to Croissant.", name))
}

#[tauri::command]
async fn register_user(email: String, password: String) -> Result<bool, String> {
    let hashed = bcrypt::hash(password, bcrypt::DEFAULT_COST)
        .map_err(|e| format!("Hash error: {}", e))?;

    let client = create_db_connection().await?;

    client.execute(
        "INSERT INTO LiveClients (master_email, access_code) VALUES ($1, $2)",
        &[&email, &hashed],
    ).await.map_err(|e| format!("Insert error: {}", e))?;

    Ok(true)
}

#[tauri::command]
async fn check_login(email: String, password: String) -> Result<bool, String> {
    let client = create_db_connection().await?;

    let row = client.query_opt(
        "SELECT access_code FROM LiveClients WHERE master_email = $1",
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
    let client = create_db_connection().await?;

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
    let client = create_db_connection().await?;

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
async fn delete_user(id: i32) -> Result<bool, String> {
    let client = create_db_connection().await?;

    let result = client.execute("DELETE FROM dev_users WHERE id = $1", &[&id])
        .await.map_err(|e| format!("Delete error: {}", e))?;

    Ok(result > 0)
}

// Message struct for the content management system
#[derive(serde::Serialize, serde::Deserialize)]
struct Message {
    id: i32,
    master_email_address: String,
    department: String,
    text: String,
    content_type: String,
    created_at: String,
}

#[tauri::command]
async fn get_messages() -> Result<Vec<Message>, String> {
    let client = create_db_connection().await?;

    let rows = client
        .query("SELECT id, master_email_address, department, text, content_type, created_at FROM messages ORDER BY created_at DESC", &[])
        .await
        .map_err(|e| format!("Query error: {}", e))?;

    Ok(rows
        .into_iter()
        .map(|row| Message {
            id: row.get(0),
            master_email_address: row.get(1),
            department: row.get(2),
            text: row.get(3),
            content_type: row.get(4),
            created_at: row.get::<_, chrono::DateTime<chrono::Utc>>(5).to_string(),
        })
        .collect())
}

#[tauri::command]
async fn add_message(master_email_address: String, department: String, text: String, content_type: String) -> Result<Message, String> {
    let client = create_db_connection().await?;

    let row = client
        .query_one(
            "INSERT INTO messages (master_email_address, department, text, content_type) VALUES ($1, $2, $3, $4) RETURNING id, master_email_address, department, text, content_type, created_at",
            &[&master_email_address, &department, &text, &content_type],
        )
        .await
        .map_err(|e| format!("Insert error: {}", e))?;

    Ok(Message {
        id: row.get(0),
        master_email_address: row.get(1),
        department: row.get(2),
        text: row.get(3),
        content_type: row.get(4),
        created_at: row.get::<_, chrono::DateTime<chrono::Utc>>(5).to_string(),
    })
}

#[tauri::command]
async fn delete_message(id: i32) -> Result<bool, String> {
    let client = create_db_connection().await?;

    let result = client
        .execute("DELETE FROM messages WHERE id = $1", &[&id])
        .await
        .map_err(|e| format!("Delete error: {}", e))?;

    Ok(result > 0)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load environment variables from .env file
    dotenv().ok();
    
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            get_users,
            add_user,
            delete_user,
            check_login,
            register_user,
            get_messages,
            add_message,
            delete_message
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            println!("Tauri App setup completed with database integration (No TLS).");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
