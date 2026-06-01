import json
import time
import re
from playwright.sync_api import sync_playwright, expect

MOCK_DATA = {
    "exercices": [
        {
            "id": "1",
            "nom": "Pompes",
            "tags": "Pectoraux",
            "series": 2,
            "valeur": 10,
            "repos": 5,
            "description": "Descendez et remontez.",
            "type": "reps",
            "tagsArray": ["Pectoraux"]
        },
        {
            "id": "2",
            "nom": "Planche",
            "tags": "Abdos",
            "series": 1,
            "valeur": 5,
            "repos": 5,
            "description": "Gainage statique.",
            "type": "secs",
            "tagsArray": ["Abdos"]
        },
        {
            "id": "3",
            "nom": "Kegel Test",
            "tags": "Santé",
            "series": 1,
            "valeur": 2,
            "repos": 5,
            "description": "Cycles contraction.",
            "type": "kegel",
            "kegel_on": 2,
            "kegel_off": 1,
            "tagsArray": ["Santé"]
        }
    ],
    "plans": [
        {
            "id": "p1",
            "nom": "Programme Test",
            "description": "Un programme pour les tests E2E",
            "exercices_ids": ["1", "2"]
        }
    ]
}

def setup_page(page):
    # Go to the app
    page.goto("http://localhost:8000")

    # Inject mock data into localStorage
    page.evaluate(f"(data) => localStorage.setItem('fitness_data', JSON.stringify(data))", MOCK_DATA)
    page.evaluate("localStorage.setItem('fitness_sound_pref', '0')")

    # Reload
    page.reload()

    # Inject CSS to disable animations and handle fonts
    page.evaluate("""
        const style = document.createElement('style');
        style.innerHTML = `
            * { transition: none !important; animation: none !important; }
            @font-face { font-family: 'Inter'; src: local('Arial'); }
            body { font-family: Arial, sans-serif !important; }
        `;
        document.head.appendChild(style);
    """)

    # Mock playBeep
    page.evaluate("window.playBeep = () => {}")

    # Wait for the app to render the plans
    page.get_by_text("Programme Test").first.wait_for(state="visible", timeout=30000)

def test_full_workout_flow(page):
    print("Testing Full Workout Flow...")
    setup_page(page)

    # 1. Start Workout from Plan
    el = page.get_by_text("Programme Test").first
    el.click()

    # Modal should be active
    modal = page.locator("#modal")
    expect(modal).to_have_class(re.compile(r"active"), timeout=10000)
    page.get_by_role("button", name="▶ DÉMARRER").click()

    # 2. First Exercise (Pompes - Reps)
    expect(page.locator("#workout-screen")).to_be_visible()
    expect(page.locator("#workout-ex-target").first).to_have_text(re.compile(r"2 x 10 reps"), timeout=10000)

    # Complete 2 sets
    for i in range(2):
        btn = page.locator("#btn-next-step")
        btn.click()

        # If not the last set of the workout, there should be a rest
        if i == 0:
            expect(page.locator("#workout-rest-view")).to_be_visible()
            page.locator("#btn-skip-rest").click()

    # 3. Second Exercise (Planche - Secs)
    expect(page.locator("#workout-ex-title")).to_have_text("Planche", timeout=10000)
    page.locator("#btn-next-step").click()

    # 4. End Screen
    expect(page.locator("#workout-end-view")).to_be_visible()
    page.get_by_role("button", name="RETOUR À L'ACCUEIL").click()
    expect(page.locator("#workout-screen")).not_to_be_visible()
    print("Full Workout Flow: OK")

def test_quick_workout_flow(page):
    print("Testing Quick Workout Flow...")
    setup_page(page)

    # Go to Quick Workout
    page.get_by_role("button", name="+ SÉANCE RAPIDE").click()
    expect(page.locator("#quick-workout-section")).to_be_visible()

    # Select an exercise
    page.locator("#quick-exercices-grid").get_by_text("Pompes").first.click()

    # Start
    page.locator("#btn-start-quick").click()
    expect(page.locator("#workout-screen")).to_be_visible()
    expect(page.locator("#workout-ex-title")).to_have_text("Pompes", timeout=10000)
    print("Quick Workout Flow: OK")

def test_workout_controls(page):
    print("Testing Workout Controls...")
    setup_page(page)

    # Start Programme Test
    page.get_by_text("Programme Test").first.click()
    page.get_by_role("button", name="▶ DÉMARRER").click()

    # Skip Exercise
    expect(page.locator("#workout-screen")).to_be_visible()
    expect(page.locator("#workout-ex-title")).to_have_text("Pompes", timeout=10000)

    # Handle confirmation dialog for skip
    page.once("dialog", lambda dialog: dialog.accept())
    page.locator("#btn-skip-ex").click()

    # Should move to Planche
    expect(page.locator("#workout-ex-title")).to_have_text("Planche", timeout=10000)

    # Delay Exercise
    page.locator("#btn-delay-ex").click()

    # Re-renders Planche
    expect(page.locator("#workout-ex-title")).to_have_text("Planche", timeout=10000)
    print("Workout Controls: OK")

def test_timers_isometry_kegel(page):
    print("Testing Isometry and Kegel Timers...")
    setup_page(page)

    # Define a quick plan with Planche and Kegel
    custom_plan = {
        "id": "quick_timers",
        "nom": "Test Timers",
        "exercices_ids": ["2", "3"]
    }
    page.evaluate(f"(plan) => startWorkout(plan)", custom_plan)

    # 1. Planche (Secs)
    expect(page.locator("#workout-ex-title")).to_have_text("Planche", timeout=10000)
    expect(page.locator("#workout-active-timer-section")).to_be_visible()

    # Start timer
    page.locator("#btn-start-active-timer").click()
    expect(page.locator("#btn-pause-active-timer")).to_be_visible()

    # Instead of waiting, we can manually trigger next step
    page.locator("#btn-next-step").click()

    # Should move to Kegel Test (after rest if any, but let's assume no rest for simplicity or skip it)
    # Actually mock data has 5s rest.
    if page.locator("#workout-rest-view").is_visible():
        page.locator("#btn-skip-rest").click()

    # 2. Kegel Test
    expect(page.locator("#workout-ex-title")).to_have_text("Kegel Test", timeout=10000)
    expect(page.locator("#workout-active-timer-section")).to_be_visible()
    page.locator("#btn-start-active-timer").click()

    # Finalize
    page.locator("#btn-next-step").click()
    expect(page.locator("#workout-end-view")).to_be_visible()
    print("Timers Isometry/Kegel: OK")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        context.route("https://fonts.googleapis.com/**", lambda route: route.abort())
        context.route("https://fonts.gstatic.com/**", lambda route: route.abort())

        page = context.new_page()
        page.set_default_timeout(30000)
        try:
            test_full_workout_flow(page)
            test_quick_workout_flow(page)
            test_workout_controls(page)
            test_timers_isometry_kegel(page)
            print("\n✅ All E2E Tests completed successfully!")
        except Exception as e:
            print(f"\n❌ E2E Tests failed: {e}")
            try:
                page.screenshot(path="e2e_error.png", timeout=5000)
            except:
                pass
            exit(1)
        finally:
            context.close()
            browser.close()
