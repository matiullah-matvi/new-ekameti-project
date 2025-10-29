# 🚀 Quick Test Guide - Forgot Password System

## Prerequisites
- ✅ Backend server running on `http://localhost:5000`
- ✅ Frontend server running on `http://localhost:5173`
- ✅ MongoDB connected
- ✅ Gmail SMTP configured in `.env`

## 30-Second Test

### 1. Access Forgot Password (5 seconds)
```
1. Open browser: http://localhost:5173/
2. Click "Forgot your password?" link
3. Verify: Redirects to /forgot-password page
```

### 2. Request Reset Link (10 seconds)
```
1. Enter your email: test@example.com
2. Click "Send Reset Link"
3. Verify: Success message appears
4. Check: Email inbox for reset email
```

### 3. Reset Password (10 seconds)
```
1. Open reset email
2. Click "Reset Password" button
3. Enter new password (min 6 chars)
4. Confirm password
5. Click "Reset Password"
6. Verify: Success message + auto-redirect to login
```

### 4. Login with New Password (5 seconds)
```
1. Enter email and new password
2. Click "Login"
3. Verify: Successfully logged in!
```

---

## API Testing with cURL

### Test 1: Request Password Reset
```bash
curl -X POST http://localhost:5000/api/users/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

**Expected Response**:
```json
{
  "message": "Password reset link has been sent to your email address."
}
```

### Test 2: Reset Password
```bash
curl -X POST http://localhost:5000/api/users/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TOKEN_FROM_EMAIL","newPassword":"newpass123"}'
```

**Expected Response**:
```json
{
  "message": "Your password has been reset successfully. You can now log in with your new password."
}
```

---

## Quick Verification Checklist

- [ ] Forgot password link visible on login page
- [ ] Forgot password form accepts email
- [ ] Success message appears after submit
- [ ] Email arrives in inbox (check spam)
- [ ] Email contains clickable reset button
- [ ] Reset link opens correct page with token
- [ ] Password form validates (min 6 chars, match)
- [ ] Success message appears after reset
- [ ] Auto-redirects to login after 2 seconds
- [ ] Can login with new password
- [ ] Old password no longer works

---

## Common Issues & Quick Fixes

### ❌ Email Not Arriving
**Check**: Backend console for email errors
**Fix**: Verify `.env` has correct GMAIL_USER and GMAIL_APP_PASSWORD

### ❌ "Invalid Token" Error
**Cause**: Token expired (1 hour limit) or already used
**Fix**: Request new reset link

### ❌ Can't Login After Reset
**Check**: New password meets requirements (6+ characters)
**Fix**: Try forgot password again

---

## Backend Console Messages to Watch For

### ✅ Success Flow:
```
📤 Attempting to send OTP email to: user@example.com
✅ Password reset email sent to user@example.com
✅ Password reset successful for user@example.com
```

### ❌ Error Flow:
```
❌ Failed to send reset email: [error details]
❌ Forgot Password Error: [error details]
❌ Reset Password Error: [error details]
```

---

## Database Verification

### Check Reset Token in MongoDB:
```javascript
// MongoDB Shell or Compass
db.users.findOne({ email: "user@example.com" })

// Should see:
{
  email: "user@example.com",
  resetPasswordToken: "hashed_token_here",
  resetPasswordExpires: ISODate("2025-10-14T15:30:00.000Z")
}
```

### After Successful Reset:
```javascript
// resetPasswordToken and resetPasswordExpires should be null/undefined
{
  email: "user@example.com",
  resetPasswordToken: null,
  resetPasswordExpires: null,
  password: "new_bcrypt_hash_here"
}
```

---

## Test with Postman

### Collection Setup:
1. **Request 1**: POST Forgot Password
   - URL: `http://localhost:5000/api/users/forgot-password`
   - Body: `{"email": "test@example.com"}`

2. **Request 2**: POST Reset Password
   - URL: `http://localhost:5000/api/users/reset-password`
   - Body: `{"token": "TOKEN_FROM_EMAIL", "newPassword": "newpass123"}`

---

## Performance Expectations

- **Forgot Password Request**: < 2 seconds (including email send)
- **Email Delivery**: 1-30 seconds (depends on Gmail)
- **Reset Password**: < 1 second
- **Total Flow**: ~1-2 minutes from start to finish

---

## Security Notes

✅ **Safe to test**:
- Multiple reset requests (old tokens get overwritten)
- Invalid tokens (returns generic error)
- Non-existent emails (returns generic success)

⚠️ **Don't test in production**:
- Real user emails without permission
- Automated requests (add rate limiting first)

---

## Ready to Test? 

**Quick Start**:
```bash
# Terminal 1: Start Backend
cd ekameti-backend
npm start

# Terminal 2: Start Frontend  
cd ekameti-frontend
npm run dev

# Terminal 3: Watch Logs
cd ekameti-backend
tail -f server.log  # if you have logging enabled
```

Then navigate to `http://localhost:5173/` and click "Forgot your password?"

**Happy Testing! 🎉**

