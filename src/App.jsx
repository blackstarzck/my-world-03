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
import { ProjectExperience } from "./ProjectExperience.jsx";
import { portfolioRooms } from "./portfolio.js";
import { ArtworkIndex, GalleryNavigation } from "./GalleryNavigation.jsx";
import BoxLoader from "@/components/ui/box-loader";

const rooms = [
  { id: "lobby", name: "중앙 로비", shortName: "로비" },
  ...portfolioRooms.map((room) => ({
    ...room,
    shortName: { "01": "제품", "02": "시스템", "03": "실험" }[room.id],
  })),
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
        aria-label="프로젝트 공간 안내 지도"
      >
        {rooms.map((r) => (
          <button
            key={r.id}
            type="button"
            data-room={r.id}
            className={`map-room-label ${active === r.id ? "selected" : ""}`}
            aria-label={`${r.name}${r.id === "lobby" ? "로" : " 공간으로"} 이동`}
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
    inspectionOrigin = useRef(null),
    selectedArtwork = useRef(null),
    returnFocus = useRef(null),
    openArtworkRef = useRef(null),
    modalTrigger = useRef(null),
    focusTarget = useRef(null),
    detailVisibleRef = useRef(false);
  const [ready, setReady] = useState(false),
    [loadingVisible, setLoadingVisible] = useState(true),
    [loadingStage, setLoadingStage] = useState("전시 공간을 준비하고 있어요"),
    [error, setError] = useState(""),
    [active, setActive] = useState("lobby"),
    [featured, setFeatured] = useState(null),
    [cursorId, setCursorId] = useState(null),
    [locked, setLocked] = useState(false),
    [blackHoleHovered, setBlackHoleHovered] = useState(false),
    [lighting, setLighting] = useState("day"),
    [panel, setPanel] = useState(null),
    [selected, setSelected] = useState(null),
    [collection, setCollection] = useState([]),
    [traveling, setTraveling] = useState(false),
    [readyArtworkId, setReadyArtworkId] = useState(null),
    [activeProjectId, setActiveProjectId] = useState(null),
    [detailVisible, setDetailVisible] = useState(false);
  detailVisibleRef.current = detailVisible;
  useEffect(() => {
    let cancelled = false;
    let instance;
    import("./world/scene.js")
      .then(({ createExhibition }) =>
        cancelled
          ? null
          : createExhibition(host.current, {
              onLoadStage: (label) => {
                if (!cancelled) setLoadingStage(label);
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
                if (!cancelled) openArtworkRef.current(a);
              },
              onBlackHoleHover: (value) => {
                if (!cancelled) setBlackHoleHovered(value);
              },
              onNearbyArtwork: (artwork) => {
                if (cancelled || selectedArtwork.current) return;
                setFeatured((current) => current?.id === artwork?.id ? current : artwork);
                setCursorId(artwork?.id ?? null);
              },
              onTravel: (value) => {
                if (!cancelled) {
                  setTraveling(value);
                  if (value && !detailVisibleRef.current)
                    setReadyArtworkId(null);
                  if (!value) setReadyArtworkId(focusTarget.current);
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
    if (!ready) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setLoadingVisible(false);
      return;
    }
    // Normally removed by transitionend; also clean up if it is cancelled.
    const timer = window.setTimeout(() => setLoadingVisible(false), 650);
    return () => window.clearTimeout(timer);
  }, [ready]);
  useEffect(() => {
    engine.current?.setSuspended(Boolean(panel || selected), { pauseMotion: Boolean(panel) });
  }, [panel, selected, ready]);
  useEffect(() => {
    if (!selected) {
      setDetailVisible(false);
      return;
    }
    if (panel || detailVisibleRef.current || readyArtworkId !== selected.id) return;
    // Show a rendered frontal view before fading in the flat project page.
    const timer = setTimeout(
      () => setDetailVisible(true),
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 240,
    );
    return () => clearTimeout(timer);
  }, [selected, readyArtworkId, panel]);
  useEffect(() => {
    if (!selected || detailVisible || panel) return;
    const cancel = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeArtwork();
      }
    };
    document.addEventListener("keydown", cancel);
    return () => document.removeEventListener("keydown", cancel);
  }, [selected, detailVisible, panel]);
  useEffect(() => {
    if (!ready) return;
    if (selected) {
      // Browsing inside the mounted detail page changes content only. The
      // camera is placed at the last selection when the page is dismissed.
      if (detailVisibleRef.current) return;
      focusTarget.current = selected.id;
      setReadyArtworkId(null);
      setCursorId(selected.id);
      engine.current.focusArtwork(selected.id, { origin: inspectionOrigin.current?.view });
    } else if (returnFocus.current) {
      const origin = returnFocus.current;
      returnFocus.current = null;
      const fallback = document.querySelector(".view-actions button[aria-haspopup]");
      const target = origin.trigger?.isConnected ? origin.trigger
        : document.getElementById(`artwork-dot-${origin.cursorId}`) || fallback || host.current.querySelector("canvas");
      target?.focus({ preventScroll: true });
    }
  }, [selected, ready]);
  function navigate(id) {
    if (!engine.current) return;
    focusTarget.current = null;
    setReadyArtworkId(null);
    setPanel(null);
    selectedArtwork.current = null;
    setSelected(null);
    detailVisibleRef.current = false;
    setDetailVisible(false);
    setFeatured(null);
    setCursorId(null);
    inspectionOrigin.current = null;
    returnFocus.current = null;
    engine.current.goTo(id);
  }
  function openArtwork(artwork, projectId) {
    if (!engine.current) return;
    const showingDetail = detailVisibleRef.current;
    if (!inspectionOrigin.current) {
      inspectionOrigin.current = {
        view: engine.current.captureView(), featured, cursorId,
        trigger: panel === "collection" ? modalTrigger.current : document.activeElement,
      };
    }
    returnFocus.current = null;
    setPanel(null);
    focusTarget.current = null;
    setReadyArtworkId(null);
    setActiveProjectId(projectId || artwork.projects[0].id);
    setDetailVisible(showingDetail);
    setFeatured(artwork);
    setCursorId(artwork.id);
    selectedArtwork.current = { ...artwork };
    setSelected(selectedArtwork.current);
  }
  openArtworkRef.current = openArtwork;
  function previewArtwork(artwork) {
    if (!artwork || !engine.current) return;
    focusTarget.current = null;
    setFeatured(artwork);
    setCursorId(artwork.id);
    engine.current.focusArtwork(artwork.id);
  }
  function openIndex() {
    modalTrigger.current = document.activeElement;
    setPanel("collection");
  }
  function closeArtwork() {
    const last = selectedArtwork.current;
    if (!last || !engine.current) return;
    selectedArtwork.current = null;
    focusTarget.current = null;
    setReadyArtworkId(null);
    const origin = inspectionOrigin.current;
    inspectionOrigin.current = null;
    if (detailVisibleRef.current) {
      // Snap under the opaque page so closing reveals the last artwork with
      // no flight, return animation or intermediate camera position.
      engine.current.focusArtwork(last.id, { animated: false, origin: origin?.view });
      setFeatured(last);
      setCursorId(last.id);
      returnFocus.current = { featured: last, cursorId: last.id };
    } else if (origin) {
      // Cancelling the initial approach still retraces its travelled portion.
      returnFocus.current = origin;
      setFeatured(origin.featured);
      setCursorId(origin.cursorId);
      engine.current.restoreView(origin.view);
    }
    detailVisibleRef.current = false;
    setSelected(null);
    setDetailVisible(false);
  }
  function stepArtwork(delta) {
    if (!selectedArtwork.current || !detailVisibleRef.current) return;
    const index = collection.findIndex(
      (artwork) => artwork.id === selectedArtwork.current.id,
    );
    const next =
      collection[(index + delta + collection.length) % collection.length];
    openArtwork(next);
  }
  function changeLighting() {
    const next = lighting === "day" ? "evening" : "day";
    setLighting(next);
    engine.current?.setLighting(next);
  }
  const selectedProject =
    selected?.projects.find((project) => project.id === activeProjectId) ||
    selected?.projects[0];
  return (
    <main
      className={`app ${lighting} ${locked ? "walking" : ""} ${selected ? "project-pending" : "has-collection"}`}
    >
      <div
        className="exhibition-stage"
        inert={panel || selected ? true : undefined}
      >
        <div
          className="world"
          ref={host}
          aria-label={
            selected
              ? `${selectedProject.name}로 이동하는 3D 공간`
              : "3D 포트폴리오 공간"
          }
        />
        <div className="edge-shade" />
        <header className="topbar">
          <div className="top-actions">
            <div className="utility-actions">
              <button
                className={`icon-button desktop-walk ${locked ? "on" : ""}`}
                aria-label={locked ? "직접 이동 종료" : "직접 이동 시작"}
                aria-pressed={locked}
                title={
                  locked ? "직접 이동 종료 (Esc)" : "직접 이동 시작 (WASD 이동)"
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
                aria-label="포트폴리오 소개"
                title="포트폴리오 소개"
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
              aria-label="공간과 프로젝트 보기"
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
                <span>전체 프로젝트</span>
              </button>
            </div>
          </div>
        </header>
        <div className="crosshair" aria-hidden="true" />
        {ready && blackHoleHovered && !selected && !panel && !traveling && (
          <div className="black-hole-link-hint" role="tooltip">
            클릭하여 웹사이트 열기
            <ArrowUpRight size={16} aria-hidden="true" />
            <span>새 창</span>
          </div>
        )}
        {ready && (
          <aside className="map-wrap">
            <Map active={active} onNavigate={navigate} markerRef={marker} />
          </aside>
        )}
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
      </div>
      {selected && detailVisible && !panel && (
        <ArtworkPanel
          artwork={selected}
          project={selectedProject}
          onProjectChange={setActiveProjectId}
          room={rooms.find((room) => room.id === selected.room)}
          onClose={closeArtwork}
          onStep={stepArtwork}
          onOpenIndex={openIndex}
        >
          <ProjectExperience
            key={selectedProject.id}
            project={selectedProject}
          />
        </ArtworkPanel>
      )}
      {selected && !detailVisible && !panel && traveling && (
        <div className="project-approach">
          <div>
            <LoaderCircle className="spin" size={14} />
            <span>{selectedProject.name} · 정면으로 이동 중</span>
            <button onClick={closeArtwork} aria-label="프로젝트 이동 취소">
              <X size={17} />
            </button>
          </div>
        </div>
      )}
      {loadingVisible && (
        <div
          className={`loading-screen${ready ? " is-leaving" : ""}`}
          aria-busy={!ready && !error}
          aria-hidden={ready || undefined}
          inert={ready ? true : undefined}
          onTransitionEnd={(event) => {
            if (ready && event.target === event.currentTarget && event.propertyName === "opacity")
              setLoadingVisible(false);
          }}
        >
          {!error && <BoxLoader />}
          <div className="loading-copy" role="status" aria-live="polite">
            {error ? (
              <>
                <p role="alert">{error}</p>
                <button onClick={() => location.reload()}>다시 불러오기</button>
              </>
            ) : (
              <p>{loadingStage}</p>
            )}
          </div>
        </div>
      )}
      {panel === "about" && (
        <Dialog
          title="포트폴리오 소개"
          returnFocus={modalTrigger.current}
          onClose={() => setPanel(null)}
          className="about-dialog"
        >
          <span className="eyebrow">ABOUT TRIAD</span>
          <h2>
            김찬기의 개발 프로젝트,
            <br />세 개의 공간.
          </h2>
          <p>
            사용자에게 닿는 제품, 시스템과 일하는 방식, 직접 경험하는 실험. 41개
            프로젝트 그룹에 포함된 95개 프로젝트·개발 사례를 살펴볼 수 있습니다.
          </p>
          <div className="about-rooms">
            {rooms.slice(1).map((r) => (
              <button key={r.id} onClick={() => navigate(r.id)}>
                <b>
                  {r.name}
                  <small className="about-room-theme">{r.theme}</small>
                </b>
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
          <p className="credits">
            프로젝트별 시각 구성
            <br />
            재질:{" "}
            <a href="https://polyhaven.com" target="_blank" rel="noreferrer">
              Poly Haven · CC0
            </a>
            <br />
            프로젝트:{" "}
            <a
              href="https://github.com/blackstarzck"
              target="_blank"
              rel="noreferrer"
            >
              blackstarzck · GitHub
            </a>
          </p>
        </Dialog>
      )}
      {panel === "collection" && (
        <Dialog
          title="전체 프로젝트"
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
