# Password-based Auth (Email)

> **Source:** https://supabase.com/docs/guides/auth/auth-email
> **取得日:** 2026-03-15

Allow users to sign in with a password connected to their email or phone number.

## With email

### Enabling email and password-based authentication

**Email authentication is enabled by default.**

You can configure whether users need to verify their email to sign in.
- On hosted Supabase projects: email confirmation is **true by default**
- On self-hosted projects or in local development: **false by default**

Change this setting on the **Auth Providers page** (`/dashboard/project/_/auth/providers`) for hosted projects.

### Signing up with an email and password

```js
async function signUpNewUser() {
  const { data, error } = await supabase.auth.signUp({
    email: 'valid.email@supabase.io',
    password: 'example-password',
    options: {
      emailRedirectTo: 'https://example.com/welcome',
    },
  })
}
```

The redirect URL must be configured as a **Redirect URL** in the dashboard (`/dashboard/project/_/auth/url-configuration`).

### Signing in with an email and password

```js
async function signInWithEmail() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'valid.email@supabase.io',
    password: 'example-password',
  })
}
```

### Resetting a password

#### Step 1: Request a password reset email

```js
await supabase.auth.resetPasswordForEmail('valid.email@supabase.io', {
  redirectTo: 'http://example.com/account/update-password',
})
```

#### Step 2: Update the password (on the change password page)

```js
await supabase.auth.updateUser({ password: 'new_password' })
```

### Email sending

The signup confirmation and password reset flows require an SMTP server to send emails.

The Supabase platform comes with a default email-sending service. **For production use, configure a custom SMTP server.**

#### Local development with Mailpit

Run `supabase status` in the terminal to get the Mailpit URL for testing email flows locally.

## With phone

### Enabling phone and password-based authentication

Enable phone authentication on the **Auth Providers page** (`/dashboard/project/_/auth/providers`) for hosted Supabase projects.

### Signing up with a phone number and password

```js
const { data, error } = await supabase.auth.signUp({
  phone: '+13334445555',
  password: 'some-password',
})
```

If phone verification is on, verify with the 6-digit OTP:

```js
const { data: { session }, error } = await supabase.auth.verifyOtp({
  phone: '+13334445555',
  token: '123456',
  type: 'sms',
})
```

### Signing in with a phone number and password

```js
const { data, error } = await supabase.auth.signInWithPassword({
  phone: '+13334445555',
  password: 'some-password',
})
```

## Dashboard navigation

| 操作 | ダッシュボードパス |
|-----|-----------------|
| 認証プロバイダー設定 | Authentication → Providers (`/dashboard/project/_/auth/providers`) |
| リダイレクトURL設定 | Authentication → URL Configuration (`/dashboard/project/_/auth/url-configuration`) |
