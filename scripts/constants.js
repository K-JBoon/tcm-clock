export const TCM_CONSTANTS = {
	MODULE_ID: 'tcm-clock',

	SEGMENTS: ['dusk', 'nightfall', 'evening', 'midnight', 'witching', 'twilight'],

	get SEGMENT_CHOICES() {
		return {
			'midnight': game.i18n.localize('TCMCLOCK.segments.midnight'),
			'witching': game.i18n.localize('TCMCLOCK.segments.witching'),
			'twilight': game.i18n.localize('TCMCLOCK.segments.twilight'),
			'dusk': game.i18n.localize('TCMCLOCK.segments.dusk'),
			'nightfall': game.i18n.localize('TCMCLOCK.segments.nightfall'),
			'evening': game.i18n.localize('TCMCLOCK.segments.evening')
		};
	},

	DEFAULT_BASE_HUES: {
		dusk: 0.075,
		nightfall: 0.011111,
		evening: 0.363888,
		midnight: 0.630555,
		witching: 0.758333,
		twilight: 0.886611
	},

	DEFAULT_BASE_ENV: {
		dusk: { luminosity: -0.3, saturation: -0.15, shadows: 0.15, intensity: 0.6 },
		nightfall: { luminosity: -0.3, saturation: -0.4, shadows: 0.25, intensity: 0.5 },
		evening: { luminosity: -0.6, saturation: -0.6, shadows: 0.55, intensity: 0.25 },
		midnight: { luminosity: -1, saturation: -0.5, shadows: 0.75, intensity: 0.3 },
		witching: { luminosity: -0.9, saturation: -0.4, shadows: 0.65, intensity: 0.45 },
		twilight: { luminosity: -0.6, saturation: -0.35, shadows: 0.6, intensity: 0.45 }
	},

	ANIMATION: {
		TRANSITION_DURATION: 1500,
		VIBRATION_DURATION: 600,
		INTERPOLATION_DURATION: 7500,
		INTERPOLATION_STEPS: 1000
	},

	SCALE_LIMITS: {
		MIN: 0.5,
		MAX: 2.0,
		STEP: 0.1
	}
};