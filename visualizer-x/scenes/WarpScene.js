
import * as THREE from 'three';
import { BaseScene } from './BaseScene.js';

export class WarpScene extends BaseScene {
	constructor(renderer, audioProcessor) {
		super(renderer, audioProcessor);
		this.stars = null;
		this.nebulaMesh = null;
	}

	init() {
		this.scene.background = new THREE.Color(0x000005);
		this.scene.fog = new THREE.FogExp2(0x000005, 0.002);

		// Camera is flying
		this.camera.position.z = 1000;

		// 1. Warp Stars (Tunnel effect)
		const starGeo = new THREE.BufferGeometry();
		const starPos = [];
		const starVel = []; // Custom attribute for velocity variance

		for (let i = 0; i < 6000; i++) {
			const x = (Math.random() - 0.5) * 2000;
			const y = (Math.random() - 0.5) * 2000;
			const z = (Math.random() - 0.5) * 2000;
			starPos.push(x, y, z);
			starVel.push(Math.random());
		}

		starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
		starGeo.setAttribute('velocity', new THREE.Float32BufferAttribute(starVel, 1));

		const starMat = new THREE.PointsMaterial({
			color: 0xffffff,
			size: 2,
			transparent: true,
			opacity: 0.8,
			sizeAttenuation: true
		});

		this.stars = new THREE.Points(starGeo, starMat);
		this.scene.add(this.stars);

		// 2. Central Ring / Stargate
		this.createStargate();
	}

	createStargate() {
		// Multiple rings rotating
		const torusGeo = new THREE.TorusGeometry(10, 0.5, 16, 100);
		const torusMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff, wireframe: true });

		this.ring1 = new THREE.Mesh(torusGeo, torusMat);
		this.ring2 = new THREE.Mesh(torusGeo, torusMat);
		this.ring3 = new THREE.Mesh(torusGeo, torusMat);

		this.ring2.scale.set(1.5, 1.5, 1.5);
		this.ring3.scale.set(2.0, 2.0, 2.0);

		this.ringsGroup = new THREE.Group();
		this.ringsGroup.add(this.ring1, this.ring2, this.ring3);
		this.ringsGroup.position.z = 800; // In front of camera start

		this.scene.add(this.ringsGroup);
	}

	update(dt, time) {
		if (!this.stars) return;

		const { bass, treble } = this.audioProcessor.getLevels();

		// WARP SPEED CALCULATION
		// Bass drives the speed heavily
		const warpSpeed = 10 + (bass * 100) + (treble * 20);

		const positions = this.stars.geometry.attributes.position.array;
		const velocities = this.stars.geometry.attributes.velocity.array;
		const count = this.stars.geometry.attributes.position.count;

		for (let i = 0; i < count; i++) {
			// Move stars towards camera (positive Z is backward, so we move +Z to fly "forward" if camera is at +1000 looking at 0)
			// Actually typically camera at 0, stars move +Z to pass by. Let's do that.
			// Let's assume camera is at 0 looking at -Z. Stars move +Z.

			let z = positions[i * 3 + 2];
			z += warpSpeed * (0.5 + velocities[i]); // Apply individual variance

			if (z > 1000) {
				z = -1000; // Reset to far distance
				// Randomize X/Y again for variety
				positions[i * 3] = (Math.random() - 0.5) * 2000;
				positions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
			}

			positions[i * 3 + 2] = z;
		}

		this.stars.geometry.attributes.position.needsUpdate = true;

		// Spin Rings
		if (this.ringsGroup) {
			this.ringsGroup.position.z -= warpSpeed * 0.5;
			if (this.ringsGroup.position.z > 200) {
				this.ringsGroup.position.z = -1000;
			}

			// Rotate on beat
			this.ring1.rotation.z += 0.01 + bass * 0.1;
			this.ring2.rotation.x += 0.02 + bass * 0.05;
			this.ring3.rotation.y += 0.01 + treble * 0.1;

			// Color flash
			if (bass > 0.8) {
				this.ring1.material.color.setHex(0xff0055);
			} else {
				this.ring1.material.color.lerp(new THREE.Color(0x00f2ff), 0.1);
			}
		}

		// Camera shake
		this.camera.position.x = (Math.random() - 0.5) * bass * 2;
		this.camera.position.y = (Math.random() - 0.5) * bass * 2;
	}
}
