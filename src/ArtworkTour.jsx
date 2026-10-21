import { useEffect, useRef, useState } from "react";
import { approvedExperienceUrl, modeLabel } from "./portfolio.js";
import { ArrowLeft, ArrowRight, ExternalLink, Maximize2, Minimize2, X } from "lucide-react";
import "./project-detail.css";

export function ArtworkPanel({ artwork, project, room, onClose, onStep,
  onOpenIndex, onProjectChange, children }) {
  const root = useRef(null), close = useRef(null), layout = useRef(null), description = useRef(null), expand = useRef(null);
  const [presentation, setPresentation] = useState({ projectId: project.id, view: "painting", expanded: false });
  const [visitedProject, setVisitedProject] = useState(null);
  const current = presentation.projectId === project.id;
  const view = current ? presentation.view : "painting";
  const expanded = current && presentation.expanded;
  const story = project.story || {}, url = approvedExperienceUrl(project);
  const summary = story.summary || project.details || project.summary;
  const image = artwork.artworkImage;
  const hasLinks = Boolean(url || project.repoUrls.length || project.optionalDemos?.length);
  function setView(next) {
    if (next === "experience") setVisitedProject(project.id);
    setPresentation({ projectId: project.id, view: next, expanded });
  }
  function toggleExpanded() {
    setPresentation({ projectId: project.id, view, expanded: !expanded });
    expand.current?.focus({ preventScroll: true });
  }
  useEffect(() => {
    setPresentation({ projectId: project.id, view: "painting", expanded: false });
    setVisitedProject(null);
    description.current?.scrollTo(0, 0);
    layout.current?.scrollTo(0, 0);
  }, [project.id]);
  useEffect(() => { close.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const handler = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (expanded) toggleExpanded();
        else onClose();
      }
      if (event.key !== "Tab") return;
      const nodes = [...root.current.querySelectorAll(
        'button:not(:disabled),a[href],select,iframe,[tabindex="0"],summary',
      )].filter((node) => node.getClientRects().length && !node.closest("[hidden]"));
      const first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, expanded, project.id, view]);
  return (
    <section ref={root} className={`project-detail-page ${expanded ? "is-expanded" : ""}`}
      data-artwork-id={artwork.id}
      role="dialog" aria-modal="true" aria-labelledby="project-detail-title">
      <header className="project-detail-header">
        <span className="project-breadcrumb">{room.name}</span>
        <nav aria-label="프로젝트 이동">
          <button onClick={() => onStep(-1)} aria-label="이전 프로젝트"><ArrowLeft size={17} /></button>
          <button onClick={onOpenIndex}>전체 프로젝트</button>
          <button onClick={() => onStep(1)} aria-label="다음 프로젝트"><ArrowRight size={17} /></button>
          <button ref={close} onClick={onClose} aria-label="프로젝트 닫기"><X size={21} /></button>
        </nav>
      </header>
      <div ref={layout} className="project-detail-layout">
        <div className="project-media-column">
          <div className="project-media-toolbar">
            {url && (
              <div className="project-detail-tabs" role="group" aria-label="프로젝트 보기">
                <button aria-pressed={view === "painting"} onClick={() => setView("painting")}>그림 보기</button>
                <button aria-pressed={view === "experience"} onClick={() => setView("experience")}>
                  프로젝트 체험
                </button>
              </div>
            )}
            <button ref={expand} className="project-expand" onClick={toggleExpanded}
              aria-expanded={expanded} aria-label={expanded ? "설명과 함께 보기" : "크게 보기"}>
              {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              <span>{expanded ? "설명 보기" : "크게 보기"}</span>
            </button>
          </div>
          <div className="project-painting-view" hidden={view !== "painting"}>
            <div className="project-painting-stage">
              <img src={image.detail} alt={image.alt} width={image.width} height={image.height}
                decoding="async" onError={(event) => {
                  if (!event.currentTarget.dataset.fallback) {
                    event.currentTarget.dataset.fallback = "true";
                    event.currentTarget.src = image.gallery;
                  }
                }} />
            </div>
            <div className="project-painting-caption"><span>{artwork.projectName}</span><span>{image.style}</span></div>
          </div>
          {url && visitedProject === project.id && (
            <div className="project-experience-content" hidden={view !== "experience"}>{children}</div>
          )}
        </div>
        <div ref={description} className="project-case-scroll" hidden={expanded}>
          <article className="project-case">
            <header className="project-case-hero">
              <p className="project-case-label">{room.id} / PROJECT CASE STUDY</p>
              <h1 id="project-detail-title">{project.name}</h1>
              <p className="project-case-summary">{summary}</p>
              {artwork.projects.length > 1 && (
                <label className="project-related-picker">관련 프로젝트
                  <select value={project.id} onChange={(event) => onProjectChange(event.target.value)}>
                    {artwork.projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
              )}
              <dl className="project-facts">
                <div><dt>프로젝트 형태</dt><dd>{modeLabel(project.mode)}</dd></div>
                <div>
                  <dt>{story.contribution?.length || artwork.role ? "담당 범위" : "구현 범위"}</dt>
                  <dd>{story.contribution?.[0] || artwork.role || story.implementation?.slice(0, 2).map(item => item.title).join(" · ")}</dd>
                </div>
              </dl>
              {project.skills?.length > 0 && <ul className="project-tech" aria-label="사용 기술">
                {project.skills.map((skill) => <li key={skill}>{skill}</li>)}
              </ul>}
            </header>
            <div className="project-case-main">
              {story.contribution?.length > 0 && <section>
                <h2>담당 역할과 범위</h2>
                <ul>{story.contribution.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>}
              {story.context && <section><h2>문제와 제약</h2><p>{story.context}</p></section>}
              {story.implementation?.length > 0 && <section>
                <h2>핵심 구현과 선택 이유</h2>
                <div className="implementation-notes">{story.implementation.map((item, i) => <section key={item.title}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <div><h3>{item.title}</h3><p>{item.body}</p></div>
                </section>)}</div>
              </section>}
              {story.evidence?.length > 0 && <section>
                <h2>결과와 확인 근거</h2>
                <ul className="project-evidence">{story.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>}
              {story.limitations?.length > 0 && <details className="project-scope-note">
                <summary>프로젝트 범위와 제한</summary>
                <ul>{story.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
              </details>}
              {hasLinks && <section className="project-resources">
                <h2>코드와 링크</h2>
                {url && <>
                  <p>프로젝트 체험에서 실제 웹앱을 조작할 수 있습니다.</p>
                  <button className="project-text-action" onClick={() => setView("experience")}>
                    프로젝트 체험<ArrowRight size={15} />
                  </button>
                </>}
                <div className="project-references">
                  {url && <a href={url} target="_blank" rel="noreferrer">서비스 열기<ExternalLink size={14} /></a>}
                  {project.repoUrls.map((link, i) => <a key={link} href={link} target="_blank" rel="noreferrer">
                    {project.repositories[i] || project.name} · GitHub<ExternalLink size={13} />
                  </a>)}
                  {project.optionalDemos?.map((item) => <a key={item.url} href={item.url} target="_blank" rel="noreferrer">
                    {item.label}<ExternalLink size={13} />
                  </a>)}
                </div>
              </section>}
            </div>
            <footer className="project-case-footer">
              <button onClick={() => onStep(-1)}><ArrowLeft size={16} />이전 프로젝트</button>
              <button onClick={() => onStep(1)}>다음 프로젝트<ArrowRight size={16} /></button>
            </footer>
          </article>
        </div>
      </div>
    </section>
  );
}
