# devcol.net

Static site for devcol — devlog + wiki. Built with VitePress, deployed to GitHub Pages.

## Local dev

    npm install
    npm run docs:dev

## Build

    npm run docs:build

Output goes to `docs/.vitepress/dist`.

## Deploy

Push to `main` — GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages automatically.

## First-time repo setup (do once)

1. Push this repo to GitHub (repo name doesn't matter, e.g. `devcol-site`).
2. Repo Settings → Pages → Source: "GitHub Actions".
3. Repo Settings → Pages → Custom domain: enter `devcol.net`, save.
   (The `docs/public/CNAME` file already contains `devcol.net` so this survives redeploys.)
4. Cloudflare DNS dashboard for devcol.net → add:
   - 4x `A` records for `@` pointing to GitHub Pages IPs:
     185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
   - 1x `CNAME` record: `www` → `<your-github-username>.github.io`
   - Set these DNS records to "DNS only" (grey cloud), not proxied, or GitHub's SSL cert issuance can fail.
5. Wait for GitHub Pages to issue the SSL certificate (can take up to ~24h, usually much faster). "Enforce HTTPS" checkbox becomes available once ready — enable it.
