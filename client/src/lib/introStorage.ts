const INTRO_STORAGE_KEY = 'agent-workbench-intro-v1';

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
