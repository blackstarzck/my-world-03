import { useEffect, useRef, useState } from "react";
import { indexEntries, modeLabel } from "./portfolio.js";
import { ArrowLeft, ArrowRight, ArrowUpRight, Box } from "lucide-react";

const DOT_RADIUS = 3;

export function GalleryNavigation({
  artworks,
  currentId,
  activeRoom,
  featured,
  traveling,
  progressRef,
  rooms,
  onPreview,
  onInspect,
}) {
  const index = artworks.findIndex((artwork) => artwork.id === currentId);
  const initial = Math.max(
    0,
    artworks.findIndex((artwork) => artwork.room === activeRoom),
  );
  const center = index < 0 ? initial : index;
  const dots = useRef(null);
  const focusedDot = useRef(false);

  useEffect(() => {
    if (focusedDot.current) {
      dots.current
        ?.querySelector('[aria-current="step"]')
        ?.focus({ preventScroll: true });
      focusedDot.current = false;
    }
  }, [currentId]);

  function preview(artwork, fromDot = false) {
    focusedDot.current = fromDot;
    onPreview(artwork);
  }
  function keydown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    let target;
    if (event.key === "ArrowLeft")
      target = index < 0 ? initial : Math.max(0, index - 1);
    else if (event.key === "ArrowRight")
      target = index < 0 ? initial : Math.min(artworks.length - 1, index + 1);
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = artworks.length - 1;
    else return;
    event.preventDefault();
    event.stopPropagation();
    preview(artworks[target], true);
  }

  return (
    <footer className="gallery-navigation" aria-label="프로젝트 탐색">
      {featured && activeRoom !== "overview" && (
        <div className="featured-caption" data-artwork-id={featured.id}>
          <p>{rooms.find((room) => room.id === featured.room)?.name}</p>
          <h1>{featured.projectName}</h1>
          <button onClick={() => onInspect(featured)}>
            프로젝트 열기 <ArrowUpRight size={15} />
          </button>
        </div>
      )}
      <nav
        className="gallery-pagination glass-surface"
        ref={progressRef}
        data-traveling={traveling}
        aria-label="프로젝트 탐색 순서"
        onKeyDown={keydown}
      >
        <button
          className="page-arrow"
          onClick={() => preview(artworks[index - 1], index === 1)}
          disabled={index <= 0}
          aria-label="이전 프로젝트로 이동"
        >
          <ArrowLeft size={17} />
        </button>
        <div
          className="artwork-dots"
          ref={dots}
          style={{
            "--dot-offset": DOT_RADIUS - center,
            "--dot-count": DOT_RADIUS * 2 + 1,
          }}
        >
          <div className="artwork-dots-track">
            {artworks.map((artwork, dotIndex) => (
              <button
                key={artwork.id}
                id={`artwork-dot-${artwork.id}`}
                aria-label={`${artwork.projectName} 프로젝트로 이동`}
                aria-current={index === dotIndex ? "step" : undefined}
                aria-hidden={
                  Math.abs(dotIndex - center) > DOT_RADIUS || undefined
                }
                tabIndex={dotIndex === center ? 0 : -1}
                className={
                  Math.abs(dotIndex - center) >= DOT_RADIUS ? "edge-dot" : ""
                }
                title={artwork.projectName}
                onClick={() => preview(artwork, true)}
              >
                <span />
                {index === dotIndex && (
                  <svg
                    className="dot-progress"
                    viewBox="0 0 24 24"
                    role="progressbar"
                    aria-label="카메라 이동 진행률"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={traveling ? 0 : 100}
                  >
                    <circle
                      className="dot-progress-track"
                      cx="12"
                      cy="12"
                      r="9"
                      pathLength="100"
                    />
                    <circle
                      className="dot-progress-value"
                      cx="12"
                      cy="12"
                      r="9"
                      pathLength="100"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
        <button
          className="page-arrow"
          onClick={() =>
            preview(
              artworks[index < 0 ? initial : index + 1],
              index === artworks.length - 2,
            )
          }
          disabled={!artworks.length || index === artworks.length - 1}
          aria-label="다음 프로젝트로 이동"
        >
          <ArrowRight size={17} />
        </button>
      </nav>
      {featured && (
        <span className="sr-only" role="status">
          {featured.title}.{" "}
          {traveling
            ? "프로젝트로 이동 중입니다."
            : "도착했습니다. 프로젝트 열기 버튼으로 설명을 볼 수 있습니다."}
        </span>
      )}
    </footer>
  );
}

export function ArtworkIndex({ artworks, rooms, currentId, onSelect }) {
  const scroll = useRef(null);
  const [query, setQuery] = useState(""),
    [roomFilter, setRoomFilter] = useState("all"),
    [view, setView] = useState("projects");
  const entries = indexEntries(artworks);
  const rows = (
    view === "projects"
      ? entries
      : artworks.map((artwork) => ({ artwork, project: artwork.projects[0] }))
  ).filter(
    ({ artwork, project }) =>
      (roomFilter === "all" || artwork.room === roomFilter) &&
      [
        artwork.title,
        artwork.projectName,
        artwork.shortName,
        project.name,
        project.sourceName,
        ...project.repositories,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  useEffect(() => {
    // 다시 열었을 때 마지막으로 감상한 작품부터 이어서 탐색합니다.
    scroll.current
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, []);
  return (
    <div className="artwork-index-scroll" ref={scroll}>
      <div className="artwork-index-content">
        <header className="artwork-index-heading">
          <p>PROJECT ARCHIVE</p>
          <h2>
            Projects <em>& case studies.</em>
          </h2>
          <p>
            {entries.length}개 프로젝트·사례 · {artworks.length}개 프로젝트 그룹
            위치
          </p>
        </header>
        <div className="index-controls">
          <label>
            프로젝트 검색
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="프로젝트명·저장소 검색"
            />
          </label>
          <label>
            공간
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
            >
              <option value="all">전체 공간</option>
              {rooms
                .filter((r) => r.id !== "lobby")
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </label>
          <div
            className="index-view-options"
            role="group"
            aria-label="목록 기준"
          >
            <button
              aria-pressed={view === "projects"}
              onClick={() => setView("projects")}
            >
              프로젝트별
            </button>
            <button
              aria-pressed={view === "artworks"}
              onClick={() => setView("artworks")}
            >
              그룹별
            </button>
          </div>
        </div>
        <p className="index-result-count" role="status">
          {rows.length}개 {view === "projects" ? "항목" : "그룹"}
        </p>
        <div
          className="artwork-index-list"
          role="list"
          aria-label="전체 프로젝트"
        >
          {rows.map(({ artwork, project }) => (
            <div
              role="listitem"
              key={view === "projects" ? project.sourceEntryId : artwork.id}
            >
              <button
                className="artwork-index-row"
                aria-label={`${view === "projects" ? project.sourceName || project.name : artwork.title} · ${rooms.find((room) => room.id === artwork.room)?.name} 프로젝트 열기`}
                aria-current={currentId === artwork.id ? "true" : undefined}
                onClick={() => onSelect(artwork, project.id)}
              >
                <span
                  className={`index-thumbnail ${artwork.src ? "" : "index-sculpture"}`}
                >
                  {artwork.src ? (
                    <img
                      src={artwork.src}
                      alt=""
                      loading="lazy"
                      width="120"
                      height="80"
                    />
                  ) : (
                    <Box size={30} strokeWidth={1} />
                  )}
                </span>
                <span className="index-artwork-title">
                  {view === "projects"
                    ? project.sourceName || project.name
                    : artwork.title}
                  <small>
                    {view === "projects" ? artwork.title : artwork.projectName}{" "}
                    · {modeLabel(project.mode)}
                  </small>
                </span>
                <span className="index-artwork-room">
                  {rooms.find((room) => room.id === artwork.room)?.name}
                </span>
                <ArrowUpRight
                  className="index-artwork-arrow"
                  size={25}
                  strokeWidth={1.3}
                />
              </button>
            </div>
          ))}
        </div>
        {!rows.length && (
          <p>일치하는 프로젝트가 없습니다. 검색어나 공간을 바꿔 보세요.</p>
        )}
        <p className="artwork-index-note">
          프로젝트를 선택하면 해당 위치로 이동한 뒤 상세 페이지를 엽니다.
        </p>
      </div>
    </div>
  );
}
