import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Global Variables ---
let scene, camera, renderer, controls;
let particles, geometry, materials = [];
let audioContext, analyser, dataArray, source;
let isPlaying = false;
let animationId;

const fileInput = document.getElementById('audio-upload');
const uploadContainer = document.querySelector('.upload-container');
const playbackUI = document.getElementById('playback-ui');
const trackNameDisplay = document.getElementById('track-name');
const playPauseBtn = document.getElementById('play-pause-btn');

// --- Initialization ---
function init() {
  // Scene setup
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050505, 0.002);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 30;

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;

  // Create Visual Object (Particle Sphere)
  createVisuals();

  // Resize handler
  window.addEventListener('resize', onWindowResize);

  // Animation Loop
  animate();
}

function createVisuals() {
  // High detail Icosahedron for the particle base
  const originalGeometry = new THREE.IcosahedronGeometry(10, 4);
  geometry = new THREE.BufferGeometry();
  
  const positions = [];
  const colors = [];
  const sizes = [];
  
  const positionAttribute = originalGeometry.attributes.position;
  
  const color1 = new THREE.Color(0x23c2b5); // Teal
  const color2 = new THREE.Color(0xff6a3d); // Orange
  
  for (let i = 0; i < positionAttribute.count; i++) {
    const x = positionAttribute.getX(i);
    const y = positionAttribute.getY(i);
    const z = positionAttribute.getZ(i);
    
    positions.push(x, y, z);
    
    // Initial random colors mixed
    const mixedColor = color1.clone().lerp(color2, Math.random());
    colors.push(mixedColor.r, mixedColor.g, mixedColor.b);
    
    sizes.push(1.0);
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
  
  // Save original positions for reference during animation
  geometry.userData.originalPositions = positions.slice();

  // Shader Material for custom particle look
  // Using a texture for the particle would be better, but we'll use a generated circular gradient on canvas for the map
  const sprite = getSprite();
  
  const material = new THREE.PointsMaterial({
    size: 0.5,
    map: sprite,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.8
  });

  particles = new THREE.Points(geometry, material);
  scene.add(particles);
  
  // Add some ambient particles in background
  addBackgroundParticles();
}

function getSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 32, 32);
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function addBackgroundParticles() {
  const bgGeo = new THREE.BufferGeometry();
  const bgPos = [];
  for (let i = 0; i < 1000; i++) {
    const x = (Math.random() - 0.5) * 200;
    const y = (Math.random() - 0.5) * 200;
    const z = (Math.random() - 0.5) * 200;
    bgPos.push(x, y, z);
  }
  bgGeo.setAttribute('position', new THREE.Float32BufferAttribute(bgPos, 3));
  const bgMat = new THREE.PointsMaterial({
    color: 0x444444,
    size: 0.3,
    transparent: true,
    opacity: 0.5
  });
  const bgParticles = new THREE.Points(bgGeo, bgMat);
  scene.add(bgParticles);
}

// --- Audio Handling ---
fileInput.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  trackNameDisplay.textContent = file.name.replace(/\.[^/.]+$/, "");
  uploadContainer.style.display = 'none';
  playbackUI.style.display = 'flex';

  const reader = new FileReader();
  reader.onload = function(ev) {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } else {
      audioContext.close();
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    audioContext.decodeAudioData(ev.target.result, function(buffer) {
      if (source) source.disconnect();
      
      source = audioContext.createBufferSource();
      source.buffer = buffer;
      
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048; // Higher resolution
      
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      source.start(0);
      isPlaying = true;
      playPauseBtn.textContent = "Pause";
      
      source.onended = () => {
        isPlaying = false;
        playPauseBtn.textContent = "Replay";
      };
    });
  };
  reader.readAsArrayBuffer(file);
});

playPauseBtn.addEventListener('click', () => {
    if(!audioContext) return;
    if (audioContext.state === 'suspended') {
        audioContext.resume();
        isPlaying = true;
        playPauseBtn.textContent = "Pause";
    } else if (audioContext.state === 'running') {
        audioContext.suspend();
        isPlaying = false;
        playPauseBtn.textContent = "Play";
    }
});

// --- Animation / Render Loop ---
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  animationId = requestAnimationFrame(animate);
  
  controls.update();
  
  let bass = 0;
  let mid = 0;
  let treble = 0;

  if (analyser && isPlaying) {
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate simple ranges
    const bufferLength = analyser.frequencyBinCount;
    // Bass: lower 10%
    // Mid: middle 
    // Treble: upper
    
    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;
    
    // Sampling ranges
    const bassRange = Math.floor(bufferLength * 0.05); 
    const midRange = Math.floor(bufferLength * 0.25);
    
    for(let i = 0; i < bufferLength; i++) {
        if(i < bassRange) bassSum += dataArray[i];
        else if(i < midRange) midSum += dataArray[i];
        else trebleSum += dataArray[i];
    }
    
    bass = bassSum / bassRange; // 0-255 average
    mid = midSum / (midRange - bassRange);
    treble = trebleSum / (bufferLength - midRange);
    
    // Audio Reactivity Logic
    updateParticles(bass, mid, treble, dataArray);
  } else {
    // Idle Animation
    pulseIdle();
  }

  renderer.render(scene, camera);
}

function updateParticles(bass, mid, treble, fullData) {
    const positions = geometry.attributes.position.array;
    const originalPositions = geometry.userData.originalPositions;
    const colors = geometry.attributes.color.array;
    const count = geometry.attributes.position.count;
    
    const time = Date.now() * 0.001;
    
    // Scaling factor for reaction
    const bassScale = 1 + (bass / 255) * 0.8; 
    const trebleScale = (treble / 255);

    // Color interpolation targets
    const bassColor = new THREE.Color(0xff6a3d); // Orange
    const midColor = new THREE.Color(0x23c2b5); // Teal
    const highColor = new THREE.Color(0xffffff); // White/Sparkle

    for (let i = 0; i < count; i++) {
        const idx = i * 3;
        
        // Original Cartesian coordinates
        const ox = originalPositions[idx];
        const oy = originalPositions[idx+1];
        const oz = originalPositions[idx+2];
        
        // Convert to spherical to manipulate radius easily
        const vector = new THREE.Vector3(ox, oy, oz);
        const originalRadius = vector.length();
        const dir = vector.clone().normalize();
        
        // Map vertex index to frequency bin (roughly)
        // We use a modulo to distribute the frequency data across the sphere surface
        const freqIndex = i % (fullData.length / 4); 
        const freqVal = fullData[Math.floor(freqIndex)];
        
        // Displacement logic
        // 1. Beat pulse (Global bass)
        // 2. Frequency spike (Local)
        // 3. Noise/Wave (Time based)
        
        const noise = Math.sin(time * 2 + ox * 0.5) * Math.cos(time * 1.5 + oy * 0.5);
        
        // DISPLACEMENT:
        // Base radius + Bass Pulse + Local Frequency Spike + Noise Wiggle
        const displacement = (freqVal / 255) * 5 * trebleScale + (bass / 255) * 2 + noise * 0.5;
        
        const newRadius = originalRadius + displacement;
        
        const newPos = dir.multiplyScalar(newRadius);
        
        positions[idx] = newPos.x;
        positions[idx+1] = newPos.y;
        positions[idx+2] = newPos.z;
        
        // COLOR CHANGE
        // If high energy at this vertex, shift towards hot colors
        const intensity = freqVal / 255;
        
        let targetColor = midColor.clone();
        if (intensity > 0.6) {
           targetColor.lerp(bassColor, intensity);
        }
        if (intensity > 0.9) {
            targetColor.lerp(highColor, 0.5);
        }
        
        // Smoothly blend? We are just setting it for now for performance (lerping per frame is expensive if not accumulative)
        // Direct assignment is snappier
        colors[idx] = targetColor.r;
        colors[idx+1] = targetColor.g;
        colors[idx+2] = targetColor.b;
        
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    
    // Dramatic Camera or Scene rotation based on Bass
    if (bass > 200) {
       particles.rotation.z += 0.01;
    }
    
    particles.rotation.y += 0.002;
}

function pulseIdle() {
    const positions = geometry.attributes.position.array;
    const originalPositions = geometry.userData.originalPositions;
    const count = geometry.attributes.position.count;
    const time = Date.now() * 0.002;
    
    for (let i = 0; i < count; i++) {
        const idx = i * 3;
        const ox = originalPositions[idx];
        const oy = originalPositions[idx+1];
        const oz = originalPositions[idx+2];
        
        const vector = new THREE.Vector3(ox, oy, oz);
        const originalRadius = vector.length();
        const dir = vector.clone().normalize();
        
        // Gentle breathing
        const breathe = Math.sin(time + ox * 0.1) * 0.5;
        const newPos = dir.multiplyScalar(originalRadius + breathe);
        
        positions[idx] = newPos.x;
        positions[idx+1] = newPos.y;
        positions[idx+2] = newPos.z;
    }
    geometry.attributes.position.needsUpdate = true;
}

init();
