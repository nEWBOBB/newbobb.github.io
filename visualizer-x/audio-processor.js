export class AudioProcessor {
	constructor() {
		this.audioContext = null;
		this.analyser = null;
		this.source = null;
		this.dataArray = null;
		this.isPlaying = false;

		// Frequency bins
		this.bass = 0;
		this.mid = 0;
		this.treble = 0;

		// Smoothed values for less jittery visuals
		this.bassSmooth = 0;
		this.midSmooth = 0;
		this.trebleSmooth = 0;
	}

	init(audioBuffer) {
		if (this.audioContext) {
			if (this.source) {
				try { this.source.stop(); } catch (e) { }
				this.source.disconnect();
			}
			this.audioContext.close();
		}

		this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
		this.analyser = this.audioContext.createAnalyser();
		this.analyser.fftSize = 2048; // High resolution
		this.analyser.smoothingTimeConstant = 0.85; // Smooth transitions

		this.processBuffer(audioBuffer);
	}

	processBuffer(buffer) {
		this.source = this.audioContext.createBufferSource();
		this.source.buffer = buffer;
		this.source.connect(this.analyser);
		this.analyser.connect(this.audioContext.destination);

		this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

		this.source.onended = () => {
			this.isPlaying = false;
			// Dispatch event or callback could be added here
		};

		this.source.start(0);
		this.isPlaying = true;
	}

	togglePlay() {
		if (!this.audioContext) return false;

		if (this.audioContext.state === 'running') {
			this.audioContext.suspend();
			this.isPlaying = false;
		} else if (this.audioContext.state === 'suspended') {
			this.audioContext.resume();
			this.isPlaying = true;
		}
		return this.isPlaying;
	}

	update() {
		if (!this.analyser || !this.isPlaying) return;

		this.analyser.getByteFrequencyData(this.dataArray);

		const bufferLength = this.analyser.frequencyBinCount;

		// Calculate custom frequency ranges
		// Bass: ~20Hz - ~140Hz
		// Mid: ~140Hz - ~2.5kHz
		// Treble: ~2.5kHz - ~20kHz

		// With 44.1kHz sample rate and fftSize 2048, each bin is ~21.5Hz
		const bassEnd = Math.floor(140 / 21.5);
		const midEnd = Math.floor(2500 / 21.5);

		let b = 0, m = 0, t = 0;
		let bCount = 0, mCount = 0, tCount = 0;

		for (let i = 0; i < bufferLength; i++) {
			const val = this.dataArray[i];
			if (i <= bassEnd) {
				b += val;
				bCount++;
			} else if (i <= midEnd) {
				m += val;
				mCount++;
			} else {
				t += val;
				tCount++;
			}
		}

		// Normalize to 0-1
		this.bass = bCount > 0 ? (b / bCount) / 255 : 0;
		this.mid = mCount > 0 ? (m / mCount) / 255 : 0;
		this.treble = tCount > 0 ? (t / tCount) / 255 : 0;

		// Exponential boost for perceived loudness
		this.bass = Math.pow(this.bass, 1.2);

		// Smooth values (Linear interpolation)
		this.bassSmooth += (this.bass - this.bassSmooth) * 0.2;
		this.midSmooth += (this.mid - this.midSmooth) * 0.2;
		this.trebleSmooth += (this.treble - this.trebleSmooth) * 0.2;
	}

	getLevels() {
		return {
			bass: this.bassSmooth,
			mid: this.midSmooth,
			treble: this.trebleSmooth,
			raw: this.dataArray
		};
	}
}
