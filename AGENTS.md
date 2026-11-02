# Project rules

- Keep unapproved database migration and rollback drafts in `supabase/drafts/`, outside `supabase/migrations/`, to prevent treating review-only SQL as an applied migration.
- Author post deletion uses DELETE with an exact affected-row count and no returned rows; this avoids soft-delete SELECT visibility conflicts and detects no-op deletions.