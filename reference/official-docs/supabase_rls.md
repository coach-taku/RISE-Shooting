# Row Level Security

> **Source:** https://supabase.com/docs/guides/auth/row-level-security
> **取得日:** 2026-03-15

Secure your data using Postgres Row Level Security.

## Row Level Security in Supabase

Supabase allows convenient and secure data access from the browser, as long as you enable RLS.

RLS _must_ always be enabled on any tables stored in an exposed schema. By default, this is the `public` schema.

**RLS is enabled by default on tables created with the Table Editor in the dashboard.** If you create one in raw SQL or with the SQL editor, remember to enable RLS yourself:

```sql
alter table <schema_name>.<table_name>
enable row level security;
```

RLS is incredibly powerful and flexible, allowing you to write complex SQL rules that fit your unique business needs. RLS can be combined with Supabase Auth for end-to-end user security from the browser to the database.

## Policies

Policies are Postgres's rule engine. Each policy is attached to a table, and the policy is executed every time a table is accessed.

You can just think of them as adding a `WHERE` clause to every query. For example a policy like this ...

```sql
create policy "Individuals can view their own todos."
on todos for select
using ( (select auth.uid()) = user_id );
```

.. would translate to this whenever a user tries to select from the todos table:

```sql
select *
from todos
where auth.uid() = todos.user_id;
-- Policy is implicitly added.
```

## Enabling Row Level Security

```sql
alter table "table_name" enable row level security;
```

Once you have enabled RLS, no data will be accessible via the API when using the public `anon` key, until you create policies.

## Authenticated and unauthenticated roles

Supabase maps every request to one of the roles:

- `anon`: an unauthenticated request (the user is not logged in)
- `authenticated`: an authenticated request (the user is logged in)

You can use these roles within your Policies using the `TO` clause:

```sql
create policy "Profiles are viewable by everyone"
on profiles for select
to authenticated, anon
using ( true );
```

## Creating policies

### SELECT policies

```sql
-- 1. Create table
create table profiles (
  id uuid primary key,
  user_id uuid references auth.users,
  avatar_url text
);

-- 2. Enable RLS
alter table profiles enable row level security;

-- 3. Create Policy
create policy "Public profiles are visible to everyone."
on profiles for select
to anon
using ( true );
```

User can see their own profile only:

```sql
create policy "User can see their own profile only."
on profiles
for select using ( (select auth.uid()) = user_id );
```

### INSERT policies

```sql
create policy "Users can create a profile."
on profiles for insert
to authenticated
with check ( (select auth.uid()) = user_id );
```

### UPDATE policies

```sql
create policy "Users can update their own profile."
on profiles for update
to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id );
```

### DELETE policies

```sql
create policy "Users can delete a profile."
on profiles for delete
to authenticated
using ( (select auth.uid()) = user_id );
```

### Views

Views bypass RLS by default. In Postgres 15+, use `security_invoker = true`:

```sql
create view
with(security_invoker = true)
as select ...
```

## Helper functions

### `auth.uid()`

Returns the ID of the user making the request.

### `auth.jwt()`

Returns the JWT of the user making the request.

- `raw_user_meta_data` - can be updated by the authenticated user. Not a good place to store authorization data.
- `raw_app_meta_data` - cannot be updated by the user. Good place to store authorization data.

## Bypassing Row Level Security

Supabase provides special "Service" keys, which can be used to bypass RLS. **These should never be used in the browser or exposed to customers.**

## RLS performance recommendations

### Add indexes

Make sure you've added indexes on any columns used within the Policies:

```sql
create index userid
on test_table
using btree (user_id);
```

### Call functions with `select`

Use `select` statement to improve policies that use functions:

```sql
-- Better performance:
create policy "rls_test_select" on test_table
to authenticated
using ( (select auth.uid()) = user_id );
```

### Add filters to every query

Always add a filter to queries:

```js
const { data } = supabase
  .from('table')
  .select()
  .eq('user_id', userId)  // Always add this
```

### Specify roles in your policies

Always use the `TO` operator:

```sql
create policy "rls_test_select" on rls_test
to authenticated
using ( (select auth.uid()) = user_id );
```

## More resources

- [Testing your database](https://supabase.com/docs/guides/database/testing)
- [RLS Guide and Best Practices](https://github.com/orgs/supabase/discussions/14576)
