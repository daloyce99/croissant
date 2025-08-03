import React, { useState, useEffect } from 'react';
import './App.css';

// Check if running in Tauri or browser
// For development: assume Tauri mode if no browser-specific APIs are available
const isTauri = typeof window !== 'undefined' && (
  window.__TAURI__ || 
  window.__TAURI_METADATA__ || 
  window.isTauri ||
  document.querySelector('script[src*="tauri"]') ||
  window.location.protocol === 'tauri:' ||
  // Additional heuristics for Tauri detection
  (typeof window !== 'undefined' && !window.fetch) || // Tauri doesn't have fetch in some contexts
  (typeof navigator !== 'undefined' && navigator.userAgent.includes('Tauri')) ||
  // If we're not in a typical browser environment, assume Tauri
  (typeof window !== 'undefined' && typeof window.chrome === 'undefined' && typeof window.safari === 'undefined')
);

// Manual override for development - set this to true to force Tauri mode
const FORCE_TAURI_MODE = true; // Change this to false for browser testing

// Override for development: if we can't detect properly, try to import Tauri dynamically
let forceTauriMode = FORCE_TAURI_MODE;

// Debug logging
console.log('=== ENVIRONMENT DEBUG ===');
console.log('window.__TAURI__:', typeof window !== 'undefined' ? window.__TAURI__ : 'undefined');
console.log('window.__TAURI_METADATA__:', typeof window !== 'undefined' ? window.__TAURI_METADATA__ : 'undefined');
console.log('window.isTauri:', typeof window !== 'undefined' ? window.isTauri : 'undefined');
console.log('tauri script:', typeof document !== 'undefined' ? document.querySelector('script[src*="tauri"]') : 'undefined');
console.log('protocol:', typeof window !== 'undefined' ? window.location.protocol : 'undefined');
console.log('userAgent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'undefined');
console.log('chrome:', typeof window !== 'undefined' ? typeof window.chrome : 'undefined');
console.log('safari:', typeof window !== 'undefined' ? typeof window.safari : 'undefined');
console.log('isTauri result:', isTauri);
console.log('=======================');

// API invoke function for browser mode - uses Express API server
const apiInvoke = async (command, args = {}) => {
  console.log(`API invoke: ${command}`, args);
  
  const API_BASE = 'http://localhost:3001/api';
  
  try {
    switch (command) {
      case 'check_login':
        const loginResponse = await fetch(`${API_BASE}/check_login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        return await loginResponse.json();
        
      case 'register_user':
        const registerResponse = await fetch(`${API_BASE}/register_user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        if (!registerResponse.ok) {
          const error = await registerResponse.json();
          throw new Error(error.error);
        }
        return await registerResponse.json();
        
      case 'get_users':
        const usersResponse = await fetch(`${API_BASE}/get_users`);
        return await usersResponse.json();
        
      case 'add_user':
        const addUserResponse = await fetch(`${API_BASE}/add_user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        return await addUserResponse.json();
        
      case 'delete_user':
        const deleteUserResponse = await fetch(`${API_BASE}/delete_user`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        return await deleteUserResponse.json();
        
      case 'get_messages':
        const messagesResponse = await fetch(`${API_BASE}/get_messages`);
        return await messagesResponse.json();
        
      case 'add_message':
        const addMessageResponse = await fetch(`${API_BASE}/add_message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        return await addMessageResponse.json();
        
      case 'delete_message':
        const deleteMessageResponse = await fetch(`${API_BASE}/delete_message`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        return await deleteMessageResponse.json();
        
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    console.error(`API Error for ${command}:`, error);
    throw error;
  }
};

function App() {
  const [currentView, setCurrentView] = useState('login'); // 'login', 'register', 'dashboard', 'messages'
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ name: '', email: '' });
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tauriReady, setTauriReady] = useState(false);
  const [newMessage, setNewMessage] = useState({ 
    master_email_address: '', 
    department: '', 
    text: '', 
    content_type: '' 
  });

  // Wait for Tauri to be ready
  useEffect(() => {
    // Additional runtime check for Tauri
    const runtimeTauriCheck = () => {
      return !!(
        window.__TAURI__ ||
        window.__TAURI_INTERNALS__ ||
        window.__TAURI_METADATA__ ||
        navigator.userAgent.includes('Tauri') ||
        (window.chrome && window.chrome.webview)
      );
    };
    
    const actuallyTauri = runtimeTauriCheck();
    console.log('Runtime Tauri check:', actuallyTauri);
    console.log('Original isTauri:', isTauri);
    
    // Try to force Tauri mode for development
    const attemptTauriImport = async () => {
      try {
        // Try to dynamically import Tauri
        const { invoke } = await import('@tauri-apps/api/core');
        console.log('Successfully imported Tauri core:', typeof invoke);
        window.__TAURI_INVOKE__ = invoke;
        forceTauriMode = true;
        setTauriReady(true);
        return true;
      } catch (error) {
        console.log('Failed to import Tauri core:', error.message);
        return false;
      }
    };
    
    if (actuallyTauri || isTauri) {
      const checkTauri = () => {
        const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke || window.__TAURI_INVOKE__;
        if (invoke) {
          console.log('Tauri invoke function found:', typeof invoke);
          setTauriReady(true);
          return true;
        }
        console.log('Tauri invoke not yet available, waiting...');
        return false;
      };
      
      if (!checkTauri()) {
        // Poll for Tauri readiness
        console.log('Starting Tauri readiness polling...');
        const interval = setInterval(() => {
          if (checkTauri()) {
            clearInterval(interval);
          }
        }, 100);
        
        // Try to import Tauri after 1 second if not detected
        setTimeout(async () => {
          if (!tauriReady) {
            console.log('Attempting to import Tauri dynamically...');
            const imported = await attemptTauriImport();
            if (!imported) {
              clearInterval(interval);
              console.error('Tauri failed to initialize within 10 seconds');
              setMessage('❌ Tauri initialization failed. Try refreshing the app.');
            }
          }
        }, 1000);
        
        // Final cleanup after 10 seconds
        setTimeout(() => {
          clearInterval(interval);
          if (!tauriReady) {
            console.error('Tauri failed to initialize within 10 seconds');
            setMessage('❌ Tauri initialization failed. Running in browser mode.');
            setTauriReady(true); // Allow browser mode fallback
          }
        }, 10000);
      } else {
        setTauriReady(true);
      }
    } else {
      // If not detected as Tauri, try the dynamic import anyway (for dev mode)
      console.log('Browser mode detected, but trying Tauri import anyway...');
      attemptTauriImport().then((imported) => {
        if (!imported) {
          console.log('Confirmed browser mode');
        }
        setTauriReady(true);
      });
    }
  }, []);

  // Create a safe invoke function that waits for Tauri
  const safeInvoke = async (command, args = {}) => {
    // Runtime check for Tauri
    const runtimeTauriCheck = !!(
      window.__TAURI__ ||
      window.__TAURI_INTERNALS__ ||
      window.__TAURI_METADATA__ ||
      window.__TAURI_INVOKE__ ||
      forceTauriMode ||
      navigator.userAgent.includes('Tauri') ||
      (window.chrome && window.chrome.webview)
    );
    
    console.log(`safeInvoke called: ${command}`, {
      args,
      isTauri,
      runtimeTauriCheck,
      forceTauriMode,
      tauriReady,
      windowTauri: !!window.__TAURI__,
      windowTauriInvoke: !!window.__TAURI_INVOKE__
    });
    
    if ((isTauri || runtimeTauriCheck) && !tauriReady) {
      throw new Error('Tauri not ready yet. Please wait...');
    }
    
    if (isTauri || runtimeTauriCheck || forceTauriMode) {
      const tauriInvoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke || window.__TAURI_INVOKE__;
      if (!tauriInvoke) {
        console.error('Tauri invoke function not available, falling back to browser mode');
        return await apiInvoke(command, args);
      }
      console.log(`Tauri invoke: ${command}`, args);
      return await tauriInvoke(command, args);
    } else {
      console.log(`Browser invoke: ${command}`, args);
      return await apiInvoke(command, args);
    }
  };

  // Load data when component mounts - non-blocking
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        console.log('Loading initial data...');
        const userList = await safeInvoke('get_users');
        console.log('Users loaded:', userList);
        setUsers(userList);
        const messageList = await safeInvoke('get_messages');
        console.log('Messages loaded:', messageList);
        setMessages(messageList);
        setMessage('✅ Data loaded successfully');
      } catch (error) {
        console.error('Error loading initial data:', error);
        setMessage(`⚠️ Could not load data: ${error.message}. You can still use the app.`);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Don't block the render - load data asynchronously
    if (tauriReady) {
      setTimeout(initializeData, 100);
    }
  }, [tauriReady]);

  // Helper function to show environment info
  const getEnvironmentInfo = () => {
    return isTauri ? 'Running in Tauri Desktop App' : 'Running in Browser (Mock Mode)';
  };

  // Test login with default admin credentials
  const testLogin = async () => {
    try {
      const result = await safeInvoke('check_login', { 
        email: 'admin@croissant.dev', 
        password: 'admin123' 
      });
      if (result) {
        setMessage('✅ Login successful with admin credentials!');
        setCurrentView('dashboard');
        loadUsers();
        loadMessages();
      } else {
        setMessage('❌ Login failed');
      }
    } catch (error) {
      setMessage(`❌ Login error: ${error}`);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const result = await safeInvoke('check_login', loginData);
      if (result) {
        setMessage('✅ Login successful!');
        setCurrentView('dashboard');
        loadUsers();
        loadMessages();
      } else {
        setMessage('❌ Invalid credentials');
      }
    } catch (error) {
      setMessage(`❌ Login error: ${error}`);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const result = await safeInvoke('register_user', registerData);
      if (result) {
        setMessage('✅ User registered successfully!');
        setCurrentView('login');
      } else {
        setMessage('❌ Registration failed');
      }
    } catch (error) {
      setMessage(`❌ Registration error: ${error}`);
    }
  };

  const loadUsers = async () => {
    try {
      const userList = await safeInvoke('get_users');
      setUsers(userList);
    } catch (error) {
      setMessage(`❌ Error loading users: ${error}`);
    }
  };

  const addUser = async (e) => {
    e.preventDefault();
    try {
      await safeInvoke('add_user', newUser);
      setMessage('✅ User added successfully!');
      setNewUser({ name: '', email: '' });
      loadUsers();
    } catch (error) {
      setMessage(`❌ Error adding user: ${error}`);
    }
  };

  const deleteUser = async (id) => {
    try {
      await safeInvoke('delete_user', { id });
      setMessage('✅ User deleted successfully!');
      loadUsers();
    } catch (error) {
      setMessage(`❌ Error deleting user: ${error}`);
    }
  };

  // Message management functions
  const loadMessages = async () => {
    try {
      const messageList = await safeInvoke('get_messages');
      setMessages(messageList);
    } catch (error) {
      setMessage(`❌ Error loading messages: ${error}`);
    }
  };

  const addMessage = async (e) => {
    e.preventDefault();
    try {
      await safeInvoke('add_message', newMessage);
      setMessage('✅ Message added successfully!');
      setNewMessage({ master_email_address: '', department: '', text: '', content_type: '' });
      loadMessages();
    } catch (error) {
      setMessage(`❌ Error adding message: ${error}`);
    }
  };

  const deleteMessage = async (id) => {
    try {
      await safeInvoke('delete_message', { id });
      setMessage('✅ Message deleted successfully!');
      loadMessages();
    } catch (error) {
      setMessage(`❌ Error deleting message: ${error}`);
    }
  };

  const clearMockData = () => {
    if (!isTauri && window.localStorage) {
      if (window.confirm('Are you sure you want to clear all stored data? This will reset all users, credentials, and messages to default values.')) {
        localStorage.removeItem(STORAGE_KEYS.USERS);
        localStorage.removeItem(STORAGE_KEYS.CREDENTIALS);
        localStorage.removeItem(STORAGE_KEYS.MESSAGES);
        
        // Reset to defaults and refresh
        window.location.reload();
      }
    }
  };

  if (currentView === 'login') {
    return (
      <div className="auth-page">
        <div className="container">
          <div className={`environment-info ${isTauri ? 'tauri' : 'browser'}`}>
            {getEnvironmentInfo()}
            {!isTauri && ' - Using persistent mock data'}
          </div>
          
          <div className="logo">
            Croissant
          </div>
          <h1>Welcome Back</h1>
          <p className="info">Sign in with your master email address and access code</p>
          
          <button onClick={testLogin} className="test-btn">
            🧪 Quick Test Login
          </button>
          
          {!isTauri && (
            <div className="demo-info">
              <h4>Demo Credentials:</h4>
              <p><strong>Admin:</strong> admin@croissant.dev / admin123</p>
              <p><strong>Test:</strong> test@example.com / test123</p>
            </div>
          )}
          
          <form onSubmit={handleLogin} className="auth-form fade-in">
            <div className="form-group">
              <label>Master Email Address</label>
              <input
                type="email"
                placeholder="Enter your email address"
                value={loginData.email}
                onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Access Code</label>
              <input
                type="password"
                placeholder="Enter your access code"
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                required
              />
            </div>
            <button type="submit">Sign In</button>
          </form>
          
          <p>
            Don't have an account? 
            <button 
              onClick={() => setCurrentView('register')} 
              className="link-btn"
            >
              Create account
            </button>
          </p>
          
          {message && <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>{message}</div>}
        </div>
      </div>
    );
  }

  if (currentView === 'register') {
    return (
      <div className="container">
        <h1>Register New Client</h1>
        
        <form onSubmit={handleRegister} className="auth-form">
          <input
            type="email"
            placeholder="Master Email Address"
            value={registerData.email}
            onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
            required
          />
          <input
            type="password"
            placeholder="Access Code"
            value={registerData.password}
            onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
            required
          />
          <button type="submit">Register</button>
        </form>
        
        <p>
          Already have an account? 
          <button 
            onClick={() => setCurrentView('login')} 
            className="link-btn"
          >
            Login here
          </button>
        </p>
        
        {message && <p className="message">{message}</p>}
      </div>
    );
  }

  return (
    <div className="container">
      <div className={`environment-info ${isTauri ? 'tauri' : 'browser'}`}>
        {getEnvironmentInfo()}
        {!isTauri && ' - Persistent data enabled'}
      </div>
      
      <h1>Dashboard</h1>
      <div className="nav-buttons">
        <button 
          onClick={() => setCurrentView('messages')} 
          className="nav-btn"
        >
          📝 Messages
        </button>
        {!isTauri && (
          <button 
            onClick={clearMockData} 
            className="nav-btn"
            style={{backgroundColor: 'var(--error-color)'}}
          >
            🗑️ Clear Data
          </button>
        )}
        <button 
          onClick={() => setCurrentView('login')} 
          className="logout-btn"
        >
          🚪 Logout
        </button>
      </div>
      
      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h3>👤 Add New User</h3>
          </div>
          <div className="card-body">
            <form onSubmit={addUser} className="user-form">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  required
                />
              </div>
              <button type="submit">➕ Add User</button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>👥 Users <span className="stats-counter">{users.length}</span></h3>
          </div>
          <div className="card-body">
            {users.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👤</div>
                <p>No users yet. Add your first user above.</p>
              </div>
            ) : (
              <div className="users-list">
                {users.map(user => (
                  <div key={user.id} className="user-item">
                    <div>
                      <strong>{user.name}</strong>
                      <br />
                      <span style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>{user.email}</span>
                    </div>
                    <button 
                      onClick={() => deleteUser(user.id)}
                      className="delete-btn"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {message && <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>{message}</div>}
    </div>
  );

  if (currentView === 'messages') {
    return (
      <div className="container">
        <div className={`environment-info ${isTauri ? 'tauri' : 'browser'}`}>
          {getEnvironmentInfo()}
          {!isTauri && ' - Using mock data for demo'}
        </div>
        <h1>Message Management</h1>
        <div className="nav-buttons">
          <button 
            onClick={() => setCurrentView('dashboard')} 
            className="nav-btn"
          >
            👥 Users
          </button>
          {!isTauri && (
            <button 
              onClick={clearMockData} 
              className="nav-btn"
              style={{backgroundColor: '#ff4444'}}
            >
              🗑️ Clear Data
            </button>
          )}
          <button 
            onClick={() => setCurrentView('login')} 
            className="logout-btn"
          >
            Logout
          </button>
        </div>
        
        <div className="section">
          <h2>Add New Message</h2>
          <form onSubmit={addMessage} className="message-form">
            <input
              type="email"
              placeholder="Master Email Address"
              value={newMessage.master_email_address}
              onChange={(e) => setNewMessage({...newMessage, master_email_address: e.target.value})}
              required
            />
            <input
              type="text"
              placeholder="Department"
              value={newMessage.department}
              onChange={(e) => setNewMessage({...newMessage, department: e.target.value})}
              required
            />
            <textarea
              placeholder="Text"
              value={newMessage.text}
              onChange={(e) => setNewMessage({...newMessage, text: e.target.value})}
              required
              rows="3"
            />
            <input
              type="text"
              placeholder="Content Type"
              value={newMessage.content_type}
              onChange={(e) => setNewMessage({...newMessage, content_type: e.target.value})}
              required
            />
            <button type="submit">Add Message</button>
          </form>
        </div>
        
        <div className="section">
          <h2>Messages</h2>
          <button onClick={loadMessages} className="load-btn">
            🔄 Load Messages
          </button>
          <div className="messages-list">
            {messages.map(msg => (
              <div key={msg.id} className="message-item">
                <div className="message-header">
                  <strong>{msg.master_email_address}</strong> - {msg.department}
                  <span className="message-date">
                    {new Date(msg.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="message-content">
                  <p><strong>Type:</strong> {msg.content_type}</p>
                  <p><strong>Text:</strong> {msg.text}</p>
                </div>
                <button 
                  onClick={() => deleteMessage(msg.id)} 
                  className="delete-btn"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
        
        {message && <p className="message">{message}</p>}
      </div>
    );
  }
}

export default App;
