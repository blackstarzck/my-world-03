# TRIAD 포트폴리오 전시 구성과 전체 프로젝트 목록

기존 포트폴리오의 모든 프로젝트와 세부 카드를 보존하고, 추가 공개 배포 레포를 세 전시실에 배치하는 구성안이다. 기존 건축을 유지하고 작품군 단위의 연작과 개별 프로젝트 탐색을 결합한다.

기존 포트폴리오의 32개 콘텐츠 주제와 50개 세부 카드에서 77개 전시 항목을 보존한다. 여기에 기존 목록에서 빠진 배포 레포 18개를 추가하여 총 95개 항목, 41개 작품군을 구성한다. 참조 레포는 87개다. 같은 레포가 제품 화면·개발 방식·버전 연구에 중복 등장하므로 95개는 서로 다른 프로젝트 수가 아니다.

기준일은 2026년 10월 19일이다. 작품명과 조형 표현은 큐레이션 제안이며, 경력·역할·기능 설명은 기존 포트폴리오와 저장소의 내용을 따른다.

## 전시 포함 기준

- 이전 포트폴리오의 FRONTEND·BACKEND·AI·PRODUCT·LAB 내용을 모두 포함한다. 학습·클론·문서·기획 사례도 삭제하지 않는다.
- 운영 배포 이력이 있는 서비스는 필수 작품으로 포함한다. GitHub Pages·Netlify·Vercel의 공개 데모와 등록된 배포 이력도 포함한다.
- 배포 주소가 404·503을 반환해도 항목을 제외하지 않는다. 정상 주소가 있으면 그 주소를 우선 사용하고, 공개 데모가 중단된 항목은 코드·기존 이미지·영상으로 전시한다.
- 서비스별 작품과 같은 제품의 설계·검증 사례는 서로 연결한다. 같은 레포의 중복 참조를 새 프로젝트 개발 실적으로 계산하지 않는다.
- 기획·외주 협업 프로젝트는 실제 담당한 역할로 소개한다. DADOKe 외주 개발을 직접 구현한 코드로 설명하지 않으며, 밀리 관리자 대시보드는 개인 프로젝트로 표시한다.

## 전시관 규모와 배치

세 방을 유지한다. 각 방은 12m × 24m이며, 현재 전시 구조에는 벽면 44곳과 진열장 10곳이 있다. 아래 배치안은 54개 전시 위치 중 49곳을 사용한다. 방 증설이나 복도 확장은 필요하지 않다.

| 전시실 | 작품군 | 세부 전시 항목 | 벽면 사용 | 진열장 사용 | 기존 수용 위치 |
|---|---:|---:|---:|---:|---:|
| 01 고전의 깊이 | 14 | 25 | 19 | 0 | 19 |
| 02 빛의 여백 | 14 | 21 | 14 | 0 | 19 |
| 03 형태의 기억 | 13 | 49 | 6 | 10 | 16 |
| 합계 | 41 | 95 | 39 | 10 | 54 |

01은 법인별 홈페이지를 독립 액자 6곳으로 배치하고 나머지 작품군을 13곳에 배치한다. 02는 작품군 14개를 벽면 14곳에 전시하며 5곳을 여백으로 둔다. 03은 회화형 작품군 6개를 벽에, 나머지 7개 작품군을 진열장 10곳에 배치한다. On the Book은 책·3D 장면·관리 도구로 3곳, 게임·인터랙션은 2곳을 사용한다.

여러 프로젝트가 있는 작품군은 한 위치에 연작으로 배치한다. React 학습기는 26개의 선택 가능한 작은 작품으로, 자동매매는 8개 버전의 구조 변화로, 아이소메트릭은 5개 모형의 비교로 구성한다. 모든 하위 항목은 전체 작품 목록에서도 개별 검색·선택할 수 있다. 하위 항목을 선택하면 해당 작품군으로 이동하고 그 프로젝트의 이미지·설명·배포본·코드를 연다.

건축 외곽·세 방·출입구·중앙 통로·재료 분위기는 유지한다. 방 입구의 주제 안내와 작품군 명패를 추가하고, 실제 작품을 넣은 뒤 가독성과 시야를 보고 일부 전시벽·진열장만 조정한다. 집기를 옮기는 경우 충돌 영역·감상 카메라·미니맵도 함께 맞춘다.

실제 위치 ID별 작품 배정과 관람 순서, 명패·우측 설명 초안은 [작품 배치와 관람 동선](portfolio-spatial-plan.md)에 정리했다. 이 배치안은 기존 집기를 이동하지 않고 49곳 전체에 작품을 배정하며, 95개 항목의 개별 선택을 유지한다.

## 세 전시실의 작품군

### 고전의 깊이와 사용자에게 닿는 제품

| 작품군 | 제안 작품명 | 항목 수 | 작품화 방식 |
|---|---|---:|---|
| 도토리 토픽 · 사용자단 | 다시 쓰는 문장 | 1 | 쓰기가 피드백을 거쳐 정돈되는 문자 회화와 사용자 학습 흐름 |
| 도토리 토픽 · 관리자단 | 배움을 지탱하는 질서 | 1 | 문항·사용자·기관·권한을 연결하는 운영 지도와 실제 관리자 화면 |
| 센서 3D 시각화 대시보드 | 보이지 않는 기후 | 1 | 온실 형태 위에 센서 위치와 온습도 층을 겹친 입체 데이터 초상 |
| CONNECT BEE | 벌통의 맥박 | 1 | 벌통의 센서 값과 팬·열선·쿨러 제어 흐름을 연결하는 빛의 구성 |
| 법인별 홈페이지 | 브랜드의 여섯 얼굴 | 7 | 법인별 독립 액자 여섯 개에 브랜드 색·문자·실제 화면을 구성하고 부클리 시안도 연결 |
| 밀리 관리자 대시보드 | 서가 뒤의 관제실 | 1 | 콘텐츠·회원·운영 메뉴가 한 구조로 정리되는 회화와 개인 프로젝트 화면 |
| 모두가딜러 · 웹서비스 | 선택의 표면 | 1 | 차량 탐색과 반응형 화면이 달라지는 사용자 흐름을 연속 화면으로 표현 |
| 모두가딜러 · 관리자 | 반복을 덜어내는 손 | 1 | 조건별 입력·일괄 적용·미리보기의 전후를 대비하는 작업 기록 |
| DADOKe 전자책 · 오디오북 | 한 권이 만들어지기까지 | 2 | 시장조사·요구사항·외주 협업 자료와 별도 DADOKE 화면 시안을 구분해 전시 |
| 레거시 정리 · 성능 개선 | 덜어낸 무게 | 1 | 불필요한 호출과 자산을 덜어내기 전후의 구조를 대비 |
| 문서화 · 비개발 직군 협업 | 같은 그림을 보는 법 | 1 | 기획·디자인·개발이 같은 흐름을 이해하도록 만든 문서와 도식 |
| 교육 서비스 화면 연구 | 배움의 다섯 시선 | 5 | 강사·학생·목록·상세·메타데이터 관리 화면을 다섯 부분으로 구성 |
| ShortForm Knowledge | 짧게 남는 지식 | 1 | 실제 콘텐츠 화면의 카드·타이포그래피·탐색 리듬을 구성 |
| 도토리 문의 관리자 | 문의의 흐름 | 1 | 접수·처리·분석의 상태와 실제 관리자 화면을 연결 |

### 빛의 여백과 시스템을 만드는 방법

| 작품군 | 제안 작품명 | 항목 수 | 작품화 방식 |
|---|---|---:|---|
| 문서 통합 관리 서비스 | 흩어짐의 끝 | 1 | 여러 문서와 표가 하나의 데이터 격자로 합쳐지는 회화 |
| NestJS 학습 | 관계의 골격 | 1 | 인증·게시글·채팅 모듈과 관계를 층위가 있는 설계도로 표현 |
| 요구사항 게이트 하네스 | 기억하는 문 | 1 | 기록의 선이 관문을 지나고 중단 지점에서 다시 이어지는 구조 |
| AI 개발 파이프라인 | 이어받는 생각 | 1 | 서로 다른 작업자가 같은 맥락과 검증 근거를 이어받는 전달 구조 |
| TOPIK AI 검증 하네스 | 되묻는 기계 | 1 | 문서·화면·데이터·테스트 사이를 반복하는 검증의 궤도 |
| Figma → React 생성기 | 하나의 규칙 여러 얼굴 | 1 | 토큰과 테마 변화가 여러 컴포넌트에 함께 반영되는 연속 화면 |
| 반복 작업을 SKILL로 만드는 법 | 반복의 문법 | 1 | 반복되는 판단을 절차와 검사 기준으로 정리한 지침 표본 |
| 비개발자용 에이전트 IDE | 생각의 합의 | 1 | PM·설계·개발·QA 및 위원회 역할의 의견과 이견을 연결하는 지도 |
| 검사 가능한 AI 영상 제작 루프 | 검사되는 상상 | 1 | 프롬프트·검사·생성 결과의 차이를 비교하는 제작 과정 전시 |
| 디자인 룰북 | 아름다움의 조건 | 1 | 추상적인 디자인 요청이 확인 가능한 규칙으로 구체화되는 문장 회화 |
| 자동매매 시스템 | 불확실성을 다루는 여덟 설계 | 8 | 여덟 저장소의 구조·데이터·연결 방식 변화를 시간축으로 표현 |
| Planit AI 기획 워크스페이스 | 생각의 설계도 | 1 | PRD·기능명세·유저플로우·와이어프레임을 네 겹의 문서로 구성 |
| StoryQuest Admin | 장면을 짓는 도구 | 1 | 원고와 3D 에셋을 장면에 연결하는 CMS의 구조를 전시 |
| VIVE 독서 보조 도구 | 읽은 뒤에 남는 것 | 1 | 책의 하이라이트·메모·요약을 지식 자산으로 잇는 독서 보조 도구 |

### 형태의 기억과 직접 경험하는 실험

| 작품군 | 제안 작품명 | 항목 수 | 작품화 방식 |
|---|---|---:|---|
| 캔버스 · 파티클 | 빛의 문법 | 2 | 원본 파티클 예제와 particle 저장소의 움직임을 함께 보여주는 빛의 연작 |
| 캔버스 여러 개 | 여러 창 하나의 시선 | 1 | 하나의 렌더러가 여러 창을 채우는 구성의 축소 모형 |
| 스크롤 연동 3D | 스크롤의 지형 | 1 | 스크롤 진행과 카메라·3D 장면의 관계를 길과 높이로 표현 |
| 3D · 아이소메트릭 | 방을 짓는 연습 | 5 | 다섯 3D 모델·카메라 실험을 나란히 비교하는 모형 연작 |
| 게임 · 인터랙션 | 규칙에 몸을 싣다 | 5 | 격투·아케이드·다리·1인칭·FPS의 입력과 판정 규칙을 연결하는 두 진열장 |
| 능력치 카드 게임 | 얼굴이 카드가 되는 순간 | 1 | 사진 입력·능력치 카드·대결 흐름을 겹친 카드 연작 |
| 3D 공간 만들기 | 걸을 수 있는 기억 | 1 | my-space 마을 장면을 축소한 모형과 실제 탐색 화면 |
| 물체 감지 | 사진 속 이름을 찾다 | 1 | 사진·감지 좌표·결과 카드가 연결되는 시각적 구성 |
| React 학습기 | 스물여섯 개의 첫 문장 | 26 | 26개 학습 프로젝트를 각각 선택할 수 있는 작은 화면의 연작 |
| 포켓몬 도감 | 분류의 정원 | 1 | 검색·타입·정렬 규칙을 도감의 색과 반복으로 표현 |
| On the Book | 펼쳐진 세계 | 1 | 책·책 속 3D 장면·관리 도구를 세 진열장으로 연결 |
| 3D 전시관 제작 연구 | 공간의 세 문법 | 3 | my-world-01·02·03 전시관을 비교하는 축소 모형과 제작 기록 |
| 이전 포트폴리오 경력 지도 | 경력의 별자리 | 1 | 이전 포트폴리오의 경력 지도를 회화로 재구성하고 실제 사이트 연결 |

## 전체 전시 항목 95개

다음 목록은 기존 포트폴리오의 모든 세부 항목을 보존한다. 배포 주소의 숫자는 첫 문서의 HTTP 응답이며 WebGL·로그인·DB·외부 API 동작 전체의 검증 결과가 아니다. 404·503 항목도 작품 목록에 남긴다.

### 01 고전의 깊이

#### 도토리 토픽 · 사용자단

제안 작품명은 ‘다시 쓰는 문장’이다. 쓰기가 피드백을 거쳐 정돈되는 문자 회화와 사용자 학습 흐름.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 1 | 도토리 토픽 · 사용자단 | [topik-project-v13](https://github.com/blackstarzck/topik-project-v13) | 화면·문서·코드로 전시 |

#### 도토리 토픽 · 관리자단

제안 작품명은 ‘배움을 지탱하는 질서’이다. 문항·사용자·기관·권한을 연결하는 운영 지도와 실제 관리자 화면.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 2 | 도토리 토픽 · 관리자단 | [topik-ai](https://github.com/blackstarzck/topik-ai) | [Vercel](https://topik-ai.vercel.app) 200 |

#### 센서 3D 시각화 대시보드

제안 작품명은 ‘보이지 않는 기후’이다. 온실 형태 위에 센서 위치와 온습도 층을 겹친 입체 데이터 초상.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 3 | 센서 3D 시각화 대시보드 | 기존 포트폴리오의 실무·협업 사례 | 화면·문서·코드로 전시 |

#### CONNECT BEE

제안 작품명은 ‘벌통의 맥박’이다. 벌통의 센서 값과 팬·열선·쿨러 제어 흐름을 연결하는 빛의 구성.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 4 | CONNECT BEE | 기존 포트폴리오의 실무·협업 사례 | 화면·문서·코드로 전시 |

#### 법인별 홈페이지

제안 작품명은 ‘브랜드의 여섯 얼굴’이다. 법인별 독립 액자 여섯 개에 브랜드 색·문자·실제 화면을 구성하고 부클리 시안도 연결.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 5 | 케듀올 | [keduall](https://github.com/blackstarzck/keduall) | [서비스](https://keduall.com) 200 |
| 6 | 부클리 | [bookly](https://github.com/blackstarzck/bookly) | [서비스](https://hibookly.com) 200 |
| 7 | 위즈덤셀러 | [wisdomceller](https://github.com/blackstarzck/wisdomceller) | [서비스](https://wisdomcellar.com) 200 |
| 8 | 북차카 | [bookchaka](https://github.com/blackstarzck/bookchaka) | [서비스](https://bookchaka.com) 200 |
| 9 | 글로윈 비나 (북카페) | [glowin-vina](https://github.com/blackstarzck/glowin-vina) | [서비스](https://glowinvina.com) 503 |
| 10 | 비블리아 | [biblia](https://github.com/blackstarzck/biblia) | [서비스](https://hibiblia.com) 503 |
| 11 | 부클리 해외 저작권 에이전시 시안 · 추가 | [hibookly-claude-code-design-v1](https://github.com/blackstarzck/hibookly-claude-code-design-v1) | [Vercel](https://hibookly-claude-code-design-v1.vercel.app) 404 |

#### 밀리 관리자 대시보드

제안 작품명은 ‘서가 뒤의 관제실’이다. 콘텐츠·회원·운영 메뉴가 한 구조로 정리되는 회화와 개인 프로젝트 화면.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 12 | 밀리 관리자 대시보드 | [millie-admin-dashboard](https://github.com/blackstarzck/millie-admin-dashboard) | [Vercel](https://millie-admin-dashboard.vercel.app/#/dashboard) 200<br>[Vercel](https://millie-admin-dashboard.vercel.app) 200<br>[GitHub Pages](https://blackstarzck.github.io/millie-admin-dashboard/) 200 |

#### 모두가딜러 · 웹서비스

제안 작품명은 ‘선택의 표면’이다. 차량 탐색과 반응형 화면이 달라지는 사용자 흐름을 연속 화면으로 표현.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 13 | 모두가딜러 · 웹서비스 | 기존 포트폴리오의 실무·협업 사례 | 화면·문서·코드로 전시 |

#### 모두가딜러 · 관리자

제안 작품명은 ‘반복을 덜어내는 손’이다. 조건별 입력·일괄 적용·미리보기의 전후를 대비하는 작업 기록.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 14 | 모두가딜러 · 관리자 | 기존 포트폴리오의 실무·협업 사례 | 화면·문서·코드로 전시 |

#### DADOKe 전자책 · 오디오북

제안 작품명은 ‘한 권이 만들어지기까지’이다. 시장조사·요구사항·외주 협업 자료와 별도 DADOKE 화면 시안을 구분해 전시.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 15 | DADOKe 전자책 · 오디오북 | 기존 포트폴리오의 실무·협업 사례 | 화면·문서·코드로 전시 |
| 16 | DADOKE 디지털 독서 화면 시안 · 추가 | [nuri](https://github.com/blackstarzck/nuri) | [Vercel](https://nuri-delta.vercel.app) 404 |

#### 레거시 정리 · 성능 개선

제안 작품명은 ‘덜어낸 무게’이다. 불필요한 호출과 자산을 덜어내기 전후의 구조를 대비.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 17 | 레거시 정리 · 성능 개선 | 기존 포트폴리오의 실무·협업 사례 | 화면·문서·코드로 전시 |

#### 문서화 · 비개발 직군 협업

제안 작품명은 ‘같은 그림을 보는 법’이다. 기획·디자인·개발이 같은 흐름을 이해하도록 만든 문서와 도식.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 18 | 문서화 · 비개발 직군 협업 | 기존 포트폴리오의 실무·협업 사례 | 화면·문서·코드로 전시 |

#### 교육 서비스 화면 연구

제안 작품명은 ‘배움의 다섯 시선’이다. 강사·학생·목록·상세·메타데이터 관리 화면을 다섯 부분으로 구성.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 19 | 강사 대시보드 · 추가 | [tutor-dashboard](https://github.com/blackstarzck/tutor-dashboard) | [Vercel](https://tutor-dashboard-topaz.vercel.app) 200 |
| 20 | 학생 대시보드 · 추가 | [student-dashboard](https://github.com/blackstarzck/student-dashboard) | [Vercel](https://student-dashboard-omega-lime.vercel.app) 200 |
| 21 | 한국어 공개 강의 목록 · 추가 | [list](https://github.com/blackstarzck/list) | [Vercel](https://list-red-alpha.vercel.app) 404 |
| 22 | 강의 상세 화면 · 추가 | [detail](https://github.com/blackstarzck/detail) | [Vercel](https://detail-ruby.vercel.app) 404 |
| 23 | 강의 메타데이터 관리자 · 추가 | [admin](https://github.com/blackstarzck/admin) | [Vercel](https://admin-coral-phi.vercel.app) 404 |

#### ShortForm Knowledge

제안 작품명은 ‘짧게 남는 지식’이다. 실제 콘텐츠 화면의 카드·타이포그래피·탐색 리듬을 구성.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 24 | ShortForm Knowledge · 추가 | [short-form](https://github.com/blackstarzck/short-form) | [Vercel](https://short-form-phi.vercel.app) 200 |

#### 도토리 문의 관리자

제안 작품명은 ‘문의의 흐름’이다. 접수·처리·분석의 상태와 실제 관리자 화면을 연결.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 25 | 도토리 문의 관리자 · 추가 | [dotore-admin](https://github.com/blackstarzck/dotore-admin) | [Vercel](https://dotore-admin.vercel.app) 200 |

### 02 빛의 여백

#### 문서 통합 관리 서비스

제안 작품명은 ‘흩어짐의 끝’이다. 여러 문서와 표가 하나의 데이터 격자로 합쳐지는 회화.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 26 | 문서 통합 관리 서비스 | [doc-merge](https://github.com/blackstarzck/doc-merge)<br>[doc-merge-server](https://github.com/blackstarzck/doc-merge-server) | [GitHub Pages](https://blackstarzck.github.io/doc-merge/) 200 |

#### NestJS 학습

제안 작품명은 ‘관계의 골격’이다. 인증·게시글·채팅 모듈과 관계를 층위가 있는 설계도로 표현.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 27 | NestJS 학습 | [cf_sns](https://github.com/blackstarzck/cf_sns) | 화면·문서·코드로 전시 |

#### 요구사항 게이트 하네스

제안 작품명은 ‘기억하는 문’이다. 기록의 선이 관문을 지나고 중단 지점에서 다시 이어지는 구조.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 28 | 요구사항 게이트 하네스 | [requirement-gated-python-harness](https://github.com/blackstarzck/requirement-gated-python-harness) | 화면·문서·코드로 전시 |

#### AI 개발 파이프라인

제안 작품명은 ‘이어받는 생각’이다. 서로 다른 작업자가 같은 맥락과 검증 근거를 이어받는 전달 구조.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 29 | AI 개발 파이프라인 | [topik-project-v13](https://github.com/blackstarzck/topik-project-v13) | 화면·문서·코드로 전시 |

#### TOPIK AI 검증 하네스

제안 작품명은 ‘되묻는 기계’이다. 문서·화면·데이터·테스트 사이를 반복하는 검증의 궤도.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 30 | TOPIK AI 검증 하네스 | [topik-ai](https://github.com/blackstarzck/topik-ai) | [Vercel](https://topik-ai.vercel.app) 200 |

#### Figma → React 생성기

제안 작품명은 ‘하나의 규칙 여러 얼굴’이다. 토큰과 테마 변화가 여러 컴포넌트에 함께 반영되는 연속 화면.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 31 | Figma → React 생성기 | [chanchan2](https://github.com/blackstarzck/chanchan2) | [Vercel](https://chanchan2.vercel.app) 200 |

#### 반복 작업을 SKILL로 만드는 법

제안 작품명은 ‘반복의 문법’이다. 반복되는 판단을 절차와 검사 기준으로 정리한 지침 표본.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 32 | 반복 작업을 SKILL로 만드는 법 | [v12](https://github.com/blackstarzck/v12)<br>[sample-03](https://github.com/blackstarzck/sample-03) | [Vercel](https://v12-weld.vercel.app) 200 |

#### 비개발자용 에이전트 IDE

제안 작품명은 ‘생각의 합의’이다. PM·설계·개발·QA 및 위원회 역할의 의견과 이견을 연결하는 지도.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 33 | 비개발자용 에이전트 IDE | [ai-squads](https://github.com/blackstarzck/ai-squads)<br>[profitpal](https://github.com/blackstarzck/profitpal) | 화면·문서·코드로 전시 |

#### 검사 가능한 AI 영상 제작 루프

제안 작품명은 ‘검사되는 상상’이다. 프롬프트·검사·생성 결과의 차이를 비교하는 제작 과정 전시.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 34 | 검사 가능한 AI 영상 제작 루프 | [sample-03](https://github.com/blackstarzck/sample-03) | 화면·문서·코드로 전시 |

#### 디자인 룰북

제안 작품명은 ‘아름다움의 조건’이다. 추상적인 디자인 요청이 확인 가능한 규칙으로 구체화되는 문장 회화.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 35 | 디자인 룰북 | [madia-design-rule](https://github.com/blackstarzck/madia-design-rule) | 화면·문서·코드로 전시 |

#### 자동매매 시스템

제안 작품명은 ‘불확실성을 다루는 여덟 설계’이다. 여덟 저장소의 구조·데이터·연결 방식 변화를 시간축으로 표현.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 36 | zenith | [zenith](https://github.com/blackstarzck/zenith) | [Vercel](https://zenith-ten-lac.vercel.app) 200 |
| 37 | zenith-v2 | [zenith-v2](https://github.com/blackstarzck/zenith-v2) | 화면·문서·코드로 전시 |
| 38 | zenith-v3 | [zenith-v3](https://github.com/blackstarzck/zenith-v3) | 화면·문서·코드로 전시 |
| 39 | zenith-v4 | [zenith-v4](https://github.com/blackstarzck/zenith-v4) | 화면·문서·코드로 전시 |
| 40 | coin-lab | [coin-lab](https://github.com/blackstarzck/coin-lab) | 화면·문서·코드로 전시 |
| 41 | coin-lab-v2 | [coin-lab-v2](https://github.com/blackstarzck/coin-lab-v2) | [Vercel](https://frontend-eta-six-54.vercel.app) 200 |
| 42 | profitpal | [profitpal](https://github.com/blackstarzck/profitpal) | 화면·문서·코드로 전시 |
| 43 | Haley | [Haley](https://github.com/blackstarzck/Haley) | 화면·문서·코드로 전시 |

#### Planit AI 기획 워크스페이스

제안 작품명은 ‘생각의 설계도’이다. PRD·기능명세·유저플로우·와이어프레임을 네 겹의 문서로 구성.

Planit은 로컬 환경에서 실행하는 앱이다. 포커스 시 캡처 뷰어에서 PRD → 기능명세 → 유저플로우 → 와이어프레임을 선택·확대해 보는 작품으로 전시한다. 우측 설명에 ‘로컬 앱 실행 화면 · 검수용 샘플 데이터’를 표시한다. 공개 Vercel 주소의 API 404를 서비스 장애나 복구 과제로 해석하지 않는다.

2026년 10월 19일 로컬 실행본의 대시보드와 네 문서 화면, 총 5장을 캡처했다. 기존 ‘실제 AI 검수 · 동네 도서관’ 합성 예제의 복사본을 사용했다. [캡처 목록과 실행 근거](portfolio-assets/planit/README.md)를 전시 자료로 사용한다.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 44 | Planit AI 기획 워크스페이스 · 추가 | [project-manager](https://github.com/blackstarzck/project-manager) | 로컬 실행 · [실제 화면 5장](portfolio-assets/planit/README.md)<br>[Vercel 이력](https://project-manager-eight-tau.vercel.app) 200 · API 404 |

#### StoryQuest Admin

제안 작품명은 ‘장면을 짓는 도구’이다. 원고와 3D 에셋을 장면에 연결하는 CMS의 구조를 전시.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 45 | StoryQuest 콘텐츠 CMS · 추가 | [admin-story-quest](https://github.com/blackstarzck/admin-story-quest) | [Vercel](https://admin-story-quest.vercel.app) 200 |

#### VIVE 독서 보조 도구

제안 작품명은 ‘읽은 뒤에 남는 것’이다. 책의 하이라이트·메모·요약을 지식 자산으로 잇는 독서 보조 도구.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 46 | VIVE 독서 보조 도구 · 추가 | [vive](https://github.com/blackstarzck/vive) | [Vercel](https://vive-nine.vercel.app) 404 |

### 03 형태의 기억

#### 캔버스 · 파티클

제안 작품명은 ‘빛의 문법’이다. 원본 파티클 예제와 particle 저장소의 움직임을 함께 보여주는 빛의 연작.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 47 | 캔버스 · 파티클 | [particle-colorful-stars](https://github.com/blackstarzck/particle-colorful-stars) | [GitHub Pages](https://blackstarzck.github.io/particle-colorful-stars/) 200 |
| 48 | 파티클 형태 변환 실험 · 추가 | [particle](https://github.com/blackstarzck/particle) | [GitHub Pages](https://blackstarzck.github.io/particle/) 200 |

#### 캔버스 여러 개

제안 작품명은 ‘여러 창 하나의 시선’이다. 하나의 렌더러가 여러 창을 채우는 구성의 축소 모형.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 49 | 캔버스 여러 개 | [multicanvas](https://github.com/blackstarzck/multicanvas) | [GitHub Pages](https://blackstarzck.github.io/multicanvas/) 200 |

#### 스크롤 연동 3D

제안 작품명은 ‘스크롤의 지형’이다. 스크롤 진행과 카메라·3D 장면의 관계를 길과 높이로 표현.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 50 | 스크롤 연동 3D | [scroll-page](https://github.com/blackstarzck/scroll-page) | [GitHub Pages](https://blackstarzck.github.io/scroll-page/) 200 |

#### 3D · 아이소메트릭

제안 작품명은 ‘방을 짓는 연습’이다. 다섯 3D 모델·카메라 실험을 나란히 비교하는 모형 연작.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 51 | isosmetric-02 | [isosmetric-02](https://github.com/blackstarzck/isosmetric-02) | [GitHub Pages](https://blackstarzck.github.io/isosmetric-02/) 200 |
| 52 | isosmetric-01 | [isosmetric-01](https://github.com/blackstarzck/isosmetric-01) | [GitHub Pages](https://blackstarzck.github.io/isosmetric-01/) 200 |
| 53 | custom_model | [custom_model](https://github.com/blackstarzck/custom_model) | [GitHub Pages](https://blackstarzck.github.io/custom_model/) 200 |
| 54 | controls-01 | [controls-01](https://github.com/blackstarzck/controls-01) | [GitHub Pages](https://blackstarzck.github.io/controls-01/) 200 |
| 55 | ilbunidiary | [ilbunidiary](https://github.com/blackstarzck/ilbunidiary) | [GitHub Pages](https://blackstarzck.github.io/ilbunidiary/) 200 |

#### 게임 · 인터랙션

제안 작품명은 ‘규칙에 몸을 싣다’이다. 격투·아케이드·다리·1인칭·FPS의 입력과 판정 규칙을 연결하는 두 진열장.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 56 | neon-fist | [neon-fist](https://github.com/blackstarzck/neon-fist) | [Vercel](https://neon-fist.vercel.app) 200 |
| 57 | game-cabinet | [game-cabinet](https://github.com/blackstarzck/game-cabinet) | [Vercel](https://game-cabinet.vercel.app) 200 |
| 58 | bridge | [bridge](https://github.com/blackstarzck/bridge) | [GitHub Pages](https://blackstarzck.github.io/bridge/) 200 |
| 59 | first-person-perspective | [first-person-perspective](https://github.com/blackstarzck/first-person-perspective) | [GitHub Pages](https://blackstarzck.github.io/first-person-perspective/) 200 |
| 60 | lets-fps | [lets-fps](https://github.com/blackstarzck/lets-fps) | [Vercel](https://lets-fps.vercel.app) 200 |

#### 능력치 카드 게임

제안 작품명은 ‘얼굴이 카드가 되는 순간’이다. 사진 입력·능력치 카드·대결 흐름을 겹친 카드 연작.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 61 | 능력치 카드 게임 | [game-cards](https://github.com/blackstarzck/game-cards) | [Netlify](https://simple-gatcha.netlify.app/) 200 |

#### 3D 공간 만들기

제안 작품명은 ‘걸을 수 있는 기억’이다. my-space 마을 장면을 축소한 모형과 실제 탐색 화면.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 62 | 3D 공간 만들기 | [my-space](https://github.com/blackstarzck/my-space) | [GitHub Pages](https://blackstarzck.github.io/my-space/) 200<br>[Vercel](https://my-space-orcin-eight.vercel.app) 404 |

#### 물체 감지

제안 작품명은 ‘사진 속 이름을 찾다’이다. 사진·감지 좌표·결과 카드가 연결되는 시각적 구성.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 63 | 물체 감지 | [chanki-portfolio](https://github.com/blackstarzck/chanki-portfolio) | [GitHub Pages](https://blackstarzck.github.io/chanki-portfolio/) 200 |

#### React 학습기

제안 작품명은 ‘스물여섯 개의 첫 문장’이다. 26개 학습 프로젝트를 각각 선택할 수 있는 작은 화면의 연작.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 64 | react-todos | [react-todos](https://github.com/blackstarzck/react-todos) | [GitHub Pages](https://blackstarzck.github.io/react-todos/) 200 · 문서만 표시 |
| 65 | react-practice6 | [react-practice6](https://github.com/blackstarzck/react-practice6) | [GitHub Pages](https://blackstarzck.github.io/react-practice6/) 200 · 문서만 표시 |
| 66 | business-card | [business-card](https://github.com/blackstarzck/business-card) | [GitHub Pages](https://blackstarzck.github.io/business-card/) 200 |
| 67 | react-modeal.net2 | [react-modeal.net2](https://github.com/blackstarzck/react-modeal.net2) | [GitHub Pages](https://blackstarzck.github.io/react-modeal.net2/) 200 · 문서만 표시<br>[README 연결 배포본](https://modeal-chan.github.io/react-clone-coding/) 200 · iframe 앱 표시 확인 |
| 68 | react-modeal | [react-modeal](https://github.com/blackstarzck/react-modeal) | [GitHub Pages](https://blackstarzck.github.io/react-modeal/) 404 |
| 69 | react-face-detect | [react-face-detect](https://github.com/blackstarzck/react-face-detect) | 화면·문서·코드로 전시 |
| 70 | react-youtube | [react-youtube](https://github.com/blackstarzck/react-youtube) | 화면·문서·코드로 전시 |
| 71 | react-swiper | [react-swiper](https://github.com/blackstarzck/react-swiper) | [GitHub Pages](https://blackstarzck.github.io/react-swiper/) 200 · 빈 화면과 자산 404 |
| 72 | react-practice4 | [react-practice4](https://github.com/blackstarzck/react-practice4) | 화면·문서·코드로 전시 |
| 73 | react-axios-practice | [react-axios-practice](https://github.com/blackstarzck/react-axios-practice) | 화면·문서·코드로 전시 |
| 74 | react-practice5 | [react-practice5](https://github.com/blackstarzck/react-practice5) | 화면·문서·코드로 전시 |
| 75 | react-practice3 | [react-practice3](https://github.com/blackstarzck/react-practice3) | 화면·문서·코드로 전시 |
| 76 | react-practice2 | [react-practice2](https://github.com/blackstarzck/react-practice2) | 화면·문서·코드로 전시 |
| 77 | react-practice1 | [react-practice1](https://github.com/blackstarzck/react-practice1) | 화면·문서·코드로 전시 |
| 78 | react-practice7 | [react-practice7](https://github.com/blackstarzck/react-practice7) | 화면·문서·코드로 전시 |
| 79 | react-router-practice1 | [react-router-practice1](https://github.com/blackstarzck/react-router-practice1) | 화면·문서·코드로 전시 |
| 80 | react-router-practice2 | [react-router-practice2](https://github.com/blackstarzck/react-router-practice2) | 화면·문서·코드로 전시 |
| 81 | react-styled-component | [react-styled-component](https://github.com/blackstarzck/react-styled-component) | 화면·문서·코드로 전시 |
| 82 | react-CRUD | [react-CRUD](https://github.com/blackstarzck/react-CRUD) | 화면·문서·코드로 전시 |
| 83 | memo | [memo](https://github.com/blackstarzck/memo) | 화면·문서·코드로 전시 |
| 84 | habit-tracker | [habit-tracker](https://github.com/blackstarzck/habit-tracker) | 화면·문서·코드로 전시 |
| 85 | new-habit-tracker | [new-habit-tracker](https://github.com/blackstarzck/new-habit-tracker) | 화면·문서·코드로 전시 |
| 86 | assignment | [assignment](https://github.com/blackstarzck/assignment) | 화면·문서·코드로 전시 |
| 87 | data_structure | [data_structure](https://github.com/blackstarzck/data_structure) | 화면·문서·코드로 전시 |
| 88 | drag-n-drop | [drag-n-drop](https://github.com/blackstarzck/drag-n-drop) | 화면·문서·코드로 전시 |
| 89 | canvas-test | [canvas-test](https://github.com/blackstarzck/canvas-test) | 화면·문서·코드로 전시 |

#### 포켓몬 도감

제안 작품명은 ‘분류의 정원’이다. 검색·타입·정렬 규칙을 도감의 색과 반복으로 표현.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 90 | 포켓몬 도감 | [pokemon](https://github.com/blackstarzck/pokemon) | [Netlify](https://chanki-pokedx.netlify.app/) 200 |

#### On the Book

제안 작품명은 ‘펼쳐진 세계’이다. 책·책 속 3D 장면·관리 도구를 세 진열장으로 연결.

사용자 서비스와 책 속 3D 장면은 포커스 시 실제 iframe으로 조작하는 작품으로 확정한다. 재검사에서 도서 4권 표시 → 앨리스 상세 선택 → 첫 장면 진입과 WebGL 렌더링을 확인했다. 도서 진열장은 목록부터, 3D 진열장은 확인된 앨리스 첫 장면부터 체험을 제안한다. 관리 도구 진열장은 화면·구조 설명과 관람용 인증 데모를 준비한다.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 91 | On the Book 사용자 서비스와 관리자 · 추가 | [on-the-book](https://github.com/blackstarzck/on-the-book) | [사용자 서비스](https://on-the-book-client.vercel.app/) 200 · API 200 · iframe 목록·상세·3D 장면 진입 확인<br>[앨리스 첫 장면](https://on-the-book-client.vercel.app/?book=alice&chapter=alice-1)<br>[관리자](https://on-the-book-admin.vercel.app/) 200 · 로그인 필요 |

#### 3D 전시관 제작 연구

제안 작품명은 ‘공간의 세 문법’이다. my-world-01·02·03 전시관을 비교하는 축소 모형과 제작 기록.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 92 | my-world-03 TRIAD 전시관 · 추가 | [my-world-03](https://github.com/blackstarzck/my-world-03) | [Vercel](https://my-world-03.vercel.app) 200 |
| 93 | my-world-01 전시관 · 추가 | [my-world-01](https://github.com/blackstarzck/my-world-01) | [Vercel](https://my-world-01-six.vercel.app) 200 |
| 94 | my-world-02 전시관 · 추가 | [my-world-02](https://github.com/blackstarzck/my-world-02) | [Vercel](https://my-world-02.vercel.app) 200 |

#### 이전 포트폴리오 경력 지도

제안 작품명은 ‘경력의 별자리’이다. 이전 포트폴리오의 경력 지도를 회화로 재구성하고 실제 사이트 연결.

| 번호 | 세부 항목 | 레포와 근거 | 공개 배포 주소와 응답 |
|---:|---|---|---|
| 95 | 이전 포트폴리오 경력 지도 · 추가 | [my-website-2026](https://github.com/blackstarzck/my-website-2026) | [Vercel](https://chanki-react.vercel.app) 200<br>[서비스](https://www.kchanchan.com/) 200 |

## 작품 화면과 탐색 방식

작품의 상징 회화·조형과 실제 웹앱 체험을 연결한다. 카메라 이동이 끝나고 우측 설명이 열린 상태에서 체험 가능한 작품 하나만 실제 HTML iframe으로 전환한다. 액자와 공간은 기존 3D로 유지하고, 작품 표면의 투영 좌표에 DOM iframe을 맞춘다.

### 관람 흐름

1. 자유 관람과 작품으로 이동하는 동안은 정적 이미지·가벼운 조형을 표시한다.
2. 작품에 도착하면 해당 하위 프로젝트의 체험 준비 상태를 확인해 실행 가능한 앱 하나만 켠다.
3. 작품 안에서 클릭·스크롤·입력·게임을 조작한다. 우측 설명과 닫기·작품 보기·원본 열기는 계속 사용할 수 있다.
4. 작은 화면은 좌측 작품 영역 안에서 크게 체험하도록 제공한다. 데스크톱의 70 대 30과 모바일의 위아래 구성을 유지한다.
5. 작품을 바꾸거나 닫으면 iframe을 제거해 소리·타이머·게임·추가 3D 실행을 정리하고 전시장 조작을 되돌린다.

### 항목별 체험 방식

- 기존 다섯 분야와 작품군을 보존하고 모든 하위 항목을 개별 검색·선택한다. 대표작 강조를 이유로 나머지를 제외하지 않는다.
- 공개 첫 화면이 확인된 앱을 체험 후보로 사용한다. 로그인·API 오류는 관람용 데모 준비 후 활성화하고, 문서·빈 화면·중단 주소는 복구 전까지 이미지·영상·코드로 전시한다.
- TOPIK v13 사용자 운영 주소는 확인 전까지 대체하지 않는다. v12는 이전 버전 체험이라는 이름으로 선택적으로 연결한다.
- SKILL·검증 하네스·기획·협업 사례는 실제 역할과 실행 근거를 중심으로 소개한다. 관련 앱이 배포되어 있다는 이유로 그 앱 화면을 사례 자체의 체험으로 대체하지 않는다.
- 현재 전시관 자체인 my-world-03은 제작 과정 또는 중첩을 제한한 데모로 소개한다.
- Planit은 로컬 실행 화면 5장으로 전시한다. 포커스하면 문서 단계별 캡처 선택과 확대를 제공하고, 로컬 앱·샘플 데이터라는 설명을 함께 표시한다.
- 설명은 해결할 문제 → 실제 역할 → 결과 화면 → 구현·협업 과정 → 검증 자료 → 서비스·GitHub 순서로 구성한다.

### 입력과 실행 관리

- 프로젝트에 포커스한 동안 전시장 이동·시선 조작·작품 이동 단축키를 분리한다. 다른 출처 iframe의 Esc가 부모로 전달된다고 가정하지 않고 바깥 닫기 버튼을 유지한다.
- 전체 프로젝트를 동시에 불러오지 않는다. 선택한 앱 하나만 실행하고 영상·무거운 모델은 선택 시 준비한다.
- 제안 sandbox는 allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups이며 allow는 fullscreen; gamepad다. 대표 10개 주소에서 이 설정으로 표시를 확인했고 프로젝트별 권한과 인증 흐름은 적용 검수에서 다시 확인한다.
- iframe load를 앱 준비 완료로 판정하지 않는다. 관리 가능한 데모는 출처를 검증하는 postMessage 준비·종료 신호를 연결하고, 신호가 없는 앱에도 원본 열기를 제공한다.

### iframe 삽입 확인 결과

배포 주소 59개와 레포 README에서 찾은 대체 주소 1개를 검사했다. 이 공개 주소 60개에서는 iframe 정책 차단이 발견되지 않았다. 50개가 HTTP 200이지만 3개는 문서만 표시하고 1개는 빈 화면이다. Planit 공개 주소의 API 404는 로컬 전용 실행 방식과 구분해 기록한다. 로그인 화면은 6개다. 별도 실행한 Planit 로컬 서버는 X-Frame-Options: DENY를 반환하며 캡처 전시에 사용한다. 첫 문서 표시와 실제 기능 정상 동작을 구분한다.

북차카의 스크롤, 포켓몬 도감의 검색 입력, NEON FIST의 게임 시작·키보드 입력을 sandbox iframe에서 확인했다. my-world-01과 my-world-03은 로딩 후 3D 전시관 표시도 확인했다.

react-modeal.net2는 현재 blackstarzck 주소가 문서 페이지이지만 README와 package homepage가 연결하는 modeal-chan 배포본을 체험 후보로 추가했다. On the Book은 초기 검사에서 /api/library 400을 보였으나 같은 날 23시 5분 이후 재검사에서 API 200, 도서 4권 표시와 iframe 내부 상세 이동을 확인했다. 사용자 서비스는 실제 체험 작품으로 확정하고 관리자는 관람용 인증 데모를 준비한다. Planit은 로컬 캡처 전시로 반영한다.

항목별 체험안은 직접 iframe 후보 34개, 데모 준비 6개, 로컬 캡처 전시 1개, 배포 복구 전 미디어 전시 12개, 문서·코드·협업 사례 42개로 분류했다. 이는 프로젝트를 제거하는 구분이 아니며 95개 항목 전체를 전시한다.

주소별 상태와 준비 조건은 [iframe 삽입 확인 보고서](portfolio-iframe-audit.md), 기계 판독 결과는 [결과 데이터](portfolio-iframe-audit.json)에 기록했다. 앱 소스·호스팅·운영 데이터는 변경하지 않았다.

## 배포 확인에서 반영할 사항

- GitHub Pages 활성 레포 21개 중 첫 화면 20개가 200을 반환했다. react-modeal은 404를 반환했지만 기존 포트폴리오 항목을 보존한다.
- 레포 homepage에 등록된 Vercel 주소 26개 중 첫 화면 19개가 200을 반환했다. 7개의 실패 주소도 배포 이력으로 보존한다.
- my-space는 Vercel 주소가 404를 반환하므로 정상 응답하는 GitHub Pages 주소를 기본 서비스 링크로 사용한다.
- 능력치 카드 게임과 포켓몬 도감의 Netlify 주소는 각각 200을 반환했다.
- 케듀올·부클리·위즈덤셀러·북차카는 200, 글로윈 비나·비블리아는 이번 요청에서 503을 반환했다. 법인 6개 모두 전시한다.
- On the Book은 사용자·관리자 주소가 모두 200을 반환했으며 저장소의 분리 배포 문서에 운영 주소가 명시되어 있다.
- TOPIK v13 사용자 앱의 운영 주소는 이번 공개 자료에서 확인되지 않았다. 사용자 화면과 코드를 전시하고, v12 공개본과 TOPIK 관리자 주소는 서로 구분해 연결한다.

## 추가 미배포 소스 후보

다음 10개 레포는 기존 포트폴리오에 수록되지 않았고 이번 범위에서 공개 배포 주소가 확인되지 않은 추가 후보다. 앞의 95개 필수 항목을 줄이는 대체 목록으로 사용하지 않는다.

| 레포 | 처리 |
|---|---|
| [book-shorts-storyboard-skill](https://github.com/blackstarzck/book-shorts-storyboard-skill) | 빈 저장소이므로 실체가 생기기 전까지 전시 대상 제외 |
| [legacy-box](https://github.com/blackstarzck/legacy-box) | 기존 포트폴리오에 미수록되고 이번 범위에서 공개 배포 주소가 확인되지 않은 추가 후보 |
| [quick-report](https://github.com/blackstarzck/quick-report) | 기존 포트폴리오에 미수록되고 이번 범위에서 공개 배포 주소가 확인되지 않은 추가 후보 |
| [report-hub](https://github.com/blackstarzck/report-hub) | 기존 포트폴리오에 미수록되고 이번 범위에서 공개 배포 주소가 확인되지 않은 추가 후보 |
| [particles](https://github.com/blackstarzck/particles) | 기존 포트폴리오에 미수록되고 이번 범위에서 공개 배포 주소가 확인되지 않은 추가 후보 |
| [second-template](https://github.com/blackstarzck/second-template) | 기존 포트폴리오에 미수록되고 이번 범위에서 공개 배포 주소가 확인되지 않은 추가 후보 |
| [homepage](https://github.com/blackstarzck/homepage) | 기존 포트폴리오에 미수록되고 이번 범위에서 공개 배포 주소가 확인되지 않은 추가 후보 |
| [survey-pie-admin](https://github.com/blackstarzck/survey-pie-admin) | 기존 포트폴리오에 미수록되고 이번 범위에서 공개 배포 주소가 확인되지 않은 추가 후보 |
| [survey-pie-server](https://github.com/blackstarzck/survey-pie-server) | 기존 포트폴리오에 미수록되고 이번 범위에서 공개 배포 주소가 확인되지 않은 추가 후보 |
| [survey-pie](https://github.com/blackstarzck/survey-pie) | 기존 포트폴리오에 미수록되고 이번 범위에서 공개 배포 주소가 확인되지 않은 추가 후보 |

## 확인 기준

- 기존 콘텐츠 주제 32개와 세부 카드 50개, 펼친 전시 항목 77개가 모두 포함되어야 한다.
- 추가 배포 레포 18개가 모두 포함되어야 하며 전체 항목은 95개여야 한다.
- 참조한 레포 87개와 추가 후보 10개가 공개 레포 97개를 중복 없이 설명해야 한다.
- 모든 항목은 세 방 중 한 곳과 작품군 한 곳에 속해야 한다. 같은 레포의 서로 다른 사례는 상호 연결한다.
- 방별 벽면·진열장 사용 수가 기존 수용 위치를 넘지 않아야 한다.
- 전시를 실제 적용한 뒤 PC·모바일에서 전체 목록의 누락, 하위 항목 접근, 외부 링크, 감상 카메라와 충돌을 확인한다.
- 포커스 도착 후 iframe 한 개만 실행되고 닫기·작품 변경 시 입력·소리·포인터 잠금·실행이 정리되는지 확인한다.
- 원본 열기와 이미지·영상 대체 표현이 로그인·API 오류·배포 중단에서도 유지되는지 확인한다.

## 출처

- [기존 포트폴리오](https://www.kchanchan.com/#/chanki)
- [전체 콘텐츠와 세부 카드](https://github.com/blackstarzck/my-website-2026/blob/main/chanki-react/data/nodes.ts)
- [AI 사례 연구](https://github.com/blackstarzck/my-website-2026/blob/main/chanki-react/data/aiArticles.ts)
- [문서 통합 관리와 밀리 대시보드 사례 연구](https://github.com/blackstarzck/my-website-2026/blob/main/chanki-react/data/projectArticles.ts)
- [공개 레포 메타데이터](https://api.github.com/users/blackstarzck/repos?per_page=100&sort=updated)
- [On the Book 운영 분리 배포 안내](https://github.com/blackstarzck/on-the-book/blob/main/docs/DEPLOYMENT.md)
- 전시관 치수와 전시 위치는 이 프로젝트의 src/world/design-basis.json과 src/world/exhibits.js를 기준으로 한다.
