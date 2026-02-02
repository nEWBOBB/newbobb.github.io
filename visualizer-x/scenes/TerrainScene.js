
import * as THREE from 'three';
import { BaseScene } from './BaseScene.js';

export class TerrainScene extends BaseScene {
	constructor(renderer, audioProcessor) {
		super(renderer, audioProcessor);
		this.planeMesh = null;
		this.wireframeMesh = null;
	}

	init() {
		this.scene.background = new THREE.Color(0x000000);
		this.scene.fog = new THREE.Fog(0x000000, 10, 50);

		this.camera.position.set(0, 5, 10);
		this.camera.lookAt(0, 0, -20);

		// Create Terrain
		const width = 60;
		const depth = 60;
		const widthSegments = 40;
		const depthSegments = 40;

		const geometry = new THREE.PlaneGeometry(width, depth, widthSegments, depthSegments);
		geometry.rotateX(-Math.PI / 2);

		// Store original positions for deformation
		const count = geometry.attributes.position.count;
		const positions = geometry.attributes.position.array;
		this.originalPositions = new Float32Array(count * 3);
		for (let i = 0; i < count * 3; i++) {
			this.originalPositions[i] = positions[i];
		}

		// Material 1: Solid darkly colored ground
		const material = new THREE.MeshStandardMaterial({
			color: 0x111111,
			roughness: 0.8,
			metalness: 0.2,
			flatShading: true
		});

		this.planeMesh = new THREE.Mesh(geometry, material);
		this.scene.add(this.planeMesh);

		// Material 2: Glowing Wireframe on top
		const wireframeMaterial = new THREE.LineBasicMaterial({
			color: 0x00f2ff, // Cyan Neon
			transparent: true,
			opacity: 0.5
		});

		const wireframeGeo = new THREE.WireframeGeometry(geometry);
		this.wireframeMesh = new THREE.LineSegments(wireframeGeo, wireframeMaterial);
		// Slight offset to prevent z-fighting
		this.wireframeMesh.position.y = 0.05;
		this.scene.add(this.wireframeMesh);

		// Decor: Sun/Moon in distance
		const sunGeo = new THREE.CircleGeometry(15, 32);
		const sunMat = new THREE.MeshBasicMaterial({ color: 0xff0055 }); // Magenta Sun
		const sun = new THREE.Mesh(sunGeo, sunMat);
		sun.position.set(0, 10, -40);
		this.scene.add(sun);

		// Grid Lines moving above
		const gridHelper = new THREE.GridHelper(100, 40, 0x555555, 0x222222);
		gridHelper.position.y = 20;
		this.scene.add(gridHelper);
	}

	update(dt, time) {
		if (!this.planeMesh) return;

		const levels = this.audioProcessor.getLevels();
		const { bass, mid, treble } = levels;

		// Move Forward
		const speed = 5 + (bass * 10); // Speed up on beat drop
		const zOffset = (time * speed) % 20;

		this.planeMesh.position.z = zOffset;
		this.wireframeMesh.position.z = zOffset;

		// Update Camera Shake on Bass
		this.camera.position.y = 5 + Math.sin(time * 2) * 0.2 + (bass * 0.5);
		this.camera.position.x = Math.sin(time * 0.5) * 2;
		this.camera.lookAt(0, 2, -30);

		// Deform Terrain based on Audio
		const positions = this.planeMesh.geometry.attributes.position.array;
		const wirePositions = this.wireframeMesh.geometry.attributes.position.array;
		// Note: updating WireframeGeometry positions directly is tricky because it's a line list, not indexed mesh.
		// Easier to just update the MAIN mesh and let the wireframe be a separate object if it was a clone, 
		// but WireframeGeometry creates new buffer. 
		// Better approach: Use EdgesGeometry or just simple grid texture. But for now, let's just animate the solid mesh heavily.

		const count = this.planeMesh.geometry.attributes.position.count;

		for (let i = 0; i < count; i++) {
			const x = this.originalPositions[i * 3];
			const z = this.originalPositions[i * 3 + 2];

			// Perlin-ish noise landscape moving towards camera
			// We simulate movement by adding (time * speed) to the noise input coordinate
			const moveZ = z - (time * speed);

			// Simplex Noise Simulation
			const noise1 = Math.sin(x * 0.3 + moveZ * 0.2);
			const noise2 = Math.cos(x * 0.8 + moveZ * 0.5);

			let height = (noise1 + noise2) * 2;

			// React to bass in the center "road"
			if (Math.abs(x) < 10) {
				height *= (1 + bass * 2);
			} else {
				// Spikes on the side based on treble
				height += (Math.random() * treble * 2);
			}

			positions[i * 3 + 1] = height; // Y is up
		}

		this.planeMesh.geometry.attributes.position.needsUpdate = true;

		// Color flash on beat
		if (bass > 0.8) {
			this.scene.background.setHex(0x110011);
		} else {
			this.scene.background.lerp(new THREE.Color(0x000000), 0.1);
		}
	}
}
