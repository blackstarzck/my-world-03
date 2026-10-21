# 배포 프로젝트 iframe 삽입 확인과 체험 전시안

2026년 10월 19일 기준, 전시 목록의 배포 주소 59개와 레포 README에서 추가로 찾은 주소 1개를 확인했다. 전시관 운영 주소 https://my-world-03.vercel.app 을 부모 출처로 사용했다.

공개 배포 주소 60개에서는 iframe 정책 차단이 발견되지 않았다. 별도 실행한 Planit 로컬 서버는 X-Frame-Options: DENY를 반환하며 이 60개 집계에 포함하지 않는다. HTTP 200과 웹 문서 표시가 실제 앱 기능의 정상 동작을 의미하지는 않는다. 문서 페이지·로그인 화면·로컬 실행 방식을 체험 가능 화면과 구분한다.

같은 날 23시 5분 이후 재검사에서 On the Book의 도서 조회가 정상화됐다. API 200과 iframe 안의 도서 4권 표시·상세 이동을 확인해 아래 상태를 갱신했다. Planit은 사용자 확인에 따라 로컬 전용 앱의 캡처 전시로 정정했다.

## 확인 결과

| 항목 | 주소 수 |
|---|---:|
| 확인한 배포 주소 | 60 |
| HTTP 200 | 50 |
| HTTP 404 | 8 |
| HTTP 503 | 2 |
| 브라우저 iframe 안의 웹 문서 표시 확인 | 49 |
| HTTP 200이지만 빈 화면 | 1 |
| iframe 정책 차단 발견 | 0 |

| 표시된 내용의 상태 | 주소 수 | 전시 적용 |
|---|---:|---|
| 공개 첫 화면 | 39 | 포커스 후 체험 후보로 사용하고 기능별 확인 진행 |
| 로그인 화면 | 6 | 인증이 준비된 관람용 데모가 필요 |
| README 문서 | 3 | 앱 배포본으로 교체하거나 확인된 대체 주소 사용 |
| 공개 주소의 API 404 | 1 | Planit은 로컬 전용 앱으로 별도 실행·캡처 |
| 빈 앱 화면 | 1 | 배포 자산 경로를 수정한 뒤 재검사 |
| 중단된 배포 주소 | 10 | 작품·제작 기록은 유지하고 이미지·영상으로 전시 |

주소 수에는 동일 프로젝트의 호스팅 별칭과 해시 경로가 포함된다. 원래 전시 항목 95개와 작품군 41개는 유지한다.

## 실제 조작 확인

| 대상 | 확인한 조작 | 결과 |
|---|---|---|
| 북차카 | iframe 내부에서 마우스 휠 스크롤 | scrollY 0에서 550으로 이동 |
| 포켓몬 도감 | 검색 입력란에 Pikachu 입력 | 입력값 일치. 데이터 조회 결과는 별도 확인 대상 |
| NEON FIST | 시작 버튼 클릭과 키보드 입력 | 타이틀에서 전투 화면으로 전환하고 게임 캔버스 표시 |
| On the Book | 앨리스 상세 선택 → 이 장면부터 걷기 | API 200, 도서 4권, 상세 이동과 첫 3D 장면·캔버스 표시 확인 |

추가로 10개 주소에서 제안 sandbox 설정으로 표시를 확인했다. my-world-01과 my-world-03은 로딩 시간을 더 두어 iframe 내부 3D 렌더링까지 확인했다. 전체 기능이나 인증 후 저장 동작을 검사한 결과로 해석하지 않는다.

## 전시 전 준비가 필요한 프로젝트

### 문서와 앱 화면의 구분

- react-todos와 react-practice6의 GitHub Pages 주소는 현재 README 문서를 표시한다. 앱 체험에는 배포 설정을 점검하거나 실제 앱을 재배포해야 한다.
- react-modeal.net2의 blackstarzck 주소도 문서 페이지다. 다만 [레포 README](https://github.com/blackstarzck/react-modeal.net2/blob/master/README.md)와 [package homepage](https://github.com/blackstarzck/react-modeal.net2/blob/master/package.json)가 연결하는 [modeal-chan 배포본](https://modeal-chan.github.io/react-clone-coding/)은 sandbox iframe에서 앱 화면이 표시된다. 이 주소를 체험 후보로 연결하고 출처와 학습·클론 성격을 함께 표시한다.
- react-swiper는 iframe과 단독 페이지 모두 빈 화면이다. HTML이 참조하는 /movie_app_2020 아래 CSS와 JS가 404를 반환한다. iframe 차단이 아닌 배포 자산 경로 문제다.

### 서버와 인증 준비

- On the Book은 초기 /api/library 400 이후 같은 날 23시 5분 이후 API 200으로 정상화됐다. 도서 목록 4권 → 앨리스 상세 → 첫 장면 진입·WebGL 표시를 sandbox iframe 안에서 재확인했다. 사용자 서비스와 [확인한 3D 장면](https://on-the-book-client.vercel.app/?book=alice&chapter=alice-1)은 실제 체험 작품으로 사용하고 관리자는 관람용 인증 데모를 준비한다. 모든 책의 전체 장면과 이동 기능을 검증한 것은 아니다.
- Planit은 로컬 전용 앱이다. 공개 Vercel 주소의 /api/projects와 /api/ai/status 404는 관측 이력으로 보존하고 서비스 복구 과제로 삼지 않는다. 로컬 실행본에서 대시보드·PRD·기능명세·유저플로우·와이어프레임 5장을 캡처했다. [캡처 자료](portfolio-assets/planit/README.md)를 포커스 시 선택·확대하는 전시로 사용한다. 실행한 로컬 서버는 X-Frame-Options: DENY를 반환했다.
- business-card, 도토리 문의 관리자, lets-fps, On the Book 관리자, TOPIK 관리자, Zenith는 로그인 화면까지 확인했다. 실제 계정 인증이나 운영 데이터 변경은 검사하지 않았다. 공개 체험에는 관람용 데모 주소를 사용한다.
- GAME CABINET 본체가 열리는 것은 확인했다. 내부에 추가로 삽입되는 외부 게임은 각 게임의 삽입 정책과 입력 전달을 별도로 확인한다.

### 중단된 배포 이력

404는 admin, detail, hibookly-claude-code-design-v1, list, my-space의 Vercel 별칭, nuri, vive, react-modeal 주소에서 확인했다. 글로윈 비나와 비블리아는 503 준비 중 화면을 표시한다. 이 항목을 작품 목록에서 삭제하지 않는다. my-space는 정상 응답하는 GitHub Pages 주소를 사용한다.

## 작품 포커스 시 체험 방식

작품 이동이 끝나고 우측 설명이 열린 상태에서, 실행 가능한 작품은 액자 안쪽 화면을 실제 HTML iframe으로 전환한다. 전시 공간과 액자는 기존 WebGL로 유지하고, 작품 표면의 화면상 좌표에 DOM iframe을 맞춘다. 실험 단계의 HTML-in-Canvas API를 기본 의존성으로 사용하지 않는다.

1. 자유 관람과 카메라 이동 중에는 기존 작품 이미지·가벼운 조형을 표시한다.
2. 도착 후 체험 가능한 선택 작품 하나만 iframe으로 실행한다.
3. 클릭·터치·스크롤·텍스트·게임 입력을 해당 앱에 전달한다. 필요하면 좌측 작품 영역 안에서 크게 체험할 수 있게 한다.
4. 우측 설명과 닫기·작품 보기·원본 열기를 유지한다. 체험 화면에 포커스가 있어도 바깥의 닫기 버튼을 사용할 수 있어야 한다.
5. 작품 변경이나 닫기 시 iframe을 제거해 소리·타이머·게임·추가 WebGL 실행을 정리하고 정적 작품과 전시장 입력을 되돌린다.

로그인·API 오류·문서만 표시·빈 화면·중단 주소는 자동 체험 대상으로 두지 않는다. 적절한 관람용 데모가 준비될 때까지 작품 설명과 이미지·영상·코드를 보여준다. TOPIK 사용자 사례에는 v12 이전 버전 체험을 선택적으로 연결하되 현재 v13 운영 앱으로 오인시키지 않는다. SKILL·검증 하네스 등 개발 방식 자체가 작품인 항목은 근거 자료를 중심으로 소개한다.

현재 전시관 자체인 my-world-03은 제작 과정 또는 중첩이 제한된 체험 주소를 사용해 전시관이 계속 중첩되는 상황을 막는다.

## 입력과 브라우저 조건

- 프로젝트를 조작하는 동안 전시장의 WASD·방향키 탐색·드래그 시선 입력을 비활성화한다. 프로젝트와 전시장 단축키가 동시에 실행되지 않아야 한다.
- 다른 출처 iframe 안의 키 이벤트는 부모로 전달된다고 가정하지 않는다. Esc만으로 전시를 닫도록 의존하지 않고 부모 설명 패널의 닫기를 유지한다.
- 제안 기본 sandbox는 allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups이며, allow 속성은 fullscreen; gamepad다. 자동 상위 페이지 이동은 허용하지 않는다. 프로젝트별로 필요한 권한과 화면 확대·포인터 잠금은 구현 검수에서 다시 확인한다.
- 앱의 로그인은 제삼자 쿠키나 OAuth 정책의 영향을 받을 수 있다. 로그인 화면이 보이는 것을 인증 성공으로 판정하지 않는다.
- iframe load 이벤트만으로 앱 준비 완료나 오류를 판정하지 않는다. 직접 관리하는 데모에는 출처와 메시지 발신 창을 검증하는 postMessage 준비·종료 신호를 추가할 수 있다. 기존 앱에 신호가 없으면 원본 열기를 항상 제공하고 오탐으로 즉시 종료하지 않는다.
- 데스크톱은 기존 70 대 30 구성을 유지하고 모바일은 작품과 설명을 위아래로 배치한다. 화면을 이미지처럼 과도하게 축소하지 않고 실제 iframe 뷰포트와 선택적 확대를 사용한다.
- 선택한 앱 하나만 실행한다. 소리는 앱 시작 등 사용자 조작 후 재생하고, 닫거나 작품을 바꾸면 함께 종료한다.

## 주소별 확인 결과

| 주소 | HTTP | iframe 첫 문서 | 앱 상태 | 전시 처리 |
|---|---:|---|---|---|
| [admin-coral-phi.vercel.app](https://admin-coral-phi.vercel.app) | 404 | 오류 응답 | 주소 중단 | 이미지·영상·코드로 전시 유지 |
| [admin-story-quest.vercel.app](https://admin-story-quest.vercel.app) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [blackstarzck.github.io/bridge/](https://blackstarzck.github.io/bridge/) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [blackstarzck.github.io/business-card/](https://blackstarzck.github.io/business-card/) | 200 | 표시 확인 | 로그인 필요 | 관람용 인증 데모 준비 |
| [blackstarzck.github.io/chanki-portfolio/](https://blackstarzck.github.io/chanki-portfolio/) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [blackstarzck.github.io/controls-01/](https://blackstarzck.github.io/controls-01/) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [blackstarzck.github.io/custom_model/](https://blackstarzck.github.io/custom_model/) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [blackstarzck.github.io/doc-merge/](https://blackstarzck.github.io/doc-merge/) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [blackstarzck.github.io/first-person-perspective/](https://blackstarzck.github.io/first-person-perspective/) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [blackstarzck.github.io/ilbunidiary/](https://blackstarzck.github.io/ilbunidiary/) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [blackstarzck.github.io/isosmetric-01/](https://blackstarzck.github.io/isosmetric-01/) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [blackstarzck.github.io/isosmetric-02/](https://blackstarzck.github.io/isosmetric-02/) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [blackstarzck.github.io/millie-admin-dashboard/](https://blackstarzck.github.io/millie-admin-dashboard/) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [blackstarzck.github.io/multicanvas/](https://blackstarzck.github.io/multicanvas/) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [blackstarzck.github.io/my-space/](https://blackstarzck.github.io/my-space/) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [blackstarzck.github.io/particle-colorful-stars/](https://blackstarzck.github.io/particle-colorful-stars/) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [blackstarzck.github.io/particle/](https://blackstarzck.github.io/particle/) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [blackstarzck.github.io/react-modeal.net2/](https://blackstarzck.github.io/react-modeal.net2/) | 200 | 표시 확인 | 문서만 표시 | 앱 배포본 또는 대체 주소 사용 |
| [blackstarzck.github.io/react-modeal/](https://blackstarzck.github.io/react-modeal/) | 404 | 오류 응답 | 주소 중단 | 이미지·영상·코드로 전시 유지 |
| [blackstarzck.github.io/react-practice6/](https://blackstarzck.github.io/react-practice6/) | 200 | 표시 확인 | 문서만 표시 | 앱 배포본 또는 대체 주소 사용 |
| [blackstarzck.github.io/react-swiper/](https://blackstarzck.github.io/react-swiper/) | 200 | 문서 로드 후 빈 화면 | 빈 화면 | 배포 경로 수정 후 재확인 |
| [blackstarzck.github.io/react-todos/](https://blackstarzck.github.io/react-todos/) | 200 | 표시 확인 | 문서만 표시 | 앱 배포본 또는 대체 주소 사용 |
| [blackstarzck.github.io/scroll-page/](https://blackstarzck.github.io/scroll-page/) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [bookchaka.com](https://bookchaka.com) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [chanchan2.vercel.app](https://chanchan2.vercel.app) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [chanki-pokedx.netlify.app/](https://chanki-pokedx.netlify.app/) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [chanki-react.vercel.app](https://chanki-react.vercel.app) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [detail-ruby.vercel.app](https://detail-ruby.vercel.app) | 404 | 오류 응답 | 주소 중단 | 이미지·영상·코드로 전시 유지 |
| [dotore-admin.vercel.app](https://dotore-admin.vercel.app) | 200 | 표시 확인 | 로그인 필요 | 관람용 인증 데모 준비 |
| [frontend-eta-six-54.vercel.app](https://frontend-eta-six-54.vercel.app) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [game-cabinet.vercel.app](https://game-cabinet.vercel.app) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [glowinvina.com](https://glowinvina.com) | 503 | 오류 응답 | 주소 중단 | 이미지·영상·코드로 전시 유지 |
| [hibiblia.com](https://hibiblia.com) | 503 | 오류 응답 | 주소 중단 | 이미지·영상·코드로 전시 유지 |
| [hibookly-claude-code-design-v1.vercel.app](https://hibookly-claude-code-design-v1.vercel.app) | 404 | 오류 응답 | 주소 중단 | 이미지·영상·코드로 전시 유지 |
| [hibookly.com](https://hibookly.com) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [keduall.com](https://keduall.com) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [lets-fps.vercel.app](https://lets-fps.vercel.app) | 200 | 표시 확인 | 로그인 필요 | 관람용 인증 데모 준비 |
| [list-red-alpha.vercel.app](https://list-red-alpha.vercel.app) | 404 | 오류 응답 | 주소 중단 | 이미지·영상·코드로 전시 유지 |
| [millie-admin-dashboard.vercel.app](https://millie-admin-dashboard.vercel.app) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [millie-admin-dashboard.vercel.app/#/dashboard](https://millie-admin-dashboard.vercel.app/#/dashboard) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [my-space-orcin-eight.vercel.app](https://my-space-orcin-eight.vercel.app) | 404 | 오류 응답 | 주소 중단 | 이미지·영상·코드로 전시 유지 |
| [my-world-01-six.vercel.app](https://my-world-01-six.vercel.app) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [my-world-02.vercel.app](https://my-world-02.vercel.app) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [my-world-03.vercel.app](https://my-world-03.vercel.app) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [neon-fist.vercel.app](https://neon-fist.vercel.app) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [nuri-delta.vercel.app](https://nuri-delta.vercel.app) | 404 | 오류 응답 | 주소 중단 | 이미지·영상·코드로 전시 유지 |
| [on-the-book-admin.vercel.app/](https://on-the-book-admin.vercel.app/) | 200 | 표시 확인 | 로그인 필요 | 관람용 인증 데모 준비 |
| [on-the-book-client.vercel.app/](https://on-the-book-client.vercel.app/) | 200 | 표시·도서 상세 이동 확인 | API 200 · 도서 4권 | 실제 iframe 체험 |
| [project-manager-eight-tau.vercel.app](https://project-manager-eight-tau.vercel.app) | 200 | 공개 첫 문서 표시 | 공개 API 404 · 로컬 전용 앱 | 로컬 실행 화면 5장 전시 |
| [short-form-phi.vercel.app](https://short-form-phi.vercel.app) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [simple-gatcha.netlify.app/](https://simple-gatcha.netlify.app/) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [student-dashboard-omega-lime.vercel.app](https://student-dashboard-omega-lime.vercel.app) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [topik-ai.vercel.app](https://topik-ai.vercel.app) | 200 | 표시 확인 | 로그인 필요 | 관람용 인증 데모 준비 |
| [tutor-dashboard-topaz.vercel.app](https://tutor-dashboard-topaz.vercel.app) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [v12-weld.vercel.app](https://v12-weld.vercel.app) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [vive-nine.vercel.app](https://vive-nine.vercel.app) | 404 | 오류 응답 | 주소 중단 | 이미지·영상·코드로 전시 유지 |
| [wisdomcellar.com](https://wisdomcellar.com) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [www.kchanchan.com/](https://www.kchanchan.com/) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |
| [zenith-ten-lac.vercel.app](https://zenith-ten-lac.vercel.app) | 200 | 표시 확인 | 로그인 필요 | 관람용 인증 데모 준비 |
| [modeal-chan.github.io/react-clone-coding/](https://modeal-chan.github.io/react-clone-coding/) | 200 | 표시 확인 | 공개 첫 화면 | 포커스 후 iframe 체험 후보 |

## 확인 방법과 범위

GET 응답 헤더와 Chromium 148.0.7778.96의 실제 iframe 표시를 확인했다. 검증 문서는 브라우저 메모리에서만 제공했으며 앱 소스·배포·호스팅 헤더를 변경하지 않았다. 새 브라우저 프로필을 사용하고 상태 변경 요청을 차단했다. 대표 조작은 스크롤·검색 입력·로컬 게임 시작과 키보드 입력으로 한정했다.

검증 iframe은 1100 × 900, 바깥 뷰포트는 1600 × 1000이었다. headless 환경의 3D는 소프트웨어 WebGL로 확인했다. 모바일 실기기·Safari·Firefox·인증 후 동작·전체 기능 검증은 후속 적용 검수에 포함한다. 공개 배포 주소나 전시관 출처가 바뀌면 해당 주소와 출처에서 재검사한다.

- [전체 결과 데이터](portfolio-iframe-audit.json)
- [전시안](portfolio-exhibition-curation.md)
- [프로젝트 목록과 항목별 체험 방식](portfolio-exhibition-inventory.json)
- 로컬 검증 원본과 화면 캡처는 output/browser-checks/iframe-audit-20261019/에 보관한다.

## 적용 시 확인할 동작

- 카메라 도착 전에는 웹앱 입력이 활성화되지 않고 도착 후 대상 하나만 실행되는지 확인한다.
- 프레임 안의 스크롤·텍스트 입력·게임 입력과 부모 닫기·원본 열기가 동시에 사용 가능한지 확인한다.
- 실제 작품 표면과 클릭 영역이 일치하고 창 크기·모바일 회전·브라우저 확대 후에도 어긋나지 않는지 확인한다.
- 프로젝트 변경·닫기·재열기에서 iframe·소리·포인터 잠금·게임 루프가 남지 않는지 확인한다.
- 로그인·API 오류·문서 페이지·404·503·오프라인에서도 작품 설명과 대체 이미지·영상이 유지되는지 확인한다.
- 기존 작품 95개와 하위 프로젝트 선택이 누락되지 않는지 확인한다.

## 정책 근거

- [MDN frame ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)
- [MDN X Frame Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options)
- [MDN iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)
- [Chrome HTML in Canvas 실험과 API 변경](https://developer.chrome.com/blog/html-in-canvas-ot-changes)
