const test = require('node:test');
const assert = require('node:assert');
const {
    dayKey,
    relativeDay,
    formatDuration,
    normalizeSets,
    computeVolume,
    formatPerf,
    suggestTarget,
    computeStreak,
    parseBackup,
    mergeDb,
    mergeLogs,
    mergeSessions
} = require('./store.js');

test('dayKey', async (t) => {
    await t.test('formats a local date as YYYY-MM-DD', () => {
        assert.strictEqual(dayKey(new Date(2026, 0, 5, 23, 30)), '2026-01-05');
    });

    await t.test('returns an empty string for an invalid date', () => {
        assert.strictEqual(dayKey('pas-une-date'), '');
    });
});

test('relativeDay', async (t) => {
    const now = new Date(2026, 2, 10, 12, 0);

    await t.test('recognises today and yesterday', () => {
        assert.strictEqual(relativeDay(new Date(2026, 2, 10, 8, 0), now), "aujourd'hui");
        assert.strictEqual(relativeDay(new Date(2026, 2, 9, 22, 0), now), 'hier');
    });

    await t.test('falls back to days, weeks then months', () => {
        assert.strictEqual(relativeDay(new Date(2026, 2, 6), now), 'il y a 4 j');
        assert.strictEqual(relativeDay(new Date(2026, 1, 24), now), 'il y a 2 sem.');
        assert.strictEqual(relativeDay(new Date(2025, 11, 10), now), 'il y a 3 mois');
    });
});

test('formatDuration', async (t) => {
    await t.test('formats minutes and hours', () => {
        assert.strictEqual(formatDuration(90), '1 min');
        assert.strictEqual(formatDuration(3600), '1 h 00');
        assert.strictEqual(formatDuration(5400), '1 h 30');
    });

    await t.test('never returns a negative duration', () => {
        assert.strictEqual(formatDuration(-10), '0 min');
        assert.strictEqual(formatDuration(undefined), '0 min');
    });
});

test('normalizeSets', async (t) => {
    await t.test('coerces strings to numbers', () => {
        assert.deepStrictEqual(normalizeSets([{ valeur: '12', poids: '10.5' }]), [{ valeur: 12, poids: 10.5 }]);
    });

    await t.test('defaults missing or invalid values to zero', () => {
        assert.deepStrictEqual(normalizeSets([{}, { valeur: 'abc' }]), [{ valeur: 0, poids: 0 }, { valeur: 0, poids: 0 }]);
    });

    await t.test('handles non-array input', () => {
        assert.deepStrictEqual(normalizeSets(null), []);
    });
});

test('computeVolume', async (t) => {
    await t.test('multiplies reps by load for weighted exercises', () => {
        const sets = [{ valeur: 10, poids: 20 }, { valeur: 8, poids: 20 }];
        assert.strictEqual(computeVolume('poids', sets), 360);
    });

    await t.test('sums the raw values for reps, secs and distance', () => {
        const sets = [{ valeur: 12 }, { valeur: 10 }];
        assert.strictEqual(computeVolume('reps', sets), 22);
        assert.strictEqual(computeVolume('secs', sets), 22);
        assert.strictEqual(computeVolume('distance', sets), 22);
    });

    await t.test('returns zero with no sets', () => {
        assert.strictEqual(computeVolume('reps', []), 0);
    });
});

test('formatPerf', async (t) => {
    await t.test('collapses identical sets', () => {
        const entry = { type: 'reps', sets: [{ valeur: 12 }, { valeur: 12 }, { valeur: 12 }] };
        assert.strictEqual(formatPerf(entry), '3 × 12 reps');
    });

    await t.test('lists sets when they differ', () => {
        const entry = { type: 'reps', sets: [{ valeur: 12 }, { valeur: 10 }] };
        assert.strictEqual(formatPerf(entry), '12 / 10 reps');
    });

    await t.test('appends the heaviest load', () => {
        const entry = { type: 'poids', sets: [{ valeur: 8, poids: 20 }, { valeur: 8, poids: 22.5 }] };
        assert.strictEqual(formatPerf(entry), '2 × 8 reps @ 22.5 kg');
    });

    await t.test('uses the right unit for timed and kegel work', () => {
        assert.strictEqual(formatPerf({ type: 'secs', sets: [{ valeur: 45 }] }), '1 × 45s');
        assert.strictEqual(formatPerf({ type: 'kegel', sets: [{ valeur: 10 }] }), '1 × 10 cycles');
    });

    await t.test('returns an empty string for an empty entry', () => {
        assert.strictEqual(formatPerf(null), '');
        assert.strictEqual(formatPerf({ type: 'reps', sets: [] }), '');
    });
});

test('suggestTarget', async (t) => {
    await t.test('keeps the best set so overload survives the session', () => {
        const entry = { type: 'poids', sets: [{ valeur: 10, poids: 20 }, { valeur: 12, poids: 22.5 }] };
        assert.deepStrictEqual(suggestTarget(entry), { valeur: 12, poids: 22.5 });
    });

    await t.test('returns null without a usable entry', () => {
        assert.strictEqual(suggestTarget(null), null);
        assert.strictEqual(suggestTarget({ sets: [] }), null);
    });
});

test('computeStreak', async (t) => {
    const now = new Date(2026, 4, 20, 18, 0);

    await t.test('counts consecutive days ending today', () => {
        const sessions = [
            { date: new Date(2026, 4, 18).toISOString() },
            { date: new Date(2026, 4, 19).toISOString() },
            { date: new Date(2026, 4, 20).toISOString() }
        ];
        assert.strictEqual(computeStreak(sessions, now), 3);
    });

    await t.test('stays alive when the last session was yesterday', () => {
        const sessions = [
            { date: new Date(2026, 4, 18).toISOString() },
            { date: new Date(2026, 4, 19).toISOString() }
        ];
        assert.strictEqual(computeStreak(sessions, now), 2);
    });

    await t.test('breaks after a missed day', () => {
        const sessions = [
            { date: new Date(2026, 4, 15).toISOString() },
            { date: new Date(2026, 4, 16).toISOString() }
        ];
        assert.strictEqual(computeStreak(sessions, now), 0);
    });

    await t.test('counts several sessions on the same day only once', () => {
        const sessions = [
            { date: new Date(2026, 4, 20, 9).toISOString() },
            { date: new Date(2026, 4, 20, 19).toISOString() }
        ];
        assert.strictEqual(computeStreak(sessions, now), 1);
    });

    await t.test('handles an empty history', () => {
        assert.strictEqual(computeStreak([], now), 0);
        assert.strictEqual(computeStreak(null, now), 0);
    });
});

test('parseBackup', async (t) => {
    await t.test('accepts a full backup envelope', () => {
        const texte = JSON.stringify({
            format: 'fittrack-backup',
            version: 1,
            data: { exercices: [{ id: '1' }], plans: [] },
            sessions: [{ date: '2026-01-01T10:00:00.000Z' }],
            logs: { 1: [] }
        });
        const res = parseBackup(texte);
        assert.strictEqual(res.ok, true);
        assert.strictEqual(res.payload.data.exercices.length, 1);
        assert.strictEqual(res.payload.sessions.length, 1);
    });

    await t.test('accepts the legacy export format', () => {
        const res = parseBackup(JSON.stringify({ exercices: [{ id: '1' }], plans: [{ id: 'p1' }] }));
        assert.strictEqual(res.ok, true);
        assert.strictEqual(res.payload.version, 0);
        assert.strictEqual(res.payload.data.plans.length, 1);
    });

    await t.test('rejects malformed input', () => {
        assert.strictEqual(parseBackup('{oops').ok, false);
        assert.strictEqual(parseBackup('[]').ok, false);
        assert.strictEqual(parseBackup(JSON.stringify({ data: {} })).ok, false);
    });
});

test('mergeDb', async (t) => {
    await t.test('overwrites by id and keeps local-only entries', () => {
        const base = { exercices: [{ id: '1', nom: 'Ancien' }, { id: 'custom_2', nom: 'Perso' }], plans: [] };
        const incoming = { exercices: [{ id: '1', nom: 'Nouveau' }], plans: [] };
        const res = mergeDb(base, incoming);
        assert.strictEqual(res.exercices.length, 2);
        assert.strictEqual(res.exercices[0].nom, 'Nouveau');
        assert.strictEqual(res.exercices[1].nom, 'Perso');
    });

    await t.test('appends unknown ids', () => {
        const res = mergeDb({ exercices: [], plans: [{ id: 'p1' }] }, { exercices: [], plans: [{ id: 'p2' }] });
        assert.deepStrictEqual(res.plans.map(p => p.id), ['p1', 'p2']);
    });

    await t.test('matches ids across string and number types', () => {
        const res = mergeDb({ exercices: [{ id: 1, nom: 'A' }], plans: [] }, { exercices: [{ id: '1', nom: 'B' }], plans: [] });
        assert.strictEqual(res.exercices.length, 1);
        assert.strictEqual(res.exercices[0].nom, 'B');
    });

    await t.test('tolerates missing collections', () => {
        assert.deepStrictEqual(mergeDb(null, null), { exercices: [], plans: [] });
    });
});

test('mergeLogs and mergeSessions', async (t) => {
    await t.test('deduplicates log entries and sorts them chronologically', () => {
        const a = { 1: [{ date: '2026-01-02T10:00:00.000Z', volume: 100 }] };
        const b = {
            1: [
                { date: '2026-01-02T10:00:00.000Z', volume: 100 },
                { date: '2026-01-01T10:00:00.000Z', volume: 90 }
            ]
        };
        const res = mergeLogs(a, b);
        assert.strictEqual(res['1'].length, 2);
        assert.strictEqual(res['1'][0].volume, 90);
    });

    await t.test('deduplicates sessions by date and plan', () => {
        const a = [{ date: '2026-01-02T10:00:00.000Z', planId: 'p1' }];
        const b = [
            { date: '2026-01-02T10:00:00.000Z', planId: 'p1' },
            { date: '2026-01-03T10:00:00.000Z', planId: 'p2' }
        ];
        assert.strictEqual(mergeSessions(a, b).length, 2);
    });

    await t.test('drops sessions without a date', () => {
        assert.strictEqual(mergeSessions([{ planId: 'p1' }], []).length, 0);
    });
});
