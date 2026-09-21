# Project 77: Let Go, Let God — Registration Site

Registration form for the BatStateU Christian Campus Ministry event (September 28, 2026, Multipurpose Hall).

**Two links:**

- `https://<your-domain>/` — main link: Start page → Registration form → Confirmation + downloadable certificate (PNG or PDF).
- `https://<your-domain>/online` — second link: exactly the same pages and form, but **no certificate** at the end.

- Font: Times New Roman everywhere (falls back to Times / Liberation Serif on devices without it)
- No dependencies: plain Node.js 18+, nothing to `npm install`
- **Admin login at `/admin`**: edit the event details (date, time, venue, title, verse...), open/close each form, see all registrations, reports per link, download CSV. No code changes needed.

## Run it on your computer

```bash
node server.js
# open http://localhost:3000
```

To try the admin page locally: `ADMIN_PASSWORD=yourpassword node server.js` then open http://localhost:3000/admin

## Folder guide

```
server.js            backend (form API, admin page, static files)
package.json         tells Railway how to start the app
railway.json         Railway settings (health check etc.)
public/
  index.html         face-to-face page, 3 screens: start, form, done (filled in by the server from the admin settings)
  online.html        online participation page (start, form, thank-you, no certificate)
  online.js          logic for the online page
  admin.html/.js/.css  the admin login + dashboard
  style.css          design (colors taken from the poster)
  app.js             form logic, validation, downloads
  cert.js            draws the certificate + builds the PDF
  assets/bg.jpg      poster (page background)
  assets/info.jpg    small banner on the start page
  assets/cert-bg.jpg softened poster used behind the certificate
```

## 1) Upload to GitHub

**Easiest (no commands):**
1. Go to github.com → **New repository** → name it `project77-registration` → **Create repository**.
2. Click **uploading an existing file**, drag in everything from the unzipped folder (the *contents*, so `server.js` is at the top level), then **Commit changes**.

**With git:**
```bash
cd project77-registration
git init
git add .
git commit -m "Project 77 registration site"
git branch -M main
git remote add origin https://github.com/<your-username>/project77-registration.git
git push -u origin main
```

## 2) Deploy to Railway

1. Go to railway.com → **New Project** → **Deploy from GitHub repo** → pick `project77-registration`.
2. Open the service → **Variables** and add:
   - `ADMIN_PASSWORD` = a strong password (this is your admin login at `/admin`)
   - `DATA_DIR` = `/data`
3. **Important – keep the registrations safe:** add a **Volume** to the service and set its mount path to `/data`.
   Without a volume, Railway wipes the files on every redeploy and the registrations would be lost.
4. Open **Settings → Networking → Generate Domain**. That link is your registration site.
5. Visit `https://<your-domain>/admin` and sign in with your `ADMIN_PASSWORD`.

Railway sets `PORT` for you; you don't need to add it.

## Using the admin page

Open `https://<your-domain>/admin` and sign in.

- **Your links** (top of the page): the main link (with certificate) and the second link (no certificate). Copy each one and share it with the right group. They never change.
- **Event details** tab: project name, title, date, start/end time, venue, Bible verse + reference, tagline, contact email. Press **Save changes** and the public page and the certificates use the new details straight away. You never touch the code.
- **Show the info banner**: the banner image has "Matthew 18:22" and the core message built in. If you reuse the site for a different event, turn it off (or replace `public/assets/info.jpg`).
- **Main link registration is open** / **Second link registration is open**: switch either off to stop new entries on that link. The page then shows its own "closed" message, and the link stays the same. They are independent.
- **Registrations** tab: everyone who registered, with a **Type** column (Face-to-face = main link, Online = second link). Filter by type, delete test entries, and **Download CSV** (has a Type column too).
- **Reports** tab: how many registered on each link, with percentages and a breakdown by year level.

Sessions last 7 days. To change the password, change the `ADMIN_PASSWORD` variable on Railway (everyone is signed out).

What is still in the code: the university/ministry names, the "Certificate of Participation" wording, the design, and the images. Those rarely change; ask a developer (or me) if you need them changed.

## Notes

- Certificates are drawn with the *current* event details, so if you change the date later, certificates downloaded afterwards show the new date.
- One email = one registration across both links. If the same person submits again on the main link, they get their original certificate back.
- Contact numbers accept `09XXXXXXXXX`, `+639XXXXXXXXX` or `639XXXXXXXXX`.
- In the CSV, contact numbers are written as `="09…"` so Excel keeps the leading zero.
