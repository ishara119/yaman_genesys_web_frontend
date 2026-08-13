const BPM = 124;
const STEP_DURATION = 60 / BPM / 4; // 16th notes
const STEPS_PER_BAR = 16;

const KICK_STEPS = new Set([0, 4, 8, 12]);
const HAT_STEPS = new Set([2, 6, 10, 14]);
const ARP_STEPS = new Set([0, 2, 4, 6, 8, 10, 12, 14]);
const ARP_NOTES = [164.81, 196.0, 246.94, 293.66]; // E3, G3, B3, D4
const BASS_ROOT = 82.41; // E2

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor {
  return (window.AudioContext ||
    (window as unknown as { webkitAudioContext: AudioContextCtor }).webkitAudioContext);
}

interface BassNodes {
  oscA: OscillatorNode;
  oscB: OscillatorNode;
  filter: BiquadFilterNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  gain: GainNode;
}

export class MusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private delay: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayWet: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private bass: BassNodes | null = null;

  private playing = false;
  private currentStep = 0;
  private nextNoteTime = 0;
  private timerId: number | null = null;

  private ensureContext() {
    if (this.ctx) return this.ctx;

    const Ctor = getAudioContextCtor();
    const ctx = new Ctor();
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(ctx.destination);

    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = STEP_DURATION * 2;
    const delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0.28;
    const delayWet = ctx.createGain();
    delayWet.gain.value = 0.25;
    delay.connect(delayFeedback);
    delayFeedback.connect(delay);
    delay.connect(delayWet);
    delayWet.connect(masterGain);

    const bufferSize = ctx.sampleRate; // 1 second of noise
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    this.ctx = ctx;
    this.masterGain = masterGain;
    this.delay = delay;
    this.delayFeedback = delayFeedback;
    this.delayWet = delayWet;
    this.noiseBuffer = noiseBuffer;

    return ctx;
  }

  private startBass() {
    const ctx = this.ctx!;
    const masterGain = this.masterGain!;

    const oscA = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscA.frequency.value = BASS_ROOT;
    oscA.detune.value = -6;

    const oscB = ctx.createOscillator();
    oscB.type = 'sawtooth';
    oscB.frequency.value = BASS_ROOT;
    oscB.detune.value = 6;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 450;
    filter.Q.value = 0.7;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.055;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const gain = ctx.createGain();
    gain.gain.value = 0.26;

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    oscA.start();
    oscB.start();
    lfo.start();

    this.bass = { oscA, oscB, filter, lfo, lfoGain, gain };
  }

  private stopBass() {
    if (!this.bass) return;
    const { oscA, oscB, lfo } = this.bass;
    try {
      oscA.stop();
      oscB.stop();
      lfo.stop();
    } catch {
      // already stopped
    }
    this.bass = null;
  }

  private playKick(time: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const gain = ctx.createGain();

    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(time);
    osc.stop(time + 0.3);
  }

  private playHat(time: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 8500;
    filter.Q.value = 0.6;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    src.start(time);
    src.stop(time + 0.06);
  }

  private playArpNote(freq: number, time: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2200;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.22, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    gain.connect(this.delay!);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  private scheduleStep(step: number, time: number) {
    if (KICK_STEPS.has(step)) this.playKick(time);
    if (HAT_STEPS.has(step)) this.playHat(time);
    if (ARP_STEPS.has(step)) {
      const noteIndex = Math.floor(step / 2) % ARP_NOTES.length;
      this.playArpNote(ARP_NOTES[noteIndex], time);
    }
  }

  private scheduler = () => {
    const ctx = this.ctx!;
    while (this.nextNoteTime < ctx.currentTime + 0.1) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.nextNoteTime += STEP_DURATION;
      this.currentStep = (this.currentStep + 1) % STEPS_PER_BAR;
    }
    this.timerId = window.setTimeout(this.scheduler, 25);
  };

  async start() {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') await ctx.resume();
    if (this.playing) return;

    this.playing = true;
    this.stopBass();
    this.startBass();

    this.currentStep = 0;
    this.nextNoteTime = ctx.currentTime + 0.05;

    const masterGain = this.masterGain!;
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1.5);

    this.scheduler();
  }

  stop() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const masterGain = this.masterGain;

    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);

    this.playing = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.stopBass();
  }

  isPlaying() {
    return this.playing;
  }
}
