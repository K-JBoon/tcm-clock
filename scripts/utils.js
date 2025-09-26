import { TCM_CONSTANTS } from './constants.js';

export class TCMUtils {
	static getSetting(key) {
		return game.settings.get(TCM_CONSTANTS.MODULE_ID, key);
	}

	static async setSetting(key, value) {
		return await game.settings.set(TCM_CONSTANTS.MODULE_ID, key, value);
	}

	static getSegmentIndex(segmentName) {
		return TCM_CONSTANTS.SEGMENTS.indexOf(segmentName);
	}

	static getSegmentName(index) {
		return TCM_CONSTANTS.SEGMENTS[index];
	}

	static getSegmentEnvironment(segmentIndex) {
		const segmentName = this.getSegmentName(segmentIndex);
		if (!segmentName) return null;

		return {
			hue: this.getSetting(`${segmentName}BaseHue`),
			luminosity: this.getSetting(`${segmentName}BaseLuminosity`),
			saturation: this.getSetting(`${segmentName}BaseSaturation`),
			shadows: this.getSetting(`${segmentName}BaseShadows`),
			intensity: this.getSetting(`${segmentName}BaseIntensity`)
		};
	}

	static capitalizeFirst(str) {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	static clamp(value, min, max) {
		return Math.min(Math.max(value, min), max);
	}

	static lerp(start, end, progress) {
		return start + (end - start) * progress;
	}

	static lerpHue(startHue, endHue, progress) {
		const normalizeHue = (hue) => ((hue % 1) + 1) % 1;
		const start = normalizeHue(startHue);
		const end = normalizeHue(endHue);

		let diff = end - start;
		if (diff > 0.5) diff -= 1;
		if (diff < -0.5) diff += 1;

		return normalizeHue(start + diff * progress);
	}

	static easeInOutQuad(t) {
		return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
	}

	static isGM() {
		return game.user.isGM;
	}

	static getActiveScene() {
		return game.scenes.active;
	}

	static async updateScene(updateData) {
		const scene = this.getActiveScene();
		if (!scene) return;

		try {
			await scene.update(updateData);
		} catch (error) {
			console.warn("TCM Clock: Could not update scene:", error);
			throw error;
		}
	}

	static emitSocket(data) {
		game.socket.emit(`module.${TCM_CONSTANTS.MODULE_ID}`, data);
	}

	static querySelector(parent, selector) {
		return parent.querySelector(selector);
	}

	static createTimeoutManager() {
		const timeouts = [];

		return {
			add: (timeoutId) => timeouts.push(timeoutId),
			remove: (timeoutId) => {
				const index = timeouts.indexOf(timeoutId);
				if (index > -1) timeouts.splice(index, 1);
			},
			clear: () => {
				timeouts.forEach(id => clearTimeout(id));
				timeouts.length = 0;
			}
		};
	}
}