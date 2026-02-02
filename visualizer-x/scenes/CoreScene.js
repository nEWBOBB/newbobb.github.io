
import * as THREE from 'three';
import { BaseScene } from './BaseScene.js';

export class CoreScene extends BaseScene {
	constructor(renderer, audioProcessor) {
		super(renderer, audioProcessor);
		this.particles = null;
		this.geometry = null;
		this.material = null;
		this.originalPositions = null;
	}

	init() {
		this.scene.fog = new THREE.FogExp2(0x000000, 0.035);
		this.camera.position.z = 25;

		// Create the particle sphere (Core)
		const baseGeo = new THREE.IcosahedronGeometry(8, 6); // Detail level 6
		this.geometry = new THREE.BufferGeometry();

		const count = baseGeo.attributes.position.count;
		const positions = new Float32Array(count * 3);
		const colors = new Float32Array(count * 3);
		const sizes = new Float32Array(count);

		this.originalPositions = new Float32Array(count * 3);

		const color1 = new THREE.Color(0x00f2ff); // Cyan
		const color2 = new THREE.Color(0xff0055); // Magenta

		for (let i = 0; i < count; i++) {
			const x = baseGeo.attributes.position.getX(i);
			const y = baseGeo.attributes.position.getY(i);
			const z = baseGeo.attributes.position.getZ(i);

			positions[i * 3] = x;
			positions[i * 3 + 1] = y;
			positions[i * 3 + 2] = z;

			this.originalPositions[i * 3] = x;
			this.originalPositions[i * 3 + 1] = y;
			this.originalPositions[i * 3 + 2] = z;

			// Initial random gradient
			const mixedColor = color1.clone().lerp(color2, Math.random());
			colors[i * 3] = mixedColor.r;
			colors[i * 3 + 1] = mixedColor.g;
			colors[i * 3 + 2] = mixedColor.b;

			sizes[i] = Math.random() < 0.1 ? 2.0 : 0.5; // Some sparkle particles
		}

		this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
		this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

		// Shader Material for glowing dots
		// We use points material with vertex colors
		const sprite = this.getSprite();

		this.material = new THREE.PointsMaterial({
			size: 0.3,
			map: sprite,
			vertexColors: true,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
			transparent: true,
			sizeAttenuation: true
		});

		this.particles = new THREE.Points(this.geometry, this.material);
		this.scene.add(this.particles);

		// Background Stars
		this.addBackgroundStars();
	}

	getSprite() {
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
		return new THREE.CanvasTexture(canvas);
	}

	addBackgroundStars() {
		const bgGeo = new THREE.BufferGeometry();
		const bgPos = [];
		for (let i = 0; i < 2000; i++) {
			bgPos.push((Math.random() - 0.5) * 300, (Math.random() - 0.5) * 300, (Math.random() - 0.5) * 300);
		}
		bgGeo.setAttribute('position', new THREE.Float32BufferAttribute(bgPos, 3));
		const bgMat = new THREE.PointsMaterial({ color: 0x444444, size: 0.2, transparent: true, opacity: 0.6 });
		const stars = new THREE.Points(bgGeo, bgMat);
		this.scene.add(stars);
	}

	update(dt, time) {
		if (!this.particles) return;

		const levels = this.audioProcessor.getLevels();
		const { bass, mid, treble } = levels;

		const positions = this.geometry.attributes.position.array;
		const colors = this.geometry.attributes.color.array;

		// Rotation based on bass intensity
		this.particles.rotation.y += 0.002 + (bass * 0.01);
		this.particles.rotation.z += (bass * 0.005);

		// Heartbeat Pulse
		const pulse = 1 + bass * 0.3;
		this.particles.scale.set(pulse, pulse, pulse);

		const count = this.geometry.attributes.position.count;

		const colorLow = new THREE.Color(0x00f2ff); // Cyan
		const colorHigh = new THREE.Color(0xff0055); // Magenta
		const colorPeak = new THREE.Color(0xffffff); // White

		for (let i = 0; i < count; i++) {
			const i3 = i * 3;
			const ox = this.originalPositions[i3];
			const oy = this.originalPositions[i3 + 1];
			const oz = this.originalPositions[i3 + 2];

			// Simplex-like noise movement
			const noise = Math.sin(time * 2 + ox * 0.5) * Math.cos(time * 1.5 + oy * 0.5);

			// Displacement
			// Bass expands the core, Treble makes the surface jittery
			const displace = (bass * 0.5) + (noise * 0.2) + (treble * Math.sin(time * 10 + i) * 3);

			const vector = new THREE.Vector3(ox, oy, oz).normalize();
			const newPos = vector.multiplyScalar(8 + displace); // 8 is base radius

			positions[i3] = newPos.x;
			positions[i3 + 1] = newPos.y;
			positions[i3 + 2] = newPos.z;

			// Dynamic Color
			// Vertices further out get "hotter" colors
			const dist = newPos.length();
			const intensity = (dist - 8) / 3; // normalized intensity

			const targetColor = colorLow.clone().lerp(colorHigh, Math.min(1, intensity + bass));
			if (treble > 0.7 && Math.random() > 0.95) targetColor.lerp(colorPeak, 0.8); // Sparkles on hi-hats

			colors[i3] = targetColor.r;
			colors[i3 + 1] = targetColor.g;
			colors[i3 + 2] = targetColor.b;
		}

		this.geometry.attributes.position.needsUpdate = true;
		this.geometry.attributes.color.needsUpdate = true;
	}
}
