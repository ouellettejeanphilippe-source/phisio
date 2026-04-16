const test = require('node:test');
const assert = require('node:assert');

// Mock DOM
global.document = {
    getElementById: (id) => {
        return {
            id: id,
            textContent: '',
            style: { display: 'none' }
        };
    }
};
global.setTimeout = (fn, delay) => {
    // Immediate execution for tests
};

const { showError, showSuccess } = require('./app.js');

test('Security: showError and showSuccess use textContent', async (t) => {
    await t.test('showError sets textContent and does not interpret HTML', () => {
        const mockElement = { textContent: '', style: { display: 'none' } };
        const originalGetElementById = global.document.getElementById;
        global.document.getElementById = (id) => {
            if (id === 'error-container') return mockElement;
            return null;
        };

        const payload = '<img src=x onerror=alert(1)>';
        showError(payload);

        assert.strictEqual(mockElement.textContent, payload);
        assert.strictEqual(mockElement.style.display, 'block');

        global.document.getElementById = originalGetElementById;
    });

    await t.test('showSuccess sets textContent and does not interpret HTML', () => {
        const mockElement = { textContent: '', style: { display: 'none' } };
        const originalGetElementById = global.document.getElementById;
        global.document.getElementById = (id) => {
            if (id === 'success-container') return mockElement;
            return null;
        };

        const payload = '<svg onload=alert(1)>';
        showSuccess(payload);

        assert.strictEqual(mockElement.textContent, payload);
        assert.strictEqual(mockElement.style.display, 'block');

        global.document.getElementById = originalGetElementById;
    });
});
