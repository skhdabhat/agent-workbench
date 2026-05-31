import { useEffect, useState } from 'react';
import './IntroSplash.css';

const DURATION_MS = 5000;

interface IntroSplashProps {
  onComplete: () => void;
}

const BOOT_LINES = [
  'INITIALIZING NEURAL LINK...',
  'LOADING MCP RUNTIME...',
  'SYNC FUNCTION CALLING...',
  'SYSTEM READY',
];

export function IntroSplash({ onComplete }: IntroSplashProps) {
  const [phase, setPhase] = useState(0);
  const [bootLine, setBootLine] = useState(0);
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      onComplete();
      return;
    }

    const t1 = window.setTimeout(() => setPhase(1), 400);
    const t2 = window.setTimeout(() => setPhase(2), 1400);
    const t3 = window.setTimeout(() => setPhase(3), 2600);
    const t4 = window.setTimeout(() => setPhase(4), 3800);
    const t5 = window.setTimeout(() => {
      setExiting(true);
    }, 4600);
    const t6 = window.setTimeout(() => {
      onComplete();
    }, DURATION_MS);

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(100, ((now - start) / (DURATION_MS - 600)) * 100);
      setProgress(p);
      if (p < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const lineInterval = window.setInterval(() => {
      setBootLine((i) => Math.min(i + 1, BOOT_LINES.length - 1));
    }, 900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
      clearInterval(lineInterval);
      cancelAnimationFrame(raf);
    };
  }, [onComplete]);

  return (
    <div
      className={`intro-splash ${exiting ? 'intro-splash--exit' : ''} intro-splash--phase-${phase}`}
      role="presentation"
      aria-hidden
    >
      <div className="intro-noise" />
      <div className="intro-scanlines" />
      <div className="intro-grid" />
      <div className="intro-vignette" />

      <div className="intro-chromatic intro-chromatic--r" />
      <div className="intro-chromatic intro-chromatic--b" />

      <div className="intro-content">
        <div className="intro-logo-wrap">
          <div className="intro-logo-ring intro-logo-ring--outer" />
          <div className="intro-logo-ring intro-logo-ring--inner" />
          <div className="intro-logo-core">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="intro-logo-glitch" aria-hidden>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <h2 className="intro-title">
          <span className="intro-title-main">AGENT</span>
          <span className="intro-title-sub">WORKBENCH</span>
        </h2>
        <p className="intro-tagline">MCP · Function Calling · Visual Orchestration</p>
      </div>

      <div className="intro-footer">
        <div className="intro-boot-line">
          <span className="intro-boot-prefix">&gt;</span>
          {BOOT_LINES[bootLine]}
          <span className="intro-boot-cursor" />
        </div>
        <div className="intro-progress-track">
          <div className="intro-progress-fill" style={{ width: `${progress}%` }} />
          <div className="intro-progress-glow" style={{ left: `${progress}%` }} />
        </div>
        <div className="intro-progress-meta">
          <span>SYS.BOOT</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      <div className="intro-flash" />
    </div>
  );
}
