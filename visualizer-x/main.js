import * as THREE from 'three';
import { AudioProcessor } from './audio-processor.js';
import { SceneManager } from './scenes/SceneManager.js';
import { CoreScene } from './scenes/CoreScene.js';
import { TerrainScene } from './scenes/TerrainScene.js';
import { WarpScene } from './scenes/WarpScene.js';

const ui = {
	startScreen: document.getElementById('start-screen'),
	playbackControls: document.getElementById('playback-controls'),
	trackName: document.getElementById('track-name'),
	playParams: document.getElementById('play-pause-btn'), // Assuming ID is play-pause-btn
	progressBar: document.getElementById('progress-bar'),
	sceneName: document.getElementById('scene-name'),
	nextSceneBtn: document.getElementById('next-scene-btn'),
	prevSceneBtn: document.getElementById('prev-scene-btn'),
	fileInput: document.getElementById('audio-upload'),
	dropZone: document.getElementById('drop-zone')
};

// Global State
let audioProcessor;
let sceneManager;
let renderer;
let lastTime = 0;
let sceneRotationTimer = 0;
const SCENE_ROTATION_INTERVAL = 45; // Auto-switch every 45s

function init() {
	// Renderer Setup
	renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.toneMapping = THREE.ReinhardToneMapping;
	document.getElementById('canvas-container').appendChild(renderer.domElement);

	// Audio & Scene Setup
	audioProcessor = new AudioProcessor();
	sceneManager = new SceneManager(renderer, audioProcessor);

	// Register Scenes
	sceneManager.addScene('CORE', new CoreScene(renderer, audioProcessor));
	sceneManager.addScene('TERRAIN', new TerrainScene(renderer, audioProcessor));
	sceneManager.addScene('WARP', new WarpScene(renderer, audioProcessor));

	// Start Scene
	sceneManager.switchScene('CORE');
	ui.sceneName.textContent = 'CORE';

	// Event Listeners
	setupEventListeners();

	// Resize Handler
	window.addEventListener('resize', onWindowResize);

	// Start Loop
	animate(0);
}

function setupEventListeners() {
	// File Upload
	ui.fileInput.addEventListener('change', handleFileSelect);

	// Drag & Drop
	ui.dropZone.addEventListener('dragover', (e) => {
		e.preventDefault();
		ui.dropZone.style.borderColor = 'var(--accent)';
		ui.dropZone.style.transform = 'scale(1.02)';
	});
	ui.dropZone.addEventListener('dragleave', (e) => {
		e.preventDefault();
		ui.dropZone.style.borderColor = 'var(--text-main)';
		ui.dropZone.style.transform = 'scale(1)';
	});
	ui.dropZone.addEventListener('drop', (e) => {
		e.preventDefault();
		ui.dropZone.style.borderColor = 'var(--text-main)';
		ui.dropZone.style.transform = 'scale(1)';
		const file = e.dataTransfer.files[0];
		if (file) loadAudio(file);
	});

	// Controls
	const playBtn = document.getElementById('play-pause-btn');
	if (playBtn) {
		playBtn.addEventListener('click', () => {
			const isPlaying = audioProcessor.togglePlay();
			playBtn.textContent = isPlaying ? "PAUSE" : "PLAY";
		});
	}

	ui.nextSceneBtn.addEventListener('click', () => {
		switchScene(1);
	});

	ui.prevSceneBtn.addEventListener('click', () => {
		switchScene(-1);
	});
}

function switchScene(direction) {
	const scenes = Object.keys(sceneManager.scenes);
	const currentIdx = scenes.indexOf(sceneManager.currentSceneName);
	let newIdx = (currentIdx + direction) % scenes.length;
	if (newIdx < 0) newIdx = scenes.length - 1;

	const newSceneName = scenes[newIdx];
	sceneManager.switchScene(newSceneName);
	if (ui.sceneName) ui.sceneName.textContent = newSceneName;
	sceneRotationTimer = 0; // Reset auto-timer
}

function handleFileSelect(event) {
	const file = event.target.files[0];
	if (file) {
		loadAudio(file);
	}
}

function loadAudio(file) {
	ui.trackName.textContent = file.name.replace(/\.[^/.]+$/, "");
	ui.startScreen.classList.add('fade-out');

	setTimeout(() => {
		ui.startScreen.style.display = 'none';
		ui.playbackControls.classList.remove('hidden');
	}, 800);

	const reader = new FileReader();
	reader.onload = (e) => {
		audioProcessor.init(e.target.result);
	};
	reader.readAsArrayBuffer(file);
}

function onWindowResize() {
	renderer.setSize(window.innerWidth, window.innerHeight);
	sceneManager.resize();
}

function animate(time) {
	requestAnimationFrame(animate);

	const dt = (time - lastTime) / 1000;
	lastTime = time;

	// Safety check for huge dt (tab inactive)
	const safeDt = Math.min(dt, 0.1);

	audioProcessor.update();
	sceneManager.update(safeDt, time / 1000);

	// Auto-Scene Rotation Logic & Progress Pulse
	if (audioProcessor.isPlaying) {
		sceneRotationTimer += safeDt;

		const levels = audioProcessor.getLevels();

		// Progress bar visual hack
		if (ui.progressBar) {
			if (levels.bass > 0.8) {
				ui.progressBar.style.width = (levels.bass * 100) + '%';
				ui.progressBar.style.boxShadow = `0 0 15px var(--accent-2)`;
			} else {
				ui.progressBar.style.width = (levels.mid * 50 + 20) + '%';
				ui.progressBar.style.boxShadow = `0 0 5px var(--accent)`;
			}
		}

		// Auto Switch
		if (sceneRotationTimer > SCENE_ROTATION_INTERVAL) {
			if (levels.bass > 0.9) { // Drop detection
				switchScene(1);
			} else if (sceneRotationTimer > SCENE_ROTATION_INTERVAL + 15) {
				switchScene(1);
			}
		}
	}
}

init();
