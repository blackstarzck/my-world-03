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

건축 공간, 가구, 링, 항아리와 추상 조형은 이 프로젝트에서 치수와 형태로 생성합니다.

## 글꼴과 아이콘

- Pretendard Variable v1.3.9: https://github.com/orioncactus/pretendard — SIL Open Font License 1.1. Local font and license: `public/fonts/PretendardVariable.woff2`, `public/fonts/OFL.txt`.
- Google Fonts: Noto Serif KR — SIL Open Font License 1.1.
- Lucide: https://lucide.dev/license — ISC License.

React, Three.js, Vite 등 프로그램 의존성의 라이선스는 각 패키지에 포함된 원문을 따릅니다.
