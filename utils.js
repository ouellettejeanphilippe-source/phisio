/**
 * Utilitaire: Obtenir l'image d'un exercice (Fallback visuel hors-ligne)
 * @param {Object} ex - L'objet exercice
 * @returns {string} - URL de l'image (data URI ou lien direct)
 */
function getExImage(ex) {
    if (ex.image && ex.image.trim() !== "") {
        return ex.image;
    }

    const name = (ex.nom || "").toLowerCase();
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getExImage };
}
