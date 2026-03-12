        let db = { exercices: [], plans: [] };
        let currentTab = 'plans';

        // Variables pour la séance en cours
        let currentWorkout = {
            planId: null,
            exercices: [],
            currentExIndex: 0,
            currentSet: 0,
            isResting: false,
            restInterval: null
        };

        // Utilitaire: Obtenir l'image d'un exercice (Fallback visuel hors-ligne)
        function getExImage(ex) {
            if (ex.image && ex.image.trim() !== "") {
                return ex.image;
            }

            const name = ex.nom.toLowerCase();
            const bgColor = "#111111";
            const strokeColor = "#b2ff05"; // --accent-color
            let svgContent = "";

            // Génération de dessins schématiques simples (stickman / matériel) basés sur le nom
            if (name.includes("pompe") || name.includes("push") || name.includes("gainage") || name.includes("planche")) {
                // Stickman en position de planche
                svgContent = `
                    <circle cx="300" cy="200" r="25" fill="none" stroke="${strokeColor}" stroke-width="12"/>
                    <!-- Corps -->
                    <line x1="275" y1="200" x2="150" y2="250" stroke="${strokeColor}" stroke-width="12" stroke-linecap="round"/>
                    <!-- Bras -->
                    <line x1="250" y1="210" x2="250" y2="300" stroke="${strokeColor}" stroke-width="12" stroke-linecap="round"/>
                    <!-- Jambes -->
                    <line x1="150" y1="250" x2="50" y2="290" stroke="${strokeColor}" stroke-width="12" stroke-linecap="round"/>
                    <!-- Sol -->
                    <line x1="30" y1="300" x2="370" y2="300" stroke="#333" stroke-width="4" stroke-linecap="round"/>
                `;
            } else if (name.includes("traction") || name.includes("pull") || name.includes("muscle up")) {
                // Stickman suspendu à une barre
                svgContent = `
                    <!-- Barre -->
                    <line x1="100" y1="100" x2="300" y2="100" stroke="#555" stroke-width="16" stroke-linecap="round"/>
                    <!-- Tête -->
                    <circle cx="200" cy="150" r="25" fill="none" stroke="${strokeColor}" stroke-width="12"/>
                    <!-- Bras (pliés) -->
                    <polyline points="150,100 150,180 200,180" fill="none" stroke="${strokeColor}" stroke-width="12" stroke-linejoin="round"/>
                    <polyline points="250,100 250,180 200,180" fill="none" stroke="${strokeColor}" stroke-width="12" stroke-linejoin="round"/>
                    <!-- Corps -->
                    <line x1="200" y1="180" x2="200" y2="260" stroke="${strokeColor}" stroke-width="12" stroke-linecap="round"/>
                    <!-- Jambes -->
                    <line x1="200" y1="260" x2="180" y2="340" stroke="${strokeColor}" stroke-width="12" stroke-linecap="round"/>
                    <line x1="200" y1="260" x2="220" y2="340" stroke="${strokeColor}" stroke-width="12" stroke-linecap="round"/>
                `;
            } else if (name.includes("squat") || name.includes("fente") || name.includes("chaise") || name.includes("leg")) {
                // Stickman faisant un squat
                svgContent = `
                    <circle cx="200" cy="120" r="25" fill="none" stroke="${strokeColor}" stroke-width="12"/>
                    <!-- Corps penché -->
                    <line x1="200" y1="145" x2="180" y2="220" stroke="${strokeColor}" stroke-width="12" stroke-linecap="round"/>
                    <!-- Cuisse parallèle -->
                    <line x1="180" y1="220" x2="250" y2="220" stroke="${strokeColor}" stroke-width="12" stroke-linecap="round"/>
                    <!-- Mollet vertical -->
                    <line x1="250" y1="220" x2="250" y2="300" stroke="${strokeColor}" stroke-width="12" stroke-linecap="round"/>
                    <!-- Pied -->
                    <line x1="250" y1="300" x2="280" y2="300" stroke="${strokeColor}" stroke-width="12" stroke-linecap="round"/>
                    <!-- Bras tendus avant -->
                    <line x1="195" y1="160" x2="280" y2="160" stroke="${strokeColor}" stroke-width="12" stroke-linecap="round"/>
                `;
            } else if (name.includes("abdo") || name.includes("crunch") || name.includes("sit")) {
                 // Stickman couché (crunch)
                 svgContent = `
                    <circle cx="300" cy="230" r="25" fill="none" stroke="${strokeColor}" stroke-width="12"/>
                    <!-- Corps relevé -->
                    <line x1="280" y1="250" x2="180" y2="280" stroke="${strokeColor}" stroke-width="12" stroke-linecap="round"/>
                    <!-- Jambes pliées -->
                    <polyline points="180,280 130,200 80,280" fill="none" stroke="${strokeColor}" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/>
                    <!-- Bras derrière la tête -->
                    <polyline points="190,270 240,200 300,230" fill="none" stroke="${strokeColor}" stroke-width="8" stroke-linejoin="round" stroke-dasharray="10,5"/>
                    <!-- Sol -->
                    <line x1="50" y1="290" x2="350" y2="290" stroke="#333" stroke-width="4" stroke-linecap="round"/>
                 `;
            } else if (name.includes("course") || name.includes("run") || name.includes("sprint") || name.includes("jog")) {
                // Stickman courant
                svgContent = `
                    <circle cx="220" cy="120" r="25" fill="none" stroke="${strokeColor}" stroke-width="12"/>
                    <!-- Corps légèrement penché -->
                    <line x1="220" y1="145" x2="200" y2="220" stroke="${strokeColor}" stroke-width="12" stroke-linecap="round"/>
                    <!-- Jambe avant (pliée) -->
                    <polyline points="200,220 250,220 250,280" fill="none" stroke="${strokeColor}" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/>
                    <!-- Jambe arrière (tendue) -->
                    <polyline points="200,220 150,260 100,280" fill="none" stroke="${strokeColor}" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/>
                    <!-- Bras avant (plié) -->
                    <polyline points="215,160 160,180 140,140" fill="none" stroke="${strokeColor}" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/>
                    <!-- Bras arrière (plié) -->
                    <polyline points="215,160 260,160 280,120" fill="none" stroke="${strokeColor}" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/>
                `;
            } else {
                // Haltère générique (symbole par défaut)
                svgContent = `
                    <rect x="185" y="100" width="30" height="200" fill="#555" rx="5"/>
                    <rect x="130" y="120" width="140" height="40" fill="${strokeColor}" rx="8"/>
                    <rect x="100" y="140" width="200" height="20" fill="${strokeColor}" rx="5"/>
                    <rect x="130" y="240" width="140" height="40" fill="${strokeColor}" rx="8"/>
                    <rect x="100" y="240" width="200" height="20" fill="${strokeColor}" rx="5"/>
                `;
            }

            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
                    <rect width="400" height="400" fill="${bgColor}"/>
                    ${svgContent}
                </svg>
            `.trim().replace(/\s+/g, ' ');

            return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        }

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
            statusDiv.innerHTML = '';
            if (lastSync) {
                const date = new Date(parseInt(lastSync));
                const text = `✅ Données disponibles hors-ligne\nDernière synchronisation : ${date.toLocaleString('fr-FR')}`;
                statusDiv.style.whiteSpace = 'pre-line';
                statusDiv.textContent = text;
            } else {
                statusDiv.textContent = `⚠️ Aucune donnée n'est actuellement sauvegardée sur cet appareil.`;
            }
        }

        // Navigation
        function switchTab(tab) {
            currentTab = tab;
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(el => el.classList.remove('active'));

            if(tab === 'plans' && navItems[0]) navItems[0].classList.add('active');
            if(tab === 'exercices' && navItems[1]) navItems[1].classList.add('active');
            if(tab === 'settings' && navItems[2]) navItems[2].classList.add('active');

            document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
            document.getElementById(`${tab}-section`).classList.add('active');

            if (tab === 'plans') document.getElementById('page-title').textContent = 'Mes Programmes';
            else if (tab === 'exercices') document.getElementById('page-title').textContent = 'Bibliothèque d\'exercices';
            else if (tab === 'settings') document.getElementById('page-title').textContent = 'Paramètres';
            else if (tab === 'quick-workout') document.getElementById('page-title').textContent = 'Séance Rapide';

            document.getElementById('search-input').style.display = tab === 'settings' ? 'none' : 'block';
            document.getElementById('search-input').value = '';

            // Reset views
            if (tab === 'plans') renderPlans(db.plans);
            else if (tab === 'exercices') renderExercices(db.exercices);
            else if (tab === 'settings') updateStatusUI();
            else if (tab === 'quick-workout') renderQuickWorkoutExercices(db.exercices);
        }

        // --- Séance rapide (On the fly) ---
        let selectedQuickExercices = [];
        let webSuggestions = [];
        let searchTimeout = null;

        function openQuickWorkoutSetup() {
            selectedQuickExercices = [];
            webSuggestions = [];
            document.getElementById('web-suggestions-container').style.display = 'none';
            document.getElementById('web-exercices-grid').innerHTML = '';
            switchTab('quick-workout');
        }

        function toggleQuickExercice(exId) {
            const index = selectedQuickExercices.indexOf(exId);
            if (index > -1) {
                selectedQuickExercices.splice(index, 1);
            } else {
                selectedQuickExercices.push(exId);
            }
            updateQuickWorkoutUI();
        }

        function updateQuickWorkoutUI() {
            const btn = document.getElementById('btn-start-quick');
            const btnSet = document.getElementById('btn-settings-quick');
            const countSpan = document.getElementById('quick-count');
            countSpan.textContent = selectedQuickExercices.length;

            if (selectedQuickExercices.length > 0) {
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
                if (selectedQuickExercices.includes(exId)) {
                    card.style.borderColor = 'var(--accent-color)';
                    card.style.boxShadow = '0 0 10px rgba(178, 255, 5, 0.2)';
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
                const isSelected = selectedQuickExercices.includes(ex.id);

                const card = document.createElement('div');
                card.className = 'card quick-ex-card';
                card.dataset.id = ex.id;
                card.style.flexDirection = 'row';
                card.style.alignItems = 'center';
                card.style.padding = '10px';
                card.style.gap = '15px';
                if (isSelected) {
                    card.style.borderColor = 'var(--accent-color)';
                    card.style.boxShadow = '0 0 10px rgba(178, 255, 5, 0.2)';
                }

                card.onclick = () => toggleQuickExercice(ex.id);

                const checkBg = isSelected ? 'var(--accent-color)' : 'transparent';
                const checkTxt = isSelected ? '✓' : '';

                const checkCircle = document.createElement('div');
                checkCircle.className = 'check-circle';
                checkCircle.style.width = '24px';
                checkCircle.style.height = '24px';
                checkCircle.style.borderRadius = '50%';
                checkCircle.style.border = '2px solid var(--accent-color)';
                checkCircle.style.backgroundColor = checkBg;
                checkCircle.style.display = 'flex';
                checkCircle.style.alignItems = 'center';
                checkCircle.style.justifyContent = 'center';
                checkCircle.style.color = 'black';
                checkCircle.style.fontWeight = 'bold';
                checkCircle.style.flexShrink = '0';
                checkCircle.textContent = checkTxt;
                card.appendChild(checkCircle);

                const img = document.createElement('img');
                img.src = imgUrl;
                img.alt = ex.nom;
                img.style.width = '60px';
                img.style.height = '60px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '8px';
                img.style.flexShrink = '0';
                img.loading = 'lazy';
                card.appendChild(img);

                const contentDiv = document.createElement('div');
                contentDiv.style.flexGrow = '1';
                contentDiv.style.overflow = 'hidden';

                const cardTitle = document.createElement('div');
                cardTitle.className = 'card-title';
                cardTitle.style.marginBottom = '2px';
                cardTitle.style.fontSize = '1rem';
                cardTitle.style.whiteSpace = 'nowrap';
                cardTitle.style.overflow = 'hidden';
                cardTitle.style.textOverflow = 'ellipsis';
                cardTitle.textContent = ex.nom;
                contentDiv.appendChild(cardTitle);

                const cardInfo = document.createElement('div');
                cardInfo.style.color = 'var(--text-secondary)';
                cardInfo.style.fontSize = '0.8rem';
                cardInfo.textContent = `${ex.series || 3}x${ex.valeur || 10} | ${ex.repos || 60}s`;
                contentDiv.appendChild(cardInfo);

                card.appendChild(contentDiv);
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

            // Re-render respecting search query
            const query = document.getElementById('search-input').value.toLowerCase();
            const filtered = db.exercices.filter(e =>
                (e.nom && e.nom.toLowerCase().includes(query)) ||
                (e.description && e.description.toLowerCase().includes(query)) ||
                (e.tags && e.tags.toLowerCase().includes(query))
            );
            renderQuickWorkoutExercices(filtered);

            renderWebSuggestions(webSuggestions); // Re-render to update checkmark
        }

        let quickWorkoutDefaults = { series: 3, reps: 10, repos: 60 };

        function openQuickWorkoutSettings() {
            document.getElementById('quick-set-series').value = quickWorkoutDefaults.series;
            document.getElementById('quick-set-reps').value = quickWorkoutDefaults.reps;
            document.getElementById('quick-set-repos').value = quickWorkoutDefaults.repos;
            document.getElementById('modal-quick-settings').classList.add('active');
        }

        function closeQuickWorkoutSettings(event) {
            if (event && event.target !== document.getElementById('modal-quick-settings') && event.target.className !== 'close-btn') {
                return;
            }
            document.getElementById('modal-quick-settings').classList.remove('active');
        }

        function saveQuickWorkoutSettings() {
            quickWorkoutDefaults.series = parseInt(document.getElementById('quick-set-series').value) || 3;
            quickWorkoutDefaults.reps = parseInt(document.getElementById('quick-set-reps').value) || 10;
            quickWorkoutDefaults.repos = parseInt(document.getElementById('quick-set-repos').value) || 60;

            // Appliquer aux exercices locaux (uniquement les exercices de base/web qui n'ont pas encore été modifiés)
            // On le fait dans l'objet global pour que ça s'affiche bien
            db.exercices.forEach(ex => {
                if (selectedQuickExercices.includes(ex.id)) {
                    ex.series = quickWorkoutDefaults.series;
                    if (ex.type === 'reps' || !ex.type) {
                        ex.valeur = quickWorkoutDefaults.reps;
                        ex.type = 'reps';
                    }
                    ex.repos = quickWorkoutDefaults.repos;
                }
            });
            localStorage.setItem('fitness_data', JSON.stringify(db));

            // Re-render respecting search query
            const query = document.getElementById('search-input').value.toLowerCase();
            const filtered = db.exercices.filter(e =>
                (e.nom && e.nom.toLowerCase().includes(query)) ||
                (e.description && e.description.toLowerCase().includes(query)) ||
                (e.tags && e.tags.toLowerCase().includes(query))
            );
            renderQuickWorkoutExercices(filtered);

            closeQuickWorkoutSettings();
            showSuccess("Paramètres appliqués aux exercices sélectionnés.");
        }

        function startQuickWorkout() {
            if (selectedQuickExercices.length === 0) return;

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
                    const grid = document.getElementById('web-exercices-grid');
                    grid.innerHTML = '';
                    const msgDiv = document.createElement('div');
                    msgDiv.style.color = 'var(--text-secondary)';
                    msgDiv.style.fontSize = '0.9rem';
                    msgDiv.textContent = 'Aucune suggestion trouvée en ligne.';
                    grid.appendChild(msgDiv);
                }

            } catch (err) {
                console.error("Erreur API WGER:", err);
                document.getElementById('web-loading').style.display = 'none';
                const grid = document.getElementById('web-exercices-grid');
                grid.innerHTML = '';
                const msgDiv = document.createElement('div');
                msgDiv.style.color = 'var(--text-secondary)';
                msgDiv.style.fontSize = '0.9rem';
                msgDiv.textContent = "Erreur de connexion à l'API.";
                grid.appendChild(msgDiv);
            }
        }

        function renderWebSuggestions(suggestions) {
            const grid = document.getElementById('web-exercices-grid');
            grid.innerHTML = '';

            suggestions.forEach(ex => {
                // Skip if already in local db to avoid duplicates
                if (db.exercices.find(e => e.id === ex.id)) return;

                const imgUrl = getExImage(ex);
                const isSelected = selectedQuickExercices.includes(ex.id);

                const card = document.createElement('div');
                card.className = 'card quick-ex-card';
                card.dataset.id = ex.id;
                card.style.flexDirection = 'row';
                card.style.alignItems = 'center';
                card.style.padding = '10px';
                card.style.gap = '15px';
                if (isSelected) {
                    card.style.borderColor = 'var(--accent-color)';
                    card.style.boxShadow = '0 0 10px rgba(178, 255, 5, 0.2)';
                }

                card.onclick = () => toggleWebExercice(ex.id);

                const checkBg = isSelected ? 'var(--accent-color)' : 'transparent';
                const checkTxt = isSelected ? '✓' : '';

                const checkCircle = document.createElement('div');
                checkCircle.className = 'check-circle';
                checkCircle.style.width = '24px';
                checkCircle.style.height = '24px';
                checkCircle.style.borderRadius = '50%';
                checkCircle.style.border = '2px solid var(--accent-color)';
                checkCircle.style.backgroundColor = checkBg;
                checkCircle.style.display = 'flex';
                checkCircle.style.alignItems = 'center';
                checkCircle.style.justifyContent = 'center';
                checkCircle.style.color = 'black';
                checkCircle.style.fontWeight = 'bold';
                checkCircle.style.flexShrink = '0';
                checkCircle.textContent = checkTxt;
                card.appendChild(checkCircle);

                const img = document.createElement('img');
                img.src = imgUrl;
                img.alt = ex.nom;
                img.style.width = '60px';
                img.style.height = '60px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '8px';
                img.style.flexShrink = '0';
                img.loading = 'lazy';
                card.appendChild(img);

                const contentDiv = document.createElement('div');
                contentDiv.style.flexGrow = '1';
                contentDiv.style.overflow = 'hidden';

                const cardTitle = document.createElement('div');
                cardTitle.className = 'card-title';
                cardTitle.style.marginBottom = '2px';
                cardTitle.style.fontSize = '1rem';
                cardTitle.style.whiteSpace = 'nowrap';
                cardTitle.style.overflow = 'hidden';
                cardTitle.style.textOverflow = 'ellipsis';
                cardTitle.textContent = ex.nom + ' ';

                const webTag = document.createElement('span');
                webTag.className = 'tag';
                webTag.style.background = 'rgba(88, 166, 255, 0.2)';
                webTag.style.color = '#58a6ff';
                webTag.style.fontSize = '0.6rem';
                webTag.textContent = '🌐 WEB';
                cardTitle.appendChild(webTag);

                contentDiv.appendChild(cardTitle);

                const cardInfo = document.createElement('div');
                cardInfo.style.color = 'var(--text-secondary)';
                cardInfo.style.fontSize = '0.8rem';
                cardInfo.textContent = `${ex.series}x${ex.valeur} | ${ex.repos}s`;
                contentDiv.appendChild(cardInfo);

                card.appendChild(contentDiv);
                grid.appendChild(card);
            });
        }

        // Render Plans (Programmes)
        function renderPlans(plansToRender) {
            const grid = document.getElementById('plans-grid');
            grid.innerHTML = '';

            if (plansToRender.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.style.gridColumn = '1 / -1';
                emptyDiv.style.textAlign = 'center';
                emptyDiv.style.padding = '4rem 2rem';
                emptyDiv.style.background = 'var(--surface-color)';
                emptyDiv.style.borderRadius = 'var(--card-radius)';
                emptyDiv.style.border = '1px dashed var(--border-color)';

                const emoji = document.createElement('div');
                emoji.style.fontSize = '3rem';
                emoji.style.marginBottom = '1rem';
                emoji.textContent = '📭';
                emptyDiv.appendChild(emoji);

                const h3 = document.createElement('h3');
                h3.style.color = 'white';
                h3.style.marginBottom = '1rem';
                h3.style.fontSize = '1.5rem';
                h3.textContent = 'Aucun programme trouvé';
                emptyDiv.appendChild(h3);

                const p = document.createElement('p');
                p.style.color = 'var(--text-secondary)';
                p.style.marginBottom = '2rem';
                p.textContent = "Vous n'avez pas encore synchronisé vos données ou la recherche n'a donné aucun résultat.";
                emptyDiv.appendChild(p);

                const btn = document.createElement('button');
                btn.onclick = () => switchTab('settings');
                btn.className = 'btn-action';
                btn.style.maxWidth = '250px';
                btn.textContent = 'ALLER AUX PARAMÈTRES';
                emptyDiv.appendChild(btn);

                grid.appendChild(emptyDiv);
                return;
            }

            // Retrieve completion history
            let history = {};
            try { history = JSON.parse(localStorage.getItem('fitness_history') || '{}'); } catch(e){}

            plansToRender.forEach(plan => {
                const exCount = plan.exercices_ids ? plan.exercices_ids.length : 0;
                const completedCount = history[plan.id] || 0;

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

                if (completedCount > 0) {
                    const badge = document.createElement('div');
                    badge.style.position = 'absolute';
                    badge.style.top = '-10px';
                    badge.style.right = '-10px';
                    badge.style.background = 'var(--accent-color)';
                    badge.style.color = '#000';
                    badge.style.fontWeight = 'bold';
                    badge.style.borderRadius = '50%';
                    badge.style.width = '30px';
                    badge.style.height = '30px';
                    badge.style.display = 'flex';
                    badge.style.alignItems = 'center';
                    badge.style.justifyContent = 'center';
                    badge.style.fontSize = '0.8rem';
                    badge.style.boxShadow = '0 4px 10px rgba(0,0,0,0.5)';
                    badge.style.zIndex = '2';
                    badge.textContent = completedCount;
                    card.appendChild(badge);
                }

                const cardContent = document.createElement('div');
                cardContent.className = 'card-content';

                const cardTitle = document.createElement('div');
                cardTitle.className = 'card-title';
                cardTitle.textContent = plan.nom;
                cardContent.appendChild(cardTitle);

                const cardMeta = document.createElement('div');
                cardMeta.className = 'card-meta';

                const goalTag = document.createElement('span');
                goalTag.className = 'tag';
                goalTag.style.background = 'rgba(178, 255, 5, 0.15)';
                goalTag.style.color = 'var(--accent-color)';
                goalTag.textContent = `${plan.goal}x / sem`;
                cardMeta.appendChild(goalTag);

                const exCountTag = document.createElement('span');
                exCountTag.className = 'tag';
                exCountTag.style.background = 'rgba(88, 166, 255, 0.15)';
                exCountTag.style.color = '#58a6ff';
                exCountTag.textContent = `${exCount} exos`;
                cardMeta.appendChild(exCountTag);

                cardContent.appendChild(cardMeta);

                const cardDesc = document.createElement('div');
                cardDesc.className = 'card-desc';
                cardDesc.textContent = plan.description;
                cardContent.appendChild(cardDesc);

                const cardFooter = document.createElement('div');
                cardFooter.className = 'card-footer';
                cardFooter.style.color = 'var(--accent-color)';
                cardFooter.style.fontWeight = '600';
                const footerSpan = document.createElement('span');
                footerSpan.textContent = 'VOIR LA SÉANCE →';
                cardFooter.appendChild(footerSpan);
                cardContent.appendChild(cardFooter);

                card.appendChild(cardContent);
                grid.appendChild(card);
            });
        }

        // Render Exercices
        function renderExercices(exercicesToRender) {
            const grid = document.getElementById('exercices-grid');
            grid.innerHTML = '';

            if (exercicesToRender.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.style.gridColumn = '1 / -1';
                emptyDiv.style.textAlign = 'center';
                emptyDiv.style.padding = '4rem 2rem';
                emptyDiv.style.background = 'var(--surface-color)';
                emptyDiv.style.borderRadius = 'var(--card-radius)';
                emptyDiv.style.border = '1px dashed var(--border-color)';

                const emoji = document.createElement('div');
                emoji.style.fontSize = '3rem';
                emoji.style.marginBottom = '1rem';
                emoji.textContent = '🏋️';
                emptyDiv.appendChild(emoji);

                const h3 = document.createElement('h3');
                h3.style.color = 'white';
                h3.style.marginBottom = '1rem';
                h3.style.fontSize = '1.5rem';
                h3.textContent = 'Aucun exercice trouvé';
                emptyDiv.appendChild(h3);

                const p = document.createElement('p');
                p.style.color = 'var(--text-secondary)';
                p.style.marginBottom = '2rem';
                p.textContent = "Vous n'avez pas encore synchronisé vos données ou la recherche n'a donné aucun résultat.";
                emptyDiv.appendChild(p);

                const btn = document.createElement('button');
                btn.onclick = () => switchTab('settings');
                btn.className = 'btn-action';
                btn.style.maxWidth = '250px';
                btn.textContent = 'ALLER AUX PARAMÈTRES';
                emptyDiv.appendChild(btn);

                grid.appendChild(emptyDiv);
                return;
            }

            exercicesToRender.forEach(ex => {
                const imgUrl = getExImage(ex);

                const card = document.createElement('div');
                card.className = 'card';
                card.tabIndex = 0;
                card.onclick = () => openExerciceDetails(ex);
                card.onkeydown = (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openExerciceDetails(ex);
                    }
                };

                const imgContainer = document.createElement('div');
                imgContainer.className = 'card-image-container';
                const img = document.createElement('img');
                img.src = imgUrl;
                img.alt = ex.nom;
                img.className = 'card-image';
                img.loading = 'lazy';
                imgContainer.appendChild(img);
                card.appendChild(imgContainer);

                const cardContent = document.createElement('div');
                cardContent.className = 'card-content';

                const cardTitle = document.createElement('div');
                cardTitle.className = 'card-title';
                cardTitle.textContent = ex.nom;
                cardContent.appendChild(cardTitle);

                const cardMeta = document.createElement('div');
                cardMeta.className = 'card-meta';
                cardMeta.style.gap = '5px';

                if (ex.importance) {
                    let color = ex.importance.includes('Haute') ? '#ff3333' : (ex.importance.includes('Moyenne') ? '#ffb300' : '#58a6ff');
                    let bg = ex.importance.includes('Haute') ? 'rgba(255,51,51,0.15)' : (ex.importance.includes('Moyenne') ? 'rgba(255,179,0,0.15)' : 'rgba(88,166,255,0.15)');
                    const impTag = document.createElement('span');
                    impTag.className = 'tag';
                    impTag.style.color = color;
                    impTag.style.background = bg;
                    impTag.style.border = `1px solid ${color}`;
                    impTag.textContent = ex.importance;
                    cardMeta.appendChild(impTag);
                }

                if (ex.frequence) {
                    const freqTag = document.createElement('span');
                    freqTag.className = 'tag';
                    freqTag.style.background = 'rgba(255, 255, 255, 0.1)';
                    freqTag.style.color = 'var(--text-primary)';

                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('style', 'width:12px; height:12px; margin-right:4px; vertical-align:middle;');
                    svg.setAttribute('fill', 'none');
                    svg.setAttribute('stroke', 'currentColor');
                    svg.setAttribute('viewBox', '0 0 24 24');

                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('stroke-linecap', 'round');
                    path.setAttribute('stroke-linejoin', 'round');
                    path.setAttribute('stroke-width', '2');
                    path.setAttribute('d', 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z');

                    svg.appendChild(path);
                    freqTag.appendChild(svg);

                    const textNode = document.createTextNode(`${ex.frequence}x / sem`);
                    freqTag.appendChild(textNode);
                    cardMeta.appendChild(freqTag);
                }

                (ex.tags || '').split(',').filter(t => t.trim() !== '').forEach(t => {
                    const span = document.createElement('span');
                    span.className = 'tag';
                    span.textContent = t.trim();
                    cardMeta.appendChild(span);
                });

                cardContent.appendChild(cardMeta);

                const cardDesc = document.createElement('div');
                cardDesc.className = 'card-desc';
                cardDesc.style.display = '-webkit-box';
                cardDesc.style.webkitLineClamp = '3';
                cardDesc.style.webkitBoxOrient = 'vertical';
                cardDesc.style.overflow = 'hidden';
                cardDesc.style.textOverflow = 'ellipsis';
                cardDesc.textContent = ex.description;
                cardContent.appendChild(cardDesc);

                const cardFooter = document.createElement('div');
                cardFooter.className = 'card-footer';
                const footerSpan1 = document.createElement('span');
                footerSpan1.textContent = `${ex.series} x ${ex.valeur} ${ex.type}`;
                cardFooter.appendChild(footerSpan1);
                const footerSpan2 = document.createElement('span');
                footerSpan2.textContent = `⏱ ${ex.repos}s`;
                cardFooter.appendChild(footerSpan2);
                cardContent.appendChild(cardFooter);

                card.appendChild(cardContent);
                grid.appendChild(card);
            });
        }

        // Settings / Sync Logic
        async function syncData() {
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

        // Search logic
        function handleSearch() {
            const query = document.getElementById('search-input').value.toLowerCase();

            if (currentTab === 'plans') {
                const filtered = db.plans.filter(p =>
                    p.nom.toLowerCase().includes(query) ||
                    p.description.toLowerCase().includes(query)
                );
                renderPlans(filtered);
            } else if (currentTab === 'exercices') {
                const filtered = db.exercices.filter(e =>
                    (e.nom && e.nom.toLowerCase().includes(query)) ||
                    (e.description && e.description.toLowerCase().includes(query)) ||
                    (e.tags && e.tags.toLowerCase().includes(query))
                );
                renderExercices(filtered);
            } else if (currentTab === 'quick-workout') {
                const filtered = db.exercices.filter(e =>
                    (e.nom && e.nom.toLowerCase().includes(query)) ||
                    (e.description && e.description.toLowerCase().includes(query)) ||
                    (e.tags && e.tags.toLowerCase().includes(query))
                );
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

        // Modal Logic
        function openPlanDetails(plan) {
            document.getElementById('modal-title').textContent = plan.nom;
            const meta = document.getElementById('modal-meta');
            meta.innerHTML = '';
            const goalSpan = document.createElement('span');
            goalSpan.className = 'tag';
            goalSpan.textContent = `${plan.goal}x / semaine`;
            meta.appendChild(goalSpan);

            document.getElementById('modal-desc').textContent = plan.description;

            // Setup "Démarrer" button
            document.getElementById('btn-start-workout').onclick = () => startWorkout(plan);

            const list = document.getElementById('modal-ex-list');
            list.innerHTML = '';

            if (plan.exercices_ids) {
                plan.exercices_ids.forEach((id, index) => {
                    const ex = db.exercices.find(e => e.id === id);
                    if (ex) {
                        const imgUrl = getExImage(ex);
                        const li = document.createElement('li');
                        li.className = 'ex-item';
                        li.style.display = 'flex';
                        li.style.gap = '15px';

                        const img = document.createElement('img');
                        img.src = imgUrl;
                        img.alt = ex.nom;
                        img.style.width = '80px';
                        img.style.height = '80px';
                        img.style.objectFit = 'cover';
                        img.style.borderRadius = '8px';
                        img.style.flexShrink = '0';
                        img.loading = 'lazy';
                        li.appendChild(img);

                        const contentDiv = document.createElement('div');
                        contentDiv.style.flexGrow = '1';

                        const h4 = document.createElement('h4');
                        h4.textContent = `${index + 1}. ${ex.nom}`;
                        contentDiv.appendChild(h4);

                        const pInfo = document.createElement('p');
                        pInfo.style.color = 'var(--text-secondary)';
                        pInfo.style.marginBottom = '8px';
                        pInfo.style.fontSize = '0.9rem';
                        pInfo.textContent = `${ex.series} séries de ${ex.valeur} ${ex.type} | Repos: ${ex.repos}s`;
                        contentDiv.appendChild(pInfo);

                        const pDesc = document.createElement('p');
                        pDesc.style.fontSize = '0.95rem';
                        pDesc.textContent = ex.description;
                        contentDiv.appendChild(pDesc);

                        if (ex.video) {
                            const aVideo = document.createElement('a');
                            aVideo.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.video)}`;
                            aVideo.target = '_blank';
                            aVideo.style.color = 'var(--accent-color)';
                            aVideo.style.textDecoration = 'none';
                            aVideo.style.display = 'inline-block';
                            aVideo.style.marginTop = '8px';
                            aVideo.style.fontSize = '0.9em';
                            aVideo.style.marginRight = '15px';
                            aVideo.textContent = '▶ Trouver la vidéo';
                            contentDiv.appendChild(aVideo);
                        }

                        if (ex.repos > 0) {
                            const btnTimer = document.createElement('button');
                            btnTimer.className = 'btn-timer';
                            btnTimer.id = `timer-btn-${index}`;
                            btnTimer.onclick = () => startTimer(ex.repos, `timer-btn-${index}`);
                            btnTimer.textContent = `⏱ Lancer repos (${ex.repos}s)`;
                            contentDiv.appendChild(btnTimer);
                        }

                        li.appendChild(contentDiv);
                        list.appendChild(li);
                    }
                });
            }

            document.getElementById('modal').classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }

        let activeTimers = {};

        function startTimer(duration, buttonId) {
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
                    try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.3); } catch(e){}
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
            document.getElementById('modal-ex-title').textContent = ex.nom;

            const tagsContainer = document.getElementById('modal-ex-meta');
            tagsContainer.innerHTML = '';
            (ex.tags || '').split(',').filter(t => t.trim() !== '').forEach(t => {
                const span = document.createElement('span');
                span.className = 'tag';
                span.textContent = t.trim();
                tagsContainer.appendChild(span);
            });

            const imgUrl = getExImage(ex);
            const imgContainer = document.getElementById('modal-ex-img-container');
            if (imgContainer) {
                imgContainer.innerHTML = '';
                const img = document.createElement('img');
                img.src = imgUrl;
                img.alt = ex.nom;
                img.style.width = '100%';
                img.style.height = '250px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '12px';
                img.style.marginBottom = '1.5rem';
                img.loading = 'lazy';
                imgContainer.appendChild(img);
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

        function startWorkout(plan) {
            if (!plan.exercices_ids || plan.exercices_ids.length === 0) {
                alert("Ce programme ne contient aucun exercice.");
                return;
            }

            // Récupérer et cloner les objets exercices pour permettre la modif à la volée
            const exos = plan.exercices_ids.map(id => {
                const e = db.exercices.find(ex => ex.id === id);
                return e ? JSON.parse(JSON.stringify(e)) : null; // Deep copy
            }).filter(e => e);

            if (exos.length === 0) return;

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
                }
                document.getElementById('workout-ex-target').textContent = targetText;

                document.getElementById('workout-ex-desc').textContent = ex.description;

                const imgUrl = getExImage(ex);
                const imgContainer = document.getElementById('workout-ex-img-container');
                if (imgContainer) {
                    imgContainer.innerHTML = '';
                    const img = document.createElement('img');
                    img.src = imgUrl;
                    img.alt = ex.nom;
                    img.style.maxWidth = '100%';
                    img.style.maxHeight = '200px';
                    img.style.objectFit = 'contain';
                    img.style.borderRadius = '12px';
                    img.loading = 'lazy';
                    imgContainer.appendChild(img);
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
                        bubble.style.boxShadow = '0 0 10px rgba(178, 255, 5, 0.4)';
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
            advanceAfterRest();
        }

        function showWorkoutEnd() {
            document.getElementById('workout-progress').textContent = "Terminé";
            document.getElementById('workout-ex-view').style.display = 'none';
            document.getElementById('workout-rest-view').style.display = 'none';
            document.getElementById('workout-end-view').style.display = 'flex';

            document.getElementById('workout-controls').style.display = 'none';

            // Mettre à jour l'historique de complétion
            let history = {};
            try { history = JSON.parse(localStorage.getItem('fitness_history') || '{}'); } catch(e){}
            history[currentWorkout.planId] = (history[currentWorkout.planId] || 0) + 1;
            localStorage.setItem('fitness_history', JSON.stringify(history));

            // Rafraîchir l'interface (pour le badge)
            renderPlans(db.plans);
        }

        function finishWorkout() {
            quitWorkout();
        }

        function quitWorkout() {
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
            const ex = currentWorkout.exercices[currentWorkout.currentExIndex];

            document.getElementById('edit-ex-series').value = ex.series;

            let type = 'reps';
            if (ex.type === 'secs') type = 'secs';
            if (ex.type === 'kegel') type = 'kegel';
            document.getElementById('edit-ex-type').value = type;

            document.getElementById('edit-ex-valeur').value = ex.valeur;
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

            if (type === 'reps') {
                lblValeur.textContent = "Nombre de répétitions (reps)";
                kegelContainer.style.display = 'none';
            } else if (type === 'secs') {
                lblValeur.textContent = "Temps de maintien total (secs)";
                kegelContainer.style.display = 'none';
            } else if (type === 'kegel') {
                lblValeur.textContent = "Nombre de cycles (C+R)";
                kegelContainer.style.display = 'flex';
            }
        }

        function closeEditExModal(event) {
            if (event && event.target !== document.getElementById('modal-edit-ex') && event.target.className !== 'close-btn') {
                return;
            }
            document.getElementById('modal-edit-ex').classList.remove('active');
        }

        function saveEditEx() {
            const series = parseInt(document.getElementById('edit-ex-series').value) || 1;
            const type = document.getElementById('edit-ex-type').value;
            const valeur = parseInt(document.getElementById('edit-ex-valeur').value) || 1;
            const repos = parseInt(document.getElementById('edit-ex-repos').value) || 0;
            const kOn = parseInt(document.getElementById('edit-ex-kegel-on').value) || 5;
            const kOff = parseInt(document.getElementById('edit-ex-kegel-off').value) || 5;

            // Update current workout instance ONLY
            const ex = currentWorkout.exercices[currentWorkout.currentExIndex];
            ex.series = series;
            ex.type = type;
            ex.valeur = valeur;
            ex.repos = repos;
            if (type === 'kegel') {
                ex.kegel_on = kOn;
                ex.kegel_off = kOff;
            }

            closeEditExModal();
            renderWorkoutStep(); // re-render step to apply changes visually
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
            document.getElementById('modal-ex').classList.remove('active');
            document.body.style.overflow = 'auto';
        }

        function closeModal(event) {
            if (event && event.target !== document.getElementById('modal') && event.target.className !== 'close-btn') {
                return;
            }
            stopAllTimers();
            document.getElementById('modal').classList.remove('active');
            document.body.style.overflow = 'auto';
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
