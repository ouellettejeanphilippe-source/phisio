const test = require('node:test');
const assert = require('node:assert');
const { extractUniqueTags } = require('./app.js');

test('extractUniqueTags function', async (t) => {
    await t.test('extracts unique tags from exercises', () => {
        const exercises = [
            { tags: 'Poids du corps, Force', tagsArray: ['Poids du corps', 'Force'] },
            { tags: 'Force, Cardio', tagsArray: ['Force', 'Cardio'] }
        ];
        const result = extractUniqueTags(exercises);
        assert.deepStrictEqual(result, ['Cardio', 'Force', 'Poids du corps']);
    });

    await t.test('handles exercises without tags', () => {
        const exercises = [
            { tags: 'Force', tagsArray: ['Force'] },
            { name: 'No Tags' }
        ];
        const result = extractUniqueTags(exercises);
        assert.deepStrictEqual(result, ['Force']);
    });

    await t.test('handles empty tag strings and extra whitespace', () => {
        const exercises = [
            { tags: '  Force ,  ', tagsArray: ['Force'] },
            { tags: ', Poids du corps', tagsArray: ['Poids du corps'] }
        ];
        const result = extractUniqueTags(exercises);
        assert.deepStrictEqual(result, ['Force', 'Poids du corps']);
    });

    await t.test('returns sorted tags', () => {
        const exercises = [
            { tags: 'Z-Tag, A-Tag, M-Tag', tagsArray: ['Z-Tag', 'A-Tag', 'M-Tag'] }
        ];
        const result = extractUniqueTags(exercises);
        assert.deepStrictEqual(result, ['A-Tag', 'M-Tag', 'Z-Tag']);
    });

    await t.test('handles empty input array', () => {
        const result = extractUniqueTags([]);
        assert.deepStrictEqual(result, []);
    });

    await t.test('handles null/undefined tags', () => {
        const exercises = [
            { tags: null },
            { tags: undefined }
        ];
        const result = extractUniqueTags(exercises);
        assert.deepStrictEqual(result, []);
    });
});
