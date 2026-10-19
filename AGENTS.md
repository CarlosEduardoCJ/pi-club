# Project rules

- Keep unapproved database migration and rollback drafts in `supabase/drafts/`, outside `supabase/migrations/`, to prevent treating review-only SQL as an applied migration.