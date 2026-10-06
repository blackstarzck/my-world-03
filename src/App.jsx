import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  X,
  Sun,
  Moon,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  MoveUpRight,
  Box,
  CircleHelp,
  Move,
  Download,
  ExternalLink,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import { lobbyOutline, roomPoint } from "./world/layout.js";

const rooms = [
  {
    id: "lobby",
    no: "00",
    name: "중앙 로비",
    en: "THE ATRIUM",
    title: (
      <>
        세 개의 시선,
        <br />
        하나의 공간.
      </>
    ),
    description: "빛을 따라, 당신만의 속도로 걸어보세요.",
  },
  {
    id: "01",
    no: "01",
    name: "고전의 깊이",
    en: "THE CLASSIC",
    title: (
      <>
        시간이 남긴
        <br />
        깊은 색.
      </>
    ),
    description: "짙은 청록과 따뜻한 나무 사이, 회화의 시간을 거닙니다.",
  },
  {
    id: "02",
    no: "02",
    name: "빛의 여백",
    en: "THE CONTEMPORARY",
    title: (
      <>
        빛이 그리는
        <br />
        고요한 여백.
      </>
    ),
    description: "콘크리트의 담백한 표면 위로 하루의 빛이 흐릅니다.",
  },
  {
    id: "03",
    no: "03",
    name: "형태의 기억",
    en: "THE OBJECT",
    title: (
      <>
        형태 안에
        <br />
        머무는 기억.
      </>
    ),
    description: "돌과 금속, 유리 사이에서 서로 다른 물성을 만납니다.",
  },
];
const overview = {
  id: "overview",
  no: "—",
  en: "THE ARCHITECTURE",
  name: "전체 공간",
  title: (
    <>
      세 갈래로 이어지는
      <br />
      하나의 이야기.
    </>
  ),
  description: "드래그하여 회전하고, 휠로 가까이 살펴보세요.",
};

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
function Map({ active, onNavigate, markerRef, expanded = false }) {
  const poly = (points) => points.map(([x, z]) => `${x},${-z}`).join(" ");
  const outline = poly(lobbyOutline());
  return (
    <div className={`minimap ${expanded ? "expanded" : ""}`}>
      <div className="map-heading">
        <span>SPACE GUIDE</span>
        <span className="map-location">
          <i />{" "}
          {active === "overview"
            ? "전체 공간"
            : rooms.find((r) => r.id === active)?.name}
        </span>
      </div>
      <svg viewBox="-40 -40 80 68" aria-label="전시 공간 안내 지도">
        <polygon
          points={outline}
          className={`map-room ${active === "lobby" ? "selected" : ""}`}
          role="button"
          tabIndex="0"
          aria-label="중앙 로비로 이동"
          onClick={() => onNavigate("lobby")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onNavigate("lobby");
            }
          }}
        />
        {rooms.slice(1).map((r) => {
          const points = [
            [-6, 0],
            [6, 0],
            [6, 24],
            [-6, 24],
          ].map(([t, v]) => {
            const p = roomPoint(r.id, t, v);
            return [p[0], -p[2]];
          });
          const p = roomPoint(r.id, 0, 13);
          return (
            <g
              key={r.id}
              role="button"
              tabIndex="0"
              aria-label={`${r.name} 전시실로 이동`}
              onClick={() => onNavigate(r.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onNavigate(r.id);
                }
              }}
            >
              <polygon
                points={poly(points)}
                className={`map-room ${active === r.id ? "selected" : ""}`}
              />
              <text x={p[0]} y={p[2] + 1.2} textAnchor="middle">
                {r.no}
              </text>
            </g>
          );
        })}
        <circle cx="0" cy="0" r="1.8" className="map-sculpture" />
        <g ref={markerRef} className="map-marker">
          <circle r="2.5" className="map-pulse" />
          <circle r="1.05" />
          <path d="M-1.1 3.3 0 1.2l1.1 2.1" />
        </g>
      </svg>
      <div className="map-caption">
        공간을 누르면 바로 이동합니다 <ArrowUpRight size={12} />
      </div>
    </div>
  );
}
function Dialog({ title, children, onClose, className = "" }) {
  const ref = useRef(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    const handler = (e) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const nodes = ref.current.querySelectorAll(
          'button,a[href],input,select,[tabindex="0"]',
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
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="dialog-backdrop"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        tabIndex="-1"
        className={`dialog ${className}`}
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
    timer = useRef(null);
  const [ready, setReady] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState(""),
    [active, setActive] = useState("lobby"),
    [locked, setLocked] = useState(false),
    [lighting, setLighting] = useState("day"),
    [exposure, setExposure] = useState(1.13),
    [quality, setQuality] = useState(innerWidth < 700 ? "balanced" : "high"),
    [panel, setPanel] = useState(null),
    [selected, setSelected] = useState(null),
    [transition, setTransition] = useState(false),
    [fullscreen, setFullscreen] = useState(false);
  const room =
    active === "overview"
      ? overview
      : rooms.find((r) => r.id === active) || rooms[0];
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
                if (!cancelled) setActive(r);
              },
              onLock: (v) => {
                if (!cancelled) setLocked(v);
              },
              onSelect: (a) => {
                if (!cancelled) setSelected(a);
              },
              onPosition: ({ position, yaw, overview }) => {
                if (!cancelled && marker.current) {
                  marker.current.setAttribute(
                    "transform",
                    `translate(${position[0]} ${position[2]}) rotate(${(-yaw * 180) / Math.PI})`,
                  );
                  marker.current.style.opacity = overview ? "0" : "1";
                }
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
      clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    engine.current?.setSuspended(Boolean(panel || selected));
  }, [panel, selected, ready]);
  useEffect(() => {
    const change = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  function navigate(id) {
    if (!engine.current) return;
    setPanel(null);
    setSelected(null);
    setTransition(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      engine.current.goTo(id);
      setTransition(false);
    }, 170);
  }
  function setTimeOfDay(value) {
    setLighting(value);
    setExposure(value === "day" ? 1.13 : 1.16);
    engine.current?.setLighting(value);
  }
  function changeLighting() {
    setTimeOfDay(lighting === "day" ? "evening" : "day");
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setPanel("help");
    }
  }
  return (
    <main className={`app ${locked ? "walking" : ""}`}>
      <div className="world" ref={host} />
      <div className="edge-shade" />
      <div className={`scene-transition ${transition ? "visible" : ""}`} />
      <header className="topbar">
        <div
          onClick={(e) => {
            e.preventDefault();
            navigate("lobby");
          }}
        >
          <Logo />
        </div>
        <nav className="room-nav" aria-label="전시실 선택">
          {rooms.map((r) => (
            <button
              key={r.id}
              className={active === r.id ? "active" : ""}
              aria-pressed={active === r.id}
              onClick={() => navigate(r.id)}
              disabled={!ready}
            >
              <span>{r.no}</span>
              {r.id === "lobby" ? "로비" : r.name}
            </button>
          ))}
        </nav>
        <div className="top-actions">
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
          <button
            className={`icon-button ${panel === "settings" ? "on" : ""}`}
            onClick={() => setPanel(panel === "settings" ? null : "settings")}
            aria-label="화면 설정"
          >
            <SlidersHorizontal size={18} />
          </button>
          <span className="toolbar-divider" />
          <button
            className="overview-button"
            aria-label={active === "overview" ? "공간으로 돌아가기" : "전체 공간"}
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
        </div>
      </header>
      <div className="location-badge">
        <span className="live-dot" />
        <span>VIRTUAL EXHIBITION</span>
        <span className="location-divider">/</span>
        <span>{room.en}</span>
      </div>
      {!locked && (
        <section
          className={`space-caption ${active !== "lobby" && active !== "overview" ? "compact" : ""}`}
          key={active}
        >
          <div className="eyebrow">
            <span>{room.no}</span>
            <i />
            {room.en}
          </div>
          <h1>
            {active !== "lobby" && active !== "overview"
              ? room.name
              : room.title}
          </h1>
          <p>{room.description}</p>
          <button className="explore-link" onClick={() => setPanel("about")}>
            전시 소개 <ArrowUpRight size={14} />
          </button>
        </section>
      )}
      <div className="crosshair" aria-hidden="true" />
      <footer className="bottom-bar">
        <div className="control-hint">
          <Move size={15} />
          <span>
            {active === "overview"
              ? "드래그 회전 · 휠 확대"
              : locked
                ? "W A S D 이동 · 마우스 시선 · ESC 종료"
                : "드래그 시선 · 방향키 이동"}
          </span>
          <button aria-label="관람 방법" onClick={() => setPanel("help")}>
            <CircleHelp size={15} />
          </button>
        </div>
        <button
          className={`walk-button ${locked ? "is-walking" : ""}`}
          onClick={() =>
            locked ? document.exitPointerLock() : engine.current?.startWalk()
          }
          disabled={!ready}
        >
          {locked ? (
            <>
              <X size={16} />
              자유 관람 종료
            </>
          ) : (
            <>
              <MoveUpRight size={17} />
              자유 관람 시작<span>WASD</span>
            </>
          )}
        </button>
        <div className="bottom-actions">
          <span className="sound-note">천천히, 자유롭게.</span>
          <button
            className="icon-button"
            onClick={() => engine.current?.screenshot()}
            title="현재 화면 저장"
            aria-label="현재 화면 저장"
            disabled={!ready}
          >
            <Download size={17} />
          </button>
          <button
            className="icon-button"
            onClick={toggleFullscreen}
            title="전체 화면"
            aria-label={fullscreen ? "전체 화면 종료" : "전체 화면"}
          >
            {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
        </div>
      </footer>
      <aside className="map-wrap">
        <Map active={active} onNavigate={navigate} markerRef={marker} />
      </aside>
      <div className="touch-controls" aria-label="터치 이동">
        {[
          ["forward", ArrowUp],
          ["left", ArrowLeft],
          ["back", ArrowDown],
          ["right", ArrowRight],
        ].map(([d, Icon]) => (
          <button
            key={d}
            className={`touch-${d}`}
            aria-label={`${d === "forward" ? "앞으로" : d === "back" ? "뒤로" : d === "left" ? "왼쪽으로" : "오른쪽으로"} 이동`}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              engine.current?.setMove(d, true);
            }}
            onPointerUp={() => engine.current?.setMove(d, false)}
            onPointerCancel={() => engine.current?.setMove(d, false)}
          >
            <Icon size={20} />
          </button>
        ))}
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
      {panel === "settings" && (
        <Dialog title="화면 설정" onClose={() => setPanel(null)}>
          <span className="eyebrow">YOUR EXPERIENCE</span>
          <h2>편안한 관람을 위해.</h2>
          <p>화면에 맞는 빛과 선명도를 선택하세요.</p>
          <label className="setting-label">시간대</label>
          <div className="segmented">
            <button
              className={lighting === "day" ? "selected" : ""}
              onClick={() => setTimeOfDay("day")}
            >
              <Sun size={17} /> 낮의 빛
            </button>
            <button
              className={lighting === "evening" ? "selected" : ""}
              onClick={() => setTimeOfDay("evening")}
            >
              <Moon size={17} /> 저녁의 빛
            </button>
          </div>
          <label className="setting-label">화면 품질</label>
          <div className="segmented">
            <button
              className={quality === "high" ? "selected" : ""}
              onClick={() => {
                setQuality("high");
                engine.current?.setQuality("high");
              }}
            >
              섬세하게
            </button>
            <button
              className={quality === "balanced" ? "selected" : ""}
              onClick={() => {
                setQuality("balanced");
                engine.current?.setQuality("balanced");
              }}
            >
              가볍게
            </button>
          </div>
          <p className="fine-print">
            화면이 느리게 움직인다면 ‘가볍게’를 선택해 주세요.
          </p>
          <label className="setting-label" htmlFor="exposure">
            밝기
          </label>
          <input
            id="exposure"
            aria-label="밝기"
            type="range"
            min=".65"
            max="1.7"
            step=".01"
            value={exposure}
            onChange={(e) => {
              const value = Number(e.target.value);
              setExposure(value);
              engine.current?.setExposure(value);
            }}
          />
        </Dialog>
      )}
      {panel === "help" && (
        <Dialog title="관람 방법" onClose={() => setPanel(null)}>
          <span className="eyebrow">TAKE YOUR TIME</span>
          <h2>당신의 속도로 걸어보세요.</h2>
          <p>상단 메뉴나 작은 지도를 눌러 전시실로 이동할 수 있어요.</p>
          <div className="help-row">
            <span>
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd> 또는 방향키
            </span>
            <b>앞뒤 · 좌우 이동</b>
          </div>
          <div className="help-row">
            <span>마우스 드래그 / 터치</span>
            <b>시선 돌리기</b>
          </div>
          <div className="help-row">
            <span>작품 클릭</span>
            <b>작품 자세히 보기</b>
          </div>
          <div className="help-row">
            <span>
              <kbd>Shift</kbd>
            </span>
            <b>빠르게 이동</b>
          </div>
          <div className="help-row">
            <span>
              <kbd>Esc</kbd>
            </span>
            <b>자유 관람 종료</b>
          </div>
          <button
            className="primary-action"
            onClick={() => {
              setPanel(null);
              engine.current?.startWalk();
            }}
          >
            자유 관람 시작 <ArrowUpRight size={18} />
          </button>
        </Dialog>
      )}
      {panel === "about" && (
        <Dialog
          title="전시 소개"
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
                <span>{r.no}</span>
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
      {selected && (
        <Dialog
          title={selected.title}
          onClose={() => setSelected(null)}
          className="artwork-dialog"
        >
          {selected.src && (
            <div className="artwork-image">
              <img src={selected.src} alt={selected.title} />
            </div>
          )}
          <div className="artwork-info">
            <span className="eyebrow">{selected.kind} · COLLECTION</span>
            <h2>{selected.title}</h2>
            <p className="artist">{selected.artist_display}</p>
            <p>{selected.date_display}</p>
            <div className="artwork-rule" />
            <p>{selected.description}</p>
            {selected.url && (
              <a
                className="source-link"
                href={selected.url}
                target="_blank"
                rel="noreferrer"
              >
                소장처 · 원본 정보 <ExternalLink size={14} />
              </a>
            )}
            <button
              className="primary-action"
              onClick={() => setSelected(null)}
            >
              전시로 돌아가기 <ChevronRight size={17} />
            </button>
          </div>
        </Dialog>
      )}
    </main>
  );
}
