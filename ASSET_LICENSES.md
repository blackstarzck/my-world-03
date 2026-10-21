# 이미지·재질·3D 모델 출처

## 현재 포트폴리오 작품과 자료

프로젝트별 그림 49점은 사용자 제공 참고 자료의 톤과 미니멀한 상징 표현을 바탕으로 내장 image_gen 도구로 제작했습니다. 원본·생성 프롬프트·그림별 에이전트 검수 기록은 `output/portfolio-paintings-2026-10-20/`에 보존합니다. 전시용 WebP는 `public/portfolio/artworks/`에 있으며 원본과의 SHA-256 대응은 `src/data/painting-assets.json`에 있습니다.

기존 Planit 화면 5장은 로컬 앱의 검수용 합성 예제로 촬영한 과거 자료이며, 현재 앱에서 사용하지 않습니다.

현재 앱에서 사용하지 않는 이전 포트폴리오 소개 자료 47개는 사용자가 제공한 [my-website-2026](https://github.com/blackstarzck/my-website-2026)의 `chanki-react/public/assets`에서 가져왔습니다. 프로젝트 연결은 같은 저장소의 `data/nodes.ts`에 있는 `shot`과 프로젝트 식별자를 따릅니다. 원본 URL과 SHA-256은 `output/retired-screen-materials-2026-10-20/legacy/sources.json`에 기록했습니다.

아래 소장품 이미지와 인물 스캔은 기존 건축 검수 버전의 자산으로 보관하며 현재 전시에서는 사용하지 않습니다.

## 회화

The Metropolitan Museum of Art의 Open Access 소장품 이미지 10점을 사용했습니다. 각 작품의 API 결과에서 `isPublicDomain`을 확인한 공개 이미지이며, 로컬 파일은 `public/assets/art-*.jpg`입니다.

- 정책: https://www.metmuseum.org/about-the-met/policies-and-documents/open-access
- 작품명, 작가, 제작 시기, 이미지 URL, 소장처 링크: `public/assets/artworks.json`
- 기존 소장품 전시 버전의 출처 기록입니다.

## 표면 재질

Poly Haven의 CC0 자료를 사용했습니다. 원본 URL과 파일 크기는 `public/assets/sources.json`에 있습니다.

| 재질                              | 원본                                          |
| --------------------------------- | --------------------------------------------- |
| 원목 바닥·벤치                    | https://polyhaven.com/a/wooden_floor_01       |
| 석재 바닥                         | https://polyhaven.com/a/stone_tiles_02        |
| 콘크리트 벽                       | https://polyhaven.com/a/concrete_wall_009     |
| 콘크리트 바닥 굴곡·거칠기         | https://polyhaven.com/a/smooth_concrete_floor |
| 초기 검토용 콘크리트, 현재 미사용 | https://polyhaven.com/a/concrete_floor_01     |

라이선스: https://polyhaven.com/license

원목은 헤링본 배열과 벤치 목재로 재구성했고 석재는 색상과 줄눈을 조정했습니다. 콘크리트 바닥은 중성 회색으로 표현하고 원본의 굴곡·거칠기를 사용합니다.

## 인물 조각

**Infinite, 3D Head Scan by Lee Perry-Smith**, based on a work at https://www.triplegangers.com/.

- 라이선스: Creative Commons Attribution 3.0 Unported — https://creativecommons.org/licenses/by/3.0/
- 배포 파일: https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf/LeePerrySmith
- 로컬 모델: `public/assets/portrait.glb`
- 원문 라이선스: `public/assets/portrait-license.txt`
- 변경 사항: 전시대에 맞춘 크기·위치·방향 조정 및 석재 재질 적용.

## 중앙 로비 — Black Hole

**Black Hole**, NestaEric (https://sketchfab.com/Nestaeric).

- 원본: https://sketchfab.com/3d-models/black-hole-e410da98b1e5445eae2acafaaa53587d
- 라이선스: Creative Commons Attribution 4.0 International — https://creativecommons.org/licenses/by/4.0/
- 사용자 제공 파일: `black_hole.glb`; 로컬 모델: `public/assets/black_hole.glb`.
- 변경 사항: 구형 specular-glossiness 메타데이터를 유지한 glTF 2.0 대체 재질 변환, 별도 예시 행성 제외, 중앙 받침에 맞춘 크기·위치·시점 조정, 거리 반응·회전·텍스처 흐름·맥동 추가. 공개 뷰어 설정을 기록하여 GLB에서 누락된 알파 기반 굴절·요철·광택 및 발광·색 보정·빛 번짐을 런타임에서 복원했습니다. 밝기 추출과 다섯 단계 번짐, MSAA·알파 커버리지, 모델 초점 기반 흐림과 색수차를 추가하여 가장자리와 후광을 다듬었습니다. 배포 GLB의 메시·내장 텍스처 버퍼는 보존하고 런타임에서 UV·윤곽 오차를 제한한 삼각형 감소를 적용했습니다.
- 환경 반사 출처: 공개 모델이 참조하는 Sketchfab 환경 UID `0bc5ce71f9404ef984d65e335367bbb8` (`space`), 공개 LogLuv specular cubemap. 원본 URL: https://media.sketchfab.com/environments/0bc5ce71f9404ef984d65e335367bbb8/aba76fa27de64645ba5b91e1c0b75612.bin.gz. 표준 gzip 해제 및 채널 배열 복원 후 원래 인코딩으로 샘플링합니다.
- 재변환: `node tools/prepare-black-hole.mjs <원본 black_hole.glb 경로>`.

건축 공간, 가구, 항아리와 추상 조형은 이 프로젝트에서 치수와 형태로 생성합니다. 미니맵에는 블랙홀의 간략한 대체 모형을 사용합니다.

## 글꼴과 아이콘

- Pretendard Variable v1.3.9: https://github.com/orioncactus/pretendard — SIL Open Font License 1.1. Local font and license: `public/fonts/PretendardVariable.woff2`, `public/fonts/OFL.txt`.
- Google Fonts: Noto Serif KR — SIL Open Font License 1.1.
- Lucide: https://lucide.dev/license — ISC License.

React, Three.js, Vite 등 프로그램 의존성의 라이선스는 각 패키지에 포함된 원문을 따릅니다.
