import { useEffect, useRef } from "react";
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
    <footer className="gallery-navigation" aria-label="작품 탐색">
      {featured && (
        <div className="featured-caption">
          <p>{rooms.find((room) => room.id === featured.room)?.name}</p>
          <h1>{featured.title}</h1>
          <button onClick={() => onInspect(featured)}>
            작품 감상 <ArrowUpRight size={15} />
          </button>
        </div>
      )}
      <nav
        className="gallery-pagination glass-surface"
        ref={progressRef}
        data-traveling={traveling}
        aria-label="작품 페이지네이션"
        onKeyDown={keydown}
      >
        <button
          className="page-arrow"
          onClick={() => preview(artworks[index - 1], index === 1)}
          disabled={index <= 0}
          aria-label="이전 작품으로 이동"
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
                aria-label={`${artwork.title} 작품으로 이동`}
                aria-current={index === dotIndex ? "step" : undefined}
                aria-hidden={Math.abs(dotIndex - center) > DOT_RADIUS || undefined}
                tabIndex={dotIndex === center ? 0 : -1}
                className={
                  Math.abs(dotIndex - center) >= DOT_RADIUS ? "edge-dot" : ""
                }
                title={artwork.title}
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
          aria-label="다음 작품으로 이동"
        >
          <ArrowRight size={17} />
        </button>
      </nav>
      {featured && (
        <span className="sr-only" role="status">
          {featured.title}.{" "}
          {traveling
            ? "작품으로 이동 중입니다."
            : "도착했습니다. 작품 감상 버튼으로 설명을 볼 수 있습니다."}
        </span>
      )}
    </footer>
  );
}

export function ArtworkIndex({ artworks, rooms, currentId, onSelect }) {
  const scroll = useRef(null);
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
          <p>EXPLORE THE COLLECTION</p>
          <h2>
            Selected <em>works.</em>
          </h2>
        </header>
        <div
          className="artwork-index-list"
          role="list"
          aria-label="전체 전시 작품"
        >
          {artworks.map((artwork) => (
            <div role="listitem" key={artwork.id}>
              <button
                className="artwork-index-row"
                aria-label={`${artwork.title} · ${rooms.find((room) => room.id === artwork.room)?.name} 작품 감상`}
                aria-current={currentId === artwork.id ? "true" : undefined}
                onClick={() => onSelect(artwork)}
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
                <span className="index-artwork-title">{artwork.title}</span>
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
        <p className="artwork-index-note">
          작품을 선택하면 해당 전시 공간으로 이동합니다.
        </p>
      </div>
    </div>
  );
}
