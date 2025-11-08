# Patients Table Setup for Supabase

This document outlines how to set up the `patients` table in Supabase for the dashboard to work correctly.

## Database Schema

### Create the Patients Table

Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor > New Query):

```sql
-- Create the patients table
CREATE TABLE patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  mrn TEXT NOT NULL UNIQUE,
  visit_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on MRN for faster lookups
CREATE INDEX idx_patients_mrn ON patients(mrn);

-- Create index on visit_date for faster sorting
CREATE INDEX idx_patients_visit_date ON patients(visit_date);

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Column Descriptions

- **id**: UUID primary key (auto-generated)
- **patient_name**: Full name of the patient (TEXT, required)
- **date_of_birth**: Patient's date of birth (DATE, required)
- **mrn**: Medical Record Number (TEXT, required, unique)
- **visit_date**: Date and time of the visit (TIMESTAMPTZ, required, defaults to current time)
- **created_at**: Timestamp when record was created (auto-generated)
- **updated_at**: Timestamp when record was last updated (auto-updated)

---

## Row Level Security (RLS) Policies

Enable RLS and create policies to secure your data:

```sql
-- Enable Row Level Security
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all patients
CREATE POLICY "Allow authenticated users to read patients"
  ON patients
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to insert patients
CREATE POLICY "Allow authenticated users to insert patients"
  ON patients
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to update patients
CREATE POLICY "Allow authenticated users to update patients"
  ON patients
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to delete patients
CREATE POLICY "Allow authenticated users to delete patients"
  ON patients
  FOR DELETE
  USING (auth.role() = 'authenticated');
```

### Optional: User-Specific Access

If you want each user to only see their own patients, you can add a `user_id` column and modify the policies:

```sql
-- Add user_id column to link patients to users
ALTER TABLE patients ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read patients" ON patients;
DROP POLICY IF EXISTS "Allow authenticated users to insert patients" ON patients;
DROP POLICY IF EXISTS "Allow authenticated users to update patients" ON patients;
DROP POLICY IF EXISTS "Allow authenticated users to delete patients" ON patients;

-- Policy: Users can only read their own patients
CREATE POLICY "Users can read own patients"
  ON patients
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert patients for themselves
CREATE POLICY "Users can insert own patients"
  ON patients
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own patients
CREATE POLICY "Users can update own patients"
  ON patients
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own patients
CREATE POLICY "Users can delete own patients"
  ON patients
  FOR DELETE
  USING (auth.uid() = user_id);
```

---

## Sample Data

Add some test patients to verify the dashboard is working:

```sql
-- Insert sample patients
INSERT INTO patients (patient_name, date_of_birth, mrn, visit_date) VALUES
  ('John Smith', '1985-01-15', '123456', '2024-01-15 10:00:00+00'),
  ('Emily Johnson', '1992-05-22', '789012', '2024-01-15 10:30:00+00'),
  ('Michael Brown', '1978-09-03', '345678', '2024-01-15 11:00:00+00'),
  ('Sarah Davis', '2001-12-12', '901234', '2024-01-15 11:30:00+00'),
  ('Robert Wilson', '1965-03-28', '567890', '2024-01-15 14:00:00+00'),
  ('Jennifer Martinez', '1988-07-19', '234567', '2024-01-15 14:30:00+00');
```

**Note:** If you added the `user_id` column, you'll need to specify it when inserting:

```sql
-- Get your user ID first
SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- Then insert with user_id (replace 'your-user-id-here' with actual UUID)
INSERT INTO patients (patient_name, date_of_birth, mrn, visit_date, user_id) VALUES
  ('John Smith', '1985-01-15', '123456', '2024-01-15 10:00:00+00', 'your-user-id-here'),
  ('Emily Johnson', '1992-05-22', '789012', '2024-01-15 10:30:00+00', 'your-user-id-here');
```

---

## Dashboard Features

The dashboard now includes:

### ✅ Dynamic Patient Loading
- Fetches patients from Supabase `patients` table
- Orders by visit date (earliest first)
- Shows loading state while fetching

### ✅ Patient Card Display
- Patient name with color-coded avatar initials
- Date of birth in MM/DD/YYYY format
- Medical Record Number (MRN)
- Visit date and time in readable format (e.g., "Jan 15, 2024, 10:00 AM")

### ✅ Search Functionality
- Real-time search by patient name or MRN
- Shows "no results" message when no matches found

### ✅ Error Handling
- Displays error message if patients fail to load
- Gracefully handles missing data

### ✅ No Status Badges
- Removed "Waiting", "In Progress", "Review Needed", "Complete" badges as requested
- Clean, simple patient cards with just essential information

---

## Verifying Your Setup

### 1. Check Table Exists
```sql
SELECT * FROM patients LIMIT 5;
```

### 2. Check RLS is Enabled
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'patients';
```
Should return `rowsecurity = true`

### 3. Check Policies Exist
```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'patients';
```

### 4. Test Data Access
Log in to your application and visit the dashboard. You should see:
- Your patients listed in order of visit date
- Properly formatted dates and times
- Color-coded avatar initials
- Working search functionality

---

## Troubleshooting

### "Error loading patients" Message

**Possible causes:**
1. Table doesn't exist
2. RLS policies not set up correctly
3. User not authenticated
4. Column names don't match (check spelling: `patient_name`, `date_of_birth`, `mrn`, `visit_date`)

**Solutions:**
- Run the table creation SQL above
- Verify RLS policies are created
- Make sure you're logged in
- Check browser console for detailed error messages

### No Patients Showing

**Possible causes:**
1. No data in table
2. RLS policies preventing access
3. User ID doesn't match (if using user-specific access)

**Solutions:**
- Insert sample data using SQL above
- Verify RLS policies allow reading
- If using `user_id` column, make sure data has correct user ID

### Search Not Working

**Possible causes:**
- JavaScript not loading
- Script errors

**Solutions:**
- Open browser console and check for errors
- Verify `script.js` is loaded (check Network tab)
- Make sure there are no JavaScript errors blocking execution

---

## Next Steps

### 1. Add Patient Management Features
- Create a form to add new patients
- Add edit functionality for existing patients
- Add delete functionality with confirmation

### 2. Link to Patient Details Page
- Make patient cards clickable
- Navigate to patient details when clicked
- Pass patient ID as URL parameter

### 3. Add Filtering Options
- Filter by date range
- Filter by visit status
- Add sorting options (name, date, MRN)

### 4. Add Pagination
- Show 10-20 patients per page
- Add "Load More" or page navigation
- Improve performance for large datasets

---

## Files Modified

### Updated Files:
- `dashboard_screen/dashboard.html` - Removed hardcoded patients, added dynamic loading

### Changes Made:
- Lines 42-47: Replaced hardcoded patient cards with loading message
- Lines 127-293: Added JavaScript functions for:
  - `loadPatients()` - Fetches patients from Supabase
  - `createPatientCard()` - Generates patient card HTML
  - `formatDate()` - Formats date of birth
  - `formatDateTime()` - Formats visit date/time
  - `initializeSearch()` - Enables real-time search

---

## API Reference

The dashboard uses the following Supabase query:

```javascript
const { data: patients, error } = await supabase
  .from('patients')
  .select('*')
  .order('visit_date', { ascending: true });
```

This fetches all columns from the `patients` table, ordered by visit date from earliest to latest.

---

## Security Considerations

1. **Row Level Security (RLS)** is enabled to protect patient data
2. Only authenticated users can access patient data
3. Consider using user-specific policies in production
4. Never expose patient data to unauthenticated users
5. Comply with HIPAA and other healthcare data regulations

---

## Support

For Supabase-specific issues:
- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/select)
