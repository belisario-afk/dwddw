import type { Posture } from '@shared/schema';

// Singleton Audio Engine for spatial audio processing
class AudioEngine {
  private static instance: AudioEngine | null = null;
  
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private pannerNode: PannerNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | AudioBufferSourceNode | null = null;
  private sensationFilter: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;
  
  private userHeight: number = 1.7; // meters
  private posture: Posture = 'standing';
  private smoothingFactor: number = 0.8;
  private lastFrequencyData: Float32Array | null = null;
  private sensationEnabled: boolean = true;
  private currentPosition: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  
  // Frequency bands for visualization
  private bassRange = { min: 0, max: 250 };
  private midsRange = { min: 250, max: 2000 };
  private highsRange = { min: 2000, max: 20000 };

  private constructor() {}

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  async initialize(): Promise<void> {
    if (this.audioContext) return;
    
    this.audioContext = new AudioContext();
    
    // Create analyser node for frequency visualization
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = this.smoothingFactor;
    
    // Create panner node with HRTF for spatial audio
    this.pannerNode = this.audioContext.createPanner();
    this.pannerNode.panningModel = 'HRTF';
    this.pannerNode.distanceModel = 'inverse';
    this.pannerNode.refDistance = 1;
    this.pannerNode.maxDistance = 10000;
    this.pannerNode.rolloffFactor = 1;
    this.pannerNode.coneInnerAngle = 360;
    this.pannerNode.coneOuterAngle = 360;
    this.pannerNode.coneOuterGain = 0;
    
    // Create sensation filter (high-shelf boost at 5kHz for tickle effect)
    this.sensationFilter = this.audioContext.createBiquadFilter();
    this.sensationFilter.type = 'highshelf';
    this.sensationFilter.frequency.value = 5000;
    this.sensationFilter.gain.value = 0; // Off by default
    
    // Gain node for volume control
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1;
    
    // Connect nodes: source -> panner -> sensationFilter -> analyser -> destination
    this.pannerNode.connect(this.sensationFilter);
    this.sensationFilter.connect(this.analyserNode);
    this.analyserNode.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
    
    // Initialize frequency data array
    this.lastFrequencyData = new Float32Array(this.analyserNode.frequencyBinCount);
    
    console.log('✓ Audio Engine initialized');
  }

  // Set audio source from HTML audio element
  setAudioSource(audioElement: HTMLAudioElement): void {
    if (!this.audioContext || !this.pannerNode) {
      console.warn('Audio engine not initialized');
      return;
    }
    
    // Disconnect existing source
    if (this.sourceNode) {
      this.sourceNode.disconnect();
    }
    
    this.sourceNode = this.audioContext.createMediaElementSource(audioElement);
    this.sourceNode.connect(this.pannerNode);
  }

  // Set spatial position with coordinate transformation based on posture
  setPosition(x: number, y: number, z: number): void {
    if (!this.pannerNode || !this.audioContext) return;
    
    const transformed = this.transformCoordinates(x, y, z);
    this.currentPosition = transformed;
    const currentTime = this.audioContext.currentTime;
    
    this.pannerNode.positionX.setValueAtTime(transformed.x, currentTime);
    this.pannerNode.positionY.setValueAtTime(transformed.y, currentTime);
    this.pannerNode.positionZ.setValueAtTime(transformed.z, currentTime);
    
    // Update sensation filter based on distance
    this.updateSensationFilter(transformed);
  }

  // Transform coordinates based on posture
  private transformCoordinates(x: number, y: number, z: number): { x: number; y: number; z: number } {
    const heightScale = this.userHeight / 1.7; // Normalize to default height
    
    switch (this.posture) {
      case 'standing':
        // Standard 3D audio space
        return { x, y: y * heightScale, z };
        
      case 'sitting':
        // Lower Y-axis center, compressed vertical bounds
        const sittingYOffset = -0.4 * heightScale;
        const verticalCompression = 0.7;
        return { 
          x, 
          y: (y * verticalCompression + sittingYOffset) * heightScale, 
          z 
        };
        
      case 'lying':
        // Rotate coordinate system 90 degrees on X-axis
        // Y becomes -Z, Z becomes Y
        return { 
          x, 
          y: -z * heightScale, 
          z: y * heightScale 
        };
        
      default:
        return { x, y, z };
    }
  }

  // Update sensation filter based on distance to listener
  private updateSensationFilter(pos: { x: number; y: number; z: number }): void {
    if (!this.sensationFilter) return;
    
    // Only apply sensation if enabled
    if (!this.sensationEnabled) {
      this.sensationFilter.gain.value = 0;
      return;
    }
    
    const distance = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
    
    // Apply tickle sensation when distance < 0.5m
    if (distance < 0.5) {
      const intensity = (0.5 - distance) / 0.5; // 0 to 1
      this.sensationFilter.gain.value = intensity * 12; // Max 12dB boost
    } else {
      this.sensationFilter.gain.value = 0;
    }
  }

  // Set posture mode
  setPosture(posture: Posture): void {
    this.posture = posture;
  }

  // Set user height for calibration
  setUserHeight(height: number): void {
    this.userHeight = Math.max(0.5, Math.min(2.5, height)); // Clamp to reasonable range
  }

  // Get frequency data with time-domain smoothing
  getFrequencyData(): Float32Array {
    if (!this.analyserNode || !this.lastFrequencyData) {
      return new Float32Array(1024);
    }
    
    const rawData = new Float32Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getFloatFrequencyData(rawData);
    
    // Apply additional smoothing
    for (let i = 0; i < rawData.length; i++) {
      this.lastFrequencyData[i] = 
        this.smoothingFactor * this.lastFrequencyData[i] + 
        (1 - this.smoothingFactor) * rawData[i];
    }
    
    return this.lastFrequencyData;
  }

  // Get bass level (normalized 0-1)
  getBassLevel(): number {
    return this.getFrequencyRangeLevel(this.bassRange.min, this.bassRange.max);
  }

  // Get mids level (normalized 0-1)
  getMidsLevel(): number {
    return this.getFrequencyRangeLevel(this.midsRange.min, this.midsRange.max);
  }

  // Get highs level (normalized 0-1)
  getHighsLevel(): number {
    return this.getFrequencyRangeLevel(this.highsRange.min, this.highsRange.max);
  }

  // Get frequency range level helper
  private getFrequencyRangeLevel(minHz: number, maxHz: number): number {
    if (!this.analyserNode) return 0;
    
    const freqData = this.getFrequencyData();
    const sampleRate = this.audioContext?.sampleRate || 44100;
    const binSize = sampleRate / (this.analyserNode.fftSize || 2048);
    
    const minBin = Math.floor(minHz / binSize);
    const maxBin = Math.min(Math.ceil(maxHz / binSize), freqData.length - 1);
    
    let sum = 0;
    let count = 0;
    
    for (let i = minBin; i <= maxBin; i++) {
      // Convert from dB to linear scale and normalize
      const normalizedValue = (freqData[i] + 100) / 100; // Assuming -100dB to 0dB range
      sum += Math.max(0, normalizedValue);
      count++;
    }
    
    return count > 0 ? Math.min(1, sum / count) : 0;
  }

  // Resume audio context (required for user interaction)
  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  // Suspend audio context
  async suspend(): Promise<void> {
    if (this.audioContext?.state === 'running') {
      await this.audioContext.suspend();
    }
  }

  // Get current state
  getState(): AudioContextState | null {
    return this.audioContext?.state || null;
  }

  // Set sensation filter enabled/disabled
  setSensationEnabled(enabled: boolean): void {
    this.sensationEnabled = enabled;
    // Re-evaluate sensation filter based on current position
    this.updateSensationFilter(this.currentPosition);
  }

  // Clean up resources
  dispose(): void {
    if (this.sourceNode) this.sourceNode.disconnect();
    if (this.pannerNode) this.pannerNode.disconnect();
    if (this.sensationFilter) this.sensationFilter.disconnect();
    if (this.analyserNode) this.analyserNode.disconnect();
    if (this.gainNode) this.gainNode.disconnect();
    if (this.audioContext) this.audioContext.close();
    
    AudioEngine.instance = null;
  }
}

export const audioEngine = AudioEngine.getInstance();
export default AudioEngine;
