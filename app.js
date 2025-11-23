let currentData = {}; 
let bgMusic = document.getElementById('bg-music');

document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar configuración inicial
    fetch('data.json')
        .then(response => {
            if (!response.ok) throw new Error("No se pudo leer data.json");
            return response.json();
        })
        .then(data => {
            currentData = data;
            // Guardamos una copia para detectar cambios si fuera necesario
            populateAdminForm(); // Rellenar formulario oculto al inicio
            renderSite(data);
            
            // Ocultar título de carga
            document.getElementById('page-title').textContent = data.meta?.title || "Boda";
        })
        .catch(error => {
            console.error('Error crítico:', error);
            alert("Error cargando la configuración. Revisa la consola.");
        });
    
    // Configurar listeners del panel de admin
    setupAdminListeners();
});

// --- RENDERIZADO DEL SITIO ---
function renderSite(data) {
    const root = document.documentElement;
    
    // Tema (Validación simple para evitar errores si faltan colores)
    if (data.theme) {
        root.style.setProperty('--color-primary', data.theme.primaryColor || '#6c757d');
        root.style.setProperty('--color-secondary', data.theme.secondaryColor || '#adb5bd');
        root.style.setProperty('--color-bg', data.theme.backgroundColor || '#f8f9fa');
    }

    // Helpers seguros para texto
    const safeText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text || '';
    };

    safeText('hero-pretitle', data.hero?.preTitle);
    safeText('hero-names', data.hero?.names);
    safeText('hero-date', data.hero?.dateString);
    safeText('hero-cta', data.hero?.ctaText);
    safeText('details-desc', data.details?.description);

    // Lógica Hero (Video vs Imagen)
    const imgDiv = document.getElementById('hero-bg-image');
    const vidTag = document.getElementById('hero-bg-video');
    
    // Pausar video si cambiamos a imagen para ahorrar recursos
    if (data.hero?.type === 'video') {
        imgDiv.style.display = 'none';
        vidTag.style.display = 'block';
        // Solo actualizar src si cambió para evitar parpadeos
        if(vidTag.src !== data.hero.url) {
            vidTag.src = data.hero.url;
            vidTag.play().catch(e => console.log("Autoplay bloqueado hasta interacción"));
        }
    } else {
        vidTag.style.display = 'none';
        vidTag.pause(); 
        imgDiv.style.display = 'block';
        imgDiv.style.backgroundImage = `url('${data.hero?.url}')`;
    }

    // Lógica Música
    const musicBtn = document.getElementById('music-control');
    if (data.music && data.music.enabled) {
        musicBtn.style.display = 'flex';
        // Solo setear src si es diferente
        if (bgMusic.src !== data.music.url) bgMusic.src = data.music.url;
    } else {
        musicBtn.style.display = 'none';
        bgMusic.pause();
    }
}

function toggleMusic() {
    if (bgMusic.paused) {
        bgMusic.play().then(() => {
            document.getElementById('music-control').classList.add('playing-animation');
        }).catch(e => alert("No se pudo reproducir. Verifica la URL del MP3."));
    } else {
        bgMusic.pause();
        document.getElementById('music-control').classList.remove('playing-animation');
    }
}

// --- LÓGICA DE ADMINISTRACIÓN ---

async function openAdminMode() {
    const password = prompt("🔒 Acceso Novios: Introduce la contraseña");
    if (!password) return;

    const inputHash = CryptoJS.SHA256(password).toString();

    try {
        const response = await fetch('secret.bin');
        if (!response.ok) throw new Error("Falta el archivo secret.bin");
        
        const trueHash = await response.text();
        
        // TRIM es vital aquí: elimina espacios o saltos de línea invisibles
        if (inputHash.trim() === trueHash.trim()) {
            populateAdminForm(); 
            const adminModal = new bootstrap.Modal(document.getElementById('adminModal'));
            adminModal.show();
        } else {
            alert("⛔ Contraseña incorrecta");
        }
    } catch (e) {
        console.error(e);
        alert("Error de seguridad: " + e.message);
    }
}

function populateAdminForm() {
    if (!currentData.hero) return; // Protección si no ha cargado data

    document.getElementById('input-hero-names').value = currentData.hero.names || '';
    document.getElementById('input-hero-type').value = currentData.hero.type || 'image';
    document.getElementById('input-hero-url').value = currentData.hero.url || '';
    
    document.getElementById('input-music-enabled').checked = currentData.music?.enabled || false;
    document.getElementById('input-music-url').value = currentData.music?.url || '';

    document.getElementById('input-color-primary').value = currentData.theme?.primaryColor || '#000000';
    document.getElementById('input-color-secondary').value = currentData.theme?.secondaryColor || '#000000';
}

function setupAdminListeners() {
    // Helper para actualizar datos
    const updateData = (path, value) => {
        // Logica simple para actualizar objetos anidados
        const keys = path.split('.');
        if(keys.length === 2) {
            if(!currentData[keys[0]]) currentData[keys[0]] = {};
            currentData[keys[0]][keys[1]] = value;
        }
        renderSite(currentData);
    };

    // Hero Listeners
    document.getElementById('input-hero-names').addEventListener('input', e => updateData('hero.names', e.target.value));
    document.getElementById('input-hero-type').addEventListener('change', e => updateData('hero.type', e.target.value));
    document.getElementById('input-hero-url').addEventListener('input', e => updateData('hero.url', e.target.value));

    // Music Listeners
    document.getElementById('input-music-enabled').addEventListener('change', e => updateData('music.enabled', e.target.checked));
    document.getElementById('input-music-url').addEventListener('input', e => updateData('music.url', e.target.value));

    // Color Listeners
    document.getElementById('input-color-primary').addEventListener('input', e => updateData('theme.primaryColor', e.target.value));
    document.getElementById('input-color-secondary').addEventListener('input', e => updateData('theme.secondaryColor', e.target.value));
}

function downloadConfig() {
    if (currentData.music?.enabled && !currentData.music?.url) {
        alert("⚠️ Falta la URL de la música.");
        return;
    }

    const dataStr = JSON.stringify(currentData, null, 2);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = "data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    alert("✅ Archivo generado. ¡Súbelo a GitHub!");
}