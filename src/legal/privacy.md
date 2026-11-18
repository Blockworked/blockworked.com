Blockworked ("we", "us") makes Blockwork, an open-source app for building
keyboard and mouse macros out of blocks, and runs the websites around it:

- **blockworked.com**, the main site;
- **community.blockworked.com**, the community block library;
- **support.blockworked.com** and the support@blockworked.com mailbox, the helpdesk;
- **translate.blockworked.com**, where people translate Blockwork and these sites.

This policy says what each of them collects, why, who else handles it, how
long it is kept and what you can ask us to do with it. The short version: the
app and the browser extension keep everything on your device. The websites
only collect what you give them when you sign in, post, translate or ask for
help, plus what is needed to keep them running and free of spam. We don't
sell personal information, show ads, or use analytics or tracking cookies.

## The Blockwork app

Blockwork runs on your device. It has no telemetry, analytics or advertising,
and it does not send your macros, recordings, keystrokes, mouse activity or
usage anywhere.

- **Input.** Blockwork listens to keyboard and mouse input system-wide so it
  can trigger macros with hotkeys and record new ones. Input becomes part of a
  macro only while you are recording. Macros, variables and settings are files
  on your device; delete the app's configuration folder to remove them.
- **Update check.** The GitHub download asks GitHub's public releases API
  whether a newer version exists. The Microsoft Store version doesn't; the
  Store delivers its updates.
- **Block library.** My Blocks > Browse library downloads the pack list, and
  any pack you add, from community.blockworked.com and from any other library
  address you add in Settings.
- **Community sign-in.** If you sign in to the community library from the app
  (to publish packs, comment, or report a pack or comment), the app keeps a
  sign-in token in your system keyring, or in a file in the app's
  configuration folder where there is no keyring. Signing out removes it.
  What you send that way is handled as described under the community library
  below.
- **Blocks you use.** Blocks that reach the network, such as HTTP requests,
  contact only the addresses you put in them, when your macro runs.
- **Local connections.** The webhook server (off unless you turn it on in
  Settings) and the browser extension's connection listen only on your own
  computer (127.0.0.1). Other devices can't reach them.

## The browser extension

The Blockwork browser extension (Chrome, Edge and Firefox) lets your macros
click, type and read on web pages. It talks only to the Blockwork app on your
own computer, over a loopback connection paired with a key you copy from
Blockwork's Settings. It reads or changes a page only when one of your macros
asks it to, or when you use its element picker, and it sends what it reads (an
element's text, the page's address and title, a script's result) only to that
local app. The pairing key and port are kept in the browser's extension
storage. The extension has no servers, accounts, analytics or advertising, and
it does not collect, sell or share your browsing data.

## The websites

### Visiting

Our sites are served through GitHub Pages (blockworked.com) and Cloudflare
(everything else, and blockworked.com's domain). Like any web host, they see
your IP address, browser and the pages you request, and may keep that in
short-lived logs for security and operations. We don't run analytics on top
of that. The Download page asks GitHub's API for the latest release straight
from your browser, so GitHub sees that request too.

### Accounts

You need an account to submit packs, comment, report, file tickets on the
site, request a language or translate. Browsing and downloading packs, and
emailing support, need none. You can sign in with:

- **an email address and password.** We keep the address and a salted scrypt
  hash of the password, never the password itself. New passwords are checked
  against the Have I Been Pwned breach list; only the first five characters of
  the password's SHA-1 hash leave our servers.
- **GitHub or Google.** We keep the provider's account id, and the display
  name and profile picture address it gives us. We don't keep the provider's
  access tokens or ask for access to anything else.
- **passkeys and authenticator apps,** as extra protection. We keep a
  passkey's public key (its private key never leaves your device) and the
  authenticator app's secret, encrypted. Backup codes are stored only as
  hashes.

Your profile (display name, optional username and picture) is public on your
author page and next to what you post. We also keep a record of security
events on your account (sign-ins added or removed, password and email
changes, and support staff recovery actions) so we can protect it, and we
email you about them.

### Packs and comments

Packs you upload are reviewed before they are listed. Once listed, a pack,
its files and your public profile are visible to everyone and can be
downloaded by anyone. Comments are public under the pack. Reports you make
are seen only by moderators.

### Support

When you file a ticket or email support@blockworked.com, we keep your
messages, any images you attach, your name and the email address we reply
to. Signed-in tickets use your account's verified address. Staff read and
answer tickets, and new tickets and replies notify staff by email and
possibly by a push notification. Mail to and from the @blockworked.com
mailboxes is handled by Cloudflare Email Routing and our own mail server,
and replies are sent through SMTP2GO.

### Translations

translate.blockworked.com uses your Blockworked account. When you save a
translation, suggestion, vote or comment, it goes to our Weblate server
under a contributor account made for you, named after your account's
internal id and showing your public display name. Weblate never gets your
real email address. Saved translations are contributed under the project's
licence (see the Terms), become part of the public translation history, and
are committed to our public GitHub repositories with your display name as the
author. Language requests and the people supporting them are kept so
administrators can act on them.

### Emails we send

Account emails (verification, password reset, security notices) and support
replies are sent through SMTP2GO. We don't send
newsletters or marketing.

### Keeping the sites free of spam

To stop spam and abuse we:

- show a Cloudflare Turnstile challenge on sign-up, password reset, new
  tickets, uploads from the website, and comments from new accounts.
  Turnstile looks at signals from your browser and device to tell people from
  bots; Cloudflare handles those under its own privacy policy, and they are
  not used for advertising;
- store a keyed hash of the IP address you post from (never the address
  itself) with comments, uploads, tickets and language requests, and on your
  account. We drop these hashes after 90 days, except where a network has
  been blocked for abuse, which stays until we lift the block. Rate limits on
  sign-in and email sending may count your IP address itself for up to an
  hour;
- limit how much new accounts and single networks can post, and may hold
  some posts for review;
- let moderators remove posts, roll back an account's recent activity, ban an
  account, or limit it so only it can see its posts. Moderation actions are
  logged so they can be reviewed and undone;
- check support email against the sender's SPF, DKIM and DMARC results, and
  block senders that send spam.

### Cookies

We use only cookies needed to run the sites, not tracking or advertising
cookies:

| Cookie | What it does | How long |
| --- | --- | --- |
| `session`, `sd` | Keeps you signed in across the Blockworked sites | 30 days |
| `__Host-…` | Protects one sign-in, passkey, authenticator setup or settings step | Minutes, at most an hour |
| `bw-theme` | Remembers light or dark theme | 1 year |
| `bw-lang` | Remembers the language you picked | 1 year |
| `bw-xsite` | Fades between our sites when you follow a link | 10 seconds |

The theme is also kept in your browser's local storage. Cloudflare may set
its own strictly necessary security cookies; Turnstile doesn't use cookies
for tracking.

## Who else handles data

We use these services to run Blockwork's sites. Each gets only what it needs:

- **Cloudflare** hosts the community, support and translation sites, their
  database and file storage, routes email, runs Turnstile, and connects our
  own servers to the internet. It also stores our encrypted backups.
- **GitHub** hosts blockworked.com, the source code, releases and the
  translation repositories, and provides GitHub sign-in.
- **Google** provides Google sign-in.
- **SMTP2GO** sends our emails.
- **Have I Been Pwned** answers the password breach check described above.
- **Our own server** runs the Blockworked mailboxes and Weblate.

Some of them are in the United States, so your information may be processed
there and in other countries where they operate.

We share information otherwise only if the law requires it, to protect people
or our services from harm, or as part of handing the project to someone else,
who would be bound by this policy.

## How long we keep it

- Accounts and what you post stay until you delete them or we remove them.
- Sign-in sessions last 30 days; expired sessions, links and codes are
  deleted automatically.
- Support tickets are kept so we can help you again later, until you ask us
  to delete them or delete your account.
- IP hashes are dropped after 90 days, as described above.
- Encrypted backups are kept for up to a year, then deleted.

## Your choices and rights

- **See and change** your profile, email, password and sign-in methods under
  Account settings.
- **Deactivate** your account to hide your profile, packs and comments until
  you sign in again.
- **Delete** your account under Account settings > Security. Deletion
  removes your sign-in methods, profile, email address and comment text,
  unlists your packs, and redacts your support tickets and their images. We
  keep a minimal record that the account existed so its old packs can't be
  claimed by someone else, and a short security and moderation history. Pack
  files people already downloaded, translations already merged into the
  public projects, and backups (until they expire) aren't recalled.
- **Ask us** for a copy of your information, a correction, or deletion of
  something the settings don't cover, such as a ticket you sent by email, by
  writing to support@blockworked.com. Depending on where you live (for
  example the EU, UK or California) you may have more rights over your
  information, including to object to how we use it, and to complain to your
  local data protection authority. We'll answer within a month.

We use your information to run the services you asked for (your account,
posts, translations and support), to keep them secure and free of abuse
(which is in our and our users' legitimate interests), and where the law
requires it.

## Children

Blockwork's websites aren't meant for children under 13, and you must be 13
or older (or older, if your country requires it) to create an account. If you
believe a child has given us personal information, contact us and we will
delete it.

## Changes

When this policy changes we'll update the date at the top of this page, and
for significant changes we'll say so on the sites. Earlier versions are in the
history of the blockworked.com repository on GitHub.

## Contact

Questions or requests: support@blockworked.com, or
https://support.blockworked.com.
