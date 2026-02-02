import * as THREE from 'three';

export class BaseScene {
	constructor(renderer, audioProcessor) {
		this.renderer = renderer;
		this.audioProcessor = audioProcessor;
		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
		this.isActive = false;
	}

	init() {
		// Override this to setup scene specific objects
		console.log("BaseScene initialized");
	}

	update(dt, time) {
		// Override this for animation logic
	}

	resize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
	}

	onActivate() {
		this.isActive = true;
	}

	onDeactivate() {
		this.isActive = false;
	}

	dispose() {
		// Cleanup geometries/materials
		this.scene.traverse((object) => {
			if (object.geometry) object.geometry.dispose();
			if (object.material) {
				if (Array.isArray(object.material)) {
					object.material.forEach(material => material.dispose());
				} else {
					object.material.dispose();
				}
			}
		});
	}
}
