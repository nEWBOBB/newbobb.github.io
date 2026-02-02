import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class SceneManager {
	constructor(renderer, audioProcessor) {
		this.renderer = renderer;
		this.audioProcessor = audioProcessor;
		this.scenes = {};
		this.currentSceneName = null;
		this.currentScene = null;

		// Post Processing Global Setup
		this.composer = new EffectComposer(renderer);
		this.renderPass = null;
		this.bloomPass = new UnrealBloomPass(
			new THREE.Vector2(window.innerWidth, window.innerHeight),
			1.5, // strength
			0.4, // radius
			0.85 // threshold
		);

		this.composer.addPass(this.bloomPass);
	}

	addScene(name, sceneInstance) {
		this.scenes[name] = sceneInstance;
		sceneInstance.init();
	}

	switchScene(name) {
		if (!this.scenes[name]) {
			console.warn(`Scene ${name} does not exist.`);
			return;
		}

		if (this.currentScene) {
			this.currentScene.onDeactivate();
		}

		this.currentSceneName = name;
		this.currentScene = this.scenes[name];
		this.currentScene.onActivate();

		console.log(`Switched to scene: ${name}`);

		// Update Post Processing Render Pass
		if (this.renderPass) {
			this.composer.removePass(this.renderPass);
		}

		// Create new RenderPass for the new scene
		this.renderPass = new RenderPass(this.currentScene.scene, this.currentScene.camera);

		// Insert RenderPass at the beginning (index 0)
		this.composer.insertPass(this.renderPass, 0);
	}

	update(dt, time) {
		if (this.currentScene) {
			this.currentScene.update(dt, time);
			this.composer.render();
		}
	}

	resize() {
		const width = window.innerWidth;
		const height = window.innerHeight;

		this.composer.setSize(width, height);

		if (this.currentScene) {
			this.currentScene.resize();
		}
	}
}
