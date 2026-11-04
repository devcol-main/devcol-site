# devcol autopost (Mac + Claude 앱 예약 작업)

Claude 앱 예약 작업에 `task-prompt.md`를 붙여 넣어 하루 한 번 돌린다. 하는 일:

- PSEUDO의 `Documents/Debugging/DBG-*.md`와 TumbleTeams의 `Documents/Devlogs/`·새 커밋을 확인한다.
- 새 노트를 영어 DevLog 글로 써서 `publishAt` 큐(하루 최대 2개)에 넣고 main에 push한다.
- 사이트 공개는 기존 GitHub Actions 일일 빌드가 날짜에 맞춰 처리한다.

| 파일 | 역할 |
|---|---|
| `prompt.md` | 글 작성·스케줄·사이드바 연결 규칙. main에서 매번 새로 읽으므로 고치면 바로 반영된다 |
| `ledger.md` | 이미 처리한 소스 노트. 여기 없는 노트만 새 글 대상 |
| `task-prompt.md` | **Claude 앱 예약 작업에 붙여 넣을 지시문** (폴더 위치와 상관없이 동작) |
| `run.sh`, `setup.sh` | 터미널·launchd용 대안 (선택) |

## 설정 (복붙 한 번)

1. Claude 앱에서 예약 작업을 만든다.
   - 폴더: 평범한 폴더 아무거나(예: `~/Documents`). 그 안에 `devcol-autopost/`가 생기고 모든 작업은 그 안에서만 한다.
   - 일정: 09:00과 21:00 (Custom cron `0 9,21 * * *`, 또는 Daily 작업 두 개)
2. 지시문에 `task-prompt.md`의 구분선 아래 내용을 그대로 붙여 넣는다.
3. **Run now**를 한 번 눌러 끝까지 도는지 본다. 권한을 물으면 "always allow"를 고른다.

필요한 것: 그 환경에서 git·npm이 동작하고, GitHub `devcol-main` 저장소에 push할 수 있는 인증. 첫 실행에서 이게 없으면 작업이 그 오류를 그대로 보고하고 멈춘다.

## 시간이 어긋났을 때의 동작

| 상황 | 동작 |
|---|---|
| 09:00에 Mac이 켜져 있고 앱이 열려 있음 | 09:00에 실행. 21:00 실행은 `SKIP`으로 바로 끝남 |
| 09:00에 Mac이 잠자기 또는 꺼짐 | 앱이 열리거나 Mac이 깨어날 때 놓친 실행 1회를 바로 따라잡음(앱 기능, 알림 표시). 그것도 없으면 21:00에 재시도 |
| 하루 종일 Mac이 꺼져 있음 | 그날은 건너뜀. 다음에 켤 때 따라잡기 1회가 그동안 밀린 노트를 한꺼번에(최대 6개) 처리 |

- 하루에 실제로 일하는 건 한 번뿐이다. 첫 성공 뒤 같은 날 실행은 전부 `SKIP`이다(작업 폴더의 `devcol-autopost/last-success`).
- 예약 작업은 **Claude 앱이 실행 중일 때만** 돈다. macOS 설정 → 일반 → 로그인 항목에 Claude를 추가해 두면 부팅 직후 따라잡기가 동작한다.
- 결과는 예약 작업의 실행 기록(History)에서 본다.

## 안전장치

- `docs:build`가 실패하면 push하지 않는다. push는 빌드가 통과한 뒤 마지막 단계에서만 한다.
- 한 번에 최대 6개 글. 아직 Fixed가 아닌 DBG 노트는 다음 실행으로 넘긴다.
- AI·자동화 언급 금지, 내부 이슈 번호·로컬 경로·미공개 일정 제외(`prompt.md`).
- 위키가 낡은 걸 발견하면 위키를 고치지 않고 `ledger.md`의 "Wiki follow-ups"에 적는다.

## 앱 없이 돌리기 (선택)

`./setup.sh --launchd`를 실행하면 launchd가 매일 10:17에 `run.sh`를 돌린다. 이 방식은 `claude` CLI가 필요하다. 앱 예약 작업과 함께 써도 하루 한 번만 실행된다. 제거: `./setup.sh --remove-launchd`
