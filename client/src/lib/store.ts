import { create } from 'zustand';
import type { PathPoint, Posture, Preset } from '@shared/schema';

export type AppMode = 'visualizer' | 'editor';

interface StudioState {
  // Core state
  mode: AppMode;
  posture: Posture;
  userHeight: number;
  autoPlayPresets: boolean;
  sensationEnabled: boolean;
  
  // Path state for spatial audio editor
  currentPath: PathPoint[];
  isRecording: boolean;
  isPlaying: boolean;
  playbackIndex: number;
  
  // Audio state
  isAudioLoaded: boolean;
  isAudioPlaying: boolean;
  audioFile: File | null;
  
  // Orb position for editor mode
  orbPosition: { x: number; y: number; z: number };
  
  // Presets
  presets: Preset[];
  selectedPresetId: number | null;
  
  // Actions
  setMode: (mode: AppMode) => void;
  setPosture: (posture: Posture) => void;
  setUserHeight: (height: number) => void;
  setAutoPlayPresets: (autoPlay: boolean) => void;
  setSensationEnabled: (enabled: boolean) => void;
  
  // Path actions
  setCurrentPath: (path: PathPoint[]) => void;
  clearPath: () => void;
  addPathPoint: (point: PathPoint) => void;
  
  // Recording/playback actions
  startRecording: () => void;
  stopRecording: () => void;
  startPlayback: () => void;
  stopPlayback: () => void;
  setPlaybackIndex: (index: number) => void;
  
  // Audio actions
  setAudioLoaded: (loaded: boolean) => void;
  setAudioPlaying: (playing: boolean) => void;
  setAudioFile: (file: File | null) => void;
  
  // Orb actions
  setOrbPosition: (position: { x: number; y: number; z: number }) => void;
  
  // Preset actions
  setPresets: (presets: Preset[]) => void;
  selectPreset: (id: number | null) => void;
  loadPreset: (preset: Preset) => void;
}

export const useStudioStore = create<StudioState>((set, get) => ({
  // Initial state
  mode: 'visualizer',
  posture: 'standing',
  userHeight: 1.7,
  autoPlayPresets: true,
  sensationEnabled: true,
  
  currentPath: [],
  isRecording: false,
  isPlaying: false,
  playbackIndex: 0,
  
  isAudioLoaded: false,
  isAudioPlaying: false,
  audioFile: null,
  
  orbPosition: { x: 0, y: 1.5, z: 2 },
  
  presets: [],
  selectedPresetId: null,
  
  // Mode actions
  setMode: (mode) => set({ mode }),
  setPosture: (posture) => set({ posture }),
  setUserHeight: (height) => set({ userHeight: Math.max(0.5, Math.min(2.5, height)) }),
  setAutoPlayPresets: (autoPlayPresets) => set({ autoPlayPresets }),
  setSensationEnabled: (sensationEnabled) => set({ sensationEnabled }),
  
  // Path actions
  setCurrentPath: (path) => set({ currentPath: path }),
  clearPath: () => set({ currentPath: [], playbackIndex: 0 }),
  addPathPoint: (point) => set((state) => ({
    currentPath: [...state.currentPath, point],
  })),
  
  // Recording/playback actions
  startRecording: () => set({ isRecording: true, currentPath: [] }),
  stopRecording: () => set({ isRecording: false }),
  startPlayback: () => set({ isPlaying: true, playbackIndex: 0 }),
  stopPlayback: () => set({ isPlaying: false }),
  setPlaybackIndex: (playbackIndex) => set({ playbackIndex }),
  
  // Audio actions
  setAudioLoaded: (isAudioLoaded) => set({ isAudioLoaded }),
  setAudioPlaying: (isAudioPlaying) => set({ isAudioPlaying }),
  setAudioFile: (audioFile) => set({ audioFile }),
  
  // Orb actions
  setOrbPosition: (orbPosition) => {
    const state = get();
    
    // If recording, add point to path
    if (state.isRecording) {
      const point: PathPoint = {
        x: orbPosition.x,
        y: orbPosition.y,
        z: orbPosition.z,
        t: Date.now(),
      };
      set((s) => ({
        orbPosition,
        currentPath: [...s.currentPath, point],
      }));
    } else {
      set({ orbPosition });
    }
  },
  
  // Preset actions
  setPresets: (presets) => set({ presets }),
  selectPreset: (selectedPresetId) => set({ selectedPresetId }),
  loadPreset: (preset) => set({
    currentPath: preset.pathData,
    userHeight: parseFloat(preset.height),
    posture: preset.posture,
    selectedPresetId: preset.id,
    playbackIndex: 0,
  }),
}));
