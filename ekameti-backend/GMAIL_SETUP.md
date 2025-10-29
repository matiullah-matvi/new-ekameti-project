# 📧 Gmail SMTP Setup Guide for eKameti

## ✅ **100% FREE - No Credit Card Required!**

Follow these steps to send emails from `ekameti.service@gmail.com` to your users.

---

## 🔐 **Step 1: Enable 2-Step Verification**

1. Go to your Google Account: https://myaccount.google.com/
2. Click on **Security** in the left sidebar
3. Under "How you sign in to Google", click **2-Step Verification**
4. Click **Get Started** and follow the instructions
5. Verify with your phone number

**✅ You MUST enable 2-Step Verification to create App Passwords!**

---

## 🔑 **Step 2: Generate App Password**

1. After enabling 2-Step Verification, go to: https://myaccount.google.com/apppasswords
   
   **OR**
   
   - Go to Google Account → Security
   - Under "How you sign in to Google", click **App passwords**

2. You'll be asked to sign in again

3. In the "Select app" dropdown, choose **Mail**

4. In the "Select device" dropdown, choose **Other (Custom name)**

5. Type: `eKameti Backend`

6. Click **Generate**

7. **Copy the 16-character password** (it looks like: `abcd efgh ijkl mnop`)

   ⚠️ **IMPORTANT:** This password will only be shown ONCE! Copy it now!

---

## 📝 **Step 3: Update `.env` File**

Open your `.env` file and update:

```env
GMAIL_USER=ekameti.service@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

⚠️ **Replace `abcdefghijklmnop` with your actual 16-character App Password (remove spaces!)**

**Example:**
```env
GMAIL_USER=ekameti.service@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop  ❌ WRONG (has spaces)
GMAIL_APP_PASSWORD=abcdefghijklmnop      ✅ CORRECT (no spaces)
```

---

## 🎯 **Step 4: Update NODE_ENV**

In your `.env` file, change:

```env
NODE_ENV=development
```

to:

```env
NODE_ENV=production
```

This will ensure real emails are sent instead of showing OTP in alerts.

---

## 🚀 **Step 5: Restart Backend**

```bash
cd "C:\Users\Mati Ullah\ekameti-project\ekameti-backend"
node server.js
```

---

## ✅ **Step 6: Test It!**

1. Go to: http://localhost:5173/register
2. Fill in the registration form
3. Click **Register**
4. **Check your email inbox!** 📧

You should receive:
- ✅ **OTP Email** with verification code
- ✅ **Welcome Email** after verification

---

## 🔍 **Troubleshooting**

### ❌ "Invalid login: 535-5.7.8 Username and Password not accepted"

**Solution:**
- Make sure you enabled 2-Step Verification
- Generate a NEW App Password
- Remove ALL spaces from the App Password
- Use `ekameti.service@gmail.com` (exact email)

### ❌ Email not received

**Check:**
1. Spam/Junk folder
2. Backend console for errors
3. Gmail App Password is correct (16 characters, no spaces)
4. `NODE_ENV=production` in `.env`

### ❌ Still showing OTP alert popup

**Solution:**
- Change `NODE_ENV=development` to `NODE_ENV=production` in `.env`
- Restart backend: `node server.js`

---

## 📊 **Gmail Sending Limits (FREE)**

| Limit Type | Amount |
|------------|--------|
| Emails per day | **500 emails/day** |
| Recipients per email | **500 recipients** |
| Cost | **$0 (100% FREE)** |

**Perfect for your eKameti platform!** 🎉

---

## 🎨 **Email Templates Included**

✅ **OTP Verification Email**
- Professional gradient header
- Large, clear OTP code
- 10-minute expiry notice
- Security warning

✅ **Welcome Email**
- Warm greeting
- Call-to-action button
- Brand colors

✅ **Password Reset Email**
- Secure reset link
- 1-hour expiry notice
- Safety instructions

---

## 🔒 **Security Best Practices**

✅ **DO:**
- Keep your App Password in `.env` file
- Add `.env` to `.gitignore`
- Never share your App Password
- Regenerate App Password if compromised

❌ **DON'T:**
- Commit `.env` to GitHub
- Share your App Password
- Use your regular Gmail password

---

## 📞 **Need Help?**

If you encounter issues:

1. Check backend console for error messages
2. Verify App Password has no spaces
3. Make sure 2-Step Verification is enabled
4. Try generating a new App Password

---

## ✅ **Quick Checklist**

- [ ] Enabled 2-Step Verification
- [ ] Generated App Password
- [ ] Updated `.env` with App Password (no spaces)
- [ ] Set `NODE_ENV=production`
- [ ] Restarted backend server
- [ ] Tested registration flow
- [ ] Received OTP email
- [ ] Received welcome email

---

**🎉 You're all set! Your users will now receive professional emails from `ekameti.service@gmail.com`!**

