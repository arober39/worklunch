-- Disable email confirmation requirement for authentication
-- This allows users to sign in immediately without confirming their email

-- Update the auth configuration to disable email confirmation
UPDATE auth.config
SET enable_signup = true,
    enable_email_signup = true,
    enable_email_confirmations = false;

-- Note: The above might not work depending on Supabase version
-- The recommended way is through the Dashboard:
-- 1. Go to Authentication > Settings
-- 2. Under "Email Auth", disable "Enable email confirmations"
-- 3. Save changes

-- Alternative: You can also disable it via the Supabase Management API
-- or through the dashboard UI which is the most reliable method.
