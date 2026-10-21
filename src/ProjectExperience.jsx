import { useEffect, useState } from "react";
import { ExternalLink, LoaderCircle } from "lucide-react";
import { approvedExperienceUrl } from "./portfolio.js";
import "./project-experience.css";

function WebApp({ project, url }) {
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 15000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="web-app">
      <iframe
        title={`${project.name} 웹앱 체험`}
        src={url}
        sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups"
        allow="fullscreen; gamepad"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => setLoaded(true)}
        onError={() => setSlow(true)}
      />
      {!loaded && (
        <span className="experience-loading" role="status">
          <LoaderCircle className="spin" size={14} />
          {slow
            ? "로딩이 지연되고 있어요. 원본에서도 열 수 있습니다."
            : "웹앱을 불러오고 있어요"}
        </span>
      )}
    </div>
  );
}

export function ProjectExperience({ project }) {
  const url = approvedExperienceUrl(project);
  if (!url) return null;
  return (
    <section className="experience-shell" aria-label={`${project.name} 웹앱 체험`}>
      <div className="experience-toolbar">
        <span>직접 실행</span>
        <a href={url} target="_blank" rel="noreferrer">
          원본 열기 <ExternalLink size={15} />
        </a>
      </div>
      <div className="experience-surface">
        <WebApp key={project.id + url} project={project} url={url} />
      </div>
    </section>
  );
}
