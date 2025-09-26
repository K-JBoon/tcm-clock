import { TCM_CONSTANTS } from './constants.js';
import { TCMUtils } from './utils.js';

export class TCMClockAnimations {
	constructor() {
		this.isAnimating = false;
		this.timeoutManager = TCMUtils.createTimeoutManager();
	}

	cancelCurrentAnimation(arrow) {
		// Clear all pending timeouts
		this.timeoutManager.clear();

		// Stop current CSS animations
		arrow.style.animation = '';
		arrow.style.transition = '';
	}

	getTransitionAnimationName(fromSegment, toSegment) {
		// Handle wrap-around cases to determine shortest path
		const diff = toSegment - fromSegment;

		// For 5->0 transition, check if we should go the short way (5->0) or long way (5->4->3->2->1->0)
		if (fromSegment === 5 && toSegment === 0) {
			return diff === -5 ? 'segment-5-to-0' : 'segment-5-to-0-wrap';
		}

		// For 0->5 transition, check if we should go the short way (0->5) or long way (0->1->2->3->4->5)
		if (fromSegment === 0 && toSegment === 5) {
			return diff === 5 ? 'segment-0-to-5' : 'segment-0-to-5-wrap';
		}

		// For all adjacent transitions, use the direct animation
		const animationMap = {
			'0-1': 'segment-0-to-1',
			'0-5': 'segment-0-to-5',
			'1-0': 'segment-1-to-0',
			'1-2': 'segment-1-to-2',
			'2-1': 'segment-2-to-1',
			'2-3': 'segment-2-to-3',
			'3-2': 'segment-3-to-2',
			'3-4': 'segment-3-to-4',
			'4-3': 'segment-4-to-3',
			'4-5': 'segment-4-to-5',
			'5-4': 'segment-5-to-4',
			'5-0': 'segment-5-to-0'
		};

		const key = `${fromSegment}-${toSegment}`;
		return animationMap[key] || null;
	}

	animateArrowTransition(arrow, fromSegment, toSegment, callback) {
		// Get the animation name for this transition
		const animationName = this.getTransitionAnimationName(fromSegment, toSegment);
		const finalRotation = toSegment * 60;

		if (animationName) {
			// Apply the pre-defined animation
			arrow.style.animation = `${animationName} 1.5s forwards`;

			// Add vibration effect after main animation
			const vibrationTimeout = setTimeout(() => {
				arrow.style.setProperty('--target-rotation', `${finalRotation}deg`);
				arrow.style.animation = `hourHandVibrate ${TCM_CONSTANTS.ANIMATION.VIBRATION_DURATION}ms ease-out forwards`;

				// Clean up animation after completion and execute callback
				const cleanupTimeout = setTimeout(() => {
					arrow.style.animation = '';
					arrow.style.transform = `translate(-50%, -100%) rotate(${finalRotation}deg)`;
					if (callback) callback();

					// Remove timeouts from tracking array
					this.timeoutManager.remove(vibrationTimeout);
					this.timeoutManager.remove(cleanupTimeout);
				}, TCM_CONSTANTS.ANIMATION.VIBRATION_DURATION);

				this.timeoutManager.add(cleanupTimeout);
			}, TCM_CONSTANTS.ANIMATION.TRANSITION_DURATION);

			this.timeoutManager.add(vibrationTimeout);
		} else {
			// Fallback to direct transform if no animation found
			arrow.style.transition = `transform ${TCM_CONSTANTS.ANIMATION.TRANSITION_DURATION}ms cubic-bezier(0.25, 0.1, 0.25, 1.5)`;
			arrow.style.transform = `translate(-50%, -100%) rotate(${finalRotation}deg)`;

			// Execute callback after fallback animation
			const fallbackTimeout = setTimeout(() => {
				arrow.style.transition = '';
				if (callback) callback();

				// Remove timeout from tracking array
				this.timeoutManager.remove(fallbackTimeout);
			}, TCM_CONSTANTS.ANIMATION.TRANSITION_DURATION);

			this.timeoutManager.add(fallbackTimeout);
		}
	}

	handleArrowUpdate(arrow, previousSegment, currentSegment) {
		// Check if we need to animate the arrow
		if (previousSegment !== null && previousSegment !== currentSegment) {
			if (this.isAnimating) {
				// Cancel current animation
				this.cancelCurrentAnimation(arrow);
			}

			// Set animating flag to prevent multiple simultaneous animations
			this.isAnimating = true;

			// Animate the existing arrow to new position
			this.animateArrowTransition(arrow, previousSegment, currentSegment, () => {
				this.isAnimating = false;
			});
		}
	}

	cleanup() {
		// Clear all pending timeouts
		this.timeoutManager.clear();
		this.isAnimating = false;
	}
}
