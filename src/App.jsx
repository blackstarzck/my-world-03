import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  X,
  Sun,
  Moon,
  Box,
  Images,
  LoaderCircle,
} from "lucide-react";
import { ArtworkPanel } from "./ArtworkTour.jsx";
import { ArtworkIndex, GalleryNavigation } from "./GalleryNavigation.jsx";

const rooms = [
  { id: "lobby", name: "중앙 로비", shortName: "로비" },
  { id: "01", name: "고전의 깊이", shortName: "고전" },
  { id: "02", name: "빛의 여백", shortName: "빛" },
  { id: "03", name: "형태의 기억", shortName: "형태" },
];

function WalkIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="13.5" cy="3.5" r="2" />
      <path d="M9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 9.3V14h2v-3.4l1.8-1.7Z" />
    </svg>
  );
}

function Logo() {
  return (
    <a className="brand" href="#" aria-label="TRIAD 로비로 이동">
      <svg width="28" height="34" viewBox="0 0 32 36" fill="none">
        <path
          d="M16 2v17M16 19 2 28M16 19l14 9"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M10 5v11L1 22M22 5v11l9 6M7 32l9-6 9 6"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
      <span>
        TRIAD<small>AN EXHIBITION IN THREE PARTS</small>
      </span>
    </a>
  );
}
function Map({ active, onNavigate, markerRef }) {
  const host = useRef(null),
    api = useRef(null),
    navigateRef = useRef(onNavigate),
    activeRef = useRef(active);
  const [failed, setFailed] = useState(false);
  navigateRef.current = onNavigate;
  activeRef.current = active;
  useEffect(() => {
    let cancelled = false;
    import("./world/minimap.js")
      .then(({ createMinimap }) => {
        if (cancelled) return;
        const instance = createMinimap(
          host.current,
          host.current.querySelectorAll("[data-room]"),
          (id) => navigateRef.current(id),
        );
        api.current = instance;
        markerRef.current = instance.updatePosition;
        instance.setActive(activeRef.current);
      })
      .catch((error) => {
        console.error("미니맵을 불러오지 못했습니다.", error);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      markerRef.current = null;
      api.current?.dispose();
      api.current = null;
    };
  }, [markerRef]);
  useEffect(() => {
    api.current?.setActive(active);
  }, [active]);
  return (
    <div className={`minimap glass-surface ${failed ? "map-fallback" : ""}`}>
      <div className="map-heading">
        <span>
          SPACE GUIDE <b>3D</b>
        </span>
        <span className="map-location">
          <i />
          {active === "overview"
            ? "전체 공간"
            : rooms.find((r) => r.id === active)?.name}
        </span>
      </div>
      <div
        className="map-model"
        ref={host}
        role="group"
        aria-label="입체 전시 공간 안내 지도"
      >
        {rooms.map((r) => (
          <button
            key={r.id}
            type="button"
            data-room={r.id}
            className={`map-room-label ${active === r.id ? "selected" : ""}`}
            aria-label={`${r.name}${r.id === "lobby" ? "" : " 전시실"}로 이동`}
            aria-pressed={active === r.id}
            title={r.name}
            onClick={() => onNavigate(r.id)}
          >
            {r.shortName}
          </button>
        ))}
      </div>
      <div className="map-caption">
        <span>
          {failed ? (
            "공간 이름을 눌러 이동"
          ) : active === "overview" ? (
            "전체 공간 둘러보는 중"
          ) : (
            <>
              <i />
              현재 위치
            </>
          )}
        </span>
        {!failed && <span>공간을 눌러 이동</span>}
      </div>
    </div>
  );
}
function Dialog({ title, children, onClose, returnFocus, className = "" }) {
  const ref = useRef(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = returnFocus ?? document.activeElement;
    (ref.current?.querySelector("button") ?? ref.current)?.focus();
    const handler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key === "Tab") {
        const nodes = ref.current.querySelectorAll(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]',
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div
      className={`dialog-backdrop ${className === "artwork-index" ? "index-backdrop" : ""}`}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        tabIndex="-1"
        className={`dialog ${className} ${className === "artwork-index" ? "glass-surface" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button
          className="icon-button dialog-close"
          onClick={onClose}
          aria-label="닫기"
        >
          <X size={19} />
        </button>
        {children}
      </section>
    </div>
  );
}

export default function App() {
  const host = useRef(null),
    engine = useRef(null),
    marker = useRef(null),
    pagination = useRef(null),
    returnRoom = useRef(null),
    lastArtwork = useRef(null),
    modalTrigger = useRef(null),
    pendingInspection = useRef(null);
  const [ready, setReady] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState(""),
    [active, setActive] = useState("lobby"),
    [featured, setFeatured] = useState(null),
    [cursorId, setCursorId] = useState(null),
    [inspectionRequest, setInspectionRequest] = useState(null),
    [locked, setLocked] = useState(false),
    [lighting, setLighting] = useState("day"),
    [panel, setPanel] = useState(null),
    [selected, setSelected] = useState(null),
    [collection, setCollection] = useState([]),
    [traveling, setTraveling] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let instance;
    import("./world/scene.js")
      .then(({ createExhibition }) =>
        cancelled
          ? null
          : createExhibition(host.current, {
              onProgress: (p) => {
                if (!cancelled) setProgress(p);
              },
              onRoom: (r) => {
                if (!cancelled) {
                  setActive(r);
                }
              },
              onLock: (v) => {
                if (!cancelled) setLocked(v);
              },
              onSelect: (a) => {
                if (!cancelled) {
                  setSelected(a);
                }
              },
              onTravel: (value) => {
                if (!cancelled) {
                  setTraveling(value);
                  const pending = pendingInspection.current;
                  if (pending && value) pending.started = true;
                  if (
                    pending &&
                    !value &&
                    (pending.started ||
                      window.matchMedia("(prefers-reduced-motion: reduce)")
                        .matches)
                  ) {
                    pendingInspection.current = null;
                    setFeatured(null);
                    setSelected(pending.artwork);
                  }
                }
              },
              onTravelProgress: (value) => {
                const element = pagination.current;
                if (cancelled || !element) return;
                // 카메라의 실제 타임라인을 사용하고 프레임마다 React를 다시 그리지 않습니다.
                element.style.setProperty(
                  "--travel-remaining",
                  String((1 - value) * 100),
                );
                const ring = element.querySelector('[role="progressbar"]');
                const percent = String(Math.round(value * 100));
                if (ring?.getAttribute("aria-valuenow") !== percent)
                  ring?.setAttribute("aria-valuenow", percent);
              },
              onPosition: (state) => {
                if (!cancelled) marker.current?.(state);
              },
            }),
      )
      .then((api) => {
        if (!api) return;
        instance = api;
        if (cancelled) {
          api.dispose();
          return;
        }
        engine.current = api;
        setCollection(api.getArtworks());
        setReady(true);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled)
          setError(
            "3D 공간을 불러오지 못했습니다. 브라우저의 하드웨어 가속을 확인하고 다시 시도해 주세요.",
          );
      });
    return () => {
      cancelled = true;
      instance?.dispose();
    };
  }, []);
  useEffect(() => {
    engine.current?.setSuspended(Boolean(panel || selected));
  }, [panel, selected, ready]);
  useEffect(() => {
    if (
      ready &&
      inspectionRequest &&
      pendingInspection.current?.artwork === inspectionRequest.artwork
    ) {
      // 목록을 닫은 전체 너비 화면에서 이동한 뒤 설명 패널을 엽니다.
      engine.current.focusArtwork(inspectionRequest.artwork.id);
    }
  }, [inspectionRequest, ready]);
  useEffect(() => {
    if (!ready) return;
    if (selected) {
      setCursorId(selected.id);
      lastArtwork.current = selected.id;
      engine.current.focusArtwork(selected.id);
    } else if (returnRoom.current) {
      const room = returnRoom.current;
      returnRoom.current = null;
      engine.current.returnToEntrance(room);
      document
        .getElementById(`artwork-dot-${lastArtwork.current}`)
        ?.focus({ preventScroll: true });
    }
  }, [selected, ready]);
  function navigate(id) {
    if (!engine.current) return;
    pendingInspection.current = null;
    setPanel(null);
    setSelected(null);
    setFeatured(null);
    setCursorId(null);
    returnRoom.current = null;
    engine.current.goTo(id);
  }
  function openArtwork(artwork) {
    setPanel(null);
    returnRoom.current = null;
    pendingInspection.current = { artwork, started: false };
    setFeatured(artwork);
    setCursorId(artwork.id);
    setSelected(null);
    setInspectionRequest({ artwork });
  }
  function previewArtwork(artwork) {
    if (!artwork || !engine.current) return;
    pendingInspection.current = null;
    returnRoom.current = null;
    setFeatured(artwork);
    setCursorId(artwork.id);
    engine.current.focusArtwork(artwork.id);
  }
  function openIndex() {
    pendingInspection.current = null;
    modalTrigger.current = document.activeElement;
    setPanel("collection");
  }
  function closeArtwork() {
    if (!selected) return;
    pendingInspection.current = null;
    setFeatured(null);
    returnRoom.current = selected.room;
    setSelected(null);
  }
  function stepArtwork(delta) {
    setSelected((current) => {
      const index = collection.findIndex(
        (artwork) => artwork.id === current?.id,
      );
      return collection[
        (index + delta + collection.length) % collection.length
      ];
    });
  }
  function changeLighting() {
    const next = lighting === "day" ? "evening" : "day";
    setLighting(next);
    engine.current?.setLighting(next);
  }
  return (
    <main
      className={`app ${lighting} ${locked ? "walking" : ""} ${selected ? "viewing-artwork" : "has-collection"}`}
    >
      <div className="exhibition-stage" inert={panel ? true : undefined}>
        <div
          className="world"
          ref={host}
          aria-label={
            selected ? `${selected.title} 작품 감상 영역` : "3D 전시 공간"
          }
        />
        <div className="edge-shade" />
        <header className="topbar">
          <div
            onClick={(e) => {
              e.preventDefault();
              navigate("lobby");
            }}
          >
            <Logo />
          </div>
          <div className="top-actions">
            <div className="utility-actions">
              <button
                className={`icon-button desktop-walk ${locked ? "on" : ""}`}
                aria-label={locked ? "자유 관람 종료" : "자유 관람 시작"}
                aria-pressed={locked}
                title={
                  locked ? "자유 관람 종료 (Esc)" : "자유 관람 시작 (WASD 이동)"
                }
                onClick={() =>
                  locked
                    ? document.exitPointerLock()
                    : engine.current?.startWalk()
                }
                disabled={!ready}
              >
                <WalkIcon />
              </button>
              <button
                className="icon-button"
                onClick={() => {
                  modalTrigger.current = document.activeElement;
                  setPanel("about");
                }}
                aria-label="전시 소개"
                title="전시 소개"
              >
                <ArrowUpRight size={18} />
              </button>
              <button
                className={`icon-button ${lighting === "evening" ? "on" : ""}`}
                onClick={changeLighting}
                aria-label={
                  lighting === "day" ? "저녁 조명으로 변경" : "낮 조명으로 변경"
                }
                title="낮 / 저녁 조명"
                disabled={!ready}
              >
                {lighting === "day" ? <Sun size={19} /> : <Moon size={18} />}
              </button>
            </div>
            <span className="toolbar-divider" />
            <div
              className="view-actions glass-surface"
              role="group"
              aria-label="공간과 작품 보기"
            >
              <button
                className="overview-button"
                aria-label={
                  active === "overview" ? "공간으로 돌아가기" : "전체 공간"
                }
                onClick={() =>
                  navigate(active === "overview" ? "lobby" : "overview")
                }
                disabled={!ready}
              >
                <Box size={17} />
                <span>
                  {active === "overview" ? "공간으로 돌아가기" : "전체 공간"}
                </span>
              </button>
              <span className="view-actions-divider" aria-hidden="true" />
              <button
                className="overview-button"
                onClick={openIndex}
                aria-haspopup="dialog"
                disabled={!ready}
              >
                <Images size={17} />
                <span>전체 작품</span>
              </button>
            </div>
          </div>
        </header>
        <div className="crosshair" aria-hidden="true" />
        <aside className="map-wrap">
          <Map active={active} onNavigate={navigate} markerRef={marker} />
        </aside>
        {ready && !selected && (
          <GalleryNavigation
            artworks={collection}
            rooms={rooms}
            currentId={cursorId}
            activeRoom={active}
            featured={featured}
            traveling={traveling}
            progressRef={pagination}
            onPreview={previewArtwork}
            onInspect={openArtwork}
          />
        )}
        {selected && (
          <ArtworkPanel
            artwork={selected}
            room={rooms.find((room) => room.id === selected.room)}
            traveling={traveling}
            onClose={closeArtwork}
            onStep={stepArtwork}
            onOpenIndex={openIndex}
          />
        )}
      </div>
      {!ready && (
        <div className="loading-screen">
          <Logo />
          <div className="loading-copy">
            <span>빛과 재료가 만나는 공간</span>
            <h2>잠시 후, 전시가 시작됩니다.</h2>
            <div className="progress-line">
              <i style={{ width: `${progress}%` }} />
            </div>
            {error ? (
              <>
                <p role="alert">{error}</p>
                <button onClick={() => location.reload()}>다시 불러오기</button>
              </>
            ) : (
              <p>
                <LoaderCircle className="spin" size={14} /> 공간을 준비하고
                있어요 <b>{progress}%</b>
              </p>
            )}
          </div>
          <span className="loading-footer">THREE PERSPECTIVES. ONE SPACE.</span>
        </div>
      )}
      {panel === "about" && (
        <Dialog
          title="전시 소개"
          returnFocus={modalTrigger.current}
          onClose={() => setPanel(null)}
          className="about-dialog"
        >
          <span className="eyebrow">ABOUT TRIAD</span>
          <h2>
            세 개의 시선,
            <br />
            하나의 공간.
          </h2>
          <p>
            고전 회화의 깊이, 콘크리트에 스며드는 빛, 그리고 조각에 남은 재료의
            기억. 서로 다른 세 공간이 하나의 중앙 로비에서 만납니다.
          </p>
          <div className="about-rooms">
            {rooms.slice(1).map((r) => (
              <button key={r.id} onClick={() => navigate(r.id)}>
                <b>{r.name}</b>
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
          <p className="credits">
            회화 이미지:{" "}
            <a
              href="https://www.metmuseum.org/about-the-met/policies-and-documents/open-access"
              target="_blank"
              rel="noreferrer"
            >
              The Metropolitan Museum of Art · Open Access
            </a>
            <br />
            재질:{" "}
            <a href="https://polyhaven.com" target="_blank" rel="noreferrer">
              Poly Haven · CC0
            </a>
            <br />
            인물 조형:{" "}
            <a
              href="https://www.triplegangers.com"
              target="_blank"
              rel="noreferrer"
            >
              Lee Perry-Smith · Infinite 3D Head Scan
            </a>{" "}
            ·{" "}
            <a
              href="https://creativecommons.org/licenses/by/3.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY 3.0
            </a>{" "}
            (크기·재질 변경)
          </p>
        </Dialog>
      )}
      {panel === "collection" && (
        <Dialog
          title="전체 작품"
          returnFocus={modalTrigger.current}
          className="artwork-index"
          onClose={() => setPanel(null)}
        >
          <ArtworkIndex
            artworks={collection}
            rooms={rooms}
            currentId={selected?.id ?? cursorId}
            onSelect={openArtwork}
          />
        </Dialog>
      )}
    </main>
  );
}
