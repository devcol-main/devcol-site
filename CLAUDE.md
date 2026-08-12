# devcol — 프로젝트 컨텍스트 (Claude Code용)

이 파일은 devcol 프로젝트 루트(`devcol-build/` 등 저장소 root)에 `CLAUDE.md`로 저장하면
Claude Code가 세션 시작 시 자동으로 읽습니다.

## 정체성

- **브랜드명**: devcol ("development collaboration" — 플레이어와 제작자가 함께 개발한다는 의미)
- **개발 분야**: 언리얼 엔진 기반 인디 게임 개발
- **제작 방식**: 웹사이트 및 콘텐츠 작업은 Claude(Cowork / Claude Code)로 진행

## 현재 보유 채널

| 채널 | 상태 |
|---|---|
| 유튜브 (devcol) | 개설 완료, 영상 몇 개 업로드. 구독자 거의 0 |
| Tistory (한국어) | 운영 중, 방문자 거의 0 → 보조 채널 |
| Google Blogger (영어) | 운영 중, 방문자 거의 0 |
| devcol.net | 도메인 구매 완료 (Cloudflare Registrar). **정적 사이트 스캐폴딩 및 배포 완료** |
| Discord | 미개설 |
| X(트위터) / 레딧 | 미개설 또는 미활동 |

## 목표 (우선순위 순)

1. 개발 과정을 꾸준히 기록하고 공개
2. 실제 플레이어/개발자로부터 게임 개선에 쓸 피드백 수집
3. 게임 출시 대비 마케팅 — 인지도와 위시리스트 확보

수익화(구글 애드센스)는 후순위.

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

### 애드센스: 포기가 아니라 후순위
지금은 신경 쓰지 않음. 트래픽 축적 후 devcol.net 기준으로 재신청.
장기 수익 방향은 애드센스보다 유튜브 광고·멤버십, 애셋 판매, 강의/템플릿 판매, 스폰서십.

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
│   ├── public/CNAME              # devcol.net
│   ├── index.md                  # 랜딩 페이지 (hero)
│   ├── blog/                     # 개발일지
│   │   ├── index.md
│   │   └── 2026-08-11-hello-devcol.md
│   └── wiki/                     # 문서형 위키
│       ├── index.md
│       ├── faq.md
│       ├── lore/index.md
│       └── systems/index.md
├── .github/workflows/deploy.yml  # main push 시 자동 빌드·배포
├── package.json                  # docs:dev / docs:build / docs:preview
└── README.md
```

로컬 개발: `npm install` → `npm run docs:dev` (localhost:5173)

## 아직 채워야 할 placeholder

`docs/.vitepress/config.mts`의 `nav`/`socialLinks`에 `REPLACE_ME`로 남아있는 항목:
- Discord 초대 링크 (서버 개설 후)
- X(트위터) 프로필 링크

---

## 진행 상태 (04-로드맵.md)

- [x] 도메인 구매 — devcol.net (Cloudflare Registrar)
- [x] 정적 사이트 제작 — VitePress + GitHub Pages + devcol.net 연결 (devlog + wiki, 커뮤니티/투표 기능 미포함)
- [ ] **Discord 서버 개설** — 채널 구성: 개발일지, 피드백, 투표 ← **다음 작업**
- [ ] X(트위터), 레딧 활동 시작 — r/IndieDev, r/unrealengine 등
- [ ] 유튜브 영어화 — 영어 타이틀·설명·자막. 영상 설명에 devcol.net / Discord / X 링크 항상 포함
- [ ] 트래픽 축적 후 — 애드센스 재신청 (devcol.net 기준) + 자체 게시판/투표 기능 확장 검토

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
