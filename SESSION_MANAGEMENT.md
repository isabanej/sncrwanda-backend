# Session Management Commands

## Quick Commands for PowerShell

### Clear browser localStorage (requires browser DevTools)
```javascript
// Open browser console (F12) and run:
localStorage.clear()
location.reload()
```

## What's Happening?

The "auto-login" behavior you're seeing is **NORMAL and BY DESIGN**:

1. **Login Flow:**
   - User enters username/password
   - Backend validates and returns a JWT token
   - Frontend stores token in `localStorage`
   - User is logged in

2. **Page Refresh Flow:**
   - App checks for token in `localStorage`
   - If found, app calls `/auth/me` to get current user
   - If valid, user is auto-logged in
   - If invalid (401), token is cleared and user redirected to login

3. **Why This Happens:**
   - localStorage persists across page refreshes
   - This is like "Remember Me" functionality
   - Prevents having to login every time you refresh

## How to Logout

### Option 1: Use the Logout Button
- Look at the bottom left sidebar
- Click the "Logout" button (🚪 icon)

### Option 2: Use Session Manager Page
- Visit: http://localhost:5173/clear-session.html
- Click "Clear Session & Logout"

### Option 3: Browser Console
- Press F12
- Console tab
- Type: `localStorage.clear()`
- Refresh page

## Debugging

### Check Current Session (Browser Console F12):
```javascript
// See what's stored
console.log('Token:', localStorage.getItem('token'));
console.log('User:', localStorage.getItem('user'));

// Parse user data
const user = JSON.parse(localStorage.getItem('user') || '{}');
console.log('Username:', user.username);
console.log('Role:', user.role);
```

### Check Network Requests:
1. F12 → Network tab
2. Refresh page
3. Look for `/auth/me` request
4. Check if it returns 200 (valid token) or 401 (invalid)

## New Features Added

1. **401 Auto-Handling**: Invalid tokens are automatically cleared
2. **Console Logging**: See login/logout events in console (F12)
3. **Session Manager**: Dedicated page to manage sessions
4. **User Info Display**: Sidebar shows current user and role

## Expected Behavior

✅ **Correct:**
- Login once → Can refresh page without re-logging in
- Token expires → Auto-redirect to login
- Click logout → Redirected to login
- No token → Must login

❌ **Incorrect:**
- Logout doesn't work → Check console for errors
- Auto-login with wrong user → Clear localStorage
- Can't login at all → Check backend is running

## Backend Verification

Check if backend is properly validating tokens:
```powershell
# Check backend logs for auth errors
docker logs deploy-auth-service-1 --tail 50

# Test token validation
$token = "YOUR_TOKEN_HERE"
$headers = @{
    "Authorization" = "Bearer $token"
}
Invoke-RestMethod -Uri "http://localhost:9090/auth/me" -Headers $headers
```
