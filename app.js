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
            if (lastSync) {
                const date = new Date(parseInt(lastSync));
                statusDiv.innerHTML = `✅ Données disponibles hors-ligne<br>Dernière synchronisation : ${date.toLocaleString('fr-FR')}`;
            } else {
                statusDiv.innerHTML = `⚠️ Aucune donnée n'est actuellement sauvegardée sur cet appareil.`;
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
            else document.getElementById('page-title').textContent = 'Paramètres';

            document.getElementById('search-input').style.display = tab === 'settings' ? 'none' : 'block';
            document.getElementById('search-input').value = '';

            // Reset views
            if (tab === 'plans') renderPlans(db.plans);
            else if (tab === 'exercices') renderExercices(db.exercices);
            else updateStatusUI(); // Update settings UI
        }

        // Render Plans (Programmes)
        function renderPlans(plansToRender) {
            const grid = document.getElementById('plans-grid');
            grid.innerHTML = '';

            if (plansToRender.length === 0) {
                grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">Aucun programme trouvé.</div>';
                return;
            }

            // Retrieve completion history
            let history = {};
            try { history = JSON.parse(localStorage.getItem('fitness_history') || '{}'); } catch(e){}

            plansToRender.forEach(plan => {
                const exCount = plan.exercices_ids ? plan.exercices_ids.length : 0;
                const completedCount = history[plan.id] || 0;
                const badge = completedCount > 0 ? `<div style="position: absolute; top: -10px; right: -10px; background: var(--accent-color); color: #000; font-weight: bold; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; box-shadow: 0 4px 10px rgba(0,0,0,0.5); z-index: 2;">${completedCount}</div>` : '';

                const card = document.createElement('div');
                card.className = 'card';
                card.style.position = 'relative';
                card.onclick = () => openPlanDetails(plan);
                card.innerHTML = `
                    ${badge}
                    <div class="card-content">
                        <div class="card-title">${plan.nom}</div>
                        <div class="card-meta">
                            <span class="tag" style="background: rgba(178, 255, 5, 0.15); color: var(--accent-color);">${plan.goal}x / sem</span>
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
                grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">Aucun exercice trouvé.</div>';
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
                card.onclick = () => openExerciceDetails(ex); // Changed to be clickable
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
            const url = document.getElementById('api-url').value.trim();
            if (!url) {
                showError("Veuillez entrer une URL valide.");
                return;
            }

            showLoader();
            hideError();
            hideSuccess();

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
            } else {
                const filtered = db.exercices.filter(e =>
                    (e.nom && e.nom.toLowerCase().includes(query)) ||
                    (e.description && e.description.toLowerCase().includes(query)) ||
                    (e.tags && e.tags.toLowerCase().includes(query))
                );
                renderExercices(filtered);
            }
        }

        // Modal Logic
        function openPlanDetails(plan) {
            document.getElementById('modal-title').textContent = plan.nom;
            document.getElementById('modal-meta').innerHTML = `<span class="tag">${plan.goal}x / semaine</span>`;
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
                        li.innerHTML = `
                            <img src="${imgUrl}" alt="${ex.nom}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; flex-shrink: 0;" loading="lazy">
                            <div style="flex-grow: 1;">
                                <h4>${index + 1}. ${ex.nom}</h4>
                                <p style="color: var(--text-secondary); margin-bottom: 8px; font-size: 0.9rem;">${ex.series} séries de ${ex.valeur} ${ex.type} | Repos: ${ex.repos}s</p>
                                <p style="font-size: 0.95rem;">${ex.description}</p>
                                ${ex.video ? `<a href="https://www.youtube.com/results?search_query=${ex.video}" target="_blank" style="color: var(--accent-color); text-decoration: none; display: inline-block; margin-top: 8px; font-size: 0.9em; margin-right: 15px;">▶ Trouver la vidéo</a>` : ''}
                                ${ex.repos > 0 ? `<button class="btn-timer" id="timer-btn-${index}" onclick="startTimer(${ex.repos}, 'timer-btn-${index}')">⏱ Lancer repos (${ex.repos}s)</button>` : ''}
                            </div>
                        `;
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

        function startWorkout(plan) {
            if (!plan.exercices_ids || plan.exercices_ids.length === 0) {
                alert("Ce programme ne contient aucun exercice.");
                return;
            }

            // Récupérer les objets exercices
            const exos = plan.exercices_ids.map(id => db.exercices.find(e => e.id === id)).filter(e => e);
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
                document.getElementById('workout-ex-target').textContent = `${ex.series} x ${ex.valeur} ${ex.type}`;
                document.getElementById('workout-ex-desc').textContent = ex.description;

                const imgUrl = getExImage(ex);
                const imgContainer = document.getElementById('workout-ex-img-container');
                if (imgContainer) {
                    imgContainer.innerHTML = `<img src="${imgUrl}" alt="${ex.nom}" style="max-width: 100%; max-height: 200px; object-fit: contain; border-radius: 12px;" loading="lazy">`;
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
            document.getElementById('workout-screen').style.display = 'none';
            document.getElementById('workout-controls').style.display = 'block'; // Reset for next time
            document.body.style.overflow = 'auto';
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
