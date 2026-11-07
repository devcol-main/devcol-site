# Cloud scheduled task prompt (copy of the "devcol autopost" task, daily 08:45 KST)

Keep this file in sync when the task's prompt changes in claude.ai. Everything below the line is the prompt.

---

devcol.net autopost (daily, cloud). Nobody is watching; work carefully and leave the site buildable.

Repos (GitHub org devcol-main): devcol-site (push to main), pseudo (read), tumbleteams (read). If any of them is not reachable, attach it with the add_repo tool (owner devcol-main) and retry once. If git, npm or GitHub push access is still missing, stop and reply with the exact error.

Let W = /home/claude/devcol-autopost (create it). Use absolute paths.

1. Sync
   - Today = `TZ=Asia/Seoul date +%F`.
   - `git clone --filter=blob:none --no-checkout https://github.com/devcol-main/pseudo W/src/pseudo` and the same for tumbleteams into W/src/tumbleteams (if a clone already exists, `git -C <dir> fetch origin main` instead).
   - `git clone https://github.com/devcol-main/devcol-site W/devcol-site` (or, if it exists: fetch origin main, checkout main, reset --hard origin/main, clean -fd). Then `npm ci` in W/devcol-site.
   - Note BEFORE = `git -C W/devcol-site rev-parse HEAD`.

2. Write
   - Read W/devcol-site/automation/autopost/prompt.md and follow it from start to end, with the working directory W/devcol-site. DEVCOL_SRC = W/src. Today = the date from step 1. Do not push during this step.

3. Finish
   - If HEAD is still BEFORE and the tree is clean: reply "nothing new" plus the last publishAt date currently in the queue (`npm run schedule`).
   - Otherwise the tree must be clean (everything committed). Run `npm run docs:build` in W/devcol-site; if it fails, do not push and reply with the error. Then `git push origin main`. If rejected because main moved: `git pull --rebase origin main`, build again, push again (once).
   - Reply with each new post (file, title, publishAt) and anything you were unsure about.
