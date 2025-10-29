# 🔐 Google OAuth Setup Guide for eKameti

## ✅ **BACKEND & FRONTEND READY!**

Your Google Sign-in/Sign-up is fully integrated! Just need to add Google Cloud credentials.

---

## 🎯 **SETUP STEPS:**

### **Step 1: Create Google Cloud Project**

1. Go to: https://console.cloud.google.com/
2. Click "**Select a project**" → "**New Project**"
3. Project name: `eKameti`
4. Click "**Create**"

---

### **Step 2: Enable Google+ API**

1. In your project dashboard, click "**APIs & Services**" → "**Enable APIs and Services**"
2. Search for: `Google+ API`
3. Click on it → Click "**Enable**"

---

### **Step 3: Create OAuth Credentials**

1. Go to: **APIs & Services** → **Credentials**
2. Click "**+ Create Credentials**" → "**OAuth client ID**"
3. If prompted, configure consent screen first:
   - Click "**Configure Consent Screen**"
   - Select "**External**" → Click "**Create**"
   - Fill in:
     - App name: `eKameti`
     - User support email: `ekameti.service@gmail.com`
     - Developer contact: `ekameti.service@gmail.com`
   - Click "**Save and Continue**"
   - Skip "Scopes" → Click "**Save and Continue**"
   - Skip "Test users" → Click "**Save and Continue**"
   - Click "**Back to Dashboard**"

4. Now create OAuth Client ID:
   - Go back to **Credentials** → **+ Create Credentials** → **OAuth client ID**
   - Application type: "**Web application**"
   - Name: `eKameti Web`
   - **Authorized JavaScript origins:**
     - `http://localhost:5173`
     - `http://localhost:5000`
   - **Authorized redirect URIs:**
     - `http://localhost:5000/api/auth/google/callback`
   - Click "**Create**"

5. **COPY YOUR CREDENTIALS:**
   You'll see a popup with:
   - **Client ID**: `something.apps.googleusercontent.com`
   - **Client Secret**: `random-secret-string`
   
   ⚠️ **SAVE THESE NOW!**

---

### **Step 4: Update `.env` File**

Open: `ekameti-backend/.env`

Replace these lines:
```env
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

With your actual credentials:
```env
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-AbCdEfGhIjKlMnOpQrSt
```

---

### **Step 5: Restart Backend Server**

```powershell
cd "C:\Users\Mati Ullah\ekameti-project\ekameti-backend"
node server.js
```

---

## 🧪 **TEST IT!**

### **Test 1: Google Sign-In (Login Page)**

1. Go to: `http://localhost:5173/`
2. Click "**Sign in with Google**" button
3. Google login popup appears
4. Select your Google account
5. Click "Allow"
6. ✅ You should be redirected to Dashboard!

### **Test 2: Google Sign-Up (Register Page)**

1. Go to: `http://localhost:5173/register`
2. Click "**Sign up with Google**" button
3. Google login popup appears
4. Select your Google account
5. Click "Allow"
6. ✅ Account created! Redirected to Dashboard!

---

## 🎯 **HOW IT WORKS:**

### **Login Flow:**
```
User clicks "Sign in with Google"
        ↓
Google OAuth popup opens
        ↓
User selects Google account
        ↓
Backend receives Google profile
        ↓
Check if user exists (by email or googleId)
        ↓
If exists: Login user
If not: Create new account
        ↓
Generate JWT token
        ↓
Redirect to Dashboard ✅
```

### **What Gets Stored:**
- ✅ Full name (from Google)
- ✅ Email (from Google)
- ✅ Profile photo (from Google)
- ✅ Google ID (for future logins)
- ✅ Auto-generated username (from email)

---

## ✅ **FEATURES:**

### **1. Auto-Create Account**
- New Google users automatically get an account
- No password needed
- No email verification needed (Google already verified)

### **2. Link Existing Accounts**
- If user already registered with same email
- Google account gets linked automatically
- Can login with either method

### **3. Profile Photo**
- Google profile photo automatically imported
- No need to upload CNIC image
- User marked as "verified"

---

## 🔍 **BACKEND FILES CREATED:**

```
ekameti-backend/
├── config/
│   └── passport.js              ← Google OAuth strategy
├── routes/
│   └── authRoutes.js            ← Google auth routes
├── models/
│   └── User.js                  ← Updated with Google fields
├── server.js                    ← Added Passport middleware
└── .env                         ← Google credentials
```

---

## 🎨 **FRONTEND FILES CREATED/UPDATED:**

```
ekameti-frontend/
├── src/
│   ├── pages/
│   │   ├── GoogleAuthCallback.jsx  ← Handles Google redirect
│   │   ├── Login.jsx               ← Added Google button
│   │   └── Register.jsx            ← Added Google button
│   └── App.jsx                     ← Added callback route
```

---

## 📊 **WHAT'S INCLUDED:**

| Feature | Status |
|---------|--------|
| Google Sign-In | ✅ DONE |
| Google Sign-Up | ✅ DONE |
| Auto-create account | ✅ DONE |
| Link existing accounts | ✅ DONE |
| Profile photo import | ✅ DONE |
| JWT token generation | ✅ DONE |
| Redirect to dashboard | ✅ DONE |
| Beautiful UI buttons | ✅ DONE |

---

## ⚠️ **TROUBLESHOOTING:**

### **Error: "redirect_uri_mismatch"**
**Solution:** Add exact redirect URI in Google Console:
- `http://localhost:5000/api/auth/google/callback`

### **Error: "Access blocked: This app's request is invalid"**
**Solution:** Configure OAuth consent screen in Google Console

### **Error: "Invalid client"**
**Solution:** Check your Client ID and Secret in `.env`

---

## 🎉 **YOU'RE READY!**

Once you add the Google credentials to `.env`, you can:
- ✅ Sign in with Google on login page
- ✅ Sign up with Google on register page
- ✅ Auto-create accounts for new Google users
- ✅ Link Google to existing accounts

**All you need is the Client ID and Secret from Google Cloud Console!**

---

## 📝 **NEXT STEPS:**

1. ✅ Get Google Cloud credentials (follow Step 1-3 above)
2. ✅ Update `.env` file (Step 4)
3. ✅ Restart backend (Step 5)
4. ✅ Test on login page
5. ✅ Test on register page
6. ✅ Celebrate! 🎊

---

**Need help? Check the console logs in both frontend and backend for detailed error messages!**

