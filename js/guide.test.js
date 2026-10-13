const test = require('node:test');
const assert = require('node:assert');
const {
    GUIDE_DEFAULT_TEMPO,
    GUIDE_PREPARE_SECS,
    GUIDE_SWITCH_SECS,
    guideTempo,
    guideSides,
    buildSetSteps,
    setDuration,
    estimateWorkoutDuration,
    formatEstimate,
    describeTarget,
    doneInSet
} = require('./guide.js');

const kinds = steps => steps.map(s => s.kind);

test('guideTempo', async (t) => {
    await t.test('uses the default when the exercise has no tempo', () => {
        assert.strictEqual(guideTempo({}), GUIDE_DEFAULT_TEMPO);
    });

    await t.test('clamps unreasonable values', () => {
        assert.strictEqual(guideTempo({ tempo: 0.2 }), 1.5);
        assert.strictEqual(guideTempo({ tempo: 60 }), 10);
        assert.strictEqual(guideTempo({ tempo: '4' }), 4);
    });
});

test('buildSetSteps', async (t) => {
    await t.test('paces every repetition', () => {
        const steps = buildSetSteps({ type: 'reps', valeur: 3, tempo: 2 });
        assert.deepStrictEqual(kinds(steps), ['rep', 'rep', 'rep']);
        assert.deepStrictEqual(steps.map(s => s.rep), [1, 2, 3]);
        assert.ok(steps.every(s => s.secs === 2 && s.total === 3));
    });

    await t.test('treats weighted and untyped exercises as repetitions', () => {
        assert.deepStrictEqual(kinds(buildSetSteps({ type: 'poids', valeur: 2 })), ['rep', 'rep']);
        assert.deepStrictEqual(kinds(buildSetSteps({ valeur: 2 })), ['rep', 'rep']);
    });

    await t.test('times an isometric hold', () => {
        assert.deepStrictEqual(buildSetSteps({ type: 'secs', valeur: 30 }), [{ kind: 'hold', secs: 30, side: null }]);
    });

    await t.test('alternates contraction and relaxation for cycles', () => {
        const steps = buildSetSteps({ type: 'kegel', valeur: 2, kegel_on: 5, kegel_off: 3 });
        assert.deepStrictEqual(kinds(steps), ['contract', 'relax', 'contract', 'relax']);
        assert.deepStrictEqual(steps.map(s => s.secs), [5, 3, 5, 3]);
        assert.deepStrictEqual(steps.map(s => s.cycle), [1, 1, 2, 2]);
    });

    await t.test('waits for the user on a distance', () => {
        assert.deepStrictEqual(buildSetSteps({ type: 'distance', valeur: 2 }), [{ kind: 'manual', secs: null, side: null }]);
    });

    await t.test('does both sides of a unilateral exercise with a switch', () => {
        const steps = buildSetSteps({ type: 'secs', valeur: 20, unilateral: true });
        assert.deepStrictEqual(kinds(steps), ['hold', 'switch', 'hold']);
        assert.deepStrictEqual(steps.map(s => s.side), ['gauche', 'droit', 'droit']);
        assert.strictEqual(steps[1].secs, GUIDE_SWITCH_SECS);
    });

    await t.test('never splits pelvic floor cycles by side', () => {
        assert.deepStrictEqual(guideSides({ type: 'kegel', unilateral: true }), [null]);
    });

    await t.test('adds an announcement only when asked', () => {
        assert.strictEqual(buildSetSteps({ type: 'secs', valeur: 10 }, { prepareSecs: 5 })[0].kind, 'prepare');
        assert.strictEqual(buildSetSteps({ type: 'secs', valeur: 10 }, { prepareSecs: 0 })[0].kind, 'hold');
    });

    await t.test('falls back to sensible values on broken data', () => {
        assert.strictEqual(buildSetSteps({ type: 'reps', valeur: 'abc' }).length, 10);
        assert.strictEqual(buildSetSteps({ type: 'reps', valeur: 5000 }).length, 200);
    });
});

test('estimateWorkoutDuration', async (t) => {
    await t.test('counts work, rests and the announcement of each exercise', () => {
        const exos = [
            { type: 'reps', series: 2, valeur: 10, tempo: 3, repos: 30 }, // 2 × 30 s + 30 s
            { type: 'secs', series: 1, valeur: 45, repos: 60 }            // 45 s, pas de repos final
        ];
        // annonce 5 + (60 + 30) + avant l'exercice 2 : 30 + 45
        assert.strictEqual(estimateWorkoutDuration(exos), GUIDE_PREPARE_SECS + 90 + 30 + 45);
        assert.strictEqual(setDuration(exos[0]), 30);
    });

    await t.test('handles empty input', () => {
        assert.strictEqual(estimateWorkoutDuration([]), 0);
        assert.strictEqual(estimateWorkoutDuration(null), 0);
    });

    await t.test('formats an estimate in minutes', () => {
        assert.strictEqual(formatEstimate(14 * 60 + 10), '~14 min');
        assert.strictEqual(formatEstimate(20), '< 1 min');
        assert.strictEqual(formatEstimate(0), '');
    });
});

test('describeTarget', async (t) => {
    await t.test('reads naturally for each type', () => {
        assert.strictEqual(describeTarget({ type: 'reps', series: 3, valeur: 10 }), '3 séries de 10 répétitions');
        assert.strictEqual(describeTarget({ type: 'secs', series: 1, valeur: 30 }), '1 série de 30 secondes de maintien');
        assert.strictEqual(describeTarget({ type: 'kegel', series: 2, valeur: 10 }), '2 séries de 10 cycles');
        assert.strictEqual(describeTarget({ type: 'poids', series: 3, valeur: 8, poids: 20 }), '3 séries de 8 répétitions à 20 kilos');
        assert.strictEqual(describeTarget({ type: 'reps', series: 2, valeur: 12, unilateral: true }), '2 séries de 12 répétitions, de chaque côté');
    });
});

test('doneInSet', async (t) => {
    await t.test('counts completed repetitions', () => {
        const steps = buildSetSteps({ type: 'reps', valeur: 10 });
        assert.strictEqual(doneInSet(steps, 4), 4);
    });

    await t.test('counts seconds held, including the current hold', () => {
        const steps = buildSetSteps({ type: 'secs', valeur: 30 });
        assert.strictEqual(doneInSet(steps, 0, 12.7), 12);
    });

    await t.test('counts finished cycles only', () => {
        const steps = buildSetSteps({ type: 'kegel', valeur: 5 });
        assert.strictEqual(doneInSet(steps, 5), 2); // cycle 3 entamé
    });

    await t.test('averages per side on a unilateral exercise', () => {
        const steps = buildSetSteps({ type: 'reps', valeur: 10, unilateral: true });
        // 10 à gauche, changement de côté, 4 à droite
        assert.strictEqual(doneInSet(steps, 15), 7);
        // Pendant le changement de côté : seul le côté gauche est fait
        assert.strictEqual(doneInSet(steps, 10), 10);
    });
});
