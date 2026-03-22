
        function triggerHaptic() { if (navigator.vibrate) navigator.vibrate(50); }

        let db = { exercices: [], plans: [] };
        let currentTab = 'plans';

        let activeTagFilters = {
            exercices: null, // null means "Tous"
            quick: null,
            modalAdd: null
        };

        // Variables pour la séance en cours
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

            if (tab === 'plans') document.getElementById('page-title').textContent = 'Mes Programmes';
            else if (tab === 'exercices') document.getElementById('page-title').textContent = 'Bibliothèque';
            else if (tab === 'stats') document.getElementById('page-title').textContent = 'Statistiques';
            else if (tab === 'settings') document.getElementById('page-title').textContent = 'Paramètres';
            else if (tab === 'quick-workout') document.getElementById('page-title').textContent = 'Séance Rapide';

            document.getElementById('search-input').style.display = (tab === 'settings' || tab === 'stats') ? 'none' : 'block';
            document.getElementById('search-input').value = '';

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
                if (ex.tags) {
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

                card.innerHTML = `
                    <div class="check-circle" style="width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--accent-color); background-color: ${checkBg}; display: flex; align-items: center; justify-content: center; color: black; font-weight: bold; flex-shrink: 0;">${checkTxt}</div>
                    <img src="${imgUrl}" alt="${ex.nom}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; flex-shrink: 0;" loading="lazy">
                    <div style="flex-grow: 1; overflow: hidden;">
                        <div class="card-title" style="margin-bottom: 2px; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ex.nom}</div>
                        <div style="color: var(--text-secondary); font-size: 0.8rem;">${ex.series || 3}x${ex.valeur || 10} | ${ex.repos || 60}s</div>
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
            if (!db.exercices.find(e => e.id === ex.id)) {
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
                            description: "Suggestion importée depuis wger.de",
                            video: baseData.name || "",
                            image: baseData.image ? "https://wger.de" + baseData.image : "",
                            frequence: 0
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

            suggestions.forEach(ex => {
                // Skip if already in local db to avoid duplicates
                if (db.exercices.find(e => e.id === ex.id)) return;

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
                const tagsHTML = (ex.tags || '').split(',').filter(t => t.trim() !== '').map(t => `<span class="tag">${t.trim()}</span>`).join('');
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
                            <span>${ex.series} x ${ex.valeur} ${ex.type}</span>
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
                const formattedExercices = exData.map(ex => ({
                    id: String(ex.id),
                    nom: ex.n || "",
                    tags: ex.t || "",
                    importance: ex.imp || "",
                    series: ex.sets || 0,
                    valeur: ex.val || 0,
                    type: ex.type || "",
                    repos: ex.rest || 0,
                    description: ex.d || "",
                    video: ex.v || "",
                    image: ex.image || ex.img || ex.url_image || "",
                    frequence: ex.frequence || 0
                }));

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
        function handleSearch() {
            const query = document.getElementById('search-input').value.toLowerCase();

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
                    const matchesTag = activeTag ? (e.tags && e.tags.split(',').map(t=>t.trim()).includes(activeTag)) : true;
                    return matchesQuery && matchesTag;
                });
                renderExercices(filtered);
            } else if (currentTab === 'quick-workout') {
                const activeTag = activeTagFilters['quick'];
                const filtered = db.exercices.filter(e => {
                    const matchesQuery = (e.nom && e.nom.toLowerCase().includes(query)) ||
                                         (e.description && e.description.toLowerCase().includes(query)) ||
                                         (e.tags && e.tags.toLowerCase().includes(query));
                    const matchesTag = activeTag ? (e.tags && e.tags.split(',').map(t=>t.trim()).includes(activeTag)) : true;
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

            // Create a deep clone of the exercises for this specific session preview/edit
            currentViewedPlanExercises = (plan.exercices_ids || []).map(id => {
                const e = db.exercices.find(ex => ex.id === id);
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

            // Pour chaque exercice, on regarde s'il a été modifié par rapport à la base
            currentViewedPlanExercises.forEach(ex => {
                const originalEx = db.exercices.find(e => e.id === ex.id);
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

                let targetText = `${ex.series} x ${ex.valeur} ${ex.type}`;
                if (ex.type === 'kegel') {
                    targetText = `${ex.series} x ${ex.valeur} cycles (C:${ex.kegel_on || 5}s / R:${ex.kegel_off || 5}s)`;
                } else if (ex.type === 'poids') {
                    targetText = `${ex.series} x ${ex.valeur} reps @ ${ex.poids || 0}kg`;
                } else if (ex.type === 'distance') {
                    targetText = `${ex.series} x ${ex.valeur} km`;
                } else if (ex.poids && ex.poids > 0) {
                    targetText += ` @ ${ex.poids}kg`;
                }

                li.innerHTML = `
                    <button onclick="removeTempExercice(${index})" style="position: absolute; top: -10px; right: -10px; background: #ff3333; color: white; border: none; border-radius: 50%; width: 28px; height: 28px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.5); z-index: 2;">✕</button>
                    <img src="${imgUrl}" alt="${ex.nom}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; flex-shrink: 0;" loading="lazy">
                    <div style="flex-grow: 1;">
                        <h4>${index + 1}. ${ex.nom}</h4>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
                            <span class="tag" style="background: rgba(255, 255, 255, 0.1); cursor: pointer;" onclick="openEditTempEx(${index})">⚙️ ${targetText}</span>
                            <span class="tag" style="background: rgba(255, 255, 255, 0.1); cursor: pointer;" onclick="openEditTempEx(${index})">⏱ ${ex.repos}s</span>
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

        let activeTimers = {};

        function startTimer(duration, buttonId) {
            triggerHaptic();
            const btn = document.getElementById(buttonId);
            if (!btn || activeTimers[buttonId]) return; // Timer already running

            let timeRemaining = duration;
            btn.classList.add('active-timer');
            btn.innerHTML = `⏳ Repos en cours: ${timeRemaining}s`;

            activeTimers[buttonId] = setInterval(() => {
                timeRemaining -= 1;
                if (timeRemaining <= 0) {
                    clearInterval(activeTimers[buttonId]);
                    delete activeTimers[buttonId];
                    btn.classList.remove('active-timer');
                    btn.innerHTML = `✅ Repos terminé !`;
                    // Bip simple (facultatif si le navigateur l'autorise)
                    try {
                        const ctx = new (window.AudioContext || window.webkitAudioContext)();
                        const osc = ctx.createOscillator();
                        osc.connect(ctx.destination);
                        osc.start();
                        osc.stop(ctx.currentTime + 0.3);
                    } catch (e) {
                        console.warn("Audio playback failed:", e);
                    }
                    setTimeout(() => {
                        if(document.getElementById(buttonId)) {
                             document.getElementById(buttonId).innerHTML = `⏱ Relancer repos (${duration}s)`;
                        }
                    }, 3000);
                } else {
                    btn.innerHTML = `⏳ Repos en cours: ${timeRemaining}s`;
                }
            }, 1000);
        }

        function stopAllTimers() {
            for (let id in activeTimers) {
                clearInterval(activeTimers[id]);
            }
            activeTimers = {};
        }

        function openExerciceDetails(ex) {
            triggerHaptic();
            document.getElementById('modal-ex-title').textContent = ex.nom;

            const tagsHTML = (ex.tags || '').split(',').filter(t => t.trim() !== '').map(t => `<span class="tag">${t.trim()}</span>`).join('');
            document.getElementById('modal-ex-meta').innerHTML = tagsHTML;

            const imgUrl = getExImage(ex);
            const imgContainer = document.getElementById('modal-ex-img-container');
            if (imgContainer) {
                imgContainer.innerHTML = `<img src="${imgUrl}" alt="${ex.nom}" style="width: 100%; height: 250px; object-fit: cover; border-radius: 12px; margin-bottom: 1.5rem;" loading="lazy">`;
            }

            document.getElementById('modal-ex-series').textContent = `${ex.series} × ${ex.valeur} ${ex.type}`;
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
                // Récupérer et cloner les objets exercices pour permettre la modif à la volée
                exos = plan.exercices_ids.map(id => {
                    const e = db.exercices.find(ex => ex.id === id);
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

            // Mise à jour de la barre de progression
            document.getElementById('workout-progress').textContent = `${currentWorkout.currentExIndex + 1} / ${currentWorkout.exercices.length}`;

            // Si on se repose
            if (currentWorkout.isResting) {
                document.getElementById('workout-ex-view').style.display = 'none';
                document.getElementById('workout-rest-view').style.display = 'flex';
                document.getElementById('workout-end-view').style.display = 'none';

                document.getElementById('btn-next-step').style.display = 'none';
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
                document.getElementById('btn-skip-rest').style.display = 'none';

                document.getElementById('btn-next-step').textContent = 'VALIDER LA SÉRIE';

                // Remplir les infos de l'exercice
                document.getElementById('workout-ex-title').textContent = ex.nom;

                // Formater l'objectif selon le type
                let targetText = `${ex.series} x ${ex.valeur} ${ex.type}`;
                if (ex.type === 'kegel') {
                    targetText = `${ex.series} x ${ex.valeur} cycles (C:${ex.kegel_on || 5}s / R:${ex.kegel_off || 5}s)`;
                } else if (ex.type === 'poids') {
                    targetText = `${ex.series} x ${ex.valeur} reps @ ${ex.poids || 0}kg`;
                } else if (ex.type === 'distance') {
                    targetText = `${ex.series} x ${ex.valeur} km`;
                } else if (ex.poids && ex.poids > 0) {
                    targetText += ` @ ${ex.poids}kg`;
                }
                document.getElementById('workout-ex-target').textContent = targetText;

                document.getElementById('workout-ex-desc').textContent = ex.description;

                const imgUrl = getExImage(ex);
                const imgContainer = document.getElementById('workout-ex-img-container');
                if (imgContainer) {
                    imgContainer.innerHTML = `<img src="${imgUrl}" alt="${ex.nom}" style="max-width: 100%; max-height: 200px; object-fit: contain; border-radius: 12px;" loading="lazy">`;
                }

                // Gestion des timers spécifiques (Isométrie ou Kegel)
                const activeTimerSection = document.getElementById('workout-active-timer-section');
                if (ex.type === 'secs' || ex.type === 'kegel') {
                    activeTimerSection.style.display = 'flex';
                    const phaseEl = document.getElementById('workout-active-timer-phase');
                    const btnStartTimer = document.getElementById('btn-start-active-timer');

                    if (ex.type === 'kegel') {
                        document.getElementById('workout-active-timer').textContent = ex.valeur;
                        phaseEl.textContent = "PRÊT (CYCLES)";
                    } else {
                        document.getElementById('workout-active-timer').textContent = ex.valeur;
                        phaseEl.textContent = "MAINTENIR";
                    }

                    btnStartTimer.style.display = 'block';
                    document.getElementById('active-timer-circle').style.transition = 'none';
                    document.getElementById('active-timer-circle').style.strokeDashoffset = '0';
                    document.getElementById('active-timer-circle').style.stroke = 'var(--accent-color)';
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
            const timerEl = document.getElementById('workout-active-timer');
            const circleEl = document.getElementById('active-timer-circle');
            const phaseEl = document.getElementById('workout-active-timer-phase');

            btn.style.display = 'none'; // Cacher le bouton Démarrer

            const circumference = 691;
            circleEl.style.transition = 'none';
            circleEl.style.strokeDashoffset = '0';
            void circleEl.offsetWidth;

            if (activeWorkoutTimerInterval) clearInterval(activeWorkoutTimerInterval);

            if (ex.type === 'secs') {
                // Logique Isométrie (Temps total)
                let timeRemaining = parseInt(ex.valeur);
                circleEl.style.transition = 'stroke-dashoffset 1s linear';
                phaseEl.textContent = "MAINTENIR";

                playBeep(400, 0.2); // Start beep

                activeWorkoutTimerInterval = setInterval(() => {
                    timeRemaining--;
                    timerEl.textContent = timeRemaining;

                    const progress = ((ex.valeur - timeRemaining) / ex.valeur);
                    circleEl.style.strokeDashoffset = circumference * progress;

                    if (timeRemaining > 0 && timeRemaining <= 3) playBeep(600, 0.1);

                    if (timeRemaining <= 0) {
                        clearInterval(activeWorkoutTimerInterval);
                        playBeep(800, 0.5); // End beep
                        phaseEl.textContent = "TERMINÉ";
                        document.getElementById('btn-next-step').click(); // Auto-valider la série
                    }
                }, 1000);

            } else if (ex.type === 'kegel') {
                // Logique Cycles Respiration / Kegel
                const tOn = parseInt(ex.kegel_on || 5);
                const tOff = parseInt(ex.kegel_off || 5);
                const totalCycles = parseInt(ex.valeur);

                let currentCycle = 1;
                let isContracting = true;
                let phaseTimeLeft = tOn;

                timerEl.textContent = currentCycle;
                phaseEl.textContent = `CONTRACTER (1/${totalCycles})`;
                circleEl.style.stroke = '#ff3333'; // Rouge pour contraction
                playBeep(600, 0.3); // High beep for contract

                activeWorkoutTimerInterval = setInterval(() => {
                    phaseTimeLeft--;

                    if (phaseTimeLeft <= 0) {
                        // Switch Phase
                        isContracting = !isContracting;

                        if (isContracting) {
                            // On passe à la contraction du cycle SUIVANT
                            currentCycle++;
                            if (currentCycle > totalCycles) {
                                // Fini !
                                clearInterval(activeWorkoutTimerInterval);
                                playBeep(800, 0.6); // End beep
                                phaseEl.textContent = "TERMINÉ";
                                document.getElementById('btn-next-step').click(); // Auto-valider la série
                                return;
                            }
                            phaseTimeLeft = tOn;
                            phaseEl.textContent = `CONTRACTER (${currentCycle}/${totalCycles})`;
                            circleEl.style.stroke = '#ff3333';
                            playBeep(600, 0.3);
                        } else {
                            // On passe au relâchement du cycle EN COURS
                            phaseTimeLeft = tOff;
                            phaseEl.textContent = `RELÂCHER (${currentCycle}/${totalCycles})`;
                            circleEl.style.stroke = '#3fb950'; // Vert pour relâchement
                            playBeep(400, 0.3); // Low beep for relax
                        }
                    }
                }, 1000);
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
            const circumference = 691; // 2 * pi * 110 (rayon)

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

        function skipRest() {
            triggerHaptic();
            advanceAfterRest();
        }

        function showWorkoutEnd() {
            document.getElementById('workout-progress').textContent = "Terminé";
            document.getElementById('workout-ex-view').style.display = 'none';
            document.getElementById('workout-rest-view').style.display = 'none';
            document.getElementById('workout-end-view').style.display = 'flex';

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

            heatmapContainer.innerHTML = '';
            historyListContainer.innerHTML = '';

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

            for (let i = 29; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                const count = sessionCounts[dateStr] || 0;

                const box = document.createElement('div');
                box.style.width = '24px';
                box.style.height = '24px';
                box.style.borderRadius = '6px';
                box.title = `${dateStr}: ${count} séance(s)`;

                if (count === 0) {
                    box.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                } else if (count === 1) {
                    box.style.backgroundColor = 'rgba(111, 178, 255, 0.4)';
                } else {
                    box.style.backgroundColor = 'var(--accent-color)';
                }

                heatmapContainer.appendChild(box);
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
            } catch (e) { console.log("Audio not supported or allowed yet", e); }
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
            stopAllTimers();
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
                const matchesTag = activeTag ? (e.tags && e.tags.split(',').map(t=>t.trim()).includes(activeTag)) : true;
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
            el.innerHTML = msg;
            el.style.display = 'block';
        }
        function hideError() { document.getElementById('error-container').style.display = 'none'; }
        function showSuccess(msg) {
            const el = document.getElementById('success-container');
            el.innerHTML = msg;
            el.style.display = 'block';
            setTimeout(hideSuccess, 5000);
        }
        function hideSuccess() { document.getElementById('success-container').style.display = 'none'; }

        // Service Worker Registration for PWA
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js').then(registration => {
                    console.log('SW registered: ', registration);
                }).catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
            });
        }

        // Start
        window.onload = init;
