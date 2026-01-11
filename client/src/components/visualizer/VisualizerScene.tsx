import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { audioEngine } from '@/lib/audio/AudioEngine';

// Raymarching fragment shader for SDF visualizations
const fragmentShader = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uBass;
uniform float uMids;
uniform float uHighs;
uniform float uPeak;

varying vec2 vUv;

// SDF primitives
float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
  vec3 d = abs(p) - b;
  return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

float sdPlane(vec3 p, vec3 n, float h) {
  return dot(p, n) + h;
}

// Gyroid implicit surface
float sdGyroid(vec3 p, float scale, float thickness) {
  p *= scale;
  float g = dot(sin(p), cos(p.zxy));
  return abs(g) / scale - thickness;
}

// Smooth min for blending shapes
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Rotation matrix
mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

// Layer 1: Bass-reactive matrix floor
float bassFloor(vec3 p) {
  float freq = uBass * 2.0;
  float wave = sin(p.x * 3.0 + uTime) * sin(p.z * 3.0 + uTime) * freq;
  return p.y + 2.0 - wave * 0.5;
}

// Layer 2: Mid-reactive gyroid tunnel
float midsTunnel(vec3 p) {
  p.xy *= rot(uTime * 0.1);
  float pulse = 1.0 + uMids * 0.5;
  return sdGyroid(p, 2.0 / pulse, 0.03 + uMids * 0.02);
}

// Layer 3: High-reactive energy particles
float highsParticles(vec3 p) {
  float d = 1e10;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    float angle = fi * 0.7853 + uTime * (1.0 + uHighs);
    vec3 offset = vec3(
      sin(angle) * (1.5 + uHighs),
      cos(angle * 1.3) * 0.5,
      cos(angle) * (1.5 + uHighs)
    );
    float size = 0.05 + uHighs * 0.1;
    d = smin(d, sdSphere(p - offset, size), 0.3);
  }
  return d;
}

// Main scene SDF
float map(vec3 p) {
  float floor = bassFloor(p);
  float tunnel = midsTunnel(p);
  float particles = highsParticles(p);
  
  return smin(smin(floor, tunnel, 0.5), particles, 0.3);
}

// Calculate normal using gradient
vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.001, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)
  ));
}

// Raymarching
float raymarch(vec3 ro, vec3 rd) {
  float t = 0.0;
  for (int i = 0; i < 128; i++) {
    vec3 p = ro + rd * t;
    float d = map(p);
    if (d < 0.001 || t > 50.0) break;
    t += d * 0.8;
  }
  return t;
}

// Ambient occlusion
float ao(vec3 p, vec3 n) {
  float occ = 0.0;
  float sca = 1.0;
  for (int i = 0; i < 5; i++) {
    float h = 0.01 + 0.12 * float(i) / 4.0;
    float d = map(p + h * n);
    occ += (h - d) * sca;
    sca *= 0.95;
  }
  return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  
  // Camera setup
  vec3 ro = vec3(0.0, 0.0, -5.0 + sin(uTime * 0.2) * 0.5);
  vec3 rd = normalize(vec3(uv, 1.0));
  
  // Apply camera rotation based on audio
  float camRot = uTime * 0.1 + uMids * 0.2;
  rd.xz *= rot(camRot);
  ro.xz *= rot(camRot);
  
  // Raymarch
  float t = raymarch(ro, rd);
  
  // Background color - cyberpunk gradient
  vec3 col = mix(
    vec3(0.02, 0.02, 0.05),
    vec3(0.1, 0.0, 0.15),
    uv.y + 0.5
  );
  
  if (t < 50.0) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);
    
    // Lighting
    vec3 lightDir = normalize(vec3(1.0, 1.0, -1.0));
    float diff = max(dot(n, lightDir), 0.0);
    float spec = pow(max(dot(reflect(-lightDir, n), -rd), 0.0), 32.0);
    float occ = ao(p, n);
    
    // Color based on audio levels
    vec3 bassColor = vec3(0.0, 1.0, 1.0) * uBass;      // Cyan for bass
    vec3 midsColor = vec3(1.0, 0.0, 1.0) * uMids;      // Magenta for mids
    vec3 highsColor = vec3(1.0, 1.0, 0.0) * uHighs;    // Yellow for highs
    
    vec3 baseColor = vec3(0.1, 0.1, 0.2);
    vec3 surfaceColor = baseColor + bassColor * 0.4 + midsColor * 0.3 + highsColor * 0.3;
    
    col = surfaceColor * (0.2 + diff * 0.8) + spec * 0.5;
    col *= occ;
    
    // Add glow based on peak
    col += surfaceColor * uPeak * 0.3;
    
    // Fog for depth
    float fog = 1.0 - exp(-t * 0.1);
    col = mix(col, vec3(0.02, 0.0, 0.05), fog);
  }
  
  // Grid overlay on floor for cyberpunk effect
  if (t < 50.0) {
    vec3 p = ro + rd * t;
    if (p.y < -1.5) {
      float grid = step(0.98, fract(p.x * 2.0)) + step(0.98, fract(p.z * 2.0));
      col += vec3(0.0, 0.5, 0.5) * grid * uBass * 0.5;
    }
  }
  
  // Vignette
  float vignette = 1.0 - dot(uv, uv) * 0.5;
  col *= vignette;
  
  // Gamma correction
  col = pow(col, vec3(0.4545));
  
  gl_FragColor = vec4(col, 1.0);
}
`;

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

// Fullscreen shader mesh component
function ShaderPlane() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();
  
  const uniforms = useMemo(() => ({
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
    uTime: { value: 0 },
    uBass: { value: 0 },
    uMids: { value: 0 },
    uHighs: { value: 0 },
    uPeak: { value: 0 },
  }), []);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const material = meshRef.current.material as THREE.ShaderMaterial;
    
    // Update time
    material.uniforms.uTime.value = state.clock.elapsedTime;
    
    // Update resolution if changed
    material.uniforms.uResolution.value.set(size.width, size.height);
    
    // Get audio levels from engine
    const bass = audioEngine.getBassLevel();
    const mids = audioEngine.getMidsLevel();
    const highs = audioEngine.getHighsLevel();
    
    // Smooth interpolation for visual stability
    material.uniforms.uBass.value += (bass - material.uniforms.uBass.value) * 0.1;
    material.uniforms.uMids.value += (mids - material.uniforms.uMids.value) * 0.1;
    material.uniforms.uHighs.value += (highs - material.uniforms.uHighs.value) * 0.1;
    
    // Calculate peak for bloom intensity
    const peak = Math.max(bass, mids, highs);
    material.uniforms.uPeak.value += (peak - material.uniforms.uPeak.value) * 0.2;
  });
  
  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

// Post-processing component
function PostProcessing() {
  const peakRef = useRef(0);
  
  useFrame(() => {
    const peak = Math.max(
      audioEngine.getBassLevel(),
      audioEngine.getMidsLevel(),
      audioEngine.getHighsLevel()
    );
    peakRef.current += (peak - peakRef.current) * 0.1;
  });
  
  return (
    <EffectComposer>
      <Bloom
        intensity={1.5}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={new THREE.Vector2(0.002, 0.002)}
        radialModulation={false}
        modulationOffset={0}
      />
    </EffectComposer>
  );
}

export default function VisualizerScene() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 1], fov: 90 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0a0a0f' }}
      >
        <ShaderPlane />
        <PostProcessing />
      </Canvas>
    </div>
  );
}
