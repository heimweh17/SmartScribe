# UF Health SmartScribe - Setup Guide

## Supabase Authentication Setup

This application uses Supabase for authentication. Follow these steps to get started:

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in your project details:
   - Project name: `uf-health-smartscribe` (or your preferred name)
   - Database password: Create a strong password
   - Region: Choose the closest region to your users

### 2. Get Your Supabase Credentials

1. Once your project is created, go to **Project Settings** (gear icon in sidebar)
2. Navigate to **API** section
3. Copy the following values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### 3. Configure Your Application

1. Open `js/supabase.js`
2. Replace the placeholder values:
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL';
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
   ```

   With your actual credentials:
   ```javascript
   const SUPABASE_URL = 'https://xxxxxxxxxxxxx.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
   ```

### 4. Enable Email Authentication in Supabase

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. Configure email settings:
   - **Enable email confirmations**: Turn OFF for development (turn ON for production)
   - **Secure email change**: Enable for production

### 5. Create Your First User

You can create users in two ways:

#### Option A: Through the Application
1. Open `index.html` in your browser
2. Click "Sign Up" link
3. Enter email and password
4. Check your email for confirmation (if email confirmations are enabled)

#### Option B: Through Supabase Dashboard
1. Go to **Authentication** → **Users**
2. Click "Add User"
3. Enter email and password
4. Click "Create User"

### 6. Test the Authentication

1. Open `index.html` in your browser
2. Enter your credentials
3. Click "Log In"
4. You should be redirected to `patient-details.html`

## Features Implemented

- ✅ **Sign In**: Email and password authentication
- ✅ **Sign Up**: New user registration
- ✅ **Password Reset**: Forgot password functionality
- ✅ **Session Management**: Automatic session handling
- ✅ **Protected Routes**: patient-details.html requires authentication
- ✅ **Logout**: Sign out functionality

## File Structure

```
Smart-Clinical/
├── index.html                    (Login page)
├── patient-details.html          (Protected - Patient details)
├── css/
│   ├── login.css
│   └── patient-details.css
├── js/
│   ├── supabase.js              (Supabase configuration)
│   ├── auth.js                  (Authentication logic)
│   └── patient-details.js
├── .env                         (Environment variables - not committed)
├── .gitignore
└── SETUP.md
```

## Security Best Practices

1. **Never commit your .env file** - It's already in .gitignore
2. **Use Row Level Security (RLS)** in Supabase for database tables
3. **Enable email confirmations** in production
4. **Use HTTPS** in production
5. **Set up proper CORS** in Supabase if needed

## Troubleshooting

### "Invalid API key" error
- Make sure you're using the **anon/public** key, not the service role key
- Check that your Supabase URL is correct

### "User not found" error
- Make sure the user exists in Supabase Dashboard → Authentication → Users
- Check if email confirmation is required

### Redirects not working
- Check browser console for errors
- Make sure all script files are loaded in correct order

### CORS errors
- In Supabase Dashboard, go to Settings → API
- Add your domain to the allowed origins list

## Next Steps

1. ✅ Set up authentication (completed)
2. 🔄 Create dashboard page (app.html)
3. 🔄 Integrate database for patient records
4. 🔄 Add user profile management
5. 🔄 Implement role-based access control

## Support

For Supabase documentation: [https://supabase.com/docs](https://supabase.com/docs)



-- Create consultations table for storing complete medical records
CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_mrn TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  
  -- Patient Demographics
  date_of_birth TEXT,
  chief_complaint TEXT,
  primary_pharmacy TEXT,
  
  -- Vitals
  bp TEXT,
  hr TEXT,
  temp TEXT,
  o2_sat TEXT,
  
  -- Medical Info
  allergies TEXT,
  current_medications TEXT,
  medical_conditions TEXT,
  last_visit TEXT,
  
  -- Consultation Data
  transcript JSONB DEFAULT '[]'::jsonb,
  recording_duration_seconds DECIMAL,
  
  -- SOAP Note
  soap_subjective TEXT,
  soap_objective TEXT,
  soap_assessment TEXT,
  soap_plan TEXT,
  
  -- AI Recommendations
  rec_medications TEXT,
  rec_lifestyle TEXT,
  rec_followup TEXT,
  rec_education TEXT,
  rec_tests TEXT,
  rec_referrals TEXT,
  
  -- Additional Notes
  quick_notes TEXT,
  
  -- Metadata
  consultation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_consultations_patient_mrn ON consultations(patient_mrn);
CREATE INDEX IF NOT EXISTS idx_consultations_user_id ON consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_consultations_date ON consultations(consultation_date DESC);

-- Enable Row Level Security
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own consultations" ON consultations;
DROP POLICY IF EXISTS "Users can insert own consultations" ON consultations;
DROP POLICY IF EXISTS "Users can update own consultations" ON consultations;
DROP POLICY IF EXISTS "Users can delete own consultations" ON consultations;

-- Create policies: Users can only see their own consultations
CREATE POLICY "Users can view own consultations"
  ON consultations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consultations"
  ON consultations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consultations"
  ON consultations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own consultations"
  ON consultations FOR DELETE
  USING (auth.uid() = user_id);
