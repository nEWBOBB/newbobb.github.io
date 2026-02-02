import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- Simplex Noise Implementation (Minimal) ---
class SimplexNoise {
	constructor() {
		this.p = new Uint8Array(256);
		for (let i = 0; i < 256; i++) this.p[i] = i;
		for (let i = 0; i < 256; i++) {
			const r = Math.floor(Math.random() * 256);
			[this.p[i], this.p[r]] = [this.p[r], this.p[i]];
		}
		this.perm = new Uint8Array(512);
		for (let i = 0; i < 512; i++) this.perm[i] = this.p[i & 255];

		this.grad3 = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
		[1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
		[0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
	}
	dot(g, x, y, z) { return g[0] * x + g[1] * y + g[2] * z; }
	noise3D(xin, yin, zin) {
		const F3 = 1.0 / 3.0; const G3 = 1.0 / 6.0;
		let s = (xin + yin + zin) * F3;
		let i = Math.floor(xin + s); let j = Math.floor(yin + s); let k = Math.floor(zin + s);
		let t = (i + j + k) * G3;
		let X0 = i - t; let Y0 = j - t; let Z0 = k - t;
		let x0 = xin - X0; let y0 = yin - Y0; let z0 = zin - Z0;

		let i1, j1, k1, i2, j2, k2;
		if (x0 >= y0) {
			if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
			else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
			else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
		} else {
			if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
			else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
			else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
		}

		let x1 = x0 - i1 + G3; let y1 = y0 - j1 + G3; let z1 = z0 - k1 + G3;
		let x2 = x0 - i2 + 2.0 * G3; let y2 = y0 - j2 + 2.0 * G3; let z2 = z0 - k2 + 2.0 * G3;
		let x3 = x0 - 1.0 + 3.0 * G3; let y3 = y0 - 1.0 + 3.0 * G3; let z3 = z0 - 1.0 + 3.0 * G3;

		let ii = i & 255; let jj = j & 255; let kk = k & 255;

		let gi0 = this.perm[ii + this.perm[jj + this.perm[kk]]] % 12;
		let gi1 = this.perm[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]] % 12;
		let gi2 = this.perm[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]] % 12;
		let gi3 = this.perm[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]] % 12;

		let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
		let n0 = (t0 < 0) ? 0.0 : t0 * t0 * t0 * t0 * this.dot(this.grad3[gi0], x0, y0, z0);
		let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
		let n1 = (t1 < 0) ? 0.0 : t1 * t1 * t1 * t1 * this.dot(this.grad3[gi1], x1, y1, z1);
		let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
		let n2 = (t2 < 0) ? 0.0 : t2 * t2 * t2 * t2 * this.dot(this.grad3[gi2], x2, y2, z2);
		let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
		let n3 = (t3 < 0) ? 0.0 : t3 * t3 * t3 * t3 * this.dot(this.grad3[gi3], x3, y3, z3);

		return 32.0 * (n0 + n1 + n2 + n3);
	}
}
const noise = new SimplexNoise();

// --- Globals ---
let scene, camera, renderer, composer;
let sphere, geometry;
let originalPositions;
let lights = [];
let audioContext, analyser, dataArray, source;
let isPlaying = false;
let time = 0;

// UI
const fileInput = document.getElementById('audio-upload');
const uploadContainer = document.querySelector('.upload-container');
const playbackUI = document.getElementById('playback-ui');
const trackName = document.getElementById('track-name');
const playPauseBtn = document.getElementById('play-pause-btn');

function init() {
	// Setup
	scene = new THREE.Scene();
	scene.fog = new THREE.FogExp2(0x000000, 0.02);

	camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
	camera.position.z = 15;

	renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false }); // Antialias off for post-proc performance
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.toneMapping = THREE.ReinhardToneMapping;
	renderer.toneMappingExposure = 1.5;
	document.getElementById('canvas-container').appendChild(renderer.domElement);

	// Post Processing
	const renderScene = new RenderPass(scene, camera);
	const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
	bloomPass.threshold = 0.2;
	bloomPass.strength = 1.2;
	bloomPass.radius = 0.5;

	composer = new EffectComposer(renderer);
	composer.addPass(renderScene);
	composer.addPass(bloomPass);

	// Objects
	createWorld();

	// Events
	window.addEventListener('resize', onWindowResize);

	// Start Loop
	animate();
}

function createWorld() {
	// 1. The Liquid Sphere
	// Use high segment count for smooth displacement
	const geo = new THREE.IcosahedronGeometry(4, 30);
	geometry = geo;
	originalPositions = geo.attributes.position.array.slice(); // clone

	// Physical material for that chrome look
	const mat = new THREE.MeshPhysicalMaterial({
		color: 0xffffff,
		metalness: 0.9,
		roughness: 0.1,
		clearcoat: 1.0,
		clearcoatRoughness: 0.1,
		reflectivity: 1.0,
		flatShading: false
	});

	sphere = new THREE.Mesh(geo, mat);
	scene.add(sphere);

	// 2. Lights
	// We need moving lights to make the chrome look cool
	const lightColors = [0x00cccc, 0xff00ff, 0x0000ff]; // Cyan, Magenta, Blue

	lightColors.forEach(c => {
		const pointLight = new THREE.PointLight(c, 500, 50);
		scene.add(pointLight);
		lights.push({
			light: pointLight,
			angle: Math.random() * Math.PI * 2,
			radius: 8 + Math.random() * 5,
			speed: (Math.random() - 0.5) * 0.02
		});
	});

	// Ambient light
	const ambient = new THREE.AmbientLight(0x222222);
	scene.add(ambient);

	// 3. Background Particles (Stars)
	// Flying towards camera
	const starGeo = new THREE.BufferGeometry();
	const starCount = 2000;
	const starPos = new Float32Array(starCount * 3);
	for (let i = 0; i < starCount; i++) {
		starPos[i * 3] = (Math.random() - 0.5) * 100;
		starPos[i * 3 + 1] = (Math.random() - 0.5) * 100;
		starPos[i * 3 + 2] = (Math.random() - 0.5) * 100 - 50;
	}
	starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
	const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
	const stars = new THREE.Points(starGeo, starMat);
	stars.name = "stars";
	scene.add(stars);
}

// Audio
fileInput.addEventListener('change', (e) => {
	const file = e.target.files[0];
	if (!file) return;

	trackName.textContent = file.name.replace(/\.[^/.]+$/, "");
	trackName.title = file.name;
	uploadContainer.style.display = 'none';
	playbackUI.style.display = 'flex';

	const reader = new FileReader();
	reader.onload = (ev) => {
		if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
		audioContext.decodeAudioData(ev.target.result, (buffer) => {
			if (source) source.disconnect();
			source = audioContext.createBufferSource();
			source.buffer = buffer;
			analyser = audioContext.createAnalyser();
			analyser.fftSize = 512;
			source.connect(analyser);
			analyser.connect(audioContext.destination);
			dataArray = new Uint8Array(analyser.frequencyBinCount);
			source.start(0);
			isPlaying = true;

			source.onended = () => { isPlaying = false; playPauseBtn.textContent = "Replay"; }
		});
	};
	reader.readAsArrayBuffer(file);
});

playPauseBtn.addEventListener('click', () => {
	if (!audioContext) return;
	if (audioContext.state === 'suspended') {
		audioContext.resume();
		isPlaying = true;
		playPauseBtn.textContent = "Pause";
	} else if (audioContext.state === 'running') {
		audioContext.suspend();
		isPlaying = false;
		playPauseBtn.textContent = "Resume";
	}
});

function animate() {
	requestAnimationFrame(animate);

	time += 0.005;

	let bass = 0, mid = 0, high = 0;

	if (analyser && isPlaying) {
		analyser.getByteFrequencyData(dataArray);
		const len = dataArray.length;

		let bassSum = 0; let range = Math.floor(len * 0.1);
		for (let i = 0; i < range; i++) bassSum += dataArray[i];
		bass = bassSum / range; // 0-255

		// Use bass to drive time faster
		time += (bass / 255) * 0.02;
	}

	// Animate Lights
	lights.forEach((l, i) => {
		l.angle += l.speed + (bass * 0.0001); // Spin faster with bass
		l.light.position.x = Math.cos(l.angle) * l.radius;
		l.light.position.y = Math.sin(l.angle) * l.radius;
		l.light.position.z = Math.sin(l.angle * 2) * 5;

		// Pulse intensity
		if (bass > 100) {
			l.light.intensity = 500 + (bass * 2);
		} else {
			l.light.intensity = 500;
		}
	});

	// Animate Sphere Distortion
	const positions = geometry.attributes.position.array;
	const count = positions.length / 3;

	// Distortion Settings
	const baseRoughness = 2.0; // Noise frequency
	const baseAmp = 0.5; // Idle amplitude
	const reactAmp = (bass / 255) * 3.5; // Reactive amplitude

	for (let i = 0; i < count; i++) {
		const idx = i * 3;
		const ox = originalPositions[idx];
		const oy = originalPositions[idx + 1];
		const oz = originalPositions[idx + 2];

		const vector = new THREE.Vector3(ox, oy, oz);
		const dir = vector.clone().normalize();

		// Simplex noise based on position + time
		const n = noise.noise3D(
			ox * 0.5 + time,
			oy * 0.5 + time,
			oz * 0.5 // Slow z-scrolling noise
		);

		const displacement = baseAmp + (reactAmp * Math.abs(n)); // Always push out or in based on noise

		const newPos = dir.multiplyScalar(4 + displacement * n);

		positions[idx] = newPos.x;
		positions[idx + 1] = newPos.y;
		positions[idx + 2] = newPos.z;
	}

	geometry.attributes.position.needsUpdate = true;
	geometry.computeVertexNormals(); // Crucial for lighting reflections to look liquid

	// Rotate Sphere
	sphere.rotation.y += 0.001;
	sphere.rotation.z += 0.001;

	// Animate Stars (Warp Speed Effect)
	const stars = scene.getObjectByName('stars');
	if (stars) {
		const sPos = stars.geometry.attributes.position.array;
		for (let i = 0; i < sPos.length / 3; i++) {
			let z = sPos[i * 3 + 2];
			z += 0.1 + (bass / 255) * 0.8; // Move faster with bass
			if (z > 50) z = -50;
			sPos[i * 3 + 2] = z;
		}
		stars.geometry.attributes.position.needsUpdate = true;
	}

	composer.render();
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	composer.setSize(window.innerWidth, window.innerHeight);
}

init();
