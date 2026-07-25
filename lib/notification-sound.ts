/** Shared notification sound preference + louder alert tone for staff UI. */

let soundEnabled = true;
const listeners = new Set<() => void>();
let sharedCtx: AudioContext | null = null;
let unlockBound = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new AC();
  }
  return sharedCtx;
}

/** Resume Web Audio after a user gesture (needed in Tauri / strict autoplay). */
export function unlockNotificationAudio() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
}

function ensureUnlockListeners() {
  if (unlockBound || typeof window === "undefined") return;
  unlockBound = true;
  const unlock = () => {
    unlockNotificationAudio();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
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
  ensureUnlockListeners();

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    // Still suspended (no prior gesture) — nothing we can play yet.
    if (ctx.state !== "running") return;

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
  } catch {
    /* autoplay policy or unsupported environment */
  }
}
