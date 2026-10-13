const test = require('node:test');
const assert = require('node:assert');
const {
    planForWeekday,
    lastDoneByPlan,
    pickTodayPlan,
    sessionsOn,
    startOfWeek,
    weekStrip,
    weekSummary,
    greeting
} = require('./today.js');

const plan = (id, nom) => ({ id, nom, exercices_ids: ['1'] });
const PLANS = [
    plan('a', 'Santé Pelvienne'),
    plan('b', 'Mobilité Thoracique'),
    plan('mar', 'Routine Mardi'),
    plan('mer', 'Routine MERCREDI'),
    plan('sam', 'Routine du samedi')
];

// Mardi 13 octobre 2026, 10 h (heure locale)
const MARDI = new Date(2026, 9, 13, 10, 0);
const at = (jour, h = 9) => new Date(2026, 9, jour, h, 0).toISOString();

test('planForWeekday', async (t) => {
    await t.test('matches the day name, whatever the case', () => {
        assert.strictEqual(planForWeekday(PLANS, 2).id, 'mar');
        assert.strictEqual(planForWeekday(PLANS, 3).id, 'mer');
        assert.strictEqual(planForWeekday(PLANS, 6).id, 'sam');
    });

    await t.test('ignores accents and partial words', () => {
        assert.strictEqual(planForWeekday([plan('x', 'Séance Mardigras')], 2), null);
        assert.strictEqual(planForWeekday([plan('x', 'Dimanche détente')], 0).id, 'x');
    });

    await t.test('returns null when no plan is tied to that day', () => {
        assert.strictEqual(planForWeekday(PLANS, 1), null);
    });
});

test('pickTodayPlan', async (t) => {
    await t.test("prefers the plan named after today's weekday", () => {
        assert.deepStrictEqual(pickTodayPlan(PLANS, [], MARDI), { plan: PLANS[2], reason: 'jour' });
    });

    await t.test('otherwise suggests a plan never done, then the least recent', () => {
        const lundi = new Date(2026, 9, 12, 10, 0);
        assert.strictEqual(pickTodayPlan(PLANS, [], lundi).plan.id, 'a');

        const sessions = [
            { planId: 'a', date: at(11) },
            { planId: 'b', date: at(9) }
        ];
        const choix = pickTodayPlan(PLANS, sessions, lundi);
        assert.strictEqual(choix.plan.id, 'b');
        assert.strictEqual(choix.reason, 'suggestion');
    });

    await t.test('does not suggest a plan reserved for another weekday', () => {
        const lundi = new Date(2026, 9, 12, 10, 0);
        const sessions = [{ planId: 'a', date: at(11) }, { planId: 'b', date: at(11) }];
        assert.ok(['a', 'b'].includes(pickTodayPlan(PLANS, sessions, lundi).plan.id));
    });

    await t.test('skips empty plans and handles no plan at all', () => {
        assert.strictEqual(pickTodayPlan([{ id: 'v', nom: 'Routine Mardi', exercices_ids: [] }], [], MARDI), null);
        assert.strictEqual(pickTodayPlan([], [], MARDI), null);
        assert.strictEqual(pickTodayPlan(undefined, undefined, MARDI), null);
    });
});

test('lastDoneByPlan', async () => {
    const map = lastDoneByPlan([
        { planId: 'a', date: at(5) },
        { planId: 'a', date: at(8) },
        { planId: 'b', date: 'pas une date' },
        null
    ]);
    assert.strictEqual(map.a.toISOString(), at(8));
    assert.strictEqual(map.b, undefined);
});

test('week', async (t) => {
    await t.test('starts on Monday', () => {
        const lundi = startOfWeek(MARDI);
        assert.strictEqual(lundi.getDay(), 1);
        assert.strictEqual(lundi.getDate(), 12);
        assert.strictEqual(startOfWeek(new Date(2026, 9, 18)).getDate(), 12); // dimanche
    });

    await t.test('marks each day as done, missed, today or upcoming', () => {
        const strip = weekStrip([{ date: at(12) }], MARDI);
        assert.deepStrictEqual(strip.map(j => j.label), ['L', 'M', 'M', 'J', 'V', 'S', 'D']);
        assert.deepStrictEqual(strip.map(j => j.state),
            ['done', 'today', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
        assert.ok(strip[1].isToday);
    });

    await t.test('shows a missed day and a session done today', () => {
        const strip = weekStrip([{ date: at(13, 8) }], MARDI);
        assert.strictEqual(strip[0].state, 'missed');
        assert.strictEqual(strip[1].state, 'done');
    });

    await t.test('summarises the current week only', () => {
        const sessions = [
            { date: at(12), dureeSec: 600 },
            { date: at(12, 18), dureeSec: 300 },
            { date: at(13), dureeSec: 900 },
            { date: at(5), dureeSec: 3600 } // semaine précédente
        ];
        assert.deepStrictEqual(weekSummary(sessions, MARDI), { count: 3, days: 2, minutes: 30 });
        assert.strictEqual(sessionsOn(sessions, MARDI).length, 1);
    });
});

test('greeting', async () => {
    assert.strictEqual(greeting(new Date(2026, 0, 1, 9)), 'Bonjour');
    assert.strictEqual(greeting(new Date(2026, 0, 1, 20)), 'Bonsoir');
    assert.strictEqual(greeting(new Date(2026, 0, 1, 2)), 'Bonne nuit');
});
