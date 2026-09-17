const test = require('node:test');
const assert = require('node:assert');
const {
    stripHtml,
    normalizeText,
    truncate,
    projectCatalogueEntry,
    catalogueName,
    catalogueDescription,
    catalogueIsFrench,
    targetsForTag,
    equipmentForLabel,
    searchCatalogue,
    buildProfile,
    scoreEntry,
    suggestNewExercises,
    findVariations,
    findCatalogueMatch,
    topCatalogueMatches,
    significantWords,
    inferEquipment,
    enrichExercise,
    catalogueToExercise
} = require('./catalogue.js');

/** Fiche brute au format réellement renvoyé par wger /api/v2/exerciseinfo/. */
function rawEntry(overrides) {
    return Object.assign({
        id: 12,
        category: { id: 9, name: 'Legs' },
        muscles: [{ id: 8, name: 'Gluteus maximus', name_en: 'Glutes' }],
        muscles_secondary: [{ id: 10, name: 'Quadriceps femoris', name_en: 'Quads' }],
        equipment: [{ id: 5, name: 'Swiss Ball' }],
        images: [{ image: 'https://wger.de/media/a.webp', is_main: true }],
        videos: [{ video: 'https://wger.de/media/a.MOV' }],
        variation_group: 'grp-1',
        translations: [
            { language: 2, name: 'Seated Hip Adduction', description: '<p>Sit on the machine.</p>' },
            { language: 12, name: 'Adduction de hanche assise', description: '<p>Asseyez-vous sur la machine.</p>' }
        ]
    }, overrides);
}

test('stripHtml', async (t) => {
    await t.test('removes markup and keeps readable text', () => {
        assert.strictEqual(stripHtml('<p>Tenez la position.</p>'), 'Tenez la position.');
    });

    await t.test('turns list items into bullets and breaks into newlines', () => {
        assert.strictEqual(stripHtml('<ul><li>Un</li><li>Deux</li></ul>'), '• Un\n• Deux');
        assert.strictEqual(stripHtml('Un<br>Deux'), 'Un\nDeux');
    });

    await t.test('decodes the entities wger emits', () => {
        assert.strictEqual(stripHtml('<p>Dos&nbsp;droit &amp; g&#39;enoux</p>'), "Dos droit & g'enoux");
    });

    await t.test('neutralises embedded scripts rather than passing them through', () => {
        const dangereux = '<p>Ok</p><script>alert(1)</script>';
        const propre = stripHtml(dangereux);
        assert.ok(!propre.includes('<script>'));
        assert.ok(!propre.includes('<'));
    });

    await t.test('handles empty input', () => {
        assert.strictEqual(stripHtml(''), '');
        assert.strictEqual(stripHtml(null), '');
    });
});

test('normalizeText', async (t) => {
    await t.test('lowercases and strips accents so search is forgiving', () => {
        assert.strictEqual(normalizeText('Épaules Élevées'), 'epaules elevees');
        assert.strictEqual(normalizeText('  Gainage  '), 'gainage');
    });

    await t.test('handles nullish values', () => {
        assert.strictEqual(normalizeText(null), '');
        assert.strictEqual(normalizeText(undefined), '');
    });
});

test('truncate', async (t) => {
    await t.test('cuts on a word boundary and marks the cut', () => {
        const res = truncate('un deux trois quatre cinq', 12);
        assert.ok(res.endsWith('…'));
        assert.ok(res.length <= 13);
        assert.ok(!res.includes('quatre'));
    });

    await t.test('leaves short text untouched', () => {
        assert.strictEqual(truncate('court', 100), 'court');
    });
});

test('projectCatalogueEntry', async (t) => {
    await t.test('compacts a real wger payload', () => {
        const e = projectCatalogueEntry(rawEntry());
        assert.strictEqual(e.id, 12);
        assert.strictEqual(e.cat, 'Legs');
        assert.deepStrictEqual(e.m, ['Glutes']);
        assert.deepStrictEqual(e.ms, ['Quads']);
        assert.deepStrictEqual(e.eq, ['Swiss Ball']);
        assert.strictEqual(e.img, 'https://wger.de/media/a.webp');
        assert.strictEqual(e.vid, 'https://wger.de/media/a.MOV');
        assert.strictEqual(e.grp, 'grp-1');
        assert.strictEqual(e.fr.n, 'Adduction de hanche assise');
        assert.strictEqual(e.fr.d, 'Asseyez-vous sur la machine.');
    });

    await t.test('prefers the main image over the first one', () => {
        const e = projectCatalogueEntry(rawEntry({
            images: [{ image: 'b.webp', is_main: false }, { image: 'main.webp', is_main: true }]
        }));
        assert.strictEqual(e.img, 'main.webp');
    });

    await t.test('drops entries with no usable name', () => {
        assert.strictEqual(projectCatalogueEntry(rawEntry({ translations: [] })), null);
        assert.strictEqual(projectCatalogueEntry(rawEntry({
            translations: [{ language: 5, name: 'Присед', description: '' }]
        })), null);
    });

    await t.test('tolerates missing collections', () => {
        const e = projectCatalogueEntry({
            id: 1,
            translations: [{ language: 2, name: 'Plank', description: '' }]
        });
        assert.deepStrictEqual(e.m, []);
        assert.deepStrictEqual(e.eq, []);
        assert.strictEqual(e.img, '');
        assert.strictEqual(e.cat, '');
    });

    await t.test('rejects malformed input', () => {
        assert.strictEqual(projectCatalogueEntry(null), null);
        assert.strictEqual(projectCatalogueEntry({}), null);
    });
});

test('language selection', async (t) => {
    const fr = projectCatalogueEntry(rawEntry());
    const enOnly = projectCatalogueEntry(rawEntry({
        translations: [{ language: 2, name: 'Plank', description: '<p>Hold it.</p>' }]
    }));

    await t.test('prefers French when available', () => {
        assert.strictEqual(catalogueName(fr), 'Adduction de hanche assise');
        assert.strictEqual(catalogueDescription(fr), 'Asseyez-vous sur la machine.');
        assert.strictEqual(catalogueIsFrench(fr), true);
    });

    await t.test('falls back to English', () => {
        assert.strictEqual(catalogueName(enOnly), 'Plank');
        assert.strictEqual(catalogueDescription(enOnly), 'Hold it.');
        assert.strictEqual(catalogueIsFrench(enOnly), false);
    });

    await t.test('falls back when the French description is empty', () => {
        const vide = projectCatalogueEntry(rawEntry({
            translations: [
                { language: 12, name: 'Planche', description: '' },
                { language: 2, name: 'Plank', description: '<p>Hold it.</p>' }
            ]
        }));
        assert.strictEqual(catalogueName(vide), 'Planche');
        assert.strictEqual(catalogueDescription(vide), 'Hold it.');
    });
});

test('French vocabulary mapping', async (t) => {
    await t.test('maps the library tags to wger targets', () => {
        assert.deepStrictEqual(targetsForTag('Épaules'), ['Shoulders']);
        assert.deepStrictEqual(targetsForTag('Core'), ['Abs', 'Obliquus externus abdominis']);
        assert.ok(targetsForTag('Fessiers').includes('Glutes'));
    });

    await t.test('matches a tag embedded in a longer label', () => {
        assert.ok(targetsForTag('Mobilité Thoracique').includes('Trapezius'));
    });

    await t.test('returns nothing for an unrelated tag', () => {
        assert.deepStrictEqual(targetsForTag('Lundi'), []);
        assert.deepStrictEqual(targetsForTag(''), []);
    });

    await t.test('maps French equipment labels', () => {
        assert.strictEqual(equipmentForLabel('Ballon'), 'Swiss Ball');
        assert.strictEqual(equipmentForLabel('Élastique'), 'Resistance band');
        assert.strictEqual(equipmentForLabel('Grand ballon de gym'), 'Swiss Ball');
        assert.strictEqual(equipmentForLabel('Machine inconnue'), '');
    });
});

function catalogue() {
    return [
        projectCatalogueEntry(rawEntry({
            id: 1, category: { name: 'Abs' },
            muscles: [{ name: 'Rectus abdominis', name_en: 'Abs' }],
            muscles_secondary: [], equipment: [], images: [], videos: [], variation_group: 'plank',
            translations: [{ language: 2, name: 'Plank', description: '<p>Hold.</p>' }]
        })),
        projectCatalogueEntry(rawEntry({
            id: 2, category: { name: 'Abs' },
            muscles: [{ name: 'Rectus abdominis', name_en: 'Abs' }],
            muscles_secondary: [], equipment: [], images: [], videos: [], variation_group: 'plank',
            translations: [{ language: 12, name: 'Planche latérale', description: '<p>Tenez.</p>' }]
        })),
        projectCatalogueEntry(rawEntry({
            id: 3, category: { name: 'Back' },
            muscles: [{ name: 'Trapezius', name_en: 'Trapezius' }],
            muscles_secondary: [], equipment: [{ name: 'Resistance band' }], images: [], videos: [],
            variation_group: null,
            translations: [{ language: 12, name: 'Rotation thoracique à genoux', description: '<p>Tournez.</p>' }]
        })),
        projectCatalogueEntry(rawEntry({
            id: 4, category: { name: 'Arms' },
            muscles: [{ name: 'Biceps brachii', name_en: 'Biceps' }],
            muscles_secondary: [], equipment: [{ name: 'Dumbbell' }], images: [], videos: [],
            variation_group: null,
            translations: [{ language: 2, name: 'Biceps Curl', description: '<p>Curl.</p>' }]
        }))
    ];
}

test('searchCatalogue', async (t) => {
    const entries = catalogue();

    await t.test('finds by name ignoring accents and case', () => {
        const res = searchCatalogue(entries, { query: 'planche laterale' });
        assert.strictEqual(res.length, 1);
        assert.strictEqual(res[0].id, 2);
    });

    await t.test('matches across both languages', () => {
        assert.strictEqual(searchCatalogue(entries, { query: 'plank' })[0].id, 1);
    });

    await t.test('requires every word to match', () => {
        assert.strictEqual(searchCatalogue(entries, { query: 'rotation thoracique' }).length, 1);
        assert.strictEqual(searchCatalogue(entries, { query: 'rotation inexistante' }).length, 0);
    });

    await t.test('filters by category, equipment and muscle', () => {
        assert.strictEqual(searchCatalogue(entries, { category: 'Abs' }).length, 2);
        assert.strictEqual(searchCatalogue(entries, { equipment: 'Dumbbell' })[0].id, 4);
        assert.strictEqual(searchCatalogue(entries, { muscle: 'Trapezius' })[0].id, 3);
    });

    await t.test('combines a query with a filter', () => {
        assert.strictEqual(searchCatalogue(entries, { query: 'planche', category: 'Back' }).length, 0);
    });

    await t.test('respects the limit and handles empty input', () => {
        assert.strictEqual(searchCatalogue(entries, {}, 2).length, 2);
        assert.deepStrictEqual(searchCatalogue([], { query: 'plank' }), []);
        assert.deepStrictEqual(searchCatalogue(null, {}), []);
    });
});

test('suggestNewExercises', async (t) => {
    const entries = catalogue();
    const library = [
        { id: 'a', nom: 'Gainage ventral', tags: 'Core, Stabilité', tagsArray: ['Core', 'Stabilité'] },
        { id: 'b', nom: 'Rotation thoracique', tags: 'Thoracique, Mobilité', tagsArray: ['Thoracique', 'Mobilité'], equipement: 'Élastique' }
    ];

    await t.test('builds a profile from the library tags', () => {
        const profil = buildProfile(library);
        assert.ok(profil.targets['Abs'] > 0);
        assert.ok(profil.targets['Trapezius'] > 0);
        assert.strictEqual(profil.equipment['Resistance band'], 1);
    });

    await t.test('scores nothing outside what the user trains', () => {
        const profil = { targets: { Abs: 1 }, equipment: {} };
        const biceps = entries.find(e => e.id === 4);
        assert.strictEqual(scoreEntry(biceps, profil), 0);
    });

    await t.test('suggests relevant exercises the library does not have', () => {
        const res = suggestNewExercises(entries, library, 10);
        const ids = res.map(e => e.id);
        assert.ok(ids.includes(1), 'Plank cible les abdos travaillés');
        assert.ok(!ids.includes(4), 'Biceps Curl est hors des zones travaillées');
    });

    await t.test('excludes what the user already has, by name and by catalogue id', () => {
        const avecPlank = library.concat([{ id: 'c', nom: 'Plank', tags: 'Core', tagsArray: ['Core'] }]);
        assert.ok(!suggestNewExercises(entries, avecPlank, 10).some(e => e.id === 1));

        const avecId = library.concat([{ id: 'd', nom: 'Autre nom', catalogueId: 1, tags: 'Core', tagsArray: ['Core'] }]);
        assert.ok(!suggestNewExercises(entries, avecId, 10).some(e => e.id === 1));
    });

    await t.test('ignores the "(Variante)" suffix when excluding', () => {
        const avecVariante = library.concat([{ id: 'e', nom: 'Plank (Variante)', tags: 'Core', tagsArray: ['Core'] }]);
        assert.ok(!suggestNewExercises(entries, avecVariante, 10).some(e => e.id === 1));
    });

    await t.test('diversifies across categories rather than filling up with one', () => {
        const res = suggestNewExercises(entries, library, 2);
        assert.strictEqual(new Set(res.map(e => e.cat)).size, 2);
    });

    await t.test('returns nothing for an empty library', () => {
        assert.deepStrictEqual(suggestNewExercises(entries, [], 10), []);
    });
});

test('findVariations', async (t) => {
    const entries = catalogue();

    await t.test('returns the other exercises in the same variation group', () => {
        const res = findVariations(entries, entries[0]);
        assert.deepStrictEqual(res.map(e => e.id), [2]);
    });

    await t.test('returns nothing without a group', () => {
        assert.deepStrictEqual(findVariations(entries, entries[2]), []);
        assert.deepStrictEqual(findVariations(entries, null), []);
    });
});

test('findCatalogueMatch', async (t) => {
    const entries = catalogue();

    await t.test('matches an exact name', () => {
        assert.strictEqual(findCatalogueMatch(entries, 'Plank').id, 1);
    });

    await t.test('matches ignoring accents and the variant suffix', () => {
        assert.strictEqual(findCatalogueMatch(entries, 'Planche laterale (Variante)').id, 2);
    });

    await t.test('matches on shared significant words', () => {
        assert.strictEqual(findCatalogueMatch(entries, 'Rotation thoracique à genoux').id, 3);
    });

    await t.test('refuses a match that would be a coincidence', () => {
        assert.strictEqual(findCatalogueMatch(entries, 'Exercice de Kegel avec expiration'), null);
        assert.strictEqual(findCatalogueMatch(entries, ''), null);
        assert.strictEqual(findCatalogueMatch(entries, 'de la'), null);
    });
});

test('enrichExercise', async (t) => {
    const entry = catalogue()[2]; // Rotation thoracique, Resistance band, Trapezius

    await t.test('fills only the empty fields', () => {
        const source = { nom: 'Rotation', description: '', tags: 'Thoracique', equipement: '' };
        const { exercice, champs } = enrichExercise(source, entry);
        assert.strictEqual(exercice.description, 'Tournez.');
        assert.strictEqual(exercice.equipement, 'Resistance band');
        assert.ok(champs.includes('consignes'));
        assert.ok(champs.includes('équipement'));
    });

    await t.test('never overwrites what the user wrote', () => {
        const source = { nom: 'Rotation', description: 'Ma consigne', equipement: 'Mon ballon', tags: 'Thoracique' };
        const { exercice, champs } = enrichExercise(source, entry);
        assert.strictEqual(exercice.description, 'Ma consigne');
        assert.strictEqual(exercice.equipement, 'Mon ballon');
        assert.ok(!champs.includes('consignes'));
    });

    await t.test('adds muscle tags without duplicating existing ones', () => {
        const source = { nom: 'Rotation', tags: 'Thoracique, Trapezius', description: 'x' };
        const { exercice, champs } = enrichExercise(source, entry);
        assert.strictEqual(exercice.tags, 'Thoracique, Trapezius');
        assert.ok(!champs.includes('muscles'));
    });

    await t.test('records the catalogue id so it is not suggested again', () => {
        const { exercice } = enrichExercise({ nom: 'Rotation' }, entry);
        assert.strictEqual(exercice.catalogueId, 3);
    });

    await t.test('is a no-op without a match', () => {
        const source = { nom: 'Rotation', description: '' };
        const { exercice, champs } = enrichExercise(source, null);
        assert.deepStrictEqual(champs, []);
        assert.strictEqual(exercice.description, '');
    });
});

test('catalogueToExercise', async (t) => {
    await t.test('produces a usable library exercise', () => {
        const ex = catalogueToExercise(catalogue()[2]);
        assert.strictEqual(ex.id, 'wger_3');
        assert.strictEqual(ex.catalogueId, 3);
        assert.strictEqual(ex.nom, 'Rotation thoracique à genoux');
        assert.strictEqual(ex.description, 'Tournez.');
        assert.strictEqual(ex.equipement, 'Resistance band');
        assert.strictEqual(ex.type, 'reps');
        assert.ok(ex.tagsArray.includes('Trapezius'));
    });

    await t.test('omits bodyweight as a piece of equipment', () => {
        const entry = projectCatalogueEntry(rawEntry({
            equipment: [{ name: 'none (bodyweight exercise)' }],
            translations: [{ language: 2, name: 'Push Up', description: '' }]
        }));
        assert.strictEqual(catalogueToExercise(entry).equipement, '');
    });

    await t.test('handles a null entry', () => {
        assert.strictEqual(catalogueToExercise(null), null);
    });
});

test('significantWords', async (t) => {
    await t.test('drops filler words that carry no distinction', () => {
        assert.deepStrictEqual(significantWords('Planche avec extension de la hanche'),
            ['planche', 'extension', 'hanche']);
    });

    await t.test('splits on punctuation and drops very short words', () => {
        assert.deepStrictEqual(significantWords('Rétraction des omoplates (Bras en W)'),
            ['retraction', 'omoplates', 'bras']);
    });
});

test('findCatalogueMatch precision', async (t) => {
    // Cas relevés sur la bibliothèque réelle de l'utilisateur : un seuil
    // permissif y rapprochait des mouvements différents.
    const entries = [
        projectCatalogueEntry(rawEntry({
            id: 20, translations: [{ language: 12, name: 'Abduction des hanches assis', description: '<p>x</p>' }]
        })),
        projectCatalogueEntry(rawEntry({
            id: 21, translations: [{ language: 12, name: 'Planche avec extension du bras', description: '<p>x</p>' }]
        })),
        projectCatalogueEntry(rawEntry({
            id: 22, translations: [{ language: 12, name: 'Pont fessier', description: '<p>x</p>' }]
        }))
    ];

    await t.test('refuses a different movement on the same body part', () => {
        assert.strictEqual(findCatalogueMatch(entries, 'Rotation des hanches assis'), null,
            'rotation et abduction sont deux mouvements différents');
    });

    await t.test('refuses when only the filler words line up', () => {
        assert.strictEqual(findCatalogueMatch(entries, 'Planche avec extension de la hanche'), null,
            'hanche et bras sont deux exercices différents');
    });

    await t.test('still accepts an exact name', () => {
        assert.strictEqual(findCatalogueMatch(entries, 'Pont fessier').id, 22);
    });

    await t.test('offers the near misses as ranked candidates instead', () => {
        const proches = topCatalogueMatches(entries, 'Rotation des hanches assis', 5);
        assert.ok(proches.length > 0, 'un choix manuel doit rester possible');
        assert.strictEqual(proches[0].entry.id, 20);
        assert.ok(proches[0].score < 0.85, 'sous le seuil de validation automatique');
    });

    await t.test('ranks candidates by decreasing score', () => {
        const proches = topCatalogueMatches(entries, 'Pont fessier', 5);
        assert.strictEqual(proches[0].entry.id, 22);
        for (let i = 1; i < proches.length; i++) {
            assert.ok(proches[i - 1].score >= proches[i].score);
        }
    });

    await t.test('returns nothing usable for an unrelated name', () => {
        assert.deepStrictEqual(topCatalogueMatches(entries, 'de la'), []);
    });
});

test('inferEquipment', async (t) => {
    await t.test('reads the equipment out of the library', () => {
        const dispo = inferEquipment([
            { nom: 'Rotation', equipement: 'Élastique', tags: 'Dos' },
            { nom: 'Équilibre sur ballon', equipement: '', tags: 'Stabilité' }
        ]);
        assert.ok(dispo.has('Resistance band'));
        assert.ok(dispo.has('Swiss Ball'), "le ballon est déduit du nom de l'exercice");
        assert.ok(dispo.has('none (bodyweight exercise)'));
        assert.ok(!dispo.has('Kettlebell'));
    });

    await t.test('always allows bodyweight and a mat', () => {
        const dispo = inferEquipment([]);
        assert.ok(dispo.has('none (bodyweight exercise)'));
        assert.ok(dispo.has('Gym mat'));
    });
});

test('suggestion relevance', async (t) => {
    const library = [
        { id: 'a', nom: 'Gainage', tags: 'Core', tagsArray: ['Core'], equipement: '' },
        { id: 'b', nom: 'Rotation', tags: 'Dos', tagsArray: ['Dos'], equipement: 'Élastique' }
    ];

    await t.test('never suggests an exercise needing absent equipment', () => {
        const entries = [projectCatalogueEntry(rawEntry({
            id: 30, category: { name: 'Abs' },
            muscles: [{ name: 'Rectus abdominis', name_en: 'Abs' }],
            muscles_secondary: [], equipment: [{ name: 'Kettlebell' }], images: [], videos: [],
            translations: [{ language: 12, name: 'Swing kettlebell', description: '<p>x</p>' }]
        }))];
        assert.deepStrictEqual(suggestNewExercises(entries, library, 5), []);
    });

    await t.test('prefers a focused exercise over one claiming every muscle', () => {
        const tousMuscles = ['Abs', 'Lats', 'Trapezius', 'Glutes', 'Quads', 'Hamstrings', 'Calves', 'Shoulders'];
        const entries = [
            projectCatalogueEntry(rawEntry({
                id: 31, category: { name: 'Cardio' },
                muscles: tousMuscles.map(m => ({ name: m, name_en: m })),
                muscles_secondary: [], equipment: [], images: [], videos: [],
                translations: [{ language: 12, name: 'Rameur', description: '<p>x</p>' }]
            })),
            projectCatalogueEntry(rawEntry({
                id: 32, category: { name: 'Abs' },
                muscles: [{ name: 'Rectus abdominis', name_en: 'Abs' }],
                muscles_secondary: [], equipment: [], images: [], videos: [],
                translations: [{ language: 12, name: 'Hollow hold', description: '<p>x</p>' }]
            }))
        ];
        const res = suggestNewExercises(entries, library, 5);
        assert.strictEqual(res[0].id, 32, 'un exercice ciblé passe avant un exercice fourre-tout');
    });

    await t.test('caps how many suggestions come from one body area', () => {
        const entries = [];
        for (let i = 0; i < 8; i++) {
            entries.push(projectCatalogueEntry(rawEntry({
                id: 40 + i, category: { name: 'Abs' },
                muscles: [{ name: 'Rectus abdominis', name_en: 'Abs' }],
                muscles_secondary: [], equipment: [], images: [], videos: [],
                translations: [{ language: 12, name: 'Abdo ' + i, description: '<p>x</p>' }]
            })));
        }
        assert.ok(suggestNewExercises(entries, library, 8).length <= 3,
            'pas plus de trois fiches de la même zone');
    });
});
