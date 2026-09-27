// Web Audio API Synthesizer for Trading Alerts (No external MP3 files needed)
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playBuyAlert(volume = 0.5) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Pleasant 3-note ascending chime (C5 -> E5 -> G5)
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);

      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(volume * 0.4, now + i * 0.1 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.4);
    });
  } catch (err) {
    console.error('Audio playback failed', err);
  }
}

export function playSellAlert(volume = 0.5) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Urgent 2-tone descending warning (G5 -> Eb5)
    const notes = [783.99, 622.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);

      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(volume * 0.3, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.3);
    });
  } catch (err) {
    console.error('Audio playback failed', err);
  }
}

export function playCloseAlert(volume = 0.5) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(392, now + 0.1);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch (err) {
    console.error('Audio playback failed', err);
  }
}
