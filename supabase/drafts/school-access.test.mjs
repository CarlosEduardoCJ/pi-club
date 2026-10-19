// Isolated PostgreSQL-compatible test; never connects to the hosted database.
// Run: PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node supabase/drafts/school-access.test.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

if (!process.env.PGLITE_MODULE) throw new Error('An isolated PGlite module path is required');
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db = new PGlite();
const policies = [
  ['follows', 'Follows viewable by everyone'],
  ['event_attendees', 'Attendees viewable by everyone'],
  ['post_comments', 'Comments viewable by everyone'],
  ['post_likes', 'Likes viewable by everyone'],
  ['competition_registrations', 'Registrations viewable by everyone'],
  ['clubs', 'Clubs are viewable by everyone'],
  ['competitions', 'Competitions viewable by everyone'],
  ['events', 'Events are viewable by everyone'],
];
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated;
  CREATE SCHEMA auth; CREATE SCHEMA private;
  CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'developer');
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS
    $$ SELECT '00000000-0000-0000-0000-000000000001'::uuid $$;
  CREATE FUNCTION private.has_role(uuid, public.app_role) RETURNS boolean LANGUAGE sql AS
    $$ SELECT COALESCE(current_setting('test.role', true), 'user') = $2::text $$;
  CREATE TABLE public.profiles (id int PRIMARY KEY, school text, developer boolean DEFAULT false);
  INSERT INTO public.profiles VALUES (1, 'SCHOOL A', false), (2, '', false);
`);
for (const [table, policy] of policies) {
  await db.exec(`CREATE TABLE public.${table} (id int);
    GRANT SELECT ON public.${table} TO anon, authenticated;
    ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "${policy}" ON public.${table} FOR SELECT TO PUBLIC USING (true);
    INSERT INTO public.${table} VALUES (1);`);
}
await db.exec(await readFile(new URL('./20261019_school_and_authenticated_reads.sql', import.meta.url), 'utf8'));
await assert.rejects(db.exec("UPDATE profiles SET school='SCHOOL B' WHERE id=1"), (error) => error.code === '42501');
console.log('PASS: common user cannot change a defined school');
await db.exec("SET test.role='admin'");
await assert.rejects(db.exec("UPDATE profiles SET school='SCHOOL B' WHERE id=1"), (error) => error.code === '42501');
console.log('PASS: admin has no school-change exception without a required app flow');
await db.exec(`SET test.role='user'; UPDATE profiles SET school='SCHOOL A' WHERE id=1;
  UPDATE profiles SET school='SCHOOL A' WHERE id=2;`);
assert.equal((await db.query('SELECT school FROM profiles WHERE id=2')).rows[0].school, 'SCHOOL A');
console.log('PASS: unchanged school and initial definition are allowed');
await db.exec("SET test.role='developer'; UPDATE profiles SET school='SCHOOL B' WHERE id=1");
assert.equal((await db.query('SELECT school, developer FROM profiles WHERE id=1')).rows[0].school, 'SCHOOL B');
assert.equal((await db.query('SELECT developer FROM profiles WHERE id=1')).rows[0].developer, false);
console.log('PASS: developer can change school without changing the developer column');
for (const [table] of policies) {
  await db.exec('SET ROLE anon');
  assert.equal((await db.query(`SELECT count(*)::int AS total FROM public.${table}`)).rows[0].total, 0);
  await db.exec('RESET ROLE; SET ROLE authenticated');
  assert.equal((await db.query(`SELECT count(*)::int AS total FROM public.${table}`)).rows[0].total, 1);
  await db.exec('RESET ROLE');
  console.log(`PASS: ${table} anonymous=0, authenticated=1`);
}
await db.exec(await readFile(new URL('./20261019_school_and_authenticated_reads.rollback.sql', import.meta.url), 'utf8'));
for (const [table] of policies) {
  await db.exec('SET ROLE anon');
  assert.equal((await db.query(`SELECT count(*)::int AS total FROM public.${table}`)).rows[0].total, 1);
  await db.exec('RESET ROLE');
}
await db.exec("SET test.role='user'; UPDATE profiles SET school='SCHOOL C' WHERE id=1");
assert.equal((await db.query('SELECT school FROM profiles WHERE id=1')).rows[0].school, 'SCHOOL C');
console.log('PASS: rollback restores all eight PUBLIC policies and removes school guard');
await db.close();