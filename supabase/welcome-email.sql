-- Choo Choo Training: welcome email for every new grown-up (email sign-ups once they confirm, Google sign-ups at once).
-- Paste this whole file into Supabase > SQL Editor > New query > Run. Safe to run again: it only creates what is missing
-- and replaces the function, the triggers and the wording. Setup steps: docs/BACKEND.md, section "Welcome email".
--
-- Before running: store the Resend API key once in Supabase Vault (one-off snippet in docs/BACKEND.md; it is NOT in this
-- file), under the name 'resend_api_key'. If the key is missing the function quietly sends nothing.
--
-- To change the wording: edit the subject / html / text below (the HTML is also kept in docs/emails/welcome.html), run again.

create extension if not exists pg_net with schema extensions;

-- Who has already been welcomed. RLS on and no policies: nobody can read or write it from the app.
create table if not exists public.welcome_sent (
  user_id uuid primary key references auth.users on delete cascade,
  sent_at timestamptz default now()
);
alter table public.welcome_sent enable row level security;
revoke all on public.welcome_sent from anon, authenticated;

-- Sends the welcome email to one user (once). Never raises: any problem just skips, so sign-up can never break.
create or replace function public.send_welcome_email(uid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_email   text;
  v_key     text;
  v_subject text := 'Welcome aboard Choo Choo Training! 🚂';
  v_html    text := $html$
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Welcome aboard Choo Choo Training!</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;">
<tr><td style="padding:28px 24px 8px 24px;font-family:Arial,Helvetica,sans-serif;color:#24324a;">
<!-- Optional logo: host an image and uncomment.
<img src="https://choochootraining.com/logo.png" alt="Choo Choo Training" width="120" style="display:block;margin:0 0 16px 0;border:0;">
-->
<h1 style="margin:0 0 12px 0;font-size:26px;line-height:1.25;color:#24324a;">Welcome aboard! 🚂</h1>
<p style="margin:0 0 14px 0;font-size:17px;line-height:1.55;">Thank you for joining Choo Choo Training. We are so glad you and your child are here.</p>
<p style="margin:0 0 14px 0;font-size:17px;line-height:1.55;">Choo Choo Training is sounds-first reading practice that you do together. Your child learns the sounds of letters one step at a time, then blends them into real words and little stories. You sit alongside, and the app guides you both.</p>
<h2 style="margin:22px 0 8px 0;font-size:19px;line-height:1.3;color:#24324a;">Three quick tips</h2>
<ol style="margin:0 0 18px 0;padding-left:22px;font-size:17px;line-height:1.55;">
<li style="margin-bottom:10px;"><strong>Little and often.</strong> 10 to 15 minutes a day beats a long session once in a while.</li>
<li style="margin-bottom:10px;"><strong>Say the sound, not the letter name.</strong> The letter m says &ldquo;mmm&rdquo;, not &ldquo;em&rdquo;.</li>
<li style="margin-bottom:10px;"><strong>Sit together.</strong> You are the coach. Your child tries first, and you help only when they are stuck.</li>
</ol>
</td></tr>
<tr><td align="center" style="padding:6px 24px 22px 24px;font-family:Arial,Helvetica,sans-serif;">
<a href="https://app.choochootraining.com/" style="display:inline-block;background:#e8590c;color:#ffffff;text-decoration:none;font-size:19px;font-weight:bold;padding:15px 34px;border-radius:12px;">Start reading</a>
</td></tr>
<tr><td style="padding:0 24px 24px 24px;font-family:Arial,Helvetica,sans-serif;color:#24324a;">
<p style="margin:0;font-size:16px;line-height:1.55;">Questions? Just reply to this email and a real person will get back to you.</p>
</td></tr>
<tr><td style="padding:16px 24px 24px 24px;border-top:1px solid #e3e9f2;font-family:Arial,Helvetica,sans-serif;color:#6b778c;font-size:13px;line-height:1.5;text-align:center;">
<p style="margin:0 0 6px 0;">Choo Choo Training &middot; choochootraining.com</p>
<p style="margin:0;">You are receiving this email because you created a Choo Choo Training account.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
$html$;
  v_text    text := $txt$Welcome aboard! 🚂

Thank you for joining Choo Choo Training. We are so glad you and your child are here.

Choo Choo Training is sounds-first reading practice that you do together. Your child learns the sounds of letters one step at a time, then blends them into real words and little stories. You sit alongside, and the app guides you both.

Three quick tips

1. Little and often. 10 to 15 minutes a day beats a long session once in a while.
2. Say the sound, not the letter name. The letter m says "mmm", not "em".
3. Sit together. You are the coach. Your child tries first, and you help only when they are stuck.

Start reading: https://app.choochootraining.com/

Questions? Just reply to this email and a real person will get back to you.

--
Choo Choo Training · choochootraining.com
You are receiving this email because you created a Choo Choo Training account.
$txt$;
  v_rows    int;
begin
  select u.email into v_email from auth.users u where u.id = uid;
  if v_email is null or btrim(v_email) = '' then
    return;
  end if;

  select s.decrypted_secret into v_key from vault.decrypted_secrets s where s.name = 'resend_api_key' limit 1;
  if v_key is null or btrim(v_key) = '' then
    return;
  end if;

  -- Claim the user first; already welcomed means do nothing. If anything fails below, the handler at the end rolls this
  -- row back, so a later attempt can still send.
  insert into public.welcome_sent (user_id) values (uid) on conflict (user_id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return;
  end if;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'Choo Choo Training <hello@choochootraining.com>',
      'to', jsonb_build_array(v_email),
      'subject', v_subject,
      'html', v_html,
      'text', v_text
    )
  );
exception when others then
  -- Skip silently; never block sign-up.
  return;
end;
$fn$;

-- Trigger wrapper (also never raises).
create or replace function public.welcome_email_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  begin
    perform public.send_welcome_email(new.id);
  exception when others then
    null;
  end;
  return null;
end;
$fn$;

-- Only the database itself may run these: not the app, not signed-out visitors.
revoke all on function public.send_welcome_email(uuid) from public, anon, authenticated;
revoke all on function public.welcome_email_trigger() from public, anon, authenticated;

-- Google (and other social) sign-ups arrive already confirmed.
drop trigger if exists welcome_email_on_insert on auth.users;
create trigger welcome_email_on_insert
  after insert on auth.users
  for each row
  when (new.email_confirmed_at is not null)
  execute function public.welcome_email_trigger();

-- Email sign-ups: when the grown-up taps the confirmation link.
drop trigger if exists welcome_email_on_confirm on auth.users;
create trigger welcome_email_on_confirm
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.welcome_email_trigger();
