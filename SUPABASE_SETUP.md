# Supabase Configuration Guide for Smart Clinical

This document outlines the required Supabase settings for the signup and authentication functionality.

## Required Supabase Settings

### 1. Email Confirmation Settings

Navigate to: **Authentication > Settings > Email Auth** in your Supabase Dashboard

#### Option A: Email Confirmation Required (Recommended for Production)
- **Enable email confirmations**: ✅ Enabled
- Users will receive a confirmation email after signup
- They must click the link to activate their account
- More secure, prevents spam registrations

#### Option B: Auto-confirm Email (Good for Development/Testing)
- **Enable email confirmations**: ❌ Disabled
- Users can immediately login after signup
- No email confirmation required
- Faster for testing, but less secure

**Current Code Behavior:**
- If email confirmation is **enabled**: Users see "Please check your email to confirm your account" and are redirected to login page
- If email confirmation is **disabled**: Users are automatically logged in and redirected to dashboard

---

### 2. Email Templates Configuration

Navigate to: **Authentication > Email Templates** in your Supabase Dashboard

Configure the following email templates:

#### A. Confirm Signup Email
- **Subject**: Confirm your UF Health SmartScribe account
- **Body**: Update with your branding and include the confirmation link: `{{ .ConfirmationURL }}`
- **Redirect URL**: Set to `https://yourdomain.com/dashboard_screen/dashboard.html`

Example template:
```html
<h2>Welcome to UF Health SmartScribe!</h2>
<p>Please confirm your email address by clicking the button below:</p>
<a href="{{ .ConfirmationURL }}">Confirm Email</a>
<p>If you didn't create this account, you can safely ignore this email.</p>
```

#### B. Reset Password Email
- **Subject**: Reset your UF Health SmartScribe password
- **Body**: Include the reset link: `{{ .ConfirmationURL }}`
- **Redirect URL**: Set to `https://yourdomain.com/reset-password.html` (if you create this page)

---

### 3. Redirect URLs Configuration

Navigate to: **Authentication > URL Configuration** in your Supabase Dashboard

Add the following URLs to the **Redirect URLs** allowlist:

**For Development:**
```
http://localhost:3000/dashboard_screen/dashboard.html
http://127.0.0.1:3000/dashboard_screen/dashboard.html
http://localhost:5500/dashboard_screen/dashboard.html
http://127.0.0.1:5500/dashboard_screen/dashboard.html
```

**For Production:**
```
https://yourdomain.com/dashboard_screen/dashboard.html
https://www.yourdomain.com/dashboard_screen/dashboard.html
```

**Note:** Replace `yourdomain.com` with your actual domain. Add all URLs where your app might be hosted.

---

### 4. Password Requirements

Navigate to: **Authentication > Settings > Password Requirements**

Current implementation assumes:
- **Minimum password length**: 6 characters (recommended: 8+ for production)
- **Password complexity**: Optional (consider enabling for production)

**To change:**
- Update minimum length in Supabase settings
- Update the `minlength="6"` attribute in `signup.html` (lines 61, 91)
- Update validation in `signup.js` (line 108)

---

### 5. Rate Limiting

Navigate to: **Authentication > Settings > Rate Limits**

Recommended settings:
- **Email signups per hour**: 4-10 per hour per IP address
- **Login attempts**: 10 per hour per IP address
- **Password reset requests**: 3 per hour per IP address

This prevents abuse and spam registrations.

---

### 6. User Metadata Storage

The signup form collects and stores the user's full name in user metadata.

**Storage location:** `auth.users.raw_user_meta_data.full_name`

**To access this data:**
```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log(user.user_metadata.full_name);
```

**Optional: Create a profiles table**

If you want to store additional user information, create a `profiles` table:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Create policy for users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

### 7. SMTP Configuration (Email Sending)

Navigate to: **Project Settings > Auth > SMTP Settings**

#### Option A: Use Supabase's Email Service (Default)
- Free tier: Limited emails per hour
- Good for development and testing
- May end up in spam folders

#### Option B: Configure Custom SMTP (Recommended for Production)
Set up your own SMTP server for better deliverability:

**Popular options:**
- **SendGrid**: Free tier available, good deliverability
- **Amazon SES**: Pay-as-you-go, very reliable
- **Mailgun**: Free tier available
- **Postmark**: Excellent for transactional emails

**Configuration:**
- **SMTP Host**: Your provider's SMTP host
- **SMTP Port**: Usually 587 (TLS) or 465 (SSL)
- **SMTP User**: Your SMTP username
- **SMTP Password**: Your SMTP password
- **Sender Email**: The email address users will see
- **Sender Name**: "UF Health SmartScribe" or your app name

---

### 8. Security Best Practices

#### Enable RLS (Row Level Security)
If you create any database tables for user data, always enable RLS:
```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

#### Environment Variables
Your Supabase credentials are currently in `js/supabase.js`:
```javascript
const SUPABASE_URL = 'https://wfnfenamljihdgdmoyoy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGc...';
```

**This is safe for client-side apps** because:
- The anon key is meant to be public
- Row Level Security protects your data
- Never expose the `service_role` key in client-side code

---

## Testing Your Setup

### 1. Test Email Confirmation Disabled (Quick Test)
1. Go to Supabase Dashboard > Authentication > Settings
2. Disable "Enable email confirmations"
3. Go to `signup.html` on your site
4. Create a new account
5. You should be automatically logged in and redirected to dashboard

### 2. Test Email Confirmation Enabled (Production Mode)
1. Go to Supabase Dashboard > Authentication > Settings
2. Enable "Enable email confirmations"
3. Configure SMTP settings (or use Supabase's email service)
4. Go to `signup.html` on your site
5. Create a new account with a real email you can access
6. Check your email for confirmation link
7. Click the confirmation link
8. You should be redirected to the dashboard
9. Try logging in with your credentials on `index.html`

### 3. Test Existing User Error
1. Try to sign up with the same email again
2. You should see: "This email is already registered"

### 4. Test Password Validation
1. Try to sign up with password less than 6 characters
2. You should see: "Password must be at least 6 characters long"

### 5. Test Password Mismatch
1. Enter different passwords in password and confirm password fields
2. You should see: "Passwords do not match"

---

## Troubleshooting

### Users Not Receiving Emails
1. Check SMTP configuration in Supabase
2. Check spam/junk folders
3. Verify email templates are configured
4. Check Supabase logs for email sending errors
5. Consider using a custom SMTP provider

### "Invalid Redirect URL" Error
1. Add your redirect URL to the allowlist in Supabase
2. Make sure the URL exactly matches (including http/https)
3. Include all possible URLs (localhost, production domain, www subdomain)

### Users Can't Login After Signup
1. Check if email confirmation is enabled
2. If enabled, make sure user clicked confirmation link in email
3. Check Supabase Dashboard > Authentication > Users to see user status
4. Look for "email_confirmed_at" field - should not be null

### "Already Registered" Error When Email Not Registered
1. Check Supabase Dashboard > Authentication > Users
2. User might be there but not confirmed
3. You can manually delete the user or confirm their email in the dashboard

---

## Next Steps

1. **Create Password Reset Page**: Currently the forgot password link sends an email, but you need a `reset-password.html` page to handle the reset
2. **Add Email Verification Page**: Create a dedicated page for email verification success/failure
3. **Improve Error UI**: Replace `alert()` with better UI notifications (toast messages, inline errors)
4. **Add Loading Spinners**: Better visual feedback during signup process
5. **Add Field Validation**: Real-time validation as user types
6. **Add Social Login**: Configure OAuth providers (Google, Microsoft, etc.)

---

## Files Modified/Created

### New Files:
- `signup.html` - Signup page UI
- `css/signup.css` - Signup page styles
- `js/signup.js` - Signup logic and Supabase integration

### Modified Files:
- `js/auth.js` - Updated signup link to redirect to signup page (line 167-175)

---

## Support

For Supabase-specific issues, refer to:
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
