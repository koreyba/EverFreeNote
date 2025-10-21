-- Seed data for testing
-- Insert test notes for skip-auth@example.com user

INSERT INTO public.notes (id, user_id, title, description, tags, created_at, updated_at)
VALUES
    (
        'a0000000-0000-0000-0000-000000000001',
        '550e8400-e29b-41d4-a716-446655440001',
        'Welcome to EverFreeNote',
        '<p>Welcome! This is your first note. You can:</p><ul><li>Create new notes</li><li>Edit existing notes</li><li>Add tags for organization</li><li>Search through your notes</li></ul>',
        ARRAY['welcome', 'tutorial'],
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '5 days'
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        '550e8400-e29b-41d4-a716-446655440001',
        'JavaScript Tips',
        '<p>Some useful JavaScript tips:</p><ul><li>Use <code>const</code> and <code>let</code> instead of <code>var</code></li><li>Arrow functions for cleaner code</li><li>Destructuring for easier data access</li><li>Template literals for string interpolation</li></ul>',
        ARRAY['javascript', 'programming', 'tips'],
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '2 days'
    ),
    (
        'a0000000-0000-0000-0000-000000000003',
        '550e8400-e29b-41d4-a716-446655440001',
        'Meeting Notes - Project Kickoff',
        '<p><strong>Date:</strong> October 15, 2025</p><p><strong>Attendees:</strong> Team members</p><p><strong>Topics:</strong></p><ul><li>Project timeline</li><li>Resource allocation</li><li>Next steps</li></ul><p><strong>Action items:</strong></p><ol><li>Set up development environment</li><li>Create initial wireframes</li><li>Schedule follow-up meeting</li></ol>',
        ARRAY['meeting', 'work', 'project'],
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    ),
    (
        'a0000000-0000-0000-0000-000000000004',
        '550e8400-e29b-41d4-a716-446655440001',
        'Shopping List',
        '<p>Things to buy:</p><ul><li>Milk</li><li>Bread</li><li>Eggs</li><li>Coffee</li><li>Vegetables</li></ul>',
        ARRAY['personal', 'shopping'],
        NOW() - INTERVAL '12 hours',
        NOW() - INTERVAL '6 hours'
    ),
    (
        'a0000000-0000-0000-0000-000000000005',
        '550e8400-e29b-41d4-a716-446655440001',
        'Book Ideas',
        '<p>Books I want to read:</p><ol><li><em>Clean Code</em> by Robert Martin</li><li><em>The Pragmatic Programmer</em></li><li><em>Design Patterns</em></li></ol><p><strong>Fiction:</strong></p><ul><li>Science fiction novels</li><li>Mystery thrillers</li></ul>',
        ARRAY['books', 'reading', 'personal'],
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '1 hour'
    )
ON CONFLICT (id) DO NOTHING;

-- Insert a couple of notes for test@example.com user as well
INSERT INTO public.notes (id, user_id, title, description, tags, created_at, updated_at)
VALUES
    (
        'b0000000-0000-0000-0000-000000000001',
        '550e8400-e29b-41d4-a716-446655440000',
        'Test User Note',
        '<p>This is a test note for the test user account.</p>',
        ARRAY['test'],
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    )
ON CONFLICT (id) DO NOTHING;

