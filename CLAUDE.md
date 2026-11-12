# devcol — 프로젝트 컨텍스트 (Claude Code용)

이 파일은 devcol 프로젝트 루트(`devcol-build/` 등 저장소 root)에 `CLAUDE.md`로 저장하면
Claude Code가 세션 시작 시 자동으로 읽습니다.

## 정체성

- **브랜드명**: devcol ("development collaboration" — 플레이어와 제작자가 함께 개발한다는 의미)
- **개발 분야**: 게임 개발
- **제작 방식**: 웹사이트 및 콘텐츠 작업은 Claude(Cowork / Claude Code)로 진행

## 현재 보유 채널

| 채널 | 상태 |
|---|---|
| 유튜브 (devcol) | 개설 완료, 영상 몇 개 업로드. 구독자 거의 0 |
| Tistory (한국어) | 운영 중, 방문자 거의 0 → 보조 채널 |
| Google Blogger (영어) | 운영 중, 방문자 거의 0 |
| devcol.net | 도메인 구매 완료 (Cloudflare Registrar). **정적 사이트 스캐폴딩 및 배포 완료** |
| Discord | 개설 완료 (discord.gg/BK4bvy8qS). 채널 구성/활동은 진행 필요 |
| X(트위터) (@DevCol_Main) | 계정 개설 완료, 활동 거의 없음 |
| 레딧 | 미개설 또는 미활동 |

## 목표 (우선순위 순)

0. **[2026-08-22 갱신] 구글 애드센스 승인 받기 — 현재 최우선 과제.** 사이트를 wiki·블로그·포트폴리오 용도로 우선 만들되, 다른 확장(커뮤니티 기능 등) 전에 애드센스 승인부터 통과시키는 것이 목표. 승인에 필요한 필수 정책 페이지(Privacy Policy/About/Contact)와 플레이스홀더 제거, 실질 콘텐츠 확보가 선행 작업.
1. 개발 과정을 꾸준히 기록하고 공개
2. 실제 플레이어/개발자로부터 게임 개선에 쓸 피드백 수집
3. 게임 출시 대비 마케팅 — 인지도와 위시리스트 확보

**[2026-08-22 이전 기록, 참고용]** 과거엔 "수익화(구글 애드센스)는 후순위"였으나 위 0번 항목으로 대체됨.

## 판단 기준

현 단계에서 가장 중요한 것은 "웹사이트를 얼마나 잘 만드는가"가 아니라
**"이미 사람들이 모여 있는 곳에 어떻게 노출되는가"**다.
사이트는 완성도 높은 제품이 아니라 외부 채널 유입을 받아주는 가벼운 허브로 유지한다.

트래픽 0인 초기 단계. 오버엔지니어링 경계, 나중에 확장 가능한 최소 구성 우선.
비용이 드는 제안을 할 때는 무료 대안을 먼저 검토.

---

## 확정된 전략 (재논의 불필요)

이미 결론이 난 사항들. 전략을 바꿔야 할 명확한 근거가 새로 생겼을 때만 이의 제기.

### 언어: 영어 중심
모든 주력 콘텐츠(웹사이트, 유튜브 타이틀·설명·자막, 소셜)는 **영어**.
근거: 피드백/마케팅 채널이 영어권 중심(r/gamedev, r/unrealengine, r/IndieDev, X, Discord),
Steam 등 글로벌 출시 가능성, 트래픽 0 상태에서 한/영 병행 시 SEO 희석 + 제작 속도 반감.
한국어(Tistory)는 보조 채널, 여유 있을 때 요약 번역만.

### 애드센스: [2026-08-22 갱신] 최우선 순위로 전환
과거엔 "트래픽 쌓인 후 후순위 재신청"이었으나, 사용자 지시로 **지금 바로 승인 신청을 목표로 진행**.
근거: 사이트를 wiki/블로그/포트폴리오 용도로 우선 구축 중인데, 다른 확장 작업 전에 애드센스 승인부터 받고 싶어함.
필수 선행 작업(2026-08-22 기준 미완료):
- Privacy Policy / About / Contact 페이지 신설
- 블로그·위키의 플레이스홀더 콘텐츠를 실제 콘텐츠로 교체 (당시 devlog 글 1개뿐, wiki lore/systems는 빈 스텁)
- 실질 콘텐츠 볼륨 확보 (권장 8~15개 이상의 글)
- Google Search Console 등록 + sitemap 제출
장기 수익 방향(유튜브 광고·멤버십, 애셋 판매, 강의/템플릿 판매, 스폰서십)은 애드센스 승인 이후에도 병행 고려.

### 커뮤니티: Discord 우선, 자체 게시판은 나중
채팅·패치 투표는 Discord로. 자체 게시판/투표 기능은 사이트에 넣지 않음.
트래픽 쌓이면 그때 Discourse 등 자체 커뮤니티 이전 검토.

### 위키: 문서형(본인 편집), 유저 편집형 아님
게임 설정·로어·시스템 문서·FAQ를 본인이 Markdown으로 작성. MediaWiki 등 유저 편집형은 오버스펙.

### 사이트 생성기: VitePress (Docusaurus 아님)
버전 관리(versioned docs)나 i18n 라우팅이 필요해지기 전까지는 VitePress 유지.
근거: 더 가볍고 빌드 빠름, 메이저 버전 업그레이드 시 breaking change 리스크가 Docusaurus보다 적음,
지금 규모(devlog + 문서형 위키)엔 Docusaurus의 버전관리/i18n이 오버엔지니어링.
분기점: 패치별 문서 버전 분리가 실질적으로 필요해지는 시점.

### 리포 공개 유지 + All rights reserved, AI 학습 크롤러만 차단 [2026-11-12]
- **리포는 public 유지.** 브라우저 게임은 어차피 빌드된 JS가 devcol.net에서 그대로 내려가므로 private 전환은 보호 효과가 거의 없음. 유료(GitHub Pro $4/월)나 호스팅 이전(Cloudflare Pages)도 하지 않음. 원본 게임 소스 리포는 private 권장.
- **`LICENSE`는 All rights reserved.** 게임·글·테마의 복제·재배포·재호스팅과 AI 학습 데이터 사용을 금지하고, 폰트(각 게임 `licenses/`)와 npm 패키지는 각자의 라이선스를 따른다. 푸터·README·FAQ에도 같은 문구가 있다.
- **`docs/public/robots.txt`는 학습 전용 크롤러만 Disallow**(GPTBot, ClaudeBot, anthropic-ai, CCBot, Google-Extended, Applebot-Extended, meta-externalagent, Bytespider, Amazonbot, cohere-training-data-crawler).
  검색엔진(Googlebot·Bingbot), 애드센스(Mediapartners-Google), 출처 링크를 다는 AI 검색 봇(OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot, Claude-User)은 **절대 막지 않는다**. 막으면 유입이 줄고 애드센스 심사에 지장이 생긴다.
- **Cloudflare "Block AI bots" 토글은 쓰지 않는다.** 검색용 봇까지 막을 수 있어 robots.txt로 직접 고른다.
- 한계: robots.txt는 규칙을 지키는 크롤러에만 통한다. 도용되면 LICENSE를 근거로 DMCA 신고한다.

---

## 기술 스택 & 인프라

| 항목 | 선택 | 상태 |
|---|---|---|
| 사이트 생성기 | VitePress | ✅ 확정, 스캐폴딩 완료 |
| 호스팅 | GitHub Pages (GitHub Actions 배포) | ✅ 완료 |
| 도메인 | devcol.net | ✅ 구매 완료 |
| 등록기관 | Cloudflare Registrar | ✅ 완료 |
| DNS | Cloudflare | ✅ A레코드 4개 + www CNAME 설정 완료 |
| SSL | GitHub Pages 자동 발급 (Let's Encrypt) | ✅ 완료 |
| **총 비용** | **연 약 $12~13 (도메인 등록비만)** | 호스팅·DNS·SSL 전부 무료 |

**선택 근거 (재논의 불필요)**
- 워드프레스 아닌 정적 사이트: 코드 수정 워크플로우에 유리, 호스팅 무료, 운영 부담(플러그인/보안패치/스팸) 없음
- github.io 서브도메인 아닌 자체 도메인: 나중 이전 시 손실(애드센스 재신청, 외부 링크 박제, SEO 재축적) 회피
- Cloudflare Registrar: 원가 판매, WHOIS 프라이버시 무료, 네임서버 이전 불필요

## 저장소 구조

```
devcol-site/  (GitHub repo — https://github.com/devcol-main/devcol-site)
├── docs/
│   ├── .vitepress/config.mts    # 네비/사이드바/로컬검색 설정
│   ├── .vitepress/theme/        # 커스텀 테마: custom.css(토큰·전역), home/(홈 페이지 컴포넌트+home.css),
│   │                            #   SiteFooter.vue, site.ts(now building·히어로 문구), *.data.ts(블로그/스터디 목록)
│   ├── public/CNAME              # devcol.net
│   ├── index.md                  # 랜딩 페이지 (<HomePage />)
│   ├── projects/ · study/        # 프로젝트 소개, 스터디 노트
│   ├── blog/                     # 개발일지 (index.md의 `## 프로젝트명` 아래 목록이 홈 화면·사이드바 데이터 원본)
│   │   ├── index.md              #   사이드바 그룹은 각 글의 `category:`("Debugging / Networking"처럼 한 단계 중첩), 라벨은 `sidebar:`
│   │   └── YYYY-MM-DD-*.md
│   ├── arcade/                   # 웹에서 바로 플레이하는 게임 (index + 게임별 플레이 페이지, theme/arcade.ts가 목록)
│   └── wiki/                     # 문서형 위키 (게임별 분리)
│       ├── index.md              #   위키 허브
│       └── pseudo/               #   PSEUDO Wiki: index.md, systems/, lore/
│                                 #   (옛 /wiki/systems·/wiki/lore 주소는 public/wiki/의 리다이렉트 HTML)
├── .github/workflows/deploy.yml  # main push 시 자동 빌드·배포
├── package.json                  # docs:dev / docs:build / docs:preview
└── README.md
```

로컬 개발: `npm install` → `npm run docs:dev` (localhost:5173)

### 애널리틱스 (devcol-main/devcol-analytics)

- 사이트 전체에 `docs/public/t.js`(쿠키 없는 자체 애널리틱스)가 로드된다. 이 파일은 devcol-analytics 리포의 `client/t.js`를 압축한 결과물이므로 **여기서 직접 고치지 말고** 그쪽에서 `npm run build:client`로 다시 만든다.
- **새 게임을 `docs/public/games/`에 추가할 때는 `docs/GAME-ANALYTICS.md` 체크리스트를 따른다.** (스크립트 태그 1줄 + `stage_clear`/`game_over` 호출 2곳. 서버와 대시보드는 고치지 않는다.)
- 게임 온라인 리더보드(`a.devcol.net/lb`, 서버는 같은 devcol-analytics)에 새 게임을 붙일 때는 `docs/GAME-LEADERBOARD.md`를 따른다. 리더보드에서 보내거나 저장하는 항목이 바뀌면 `privacy-policy.md`의 Online Leaderboard 절도 같이 고친다.
- 공개 통계 페이지는 `docs/stats.md` + `theme/SiteStats.vue`. 수집 항목이 바뀌면 `privacy-policy.md`의 Site Analytics 절도 같이 고친다.
- **자동 포스팅**: `automation/autopost/`(claude.ai 클라우드 예약 작업 "devcol autopost", 매일 08:45 KST, 맥 꺼져 있어도 실행. 2026-11-04 전환, 맥 앱 방식은 폐기). PSEUDO DBG 노트·이슈 기록(`Documents/Issues`)·TumbleTeams devlog를 글로 써서 `publishAt` 큐에 넣는다. 이슈 글(기능·시스템 단위만, 잡무·내부 정보 제외)은 프로젝트당 하루 3개, 디버깅 글과 다른 프로젝트 글은 개수 제한 없이 다음 날 공개. 글의 `date`는 실제 공개일(`publishAt`과 같은 날), 작업일은 `workedOn`. **[2026-11-12 갱신]** 애드센스 "Low value content" 반려 이후: 관련 디버깅 노트는 한 글로 병합, 외부 UE5 개발자가 쓸 수 있는 글만 발행(아니면 skip), 섹션 틀 고정 금지, 매 실행마다 위키 정정·내부 링크·허브 정리·옛 글 개정 중 하나(유지보수) 수행. 처리 기록은 `ledger.md`, 작성 규칙은 `prompt.md`.
- **문체 교정 스킬**: `.claude/skills/`에 humanizer(영어, blader/humanizer)와 humanize-korean(한글, epoko77-ai/im-not-ai)을 프로젝트 단위로 설치. 자동 포스팅은 글 본문 언어로 둘 중 하나를 골라 한 번 다듬는다(`prompt.md` 2a). 원본 업데이트는 `.github/workflows/update-skills.yml`이 매주 확인해 PR로 올린다(직접 고치지 말고 `scripts/update-skills.sh`로 재설치, 버전은 `.claude/skills/UPSTREAM.lock`).

---

## 진행 상태 (04-로드맵.md)

- [x] 도메인 구매 — devcol.net (Cloudflare Registrar)
- [x] 정적 사이트 제작 — VitePress + GitHub Pages + devcol.net 연결 (devlog + wiki, 커뮤니티/투표 기능 미포함)
- [x] Discord 서버 개설 — discord.gg/BK4bvy8qS
- [x] X(트위터) 계정 개설 — @DevCol_Main
- [x] DevLog 자동 포스팅 — 클라우드 예약 작업, 매일 08:45 KST (2026-11-04)
- [x] 자동 포스팅 문체 교정 — 영어 humanizer / 한글 im-not-ai 자동 선택, 스킬 업데이트는 매주 PR로 (2026-11-12)
- [x] 사이트 구조 개편 — 상단 탭 드롭다운, PSEUDO Wiki 분리(`/wiki/pseudo/`, 옛 주소 리다이렉트), DevLog 카테고리 사이드바(`category:` 자동 생성)·Debugging 태그 필터, Arcade 탭(`/arcade/`) 신설 (2026-11-12)
- [x] DevLog 날짜·제목·링크 정리 — `date`를 실제 공개일로, 작업일은 `workedOn`(바이라인에 둘 다 표시). 26개 글 제목에 UE5·API 용어 추가, 30개 글에 Unreal Engine 공식 문서 링크 52개. About/FAQ의 AI 표기를 사이트 전체 고지로 변경 (2026-11-12)
- [x] 자동 포스팅 확장 — PSEUDO 이슈 기록(`Documents/Issues`)을 빌드 로그 글로 추가(프로젝트당 하루 3개), 고정 소제목 금지·노트에 맞춘 구조 (2026-11-12)
- [ ] **애드센스 승인 준비** — Privacy Policy/About/Contact 페이지, 플레이스홀더 제거, 콘텐츠 볼륨 확보, Search Console 등록 ← **다음 작업 (2026-08-22 최우선으로 전환)**
  - 2026-11-12 **"Low value content"로 다시 반려.** 필수 페이지·분량(107페이지)은 충족. 반려 문구가 "user interest"와 "consistent presence on the web"을 요구하는데 유입이 거의 0이고 DevLog 51개 중 50개가 10~11월에 몰려 공개됨. 구글은 트래픽 기준을 공개하지 않으므로 원인은 추정.
  - 남은 일: Search Console에서 색인 수와 "크롤링됨 - 색인 안 됨" 확인, 외부 채널(Reddit·X·유튜브)로 실제 유입 확보, 글에 실제 스크린샷·영상 추가. 재신청 시점은 미정.
- [ ] Discord 채널 구성 — 개발일지, 피드백, 투표 채널 세팅 및 활동 시작
- [ ] X(트위터) 활동 시작, 레딧 개설/활동 — r/IndieDev, r/unrealengine 등
- [ ] 유튜브 영어화 — 영어 타이틀·설명·자막. 영상 설명에 devcol.net / Discord / X 링크 항상 포함
- [ ] 애드센스 승인 이후 — 자체 게시판/투표 기능 확장 검토 (트래픽 축적 시)

## 단계 전환 기준

자체 게시판/투표 기능 추가와 애드센스 재신청은
**사이트 방문자 또는 유튜브 구독자가 의미 있는 수준(예: 일 방문자 수백 단위)에 도달했을 때** 검토.
그 전까지는 콘텐츠 축적과 외부 커뮤니티 노출에 리소스 집중.

---

## 답변 방식 (Claude Code에도 동일 적용)

- 결론 먼저, 근거는 뒤에. 서론/요약 반복 생략.
- 선택지 제시 시 비용·소요시간·트레이드오프 명시.
- 불확실한 정보(가격, 정책, 최신 기능)는 추측 대신 검색으로 확인하거나 모른다고 말할 것.
- 낙관적 전망이나 격려로 포장 금지. 수익·트래픽·소요시간은 현실적으로.
- 놓치고 있는 리스크나 잘못된 전제가 보이면 지적할 것.
- 사이트/유튜브/소셜에 실제 게시될 콘텐츠는 항상 영어로 작성.
- 결정이 나거나 단계가 완료되면 어느 지식 파일(01~04)을 갱신해야 하는지 알려줄 것.
