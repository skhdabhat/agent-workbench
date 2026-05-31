const INTRO_STORAGE_KEY = 'agent-workbench-intro-v1';

/** URL 加 ?intro=1 可强制重播开场（便于线上 Demo 演示） */
export function shouldForceIntro(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('intro') === '1';
}

export function hasSeenIntro(): boolean {
  try {
    return localStorage.getItem(INTRO_STORAGE_KEY) != null;
  } catch {
    return false;
  }
}

export function markIntroSeen(): void {
  try {
    localStorage.setItem(INTRO_STORAGE_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}
