/** Shared notification sound preference + louder alert tone for staff UI. */

let soundEnabled = true;
const listeners = new Set<() => void>();
let sharedCtx: AudioContext | null = null;
let unlockBound = false;

type AudioContextState = AudioContext["state"] | "interrupted";

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

function getAudioContext(): AudioContext | null {
  const AC = getAudioContextConstructor();
  if (!AC) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new AC();
  }
  return sharedCtx;
}

async function resumeContext(ctx: AudioContext): Promise<boolean> {
  try {
    if ((ctx.state as AudioContextState) === "suspended" || (ctx.state as AudioContextState) === "interrupted") {
      await ctx.resume();
    }
  } catch {
    /* ignore */
  }
  return ctx.state === "running";
}

function playToneOnContext(ctx: AudioContext) {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.9, now + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
  master.connect(ctx.destination);

  const playNote = (freq: number, start: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.55, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  };

  playNote(880, now, 0.18);
  playNote(1174.66, now + 0.2, 0.28);
}

/** Resume Web Audio after a user gesture (needed in Tauri / strict autoplay). */
export function unlockNotificationAudio() {
  const ctx = getAudioContext();
  if (!ctx) return;
  void resumeContext(ctx);
}

/** Keep audio unlock armed for the whole dashboard session (cable alerts arrive later). */
export function armNotificationAudioUnlock() {
  if (unlockBound || typeof window === "undefined") return;
  unlockBound = true;

  const unlock = () => unlockNotificationAudio();
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") unlock();
  });
}

export function isNotificationSoundEnabled() {
  return soundEnabled;
}

export function setNotificationSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  listeners.forEach((fn) => fn());
}

export function subscribeNotificationSoundEnabled(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Play a short two-tone chime (audible on busy kitchen floors). */
export async function playNotificationTone() {
  if (!soundEnabled) return;
  armNotificationAudioUnlock();

  try {
    // Prefer a warm shared context (works for ActionCable callbacks after a prior gesture).
    const shared = getAudioContext();
    if (shared && (await resumeContext(shared))) {
      playToneOnContext(shared);
      return;
    }

    // Fallback: fresh context (sticky user activation may allow this after any click).
    const AC = getAudioContextConstructor();
    if (!AC) return;
    const fresh = new AC();
    if (!(await resumeContext(fresh))) {
      void fresh.close();
      return;
    }
    playToneOnContext(fresh);
    window.setTimeout(() => {
      void fresh.close();
    }, 700);
  } catch {
    /* autoplay policy or unsupported environment */
  }
}
