import { TCMClockSettings } from './settings.js';
import { TCM_CONSTANTS } from './constants.js';
import { TCMUtils } from './utils.js';

export class TCMClockLighting {
	constructor() {
		this.lightingIntervalId = null;
		this.interpolationDuration = TCM_CONSTANTS.ANIMATION.INTERPOLATION_DURATION;
		this.interpolationSteps = TCM_CONSTANTS.ANIMATION.INTERPOLATION_STEPS;
	}


	async updateSceneLighting(environment) {
		if (!TCMUtils.isGM()) return;

		try {
			const updateData = {
				"environment.base.hue": environment.hue,
				"environment.base.luminosity": environment.luminosity,
				"environment.base.saturation": environment.saturation,
				"environment.base.shadows": environment.shadows,
				"environment.base.intensity": environment.intensity
			};

			await TCMUtils.updateScene(updateData);
		} catch (error) {
			console.warn("TCM Clock: Could not update scene lighting:", error);
		}
	}


	async handleLightingChange(newSegment, oldSegment = null) {
		if (!TCMUtils.getSetting('lightingIntegration')) return;
		if (!TCMUtils.isGM()) return;

		const newSegmentEnv = TCMUtils.getSegmentEnvironment(newSegment);
		if (!newSegmentEnv) return;

		// Clean up any existing interpolation
		this.cleanup();

		// If no old segment specified, get current environment or use immediate transition
		if (oldSegment === null) {
			await this.updateSceneLighting(newSegmentEnv);
			return;
		}

		const oldSegmentEnv = TCMUtils.getSegmentEnvironment(oldSegment);
		if (!oldSegmentEnv) {
			await this.updateSceneLighting(newSegmentEnv);
			return;
		}

		// Start interpolation
		await this.interpolateLighting(oldSegmentEnv, newSegmentEnv);
	}

	async interpolateLighting(fromEnv, toEnv) {
		const stepInterval = this.interpolationDuration / this.interpolationSteps;
		let currentStep = 0;


		return new Promise((resolve) => {
			this.lightingIntervalId = setInterval(async () => {
				currentStep++;
				const progress = Math.min(currentStep / this.interpolationSteps, 1);

				// Use easing function for smoother interpolation
				const easedProgress = TCMUtils.easeInOutQuad(progress);

				const interpolatedEnv = {
					hue: TCMUtils.lerpHue(fromEnv.hue, toEnv.hue, easedProgress),
					luminosity: TCMUtils.lerp(fromEnv.luminosity, toEnv.luminosity, easedProgress),
					saturation: TCMUtils.lerp(fromEnv.saturation, toEnv.saturation, easedProgress),
					shadows: TCMUtils.lerp(fromEnv.shadows, toEnv.shadows, easedProgress),
					intensity: TCMUtils.lerp(fromEnv.intensity, toEnv.intensity, easedProgress)
				};

				await this.updateSceneLighting(interpolatedEnv);

				if (progress >= 1) {
					clearInterval(this.lightingIntervalId);
					this.lightingIntervalId = null;
					resolve();
				}
			}, stepInterval);
		});
	}


	cleanup() {
		if (this.lightingIntervalId) {
			clearInterval(this.lightingIntervalId);
			this.lightingIntervalId = null;
		}
	}
}
