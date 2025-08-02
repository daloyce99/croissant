import React, { useState, useEffect } from 'react';
import './App.css';

// Check if we're running in Tauri
const isTauri = window.__TAURI__ !== undefined;

// Only import invoke if we're in Tauri
let invoke;
if (isTauri) {
  invoke = window.__TAURI__.core.invoke;
}

function App() {
  const [currentView, setCurrentView] = useState('login'); // 'login', 'register', 'dashboard'
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ name: '', email: '' });

  // Helper function to check if Tauri is available
  const checkTauri = () => {
    if (!isTauri) {
      setMessage('❌ This app must be run in Tauri desktop application, not in browser');
      return false;
    }
    return true;
  };

  // Test login with default admin credentials
  const testLogin = async () => {
    if (!isTauri) {
      setMessage('❌ This app must be run in Tauri desktop application, not in browser');
      return;
    }
    
    try {
      const result = await invoke('check_login', { 
        email: 'admin@croissant.dev', 
        password: 'admin123' 
      });
      if (result) {
        setMessage('✅ Login successful with admin credentials!');
        setCurrentView('dashboard');
        loadUsers();
      } else {
        setMessage('❌ Login failed');
      }
    } catch (error) {
      setMessage(`❌ Login error: ${error}`);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!checkTauri()) return;
    
    try {
      const result = await invoke('check_login', loginData);
      if (result) {
        setMessage('✅ Login successful!');
        setCurrentView('dashboard');
        loadUsers();
      } else {
        setMessage('❌ Invalid credentials');
      }
    } catch (error) {
      setMessage(`❌ Login error: ${error}`);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!checkTauri()) return;
    
    try {
      const result = await invoke('register_user', registerData);
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
    if (!checkTauri()) return;
    
    try {
      const userList = await invoke('get_users');
      setUsers(userList);
    } catch (error) {
      setMessage(`❌ Error loading users: ${error}`);
    }
  };

  const addUser = async (e) => {
    e.preventDefault();
    if (!checkTauri()) return;
    
    try {
      await invoke('add_user', newUser);
      setMessage('✅ User added successfully!');
      setNewUser({ name: '', email: '' });
      loadUsers();
    } catch (error) {
      setMessage(`❌ Error adding user: ${error}`);
    }
  };

  const deleteUser = async (id) => {
    if (!checkTauri()) return;
    
    try {
      await invoke('delete_user', { id });
      setMessage('✅ User deleted successfully!');
      loadUsers();
    } catch (error) {
      setMessage(`❌ Error deleting user: ${error}`);
    }
  };

  if (currentView === 'login') {
    return (
      <div className="container">
        {!isTauri && (
          <div className="browser-warning">
            ⚠️ This app is designed to run as a desktop application. 
            Please close this browser tab and look for the Croissant desktop window.
          </div>
        )}
        <h1>Croissant Login</h1>
        <p className="info">According to TODO: Use Master Email Address and Access Code</p>
        
        <button onClick={testLogin} className="test-btn">
          🧪 Test Login (admin@croissant.dev)
        </button>
        
        <form onSubmit={handleLogin} className="auth-form">
          <input
            type="email"
            placeholder="Master Email Address"
            value={loginData.email}
            onChange={(e) => setLoginData({...loginData, email: e.target.value})}
            required
          />
          <input
            type="password"
            placeholder="Access Code"
            value={loginData.password}
            onChange={(e) => setLoginData({...loginData, password: e.target.value})}
            required
          />
          <button type="submit">Login</button>
        </form>
        
        <p>
          Don't have an account? 
          <button 
            onClick={() => setCurrentView('register')} 
            className="link-btn"
          >
            Register here
          </button>
        </p>
        
        {message && <p className="message">{message}</p>}
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
      <h1>Croissant Dashboard</h1>
      <button 
        onClick={() => setCurrentView('login')} 
        className="logout-btn"
      >
        Logout
      </button>
      
      <div className="section">
        <h2>Add New User</h2>
        <form onSubmit={addUser} className="user-form">
          <input
            type="text"
            placeholder="Name"
            value={newUser.name}
            onChange={(e) => setNewUser({...newUser, name: e.target.value})}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={newUser.email}
            onChange={(e) => setNewUser({...newUser, email: e.target.value})}
            required
          />
          <button type="submit">Add User</button>
        </form>
      </div>

      <div className="section">
        <h2>Users ({users.length})</h2>
        <div className="users-list">
          {users.map(user => (
            <div key={user.id} className="user-item">
              <span><strong>{user.name}</strong> - {user.email}</span>
              <button 
                onClick={() => deleteUser(user.id)}
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

export default App;
