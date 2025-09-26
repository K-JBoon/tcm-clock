import { TCM_CONSTANTS } from './constants.js';
import { TCMUtils } from './utils.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

class TCMLightingSubmenu extends HandlebarsApplicationMixin(ApplicationV2) {
	constructor(segment, options = {}) {
		super(options);
		this.segment = segment;
		this.segmentTitle = segment.charAt(0).toUpperCase() + segment.slice(1);
	}

	static DEFAULT_OPTIONS = {
		id: 'tcm-lighting-submenu',
		tag: 'form',
		window: {
			title: 'TCM Clock - Lighting Settings',
			contentClasses: ['standard-form']
		},
		position: {
			width: 520,
			height: 'auto'
		},
		form: {
			handler: TCMLightingSubmenu.onSubmit,
			submitOnChange: false,
			closeOnSubmit: true,
		}
	};

	static PARTS = {
		form: {
			template: 'modules/tcm-clock/templates/lighting-settings.hbs'
		},
		footer: {
			template: 'templates/generic/form-footer.hbs',
		},
	};

	get title() {
		return `TCM Clock - ${this.segmentTitle} Lighting Settings`;
	}

	async _prepareContext(_options) {
		const settings = TCMLightingSubmenu.getSettings(this.segment);
		const data = {};

		settings.forEach(({ key, options: settingOptions }) => {
			let value = TCMUtils.getSetting(key);

			const isHueField = key.endsWith('Hue');
			const isBoolean = settingOptions.type === Boolean;

			data[key] = {
				...settingOptions,
				value: value,
				key: key,
				hueField: isHueField,
				isBoolean: isBoolean
			};
		});

		return {
			settings: data,
			segment: this.segment,
			segmentTitle: this.segmentTitle,
			baseSettings: [
				data[`${this.segment}BaseLuminosity`],
				data[`${this.segment}BaseSaturation`],
				data[`${this.segment}BaseShadows`],
				data[`${this.segment}BaseHue`],
				data[`${this.segment}BaseIntensity`],
			],
			buttons: [
				{ type: 'submit', icon: 'fa-solid fa-save', label: 'SETTINGS.Save' },
			]
		};
	}

	_attachFrameListeners() {
		super._attachFrameListeners();
		this.element.addEventListener('input', this._onRangeInput.bind(this));
		this.element.addEventListener('click', this._onButtonClick.bind(this));
	}

	_onRangeInput(event) {
		if (event.target.type === 'range') {
			const valueSpan = event.target.nextElementSibling;
			if (valueSpan && valueSpan.classList.contains('range-value')) {
				valueSpan.textContent = event.target.value;
			}
		}
	}

	_onButtonClick(event) {
		if (event.target.dataset.action === 'reset') {
			this._resetToDefaults();
		}
	}

	async _resetToDefaults() {
		const settings = TCMLightingSubmenu.getSettings(this.segment);
		for (const { key, options } of settings) {
			await TCMUtils.setSetting(key, options.default);
		}
		this.render(true);
	}

	static async onSubmit(_event, _form, formData) {
		for (const [key, value] of Object.entries(formData.object)) {
			let finalValue = value;

			await TCMUtils.setSetting(key, finalValue);
		}
	}

	static getSettings(segment) {
		const defaultBaseHues = TCM_CONSTANTS.DEFAULT_BASE_HUES;
		const defaultBaseEnv = TCM_CONSTANTS.DEFAULT_BASE_ENV;

		return [
			{
				key: `${segment}BaseHue`,
				options: {
					name: `Hue`,
					hint: `Hue value for ${segment} lighting environment`,
					type: Number,
					default: defaultBaseHues[segment]
				}
			},
			{
				key: `${segment}BaseLuminosity`,
				options: {
					name: `Luminosity`,
					hint: `Environment luminosity for ${segment} (-1 to 1)`,
					type: Number,
					default: defaultBaseEnv[segment].luminosity,
					range: { min: -1, max: 1, step: 0.05 }
				}
			},
			{
				key: `${segment}BaseSaturation`,
				options: {
					name: `Saturation`,
					hint: `Environment saturation for ${segment} (-1 to 1)`,
					type: Number,
					default: defaultBaseEnv[segment].saturation,
					range: { min: -1, max: 1, step: 0.05 }
				}
			},
			{
				key: `${segment}BaseShadows`,
				options: {
					name: `Shadows`,
					hint: `Environment shadow intensity for ${segment} (0 to 1)`,
					type: Number,
					default: defaultBaseEnv[segment].shadows,
					range: { min: 0, max: 1, step: 0.05 }
				}
			},
			{
				key: `${segment}BaseIntensity`,
				options: {
					name: `Hue Intensity`,
					hint: `Environment light intensity for ${segment} (0 to 1)`,
					type: Number,
					default: defaultBaseEnv[segment].intensity,
					range: { min: 0, max: 1, step: 0.05 }
				}
			}
		];
	}
}

export class TCMClockSettings {
	static register() {
		// Current time segment (0-5)
		game.settings.register(TCM_CONSTANTS.MODULE_ID, 'currentSegment', {
			name: 'Current Time Segment',
			hint: 'The current time segment (0-5)',
			scope: 'world',
			config: false,
			type: Number,
			default: 0
		});

		// Current night
		game.settings.register(TCM_CONSTANTS.MODULE_ID, 'currentNight', {
			name: 'Current Night',
			hint: 'The current night number',
			scope: 'world',
			config: false,
			type: Number,
			default: 1
		});

		// Clock visibility
		game.settings.register(TCM_CONSTANTS.MODULE_ID, 'clockVisible', {
			name: 'Clock Visible',
			hint: 'Whether the clock overlay is visible',
			scope: 'local',
			config: false,
			type: Boolean,
			default: true
		});

		// General settings - ordered as requested
		game.settings.register(TCM_CONSTANTS.MODULE_ID, 'clockScale', {
			name: 'Clock Scale',
			hint: 'Scale factor for the clock widget size (0.5-2.0)',
			scope: 'client',
			config: true,
			type: Number,
			default: 1.0,
			requiresReload: true,
			range: {
				min: TCM_CONSTANTS.SCALE_LIMITS.MIN,
				max: TCM_CONSTANTS.SCALE_LIMITS.MAX,
				step: TCM_CONSTANTS.SCALE_LIMITS.STEP
			}
		});

		game.settings.register(TCM_CONSTANTS.MODULE_ID, 'nightIncrementSegment', {
			name: 'Night Increment Segment',
			hint: 'Which time segment triggers the night counter to increment',
			scope: 'world',
			config: true,
			type: String,
			default: 'midnight',
			choices: TCM_CONSTANTS.SEGMENT_CHOICES
		});

		game.settings.register(TCM_CONSTANTS.MODULE_ID, 'lightingIntegration', {
			name: 'TCMCLOCK.settings.lightingIntegration.Name',
			hint: 'TCMCLOCK.settings.lightingIntegration.Hint',
			scope: 'world',
			config: true,
			type: Boolean,
			default: false,
		});

		// Register lighting environment settings for each segment
		TCMClockSettings._registerLightingSettings();
	}

	static _registerLightingSettings() {
		const segmentNames = TCM_CONSTANTS.SEGMENTS;

		segmentNames.forEach((segment) => {
			const segmentTitle = TCMUtils.capitalizeFirst(segment);

			// Create a dynamic submenu class for this segment
			const SegmentSubmenu = class extends TCMLightingSubmenu {
				constructor(options = {}) {
					super(segment, options);
				}

				static get DEFAULT_OPTIONS() {
					return foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
						window: {
							title: `TCM Clock - ${segmentTitle} Lighting Settings`
						}
					});
				}
			};

			// Register the submenu for this segment
			game.settings.registerMenu(TCM_CONSTANTS.MODULE_ID, `${segment}LightingMenu`, {
				name: `${segmentTitle} Lighting`,
				label: `Configure ${segmentTitle}`,
				hint: `Configure lighting settings for ${segment} time segment`,
				icon: 'fas fa-sun',
				type: SegmentSubmenu,
				restricted: true
			});

			// Register the actual settings (hidden from main config)
			const settingsConfig = TCMLightingSubmenu.getSettings(segment);
			settingsConfig.forEach(({ key, options }) => {
				game.settings.register(TCM_CONSTANTS.MODULE_ID, key, {
					...options,
					scope: 'world',
					config: false // Hide from main settings menu since they're in submenu
				});
			});
		});
	}

	static getSegmentIndex(segmentName) {
		return TCMUtils.getSegmentIndex(segmentName);
	}

	static getSegmentEnvironment(segmentIndex) {
		return TCMUtils.getSegmentEnvironment(segmentIndex);
	}
}
