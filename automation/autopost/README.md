# devcol autopost (Mac + Claude 앱 예약 작업)

Claude 데스크톱 앱의 예약 작업(Code 탭 → Scheduled)으로 하루 한 번 돈다. 하는 일:

- PSEUDO의 `Documents/Debugging/DBG-*.md`와 TumbleTeams의 `Documents/Devlogs/`·새 커밋을 확인한다.
- 새 노트를 영어 DevLog 글로 써서 `publishAt` 큐(하루 최대 2개)에 넣고 main에 push한다.
- 사이트 공개는 기존 GitHub Actions 일일 빌드가 날짜에 맞춰 처리한다.

| 파일 | 역할 |
|---|---|
| `prompt.md` | 글 작성·스케줄·사이드바 연결 규칙. main에서 매번 새로 읽으므로 고치면 바로 반영된다 |
| `ledger.md` | 이미 처리한 소스 노트. 여기 없는 노트만 새 글 대상 |
| `run.sh` | `prepare`: 전용 clone 갱신(오늘 이미 성공했으면 SKIP). `finish`: 빌드 통과 시에만 push하고 오늘 완료로 기록 |
| `setup.sh` | Mac 최초 설정: `~/.devcol-autopost/` 생성, clone, 예약 작업용 권한 파일 |

## 1. Mac에서 한 번 실행

필요한 것: Node.js/npm, GitHub에 push 가능한 git 인증.

```bash
cd ~/path/to/devcol-site && git pull && ./automation/autopost/setup.sh
```

## 2. Claude 앱에서 예약 작업 만들기

Claude 데스크톱 앱 → Code 탭 → Scheduled → New task:

- **Folder**: `~/.devcol-autopost/devcol-site` (setup.sh가 만든 전용 clone. 평소 작업 폴더가 아님)
- **Schedule**: Custom → `0 9,21 * * *` (Mac 현지 시간 09:00, 21:00). 이 cron이 받아들여지지 않으면 Daily 09:00과 Daily 21:00으로 작업을 두 개 만들고, 아래 지시문을 똑같이 넣는다.
- **Instructions**: 아래 블록 전체를 붙여 넣는다.

```text
devcol autopost run.

1. Run `bash ~/.devcol-autopost/run.sh prepare`.
   - If the output starts with "SKIP", today's run already succeeded: reply "already done today" and stop.
   - If it fails, reply with the error and stop.
2. Follow automation/autopost/prompt.md in this folder from start to end.
   DEVCOL_SRC is ~/.devcol-autopost/src (use the expanded absolute path). "Today" is the date printed by step 1.
3. Run `bash ~/.devcol-autopost/run.sh finish` and reply with its last line plus the list of new posts.
```

만든 뒤 **Run now**를 한 번 눌러 끝까지 도는지 확인한다. 권한을 묻는 창이 뜨면 "always allow"를 고른다. 대부분은 setup.sh가 넣은 `.claude/settings.local.json`으로 이미 허용되어 있다.

## 시간이 어긋났을 때의 동작

| 상황 | 동작 |
|---|---|
| 09:00에 Mac이 켜져 있고 앱이 열려 있음 | 09:00에 실행. 21:00 실행은 `SKIP`으로 바로 끝남 |
| 09:00에 Mac이 잠자기 또는 꺼짐 | 앱이 열리거나 Mac이 깨어날 때 놓친 실행 1회를 바로 따라잡음(앱 기능, 알림 표시). 그것도 없으면 21:00에 재시도 |
| 하루 종일 Mac이 꺼져 있음 | 그날은 건너뜀. 다음에 켤 때 따라잡기 1회가 그동안 밀린 노트를 한꺼번에(최대 6개) 처리 |

- 하루에 실제로 일하는 건 한 번뿐이다. 첫 성공 뒤 같은 날 실행은 전부 `SKIP`이다(`~/.devcol-autopost/last-success`).
- 예약 작업은 **Claude 앱이 실행 중일 때만** 돈다. macOS 설정 → 일반 → 로그인 항목에 Claude를 추가해 두면 부팅 직후 따라잡기가 동작한다.
- 글이 큐에 들어가거나 실패하면 macOS 알림이 뜬다. 로그는 `~/Library/Logs/devcol-autopost/`에 남는다.

## 안전장치

- `docs:build`가 실패하면 push하지 않는다. 예약 세션은 `git push`가 금지되어 있고, push는 `run.sh finish`만 한다.
- 한 번에 최대 6개 글. 아직 Fixed가 아닌 DBG 노트는 다음 실행으로 넘긴다.
- AI·자동화 언급 금지, 내부 이슈 번호·로컬 경로·미공개 일정 제외(`prompt.md`).
- 위키가 낡은 걸 발견하면 위키를 고치지 않고 `ledger.md`의 "Wiki follow-ups"에 적는다.

## 앱 없이 돌리기 (선택)

`./setup.sh --launchd`를 실행하면 launchd가 매일 10:17에 `run.sh`를 돌린다. 이 방식은 `claude` CLI가 필요하다. 앱 예약 작업과 함께 써도 하루 한 번만 실행된다. 제거: `./setup.sh --remove-launchd`
