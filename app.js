let currentData = {};
let bgMusic = document.getElementById('bg-music');
let countdownInterval = null; // Variable para el timer

document.addEventListener('DOMContentLoaded', () => {
    // 0. Forzar scroll al inicio y evitar restauración automática
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    // 1. Cargar configuración inicial
    fetch('data.json?ts=' + Date.now())
        .then(response => {
            if (!response.ok) throw new Error("No se pudo leer data.json");
            return response.json();
        })
        .then(data => {
            // Asignamos a la variable global
            currentData = data;

            // Renderizamos el sitio
            renderSite(data);

            // 1.1 Envelope animado
            // Asignamos textos visuales
            document.getElementById('envelope-names').innerHTML = `${data.wedding.brideName} <br>&<br> ${data.wedding.groomName}`;
            // Fecha con formato moderno (bullets) para el sobre
            document.getElementById('envelope-date').textContent = formatDateMexico(data.wedding.eventDate, true);
            
            // Mostrar sobre, ocultar contenido
            const envContainer = document.getElementById('welcome-envelope');
            envContainer.style.display = 'flex';
            document.getElementById('main-content').style.display = 'none';
            document.body.style.overflow = 'hidden'; // Desactiva scroll
            
            // Lógica de apertura
            document.getElementById('open-envelope-btn').onclick = function () {
                // 1. Iniciar animación visual
                envContainer.classList.add('opened');
                
                // 2. Intentar reproducir música si está habilitada
                if (currentData.music && currentData.music.enabled) {
                    const audio = document.getElementById('bg-music');
                    // Usamos una lógica directa aquí para asegurar el "Play"
                    if (audio.paused) {
                        window.toggleMusic(); 
                    }
                }

                // 3. Temporizador para ocultar el sobre y mostrar contenido
                setTimeout(() => {
                    envContainer.style.display = 'none';
                    document.getElementById('main-content').style.display = '';
                    document.body.style.overflow = ''; // Reactiva scroll
                }, 1200);
            };

            // Console log para depurar
            console.log("Configuración cargada:", currentData);
        })
        .catch(error => {
            console.error(error);
            alert("Error cargando configuración. Revisa la consola.");
        });

    // Listener del botón Admin
    const btnAdmin = document.getElementById('btn-admin-mode');
    if (btnAdmin) {
        btnAdmin.addEventListener('click', (e) => {
            e.preventDefault();
            openAdminMode();
        });
    }

    // Minimizar admin modal
    const adminModal = document.getElementById('adminModal');
    const minimizeBtn = document.getElementById('minimize-admin-modal');
    const minimizedBar = document.getElementById('admin-modal-minimized');
    const restoreBtn = document.getElementById('restore-admin-modal');
    let confirmCloseModal = null;
    let hasUnsavedChanges = false;

    if (adminModal) {
        adminModalInstance = bootstrap.Modal.getOrCreateInstance(adminModal);
        // Minimizar
        minimizeBtn && minimizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (adminModalInstance) adminModalInstance.hide();
            minimizedBar.style.display = '';
            const btnAdmin = document.getElementById('btn-admin-mode');
            if (btnAdmin) {
                btnAdmin.classList.add('disabled');
                btnAdmin.style.pointerEvents = 'none';
            }
        });
        // Restaurar
        restoreBtn && restoreBtn.addEventListener('click', () => {
            if (adminModalInstance) adminModalInstance.show();
            minimizedBar.style.display = 'none';
            const btnAdmin = document.getElementById('btn-admin-mode');
            if (btnAdmin) {
                btnAdmin.classList.remove('disabled');
                btnAdmin.style.pointerEvents = '';
            }
        });
        // Confirmar cierre si hay cambios
        const closeBtn = adminModal.querySelector('.modal-header .btn-close');
        if (closeBtn) {
            closeBtn.replaceWith(closeBtn.cloneNode(true));
            const newCloseBtn = adminModal.querySelector('.modal-header .btn-close');
            newCloseBtn.addEventListener('click', (e) => {
                const currentConfigJSON = JSON.stringify(currentData);
                if (originalConfigJSON && currentConfigJSON !== originalConfigJSON) {
                    e.preventDefault();
                    e.stopPropagation();
                    confirmCloseModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmCloseModal'));
                    confirmCloseModal.show();
                }
            });
        }
        // Botón cancelar del modal de confirmación
        const cancelBtn = document.querySelector('#confirmCloseModal .btn-secondary');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                confirmCloseModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmCloseModal'));
                confirmCloseModal.hide();
            });
        }
        // Botón salir sin guardar
        document.getElementById('confirm-close-admin').addEventListener('click', () => {
            if (originalConfigJSON) {
                const restored = JSON.parse(originalConfigJSON);
                Object.keys(currentData).forEach(k => delete currentData[k]);
                Object.assign(currentData, restored);
                renderSite(currentData);
                buildAdminForm();
            }
            confirmCloseModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmCloseModal'));
            confirmCloseModal.hide();
            if (adminModalInstance) adminModalInstance.hide();
            minimizedBar.style.display = 'none';
            const btnAdmin = document.getElementById('btn-admin-mode');
            if (btnAdmin) {
                btnAdmin.classList.remove('disabled');
                btnAdmin.style.pointerEvents = '';
            }
            hasUnsavedChanges = false;
        });
        // Al guardar, limpiar flag
        document.querySelector('.btn-success[onclick="downloadConfig()"]')?.addEventListener('click', () => {
            hasUnsavedChanges = false;
        });
    }
});

// Animación de fade-in al hacer scroll
function animateOnScroll() {
    const animatedEls = document.querySelectorAll('.animated-fadein, .animated-fadein-slow');
    const trigger = window.innerHeight * 0.92;
    animatedEls.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < trigger) {
            el.style.animationPlayState = 'running';
            el.classList.add('fadein-visible');
        }
    });
    // Animación en cascada para textos internos
    document.querySelectorAll('.animated-fadein-text').forEach(el => {
        const parentSection = el.closest('.animated-fadein, .animated-fadein-slow');
        if (parentSection && parentSection.classList.contains('fadein-visible')) {
            el.style.animationPlayState = 'running';
        }
    });
}
window.addEventListener('scroll', animateOnScroll);
window.addEventListener('DOMContentLoaded', animateOnScroll);

// --- UTILIDADES DE FORMATO VISUAL (Para el usuario) ---
function formatDateMexico(isoDateString, isModernStyle = true) {
    if (!isoDateString) return "";
    const date = new Date(isoDateString);
    const options = { timeZone: 'America/Mexico_City' };

    if (isModernStyle) {
        // Formato Moderno: 26 • diciembre • 2025
        const day = new Intl.DateTimeFormat('es-MX', { ...options, day: 'numeric' }).format(date);
        const month = new Intl.DateTimeFormat('es-MX', { ...options, month: 'long' }).format(date);
        const year = new Intl.DateTimeFormat('es-MX', { ...options, year: 'numeric' }).format(date);
        return `${day} • ${month} • ${year}`;
    } else {
        // Formato Tradicional: 26 de diciembre de 2025
        return new Intl.DateTimeFormat('es-MX', {
            ...options,
            day: 'numeric', month: 'long', year: 'numeric'
        }).format(date);
    }
}

// --- UTILIDADES DE FORMATO PARA INPUTS (Para el panel de admin) ---
function toInputDate(isoString) {
    if (!isoString) return "";
    return isoString.substring(0, 16);
}

// Helper seguro para asignar texto
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
}

// --- CONTROL DE MÚSICA ---
window.toggleMusic = function() {
    const audio = document.getElementById('bg-music');
    const btnContainer = document.getElementById('music-control');
    const btnIcon = btnContainer ? btnContainer.querySelector('i') : null;
    
    // Si no hay audio o fuente, no hacemos nada
    if (!audio || !audio.src || !btnIcon) return;

    if (audio.paused) {
        audio.play().then(() => {
            btnIcon.classList.remove('bi-music-note-beamed');
            btnIcon.classList.add('bi-pause-circle');
            if(btnContainer) btnContainer.classList.add('playing-animation');
        }).catch(error => {
            console.log("Reproducción bloqueada: ", error);
        });
    } else {
        audio.pause();
        btnIcon.classList.remove('bi-pause-circle');
        btnIcon.classList.add('bi-music-note-beamed');
        if(btnContainer) btnContainer.classList.remove('playing-animation');
    }
};

// --- RENDERIZADO PRINCIPAL DEL SITIO ---
function renderSite(data) {
    const root = document.documentElement;

    // Validamos que existan las secciones principales para evitar errores
    const safeData = {
        theme: data.theme || {},
        wedding: data.wedding || {},
        hero: data.hero || {},
        details: data.details || {},
        music: data.music || {},
        itinerary: data.itinerary || [],
        giftRegistry: data.giftRegistry || { buttons: [] },
        rsvp: data.rsvp || {},
        parents: data.parents || {},
        eventGuidelines: data.eventGuidelines || ''
    };

    const navNames = document.getElementById('nav-names');

    // Tema
    root.style.setProperty('--color-primary', safeData.theme.primaryColor || '#6c757d');
    root.style.setProperty('--color-secondary', safeData.theme.secondaryColor || '#adb5bd');
    root.style.setProperty('--color-bg', safeData.theme.backgroundColor || '#f8f9fa');

    // Colores y Textos específicos
    const primaryColor = safeData.theme.primaryColor || '#6c757d';
    const secondaryColor = safeData.theme.secondaryColor || '#adb5bd';

    const invitadoH2 = document.querySelector('.envelope-letter-content h2.script-font');
    if (invitadoH2) invitadoH2.style.color = primaryColor;
    const envelopeNames = document.getElementById('envelope-names');
    if (envelopeNames) envelopeNames.style.color = primaryColor;
    
    const openEnvelopeBtn = document.getElementById('open-envelope-btn');
    if (openEnvelopeBtn) {
        openEnvelopeBtn.style.background = `linear-gradient(90deg, ${primaryColor} 0%, ${secondaryColor} 100%)`;
        openEnvelopeBtn.style.color = '#fff';
        openEnvelopeBtn.style.border = 'none';
    }
    if (navNames) navNames.style.color = primaryColor;

    // Nombres y Títulos
    const groom = safeData.wedding.groomName || "Novio";
    const bride = safeData.wedding.brideName || "Novia";
    const fullName = `${bride} <br>&<br> ${groom}`;
    document.title = `Boda de ${bride} & ${groom} - ¡Estás invitado!`;

    if (navNames) navNames.textContent = `${bride.charAt(0)} & ${groom.charAt(0)}`;
    const heroNames = document.getElementById('hero-names');
    if (heroNames) heroNames.innerHTML = fullName;

    // Textos
    setText('hero-pretitle', safeData.hero.preTitle);
    setText('hero-cta', safeData.hero.ctaText);
    setText('details-desc', safeData.details.description);
    setText('registry-desc', safeData.giftRegistry.description);

    // Reglas del evento
    const guidelinesBox = document.getElementById('event-guidelines');
    if (guidelinesBox) guidelinesBox.value = safeData.eventGuidelines || '';

    // Padres de los novios
    const parentsSection = document.getElementById('parents-section');
    if (parentsSection && safeData.parents) {
        parentsSection.innerHTML = '';

        // Helper para renderizar nombres con emoji si aplica
        const renderParentName = (person) => {
            if (!person || !person.name) return '';
            const emoji = person.deceased ? '🕊️ ' : '';
            return `<div class="fs-6 mb-1">${emoji}${person.name}</div>`;
        };

        // 1. Bloque Padres de la NOVIA (Primero)
        const brideBlock = `
            <div class='col-6 mb-2'>
                <div class='p-3 border rounded bg-light h-100 d-flex flex-column justify-content-center align-items-center'>
                    <h5 class="script-font mb-2" style="color: var(--color-primary);">Padres de la Novia</h5>
                    ${renderParentName(safeData.parents.brideFather)}
                    ${renderParentName(safeData.parents.brideMother)}
                </div>
            </div>`;

        // 2. Bloque Padres del NOVIO (Segundo)
        const groomBlock = `
            <div class='col-6 mb-2'>
                <div class='p-3 border rounded bg-light h-100 d-flex flex-column justify-content-center align-items-center'>
                    <h5 class="script-font mb-2" style="color: var(--color-primary);">Padres del Novio</h5>
                    ${renderParentName(safeData.parents.groomFather)}
                    ${renderParentName(safeData.parents.groomMother)}
                </div>
            </div>`;

        // Insertamos los bloques
        parentsSection.innerHTML = brideBlock + groomBlock;
    }

    // Botón Add to Calendar dinámico (HTML Injection)
    const calendarContainer = document.getElementById('calendar-btn-container');
    if (calendarContainer && safeData.wedding && safeData.wedding.eventDate) {
        
        const isoDate = safeData.wedding.eventDate; 
        const [datePart, timePart] = isoDate.includes('T') ? isoDate.split('T') : [isoDate, '00:00'];

        const atcbHTML = `
            <add-to-calendar-button
                name="Boda de ${safeData.wedding.brideName} & ${safeData.wedding.groomName}"
                description="${safeData.eventGuidelines || '¡Gracias por acompañarnos!'}"
                startDate="${datePart}"
                startTime="${timePart}"
                endDate="${datePart}"
                endTime="23:59"
                timeZone="America/Mexico_City"
                location="${safeData.details.location || 'Ubicación pendiente'}"
                options="'Apple','Google','iCal','Outlook.com','Yahoo','Microsoft365'"
                buttonStyle="round"
                lightMode="bodyScheme"
                organizer="${safeData.wedding.brideName} & ${safeData.wedding.groomName}"
                organizerEmail="boda@ejemplo.com"
            ></add-to-calendar-button>
        `;
        calendarContainer.innerHTML = atcbHTML;
    } else if (calendarContainer) {
        calendarContainer.innerHTML = '';
    }

    // Fechas Visuales
    setText('hero-date', formatDateMexico(safeData.wedding.eventDate, true)); // Moderno
    setText('rsvp-deadline', formatDateMexico(safeData.wedding.rsvpDeadline, false)); // Tradicional

    // --- LÓGICA DE CUENTA REGRESIVA ---
    const countdownContainer = document.getElementById('hero-countdown');
    if (countdownInterval) clearInterval(countdownInterval);

    if (countdownContainer && safeData.wedding.eventDate) {
        const targetDate = new Date(safeData.wedding.eventDate).getTime();

        const updateTimer = () => {
            const now = new Date().getTime();
            const distance = targetDate - now;

            if (distance < 0) {
                clearInterval(countdownInterval);
                countdownContainer.innerHTML = '<div class="badge bg-light text-dark fs-5 px-4 py-2 opacity-75">¡Es hoy!</div>';
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            const itemHTML = (num, label) => `
                <div class="countdown-item">
                    <div class="countdown-number">${num < 10 ? '0' + num : num}</div>
                    <div class="countdown-label">${label}</div>
                </div>`;

            countdownContainer.innerHTML = 
                itemHTML(days, 'Días') + 
                itemHTML(hours, 'Hs') + 
                itemHTML(minutes, 'Min') + 
                itemHTML(seconds, 'Seg');
        };

        updateTimer();
        countdownInterval = setInterval(updateTimer, 1000);
    } else if (countdownContainer) {
        countdownContainer.innerHTML = '';
    }

    // Lógica Hero Media
    const imgDiv = document.getElementById('hero-bg-image');
    const vidTag = document.getElementById('hero-bg-video');

    if (safeData.hero.type === 'video') {
        imgDiv.style.display = 'none';
        vidTag.style.display = 'block';
        if (vidTag.getAttribute('src') !== safeData.hero.url) vidTag.src = safeData.hero.url;
    } else {
        vidTag.style.display = 'none';
        vidTag.pause();
        imgDiv.style.display = 'block';
        imgDiv.style.backgroundImage = `url('${safeData.hero.url}')`;
    }

    // Música
    const musicBtn = document.getElementById('music-control');
    if (safeData.music.enabled) {
        // Bloquear botón si preventPause es true
        if (safeData.music.preventPause) {
            musicBtn.style.display = 'none';
        } else {
            musicBtn.style.display = 'flex';
        }
        // Actualizar fuente
        if (bgMusic.getAttribute('src') !== safeData.music.url) {
            bgMusic.src = safeData.music.url;
        }
    } else {
        musicBtn.style.display = 'none';
        bgMusic.pause();
    }

    // Itinerario Dinámico (Animación en cascada via JS)
    const itinContainer = document.getElementById('itinerary-container');
    if (itinContainer) {
        itinContainer.innerHTML = '';
        safeData.itinerary.forEach((item, idx) => {
            const time12 = item.time ? new Date(`1970-01-01T${item.time}`).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
            
            // Retraso dinámico: 300ms * índice
            const delayMs = idx * 300; 

            itinContainer.innerHTML += `
                <div class="timeline-item animated-fadein-text" style="animation-delay: ${delayMs}ms;">
                    <h5 class="fw-bold">${time12} - ${item.activity}</h5>
                    <p class="text-muted mb-0">${item.description || ''}</p>
                </div>`;
        });
    }

    // Mesa de regalos
    const regContainer = document.getElementById('registry-buttons');
    const regSection = regContainer ? regContainer.closest('.section-padding') : null;
    if (safeData.giftRegistry && safeData.giftRegistry.enabled) {
        if (regContainer) {
            regContainer.innerHTML = '';
            safeData.giftRegistry.buttons.forEach(btn => {
                regContainer.innerHTML += `
                    <a href="${btn.url}" target="_blank" class="btn btn-outline-dark px-4 py-2">
                        <i class="bi bi-gift me-2"></i>${btn.provider}
                    </a>`;
            });
        }
        if (regSection) regSection.style.display = '';
    } else if (regSection) {
        regSection.style.display = 'none';
    }

    // Lógica de Envío RSVP (Google Apps Script o Formspree)
    const form = document.getElementById('rsvp-form');
    // Prioridad: URL de Google Script. Si no existe, usamos Formspree.
    const googleScriptURL = safeData.rsvp.scriptUrl;

    if (form) {
        // Clonamos para limpiar listeners previos
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        // Lógica de Envío
        if (googleScriptURL) {
            // OPCIÓN A: Google Apps Script (AJAX)
            newForm.removeAttribute('action');
            
            newForm.addEventListener('submit', e => {
                e.preventDefault();
                const btnSubmit = newForm.querySelector('button[type="submit"]');
                const originalText = btnSubmit.textContent;
                
                btnSubmit.disabled = true;
                btnSubmit.textContent = "Enviando...";

                const formData = new FormData(newForm);
                const dataObj = Object.fromEntries(formData.entries());

                fetch(googleScriptURL, {
                    method: 'POST',
                    mode: 'no-cors', // Necesario para Google Scripts
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dataObj)
                })
                .then(() => {
                    alert("¡Gracias! Tu confirmación ha sido enviada.");
                    newForm.reset();
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert("Hubo un error al enviar. Intenta de nuevo.");
                })
                .finally(() => {
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = originalText;
                });
            });

        } else {
            // OPCIÓN B: Formspree (Fallback)
            newForm.action = `https://formspree.io/f/${safeData.rsvp.formspreeId || ''}`;
        }

        // Controlar el campo de teléfono
        const phoneInput = newForm.querySelector('input[name="telefono"]');
        if (phoneInput) {
            if (safeData.rsvp.phoneRequired) {
                phoneInput.required = true;
                // Visualmente indicar que es requerido si tu CSS lo soporta
                phoneInput.placeholder = "Teléfono (Obligatorio)";
            } else {
                phoneInput.required = false;
                phoneInput.placeholder = "Teléfono (Opcional)";
            }
        }
    }
}

// --- ADMINISTRACIÓN Y SEGURIDAD ---
let adminModalInstance = null;
let originalConfigJSON = null;

async function openAdminMode() {
    // 1. Pedir contraseña
    const password = prompt("🔒 Acceso Novios: Introduce la contraseña");
    if (!password) return;

    const inputHash = CryptoJS.SHA256(password).toString();

    try {
        const response = await fetch('secret.bin');
        if (!response.ok) throw new Error("Falta secret.bin");
        const trueHash = await response.text();
        if (inputHash.trim() === trueHash.trim()) {
            // 2. Si es correcto, CONSTRUIMOS el form
            console.log("Abriendo editor con datos:", currentData);
            buildAdminForm();
            if (!adminModalInstance) {
                adminModalInstance = bootstrap.Modal.getOrCreateInstance(document.getElementById('adminModal'));
            }
            // Snapshot para comparar cambios
            fetch('data.json?ts=' + Date.now())
                .then(r => r.json())
                .then(json => { originalConfigJSON = JSON.stringify(json); });
            adminModalInstance.show();
        } else {
            alert("⛔ Contraseña incorrecta");
        }
    } catch (e) {
        console.error(e);
        alert("Error de seguridad: " + e.message);
    }
}

// --- CONSTRUCTOR DE FORMULARIO (BUILDER) ---
function buildAdminForm() {
    const container = document.getElementById('admin-form-container');
    container.innerHTML = ''; 

    // Aseguramos estructura de datos
    if (!currentData.wedding) currentData.wedding = {};
    if (!currentData.hero) currentData.hero = {};
    if (!currentData.theme) currentData.theme = {};
    if (!currentData.music) currentData.music = {};
    if (!currentData.details) currentData.details = {};
    if (!currentData.giftRegistry) currentData.giftRegistry = { buttons: [] };
    if (!currentData.giftRegistry.buttons) currentData.giftRegistry.buttons = [];
    if (!currentData.itinerary) currentData.itinerary = [];
    if (!currentData.rsvp) currentData.rsvp = {};

    // Helper de Input
    const createInput = (label, value, type, callback, colClass = "col-12", disabled = false, is12hTime = false) => {
        const div = document.createElement('div');
        div.className = colClass;
        div.innerHTML = `<label class="form-label small fw-bold">${label}</label>`;
        const input = document.createElement('input');
        input.className = type === 'color' ? 'form-control form-control-color w-100' : 'form-control';
        input.type = type;
        if (type === 'datetime-local') {
            input.value = toInputDate(value);
        } else if (type === 'time' && is12hTime) {
            input.value = value || '';
            input.step = 60;
            input.setAttribute('pattern', '(0[1-9]|1[0-2]):[0-5][0-9]');
            input.setAttribute('placeholder', 'hh:mm AM/PM');
            input.setAttribute('data-format', '12');
        } else {
            input.value = value || '';
        }
        if (disabled) input.disabled = true;
        input.addEventListener('input', (e) => callback(e.target.value));
        div.appendChild(input);
        return div;
    };

    const addSectionTitle = (title) => {
        const h6 = document.createElement('h6');
        h6.className = 'w-100 border-bottom pb-2 mt-4 text-primary';
        h6.textContent = title;
        container.appendChild(h6);
    };

    // 1. NOVIOS
    addSectionTitle("Los Novios");
    container.appendChild(createInput("Nombre Novio", currentData.wedding.groomName, "text", v => { currentData.wedding.groomName = v; renderSite(currentData); }, "col-6"));
    container.appendChild(createInput("Nombre Novia", currentData.wedding.brideName, "text", v => { currentData.wedding.brideName = v; renderSite(currentData); }, "col-6"));
    container.appendChild(createInput("Fecha Evento", currentData.wedding.eventDate, "datetime-local", v => { currentData.wedding.eventDate = v; renderSite(currentData); }, "col-6"));
    container.appendChild(createInput("Límite RSVP", currentData.wedding.rsvpDeadline, "date", v => { currentData.wedding.rsvpDeadline = v; renderSite(currentData); }, "col-6"));

    // 2. PORTADA
    addSectionTitle("Portada");
    container.appendChild(createInput("Subtítulo", currentData.hero.preTitle, "text", v => { currentData.hero.preTitle = v; renderSite(currentData); }));
    container.appendChild(createInput("CTA Text", currentData.hero.ctaText, "text", v => { currentData.hero.ctaText = v; renderSite(currentData); }));
    container.appendChild(createInput("URL Imagen/Video", currentData.hero.url, "text", v => { currentData.hero.url = v; renderSite(currentData); }));
    
    const typeDiv = document.createElement('div');
    typeDiv.className = "col-6";
    typeDiv.innerHTML = `<label class="form-label small fw-bold">Tipo Fondo</label>
        <select class="form-select">
            <option value="image" ${currentData.hero.type === 'image' ? 'selected' : ''}>Imagen</option>
            <option value="video" ${currentData.hero.type === 'video' ? 'selected' : ''}>Video</option>
        </select>`;
    typeDiv.querySelector('select').addEventListener('change', (e) => { currentData.hero.type = e.target.value; renderSite(currentData); });
    container.appendChild(typeDiv);

    // 3. MÚSICA
    addSectionTitle("Música");
    const musicControlsDiv = document.createElement('div');
    musicControlsDiv.className = "col-12 d-flex flex-wrap gap-3 mb-2";
    const isMusicEnabled = currentData.music.enabled;
    musicControlsDiv.innerHTML = `
        <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="musicEnableCheck" ${isMusicEnabled ? 'checked' : ''}>
            <label class="form-check-label small fw-bold ms-2" for="musicEnableCheck">Activar Música</label>
        </div>
        <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="musicPreventPauseCheck" 
                   ${currentData.music.preventPause ? 'checked' : ''} ${!isMusicEnabled ? 'disabled' : ''}>
            <label class="form-check-label small fw-bold ms-2" for="musicPreventPauseCheck">Bloquear control</label>
        </div>`;
    
    musicControlsDiv.querySelector('#musicEnableCheck').addEventListener('change', (e) => {
        currentData.music.enabled = e.target.checked;
        buildAdminForm(); 
        renderSite(currentData);
    });
    musicControlsDiv.querySelector('#musicPreventPauseCheck').addEventListener('change', (e) => {
        currentData.music.preventPause = e.target.checked;
        renderSite(currentData);
    });
    container.appendChild(musicControlsDiv);
    container.appendChild(createInput("URL Música (MP3)", currentData.music.url, "text", v => { currentData.music.url = v; renderSite(currentData); }, "col-12", !isMusicEnabled));

    // 4. DETALLES
    addSectionTitle("Detalles");
    container.appendChild(createInput("Descripción", currentData.details.description, "text", v => { currentData.details.description = v; renderSite(currentData); }));

    // 5. ESTILOS
    addSectionTitle("Estilos");
    container.appendChild(createInput("Color Principal", currentData.theme.primaryColor, "color", v => { currentData.theme.primaryColor = v; renderSite(currentData); }, "col-6"));
    container.appendChild(createInput("Color Secundario", currentData.theme.secondaryColor, "color", v => { currentData.theme.secondaryColor = v; renderSite(currentData); }, "col-6"));
    container.appendChild(createInput("Color Fondo", currentData.theme.backgroundColor, "color", v => { currentData.theme.backgroundColor = v; renderSite(currentData); }, "col-6"));

    // 6. RSVP
    addSectionTitle("RSVP");
    
    const phoneReqDiv = document.createElement('div');
    phoneReqDiv.className = "col-12 d-flex align-items-center mb-2";
    phoneReqDiv.innerHTML = `
        <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="phone-required-switch" ${currentData.rsvp.phoneRequired ? 'checked' : ''}>
            <label class="form-check-label small fw-bold ms-2">Teléfono obligatorio</label>
        </div>`;
    phoneReqDiv.querySelector('input').addEventListener('change', (e) => { currentData.rsvp.phoneRequired = e.target.checked; renderSite(currentData); });
    container.appendChild(phoneReqDiv);

    // --- SETUP AUTOMÁTICO DE GOOGLE (Option A) ---
    const googleSetupContainer = document.createElement('div');
    googleSetupContainer.className = "col-12 mt-3 p-3 border rounded bg-white shadow-sm";
    googleSetupContainer.innerHTML = `
        <h6 class="text-primary"><i class="bi bi-google me-2"></i>Google Sheets</h6>
        <p class="small text-muted mb-2">
            Crea automáticamente la hoja de Excel en tu cuenta de Google.
        </p>
        
        <button type="button" class="btn btn-outline-primary w-100 mb-2" id="btn-google-setup" disabled onclick="handleGoogleSetup()">
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Cargando Google...
        </button>
        
        <div id="google-setup-status" style="display:none; font-size: 0.85rem;"></div>

        <label class="form-label small fw-bold mt-2">URL del Script (Pegar resultado aquí)</label>
        <input type="text" class="form-control font-monospace small" id="google-script-url-input" 
               placeholder="https://script.google.com/..." 
               value="${currentData.rsvp.scriptUrl || ''}">
    `;
    const urlInput = googleSetupContainer.querySelector('#google-script-url-input');
    urlInput.addEventListener('input', (e) => {
        if(!currentData.rsvp) currentData.rsvp = {}; 
        currentData.rsvp.scriptUrl = e.target.value; 
    });
    container.appendChild(googleSetupContainer);


    // 7. ITINERARIO
    addSectionTitle("Itinerario");
    currentData.itinerary.forEach((item, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = "col-12 border rounded p-2 mb-2 bg-light";
        wrapper.innerHTML = `<div class="d-flex justify-content-between text-muted mb-2"><small>Evento ${index + 1}</small> <button type="button" class="btn-close btn-sm" onclick="removeItineraryItem(${index})"></button></div>`;
        const row = document.createElement('div');
        row.className = "row g-2";
        row.appendChild(createInput("Hora", item.time, "time", v => { currentData.itinerary[index].time = v; renderSite(currentData); }, "col-3", false, true));
        row.appendChild(createInput("Actividad", item.activity, "text", v => { currentData.itinerary[index].activity = v; renderSite(currentData); }, "col-9"));
        row.appendChild(createInput("Descripción", item.description, "text", v => { currentData.itinerary[index].description = v; renderSite(currentData); }, "col-12"));
        wrapper.appendChild(row);
        container.appendChild(wrapper);
    });
    // Botón +Evento
    const addItinBtnDiv = document.createElement('div');
    addItinBtnDiv.className = "col-12 text-end mb-2";
    const addItinBtn = document.createElement('button');
    addItinBtn.type = "button";
    addItinBtn.className = "btn btn-primary text-white"; 
    addItinBtn.textContent = "+ Evento";
    addItinBtn.onclick = window.addItineraryItem;
    addItinBtnDiv.appendChild(addItinBtn);
    container.appendChild(addItinBtnDiv);

    // 8. REGALOS
    addSectionTitle("Regalos");
    const regEnableDiv = document.createElement('div');
    regEnableDiv.className = "col-12 d-flex align-items-center mb-2";
    regEnableDiv.innerHTML = `
        <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="giftRegistryEnabled" ${currentData.giftRegistry.enabled ? 'checked' : ''}>
            <label class="form-check-label small fw-bold ms-2">Habilitar Mesa de Regalos</label>
        </div>`;
    regEnableDiv.querySelector('input').addEventListener('change', (e) => {
        currentData.giftRegistry.enabled = e.target.checked;
        buildAdminForm();
        renderSite(currentData);
    });
    container.appendChild(regEnableDiv);

    const regDisabled = !currentData.giftRegistry.enabled;
    container.appendChild(createInput("Mensaje Regalos", currentData.giftRegistry.description, "text", v => { currentData.giftRegistry.description = v; renderSite(currentData); }, undefined, regDisabled));
    currentData.giftRegistry.buttons.forEach((btn, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = "col-12 border rounded p-2 mb-2 bg-light";
        wrapper.innerHTML = `<div class="d-flex justify-content-between text-muted mb-2"><small>Botón ${index + 1}</small> <button type="button" class="btn-close btn-sm" onclick="removeRegistryItem(${index})" ${regDisabled ? 'disabled' : ''}></button></div>`;
        const row = document.createElement('div');
        row.className = "row g-2";
        row.appendChild(createInput("Tienda", btn.provider, "text", v => { currentData.giftRegistry.buttons[index].provider = v; renderSite(currentData); }, "col-4", regDisabled));
        row.appendChild(createInput("Link", btn.url, "text", v => { currentData.giftRegistry.buttons[index].url = v; renderSite(currentData); }, "col-8", regDisabled));
        wrapper.appendChild(row);
        container.appendChild(wrapper);
    });
    const addBtnDiv = document.createElement('div');
    addBtnDiv.className = "col-12 text-end mb-2";
    const addBtn = document.createElement('button');
    addBtn.type = "button";
    addBtn.className = "btn btn-info text-white";
    addBtn.textContent = "+ Regalo";
    addBtn.disabled = regDisabled;
    addBtn.onclick = window.addRegistryItem;
    addBtnDiv.appendChild(addBtn);
    container.appendChild(addBtnDiv);

    // 9. GUÍA
    addSectionTitle("Recomendaciones");
    const guidelinesDiv = document.createElement('div');
    guidelinesDiv.className = "col-12";
    const guidelinesTextarea = document.createElement('textarea');
    guidelinesTextarea.className = 'form-control';
    guidelinesTextarea.rows = 4;
    guidelinesTextarea.value = currentData.eventGuidelines || '';
    guidelinesTextarea.addEventListener('input', (e) => { currentData.eventGuidelines = e.target.value; renderSite(currentData); });
    guidelinesDiv.appendChild(guidelinesTextarea);
    container.appendChild(guidelinesDiv);

    // 10. PADRES
    addSectionTitle("Padres de los Novios");
    const parents = currentData.parents || {};
    const parentFields = [
        { key: 'groomFather', label: 'Padre del Novio' },
        { key: 'groomMother', label: 'Madre del Novio' },
        { key: 'brideFather', label: 'Padre de la Novia' },
        { key: 'brideMother', label: 'Madre de la Novia' }
    ];
    parentFields.forEach(parent => {
        const row = document.createElement('div');
        row.className = 'row g-2 mb-2';
        row.appendChild(createInput(parent.label, (parents[parent.key] && parents[parent.key].name) || '', 'text', v => {
            if (!parents[parent.key]) parents[parent.key] = { name: '', deceased: false };
            parents[parent.key].name = v;
            renderSite(currentData);
        }, 'col-8'));
        
        const deceasedDiv = document.createElement('div');
        deceasedDiv.className = 'col-4 d-flex align-items-center';
        const deceasedInput = document.createElement('input');
        deceasedInput.type = 'checkbox';
        deceasedInput.className = 'form-check-input ms-2';
        deceasedInput.checked = !!(parents[parent.key] && parents[parent.key].deceased);
        deceasedInput.addEventListener('change', (e) => {
            if (!parents[parent.key]) parents[parent.key] = { name: '', deceased: false };
            parents[parent.key].deceased = e.target.checked;
            renderSite(currentData);
        });
        deceasedDiv.innerHTML = `<label class="small fw-bold ms-1">Fallecido</label>`;
        deceasedDiv.prepend(deceasedInput);
        row.appendChild(deceasedDiv);
        container.appendChild(row);
    });
}

// --- FUNCIONES GLOBALES ---
window.addItineraryItem = function () {
    if (!currentData.itinerary) currentData.itinerary = [];
    currentData.itinerary.push({ time: "18:00", activity: "Nuevo Evento", description: "" });
    buildAdminForm();
    renderSite(currentData);
};
window.removeItineraryItem = function (index) {
    currentData.itinerary.splice(index, 1);
    buildAdminForm();
    renderSite(currentData);
};
window.addRegistryItem = function () {
    if (!currentData.giftRegistry) currentData.giftRegistry = { buttons: [] };
    if (!currentData.giftRegistry.buttons) currentData.giftRegistry.buttons = [];
    currentData.giftRegistry.buttons.push({ provider: "Amazon", url: "https://" });
    buildAdminForm();
    renderSite(currentData);
};
window.removeRegistryItem = function (index) {
    currentData.giftRegistry.buttons.splice(index, 1);
    buildAdminForm();
    renderSite(currentData);
};
window.downloadConfig = function () {
    const dataStr = JSON.stringify(currentData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    alert("✅ data.json descargado. Recuerda subirlo a GitHub.");
};