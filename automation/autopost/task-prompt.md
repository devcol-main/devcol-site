# Scheduled task prompt (copy everything below the line into the Claude app's scheduled task)

---

devcol.net autopost. Work only inside a folder named `devcol-autopost` in the current working folder (create it if missing). Call it W and use its absolute path in every command. Don't touch anything outside W.

1. Guard
   - Today = `TZ=Asia/Seoul date +%F`.
   - If `W/last-success` contains today's date, reply "already done today" and stop. Otherwise continue.

2. Sync (blobless clones keep it light)
   - `W/src/pseudo` and `W/src/tumbleteams`: if missing, `git clone --filter=blob:none --no-checkout https://github.com/devcol-main/<name> W/src/<name>`. Otherwise `git -C W/src/<name> fetch origin main`.
   - `W/devcol-site`: if missing, `git clone https://github.com/devcol-main/devcol-site W/devcol-site`. Otherwise `git -C W/devcol-site fetch origin main`, then `checkout main`, `reset --hard origin/main` and `clean -fd`.
   - In `W/devcol-site`, run `npm ci`.
   - If git, npm or GitHub access is missing, stop and reply with the exact error.
   - Note `BEFORE = git -C W/devcol-site rev-parse HEAD`.

3. Write
   - Read `W/devcol-site/automation/autopost/prompt.md` and follow it from start to end, with your working directory set to `W/devcol-site`.
   - `DEVCOL_SRC` = `W/src`. Today = the date from step 1.
   - Don't push during this step.

4. Finish
   - If HEAD is still BEFORE and the tree is clean: write today's date to `W/last-success` and reply "nothing new".
   - Otherwise the tree must be clean (everything committed). Then:
     - Run `npm run docs:build` in `W/devcol-site`. If it fails, don't push; reply with the error.
     - Run `git push origin main`. If the push is rejected because main moved: `git pull --rebase origin main`, build again, push again (once).
     - On success, write today's date to `W/last-success`.
     - Reply with the new posts (title + publishAt) and anything you were unsure about.
