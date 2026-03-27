const test = require('node:test');
const assert = require('node:assert');
const { getExImage } = require('./utils.js');

test('getExImage function', async (t) => {
    await t.test('returns the original image URL if provided', () => {
        const ex = { nom: 'Pompes', image: 'https://example.com/image.jpg' };
        const result = getExImage(ex);
        assert.strictEqual(result, 'https://example.com/image.jpg');
    });

    await t.test('returns plank SVG for plank-related keywords', () => {
        const keywords = ['pompe', 'push', 'gainage', 'planche'];
        keywords.forEach(keyword => {
            const ex = { nom: keyword };
            const result = getExImage(ex);
            assert.ok(result.startsWith('data:image/svg+xml'), `Failed for ${keyword}`);
            // Check for specific element that characterizes the plank SVG (e.g., the ground line)
            assert.ok(decodeURIComponent(result).includes('x1="30" y1="300" x2="370" y2="300"'), `SVG for ${keyword} missing ground line`);
        });
    });

    await t.test('returns pull-up SVG for pull-up-related keywords', () => {
        const keywords = ['traction', 'pull', 'muscle up'];
        keywords.forEach(keyword => {
            const ex = { nom: keyword };
            const result = getExImage(ex);
            assert.ok(result.startsWith('data:image/svg+xml'), `Failed for ${keyword}`);
            // Check for the bar line
            assert.ok(decodeURIComponent(result).includes('x1="100" y1="100" x2="300" y2="100"'), `SVG for ${keyword} missing bar line`);
        });
    });

    await t.test('returns squat SVG for squat-related keywords', () => {
        const keywords = ['squat', 'fente', 'chaise', 'leg'];
        keywords.forEach(keyword => {
            const ex = { nom: keyword };
            const result = getExImage(ex);
            assert.ok(result.startsWith('data:image/svg+xml'), `Failed for ${keyword}`);
            // Check for the calf line
            assert.ok(decodeURIComponent(result).includes('x1="250" y1="220" x2="250" y2="300"'), `SVG for ${keyword} missing calf line`);
        });
    });

    await t.test('returns crunch SVG for abdominal-related keywords', () => {
        const keywords = ['abdo', 'crunch', 'sit'];
        keywords.forEach(keyword => {
            const ex = { nom: keyword };
            const result = getExImage(ex);
            assert.ok(result.startsWith('data:image/svg+xml'), `Failed for ${keyword}`);
            // Check for the bent legs
            assert.ok(decodeURIComponent(result).includes('points="180,280 130,200 80,280"'), `SVG for ${keyword} missing bent legs`);
        });
    });

    await t.test('returns running SVG for run-related keywords', () => {
        const keywords = ['course', 'run', 'sprint', 'jog'];
        keywords.forEach(keyword => {
            const ex = { nom: keyword };
            const result = getExImage(ex);
            assert.ok(result.startsWith('data:image/svg+xml'), `Failed for ${keyword}`);
            // Check for the front arm
            assert.ok(decodeURIComponent(result).includes('points="215,160 160,180 140,140"'), `SVG for ${keyword} missing front arm`);
        });
    });

    await t.test('returns default dumbbell SVG for unknown exercise', () => {
        const ex = { nom: 'un connu' };
        const result = getExImage(ex);
        assert.ok(result.startsWith('data:image/svg+xml'));
        // Check for the dumbbell handle
        assert.ok(decodeURIComponent(result).includes('x="185" y="100" width="30" height="200"'), 'SVG missing dumbbell handle');
    });

    await t.test('handles missing or empty name by returning default SVG', () => {
        const cases = [{}, { nom: '' }, { nom: null }];
        cases.forEach(ex => {
            const result = getExImage(ex);
            assert.ok(result.startsWith('data:image/svg+xml'));
            assert.ok(decodeURIComponent(result).includes('x="185" y="100" width="30" height="200"'));
        });
    });
});
