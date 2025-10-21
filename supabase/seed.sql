-- Seed data for local development
-- This file is executed after migrations when running `supabase db reset`

DO $$
DECLARE
  test_user_id uuid := '550e8400-e29b-41d4-a716-446655440000';
  skip_user_id uuid := '550e8400-e29b-41d4-a716-446655440001';
BEGIN
  -- Insert test user 1: test@example.com / testpassword123
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_change,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    test_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'test@example.com',
    '$2a$10$rqiU7W8JVvXEqKvDhqvZ0.Xk8YvJZJvXqKvDhqvZ0.Xk8YvJZJvXq',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Test User"}'::jsonb,
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Update email_confirmed_at separately (it's a generated column in newer versions)
  UPDATE auth.users 
  SET email_confirmed_at = NOW()
  WHERE id = test_user_id;

  -- Insert identity for test user
  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    test_user_id::text,
    test_user_id,
    jsonb_build_object(
      'sub', test_user_id::text,
      'email', 'test@example.com',
      'email_verified', true
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
  ) ON CONFLICT (provider_id, provider) DO NOTHING;

  -- Insert test user 2: skip-auth@example.com / testpassword123
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_change,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    skip_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'skip-auth@example.com',
    '$2a$10$rqiU7W8JVvXEqKvDhqvZ0.Xk8YvJZJvXqKvDhqvZ0.Xk8YvJZJvXq',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Skip Auth User"}'::jsonb,
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Update email_confirmed_at
  UPDATE auth.users 
  SET email_confirmed_at = NOW()
  WHERE id = skip_user_id;

  -- Insert identity for skip-auth user
  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    skip_user_id::text,
    skip_user_id,
    jsonb_build_object(
      'sub', skip_user_id::text,
      'email', 'skip-auth@example.com',
      'email_verified', true
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
  ) ON CONFLICT (provider_id, provider) DO NOTHING;

  -- Insert some sample notes for test users
  INSERT INTO public.notes (id, user_id, title, description, tags, created_at, updated_at)
  VALUES
    (
      'a0000000-0000-0000-0000-000000000001',
      skip_user_id,
      'Welcome to EverFreeNote',
      '<p>Welcome! This is your first note. You can:</p><ul><li>Create new notes</li><li>Edit existing notes</li><li>Add tags for organization</li><li>Search through your notes</li></ul>',
      ARRAY['welcome', 'tutorial'],
      NOW() - INTERVAL '5 days',
      NOW() - INTERVAL '5 days'
    ),
    (
      'a0000000-0000-0000-0000-000000000002',
      skip_user_id,
      'JavaScript Tips',
      '<p>Some useful JavaScript tips:</p><ul><li>Use <code>const</code> and <code>let</code> instead of <code>var</code></li><li>Arrow functions for cleaner code</li><li>Destructuring for easier data access</li><li>Template literals for string interpolation</li></ul>',
      ARRAY['javascript', 'programming', 'tips'],
      NOW() - INTERVAL '3 days',
      NOW() - INTERVAL '2 days'
    ),
    (
      'b0000000-0000-0000-0000-000000000001',
      test_user_id,
      'Test User Note',
      '<p>This is a test note for the test user account.</p>',
      ARRAY['test'],
      NOW() - INTERVAL '1 day',
      NOW() - INTERVAL '1 day'
    )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Test users and sample data seeded successfully!';
END $$;
