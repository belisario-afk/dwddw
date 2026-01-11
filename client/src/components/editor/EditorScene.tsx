import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, TransformControls, Line, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useStudioStore } from '@/lib/store';
import { audioEngine } from '@/lib/audio/AudioEngine';

// Wireframe listener mannequin using primitives
function ListenerMannequin() {
  const { userHeight, posture } = useStudioStore();
  const groupRef = useRef<THREE.Group>(null);
  
  // Calculate mannequin dimensions based on user height and posture
  const dimensions = useMemo(() => {
    const scale = userHeight / 1.7; // Normalize to default height
    const headRadius = 0.12 * scale;
    const bodyHeight = 0.6 * scale;
    const bodyWidth = 0.4 * scale;
    
    let headY = userHeight - headRadius;
    let bodyY = userHeight - headRadius * 2 - bodyHeight / 2;
    let rotation = new THREE.Euler(0, 0, 0);
    
    if (posture === 'sitting') {
      headY = userHeight * 0.7 - headRadius;
      bodyY = userHeight * 0.7 - headRadius * 2 - bodyHeight / 2;
    } else if (posture === 'lying') {
      rotation = new THREE.Euler(Math.PI / 2, 0, 0);
      headY = 0.15 * scale;
      bodyY = 0.15 * scale;
    }
    
    return { headRadius, bodyHeight, bodyWidth, headY, bodyY, rotation, scale };
  }, [userHeight, posture]);
  
  return (
    <group ref={groupRef} rotation={dimensions.rotation}>
      {/* Head */}
      <mesh position={[0, dimensions.headY, 0]}>
        <sphereGeometry args={[dimensions.headRadius, 16, 16]} />
        <meshBasicMaterial color="#00ffff" wireframe />
      </mesh>
      
      {/* Body */}
      <mesh position={[0, dimensions.bodyY, 0]}>
        <boxGeometry args={[dimensions.bodyWidth, dimensions.bodyHeight, 0.2 * dimensions.scale]} />
        <meshBasicMaterial color="#00ffff" wireframe opacity={0.5} transparent />
      </mesh>
      
      {/* Shoulders */}
      <mesh position={[0, dimensions.bodyY + dimensions.bodyHeight * 0.3, 0]}>
        <boxGeometry args={[dimensions.bodyWidth * 1.2, 0.1 * dimensions.scale, 0.15 * dimensions.scale]} />
        <meshBasicMaterial color="#00ffff" wireframe opacity={0.5} transparent />
      </mesh>
      
      {/* Ears indicators */}
      <mesh position={[-dimensions.headRadius * 1.1, dimensions.headY, 0]}>
        <sphereGeometry args={[0.03 * dimensions.scale, 8, 8]} />
        <meshBasicMaterial color="#ff00ff" />
      </mesh>
      <mesh position={[dimensions.headRadius * 1.1, dimensions.headY, 0]}>
        <sphereGeometry args={[0.03 * dimensions.scale, 8, 8]} />
        <meshBasicMaterial color="#ff00ff" />
      </mesh>
    </group>
  );
}

// Sound Orb with glow effect
function SoundOrb() {
  const orbRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const { orbPosition, setOrbPosition, isRecording, isPlaying, currentPath, playbackIndex, setPlaybackIndex } = useStudioStore();
  const transformRef = useRef<any>(null);
  const playbackStartTime = useRef<number>(0);
  const pathStartTime = useRef<number>(0);
  
  // Update audio engine position when orb moves
  useEffect(() => {
    audioEngine.setPosition(orbPosition.x, orbPosition.y, orbPosition.z);
  }, [orbPosition]);
  
  // Reset playback timing when playback starts
  useEffect(() => {
    if (isPlaying && currentPath.length > 0) {
      playbackStartTime.current = Date.now();
      pathStartTime.current = currentPath[0].t;
    }
  }, [isPlaying, currentPath]);
  
  // Handle transform controls changes
  const handleTransform = () => {
    if (orbRef.current && !isPlaying) {
      const pos = orbRef.current.position;
      setOrbPosition({ x: pos.x, y: pos.y, z: pos.z });
    }
  };
  
  // Playback animation with proper timing
  useFrame(() => {
    if (isPlaying && currentPath.length > 0) {
      const now = Date.now();
      const elapsed = now - playbackStartTime.current;
      
      // Find the appropriate point based on elapsed time
      let targetIndex = playbackIndex;
      for (let i = playbackIndex; i < currentPath.length; i++) {
        const pointTime = currentPath[i].t - pathStartTime.current;
        if (pointTime <= elapsed) {
          targetIndex = i;
        } else {
          break;
        }
      }
      
      // Loop back to start if we've completed the path
      if (targetIndex >= currentPath.length - 1) {
        playbackStartTime.current = now;
        pathStartTime.current = currentPath[0].t;
        targetIndex = 0;
      }
      
      if (targetIndex !== playbackIndex) {
        setPlaybackIndex(targetIndex);
      }
      
      const point = currentPath[targetIndex];
      if (orbRef.current) {
        orbRef.current.position.set(point.x, point.y, point.z);
        setOrbPosition({ x: point.x, y: point.y, z: point.z });
      }
    }
    
    // Animate glow
    if (glowRef.current) {
      const scale = 1 + Math.sin(Date.now() * 0.005) * 0.1;
      glowRef.current.scale.setScalar(scale);
    }
  });
  
  return (
    <>
      {/* Transform controls */}
      {!isPlaying && (
        <TransformControls
          ref={transformRef}
          object={orbRef.current || undefined}
          mode="translate"
          onObjectChange={handleTransform}
        />
      )}
      
      {/* Main orb */}
      <mesh
        ref={orbRef}
        position={[orbPosition.x, orbPosition.y, orbPosition.z]}
      >
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshBasicMaterial 
          color={isRecording ? '#ff0000' : '#ff00ff'} 
        />
      </mesh>
      
      {/* Glow effect */}
      <mesh
        ref={glowRef}
        position={[orbPosition.x, orbPosition.y, orbPosition.z]}
      >
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshBasicMaterial 
          color={isRecording ? '#ff0000' : '#ff00ff'} 
          transparent 
          opacity={0.2} 
        />
      </mesh>
    </>
  );
}

// Path trail visualization
function PathTrail() {
  const { currentPath } = useStudioStore();
  
  if (currentPath.length < 2) return null;
  
  const points = useMemo(() => {
    return currentPath.map(p => new THREE.Vector3(p.x, p.y, p.z));
  }, [currentPath]);
  
  return (
    <Line
      points={points}
      color="#00ffff"
      lineWidth={2}
      opacity={0.6}
      transparent
    />
  );
}

// Editor scene content
function EditorContent() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      
      {/* Grid */}
      <Grid
        position={[0, 0, 0]}
        args={[10, 10]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#1e1e2e"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#00cccc"
        fadeDistance={25}
        infiniteGrid
      />
      
      {/* Listener mannequin */}
      <ListenerMannequin />
      
      {/* Sound orb */}
      <SoundOrb />
      
      {/* Path trail */}
      <PathTrail />
      
      {/* Coordinate axes helper */}
      <axesHelper args={[2]} />
      
      {/* Camera controls */}
      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate
        target={[0, 1, 0]}
        maxPolarAngle={Math.PI * 0.9}
      />
    </>
  );
}

export default function EditorScene() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [3, 2, 5], fov: 60 }}
        gl={{ antialias: true }}
        style={{ background: '#0a0a0f' }}
      >
        <EditorContent />
      </Canvas>
    </div>
  );
}
