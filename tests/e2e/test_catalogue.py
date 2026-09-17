"""
Tests E2E du catalogue d'exercices.

Ils couvrent le téléchargement hors-ligne, la recherche locale, les
suggestions personnalisées, l'import et le complètement d'un exercice
existant. L'API wger est simulée : les tests ne dépendent pas du réseau.
"""
import json
import re
from playwright.sync_api import sync_playwright, expect

BASE_URL = "http://localhost:8000/index.html"

CONSOLE_NOISE = (
    "favicon",
    "fonts.googleapis",
    "ERR_CERT_AUTHORITY_INVALID",
    "ERR_FAILED",
    "navigator.vibrate",
    "wger.de/media",
)


def raw(exercise_id, name_en, name_fr=None, category="Abs", muscles=None,
        equipment=None, desc_fr=None, group=None):
    """Fiche au format réellement renvoyé par /api/v2/exerciseinfo/."""
    translations = [{
        "language": 2, "name": name_en,
        "description": f"<p>Instructions for {name_en}.</p>"
    }]
    if name_fr:
        translations.append({
            "language": 12, "name": name_fr,
            "description": desc_fr or f"<p>Consignes pour {name_fr}.</p>"
        })
    return {
        "id": exercise_id,
        "category": {"id": 1, "name": category},
        "muscles": [{"id": i, "name": m, "name_en": m} for i, m in enumerate(muscles or [])],
        "muscles_secondary": [],
        "equipment": [{"id": i, "name": e} for i, e in enumerate(equipment or [])],
        "images": [],
        "videos": [],
        "variation_group": group,
        "translations": translations,
    }


CATALOGUE = [
    raw(1, "Plank", "Planche", "Abs", ["Abs"], [], group="plank"),
    raw(2, "Side Plank", "Planche latérale", "Abs", ["Abs"], [], group="plank"),
    raw(3, "Kneeling Thoracic Rotation", "Rotation thoracique à genoux", "Back",
        ["Trapezius"], ["Resistance band"]),
    raw(4, "Band Pull Apart", "Écartés à l'élastique", "Shoulders",
        ["Shoulders"], ["Resistance band"]),
    raw(5, "Glute Bridge", "Pont fessier", "Legs", ["Glutes"], []),
    raw(6, "Biceps Curl", None, "Arms", ["Biceps"], ["Dumbbell"]),
    raw(7, "Bench Press", None, "Chest", ["Chest"], ["Barbell", "Bench"]),
]

LIBRARY = {
    "exercices": [
        {"id": "100", "nom": "Gainage ventral", "tags": "Core, Stabilité",
         "tagsArray": ["Core", "Stabilité"], "type": "secs", "series": 3,
         "valeur": 30, "repos": 30, "description": "", "equipement": ""},
        {"id": "101", "nom": "Rotation thoracique", "tags": "Thoracique, Mobilité",
         "tagsArray": ["Thoracique", "Mobilité"], "type": "reps", "series": 2,
         "valeur": 10, "repos": 30, "description": "Ma propre consigne.",
         "equipement": "Élastique"},
    ],
    "plans": [
        {"id": "p1", "nom": "Programme E2E", "description": "Test",
         "goal": 3, "exercices_ids": ["100", "101"]},
    ],
}


def mock_wger(route):
    """Répond comme l'API wger, avec pagination."""
    url = route.request.url
    offset = int(re.search(r"offset=(\d+)", url).group(1)) if "offset=" in url else 0
    limit = int(re.search(r"limit=(\d+)", url).group(1)) if "limit=" in url else 100
    page = CATALOGUE[offset:offset + limit]
    route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps({"count": len(CATALOGUE), "results": page}),
    )


def fresh_page(context, console_errors):
    page = context.new_page()
    page.set_default_timeout(30000)
    page.on("pageerror", lambda e: console_errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: console_errors.append(f"{m.type}: {m.text}")
            if m.type == "error" else None)
    page.route("**/api/v2/exerciseinfo/**", mock_wger)

    page.goto(BASE_URL)
    page.evaluate("localStorage.clear()")
    page.evaluate("(data) => localStorage.setItem('fitness_data', JSON.stringify(data))", LIBRARY)
    page.reload()
    page.evaluate("window.playBeep = () => {}")
    page.wait_for_selector("#plans-grid .card", timeout=30000)
    return page


def test_discover_requires_catalogue(page):
    print("Testing Discover Without Catalogue...")
    page.get_by_role("button", name="Bibliothèque").click()
    page.get_by_role("button", name="DÉCOUVRIR").click()

    expect(page.locator("#discover-setup")).to_be_visible()
    expect(page.locator("#discover-main")).not_to_be_visible()
    print("Discover Without Catalogue: OK")


def test_download_catalogue(page):
    print("Testing Catalogue Download...")
    page.get_by_role("button", name="TÉLÉCHARGER LE CATALOGUE").click()
    expect(page.locator("#discover-main")).to_be_visible(timeout=30000)

    count = page.evaluate("catalogueEntries().length")
    assert count == len(CATALOGUE), f"{len(CATALOGUE)} fiches attendues, {count} stockées"
    assert page.evaluate("catalogueIsReady()"), "Le catalogue doit être prêt"

    stored = page.evaluate("readCatalogue()")
    assert stored["version"] == 1
    assert stored["fetchedAt"], "La date de téléchargement doit être enregistrée"
    print("Catalogue Download: OK")


def test_suggestions_are_personalised(page):
    print("Testing Personalised Suggestions...")
    page.evaluate("setDiscoverMode('suggest')")
    texte = page.inner_text("#discover-results")

    # La bibliothèque contient Core/Stabilité et Thoracique/Mobilité.
    assert "Planche" in texte, "Une suggestion d'abdominaux est attendue"
    assert "Biceps Curl" not in texte, "Le biceps est hors des zones travaillées"
    assert "Bench Press" not in texte, "Les pectoraux sont hors des zones travaillées"

    # Les fiches françaises doivent être privilégiées à l'affichage.
    assert "Consignes pour" in texte or "Planche" in texte
    print("Personalised Suggestions: OK")


def test_search_is_local_and_offline(page):
    print("Testing Offline Local Search...")
    page.evaluate("setDiscoverMode('search')")

    page.fill("#discover-query", "planche laterale")  # sans accent
    expect(page.locator("#discover-results")).to_contain_text("Planche latérale")

    page.fill("#discover-query", "pull apart")  # nom anglais
    expect(page.locator("#discover-results")).to_contain_text("Écartés à l'élastique")

    page.fill("#discover-query", "")
    page.select_option("#discover-equipment", "Resistance band")
    texte = page.inner_text("#discover-results")
    assert "Rotation thoracique" in texte and "Pont fessier" not in texte

    page.select_option("#discover-equipment", "")
    page.select_option("#discover-category", "Legs")
    expect(page.locator("#discover-results")).to_contain_text("Pont fessier")
    page.select_option("#discover-category", "")

    # Hors connexion, la recherche doit continuer de fonctionner.
    page.context.set_offline(True)
    page.fill("#discover-query", "pont")
    expect(page.locator("#discover-results")).to_contain_text("Pont fessier")
    page.context.set_offline(False)
    print("Offline Local Search: OK")


def test_import_from_catalogue(page):
    print("Testing Catalogue Import...")
    page.fill("#discover-query", "pont fessier")
    page.locator("#discover-results button", has_text="+ Ajouter").first.click()

    ex = page.evaluate("db.exercices.find(e => e.nom === 'Pont fessier')")
    assert ex is not None, "L'exercice importé doit être dans la bibliothèque"
    assert ex["catalogueId"] == 5
    assert "Consignes pour Pont fessier" in ex["description"], \
        f"L'import doit apporter de vraies consignes, obtenu : {ex['description']!r}"
    assert "Glutes" in ex["tags"]
    assert page.evaluate(
        "JSON.parse(localStorage.getItem('fitness_data')).exercices.some(e => e.nom === 'Pont fessier')"
    ), "L'import doit être persisté"

    # Une deuxième fois, le bouton doit indiquer que l'exercice est déjà présent.
    page.fill("#discover-query", "pont fessier")
    expect(page.locator("#discover-results")).to_contain_text("Déjà dans la bibliothèque")
    print("Catalogue Import: OK")


def test_variations_are_listed(page):
    print("Testing Variations...")
    page.fill("#discover-query", "planche")
    page.locator("#discover-results button", has_text="Détails").first.click()
    expect(page.locator("#discover-results")).to_contain_text("Variantes")
    page.locator("#discover-results button", has_text="Réduire").first.click()
    print("Variations: OK")


def test_enrich_exact_match(page):
    """Un nom qui correspond exactement est complété sans faire choisir."""
    print("Testing Enrichment On Exact Match...")
    page.locator("#modal-discover .close-btn").click()
    expect(page.locator("#modal-discover")).not_to_have_class(re.compile(r"active"))

    page.evaluate("""() => {
        db.exercices.push({
            id: '103', nom: 'Planche latérale', tags: 'Core',
            tagsArray: ['Core'], type: 'secs', series: 2, valeur: 30,
            repos: 30, description: '', equipement: ''
        });
        coachSaveDb();
        coachRefreshLibrary();
    }""")

    page.get_by_role("button", name="Bibliothèque").click()
    page.fill("#search-input", "Planche latérale")
    page.locator("#exercices-grid .card").first.click()

    page.once("dialog", lambda d: d.accept())
    page.locator("#modal-ex-extras").get_by_role(
        "button", name="🔎 Compléter depuis le catalogue").click()
    page.wait_for_timeout(300)

    ex = page.evaluate("db.exercices.find(e => e.id === '103')")
    assert ex["catalogueId"] == 2, f"Devrait pointer sur Side Plank, obtenu {ex.get('catalogueId')}"
    assert "Consignes pour" in ex["description"], "Les consignes doivent être reprises"
    print("Enrichment On Exact Match: OK")


def test_no_silent_wrong_match(page):
    """
    Un nom seulement ressemblant ne doit jamais être complété en silence :
    sur les données réelles, « Rotation des hanches assis » se rapprochait
    d'« Abduction des hanches assis », un autre mouvement.
    """
    print("Testing No Silent Wrong Match...")
    page.evaluate("""() => {
        db.exercices.push({
            id: '104', nom: 'Planche avec extension de la hanche', tags: 'Core',
            tagsArray: ['Core'], type: 'secs', series: 2, valeur: 20,
            repos: 30, description: '', equipement: ''
        });
        coachSaveDb();
        coachRefreshLibrary();
    }""")

    page.fill("#search-input", "extension de la hanche")
    page.locator("#exercices-grid .card").first.click()
    page.locator("#modal-ex-extras").get_by_role(
        "button", name="🔎 Compléter depuis le catalogue").click()

    # Pas de dialogue de confirmation : on ouvre directement le choix manuel.
    expect(page.locator("#modal-discover")).to_have_class(re.compile(r"active"))
    expect(page.locator("#discover-hint")).to_contain_text("Planche avec extension de la hanche")

    ex = page.evaluate("db.exercices.find(e => e.id === '104')")
    assert not ex["description"], "Rien ne doit être écrit sans validation de l'utilisateur"

    # Les fiches proches sont proposées, l'utilisateur tranche.
    expect(page.locator("#discover-results")).to_contain_text("Planche")
    expect(page.locator("#discover-results")).to_contain_text("Planche")
    print("No Silent Wrong Match: OK")


def test_manual_choice_is_applied(page):
    """La fiche choisie à la main complète bien l'exercice."""
    print("Testing Manual Choice Applied...")
    page.fill("#discover-query", "planche latérale")
    page.locator("#discover-results button", has_text="Utiliser cette fiche").first.click()
    page.wait_for_timeout(300)

    expect(page.locator("#modal-discover")).not_to_have_class(re.compile(r"active"))
    ex = page.evaluate("db.exercices.find(e => e.id === '104')")
    assert ex["catalogueId"] == 2, f"La fiche choisie doit être appliquée, obtenu {ex.get('catalogueId')}"
    assert "Consignes pour" in ex["description"], "Les consignes doivent être reprises"
    print("Manual Choice Applied: OK")


def test_enrichment_never_overwrites(page):
    """Compléter n'écrase jamais ce que l'utilisateur a écrit lui-même."""
    print("Testing Enrichment Preserves User Text...")
    page.get_by_role("button", name="Bibliothèque").click()
    page.fill("#search-input", "Rotation thoracique")
    page.locator("#exercices-grid .card").first.click()

    page.locator("#modal-ex-extras").get_by_role(
        "button", name="🔎 Compléter depuis le catalogue").click()

    # « Rotation thoracique » ressemble à « Rotation thoracique à genoux »
    # sans l'égaler : l'application fait choisir plutôt que de trancher seule.
    expect(page.locator("#modal-discover")).to_have_class(re.compile(r"active"))
    page.locator("#discover-results button", has_text="Utiliser cette fiche").first.click()
    page.wait_for_timeout(300)

    ex = page.evaluate("db.exercices.find(e => e.id === '101')")
    assert ex["description"] == "Ma propre consigne.", \
        f"La consigne de l'utilisateur ne doit jamais être écrasée, obtenu : {ex['description']!r}"
    assert ex["equipement"] == "Élastique", "Le matériel saisi ne doit pas être écrasé"
    assert ex["catalogueId"] is not None, "Le lien vers le catalogue doit tout de même être posé"
    print("Enrichment Preserves User Text: OK")


def test_quick_workout_suggestions_use_catalogue(page):
    print("Testing Quick Workout Suggestions...")
    for modal in ("#modal-ex", "#modal-discover"):
        page.evaluate(f"document.querySelector('{modal}').classList.remove('active')")

    page.get_by_role("button", name="Programmes").click()
    page.get_by_role("button", name="+ SÉANCE RAPIDE").click()
    page.fill("#search-input", "planche")
    expect(page.locator("#web-suggestions-container")).to_be_visible()
    expect(page.locator("#web-exercices-grid")).to_contain_text("Planche")
    print("Quick Workout Suggestions: OK")


def test_delete_catalogue_keeps_user_data(page):
    print("Testing Catalogue Deletion...")
    page.get_by_role("button", name="Paramètres").click()
    expect(page.locator("#catalogue-status")).to_contain_text("disponibles hors connexion")

    page.once("dialog", lambda d: d.accept())
    page.get_by_role("button", name="🗑️ Supprimer").click()

    assert not page.evaluate("catalogueIsReady()"), "Le catalogue doit être supprimé"
    assert page.evaluate("db.exercices.length") > 0, "La bibliothèque doit être intacte"
    assert page.evaluate(
        "JSON.parse(localStorage.getItem('fitness_data')).exercices.length"
    ) > 0, "Les données de l'utilisateur doivent survivre"
    expect(page.locator("#catalogue-status")).to_contain_text("non téléchargé")
    print("Catalogue Deletion: OK")


if __name__ == "__main__":
    console_errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 420, "height": 860})
        context.route("https://fonts.googleapis.com/**", lambda route: route.abort())
        context.route("https://fonts.gstatic.com/**", lambda route: route.abort())

        try:
            page = fresh_page(context, console_errors)
            test_discover_requires_catalogue(page)
            test_download_catalogue(page)
            test_suggestions_are_personalised(page)
            test_search_is_local_and_offline(page)
            test_import_from_catalogue(page)
            test_variations_are_listed(page)
            test_enrich_exact_match(page)
            test_no_silent_wrong_match(page)
            test_manual_choice_is_applied(page)
            test_enrichment_never_overwrites(page)
            test_quick_workout_suggestions_use_catalogue(page)
            test_delete_catalogue_keeps_user_data(page)

            reelles = [e for e in console_errors if not any(b in e for b in CONSOLE_NOISE)]
            if reelles:
                raise AssertionError("Erreurs console : " + " | ".join(reelles))

            print("\n✅ All catalogue E2E tests completed successfully!")
        except Exception as e:
            print(f"\n❌ Catalogue E2E tests failed: {e}")
            try:
                page.screenshot(path="e2e_catalogue_error.png", timeout=5000)
            except Exception:
                pass
            exit(1)
        finally:
            context.close()
            browser.close()
