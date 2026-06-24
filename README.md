# Mesweda

A static, framework-free, GitHub Pages-ready site. Mesweda is the main shell — a single shared login gate and dashboard that links out to individual project landing pages (currently Wijhat and Post).

No backend, no build step, no dependencies. Everything is plain HTML/CSS/JS.

## Folder structure

```
/index.html               redirects to login.html
/login.html               access code gate
/dashboard.html           project list (shown after login)
/projects.js              data source for the dashboard pills
/assets/
  css/style.css           Mesweda's own design system (login + dashboard)
  js/auth.js              login logic
  js/dashboard.js         dashboard rendering + logout
  post/                   assets used only by pages/post.html
    css/
    js/
    images/
  wijhat/                 assets used only by pages/wijhat.html
    video/
/pages/
  post.html               Post landing page
  wijhat.html             Wijhat landing page
```

Each project's own assets live under `/assets/<project-name>/` so they never collide with Mesweda's own files or with another project's files.

## Login code system

Mesweda uses a simple client-side access code, not real authentication — anyone who reads `auth.js` can see the code. It's a soft gate, not security.

- The code is the constant `ACCESS_CODE` at the top of `assets/js/auth.js`. It is currently `MESWEDA2026`.
- On successful submit, `auth.js` sets two `localStorage` keys:
  - `mesweda_auth = "1"` — used by `dashboard.html`/`dashboard.js` to guard the dashboard itself.
  - `meswedaAccess = "granted"` — used by every page under `/pages/` to guard the individual landing pages.
- `dashboard.js`'s logout button clears both keys and sends the user back to `login.html`.

To change the access code, edit `ACCESS_CODE` in `assets/js/auth.js`. No other file needs to change.

## How to create a new landing page

1. Build the page as a normal standalone HTML file (inline or linked CSS/JS, your choice).
2. Put it at `/pages/<name>.html`.
3. Put any of its own images/video/fonts/CSS/JS under `/assets/<name>/` (create the folder).
4. Fix every asset path in the page to be relative to `/pages/`, e.g. `assets/img/foo.png` becomes `../assets/<name>/img/foo.png`. Anything that lives at the site root (like `../login.html`) also needs the `../` prefix since the page now sits one folder deeper.
5. Add the access guard near the top of `<head>`, before any stylesheet/script that isn't a CDN include:

   ```html
   <script>
     if (localStorage.getItem("meswedaAccess") !== "granted") {
       window.location.href = "../login.html";
     }
   </script>
   ```

   This redirects anyone who opens the page directly without having logged in through Mesweda first.

6. Add an entry for it in `projects.js` (see below) so it shows up on the dashboard.

## How projects.js works

`projects.js` exports a single array, `PROJECTS`, loaded by `dashboard.html` before `assets/js/dashboard.js`. `dashboard.js` reads this array and renders one clickable "pill" card per entry.

Each entry is an object:

```js
{
  title: "Wijhat",
  category: "Travel",
  status: "Live",
  description: "AI destination guide and travel membership landing page.",
  url: "pages/wijhat.html"
}
```

- `title` — card heading.
- `category` — small label shown above the title.
- `status` — shown as a colored badge. Recognized values are `Live`, `Draft`, `Archived` (case-insensitive); anything else falls back to a default style. See `statusClass()` in `dashboard.js`.
- `description` — one-line summary under the title.
- `url` — where the card links to. Use a path relative to the site root, e.g. `pages/<name>.html`.

The dashboard's search box filters on `title`, `category`, `status`, and `description` (case-insensitive substring match) — no extra wiring needed per project.

## How to add a new project

1. Finish the landing page as described above ("How to create a new landing page").
2. Open `projects.js` and add a new object to the `PROJECTS` array with `title`, `category`, `status`, `description`, and `url`.
3. Open `dashboard.html` (or just reload it locally) — the new pill appears automatically, no other code changes needed.

## GitHub Pages deployment

1. Push this repository (or this folder, if it's the repo root) to GitHub.
2. In the repo settings, open **Pages**, and set the source to the branch/folder containing these files (e.g. `main` / `/root`).
3. Wait for the Pages build to finish, then visit the published URL — it should load `index.html`, which redirects to `login.html`.
4. Optional: set a custom domain via the **Custom domain** field in Pages settings (this adds a `CNAME` file to the repo).

No server, database, or build step is required — every file here is served as-is.
