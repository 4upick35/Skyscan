
/**
 * @fileOverview Ультимативное аудио-ядро Umbrella Corp v12.4 (Extreme Anti-Pop & Background Atmosphere).
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isEnabled = false;
  private isHumRunning = false;
  private fadeTime = 0.2;

  // Фоновые звуки
  private bgSource: AudioBufferSourceNode | null = null;
  private bgGain: GainNode | null = null;
  private currentBgUrl: string | null = null;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.softMute();
        } else if (this.isEnabled) {
          this.softUnmute();
        }
      });
    }
  }

  private async softUnmute() {
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.exponentialRampToValueAtTime(1.0, now + this.fadeTime);
  }

  private async softMute() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.exponentialRampToValueAtTime(0.001, now + this.fadeTime);
  }

  public async enable() {
    this.initContext();
    this.isEnabled = true;
    await this.softUnmute();
    this.startHum();
  }

  public disable() {
    this.isEnabled = false;
    this.softMute();
    this.isHumRunning = false;
    this.stopBackground();
  }

  private startHum() {
    if (!this.ctx || !this.isEnabled || this.isHumRunning || !this.masterGain) return;
    this.isHumRunning = true;
    const now = this.ctx.currentTime;
    const humGain = this.ctx.createGain();
    humGain.gain.setValueAtTime(0.001, now);
    humGain.gain.exponentialRampToValueAtTime(0.1, now + 3.0);
    humGain.connect(this.masterGain);
    const lowPass = this.ctx.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.setValueAtTime(60, now);
    lowPass.connect(humGain);
    const sub = this.ctx.createOscillator();
    sub.frequency.value = 32;
    sub.connect(lowPass);
    sub.start();
  }

  private async loadBuffer(url: string): Promise<AudioBuffer> {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to load audio: ${url}`);
    const arrayBuffer = await resp.arrayBuffer();
    return await this.ctx!.decodeAudioData(arrayBuffer);
  }

  public async playBackground(url: string) {
    if (!this.ctx || !this.isEnabled || !this.masterGain) return;
    if (this.currentBgUrl === url) return;
    
    // Плавное затухание старого звука перед запуском нового
    if (this.bgGain) {
      const now = this.ctx.currentTime;
      this.bgGain.gain.cancelScheduledValues(now);
      this.bgGain.gain.linearRampToValueAtTime(0.001, now + 1.0);
      const oldSource = this.bgSource;
      setTimeout(() => oldSource?.stop(), 1100);
    }

    this.currentBgUrl = url;

    try {
      const buffer = await this.loadBuffer(url);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      // Фоновые звуки Umbrella v12.4: 0.2 для погружения
      gain.gain.exponentialRampToValueAtTime(0.2, this.ctx.currentTime + 2);

      source.connect(gain);
      gain.connect(this.masterGain);
      source.start(0);

      this.bgSource = source;
      this.bgGain = gain;
    } catch (e) {
      console.error("BG_AUDIO_FAILED:", url, e);
      this.currentBgUrl = null;
    }
  }

  public stopBackground() {
    if (this.bgGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.bgGain.gain.cancelScheduledValues(now);
      this.bgGain.gain.setValueAtTime(this.bgGain.gain.value, now);
      this.bgGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      
      const sourceToStop = this.bgSource;
      setTimeout(() => {
        try { sourceToStop?.stop(); } catch(e) {}
      }, 1600);
    }
    this.bgSource = null;
    this.bgGain = null;
    this.currentBgUrl = null;
  }

  public playExternal(url: string) {
    if (!this.ctx || !this.isEnabled || !this.masterGain) return;
    const audio = new Audio(url);
    const source = this.ctx.createMediaElementSource(audio);
    source.connect(this.masterGain);
    audio.play().catch(e => console.error("External audio failed", e));
  }

  public playPrinter() {
    if (!this.ctx || !this.isEnabled || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.8);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.9);
  }

  public playClick() {
    if (!this.ctx || !this.isEnabled || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(20, now + 0.1);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playWhoosh() {
    if (!this.ctx || !this.isEnabled || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) output[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, now);
    filter.frequency.exponentialRampToValueAtTime(20, now + 1.0);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start(now);
    source.stop(now + 1.1);
  }

  public playError() {
    if (!this.ctx || !this.isEnabled || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.linearRampToValueAtTime(25, now + 0.8);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.9);
  }
}

export const audioEngine = typeof window !== 'undefined' ? new AudioEngine() : null;
