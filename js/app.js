
        function triggerHaptic() { if (navigator.vibrate) navigator.vibrate(50); }

        let db = { exercices: [], plans: [] };
        let currentTab = 'plans';

        let activeTagFilters = {
            exercices: null, // null means "Tous"
            quick: null,
            modalAdd: null
        };

        // Variables pour la séance en cours

        const WorkoutStrategies = {
            reps: {
                getTargetText: (ex) => {
                    let t = `${ex.series} x ${ex.valeur} reps`;
                    if (ex.unilateral) t += " par côté";
                    return t;
                },
                setupActiveTimer: () => {},
                startTimer: () => {}
            },
            secs: {
                getTargetText: (ex) => {
                    let t = `${ex.series} x ${ex.valeur} secs`;
                    if (ex.unilateral) t += " par côté";
                    return t;
                },
                setupActiveTimer: (ex, activeTimerSection, phaseEl, btnStartTimer, btnPauseTimer) => {
                    activeTimerSection.style.display = 'flex';
                    isWorkoutTimerPaused = false;
                    btnPauseTimer.style.display = 'none';
                    btnPauseTimer.innerHTML = '⏸ PAUSE';
                    btnPauseTimer.classList.remove('active-timer');
                    document.getElementById('workout-active-timer').textContent = ex.valeur;
                    phaseEl.textContent = "MAINTENIR";
                    btnStartTimer.style.display = 'block';
                    document.getElementById('active-timer-circle').style.transition = 'none';
                    document.getElementById('active-timer-circle').style.strokeDashoffset = '0';
                    document.getElementById('active-timer-circle').style.stroke = 'var(--accent-color)';
                    document.getElementById('active-timer-circle').classList.remove('active-timer-glow-red', 'active-timer-glow-green');
                },
                startTimer: (ex, timerEl, phaseEl, circleEl, btnPause, circumference, onFinish) => {
                    let timeRemaining = parseInt(ex.valeur);
                    circleEl.style.transition = 'stroke-dashoffset 1s linear';
                    phaseEl.textContent = "MAINTENIR";
                    circleEl.classList.add('active-timer-glow-red');
                    playBeep(400, 0.2);
                    activeWorkoutTimerInterval = setInterval(() => {
                        if (isWorkoutTimerPaused) {
                            circleEl.style.transition = 'none';
                            return;
                        } else {
                            circleEl.style.transition = 'stroke-dashoffset 1s linear';
                        }
                        timeRemaining--;
                        timerEl.textContent = timeRemaining;
                        const progress = ((ex.valeur - timeRemaining) / ex.valeur);
                        circleEl.style.strokeDashoffset = circumference * progress;
                        if (timeRemaining > 0 && timeRemaining <= 3) playBeep(600, 0.1);
                        if (timeRemaining <= 0) {
                            clearInterval(activeWorkoutTimerInterval);
                            playBeep(800, 0.5);
                            phaseEl.textContent = "TERMINÉ";
                            btnPause.style.display = 'none';
                            circleEl.classList.remove('active-timer-glow-red');
                            circleEl.style.transition = 'none';
                            circleEl.style.strokeDashoffset = circumference;
                            if (onFinish) onFinish();
                        }
                    }, 1000);
                }
            },
            kegel: {
                getTargetText: (ex) => {
                    return `${ex.series} x ${ex.valeur} cycles (C:${ex.kegel_on || 5}s / R:${ex.kegel_off || 5}s)`;
                },
                setupActiveTimer: (ex, activeTimerSection, phaseEl, btnStartTimer, btnPauseTimer) => {
                    activeTimerSection.style.display = 'flex';
                    isWorkoutTimerPaused = false;
                    btnPauseTimer.style.display = 'none';
                    btnPauseTimer.innerHTML = '⏸ PAUSE';
                    btnPauseTimer.classList.remove('active-timer');
                    document.getElementById('workout-active-timer').textContent = ex.valeur;
                    phaseEl.textContent = "PRÊT (CYCLES)";
                    btnStartTimer.style.display = 'block';
                    document.getElementById('active-timer-circle').style.transition = 'none';
                    document.getElementById('active-timer-circle').style.strokeDashoffset = '0';
                    document.getElementById('active-timer-circle').style.stroke = 'var(--accent-color)';
                    document.getElementById('active-timer-circle').classList.remove('active-timer-glow-red', 'active-timer-glow-green');
                },
                startTimer: (ex, timerEl, phaseEl, circleEl, btnPause, circumference, onFinish) => {
                    const tOn = parseInt(ex.kegel_on || 5);
                    const tOff = parseInt(ex.kegel_off || 5);
                    const totalCycles = parseInt(ex.valeur);
                    let currentCycle = 1;
                    let isContracting = true;
                    let phaseTimeLeft = tOn;

                    timerEl.textContent = currentCycle;
                    phaseEl.textContent = `CONTRACTER (1/${totalCycles})`;
                    circleEl.classList.remove('active-timer-glow-green');
                    circleEl.classList.add('active-timer-glow-red');
                    playBeep(600, 0.3);

                    activeWorkoutTimerInterval = setInterval(() => {
                        if (isWorkoutTimerPaused) return;
                        phaseTimeLeft--;
                        if (phaseTimeLeft <= 0) {
                            isContracting = !isContracting;
                            if (isContracting) {
                                currentCycle++;
                                if (currentCycle > totalCycles) {
                                    clearInterval(activeWorkoutTimerInterval);
                                    playBeep(800, 0.5);
                                    phaseEl.textContent = "TERMINÉ";
                                    btnPause.style.display = 'none';
                                    circleEl.classList.remove('active-timer-glow-green', 'active-timer-glow-red');
                                    circleEl.style.strokeDashoffset = circumference;
                                    if (onFinish) onFinish();
                                    return;
                                }
                                phaseTimeLeft = tOn;
                                timerEl.textContent = currentCycle;
                                phaseEl.textContent = `CONTRACTER (${currentCycle}/${totalCycles})`;
                                circleEl.classList.remove('active-timer-glow-green');
                                circleEl.classList.add('active-timer-glow-red');
                                playBeep(600, 0.3);
                            } else {
                                phaseTimeLeft = tOff;
                                phaseEl.textContent = "REPOS";
                                circleEl.classList.remove('active-timer-glow-red');
                                circleEl.classList.add('active-timer-glow-green');
                                playBeep(400, 0.1);
                            }
                        }
                    }, 1000);
                }
            },
            poids: {
                getTargetText: (ex) => {
                    let t = `${ex.series} x ${ex.valeur} reps @ ${ex.poids || 0}kg`;
                    if (ex.unilateral) t += " par côté";
                    return t;
                },
                setupActiveTimer: () => {},
                startTimer: () => {}
            },
            distance: {
                getTargetText: (ex) => {
                    let t = `${ex.series} x ${ex.valeur} km`;
                    if (ex.unilateral) t += " par côté";
                    return t;
                },
                setupActiveTimer: () => {},
                startTimer: () => {}
            }
        };

        let currentWorkout = {
            planId: null,
            exercices: [],
            currentExIndex: 0,
            currentSet: 0,
            isResting: false,
            restInterval: null
        };

        let soundEnabled = true;

        function toggleSoundPref() {
            const checkbox = document.getElementById('toggle-sound');
            soundEnabled = checkbox.checked;
            localStorage.setItem('fitness_sound_pref', soundEnabled ? '1' : '0');
            updateToggleUI();

            // Jouer un petit son de test si on active
            if (soundEnabled) {
                playBeep(600, 0.1, 'triangle');
            }
        }

        function updateToggleUI() {
            const slider = document.getElementById('toggle-slider');
            const knob = document.getElementById('toggle-knob');
            if (soundEnabled) {
                slider.style.backgroundColor = 'var(--accent-color)';
                slider.style.borderColor = 'var(--accent-color)';
                knob.style.backgroundColor = '#000';
                knob.style.transform = 'translateX(20px)';
            } else {
                slider.style.backgroundColor = 'var(--surface-hover)';
                slider.style.borderColor = 'var(--border-color)';
                knob.style.backgroundColor = 'var(--text-secondary)';
                knob.style.transform = 'translateX(0)';
            }
        }

        // Initialisation
        async function init() {
            showLoader();

            // Load Preferences
            const savedSoundPref = localStorage.getItem('fitness_sound_pref');
            if (savedSoundPref !== null) {
                soundEnabled = savedSoundPref === '1';
            }
            document.getElementById('toggle-sound').checked = soundEnabled;
            updateToggleUI();

            // Load URL if previously saved
            const savedUrl = localStorage.getItem('sync_url');
            if (savedUrl) {
                document.getElementById('api-url').value = savedUrl;
            }

            // Load Data
            const savedData = localStorage.getItem('fitness_data');
            if (savedData) {
                try {
                    db = JSON.parse(savedData);
                    // Pre-parse tags into arrays for performance
                    db.exercices.forEach(ex => {
                        ex.tagsArray = (ex.tags || '').split(',').map(t => t.trim()).filter(t => t !== '');
                    });
                    renderPlans(db.plans);
                    renderExercices(db.exercices);
                    hideError();
                } catch (e) {
                    showError("Erreur lors de la lecture des données locales. Veuillez re-synchroniser.");
                }
            } else {
                // Initial state - no data
                switchTab('settings');
                showError("Aucune donnée locale trouvée. Veuillez entrer l'URL de votre Google Apps Script et cliquer sur Synchroniser.");
            }

            hideLoader();
        }

        function updateStatusUI() {
            const statusDiv = document.getElementById('sync-status');
            const lastSync = localStorage.getItem('last_sync');
            if (lastSync) {
                const date = new Date(parseInt(lastSync));
                statusDiv.innerHTML = `✅ Données disponibles hors-ligne<br>Dernière synchronisation : ${date.toLocaleString('fr-FR')}`;
            } else {
                statusDiv.innerHTML = `⚠️ Aucune donnée n'est actuellement sauvegardée sur cet appareil.`;
            }
        }

        // Navigation
        function switchTab(tab) {
            triggerHaptic();
            currentTab = tab;
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(el => el.classList.remove('active'));

            if(tab === 'plans' && navItems[0]) navItems[0].classList.add('active');
            if(tab === 'exercices' && navItems[1]) navItems[1].classList.add('active');
            if(tab === 'stats' && navItems[2]) navItems[2].classList.add('active');
            if(tab === 'settings' && navItems[3]) navItems[3].classList.add('active');

            document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
            document.getElementById(`${tab}-section`).classList.add('active');

            const searchContainer = document.getElementById('search-container');
            if (searchContainer) {
                searchContainer.style.display = (tab === 'settings' || tab === 'stats') ? 'none' : 'flex';
            }
            document.getElementById('search-input').value = '';
            document.getElementById('clear-search-btn').classList.remove('visible');

            // Reset views
            if (tab === 'plans') renderPlans(db.plans);
            else if (tab === 'exercices') {
                renderTagsFilter('exercices-tags-container', db.exercices, 'exercices');
                handleSearch();
            }
            else if (tab === 'stats') renderStats();
            else if (tab === 'settings') updateStatusUI();
            else if (tab === 'quick-workout') {
                renderTagsFilter('quick-tags-container', db.exercices, 'quick');
                handleSearch();
            }
        }

        function extractUniqueTags(exercicesData) {
            const tagSet = new Set();
            exercicesData.forEach(ex => {
                if (ex.tagsArray) {
                    ex.tagsArray.forEach(t => tagSet.add(t));
                } else if (ex.tags) {
                    ex.tags.split(',').forEach(t => {
                        const trimmed = t.trim();
                        if (trimmed) tagSet.add(trimmed);
                    });
                }
            });
            return Array.from(tagSet).sort();
        }

        function renderTagsFilter(containerId, dataArray, filterContext) {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '';

            const tags = extractUniqueTags(dataArray);
            if (tags.length === 0) {
                container.style.display = 'none';
                return;
            }
            container.style.display = 'flex';

            // Button "Tous"
            const btnTous = document.createElement('button');
            btnTous.className = `filter-tag ${activeTagFilters[filterContext] === null ? 'active' : ''}`;
            btnTous.textContent = 'Tous';
            btnTous.onclick = () => {
                triggerHaptic();
                activeTagFilters[filterContext] = null;
                renderTagsFilter(containerId, dataArray, filterContext); // re-render to update active classes
                if(filterContext === 'modalAdd') handleModalSearch(); else handleSearch();
            };
            container.appendChild(btnTous);

            tags.forEach(tag => {
                const btn = document.createElement('button');
                btn.className = `filter-tag ${activeTagFilters[filterContext] === tag ? 'active' : ''}`;
                btn.textContent = tag;
                btn.onclick = () => {
                    triggerHaptic();
                    activeTagFilters[filterContext] = tag;
                    renderTagsFilter(containerId, dataArray, filterContext);
                    if(filterContext === 'modalAdd') handleModalSearch(); else handleSearch();
                };
                container.appendChild(btn);
            });
        }

        // --- Séance rapide (On the fly) ---
        let selectedQuickExercices = new Set();
        let webSuggestions = [];
        let searchTimeout = null;

        function openQuickWorkoutSetup() {
            selectedQuickExercices = new Set();
            webSuggestions = [];
            document.getElementById('web-suggestions-container').style.display = 'none';
            document.getElementById('web-exercices-grid').innerHTML = '';
            switchTab('quick-workout');
        }

        function toggleQuickExercice(exId) {
            triggerHaptic();
            if (selectedQuickExercices.has(exId)) {
                selectedQuickExercices.delete(exId);
            } else {
                selectedQuickExercices.add(exId);
            }
            updateQuickWorkoutUI();
        }

        function updateQuickWorkoutUI() {
            const btn = document.getElementById('btn-start-quick');
            const btnSet = document.getElementById('btn-settings-quick');
            const countSpan = document.getElementById('quick-count');
            countSpan.textContent = selectedQuickExercices.size;

            if (selectedQuickExercices.size > 0) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btnSet.disabled = false;
                btnSet.style.opacity = '1';
            } else {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btnSet.disabled = true;
                btnSet.style.opacity = '0.5';
            }

            // Update card styling
            document.querySelectorAll('.quick-ex-card').forEach(card => {
                const exId = card.dataset.id;
                if (selectedQuickExercices.has(exId)) {
                    card.style.borderColor = 'var(--accent-color)';
                    card.style.boxShadow = '0 0 10px var(--accent-dark)';
                    card.querySelector('.check-circle').style.backgroundColor = 'var(--accent-color)';
                    card.querySelector('.check-circle').innerHTML = '✓';
                } else {
                    card.style.borderColor = 'var(--border-color)';
                    card.style.boxShadow = 'none';
                    card.querySelector('.check-circle').style.backgroundColor = 'transparent';
                    card.querySelector('.check-circle').innerHTML = '';
                }
            });
        }

        function renderQuickWorkoutExercices(exercicesToRender) {
            const grid = document.getElementById('quick-exercices-grid');
            grid.innerHTML = '';

            exercicesToRender.forEach(ex => {
                const imgUrl = getExImage(ex);
                const isSelected = selectedQuickExercices.has(ex.id);

                const card = document.createElement('div');
                card.className = 'card quick-ex-card';
                card.dataset.id = ex.id;
                card.style.flexDirection = 'row';
                card.style.alignItems = 'center';
                card.style.padding = '10px';
                card.style.gap = '15px';
                if (isSelected) {
                    card.style.borderColor = 'var(--accent-color)';
                    card.style.boxShadow = '0 0 10px var(--accent-dark)';
                }

                card.onclick = () => toggleQuickExercice(ex.id);

                const checkBg = isSelected ? 'var(--accent-color)' : 'transparent';
                const checkTxt = isSelected ? '✓' : '';

                let titleTags = ex.equipement ? ` <span class="tag" style="background:rgba(255,255,255,0.1); font-size:0.6rem;">🏋️ ${ex.equipement}</span>` : '';
                card.innerHTML = `
                    <div class="check-circle" style="width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--accent-color); background-color: ${checkBg}; display: flex; align-items: center; justify-content: center; color: black; font-weight: bold; flex-shrink: 0;">${checkTxt}</div>
                    <img src="${imgUrl}" alt="${ex.nom}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; flex-shrink: 0;" loading="lazy">
                    <div style="flex-grow: 1; overflow: hidden;">
                        <div class="card-title" style="margin-bottom: 2px; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ex.nom}${titleTags}</div>
                        <div style="color: var(--text-secondary); font-size: 0.8rem;">${ex.series || 3}x${ex.valeur || 10}${ex.unilateral ? ' par côté' : ''} | ${ex.repos || 60}s</div>
                    </div>
                `;
                grid.appendChild(card);
            });
            updateQuickWorkoutUI();
        }

        function toggleWebExercice(exId) {
            // Find in webSuggestions
            const ex = webSuggestions.find(w => w.id === exId);
            if (!ex) return;

            // Save to local DB if not exists
            if (!db.exercices.some(e => String(e.id) === String(ex.id))) {
                db.exercices.push(ex);
                localStorage.setItem('fitness_data', JSON.stringify(db));
            }

            // Now it acts like a normal quick exercice
            toggleQuickExercice(ex.id);

            handleSearch();

            renderWebSuggestions(webSuggestions); // Re-render to update checkmark
        }

        let quickWorkoutDefaults = { series: 3, reps: 10, repos: 60 };

        function openQuickWorkoutSettings() {
            triggerHaptic();
            document.getElementById('quick-set-series').value = quickWorkoutDefaults.series;
            document.getElementById('quick-set-reps').value = quickWorkoutDefaults.reps;
            document.getElementById('quick-set-repos').value = quickWorkoutDefaults.repos;
            document.getElementById('modal-quick-settings').classList.add('active');
        }

        function closeQuickWorkoutSettings(event) {
            if (event && event.target !== document.getElementById('modal-quick-settings') && event.target.className !== 'close-btn') {
                return;
            }
            triggerHaptic();
            document.getElementById('modal-quick-settings').classList.remove('active');
        }

        function saveQuickWorkoutSettings() {
            triggerHaptic();
            quickWorkoutDefaults.series = parseInt(document.getElementById('quick-set-series').value) || 3;
            quickWorkoutDefaults.reps = parseInt(document.getElementById('quick-set-reps').value) || 10;
            quickWorkoutDefaults.repos = parseInt(document.getElementById('quick-set-repos').value) || 60;

            // Appliquer aux exercices locaux (uniquement les exercices de base/web qui n'ont pas encore été modifiés)
            // On le fait dans l'objet global pour que ça s'affiche bien
            db.exercices.forEach(ex => {
                if (selectedQuickExercices.has(ex.id)) {
                    ex.series = quickWorkoutDefaults.series;
                    if (ex.type === 'reps' || !ex.type) {
                        ex.valeur = quickWorkoutDefaults.reps;
                        ex.type = 'reps';
                    }
                    ex.repos = quickWorkoutDefaults.repos;
                }
            });
            localStorage.setItem('fitness_data', JSON.stringify(db));

            handleSearch();

            closeQuickWorkoutSettings();
            showSuccess("Paramètres appliqués aux exercices sélectionnés.");
        }

        function startQuickWorkout() {
            triggerHaptic();
            if (selectedQuickExercices.size === 0) return;

            // Create a fake plan object
            const quickPlan = {
                id: 'quick_' + Date.now(),
                nom: 'Séance Rapide',
                description: 'Entraînement à la volée',
                exercices_ids: [...selectedQuickExercices]
            };

            startWorkout(quickPlan);
        }

        // --- Fetch Web API Suggestions ---
        async function searchWebAPI(query) {
            if (!query || query.trim().length < 3) {
                document.getElementById('web-suggestions-container').style.display = 'none';
                return;
            }
            if (!navigator.onLine) {
                document.getElementById('web-suggestions-container').style.display = 'none';
                return;
            }

            document.getElementById('web-suggestions-container').style.display = 'block';
            document.getElementById('web-loading').style.display = 'block';
            document.getElementById('web-exercices-grid').innerHTML = '';
            webSuggestions = [];

            try {
                // Search WGER search endpoint (works well for english and general terms, returns images)
                const res = await fetch(`https://wger.de/api/v2/exercise/search/?term=${encodeURIComponent(query)}`);
                const data = await res.json();

                if (data.suggestions && data.suggestions.length > 0) {
                    webSuggestions = data.suggestions.slice(0, 6).map(s => {
                        const baseData = s.data;
                        return {
                            id: 'web_' + baseData.id,
                            nom: baseData.name || "Exercice Inconnu",
                            tags: baseData.category || "Web",
                            importance: "Moyenne",
                            series: 3,
                            valeur: 10,
                            type: "reps",
                            repos: 60,
                            tagsArray: (baseData.category || "Web").split(',').map(t => t.trim()).filter(t => t !== ''),
                            description: "Suggestion importée depuis wger.de",
                            video: baseData.name || "",
                            image: baseData.image ? "https://wger.de" + baseData.image : "",
                            frequence: 0,
                            equipement: "",
                            unilateral: false,
                            kegel_on: 5,
                            kegel_off: 5
                        };
                    });
                }

                document.getElementById('web-loading').style.display = 'none';

                if (webSuggestions.length > 0) {
                    renderWebSuggestions(webSuggestions);
                } else {
                    document.getElementById('web-exercices-grid').innerHTML = '<div style="color:var(--text-secondary); font-size:0.9rem;">Aucune suggestion trouvée en ligne.</div>';
                }

            } catch (err) {
                console.error("Erreur API WGER:", err);
                document.getElementById('web-loading').style.display = 'none';
                document.getElementById('web-exercices-grid').innerHTML = '<div style="color:var(--text-secondary); font-size:0.9rem;">Erreur de connexion à l\'API.</div>';
            }
        }

        function renderWebSuggestions(suggestions) {
            const grid = document.getElementById('web-exercices-grid');
            grid.innerHTML = '';

            const localIds = new Set(db.exercices.map(e => String(e.id)));

            suggestions.forEach(ex => {
                // Skip if already in local db to avoid duplicates
                if (localIds.has(String(ex.id))) return;

                const imgUrl = getExImage(ex);
                const isSelected = selectedQuickExercices.has(ex.id);

                const card = document.createElement('div');
                card.className = 'card quick-ex-card';
                card.dataset.id = ex.id;
                card.style.flexDirection = 'row';
                card.style.alignItems = 'center';
                card.style.padding = '10px';
                card.style.gap = '15px';
                if (isSelected) {
                    card.style.borderColor = 'var(--accent-color)';
                    card.style.boxShadow = '0 0 10px var(--accent-dark)';
                }

                card.onclick = () => toggleWebExercice(ex.id);

                const checkBg = isSelected ? 'var(--accent-color)' : 'transparent';
                const checkTxt = isSelected ? '✓' : '';

                card.innerHTML = `
                    <div class="check-circle" style="width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--accent-color); background-color: ${checkBg}; display: flex; align-items: center; justify-content: center; color: black; font-weight: bold; flex-shrink: 0;">${checkTxt}</div>
                    <img src="${imgUrl}" alt="${ex.nom}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; flex-shrink: 0;" loading="lazy">
                    <div style="flex-grow: 1; overflow: hidden;">
                        <div class="card-title" style="margin-bottom: 2px; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ex.nom} <span class="tag" style="background:rgba(88, 166, 255, 0.2); color:#58a6ff; font-size:0.6rem;">🌐 WEB</span></div>
                        <div style="color: var(--text-secondary); font-size: 0.8rem;">${ex.series}x${ex.valeur} | ${ex.repos}s</div>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        // Render Plans (Programmes)
        function renderPlans(plansToRender) {
            const grid = document.getElementById('plans-grid');
            grid.innerHTML = '';

            if (plansToRender.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; background: var(--surface-color); border-radius: var(--card-radius); border: 1px dashed var(--border-color);">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                        <h3 style="color: white; margin-bottom: 1rem; font-size: 1.5rem;">Aucun programme trouvé</h3>
                        <p style="color: var(--text-secondary); margin-bottom: 2rem;">Vous n'avez pas encore synchronisé vos données ou la recherche n'a donné aucun résultat.</p>
                        <button onclick="switchTab('settings')" class="btn-action" style="max-width: 250px;">ALLER AUX PARAMÈTRES</button>
                    </div>
                `;
                return;
            }

            // Retrieve completion history
            let history = {};
            try {
                history = JSON.parse(localStorage.getItem('fitness_history') || '{}');
            } catch (e) {
                console.error("Erreur lors de la lecture de l'historique:", e);
            }

            plansToRender.forEach(plan => {
                const exCount = plan.exercices_ids ? plan.exercices_ids.length : 0;
                const completedCount = history[plan.id] || 0;
                const badge = completedCount > 0 ? `<div style="position: absolute; top: -10px; right: -10px; background: var(--accent-color); color: #000; font-weight: bold; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; box-shadow: 0 4px 10px rgba(0,0,0,0.5); z-index: 2;">${completedCount}</div>` : '';

                const card = document.createElement('div');
                card.className = 'card';
                card.style.position = 'relative';
                card.tabIndex = 0;
                card.onclick = () => openPlanDetails(plan);
                card.onkeydown = (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openPlanDetails(plan);
                    }
                };
                card.innerHTML = `
                    ${badge}
                    <div class="card-content">
                        <div class="card-title">${plan.nom}</div>
                        <div class="card-meta">
                            <span class="tag" style="background: var(--accent-dark); color: var(--accent-color);">${plan.goal}x / sem</span>
                            <span class="tag" style="background: rgba(88, 166, 255, 0.15); color: #58a6ff;">${exCount} exos</span>
                        </div>
                        <div class="card-desc">${plan.description}</div>
                        <div class="card-footer" style="color: var(--accent-color); font-weight: 600;">
                            <span>VOIR LA SÉANCE →</span>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        // Render Exercices
        function renderExercices(exercicesToRender) {
            const grid = document.getElementById('exercices-grid');
            grid.innerHTML = '';

            if (exercicesToRender.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; background: var(--surface-color); border-radius: var(--card-radius); border: 1px dashed var(--border-color);">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">🏋️</div>
                        <h3 style="color: white; margin-bottom: 1rem; font-size: 1.5rem;">Aucun exercice trouvé</h3>
                        <p style="color: var(--text-secondary); margin-bottom: 2rem;">Vous n'avez pas encore synchronisé vos données ou la recherche n'a donné aucun résultat.</p>
                        <button onclick="switchTab('settings')" class="btn-action" style="max-width: 250px;">ALLER AUX PARAMÈTRES</button>
                    </div>
                `;
                return;
            }

            exercicesToRender.forEach(ex => {
                const tags = ex.tagsArray || (ex.tags || '').split(',').map(t => t.trim()).filter(t => t !== '');
                let tagsHTML = tags.map(t => `<span class="tag">${t}</span>`).join('');
                if (ex.equipement) {
                    tagsHTML += `<span class="tag">🏋️ ${ex.equipement}</span>`;
                }
                let importanceTag = '';
                if (ex.importance) {
                    let color = ex.importance.includes('Haute') ? '#ff3333' : (ex.importance.includes('Moyenne') ? '#ffb300' : '#58a6ff');
                    let bg = ex.importance.includes('Haute') ? 'rgba(255,51,51,0.15)' : (ex.importance.includes('Moyenne') ? 'rgba(255,179,0,0.15)' : 'rgba(88,166,255,0.15)');
                    importanceTag = `<span class="tag" style="color:${color}; background:${bg}; border: 1px solid ${color};">${ex.importance}</span>`;
                }

                let freqTag = ex.frequence ? `<span class="tag" style="background: rgba(255, 255, 255, 0.1); color: var(--text-primary);"><svg style="width:12px; height:12px; margin-right:4px; vertical-align:middle;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>${ex.frequence}x / sem</span>` : '';

                const imgUrl = getExImage(ex);

                const card = document.createElement('div');
                card.className = 'card';
                card.tabIndex = 0;
                card.onclick = () => openExerciceDetails(ex); // Changed to be clickable
                card.onkeydown = (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openExerciceDetails(ex);
                    }
                };
                card.innerHTML = `
                    <div class="card-image-container">
                        <img src="${imgUrl}" alt="${ex.nom}" class="card-image" loading="lazy">
                    </div>
                    <div class="card-content">
                        <div class="card-title">${ex.nom}</div>
                        <div class="card-meta" style="gap: 5px;">${importanceTag} ${freqTag} ${tagsHTML}</div>
                        <div class="card-desc" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${ex.description}</div>
                        <div class="card-footer">
                            <span>${ex.series} x ${ex.valeur} ${ex.type}${ex.unilateral ? ' par côté' : ''}</span>
                            <span>⏱ ${ex.repos}s</span>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        // Settings / Sync Logic
        async function syncData() {
            triggerHaptic();
            const urlInput = document.getElementById('api-url');
            const url = urlInput.value.trim();

            if (!url) {
                showError("Veuillez entrer une URL valide.");
                urlInput.classList.add('input-error');
                setTimeout(() => urlInput.classList.remove('input-error'), 500);
                urlInput.focus();
                return;
            }

            showLoader();
            hideError();
            hideSuccess();

            const syncBtn = document.getElementById('btn-sync');
            const originalBtnText = syncBtn.innerHTML;
            syncBtn.innerHTML = '⏳ Chargement...';
            syncBtn.disabled = true;
            syncBtn.style.opacity = '0.7';

            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error("Erreur réseau");

                const rawData = await response.json();

                // Allow "exercices" or "exercises"
                const exData = rawData.exercices || rawData.exercises;

                if (!exData || !rawData.plans) {
                    throw new Error("Format de données invalide reçu de l'API.");
                }

                // Format the API data to match the app's internal structure
                const formattedExercices = exData.map(ex => {
                    let type = ex.type || "";
                    const nomLower = (ex.n || "").toLowerCase();

                    // Auto-correction du type pour les exercices isométriques si manquant ou erroné
                    if ((!type || type === 'reps') && (nomLower.includes('planche') || nomLower.includes('plank') || nomLower.includes('gainage') || nomLower.includes('isométrie') || nomLower.includes('isometrique') || nomLower.includes('chaise') || nomLower.includes('l-sit'))) {
                        type = 'secs';
                    }

                    return {
                        id: String(ex.id),
                        nom: ex.n || "",
                        tags: ex.t || "",
                        importance: ex.imp || "",
                        series: ex.sets || 0,
                        valeur: ex.val || 0,
                        type: type,
                        repos: ex.rest || 0,
                        description: ex.d || "",
                        video: ex.v || "",
                        image: ex.image || ex.img || ex.url_image || "",
                        frequence: ex.frequence || 0,
                        equipement: ex.eq || ex.equipement || "",
                        unilateral: ex.uni || ex.unilateral ? true : false,
                        kegel_on: ex.kegel_on || 5,
                        kegel_off: ex.kegel_off || 5,
                        tagsArray: (ex.t || "").split(',').map(t => t.trim()).filter(t => t !== '')
                    };
                });

                const formattedPlans = rawData.plans.map(p => ({
                    id: String(p.id),
                    nom: p.nom || "",
                    description: p.description || "",
                    goal: p.goal || 0,
                    exercices_ids: (p.exercices_ids || []).map(String)
                }));

                db = {
                    exercices: formattedExercices,
                    plans: formattedPlans
                };

                // Save to localStorage
                localStorage.setItem('fitness_data', JSON.stringify(db));
                localStorage.setItem('sync_url', url);
                localStorage.setItem('last_sync', Date.now().toString());

                // Update UI
                renderPlans(db.plans);
                renderExercices(db.exercices);
                updateStatusUI();
                showSuccess("✅ Synchronisation réussie ! Les données sont sauvegardées hors-ligne.");

            } catch (err) {
                console.error(err);
                showError("Échec de la synchronisation. Vérifiez l'URL et votre connexion internet.");
            } finally {
                hideLoader();
                syncBtn.innerHTML = originalBtnText;
                syncBtn.disabled = false;
                syncBtn.style.opacity = '1';
            }
        }

        function clearData() {
            triggerHaptic();
            if (confirm("Voulez-vous vraiment effacer toutes les données sauvegardées sur cet appareil ?")) {
                localStorage.removeItem('fitness_data');
                localStorage.removeItem('last_sync');
                db = { exercices: [], plans: [] };
                renderPlans([]);
                renderExercices([]);
                updateStatusUI();
                showSuccess("Données locales effacées avec succès.");
            }
        }

        // Search & Filter logic
        function clearSearch() {
            triggerHaptic();
            const searchInput = document.getElementById('search-input');
            searchInput.value = '';
            searchInput.focus();
            handleSearch();
        }

        function handleSearch() {
            const inputEl = document.getElementById('search-input');
            const query = inputEl.value.toLowerCase();
            const clearBtn = document.getElementById('clear-search-btn');

            if (query.length > 0) {
                clearBtn.classList.add('visible');
            } else {
                clearBtn.classList.remove('visible');
            }

            if (currentTab === 'plans') {
                const filtered = db.plans.filter(p =>
                    p.nom.toLowerCase().includes(query) ||
                    p.description.toLowerCase().includes(query)
                );
                renderPlans(filtered);
            } else if (currentTab === 'exercices') {
                const activeTag = activeTagFilters['exercices'];
                const filtered = db.exercices.filter(e => {
                    const matchesQuery = (e.nom && e.nom.toLowerCase().includes(query)) ||
                                         (e.description && e.description.toLowerCase().includes(query)) ||
                                         (e.tags && e.tags.toLowerCase().includes(query));
                    const matchesTag = activeTag ? (e.tagsArray && e.tagsArray.includes(activeTag)) : true;
                    return matchesQuery && matchesTag;
                });
                renderExercices(filtered);
            } else if (currentTab === 'quick-workout') {
                const activeTag = activeTagFilters['quick'];
                const filtered = db.exercices.filter(e => {
                    const matchesQuery = (e.nom && e.nom.toLowerCase().includes(query)) ||
                                         (e.description && e.description.toLowerCase().includes(query)) ||
                                         (e.tags && e.tags.toLowerCase().includes(query));
                    const matchesTag = activeTag ? (e.tagsArray && e.tagsArray.includes(activeTag)) : true;
                    return matchesQuery && matchesTag;
                });
                renderQuickWorkoutExercices(filtered);

                // Trigger web search with debounce
                clearTimeout(searchTimeout);
                if (query.trim().length >= 3) {
                    searchTimeout = setTimeout(() => {
                        searchWebAPI(query);
                    }, 800);
                } else {
                    document.getElementById('web-suggestions-container').style.display = 'none';
                    webSuggestions = [];
                }
            }
        }


        // Current Plan global variable for calendar export and temp edit
        let currentViewedPlan = null;
        let currentViewedPlanExercises = [];

        // Modal Logic
        function openPlanDetails(plan) {
            triggerHaptic();
            currentViewedPlan = plan;

            const exercisesMap = new Map(db.exercices.map(ex => [String(ex.id), ex]));

            // Create a deep clone of the exercises for this specific session preview/edit
            currentViewedPlanExercises = (plan.exercices_ids || []).map(id => {
                const e = exercisesMap.get(String(id));
                return e ? structuredClone(e) : null;
            }).filter(e => e);

            document.getElementById('modal-title').textContent = plan.nom;
            document.getElementById('modal-meta').innerHTML = `<span class="tag">${plan.goal}x / semaine</span>`;
            document.getElementById('modal-desc').textContent = plan.description;

            // Setup "Démarrer" button
            document.getElementById('btn-start-workout').onclick = () => {
                // Créer un "plan" temporaire contenant uniquement les IDs des exercices clonés modifiés.
                // startWorkout va relire db.exercices. Pour injecter nos modifs, nous appelons startWorkout différemment.
                startWorkout(plan, currentViewedPlanExercises);
            };

            renderPlanExercisesList();

            document.getElementById('modal').classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }

        function removeTempExercice(index) {
            triggerHaptic();
            currentViewedPlanExercises.splice(index, 1);
            renderPlanExercisesList();
        }

        function moveTempExercice(index, direction) {
            triggerHaptic();
            if (direction === -1 && index > 0) {
                // Move up
                const temp = currentViewedPlanExercises[index];
                currentViewedPlanExercises[index] = currentViewedPlanExercises[index - 1];
                currentViewedPlanExercises[index - 1] = temp;
                renderPlanExercisesList();
            } else if (direction === 1 && index < currentViewedPlanExercises.length - 1) {
                // Move down
                const temp = currentViewedPlanExercises[index];
                currentViewedPlanExercises[index] = currentViewedPlanExercises[index + 1];
                currentViewedPlanExercises[index + 1] = temp;
                renderPlanExercisesList();
            }
        }

        function openEditTempEx(index) {
            triggerHaptic();
            const ex = currentViewedPlanExercises[index];

            // Re-use the modal-edit-ex, but store the index we are editing
            document.getElementById('modal-edit-ex').dataset.editingTempIndex = index;
            document.getElementById('modal-edit-ex').dataset.mode = "temp";

            document.getElementById('edit-ex-series').value = ex.series;

            let type = 'reps';
            if (ex.type === 'secs') type = 'secs';
            if (ex.type === 'kegel') type = 'kegel';
            if (ex.type === 'poids') type = 'poids';
            if (ex.type === 'distance') type = 'distance';
            document.getElementById('edit-ex-type').value = type;

            document.getElementById('edit-ex-valeur').value = ex.valeur;
            if (document.getElementById('edit-ex-poids')) document.getElementById('edit-ex-poids').value = ex.poids || 0;
            document.getElementById('edit-ex-kegel-on').value = ex.kegel_on || 5;
            document.getElementById('edit-ex-kegel-off').value = ex.kegel_off || 5;
            document.getElementById('edit-ex-repos').value = ex.repos;

            updateEditExUI();
            document.getElementById('modal-edit-ex').classList.add('active');
        }

        function saveTempPlan() {
            triggerHaptic();
            if (currentViewedPlanExercises.length === 0) {
                alert("Impossible de sauvegarder un programme vide.");
                return;
            }

            const newPlanName = prompt("Entrez le nom de ce nouveau programme :", currentViewedPlan ? currentViewedPlan.nom + " (Modifié)" : "Nouveau Programme");
            if (!newPlanName) return;

            const newPlanIds = [];
            const exercisesMap = new Map(db.exercices.map(ex => [String(ex.id), ex]));

            // Pour chaque exercice, on regarde s'il a été modifié par rapport à la base
            currentViewedPlanExercises.forEach(ex => {
                const originalEx = exercisesMap.get(String(ex.id));
                let isModified = false;

                if (!originalEx) {
                    isModified = true; // C'est un exercice web ou inconnu qui a pu être ajouté
                } else {
                    if (ex.series !== originalEx.series ||
                        ex.valeur !== originalEx.valeur ||
                        ex.repos !== originalEx.repos ||
                        ex.poids !== originalEx.poids ||
                        ex.kegel_on !== originalEx.kegel_on ||
                        ex.kegel_off !== originalEx.kegel_off ||
                        ex.type !== originalEx.type) {
                        isModified = true;
                    }
                }

                if (isModified) {
                    // Créer une nouvelle variante dans db.exercices
                    const newExId = "custom_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
                    const newEx = structuredClone(ex);
                    newEx.id = newExId;

                    // Indiquer que c'est une variante dans le nom
                    if (!newEx.nom.includes("(Variante)")) {
                        newEx.nom = newEx.nom + " (Variante)";
                    }

                    db.exercices.push(newEx);
                    newPlanIds.push(newExId);
                } else {
                    // Réutiliser l'ID original
                    newPlanIds.push(ex.id);
                }
            });

            const newPlan = {
                id: "plan_" + Date.now(),
                nom: newPlanName,
                description: currentViewedPlan ? currentViewedPlan.description : "Programme personnalisé.",
                goal: currentViewedPlan ? currentViewedPlan.goal : 3,
                exercices_ids: newPlanIds
            };

            db.plans.push(newPlan);
            localStorage.setItem('fitness_data', JSON.stringify(db));

            // Rafraîchir l'interface
            handleSearch();

            closeModal(null);
            showSuccess("Programme sauvegardé avec succès !");
        }

        function renderPlanExercisesList() {
            const list = document.getElementById('modal-ex-list');
            list.innerHTML = '';

            currentViewedPlanExercises.forEach((ex, index) => {
                const imgUrl = getExImage(ex);
                const li = document.createElement('li');
                li.className = 'ex-item';
                li.style.display = 'flex';
                li.style.gap = '15px';
                li.style.position = 'relative';

                const strategy = WorkoutStrategies[ex.type] || WorkoutStrategies['reps'];
                let targetText = strategy.getTargetText(ex);
                // Fallback for custom logic (e.g. reps with weight)
                if ((ex.type === 'reps' || !ex.type) && ex.poids && ex.poids > 0) {
                    targetText = targetText.replace(" reps", ` reps @ ${ex.poids}kg`);
                }

                let eqTag = ex.equipement ? `<span class="tag" style="background: rgba(255, 255, 255, 0.1); cursor: default;">🏋️ ${ex.equipement}</span>` : '';

                let upBtn = index > 0 ? `<button onclick="moveTempExercice(${index}, -1)" style="position: absolute; top: 10px; right: 30px; background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; font-weight: bold; cursor: pointer;">↑</button>` : '';
                let downBtn = index < currentViewedPlanExercises.length - 1 ? `<button onclick="moveTempExercice(${index}, 1)" style="position: absolute; top: 40px; right: 30px; background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; font-weight: bold; cursor: pointer;">↓</button>` : '';

                li.innerHTML = `
                    <button onclick="removeTempExercice(${index})" style="position: absolute; top: -10px; right: -10px; background: #ff3333; color: white; border: none; border-radius: 50%; width: 28px; height: 28px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.5); z-index: 2;">✕</button>
                    ${upBtn}
                    ${downBtn}
                    <img src="${imgUrl}" alt="${ex.nom}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; flex-shrink: 0;" loading="lazy">
                    <div style="flex-grow: 1;">
                        <h4>${index + 1}. ${ex.nom}</h4>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
                            <span class="tag" style="background: rgba(255, 255, 255, 0.1); cursor: pointer;" onclick="openEditTempEx(${index})">⚙️ ${targetText}</span>
                            <span class="tag" style="background: rgba(255, 255, 255, 0.1); cursor: pointer;" onclick="openEditTempEx(${index})">⏱ ${ex.repos}s</span>
                            ${eqTag}
                        </div>
                        <p style="font-size: 0.95rem; color: var(--text-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${ex.description}</p>
                    </div>
                `;
                list.appendChild(li);
            });

            // Add "+ Ajouter un exercice" button at the end
            const addBtnLi = document.createElement('li');
            addBtnLi.style.listStyle = 'none';
            addBtnLi.innerHTML = `<button class="btn-action" style="background: transparent; border: 2px dashed var(--border-color); color: var(--accent-color); width: 100%; box-shadow: none;" onclick="openAddExModal()">+ AJOUTER UN EXERCICE</button>`;
            list.appendChild(addBtnLi);
        }


        function openExerciceDetails(ex) {
            triggerHaptic();
            document.getElementById('modal-ex-title').textContent = ex.nom;

            const tags = ex.tagsArray || (ex.tags || '').split(',').map(t => t.trim()).filter(t => t !== '');
            let tagsHTML = tags.map(t => `<span class="tag">${t}</span>`).join('');
            if (ex.equipement) {
                tagsHTML += `<span class="tag">🏋️ ${ex.equipement}</span>`;
            }
            document.getElementById('modal-ex-meta').innerHTML = tagsHTML;

            const imgUrl = getExImage(ex);
            const imgContainer = document.getElementById('modal-ex-img-container');
            if (imgContainer) {
                imgContainer.innerHTML = `<img src="${imgUrl}" alt="${ex.nom}" style="width: 100%; height: 250px; object-fit: cover; border-radius: 12px; margin-bottom: 1.5rem;" loading="lazy">`;
            }

            document.getElementById('modal-ex-series').textContent = `${ex.series} × ${ex.valeur} ${ex.type}${ex.unilateral ? ' par côté' : ''}`;
            document.getElementById('modal-ex-repos').textContent = `${ex.repos}s`;
            document.getElementById('modal-ex-desc').textContent = ex.description;

            const videoBtn = document.getElementById('modal-ex-video');
            if (ex.video) {
                videoBtn.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.video)}`;
                videoBtn.style.display = 'inline-flex';
            } else {
                videoBtn.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.nom)}`;
                videoBtn.style.display = 'inline-flex';
            }

            document.getElementById('modal-ex').classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        // ==========================================
        // MOTEUR DE SÉANCE D'ENTRAÎNEMENT (WORKOUT)
        // ==========================================

        let activeWorkoutTimerInterval = null;
        let isWorkoutTimerPaused = false;
        let isRestTimerPaused = false;

        // Mode Reps Manuelles
        let isInteractiveRepsModeActive = false;
        let currentInteractiveRepsCount = 0;

        function startWorkout(plan, preClonedExercises = null) {
            triggerHaptic();

            let exos;
            if (preClonedExercises) {
                // If we already have a modified clone array from the pre-session modal
                exos = structuredClone(preClonedExercises);
            } else {
                if (!plan.exercices_ids || plan.exercices_ids.length === 0) {
                    alert("Ce programme ne contient aucun exercice.");
                    return;
                }

                const exercisesMap = new Map(db.exercices.map(ex => [String(ex.id), ex]));

                // Récupérer et cloner les objets exercices pour permettre la modif à la volée
                exos = plan.exercices_ids.map(id => {
                    const e = exercisesMap.get(String(id));
                    // Utilisation de structuredClone pour une copie profonde plus efficace et sécurisée
                    return e ? structuredClone(e) : null;
                }).filter(e => e);
            }

            if (!exos || exos.length === 0) {
                alert("Erreur: aucun exercice valide dans ce programme.");
                return;
            }

            // Initialiser l'état
            currentWorkout = {
                planId: plan.id,
                exercices: exos,
                currentExIndex: 0,
                currentSet: 0, // 0 means haven't done set 1 yet
                isResting: false,
                restInterval: null
            };

            // Cacher modale et afficher l'écran plein écran
            document.getElementById('modal').classList.remove('active');
            document.getElementById('workout-screen').style.display = 'flex';
            document.body.style.overflow = 'hidden';

            renderWorkoutStep();
        }

        function renderWorkoutStep() {
            // Nettoyage des timers actifs si existants
            if (activeWorkoutTimerInterval) {
                clearInterval(activeWorkoutTimerInterval);
                activeWorkoutTimerInterval = null;
            }

            const ex = currentWorkout.exercices[currentWorkout.currentExIndex];

            // Auto-correction : si c'est une planche mais que le type a été mal importé
            const nomExLower = ex.nom ? ex.nom.toLowerCase() : "";
            if (nomExLower.includes('planche') || nomExLower.includes('plank') || nomExLower.includes('gainage') || nomExLower.includes('isométrie') || nomExLower.includes('isometrique') || nomExLower.includes('chaise') || nomExLower.includes('l-sit')) {
                if (ex.type !== 'secs' && ex.type !== 'kegel') {
                    ex.type = 'secs';
                }
            }

            // Mise à jour de la barre de progression
            document.getElementById('workout-progress').textContent = `${currentWorkout.currentExIndex + 1} / ${currentWorkout.exercices.length}`;

            // Si on se repose
            if (currentWorkout.isResting) {
                document.getElementById('workout-ex-view').style.display = 'none';
                document.getElementById('workout-rest-view').style.display = 'flex';
                document.getElementById('workout-end-view').style.display = 'none';

                document.getElementById('btn-next-step').style.display = 'none';
                document.getElementById('workout-controls-secondary').style.display = 'none';
                document.getElementById('btn-skip-rest').style.display = 'flex';

                // Info sur le prochain exercice
                const nextExName = (currentWorkout.currentSet >= ex.series && currentWorkout.currentExIndex + 1 < currentWorkout.exercices.length)
                    ? currentWorkout.exercices[currentWorkout.currentExIndex + 1].nom
                    : `${ex.nom} (Série ${currentWorkout.currentSet + 1}/${ex.series})`;

                document.getElementById('workout-next-ex').textContent = nextExName;

                startRestTimer(ex.repos);
            } else {
                // Si on s'entraîne
                document.getElementById('workout-ex-view').style.display = 'flex';
                document.getElementById('workout-rest-view').style.display = 'none';
                document.getElementById('workout-end-view').style.display = 'none';

                document.getElementById('btn-next-step').style.display = 'flex';
                document.getElementById('workout-controls-secondary').style.display = 'flex';
                document.getElementById('btn-skip-rest').style.display = 'none';
                checkAndShowSmartSurcharge(ex);

                document.getElementById('btn-next-step').textContent = 'VALIDER LA SÉRIE';

                // Remplir les infos de l'exercice
                document.getElementById('workout-ex-title').textContent = ex.nom;

                // Formater l'objectif selon le type
                const strategy = WorkoutStrategies[ex.type] || WorkoutStrategies['reps'];
                let targetText = strategy.getTargetText(ex);
                // Fallback for custom logic (e.g. reps with weight)
                if ((ex.type === 'reps' || !ex.type) && ex.poids && ex.poids > 0) {
                    targetText = targetText.replace(" reps", ` reps @ ${ex.poids}kg`);
                }
                document.getElementById('workout-ex-target').textContent = targetText;

                let eqTagHtml = ex.equipement ? `<span class="tag" style="font-size: 1.1rem; padding: 8px 16px; background: rgba(255, 255, 255, 0.1); color: var(--text-primary);">🏋️ ${ex.equipement}</span>` : '';
                document.getElementById('workout-ex-meta').innerHTML = `
                    <span class="tag" id="workout-ex-target" style="font-size: 1.1rem; padding: 8px 16px; background: var(--accent-dark); color: var(--accent-color);">${targetText}</span>
                    ${eqTagHtml}
                    <button class="btn-timer" onclick="openEditCurrentEx()" style="margin: 0; padding: 8px 16px; font-size: 0.9rem;">✏️ Modifier</button>
                `;

                document.getElementById('workout-ex-desc').textContent = ex.description;

                const imgUrl = getExImage(ex);
                const imgContainer = document.getElementById('workout-ex-img-container');
                if (imgContainer) {
                    imgContainer.innerHTML = `<img src="${imgUrl}" alt="${ex.nom}" style="max-width: 100%; max-height: 200px; object-fit: contain; border-radius: 12px;" loading="lazy">`;
                }

                // Gestion des compteurs manuels
                const interactiveRepsSection = document.getElementById('workout-interactive-reps-section');
                const btnToggleRepsMode = document.getElementById('btn-toggle-reps-mode');
                const btnRepCounter = document.getElementById('btn-rep-counter');
                const btnNextStep = document.getElementById('btn-next-step');

                // Réinitialiser le mode à chaque changement d'étape (ou d'exercice)
                isInteractiveRepsModeActive = false;
                currentInteractiveRepsCount = 0;
                btnToggleRepsMode.innerHTML = '🔢 Activer le mode "Compter chaque rep"';
                btnToggleRepsMode.classList.remove('active-timer');
                btnRepCounter.style.display = 'none';
                btnNextStep.style.display = 'flex'; // Toujours s'assurer que le bouton valider la série est visible par défaut

                if (ex.type === 'reps' || ex.type === 'poids' || !ex.type) {
                    interactiveRepsSection.style.display = 'flex';
                    btnToggleRepsMode.style.display = 'inline-flex';
                    document.getElementById('rep-counter-display').textContent = `0 / ${ex.valeur}`;
                } else {
                    interactiveRepsSection.style.display = 'none';
                }

                // Gestion des timers spécifiques (Isométrie ou Kegel)
                const activeTimerSection = document.getElementById('workout-active-timer-section');
                const phaseEl = document.getElementById('workout-active-timer-phase');
                const btnStartTimer = document.getElementById('btn-start-active-timer');
                const btnPauseTimer = document.getElementById('btn-pause-active-timer');

                if (strategy && strategy.setupActiveTimer) {
                    strategy.setupActiveTimer(ex, activeTimerSection, phaseEl, btnStartTimer, btnPauseTimer);
                } else {
                    activeTimerSection.style.display = 'none';
                }

                // Générer les bulles de séries
                const setsContainer = document.getElementById('workout-sets-container');
                setsContainer.innerHTML = '';
                for (let i = 0; i < ex.series; i++) {
                    const bubble = document.createElement('div');
                    const isCompleted = i < currentWorkout.currentSet;

                    bubble.style.width = '40px';
                    bubble.style.height = '40px';
                    bubble.style.borderRadius = '50%';
                    bubble.style.display = 'flex';
                    bubble.style.alignItems = 'center';
                    bubble.style.justifyContent = 'center';
                    bubble.style.fontWeight = 'bold';
                    bubble.style.fontSize = '1.2rem';
                    bubble.style.transition = 'all 0.3s';

                    if (isCompleted) {
                        bubble.style.backgroundColor = 'var(--accent-color)';
                        bubble.style.color = '#000';
                        bubble.innerHTML = '✓';
                        bubble.style.boxShadow = '0 0 10px var(--accent-dark)';
                    } else if (i === currentWorkout.currentSet) {
                        bubble.style.backgroundColor = 'transparent';
                        bubble.style.border = '2px solid var(--accent-color)';
                        bubble.style.color = 'var(--accent-color)';
                        bubble.innerHTML = i + 1;
                    } else {
                        bubble.style.backgroundColor = 'transparent';
                        bubble.style.border = '2px solid var(--border-color)';
                        bubble.style.color = 'var(--text-secondary)';
                        bubble.innerHTML = i + 1;
                    }
                    setsContainer.appendChild(bubble);
                }
            }
        }

        function nextWorkoutStep() {
            triggerHaptic();
            const ex = currentWorkout.exercices[currentWorkout.currentExIndex];

            // On vient de valider une série
            currentWorkout.currentSet++;

            // Doit-on se reposer ?
            if (ex.repos > 0) {
                // On se repose sauf si c'est la toute dernière série du tout dernier exercice
                const isLastEx = currentWorkout.currentExIndex === currentWorkout.exercices.length - 1;
                const isLastSet = currentWorkout.currentSet >= ex.series;

                if (!(isLastEx && isLastSet)) {
                    currentWorkout.isResting = true;
                    renderWorkoutStep();
                    return;
                }
            }

            // Si pas de repos, on enchaîne
            advanceAfterRest();
        }

        // Fonction pour démarrer le timer spécifique à l'exercice (isométrie ou kegel)
        function startActiveWorkoutTimer() {
            triggerHaptic();
            const ex = currentWorkout.exercices[currentWorkout.currentExIndex];
            const btn = document.getElementById('btn-start-active-timer');
            const btnPause = document.getElementById('btn-pause-active-timer');
            const timerEl = document.getElementById('workout-active-timer');
            const circleEl = document.getElementById('active-timer-circle');
            const phaseEl = document.getElementById('workout-active-timer-phase');

            btn.style.display = 'none'; // Cacher le bouton Démarrer
            btnPause.style.display = 'flex'; // Afficher le bouton Pause
            isWorkoutTimerPaused = false;

            const circumference = 691;
            circleEl.style.transition = 'none';
            circleEl.style.strokeDashoffset = '0';
            void circleEl.offsetWidth;

            if (activeWorkoutTimerInterval) clearInterval(activeWorkoutTimerInterval);

            const strategy = WorkoutStrategies[ex.type];
            if (strategy && strategy.startTimer) {
                strategy.startTimer(ex, timerEl, phaseEl, circleEl, btnPause, circumference, () => {
                    showSuccess("Temps écoulé ! Validez la série.");
                    document.getElementById('btn-next-step').style.display = 'flex';
                });
            }
        }

        function toggleRepsMode() {
            triggerHaptic();
            isInteractiveRepsModeActive = !isInteractiveRepsModeActive;
            const btnToggle = document.getElementById('btn-toggle-reps-mode');
            const btnRepCounter = document.getElementById('btn-rep-counter');
            const btnNextStep = document.getElementById('btn-next-step');
            const ex = currentWorkout.exercices[currentWorkout.currentExIndex];

            if (isInteractiveRepsModeActive) {
                btnToggle.innerHTML = '❌ Désactiver le mode "Compter"';
                btnToggle.classList.add('active-timer');

                // Show counter button, hide regular next button
                btnRepCounter.style.display = 'flex';
                btnNextStep.style.display = 'none';

                currentInteractiveRepsCount = 0;
                document.getElementById('rep-counter-display').textContent = `0 / ${ex.valeur}`;
            } else {
                btnToggle.innerHTML = '🔢 Activer le mode "Compter chaque rep"';
                btnToggle.classList.remove('active-timer');

                // Hide counter button, show regular next button
                btnRepCounter.style.display = 'none';
                btnNextStep.style.display = 'flex';
            }
        }

        function countRep() {
            triggerHaptic();
            if (!isInteractiveRepsModeActive) return;

            const ex = currentWorkout.exercices[currentWorkout.currentExIndex];
            currentInteractiveRepsCount++;

            // Play a pleasant beep for each rep
            playBeep(500 + (currentInteractiveRepsCount * 20), 0.1, 'triangle');

            document.getElementById('rep-counter-display').textContent = `${currentInteractiveRepsCount} / ${ex.valeur}`;

            // Add a little pop animation class dynamically
            const btn = document.getElementById('btn-rep-counter');
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => { btn.style.transform = ''; }, 100);

            if (currentInteractiveRepsCount >= ex.valeur) {
                // Goal reached! Play success sound and proceed
                setTimeout(() => {
                    playBeep(800, 0.4);
                    // Automatically trigger the next step
                    document.getElementById('btn-next-step').style.display = 'flex'; // show briefly
                    document.getElementById('btn-next-step').click();
                }, 300);
            }
        }

        function togglePauseActiveTimer() {
            triggerHaptic();
            isWorkoutTimerPaused = !isWorkoutTimerPaused;
            const btnPause = document.getElementById('btn-pause-active-timer');
            const phaseEl = document.getElementById('workout-active-timer-phase');
            const circleEl = document.getElementById('active-timer-circle');

            if (isWorkoutTimerPaused) {
                btnPause.innerHTML = '▶ REPRENDRE';
                btnPause.classList.add('active-timer');
                phaseEl.dataset.originalText = phaseEl.textContent;
                phaseEl.textContent = "EN PAUSE";
                circleEl.style.transition = 'none'; // Stop circle animation
            } else {
                btnPause.innerHTML = '⏸ PAUSE';
                btnPause.classList.remove('active-timer');
                if (phaseEl.dataset.originalText) {
                    phaseEl.textContent = phaseEl.dataset.originalText;
                }
                circleEl.style.transition = 'stroke-dashoffset 1s linear';
            }
        }

        function advanceAfterRest() {
            currentWorkout.isResting = false;
            if (currentWorkout.restInterval) clearInterval(currentWorkout.restInterval);

            const ex = currentWorkout.exercices[currentWorkout.currentExIndex];

            if (currentWorkout.currentSet >= ex.series) {
                // Exercice terminé, on passe au suivant
                currentWorkout.currentExIndex++;
                currentWorkout.currentSet = 0;

                if (currentWorkout.currentExIndex >= currentWorkout.exercices.length) {
                    // SÉANCE TERMINÉE
                    showWorkoutEnd();
                    return;
                }
            }
            renderWorkoutStep();
        }

        function startRestTimer(duration) {
            let timeRemaining = duration;
            const timerEl = document.getElementById('workout-rest-timer');
            const circleEl = document.getElementById('rest-timer-circle');
            const btnPause = document.getElementById('btn-pause-rest-timer');
            const circumference = 691; // 2 * pi * 110 (rayon)

            isRestTimerPaused = false;
            if (btnPause) {
                btnPause.innerHTML = '⏸ PAUSE';
                btnPause.classList.remove('active-timer');
            }

            timerEl.textContent = timeRemaining;
            circleEl.style.transition = 'none'; // Désactiver la transition pour reset instantané
            circleEl.style.strokeDashoffset = '0'; // Remettre à zéro

            if (currentWorkout.restInterval) clearInterval(currentWorkout.restInterval);

            // Forcer un reflow pour que la transition css s'applique correctement ensuite
            void circleEl.offsetWidth;
            circleEl.style.transition = 'stroke-dashoffset 1s linear';

            // Beep au début du repos (optionnel)
            playBeep(400, 0.1);
            triggerHaptic();

            currentWorkout.restInterval = setInterval(() => {
                if (isRestTimerPaused) {
                    circleEl.style.transition = 'none';
                    return;
                } else {
                    circleEl.style.transition = 'stroke-dashoffset 1s linear';
                }

                timeRemaining--;
                timerEl.textContent = timeRemaining;

                // Mise à jour de la barre circulaire
                const progress = ((duration - timeRemaining) / duration);
                const offset = circumference * progress;
                circleEl.style.strokeDashoffset = offset;

                // Beeps pour les 3 dernières secondes
                if (timeRemaining > 0 && timeRemaining <= 3) {
                    playBeep(600, 0.1);
                }

                if (timeRemaining <= 0) {
                    clearInterval(currentWorkout.restInterval);
                    // Long Beep final
                    playBeep(800, 0.5);
                    advanceAfterRest();
                }
            }, 1000);
        }

        function togglePauseRestTimer() {
            triggerHaptic();
            isRestTimerPaused = !isRestTimerPaused;
            const btnPause = document.getElementById('btn-pause-rest-timer');
            const circleEl = document.getElementById('rest-timer-circle');

            if (isRestTimerPaused) {
                btnPause.innerHTML = '▶ REPRENDRE';
                btnPause.classList.add('active-timer');
                circleEl.style.transition = 'none';
            } else {
                btnPause.innerHTML = '⏸ PAUSE';
                btnPause.classList.remove('active-timer');
                circleEl.style.transition = 'stroke-dashoffset 1s linear';
            }
        }

        function skipRest() {
            triggerHaptic();
            advanceAfterRest();
        }

        function skipCurrentExercice() {
            triggerHaptic();
            if (confirm("Voulez-vous vraiment passer cet exercice pour cette séance ?")) {
                // Clear any timers
                if (currentWorkout.restInterval) clearInterval(currentWorkout.restInterval);
                if (activeWorkoutTimerInterval) {
                    clearInterval(activeWorkoutTimerInterval);
                    activeWorkoutTimerInterval = null;
                }

                currentWorkout.currentExIndex++;
                currentWorkout.currentSet = 0;
                currentWorkout.isResting = false;

                if (currentWorkout.currentExIndex >= currentWorkout.exercices.length) {
                    showWorkoutEnd();
                } else {
                    renderWorkoutStep();
                }
            }
        }

        function delayCurrentExercice() {
            triggerHaptic();
            if (currentWorkout.currentExIndex >= currentWorkout.exercices.length - 1) {
                alert("C'est déjà le dernier exercice de la liste.");
                return;
            }

            if (confirm("Déplacer cet exercice à la fin de la séance ?")) {
                // Clear any timers
                if (currentWorkout.restInterval) clearInterval(currentWorkout.restInterval);
                if (activeWorkoutTimerInterval) {
                    clearInterval(activeWorkoutTimerInterval);
                    activeWorkoutTimerInterval = null;
                }

                const currentEx = currentWorkout.exercices.splice(currentWorkout.currentExIndex, 1)[0];
                currentWorkout.exercices.push(currentEx);

                // Index reste le même, mais ça pointe vers le nouvel exercice qui a pris la place
                currentWorkout.currentSet = 0;
                currentWorkout.isResting = false;

                renderWorkoutStep();
                showSuccess("Exercice déplacé à la fin de la séance.");
            }
        }

        function openWorkoutQueue() {
            triggerHaptic();
            renderWorkoutQueue();
            document.getElementById('modal-workout-queue').classList.add('active');
        }

        function closeWorkoutQueue(event) {
            if (event && event.target !== document.getElementById('modal-workout-queue') && event.target.className !== 'close-btn') {
                return;
            }
            triggerHaptic();
            document.getElementById('modal-workout-queue').classList.remove('active');

            // Re-render the workout step in case the immediate next exercise changed
            if (document.getElementById('workout-screen').style.display !== 'none' && !currentWorkout.isResting) {
                renderWorkoutStep();
            } else if (currentWorkout.isResting) {
                 // Update the "up next" text
                 const ex = currentWorkout.exercices[currentWorkout.currentExIndex];
                 const nextExName = (currentWorkout.currentSet >= ex.series && currentWorkout.currentExIndex + 1 < currentWorkout.exercices.length)
                    ? currentWorkout.exercices[currentWorkout.currentExIndex + 1].nom
                    : `${ex.nom} (Série ${currentWorkout.currentSet + 1}/${ex.series})`;
                 document.getElementById('workout-next-ex').textContent = nextExName;
            }
        }

        function moveWorkoutQueueItem(index, direction) {
            triggerHaptic();
            if (direction === -1 && index > currentWorkout.currentExIndex + 1) {
                // Move up
                const temp = currentWorkout.exercices[index];
                currentWorkout.exercices[index] = currentWorkout.exercices[index - 1];
                currentWorkout.exercices[index - 1] = temp;
                renderWorkoutQueue();
            } else if (direction === 1 && index < currentWorkout.exercices.length - 1 && index > currentWorkout.currentExIndex) {
                // Move down
                const temp = currentWorkout.exercices[index];
                currentWorkout.exercices[index] = currentWorkout.exercices[index + 1];
                currentWorkout.exercices[index + 1] = temp;
                renderWorkoutQueue();
            }
        }

        function renderWorkoutQueue() {
            const list = document.getElementById('modal-workout-queue-list');
            list.innerHTML = '';

            currentWorkout.exercices.forEach((ex, index) => {
                const li = document.createElement('li');
                li.className = 'ex-item';
                li.style.display = 'flex';
                li.style.gap = '15px';
                li.style.position = 'relative';
                li.style.alignItems = 'center';

                if (index < currentWorkout.currentExIndex) {
                    // Already done
                    li.style.opacity = '0.4';
                    li.innerHTML = `
                        <div style="font-weight: bold; width: 30px; text-align: center;">✓</div>
                        <div style="flex-grow: 1;">
                            <h4 style="text-decoration: line-through;">${index + 1}. ${ex.nom}</h4>
                        </div>
                    `;
                } else if (index === currentWorkout.currentExIndex) {
                    // Current
                    li.style.border = '2px solid var(--accent-color)';
                    li.style.padding = '10px';
                    li.style.borderRadius = '12px';
                    li.innerHTML = `
                        <div style="font-weight: bold; width: 30px; text-align: center; color: var(--accent-color);">▶</div>
                        <div style="flex-grow: 1;">
                            <h4 style="color: var(--accent-color);">${index + 1}. ${ex.nom} (En cours)</h4>
                            <div style="font-size: 0.8rem; color: var(--text-secondary);">${ex.series} x ${ex.valeur} ${ex.type}</div>
                        </div>
                    `;
                } else {
                    // Upcoming
                    const imgUrl = getExImage(ex);

                    let upBtn = index > currentWorkout.currentExIndex + 1 ? `<button onclick="moveWorkoutQueueItem(${index}, -1)" style="background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 8px; width: 36px; height: 36px; font-weight: bold; cursor: pointer;">↑</button>` : `<div style="width: 36px; height: 36px;"></div>`;
                    let downBtn = index < currentWorkout.exercices.length - 1 ? `<button onclick="moveWorkoutQueueItem(${index}, 1)" style="background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 8px; width: 36px; height: 36px; font-weight: bold; cursor: pointer;">↓</button>` : `<div style="width: 36px; height: 36px;"></div>`;

                    li.innerHTML = `
                        <div style="display: flex; flex-direction: column; gap: 5px;">
                            ${upBtn}
                            ${downBtn}
                        </div>
                        <img src="${imgUrl}" alt="${ex.nom}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; flex-shrink: 0;" loading="lazy">
                        <div style="flex-grow: 1;">
                            <h4>${index + 1}. ${ex.nom}</h4>
                            <div style="font-size: 0.8rem; color: var(--text-secondary);">${ex.series} x ${ex.valeur} ${ex.type} | ⏱ ${ex.repos}s</div>
                        </div>
                    `;
                }
                list.appendChild(li);
            });
        }

        function showWorkoutEnd() {
            document.getElementById('workout-progress').textContent = "Terminé";
            document.getElementById('workout-ex-view').style.display = 'none';
            document.getElementById('workout-rest-view').style.display = 'none';
            document.getElementById('workout-end-view').style.display = 'flex';
            fireConfetti();

            document.getElementById('workout-controls').style.display = 'none';

            // Mettre à jour l'historique de complétion avec les dates
            let history = {};
            let sessions = [];
            try {
                history = JSON.parse(localStorage.getItem('fitness_history') || '{}');
                sessions = JSON.parse(localStorage.getItem('fitness_sessions') || '[]');
            } catch (e) {
                console.error("Erreur lors de la lecture de l'historique:", e);
            }

            // Legacy counter
            history[currentWorkout.planId] = (history[currentWorkout.planId] || 0) + 1;

            // Detailed session log for stats
            const planDetails = db.plans.find(p => p.id === currentWorkout.planId) || { nom: 'Séance Rapide' };
            sessions.push({
                date: new Date().toISOString(),
                planId: currentWorkout.planId,
                nom: planDetails.nom
            });

            localStorage.setItem('fitness_history', JSON.stringify(history));
            localStorage.setItem('fitness_sessions', JSON.stringify(sessions));

            // Rafraîchir l'interface (pour le badge)
            renderPlans(db.plans);
        }

        // --- Stats Rendering ---
        function renderStats() {
            const heatmapContainer = document.getElementById('stats-heatmap');
            const historyListContainer = document.getElementById('stats-history-list');
            const weeklyChartContainer = document.getElementById('stats-weekly-chart');

            heatmapContainer.innerHTML = '';
            historyListContainer.innerHTML = '';
            weeklyChartContainer.innerHTML = '';

            let sessions = [];
            try {
                sessions = JSON.parse(localStorage.getItem('fitness_sessions') || '[]');
            } catch (e) {}

            // Heatmap logic (last 30 days)
            const today = new Date();
            today.setHours(0,0,0,0);

            // Create a map of date strings (YYYY-MM-DD) to count
            const sessionCounts = {};
            sessions.forEach(s => {
                const dateStr = new Date(s.date).toISOString().split('T')[0];
                sessionCounts[dateStr] = (sessionCounts[dateStr] || 0) + 1;
            });

            // Weekly Chart Logic (Last 7 days)
            const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
            const maxDailySessions = Math.max(...Object.values(sessionCounts), 1); // Avoid div by zero

            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                const count = sessionCounts[dateStr] || 0;

                const dayName = daysOfWeek[d.getDay()];

                // Height ratio (max height = 100px)
                const height = count > 0 ? Math.max((count / maxDailySessions) * 100, 15) : 5;

                const col = document.createElement('div');
                col.style.display = 'flex';
                col.style.flexDirection = 'column';
                col.style.alignItems = 'center';
                col.style.gap = '8px';
                col.style.width = '30px';

                const bar = document.createElement('div');
                bar.style.width = '16px';
                bar.style.height = '0px'; // Start at 0 for animation
                bar.style.borderRadius = '8px';
                bar.style.transition = 'height 1s cubic-bezier(0.2, 0.8, 0.2, 1)';

                if (count === 0) {
                    bar.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                } else {
                    bar.style.background = 'var(--accent-gradient)';
                    bar.style.boxShadow = '0 0 10px rgba(153, 88, 255, 0.4)';
                }

                // Trigger animation after append
                setTimeout(() => {
                    bar.style.height = `${height}px`;
                }, 50 * (6 - i)); // Staggered animation

                const label = document.createElement('div');
                label.textContent = dayName;
                label.style.fontSize = '0.75rem';
                label.style.color = count > 0 ? 'white' : 'var(--text-secondary)';
                label.style.fontWeight = count > 0 ? 'bold' : 'normal';

                col.appendChild(bar);
                col.appendChild(label);
                weeklyChartContainer.appendChild(col);
            }

            // Muscle Heatmap generation
            // Analyser les muscles ciblés lors des 7 derniers jours
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const muscleCounts = {};
            const recentMuscleSessions = sessions.filter(s => new Date(s.date) >= sevenDaysAgo);

            recentMuscleSessions.forEach(s => {
                const plan = db.plans.find(p => p.id === s.planId);
                if (plan && plan.exercices_ids) {
                    plan.exercices_ids.forEach(exId => {
                        const ex = db.exercices.find(e => String(e.id) === String(exId));
                        if (ex && ex.tags) {
                            const exTags = ex.tags.split(',').map(t => t.trim().toLowerCase());
                            exTags.forEach(tag => {
                                // Exclure les tags non-musculaires courants si on veut être précis,
                                // mais pour faire simple, on prend tous les tags d'équipement/muscle.
                                // Idéalement, il faudrait un champ "muscles" dans la base.
                                if(tag !== 'poids du corps' && tag !== 'haltères' && tag !== 'barre') {
                                    muscleCounts[tag] = (muscleCounts[tag] || 0) + 1;
                                }
                            });
                        }
                    });
                }
            });

            if (Object.keys(muscleCounts).length === 0) {
                heatmapContainer.innerHTML = '<div style="color: var(--text-secondary); text-align: center; width: 100%;">Pas de données musculaires récentes.</div>';
            } else {
                const maxMuscleCount = Math.max(...Object.values(muscleCounts), 1);

                Object.entries(muscleCounts).sort((a, b) => b[1] - a[1]).forEach(([muscle, count]) => {
                    const box = document.createElement('div');
                    box.className = 'tag';
                    // Calcul d'une opacité basée sur la fréquence
                    const intensity = Math.max(0.2, count / maxMuscleCount);
                    box.style.background = `rgba(153, 88, 255, ${intensity})`; // Accent color avec opacité dynamique
                    box.style.color = 'white';
                    box.style.border = '1px solid rgba(255,255,255,0.2)';
                    box.style.margin = '2px';
                    box.title = `${muscle}: ${count} exercice(s) dans les 7 derniers jours`;
                    box.textContent = muscle.toUpperCase();
                    heatmapContainer.appendChild(box);
                });
            }

            // History list logic (last 10 sessions)
            const recentSessions = [...sessions].reverse().slice(0, 10);

            if (recentSessions.length === 0) {
                historyListContainer.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 2rem;">Aucune séance enregistrée pour le moment.</div>';
                return;
            }

            recentSessions.forEach(s => {
                const date = new Date(s.date);
                const formatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

                const item = document.createElement('div');
                item.style.backgroundColor = 'rgba(0,0,0,0.2)';
                item.style.border = '1px solid var(--border-color)';
                item.style.padding = '15px';
                item.style.borderRadius = '16px';
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';

                item.innerHTML = `
                    <div>
                        <div style="color: white; font-weight: 600;">${s.nom}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem; text-transform: capitalize;">${formatter.format(date)}</div>
                    </div>
                    <div style="background: var(--accent-dark); color: var(--accent-color); padding: 5px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: bold;">✓ Terminé</div>
                `;
                historyListContainer.appendChild(item);
            });
        }

        function finishWorkout() {
            triggerHaptic();
            quitWorkout();
        }

        function quitWorkout() {
            triggerHaptic();
            if (currentWorkout.restInterval) clearInterval(currentWorkout.restInterval);
            if (activeWorkoutTimerInterval) {
                clearInterval(activeWorkoutTimerInterval);
                activeWorkoutTimerInterval = null;
            }
            document.getElementById('workout-screen').style.display = 'none';
            document.getElementById('workout-controls').style.display = 'block'; // Reset for next time
            document.body.style.overflow = 'auto';
        }

        // --- Edit Exercice On-the-fly ---
        function openEditCurrentEx() {
            triggerHaptic();
            const ex = currentWorkout.exercices[currentWorkout.currentExIndex];

            document.getElementById('modal-edit-ex').dataset.mode = "workout";

            document.getElementById('edit-ex-series').value = ex.series;

            let type = 'reps';
            if (ex.type === 'secs') type = 'secs';
            if (ex.type === 'kegel') type = 'kegel';
            if (ex.type === 'poids') type = 'poids';
            if (ex.type === 'distance') type = 'distance';
            document.getElementById('edit-ex-type').value = type;

            document.getElementById('edit-ex-valeur').value = ex.valeur;
            if (document.getElementById('edit-ex-poids')) document.getElementById('edit-ex-poids').value = ex.poids || 0;
            document.getElementById('edit-ex-kegel-on').value = ex.kegel_on || 5;
            document.getElementById('edit-ex-kegel-off').value = ex.kegel_off || 5;
            document.getElementById('edit-ex-repos').value = ex.repos;

            updateEditExUI();

            document.getElementById('modal-edit-ex').classList.add('active');
        }

        function updateEditExUI() {
            const type = document.getElementById('edit-ex-type').value;
            const lblValeur = document.getElementById('lbl-edit-ex-valeur');
            const kegelContainer = document.getElementById('edit-kegel-container');
            const poidsContainer = document.getElementById('edit-poids-container');

            kegelContainer.style.display = 'none';
            if (poidsContainer) poidsContainer.style.display = 'none';

            if (type === 'reps') {
                lblValeur.textContent = "Nombre de répétitions (reps)";
            } else if (type === 'secs') {
                lblValeur.textContent = "Temps de maintien total (secs)";
            } else if (type === 'kegel') {
                lblValeur.textContent = "Nombre de cycles (C+R)";
                kegelContainer.style.display = 'flex';
            } else if (type === 'poids') {
                lblValeur.textContent = "Nombre de répétitions (reps)";
                if (poidsContainer) poidsContainer.style.display = 'block';
            } else if (type === 'distance') {
                lblValeur.textContent = "Distance (km)";
            }
        }

        function closeEditExModal(event) {
            if (event && event.target !== document.getElementById('modal-edit-ex') && event.target.className !== 'close-btn') {
                return;
            }
            triggerHaptic();
            document.getElementById('modal-edit-ex').classList.remove('active');
        }

        function saveEditEx() {
            triggerHaptic();
            const series = parseInt(document.getElementById('edit-ex-series').value) || 1;
            const type = document.getElementById('edit-ex-type').value;
            const valeur = parseFloat(document.getElementById('edit-ex-valeur').value) || 1;
            const repos = parseInt(document.getElementById('edit-ex-repos').value) || 0;
            let poids = 0;
            if (document.getElementById('edit-ex-poids')) poids = parseFloat(document.getElementById('edit-ex-poids').value) || 0;
            const kOn = parseInt(document.getElementById('edit-ex-kegel-on').value) || 5;
            const kOff = parseInt(document.getElementById('edit-ex-kegel-off').value) || 5;

            const mode = document.getElementById('modal-edit-ex').dataset.mode;

            if (mode === "temp") {
                // Update temp clone list
                const idx = parseInt(document.getElementById('modal-edit-ex').dataset.editingTempIndex);
                const ex = currentViewedPlanExercises[idx];
                ex.series = series;
                ex.type = type;
                ex.valeur = valeur;
                ex.repos = repos;
                ex.poids = poids;
                if (type === 'kegel') {
                    ex.kegel_on = kOn;
                    ex.kegel_off = kOff;
                }
                closeEditExModal();
                renderPlanExercisesList();
            } else {
                // Update current workout instance
                const ex = currentWorkout.exercices[currentWorkout.currentExIndex];
                ex.series = series;
                ex.type = type;
                ex.valeur = valeur;
                ex.repos = repos;
                ex.poids = poids;
                if (type === 'kegel') {
                    ex.kegel_on = kOn;
                    ex.kegel_off = kOff;
                }
                closeEditExModal();
                renderWorkoutStep(); // re-render step to apply changes visually
            }
        }

        // Utilitaire: Émettre un bip
        let sharedAudioCtx = null;
        function playBeep(frequency, duration, type = 'sine') {
            if (!soundEnabled) return;

            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                if (!sharedAudioCtx) {
                    sharedAudioCtx = new AudioContext();
                }

                // Si le contexte est suspendu (sécurité navigateur), on le réveille
                if (sharedAudioCtx.state === 'suspended') {
                    sharedAudioCtx.resume();
                }

                const osc = sharedAudioCtx.createOscillator();
                const gainNode = sharedAudioCtx.createGain();

                osc.type = type;
                osc.frequency.setValueAtTime(frequency, sharedAudioCtx.currentTime);

                // Enveloppe sonore (fade out) pour éviter le clic sec
                gainNode.gain.setValueAtTime(1, sharedAudioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, sharedAudioCtx.currentTime + duration);

                osc.connect(gainNode);
                gainNode.connect(sharedAudioCtx.destination);

                osc.start();
                osc.stop(sharedAudioCtx.currentTime + duration);
            } catch (e) { console.warn("L'audio n'est pas encore supporté ou autorisé", e); }
        }

        function closeExModal(event) {
            if (event && event.target !== document.getElementById('modal-ex') && event.target.className !== 'close-btn') {
                return;
            }
            triggerHaptic();
            document.getElementById('modal-ex').classList.remove('active');
            document.body.style.overflow = 'auto';
        }

        function addPlanToCalendar() {
            triggerHaptic();
            if (!currentViewedPlan) return;

            // Calculate start and end times (e.g., today at 18:00 for 1 hour)
            const now = new Date();
            let start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0); // Default to 18:00 today
            if (now.getHours() >= 18) {
                 // If it's already past 18:00, schedule for tomorrow
                 start.setDate(start.getDate() + 1);
            }
            const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration

            const formatICSDate = (date) => {
                return date.toISOString().replace(/-|:|\.\d+/g, '');
            };

            const uid = Date.now().toString() + "@fittrackpro.local";
            const summary = `Entraînement : ${currentViewedPlan.nom}`;
            const description = `Programme : ${currentViewedPlan.nom}\\n${currentViewedPlan.description}\\n\\nPréparez-vous à transpirer avec FitTrack Pro !`;

            const icsContent = [
                "BEGIN:VCALENDAR",
                "VERSION:2.0",
                "PRODID:-//FitTrack Pro//FR",
                "BEGIN:VEVENT",
                `UID:${uid}`,
                `DTSTAMP:${formatICSDate(new Date())}`,
                `DTSTART:${formatICSDate(start)}`,
                `DTEND:${formatICSDate(end)}`,
                `SUMMARY:${summary}`,
                `DESCRIPTION:${description}`,
                "BEGIN:VALARM",
                "TRIGGER:-PT30M", // Reminder 30 mins before
                "ACTION:DISPLAY",
                "DESCRIPTION:Rappel d'entraînement",
                "END:VALARM",
                "END:VEVENT",
                "END:VCALENDAR"
            ].join("\n");

            // Create a blob and trigger download
            const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Workout_${currentViewedPlan.nom.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            showSuccess("Événement calendrier généré !");
        }

        function closeModal(event) {
            if (event && event.target !== document.getElementById('modal') && event.target.className !== 'close-btn') {
                return;
            }
            triggerHaptic();
            currentViewedPlan = null;
            currentViewedPlanExercises = [];
            document.getElementById('modal').classList.remove('active');
            document.body.style.overflow = 'auto';
        }

        // --- Add Exercice to Plan Modal ---
        function openAddExModal() {
            triggerHaptic();
            document.getElementById('search-modal-add').value = '';
            renderTagsFilter('modal-add-tags-container', db.exercices, 'modalAdd');
            handleModalSearch();
            document.getElementById('modal-add-ex').classList.add('active');
        }

        function closeAddExModal(event) {
            if (event && event.target !== document.getElementById('modal-add-ex') && event.target.className !== 'close-btn') {
                return;
            }
            triggerHaptic();
            document.getElementById('modal-add-ex').classList.remove('active');
        }

        function handleModalSearch() {
            const query = document.getElementById('search-modal-add').value.toLowerCase();
            const activeTag = activeTagFilters['modalAdd'];

            const filtered = db.exercices.filter(e => {
                const matchesQuery = (e.nom && e.nom.toLowerCase().includes(query)) ||
                                     (e.description && e.description.toLowerCase().includes(query)) ||
                                     (e.tags && e.tags.toLowerCase().includes(query));
                const matchesTag = activeTag ? (e.tagsArray && e.tagsArray.includes(activeTag)) : true;
                return matchesQuery && matchesTag;
            });

            renderModalAddExercices(filtered);
        }

        function addExerciceToTempPlan(ex) {
            triggerHaptic();
            // Clone the exercice and push it to the temp list
            currentViewedPlanExercises.push(structuredClone(ex));
            renderPlanExercisesList();
            closeAddExModal();
        }

        function renderModalAddExercices(exercicesToRender) {
            const grid = document.getElementById('modal-add-grid');
            grid.innerHTML = '';

            if (exercicesToRender.length === 0) {
                grid.innerHTML = '<div style="color:var(--text-secondary); text-align:center; padding:2rem;">Aucun exercice trouvé.</div>';
                return;
            }

            exercicesToRender.forEach(ex => {
                const imgUrl = getExImage(ex);
                const card = document.createElement('div');
                card.className = 'card quick-ex-card';
                card.style.flexDirection = 'row';
                card.style.alignItems = 'center';
                card.style.padding = '10px';
                card.style.gap = '15px';
                card.style.cursor = 'pointer';
                card.style.marginBottom = '10px'; // Stacked vertically

                card.onclick = () => addExerciceToTempPlan(ex);

                card.innerHTML = `
                    <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--accent-dark); color: var(--accent-color); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem; flex-shrink: 0;">+</div>
                    <img src="${imgUrl}" alt="${ex.nom}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; flex-shrink: 0;" loading="lazy">
                    <div style="flex-grow: 1; overflow: hidden;">
                        <div class="card-title" style="margin-bottom: 2px; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ex.nom}</div>
                        <div style="color: var(--text-secondary); font-size: 0.8rem;">${ex.series}x${ex.valeur} ${ex.type} | ${ex.repos}s</div>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        // Utilities
        function showLoader() { document.getElementById('loader').style.display = 'block'; }
        function hideLoader() { document.getElementById('loader').style.display = 'none'; }
        function showError(msg) {
            const el = document.getElementById('error-container');
            el.textContent = msg;
            el.style.display = 'block';
        }
        function hideError() { document.getElementById('error-container').style.display = 'none'; }
        function showSuccess(msg) {
            const el = document.getElementById('success-container');
            el.textContent = msg;
            el.style.display = 'block';
            setTimeout(hideSuccess, 5000);
        }
        function hideSuccess() { document.getElementById('success-container').style.display = 'none'; }

        // Service Worker Registration for PWA
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js').catch(registrationError => {
                    console.error("L'enregistrement du Service Worker a échoué : ", registrationError);
                });
            });
        }

        // Swipe to dismiss logic for modals
        function initSwipeToDismiss() {
            const modals = document.querySelectorAll('.modal-overlay');

            modals.forEach(overlay => {
                const content = overlay.querySelector('.modal-content');
                if (!content) return;

                let startY = 0;
                let currentY = 0;
                let isDragging = false;

                content.addEventListener('touchstart', (e) => {
                    // Only start drag if we are at the very top of the modal scroll
                    if (content.scrollTop > 0) return;

                    startY = e.touches[0].clientY;
                    isDragging = true;
                    content.classList.add('dragging');
                }, { passive: true });

                content.addEventListener('touchmove', (e) => {
                    if (!isDragging) return;

                    const y = e.touches[0].clientY;
                    const deltaY = y - startY;

                    // Only allow dragging downwards
                    if (deltaY > 0) {
                        currentY = deltaY;
                        content.style.transform = `translateY(${deltaY}px)`;
                        // Prevent scrolling while dragging down
                        e.preventDefault();
                    }
                }, { passive: false });

                content.addEventListener('touchend', () => {
                    if (!isDragging) return;
                    isDragging = false;
                    content.classList.remove('dragging');

                    // Threshold to close (e.g., 100px)
                    if (currentY > 100) {
                        // Close modal based on ID
                        const modalId = overlay.id;
                        if (modalId === 'modal') closeModal();
                        else if (modalId === 'modal-ex') closeExModal();
                        else if (modalId === 'modal-quick-settings') closeQuickWorkoutSettings();
                        else if (modalId === 'modal-add-ex') closeAddExModal();
                        else if (modalId === 'modal-edit-ex') closeEditExModal();
                        else if (modalId === 'modal-workout-queue') closeWorkoutQueue();
                        else {
                            overlay.classList.remove('active');
                            document.body.style.overflow = 'auto';
                        }
                    }

                    // Reset transform to allow CSS transitions to take over
                    content.style.transform = '';
                    currentY = 0;
                });
            });
        }

        // Start
        if (typeof window !== 'undefined') {
            window.onload = () => {
                init();
                initSwipeToDismiss();
            };
        }

        if (typeof module !== 'undefined' && module.exports) {
            module.exports = { extractUniqueTags, showError, showSuccess };
        }

        // Smart Surcharge ("TDAH Friendly")
        function checkAndShowSmartSurcharge(ex) {
            const btnSurcharge = document.getElementById('btn-smart-surcharge');

            // On affiche le bouton seulement si l'exercice a une notion de progression (reps, secs, poids)
            if (['reps', 'secs', 'poids'].includes(ex.type || 'reps')) {
                btnSurcharge.style.display = 'block';

                let surchargeText = "✨ SURCHARGE: ";
                if (ex.type === 'poids' || ex.poids > 0) {
                    surchargeText += "+1 kg";
                } else if (ex.type === 'secs') {
                    surchargeText += "+5 secs";
                } else {
                    surchargeText += "+1 rep";
                }
                btnSurcharge.textContent = surchargeText;
            } else {
                btnSurcharge.style.display = 'none';
            }
        }

        function applySmartSurcharge() {
            triggerHaptic();
            const ex = currentWorkout.exercices[currentWorkout.currentExIndex];

            if (ex.type === 'poids' || ex.poids > 0) {
                ex.poids = (parseFloat(ex.poids || 0) + 1).toString();
                showSuccess("Poids augmenté de 1kg ! 💪");
            } else if (ex.type === 'secs') {
                ex.valeur = (parseInt(ex.valeur) + 5).toString();
                showSuccess("Durée augmentée de 5s ! 🔥");
            } else {
                ex.valeur = (parseInt(ex.valeur) + 1).toString();
                showSuccess("Répétitions augmentées de 1 ! 📈");
            }

            document.getElementById('btn-smart-surcharge').style.display = 'none'; // Hide after use
            renderWorkoutStep();
        }

        // Confetti Canvas for Gamification
        function fireConfetti() {
            const canvas = document.createElement('canvas');
            canvas.id = 'confetti-canvas';
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.pointerEvents = 'none';
            canvas.style.zIndex = '9999';
            document.body.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            const confettis = [];
            const colors = ['#6FB2FF', '#9958FF', '#FF6FD8', '#3fb950', '#ffb300'];

            for (let i = 0; i < 150; i++) {
                confettis.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height - canvas.height,
                    w: Math.random() * 10 + 5,
                    h: Math.random() * 10 + 5,
                    c: colors[Math.floor(Math.random() * colors.length)],
                    dx: Math.random() * 4 - 2,
                    dy: Math.random() * 5 + 2,
                    rot: Math.random() * 360,
                    rotSpeed: Math.random() * 10 - 5
                });
            }

            let animationId;
            function render() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                let active = false;
                for (let c of confettis) {
                    c.y += c.dy;
                    c.x += c.dx;
                    c.rot += c.rotSpeed;
                    if (c.y < canvas.height) active = true;

                    ctx.save();
                    ctx.translate(c.x + c.w / 2, c.y + c.h / 2);
                    ctx.rotate(c.rot * Math.PI / 180);
                    ctx.fillStyle = c.c;
                    ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
                    ctx.restore();
                }

                if (active) {
                    animationId = requestAnimationFrame(render);
                } else {
                    document.body.removeChild(canvas);
                }
            }
            render();

            // Multiple haptic feedback
            let hapticCount = 0;
            const hapticInterval = setInterval(() => {
                triggerHaptic();
                hapticCount++;
                if (hapticCount > 5) clearInterval(hapticInterval);
            }, 150);
        }

        // Web API Integration (Wger)
        function openWebSearchModal() {
            document.getElementById('modal-web-search').classList.add('active');
            document.getElementById('web-search-input').value = '';
            document.getElementById('web-search-results').innerHTML = '';
            setTimeout(() => document.getElementById('web-search-input').focus(), 100);
        }

        function closeWebSearchModal(e) {
            if (e && e.target !== document.getElementById('modal-web-search')) return;
            document.getElementById('modal-web-search').classList.remove('active');
        }

        async function fetchWebExercises() {
            const query = document.getElementById('web-search-input').value.trim();
            if (!query) return;

            const loader = document.getElementById('web-search-loader');
            const resultsContainer = document.getElementById('web-search-results');

            loader.style.display = 'block';
            resultsContainer.innerHTML = '';

            try {
                // Fetching from wger API
                const response = await fetch(`https://wger.de/api/v2/exercise/search/?term=${encodeURIComponent(query)}&language=2`); // 2 = English
                const data = await response.json();

                loader.style.display = 'none';

                if (data.suggestions && data.suggestions.length > 0) {
                    // Extract IDs to get details
                    const results = data.suggestions.slice(0, 10); // Limit to 10

                    if (results.length === 0) {
                        resultsContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; width: 100%;">Aucun résultat trouvé.</p>';
                        return;
                    }

                    const frag = document.createDocumentFragment();
                    results.forEach(res => {
                        const card = document.createElement('div');
                        card.className = 'card';
                        card.innerHTML = `
                            <h3 style="color: white; margin-bottom: 10px;">${res.data.name}</h3>
                            <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 15px; max-height: 60px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
                                ${res.data.category || 'Catégorie inconnue'}
                            </div>
                            <button class="btn-action" onclick="importWebExercise('${res.data.id}', '${res.data.name.replace(/'/g, "\\'")}')" style="width: 100%; padding: 8px; font-size: 0.9rem; background: linear-gradient(135deg, #10b981, #059669);">⬇️ IMPORTER (LOCAL)</button>
                        `;
                        frag.appendChild(card);
                    });
                    resultsContainer.appendChild(frag);
                } else {
                    resultsContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; width: 100%;">Aucun résultat trouvé.</p>';
                }
            } catch (err) {
                console.error("Erreur Web Fetch:", err);
                loader.style.display = 'none';
                resultsContainer.innerHTML = '<p style="color: #ff5555; text-align: center; width: 100%;">Erreur de connexion à l\'API. Vérifiez votre connexion internet.</p>';
            }
        }

        function importWebExercise(apiId, name) {
            triggerHaptic();

            // Check if already exists by name
            if (db.exercices.some(e => e.nom.toLowerCase() === name.toLowerCase())) {
                showError(`L'exercice "${name}" existe déjà dans votre bibliothèque.`);
                return;
            }

            // Create a local db format exercise
            const newExId = Date.now().toString();
            const newEx = {
                id: newExId,
                nom: name + ' (Web)',
                description: `Importé depuis le web (ID: ${apiId}). Pensez à modifier les tags et modalités.`,
                tags: "Import,Web",
                tagsArray: ["Import", "Web"],
                type: "reps",
                series: 3,
                valeur: 10,
                repos: 60,
                equipement: "Au choix",
                unilateral: false
            };

            db.exercices.push(newEx);

            // Save to local storage for persistence
            try {
                const storedDb = JSON.parse(localStorage.getItem('fitness_data') || '{"exercices":[],"plans":[]}');
                storedDb.exercices.push(newEx);
                localStorage.setItem('fitness_data', JSON.stringify(storedDb));

                showSuccess(`"${name}" importé avec succès !`);
                closeWebSearchModal();

                // Refresh list if we are on the exercices tab
                if (currentTab === 'exercices') {
                    renderExercicesList();
                }
            } catch (e) {
                console.error("Erreur sauvegarde locale:", e);
                showError("Impossible de sauvegarder l'exercice.");
            }
        }
