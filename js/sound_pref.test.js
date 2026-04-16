const test = require('node:test');
const assert = require('node:assert');

// Setup mocks
const mockElements = {
    'toggle-sound': { checked: true },
    'toggle-slider': { style: {} },
    'toggle-knob': { style: {} }
};

global.document = {
    getElementById: (id) => mockElements[id]
};

const storage = {};
global.localStorage = {
    setItem: (key, value) => { storage[key] = value; },
    getItem: (key) => storage[key] || null
};

global.navigator = { vibrate: () => {} };
global.window = {};

// To mock playBeep, we can't easily do it because it's in the same scope as toggleSoundPref in app.js
// and Node's require wraps the whole thing.
// BUT, we can verify that toggleSoundPref does what it's supposed to do regarding storage and UI.

const app = require('./app.js');
const { toggleSoundPref, updateToggleUI } = app;

test('Sound Preference Logic', async (t) => {
    await t.test('toggleSoundPref updates storage and UI', () => {
        // Mock checkbox as checked
        mockElements['toggle-sound'].checked = true;

        toggleSoundPref();

        assert.strictEqual(storage['fitness_sound_pref'], '1');
        assert.strictEqual(mockElements['toggle-slider'].style.backgroundColor, 'var(--accent-color)');

        // Mock checkbox as unchecked
        mockElements['toggle-sound'].checked = false;

        toggleSoundPref();

        assert.strictEqual(storage['fitness_sound_pref'], '0');
        assert.strictEqual(mockElements['toggle-slider'].style.backgroundColor, 'var(--surface-hover)');
    });

    await t.test('updateToggleUI applies correct styles when enabled', () => {
        // We simulate soundEnabled = true by using toggleSoundPref
        mockElements['toggle-sound'].checked = true;
        toggleSoundPref();

        const slider = mockElements['toggle-slider'];
        const knob = mockElements['toggle-knob'];

        assert.strictEqual(slider.style.backgroundColor, 'var(--accent-color)');
        assert.strictEqual(slider.style.borderColor, 'var(--accent-color)');
        assert.strictEqual(knob.style.backgroundColor, '#000');
        assert.strictEqual(knob.style.transform, 'translateX(20px)');
    });

    await t.test('updateToggleUI applies correct styles when disabled', () => {
        mockElements['toggle-sound'].checked = false;
        toggleSoundPref();

        const slider = mockElements['toggle-slider'];
        const knob = mockElements['toggle-knob'];

        assert.strictEqual(slider.style.backgroundColor, 'var(--surface-hover)');
        assert.strictEqual(slider.style.borderColor, 'var(--border-color)');
        assert.strictEqual(knob.style.backgroundColor, 'var(--text-secondary)');
        assert.strictEqual(knob.style.transform, 'translateX(0)');
    });
});
