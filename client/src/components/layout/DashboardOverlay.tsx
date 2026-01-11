import { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Circle, RotateCcw, Upload,
  Eye, Edit3, Zap, Save
} from 'lucide-react';
import { useStudioStore } from '@/lib/store';
import { audioEngine } from '@/lib/audio/AudioEngine';
import type { Posture } from '@shared/schema';

// Mode toggle button
function ModeToggle() {
  const { mode, setMode } = useStudioStore();
  
  return (
    <div className="flex bg-cyber-surface rounded-lg p-1 border border-cyber-border">
      <button
        onClick={() => setMode('visualizer')}
        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
          mode === 'visualizer'
            ? 'bg-cyber-cyan text-cyber-bg shadow-neon-cyan'
            : 'text-cyber-cyan hover:bg-cyber-border'
        }`}
      >
        <Eye size={16} />
        <span className="font-mono text-sm">Visualizer</span>
      </button>
      <button
        onClick={() => setMode('editor')}
        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
          mode === 'editor'
            ? 'bg-cyber-magenta text-cyber-bg shadow-neon-magenta'
            : 'text-cyber-magenta hover:bg-cyber-border'
        }`}
      >
        <Edit3 size={16} />
        <span className="font-mono text-sm">Editor</span>
      </button>
    </div>
  );
}

// Height input control
function HeightInput() {
  const { userHeight, setUserHeight } = useStudioStore();
  
  return (
    <div className="flex items-center gap-2">
      <label className="font-mono text-sm text-cyber-cyan-dim">Height:</label>
      <input
        type="number"
        min="0.5"
        max="2.5"
        step="0.01"
        value={userHeight}
        onChange={(e) => {
          const value = parseFloat(e.target.value);
          if (!isNaN(value)) {
            setUserHeight(value);
            audioEngine.setUserHeight(value);
          }
        }}
        className="w-16 px-2 py-1 bg-cyber-surface border border-cyber-border rounded 
                   font-mono text-sm text-cyber-cyan focus:border-cyber-cyan 
                   focus:outline-none focus:ring-1 focus:ring-cyber-cyan"
      />
      <span className="font-mono text-xs text-cyber-cyan-dim">m</span>
    </div>
  );
}

// Sensation toggle
function SensationToggle() {
  const { sensationEnabled, setSensationEnabled } = useStudioStore();
  
  return (
    <button
      onClick={() => {
        setSensationEnabled(!sensationEnabled);
        audioEngine.setSensationEnabled(!sensationEnabled);
      }}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
        sensationEnabled
          ? 'border-cyber-magenta text-cyber-magenta bg-cyber-magenta/10 shadow-neon-magenta'
          : 'border-cyber-border text-cyber-border hover:border-cyber-magenta/50'
      }`}
    >
      <Zap size={16} />
      <span className="font-mono text-sm">AUTO</span>
    </button>
  );
}

// Media controls
function MediaControls() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { 
    isAudioPlaying, setAudioPlaying, setAudioLoaded,
    isRecording, startRecording, stopRecording,
    isPlaying, startPlayback, stopPlayback,
    clearPath, mode
  } = useStudioStore();
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !audioRef.current) return;
    
    const url = URL.createObjectURL(file);
    audioRef.current.src = url;
    
    await audioEngine.initialize();
    audioEngine.setAudioSource(audioRef.current);
    setAudioLoaded(true);
  };
  
  const togglePlayPause = async () => {
    if (!audioRef.current) return;
    
    await audioEngine.resume();
    
    if (isAudioPlaying) {
      audioRef.current.pause();
      setAudioPlaying(false);
    } else {
      audioRef.current.play();
      setAudioPlaying(true);
    }
  };
  
  const toggleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
  const togglePlaybackPath = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };
  
  return (
    <div className="flex items-center gap-4">
      {/* Hidden audio element */}
      <audio ref={audioRef} loop />
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* Upload button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="p-3 bg-cyber-surface border border-cyber-border rounded-lg 
                   text-cyber-cyan hover:border-cyber-cyan hover:shadow-neon-cyan 
                   transition-all"
        title="Load Audio"
      >
        <Upload size={20} />
      </button>
      
      {/* Play/Pause audio */}
      <button
        onClick={togglePlayPause}
        className="p-4 bg-cyber-cyan text-cyber-bg rounded-full shadow-neon-cyan 
                   hover:scale-105 transition-transform"
        title={isAudioPlaying ? 'Pause' : 'Play'}
      >
        {isAudioPlaying ? <Pause size={24} /> : <Play size={24} />}
      </button>
      
      {/* Editor-only controls */}
      {mode === 'editor' && (
        <>
          {/* Record button */}
          <button
            onClick={toggleRecord}
            className={`p-3 rounded-lg border transition-all ${
              isRecording
                ? 'bg-red-500 border-red-500 text-white animate-pulse'
                : 'bg-cyber-surface border-cyber-border text-cyber-magenta hover:border-cyber-magenta'
            }`}
            title={isRecording ? 'Stop Recording' : 'Record Path'}
          >
            <Circle size={20} fill={isRecording ? 'currentColor' : 'none'} />
          </button>
          
          {/* Playback path button */}
          <button
            onClick={togglePlaybackPath}
            className={`p-3 rounded-lg border transition-all ${
              isPlaying
                ? 'bg-cyber-magenta border-cyber-magenta text-cyber-bg'
                : 'bg-cyber-surface border-cyber-border text-cyber-magenta hover:border-cyber-magenta'
            }`}
            title={isPlaying ? 'Stop Path' : 'Play Path'}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          
          {/* Reset path */}
          <button
            onClick={clearPath}
            className="p-3 bg-cyber-surface border border-cyber-border rounded-lg 
                       text-cyber-cyan hover:border-cyber-cyan transition-all"
            title="Reset Path"
          >
            <RotateCcw size={20} />
          </button>
        </>
      )}
    </div>
  );
}

// Posture selection grid
function PostureGrid() {
  const { posture, setPosture } = useStudioStore();
  
  const postures: { value: Posture; label: string; icon: string }[] = [
    { value: 'standing', label: 'Standing', icon: '🧍' },
    { value: 'sitting', label: 'Sitting', icon: '🪑' },
    { value: 'lying', label: 'Lying', icon: '🛏️' },
  ];
  
  return (
    <div className="space-y-2">
      <h3 className="font-mono text-sm text-cyber-cyan-dim uppercase tracking-wider">
        Posture
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {postures.map(p => (
          <button
            key={p.value}
            onClick={() => {
              setPosture(p.value);
              audioEngine.setPosture(p.value);
            }}
            className={`p-3 rounded-lg border text-center transition-all ${
              posture === p.value
                ? 'border-cyber-cyan bg-cyber-cyan/10 shadow-neon-cyan'
                : 'border-cyber-border hover:border-cyber-cyan/50'
            }`}
          >
            <div className="text-2xl mb-1">{p.icon}</div>
            <div className="font-mono text-xs text-cyber-cyan">{p.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Presets list
function PresetsList() {
  const { presets, setPresets, loadPreset, selectedPresetId, currentPath, userHeight, posture } = useStudioStore();
  const [loading, setLoading] = useState(false);
  const [saveName, setSaveName] = useState('');
  
  // Fetch presets on mount
  useEffect(() => {
    fetchPresets();
  }, []);
  
  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/presets');
      const data = await res.json();
      if (data.success && data.data) {
        setPresets(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch presets:', error);
    }
  };
  
  const savePreset = async () => {
    if (!saveName.trim() || currentPath.length === 0) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveName.trim(),
          pathData: currentPath,
          height: userHeight.toString(),
          posture,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchPresets();
        setSaveName('');
      }
    } catch (error) {
      console.error('Failed to save preset:', error);
    }
    setLoading(false);
  };
  
  const deletePreset = async (id: number) => {
    try {
      await fetch(`/api/presets/${id}`, { method: 'DELETE' });
      await fetchPresets();
    } catch (error) {
      console.error('Failed to delete preset:', error);
    }
  };
  
  return (
    <div className="space-y-3">
      <h3 className="font-mono text-sm text-cyber-cyan-dim uppercase tracking-wider">
        Presets
      </h3>
      
      {/* Save new preset */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Preset name..."
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          className="flex-1 px-3 py-2 bg-cyber-surface border border-cyber-border rounded 
                     font-mono text-sm text-cyber-cyan placeholder-cyber-border
                     focus:border-cyber-cyan focus:outline-none"
        />
        <button
          onClick={savePreset}
          disabled={loading || !saveName.trim() || currentPath.length === 0}
          className="px-3 py-2 bg-cyber-cyan text-cyber-bg rounded font-mono text-sm
                     disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-neon-cyan
                     transition-all"
        >
          <Save size={16} />
        </button>
      </div>
      
      {/* Presets list */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {presets.map(preset => (
          <div
            key={preset.id}
            className={`flex items-center justify-between p-3 rounded-lg border 
                       cursor-pointer transition-all ${
              selectedPresetId === preset.id
                ? 'border-cyber-magenta bg-cyber-magenta/10'
                : 'border-cyber-border hover:border-cyber-magenta/50'
            }`}
            onClick={() => loadPreset(preset)}
          >
            <div>
              <div className="font-mono text-sm text-cyber-cyan">{preset.name}</div>
              <div className="font-mono text-xs text-cyber-border">
                {preset.pathData.length} points • {preset.height}m • {preset.posture}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deletePreset(preset.id);
              }}
              className="p-1 text-cyber-border hover:text-red-500 transition-colors"
            >
              ×
            </button>
          </div>
        ))}
        
        {presets.length === 0 && (
          <div className="text-center py-4 font-mono text-sm text-cyber-border">
            No presets saved
          </div>
        )}
      </div>
    </div>
  );
}

// Main Dashboard Overlay
export default function DashboardOverlay() {
  const { mode } = useStudioStore();
  
  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 pointer-events-auto">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyber-cyan to-cyber-magenta 
                           flex items-center justify-center shadow-lg">
              <span className="font-mono font-bold text-cyber-bg">SDF</span>
            </div>
            <div>
              <h1 className="font-mono font-bold text-lg text-cyber-cyan">
                SDF Spatial Studio
              </h1>
              <p className="font-mono text-xs text-cyber-border">
                3D Spatial Audio Designer
              </p>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-4">
            <HeightInput />
            <SensationToggle />
            <ModeToggle />
          </div>
        </div>
      </div>
      
      {/* Center media controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="bg-cyber-surface/90 backdrop-blur-sm border border-cyber-border 
                       rounded-2xl p-4 shadow-lg">
          <MediaControls />
        </div>
      </div>
      
      {/* Sidebar - only visible in editor mode */}
      {mode === 'editor' && (
        <div className="absolute right-4 top-24 bottom-24 w-64 pointer-events-auto">
          <div className="h-full bg-cyber-surface/90 backdrop-blur-sm border border-cyber-border 
                         rounded-xl p-4 overflow-y-auto space-y-6">
            <PostureGrid />
            <PresetsList />
          </div>
        </div>
      )}
    </div>
  );
}
