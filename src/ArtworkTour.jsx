import { useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  LoaderCircle,
  X,
} from "lucide-react";

export function ArtworkPanel({
  artwork,
  room,
  traveling,
  onClose,
  onStep,
  onOpenIndex,
}) {
  const heading = useRef(null),
    scroll = useRef(null),
    actions = useRef({ onClose, onStep });
  actions.current = { onClose, onStep };
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    if (scroll.current) scroll.current.scrollTop = 0;
  }, [artwork.id]);
  useEffect(() => {
    const keydown = (event) => {
      if (
        heading.current?.closest("[inert]") ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.target.closest("input, textarea, select, [contenteditable]")
      )
        return;
      if (event.key === "Escape") {
        event.preventDefault();
        actions.current.onClose();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        actions.current.onStep(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        actions.current.onStep(1);
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);
  return (
    <>
      <div className="artwork-view-label" aria-live="polite">
        {traveling ? <LoaderCircle className="spin" size={12} /> : <i />}
        {traveling ? "작품으로 이동 중" : "IN THE GALLERY"}
      </div>
      <aside className="artwork-panel" aria-labelledby="artwork-title">
        <div className="artwork-panel-header">
          <button
            className="artwork-index-link"
            onClick={onOpenIndex}
            aria-haspopup="dialog"
          >
            전체 작품
          </button>
          <button
            className="icon-button artwork-close"
            onClick={onClose}
            aria-label="작품 설명 닫기 · 전시실 정문으로"
            title="전시실 정문으로 돌아가기 (Esc)"
          >
            <X size={20} strokeWidth={1.3} />
          </button>
        </div>
        <div className="artwork-panel-scroll" ref={scroll}>
          <p className="artwork-location">{room.name}</p>
          <span className="artwork-kind">{artwork.kind}</span>
          <h2 id="artwork-title" ref={heading} tabIndex={-1}>
            {artwork.title}
          </h2>
          <dl className="artwork-facts">
            <div>
              <dt>DATE</dt>
              <dd>{artwork.date_display}</dd>
            </div>
          </dl>
          <section className="artwork-story" aria-label="작품 소개">
            <h3>작품에 대하여</h3>
            <p>{artwork.description}</p>
          </section>
          {artwork.url && (
            <a
              className="source-link"
              href={artwork.url}
              target="_blank"
              rel="noreferrer"
            >
              소장처 · 원본 정보 <ExternalLink size={13} />
            </a>
          )}
          <p className="artwork-view-note">
            전시 공간의 작품을 감상하고 있습니다.
            <br />
            X를 누르면 이 전시실의 정문으로 돌아갑니다.
          </p>
        </div>
        <nav className="artwork-pagination" aria-label="작품 간 이동">
          <button onClick={() => onStep(-1)} aria-label="이전 작품">
            <ArrowLeft size={17} />
            <span>이전 작품</span>
          </button>
          <button onClick={() => onStep(1)} aria-label="다음 작품">
            <span>다음 작품</span>
            <ArrowRight size={17} />
          </button>
        </nav>
      </aside>
      <span className="sr-only" role="status">
        {artwork.title}. 좌우 방향키로 작품 이동, Escape로 전시실 정문으로
        돌아가기.
      </span>
    </>
  );
}
