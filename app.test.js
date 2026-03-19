const test = require('node:test');
const assert = require('node:assert');

// Mock DOM environment
const mockElements = {
    'toggle-sound': { checked: true },
    'toggle-slider': { style: {} },
    'toggle-knob': { style: {} }
};

global.document = {
    getElementById: (id) => mockElements[id]
};

// Mock localStorage
const mockLocalStorage = {
    store: {},
    setItem(key, value) { this.store[key] = String(value); },
    getItem(key) { return this.store[key] || null; }
};
global.localStorage = mockLocalStorage;

// Mock AudioContext
global.window = {
    AudioContext: class {
        createOscillator() { return { connect: () => {}, frequency: { setValueAtTime: () => {} }, start: () => {}, stop: () => {} }; }
        createGain() { return { connect: () => {}, gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } }; }
        get destination() { return {}; }
        get currentTime() { return 0; }
        resume() { return Promise.resolve(); }
        get state() { return 'suspended'; }
    }
};

// Import app.js (it will use the mocks)
const app = require('./app.js');

test('toggleSoundPref functionality', async (t) => {
    await t.test('enables sound correctly', (t) => {
        // Mock playBeep in module exports to track calls
        const originalPlayBeep = app.playBeep;
        let beepCalled = false;
        app.playBeep = () => { beepCalled = true; };

        mockElements['toggle-sound'].checked = true;
        app.toggleSoundPref();

        assert.strictEqual(app.soundEnabled, true);
        assert.strictEqual(localStorage.getItem('fitness_sound_pref'), '1');
        assert.strictEqual(mockElements['toggle-slider'].style.backgroundColor, 'var(--accent-color)');
        assert.strictEqual(mockElements['toggle-knob'].style.transform, 'translateX(20px)');
        assert.strictEqual(beepCalled, true, 'playBeep should be called when sound is enabled');

        app.playBeep = originalPlayBeep;
    });

    await t.test('disables sound correctly', (t) => {
        // Mock playBeep in module exports to track calls
        const originalPlayBeep = app.playBeep;
        let beepCalled = false;
        app.playBeep = () => { beepCalled = true; };

        mockElements['toggle-sound'].checked = false;
        app.toggleSoundPref();

        assert.strictEqual(app.soundEnabled, false);
        assert.strictEqual(localStorage.getItem('fitness_sound_pref'), '0');
        assert.strictEqual(mockElements['toggle-slider'].style.backgroundColor, 'var(--surface-hover)');
        assert.strictEqual(mockElements['toggle-knob'].style.transform, 'translateX(0)');
        assert.strictEqual(beepCalled, false, 'playBeep should not be called when sound is disabled');

        app.playBeep = originalPlayBeep;
    });
});
