"""
Tests E2E de la séance guidée.

L'application doit mener la séance de bout en bout sans qu'on touche l'écran :
répétitions rythmées, maintiens chronométrés, cycles contraction/relâchement,
changement de côté, repos, enchaînement des exercices, puis écran de fin.
Le temps est accéléré via `guideTimeScale` pour que le test reste rapide.
"""
import re
from playwright.sync_api import sync_playwright, expect

BASE_URL = "http://localhost:8000/index.html"

DATA = {
    "exercices": [
        {"id": "r1", "nom": "Pont fessier", "type": "reps", "series": 2, "valeur": 3,
         "repos": 40, "tempo": 2, "description": "Montez le bassin.", "tags": "Fessiers"},
        {"id": "h1", "nom": "Fente statique", "type": "secs", "series": 1, "valeur": 4,
         "repos": 0, "unilateral": True, "description": "Tenez la position.", "tags": "Jambes"},
        {"id": "k1", "nom": "Kegel", "type": "kegel", "series": 1, "valeur": 2,
         "kegel_on": 2, "kegel_off": 1, "repos": 0, "description": "Contractez puis relâchez.", "tags": "Pelvien"},
    ],
    "plans": [
        {"id": "pg", "nom": "Routine guidée", "description": "Test", "goal": 1,
         "exercices_ids": ["r1", "h1", "k1"]},
    ],
}

CONSOLE_NOISE = ("favicon", "fonts.googleapis", "ERR_FAILED", "navigator.vibrate")


def fresh_page(context, errors):
    page = context.new_page()
    page.set_default_timeout(20000)
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type == "error" else None)
    page.goto(BASE_URL)
    page.evaluate("localStorage.clear()")
    page.evaluate("(d) => localStorage.setItem('fitness_data', JSON.stringify(d))", DATA)
    page.evaluate("localStorage.setItem('fitness_voice_pref', '0')")
    page.reload()
    page.evaluate("window.playBeep = () => {}")
    page.wait_for_selector("#plans-grid .card", state="attached")
    return page


def open_and_start(page):
    page.get_by_role("button", name="Programmes", exact=True).click()
    page.locator("#plans-grid .card", has_text="Routine guidée").click()
    expect(page.locator("#modal-meta")).to_contain_text("min")
    page.locator("#btn-start-workout").click()
    expect(page.locator("#guided-view")).to_be_visible()
    expect(page.locator("#workout-controls")).to_be_hidden()


def test_runs_whole_session_hands_free(page):
    print("Testing hands-free guided session...")
    open_and_start(page)

    # Journal des étapes traversées : les plus brèves durent quelques ms en accéléré
    page.evaluate("""() => {
        window.__kinds = [];
        const original = guideEnterStep;
        guideEnterStep = (i) => { window.__kinds.push(guide.steps[i].kind); return original(i); };
    }""")

    # Annonce du premier exercice, puis répétitions comptées toutes seules
    expect(page.locator("#guided-phase")).to_have_text("Préparez-vous")
    expect(page.locator("#guided-ex-name")).to_have_text("Pont fessier")
    page.evaluate("guideTimeScale = 0.05")
    expect(page.locator("#guided-phase")).to_have_text("Répétition", timeout=5000)
    expect(page.locator("#guided-tempo")).to_be_visible()

    # Le repos arrive sans aucune action
    expect(page.locator("#guided-view")).to_have_attribute("data-kind", "rest", timeout=5000)
    page.evaluate("guideTimeScale = 1")
    expect(page.locator("#guided-sub")).to_contain_text("Avant la série 2/2")
    page.evaluate("guideTimeScale = 0.05")

    # Fin de séance automatique
    expect(page.locator("#workout-end-view")).to_be_visible(timeout=10000)

    # Déroulé attendu : maintien des deux côtés avec changement, puis cycles
    kinds = page.evaluate("window.__kinds")
    # (la toute première annonce précède l'installation de l'espion)
    attendu = (["rep"] * 3 + ["rest"] + ["rep"] * 3                      # pont fessier
               + ["rest", "prepare", "hold", "switch", "hold"]            # fente, 2 côtés
               + ["prepare", "contract", "relax", "contract", "relax"])   # kegel
    assert kinds == attendu, kinds

    # Tout est journalisé
    expect(page.locator("#guided-view")).to_be_hidden()
    logs = page.evaluate("({r: getLogs('r1'), h: getLogs('h1'), k: getLogs('k1')})")
    assert len(logs["r"]) == 1 and len(logs["r"][0]["sets"]) == 2, logs["r"]
    assert logs["r"][0]["sets"][0]["valeur"] == 3
    assert len(logs["h"][0]["sets"]) == 1 and len(logs["k"][0]["sets"]) == 1
    assert page.evaluate("guide.active") is False

    page.locator("#workout-end-view button", has_text="RETOUR").click()
    expect(page.locator("#workout-screen")).to_be_hidden()
    print("Hands-free guided session: OK")


def test_pause_skip_and_tempo(page):
    print("Testing pause, skip and tempo...")
    open_and_start(page)

    # Passer l'annonce
    page.locator("#guided-btn-skip").click()
    expect(page.locator("#guided-phase")).to_have_text("Répétition")

    # La pause fige vraiment la séance
    page.locator("#guided-btn-main").click()
    expect(page.locator("#guided-phase")).to_have_text("En pause")
    figé = page.evaluate("guide.index")
    page.evaluate("guideTimeScale = 0.05")
    page.wait_for_timeout(600)
    assert page.evaluate("guide.index") == figé, "La séance a avancé pendant la pause"
    page.locator("#guided-btn-main").click()
    expect(page.locator("#guided-btn-main")).to_have_text(re.compile("Pause"))
    page.evaluate("guideTimeScale = 1")

    # Le rythme se règle et reste mémorisé pour les prochaines séances
    page.get_by_role("button", name="Ralentir le rythme").click()
    expect(page.locator("#guided-tempo-value")).to_contain_text("2,5")
    assert page.evaluate("db.exercices.find(e => e.id === 'r1').tempo") == 2.5
    assert page.evaluate("JSON.parse(localStorage.getItem('fitness_data')).exercices.find(e => e.id === 'r1').tempo") == 2.5

    # Écourter une série : seules les répétitions faites sont journalisées
    page.evaluate("guideEnterStep(2)")  # annonce + 1 répétition terminées
    page.locator("#guided-btn-skip").click()
    expect(page.locator("#guided-view")).to_have_attribute("data-kind", "rest")
    perf = page.evaluate("currentWorkout.perf['r1'].sets")
    assert perf == [{"valeur": 1, "poids": 0}], perf

    # Le menu met en pause, et permet de repasser en mode manuel
    page.locator("#guided-btn-menu").click()
    expect(page.locator("#modal-guide-menu")).to_have_class(re.compile("active"))
    assert page.evaluate("guide.paused") is True
    page.locator("#modal-guide-menu button", has_text="mode manuel").click()
    expect(page.locator("#guided-view")).to_be_hidden()
    expect(page.locator("#btn-next-step")).to_be_visible()

    # Quitter en gardant la séance en attente
    page.once("dialog", lambda d: d.dismiss())
    page.evaluate("quitWorkout()")
    expect(page.locator("#workout-screen")).to_be_hidden()
    assert page.evaluate("guide.sessionOff") is False
    print("Pause, skip and tempo: OK")


def test_resume_goes_back_to_guided(page):
    print("Testing resume in guided mode...")
    expect(page.locator("#resume-banner")).to_be_visible()
    page.locator("#resume-banner button", has_text=re.compile("Reprendre", re.I)).click()
    expect(page.locator("#guided-view")).to_be_visible()
    expect(page.locator("#guided-phase")).to_have_text("Préparez-vous")
    expect(page.locator("#guided-sub")).to_contain_text("Série 2/2")
    page.once("dialog", lambda d: d.accept())
    page.evaluate("quitWorkout()")
    print("Resume in guided mode: OK")


if __name__ == "__main__":
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 390, "height": 844})
        context.route("https://fonts.googleapis.com/**", lambda route: route.abort())
        context.route("https://fonts.gstatic.com/**", lambda route: route.abort())
        try:
            page = fresh_page(context, errors)
            test_runs_whole_session_hands_free(page)
            test_pause_skip_and_tempo(page)
            test_resume_goes_back_to_guided(page)
            reelles = [e for e in errors if not any(b in e for b in CONSOLE_NOISE)]
            if reelles:
                raise AssertionError("Erreurs console : " + " | ".join(reelles))
            print("\n✅ All guided-session E2E tests completed successfully!")
        except Exception as e:
            print(f"\n❌ Guided-session E2E tests failed: {e}")
            try:
                page.screenshot(path="e2e_guided_error.png", timeout=5000)
            except Exception:
                pass
            exit(1)
        finally:
            context.close()
            browser.close()
