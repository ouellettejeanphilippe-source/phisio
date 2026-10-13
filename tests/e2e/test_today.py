"""
Tests E2E de l'écran « Aujourd'hui », l'accueil de l'application.

Il doit proposer le bon programme du jour, le lancer en un geste, montrer la
semaine et se mettre à jour après une séance.
"""
import re
from playwright.sync_api import sync_playwright, expect

BASE_URL = "http://localhost:8000/index.html"
JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

CONSOLE_NOISE = ("favicon", "fonts.googleapis", "ERR_FAILED", "navigator.vibrate")


def build_data(jour_du_test):
    exercices = [
        {"id": "e1", "nom": "Pont fessier", "type": "reps", "series": 1, "valeur": 2,
         "repos": 0, "tempo": 2, "description": "Montez le bassin.", "tags": "Fessiers"},
        {"id": "k1", "nom": "Kegel souffle", "type": "kegel", "series": 2, "valeur": 1,
         "kegel_on": 1, "kegel_off": 1, "repos": 0, "description": "Contractez.", "tags": "Pelvien"},
    ]
    plans = [{"id": "libre", "nom": "Mobilité douce", "description": "Sans jour", "goal": 2,
              "exercices_ids": ["e1"]}]
    for i, j in enumerate(JOURS):
        plans.append({"id": f"j{i}", "nom": f"Routine {j}", "description": f"Le {j.lower()}",
                      "goal": 1, "exercices_ids": ["e1", "k1"]})
    return {"exercices": exercices, "plans": plans}


def fresh_page(context, errors):
    page = context.new_page()
    page.set_default_timeout(20000)
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type == "error" else None)
    page.goto(BASE_URL)
    page.evaluate("localStorage.clear()")
    page.evaluate("(d) => localStorage.setItem('fitness_data', JSON.stringify(d))", build_data(None))
    page.evaluate("localStorage.setItem('fitness_voice_pref', '0')")
    page.reload()
    page.evaluate("window.playBeep = () => {}")
    expect(page.locator("#today-section")).to_be_visible()
    return page


def jour_courant(page):
    # Lundi = 0, comme la liste JOURS
    return page.evaluate("(new Date().getDay() + 6) % 7")


def test_home_is_today_with_day_plan(page):
    print("Testing Today home screen...")
    jour = JOURS[jour_courant(page)]
    expect(page.locator(".nav-item.active")).to_have_attribute("data-tab", "today")
    expect(page.locator("#main-header")).to_be_hidden()
    expect(page.locator("#today-hero .today-eyebrow")).to_have_text("Programme du jour")
    expect(page.locator("#today-hero .today-hero-title")).to_have_text(f"Routine {jour}")
    expect(page.locator("#today-hero")).to_contain_text("min")
    expect(page.locator("#today-week .week-day")).to_have_count(7)
    expect(page.locator("#today-week .week-day.is-current")).to_have_count(1)
    expect(page.locator("#today-shortcuts")).to_contain_text("Kegel express")
    expect(page.locator("#today-last")).to_contain_text("première séance")
    print("Today home screen: OK")


def test_one_tap_start_and_refresh(page):
    print("Testing one-tap start...")
    jour = JOURS[jour_courant(page)]
    page.locator("#today-start").click()
    expect(page.locator("#guided-view")).to_be_visible()
    expect(page.locator("#guided-ex-name")).to_have_text("Pont fessier")
    page.evaluate("guideTimeScale = 0.02")
    expect(page.locator("#workout-end-view")).to_be_visible(timeout=15000)
    page.locator("#workout-end-view button", has_text="RETOUR").click()

    # L'accueil se met à jour : séance faite, semaine, série, dernière séance
    expect(page.locator("#today-hero .today-eyebrow")).to_have_text("✓ Fait aujourd'hui")
    expect(page.locator("#today-start")).to_contain_text("Refaire")
    expect(page.locator("#today-week .week-day.is-current")).to_have_class(re.compile("is-done"))
    expect(page.locator("#today-streak")).to_have_text("🔥 1")
    expect(page.locator("#today-last")).to_contain_text(f"Routine {jour}")
    print("One-tap start: OK")


def test_change_plan_and_shortcuts(page):
    print("Testing plan picker and shortcuts...")
    page.locator("#today-change").click()
    expect(page.locator("#modal-today-picker")).to_have_class(re.compile("active"))
    page.locator("#today-picker-list .picker-item", has_text="Mobilité douce").click()
    expect(page.locator("#modal-today-picker")).not_to_have_class(re.compile("active"))
    expect(page.locator("#today-hero .today-eyebrow")).to_have_text("Votre choix")
    expect(page.locator("#today-hero .today-hero-title")).to_have_text("Mobilité douce")

    # Kegel express : une série de chaque exercice « cycles »
    page.locator("#today-shortcuts .shortcut", has_text="Kegel express").click()
    expect(page.locator("#guided-ex-name")).to_have_text("Kegel souffle")
    expect(page.locator("#guided-sub")).to_contain_text("Série 1/1")
    page.once("dialog", lambda d: d.accept())
    page.evaluate("quitWorkout()")

    # Le bouton ▶ d'une carte de programme lance directement la séance
    page.get_by_role("button", name="Programmes", exact=True).click()
    page.get_by_role("button", name="Commencer Mobilité douce").click()
    expect(page.locator("#guided-view")).to_be_visible()
    expect(page.locator("#modal")).not_to_have_class(re.compile("active"))
    page.evaluate("quitWorkout()")

    # Les réglages restent accessibles depuis l'en-tête
    page.get_by_role("button", name="Paramètres").click()
    expect(page.locator("#settings-section")).to_be_visible()
    print("Plan picker and shortcuts: OK")


if __name__ == "__main__":
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 390, "height": 844})
        context.route("https://fonts.googleapis.com/**", lambda route: route.abort())
        context.route("https://fonts.gstatic.com/**", lambda route: route.abort())
        try:
            page = fresh_page(context, errors)
            test_home_is_today_with_day_plan(page)
            test_one_tap_start_and_refresh(page)
            test_change_plan_and_shortcuts(page)
            reelles = [e for e in errors if not any(b in e for b in CONSOLE_NOISE)]
            if reelles:
                raise AssertionError("Erreurs console : " + " | ".join(reelles))
            print("\n✅ All today-screen E2E tests completed successfully!")
        except Exception as e:
            print(f"\n❌ Today-screen E2E tests failed: {e}")
            try:
                page.screenshot(path="e2e_today_error.png", timeout=5000)
            except Exception:
                pass
            exit(1)
        finally:
            context.close()
            browser.close()
