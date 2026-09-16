"""
Tests E2E du suivi de progression.

Ils couvrent ce qui rend l'application réellement utilisable dans la durée :
la mémorisation des séries réalisées, la reprise des charges d'une séance à
l'autre, la reprise d'une séance interrompue, la gestion de la bibliothèque
et la sauvegarde / restauration des données.
"""
import json
import re
from playwright.sync_api import sync_playwright, expect

BASE_URL = "http://localhost:8000/index.html"

# Bruit propre à l'environnement de test (pas de réseau, pas de geste utilisateur).
CONSOLE_NOISE = (
    "favicon",
    "fonts.googleapis",
    "ERR_CERT_AUTHORITY_INVALID",
    "ERR_FAILED",
    "navigator.vibrate",
)


def fresh_page(context, console_errors):
    page = context.new_page()
    page.set_default_timeout(30000)
    page.on("pageerror", lambda e: console_errors.append(f"pageerror: {e}"))
    page.on(
        "console",
        lambda m: console_errors.append(f"{m.type}: {m.text}") if m.type == "error" else None,
    )
    page.goto(BASE_URL)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.evaluate("window.playBeep = () => {}")
    page.wait_for_selector("#plans-grid .card", timeout=30000)
    return page


def create_test_exercise(page):
    """Crée un exercice avec charge, un repos court et deux séries."""
    page.get_by_role("button", name="Bibliothèque").click()
    page.locator("#exercices-section").get_by_role("button", name="+ NOUVEL EXERCICE").click()
    page.fill("#ex-editor-nom", "Exercice E2E")
    page.fill("#ex-editor-tags", "Test")
    page.select_option("#ex-editor-type", "poids")
    page.fill("#ex-editor-series", "2")
    page.fill("#ex-editor-valeur", "8")
    page.fill("#ex-editor-poids", "20")
    page.fill("#ex-editor-repos", "1")
    page.locator("#modal-ex-editor").get_by_role("button", name="ENREGISTRER").click()
    expect(page.locator("#modal-ex-editor")).not_to_have_class(re.compile(r"active"))
    return page.evaluate("db.exercices.find(e => e.nom === 'Exercice E2E').id")


def create_test_plan(page):
    """Crée un programme contenant l'exercice de test."""
    page.get_by_role("button", name="Programmes").click()
    page.once("dialog", lambda d: d.accept("Programme E2E"))
    page.locator("#plans-section").get_by_role("button", name="+ NOUVEAU PROGRAMME").click()
    expect(page.locator("#modal")).to_have_class(re.compile(r"active"))

    page.locator("#modal-ex-list").get_by_role("button", name="+ AJOUTER UN EXERCICE").click()
    page.fill("#search-modal-add", "Exercice E2E")
    page.locator("#modal-add-grid .card").first.click()
    page.locator("#plan-actions").get_by_role("button", name="💾 Enregistrer").click()

    ids = page.evaluate("db.plans.find(p => p.nom === 'Programme E2E').exercices_ids")
    assert len(ids) == 1, f"Le programme devrait contenir 1 exercice, il en a {len(ids)}"

    # La modale reste ouverte après enregistrement (on peut continuer à éditer).
    page.locator("#modal .close-btn").click()
    expect(page.locator("#modal")).not_to_have_class(re.compile(r"active"))


def test_library_and_plan_crud(page):
    print("Testing Library & Plan CRUD...")
    ex_id = create_test_exercise(page)
    assert page.evaluate(
        "JSON.parse(localStorage.getItem('fitness_data')).exercices.some(e => e.nom === 'Exercice E2E')"
    ), "L'exercice créé doit être persisté"

    create_test_plan(page)
    assert page.evaluate(
        "JSON.parse(localStorage.getItem('fitness_data')).plans.some(p => p.nom === 'Programme E2E')"
    ), "Le programme créé doit être persisté"

    # Modification de l'exercice depuis sa fiche
    page.get_by_role("button", name="Bibliothèque").click()
    page.fill("#search-input", "Exercice E2E")
    page.locator("#exercices-grid .card").first.click()
    page.locator("#modal-ex-extras").get_by_role("button", name="✏️ Modifier").click()
    page.fill("#ex-editor-nom", "Exercice E2E renommé")
    page.locator("#modal-ex-editor").get_by_role("button", name="ENREGISTRER").click()
    assert page.evaluate(
        "db.exercices.some(e => e.nom === 'Exercice E2E renommé')"
    ), "Le renommage doit être enregistré"
    # La fiche ouverte derrière l'éditeur affichait l'ancien nom : elle se ferme.
    expect(page.locator("#modal-ex")).not_to_have_class(re.compile(r"active"))

    # Retour au nom d'origine pour la suite des tests
    page.evaluate(
        """(id) => {
            const ex = db.exercices.find(e => String(e.id) === String(id));
            ex.nom = 'Exercice E2E';
            coachSaveDb();
            coachRefreshLibrary();
        }""",
        ex_id,
    )
    print("Library & Plan CRUD: OK")
    return ex_id


def test_performance_logging(page, ex_id):
    print("Testing Performance Logging...")
    page.get_by_role("button", name="Programmes").click()
    page.locator("#plans-grid .card", has_text="Programme E2E").click()
    page.locator("#btn-start-workout").click()

    expect(page.locator("#workout-screen")).to_be_visible()
    expect(page.locator("#workout-last-perf")).to_contain_text("Première fois")
    assert page.evaluate("readActiveSession() !== null"), "La séance en cours doit être persistée"

    page.locator("#btn-next-step").click()          # série 1
    expect(page.locator("#workout-rest-view")).to_be_visible()
    page.locator("#btn-skip-rest").click()
    page.locator("#btn-next-step").click()          # série 2 -> fin
    expect(page.locator("#workout-end-view")).to_be_visible()

    entries = page.evaluate("(id) => getLogs(id)", ex_id)
    assert len(entries) == 1, f"Une entrée de journal attendue, {len(entries)} trouvée(s)"
    assert len(entries[0]["sets"]) == 2, "Les deux séries doivent être journalisées"
    assert entries[0]["volume"] == 320, f"Volume attendu 8*20*2=320, obtenu {entries[0]['volume']}"

    # Ressenti de fin de séance
    page.fill("#feedback-note", "Note E2E")
    page.locator("#workout-end-view").get_by_role("button", name="ENREGISTRER LE RESSENTI").click()
    session = page.evaluate("readSessions().slice(-1)[0]")
    assert session["note"] == "Note E2E", "La note doit être enregistrée sur la séance"
    assert session["seriesTotal"] == 2, f"2 séries attendues, {session['seriesTotal']} enregistrée(s)"
    assert page.evaluate("readActiveSession() === null"), "La séance terminée ne doit plus être reprenable"

    page.locator("#workout-end-view").get_by_role("button", name="RETOUR À L'ACCUEIL").click()
    expect(page.locator("#workout-screen")).not_to_be_visible()
    print("Performance Logging: OK")


def test_progressive_overload_carries_over(page, ex_id):
    print("Testing Progressive Overload Carry-Over...")
    # On écrase volontairement les valeurs de la bibliothèque : la séance doit
    # repartir de ce qui a été réalisé, pas de ces valeurs-là.
    page.evaluate(
        """(id) => {
            const ex = db.exercices.find(e => String(e.id) === String(id));
            ex.valeur = 1; ex.poids = 1;
            coachSaveDb();
        }""",
        ex_id,
    )

    page.locator("#plans-grid .card", has_text="Programme E2E").click()
    page.locator("#btn-start-workout").click()
    expect(page.locator("#workout-ex-target").first).to_have_text(re.compile(r"8 reps @ 20 ?kg", re.I))
    expect(page.locator("#workout-last-perf")).to_contain_text("Dernière fois")
    print("Progressive Overload Carry-Over: OK")


def test_resume_interrupted_workout(page):
    print("Testing Interrupted Workout Resume...")
    page.locator("#btn-next-step").click()          # une série validée
    expect(page.locator("#workout-rest-view")).to_be_visible()

    # On quitte sans enregistrer : la séance doit rester reprenable.
    page.once("dialog", lambda d: d.dismiss())
    page.evaluate("quitWorkout()")

    page.reload()
    page.wait_for_selector("#plans-grid .card", timeout=30000)
    expect(page.locator("#resume-banner")).to_be_visible()

    page.locator("#resume-banner").get_by_role("button", name="REPRENDRE").click()
    expect(page.locator("#workout-screen")).to_be_visible()

    # Cette fois on enregistre la séance partielle.
    page.once("dialog", lambda d: d.accept())
    page.evaluate("quitWorkout()")
    session = page.evaluate("readSessions().slice(-1)[0]")
    assert session["termine"] is False, "La séance écourtée doit être marquée comme partielle"
    print("Interrupted Workout Resume: OK")


def test_backup_roundtrip(page):
    print("Testing Backup Round-Trip...")
    backup = page.evaluate("JSON.stringify(buildBackup())")
    payload = json.loads(backup)
    assert payload["format"] == "fittrack-backup", "L'enveloppe de sauvegarde doit être identifiée"
    assert len(payload["sessions"]) >= 2, "L'historique doit figurer dans la sauvegarde"
    assert len(payload["logs"]) >= 1, "Le journal de performance doit figurer dans la sauvegarde"

    page.evaluate(
        """() => {
            db.exercices = db.exercices.filter(e => e.nom !== 'Exercice E2E');
            coachSaveDb();
        }"""
    )
    assert not page.evaluate("db.exercices.some(e => e.nom === 'Exercice E2E')")

    page.evaluate(
        """(txt) => {
            const res = parseBackup(txt);
            db = applyBackup(res.payload, 'merge').data;
        }""",
        backup,
    )
    assert page.evaluate(
        "db.exercices.some(e => e.nom === 'Exercice E2E')"
    ), "La fusion doit restaurer l'exercice supprimé"

    # Un fichier invalide doit être refusé proprement.
    assert page.evaluate("parseBackup('{pas du json').ok === false")
    assert page.evaluate("parseBackup(JSON.stringify({data: {}})).ok === false")
    print("Backup Round-Trip: OK")


def test_sync_preserves_local_content(page):
    print("Testing Non-Destructive Sync...")
    resultat = page.evaluate(
        """() => {
            const original = window.confirm;
            window.confirm = () => true;              // choisir « fusionner »
            const ok = coachApplySyncedData({
                exercices: [{id: 'sync_1', nom: 'Exo synchronisé', tags: '', type: 'reps', series: 1, valeur: 1, repos: 0}],
                plans: []
            });
            window.confirm = original;
            return {
                ok: ok,
                local: db.exercices.some(e => e.nom === 'Exercice E2E'),
                synchro: db.exercices.some(e => e.id === 'sync_1'),
                secours: readSnapshot() !== null
            };
        }"""
    )
    assert resultat["local"], "La synchronisation ne doit pas effacer les exercices créés localement"
    assert resultat["synchro"], "Les exercices synchronisés doivent être intégrés"
    assert resultat["secours"], "Une copie de secours doit être prise avant la synchronisation"
    print("Non-Destructive Sync: OK")


def test_stats_and_progression(page):
    print("Testing Stats & Progression...")
    page.get_by_role("button", name="Statistiques").click()
    expect(page.locator("#stats-summary")).to_contain_text("séances cette semaine")
    expect(page.locator("#stats-history-list")).to_contain_text("Programme E2E")

    page.get_by_role("button", name="Bibliothèque").click()
    page.fill("#search-input", "Exercice E2E")
    page.locator("#exercices-grid .card").first.click()
    expect(page.locator("#modal-ex-extras")).to_contain_text("Dernière fois")
    expect(page.locator("#modal-ex-extras")).to_contain_text("Progression")
    print("Stats & Progression: OK")


if __name__ == "__main__":
    console_errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 420, "height": 860})
        context.route("https://fonts.googleapis.com/**", lambda route: route.abort())
        context.route("https://fonts.gstatic.com/**", lambda route: route.abort())

        try:
            page = fresh_page(context, console_errors)
            ex_id = test_library_and_plan_crud(page)
            test_performance_logging(page, ex_id)
            test_progressive_overload_carries_over(page, ex_id)
            test_resume_interrupted_workout(page)
            test_backup_roundtrip(page)
            test_sync_preserves_local_content(page)
            test_stats_and_progression(page)

            reelles = [e for e in console_errors if not any(b in e for b in CONSOLE_NOISE)]
            if reelles:
                raise AssertionError("Erreurs console : " + " | ".join(reelles))

            print("\n✅ All progress-tracking E2E tests completed successfully!")
        except Exception as e:
            print(f"\n❌ Progress-tracking E2E tests failed: {e}")
            try:
                page.screenshot(path="e2e_progress_error.png", timeout=5000)
            except Exception:
                pass
            exit(1)
        finally:
            context.close()
            browser.close()
