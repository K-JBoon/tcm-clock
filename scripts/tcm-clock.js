import { TCMClockSettings } from './settings.js';
import { TCMClockLighting } from './lighting.js';
import { TCMClockAnimations } from './animations.js';
import { TCM_CONSTANTS } from './constants.js';
import { TCMUtils } from './utils.js';

const { ApplicationV2 } = foundry.applications.api;

class TCMClock extends ApplicationV2 {
	static ID = TCM_CONSTANTS.MODULE_ID;
	static instance = null;

	constructor(options = {}) {
		super(options);

		this.socket = `module.${TCM_CONSTANTS.MODULE_ID}`;
		this.lighting = new TCMClockLighting();
		this.animations = new TCMClockAnimations();
		this.previousSegment = null;
	}

	static getInstance() {
		if (!TCMClock.instance) {
			// Apply scale setting
			const scale = TCMUtils.getSetting('clockScale');

			TCMClock.instance = new TCMClock({
				id: TCMClock.ID,
				window: { frame: false, positioned: true },
				position: {
					width: 512,
					height: 512,
					top: 50,
					left: 150,
					scale,
				}
			});
		}
		return TCMClock.instance;
	}


	initialize() {
		// Initialize previous segment to current value
		this.previousSegment = TCMUtils.getSetting('currentSegment');

		// Register socket for syncing between players
		game.socket.on(this.socket, this._onSocketMessage.bind(this));

		// Hook into canvas ready to add our overlay
		Hooks.on('canvasReady', async () => {
			const clockVisible = TCMUtils.getSetting('clockVisible');
			if (clockVisible) {
				await this.render({ force: true });
			}

			// Initialize lighting for current segment if lighting integration is enabled
			if (TCMUtils.isGM()) {
				const currentSegment = TCMUtils.getSetting('currentSegment');
				await this.lighting.handleLightingChange(currentSegment);
			}
		});

		// Re-render overlay when settings change
		Hooks.on('updateSetting', (setting) => {
			if (setting.key.startsWith(`${TCM_CONSTANTS.MODULE_ID}.`)) {
				this.render({ force: true });
			}
		});

		Hooks.on('getSceneControlButtons', (controls) => {
			const currentVisibility = TCMUtils.getSetting('clockVisible');
			controls.tokens.tools['tcm-clock'] = {
				name: 'tcm-clock',
				toggle: true,
				title: game.i18n.localize("TCMCLOCK.controls.toggleClock"),
				icon: "fas fa-clock",
				active: currentVisibility,
				onChange: () => this.toggleClockVisibility()
			};
		});
	}

    async _prepareContext(_options = {}) {
      const context = {};
      return context;
    }

    async _renderHTML(_context, _options) {
        return null;
    }

	_postRender() {
		this._setupDraggable(this.element);
	}

    _replaceHTML(_result, content, _options) {
        this._updateDynamicContent(content);
    }


	async _renderFrame(options) {
		const context = await this._prepareContext(options);
		const frame = await super._renderFrame(options);

		const target = this.hasFrame ? frame.querySelector('.window-content') : frame;
		if (!target) return frame;

		const overlayContainer = this._createOverlayContainer();

		// Create the static frame elements
		overlayContainer.innerHTML = this._generateStaticFrameHTML();

		// Add event listeners for GM controls
		this._attachEventListeners(overlayContainer);

		target.appendChild(overlayContainer);

		// Update dynamic content
		await this._renderHTML(context, options);
		this._replaceHTML(null, overlayContainer);

		return frame;
	}

	_generateStaticFrameHTML() {
		const currentSegment = TCMUtils.getSetting('currentSegment');
		const currentNight = TCMUtils.getSetting('currentNight');
		const rotation = currentSegment * 60;

		return `
<div class="clock-container">
<div class="clock-face">
<div class="clock-arrow" id="clock-arrow-overlay" style="transform: translate(-50%, -100%) rotate(${rotation}deg);"></div>
</div>
<div class="night-counter">
Night <span class="night-number" id="night-number-overlay">${currentNight}</span>
</div>
${TCMUtils.isGM() ? `
<div class="gm-controls">
<button id="prev-time" title="${game.i18n.localize('TCMCLOCK.controls.previousTime')}">◄</button>
<button id="next-time" title="${game.i18n.localize('TCMCLOCK.controls.nextTime')}">►</button>
</div>
` : ''}
</div>
`;
	}

	_attachEventListeners(container) {
		if (!TCMUtils.isGM()) return;

		const prevBtn = container.querySelector('#prev-time');
		const nextBtn = container.querySelector('#next-time');
		const nightCounter = container.querySelector('.night-counter');

		if (prevBtn) prevBtn.onclick = () => this.changeTime(-1);
		if (nextBtn) nextBtn.onclick = () => this.changeTime(1);
		if (nightCounter) nightCounter.onclick = () => this.editNightCounter();
	}

	_createOverlayContainer() {
		const overlayContainer = document.createElement('div');
		overlayContainer.id = 'tcm-clock-overlay';
		overlayContainer.className = 'tcm-clock-overlay';

		// Style the overlay to be positioned absolutely and not interfere with UI
		overlayContainer.style.pointerEvents = 'auto';
		overlayContainer.style.userSelect = 'none';

		return overlayContainer;
	}

	_updateDynamicContent(container) {
		const existingArrow = container.querySelector('#clock-arrow-overlay');
		const existingNightNumber = container.querySelector('#night-number-overlay');

		if (existingArrow) {
			const currentSegment = TCMUtils.getSetting('currentSegment');
			this.animations.handleArrowUpdate(existingArrow, this.previousSegment, currentSegment);
			this.previousSegment = currentSegment;
		}

		if (existingNightNumber) {
			const currentNight = TCMUtils.getSetting('currentNight');
			existingNightNumber.textContent = currentNight;
		}
	}

	_setupDraggable(element) {
		const dragHandle = element.querySelector('.clock-face');
		if (dragHandle) {
			new foundry.applications.ux.Draggable(this, element, dragHandle);
		}
	}

	async changeTime(direction) {
		if (!TCMUtils.isGM()) return;

		let currentSegment = TCMUtils.getSetting('currentSegment');
		let currentNight = TCMUtils.getSetting('currentNight');
		const nightIncrementSegment = TCMUtils.getSetting('nightIncrementSegment');
		const incrementSegmentIndex = TCMUtils.getSegmentIndex(nightIncrementSegment);

		const oldSegment = currentSegment;
		currentSegment += direction;

		// Handle wraparound
		if (currentSegment < 0) {
			currentSegment = 5;
		} else if (currentSegment > 5) {
			currentSegment = 0;
		}

		// Handle night changes based on configurable segment
		if (direction > 0) {
			// Moving forward: increment night when we reach the incrementSegmentIndex
			if (currentSegment === incrementSegmentIndex) {
				currentNight++;
			}
		} else if (direction < 0) {
			// Moving backward: decrement night when we reach the segment BEFORE incrementSegmentIndex
			const previousSegmentIndex = (incrementSegmentIndex - 1 + 6) % 6;
			if (currentSegment === previousSegmentIndex) {
				currentNight = Math.max(1, currentNight - 1);
			}
		}

		await TCMUtils.setSetting('currentSegment', currentSegment);
		await TCMUtils.setSetting('currentNight', currentNight);

		// Handle lighting change
		await this.lighting.handleLightingChange(currentSegment, oldSegment);

		// Broadcast to other clients
		TCMUtils.emitSocket({
			action: 'updateTime',
			segment: currentSegment,
			night: currentNight
		});
	}

	async editNightCounter() {
		if (!TCMUtils.isGM()) return;

		const currentNight = TCMUtils.getSetting('currentNight');

		const newNight = await foundry.applications.api.DialogV2.prompt({
			window: { title: game.i18n.localize('TCMCLOCK.dialog.editNightCounter.title') },
			content: `<p>${game.i18n.localize('TCMCLOCK.dialog.editNightCounter.content')}</p><input type="number" name="night" value="${currentNight}" min="1" style="width: 100%;">`,
			ok: {
				label: game.i18n.localize('TCMCLOCK.dialog.editNightCounter.change'),
				callback: (_event, button, _dialog) => {
					return button.form.elements.night.valueAsNumber;
				},
			}
		});

		if (newNight && newNight !== currentNight) {
			await TCMUtils.setSetting('currentNight', Math.max(1, newNight));

			// Broadcast to other clients
			TCMUtils.emitSocket({
				action: 'updateNight',
				night: newNight
			});
		}
	}

	async toggleClockVisibility() {
		const currentVisibility = TCMUtils.getSetting('clockVisible');
		await TCMUtils.setSetting('clockVisible', !currentVisibility);

		if (currentVisibility) {
			this.close({ animate: false });
		} else {
			this.render({ force: true });
		}
	}

	_onSocketMessage(data) {
		if (!TCMUtils.isGM()) return;

		switch (data.action) {
			case 'updateTime':
				const oldSegment = TCMUtils.getSetting('currentSegment');
				TCMUtils.setSetting('currentSegment', data.segment);
				TCMUtils.setSetting('currentNight', data.night);
				this.lighting.handleLightingChange(data.segment, oldSegment);
				break;
			case 'updateNight':
				TCMUtils.setSetting('currentNight', data.night);
				break;
		}
	}
}

Hooks.once('init', () => {
	TCMClockSettings.register();
	TCMClock.getInstance().initialize();
});
