# Browser Persistence Implementation

## Overview
The Croissant application now supports **persistent data storage** in browser mode using localStorage. This means that all data (users, credentials, and messages) will persist between browser sessions, even after refreshing the page or closing the browser.

## Implementation Details

### Storage Keys
- `croissant_mock_users` - Stores user data
- `croissant_mock_credentials` - Stores login credentials
- `croissant_mock_messages` - Stores messages

### Features

#### 1. Persistent Data Storage
- **Users**: Added users persist between sessions
- **Credentials**: Registered accounts remain available
- **Messages**: Created messages are saved permanently
- **Automatic Loading**: Data loads from localStorage on app startup

#### 2. Dual Mode Operation
- **Tauri Desktop**: Uses real PostgreSQL database
- **Browser Mode**: Uses localStorage for persistence

#### 3. Data Management
- **Clear Data Button**: Available in both Dashboard and Messages pages
- **Confirmation Dialog**: Prevents accidental data loss
- **Reset to Defaults**: Restores original mock data when cleared

### How to Test Persistence

1. **Open the app in browser**: http://localhost:3000
2. **Login** with default credentials:
   - Email: `admin@croissant.dev`
   - Password: `admin123`
3. **Add some test data**:
   - Add new users in the Dashboard
   - Add new messages in the Messages section
4. **Refresh the page** or close/reopen the browser
5. **Verify data persists**: All your added data should still be there

### Clear Data Functionality

In browser mode, you'll see a red "🗑️ Clear Data" button on both pages that allows you to:
- Reset all stored data to original defaults
- Clear localStorage completely
- Restart with fresh mock data

### Environment Indicators

The app clearly shows which mode it's running in:
- **Tauri Mode**: Green indicator - "Running in Tauri Desktop Application"
- **Browser Mode**: Orange indicator - "Running in Browser Mode - Using mock data for demo"

## Benefits

1. **Development**: Test data persists during development
2. **Demo**: Perfect for demonstrations without database setup
3. **Testing**: Create scenarios that persist across sessions
4. **User Experience**: No data loss when accidentally refreshing

## File Changes

- `src/App.js`: Added localStorage integration to mockInvoke function
- Added `loadFromStorage()` and `saveToStorage()` helper functions
- Updated all CRUD operations to use persistent storage
- Added clear data functionality with confirmation

This implementation ensures that your dev tables data persists between sessions when running the app in the browser, providing the same experience as the Tauri desktop version.
