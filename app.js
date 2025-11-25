let currentData = {};
let bgMusic = document.getElementById('bg-music');

document.addEventListener('DOMContentLoaded', () => {
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

            // Envelope animado
            document.getElementById('envelope-names').innerHTML = `${data.wedding.brideName} <br>&<br> ${data.wedding.groomName}`;
            document.getElementById('envelope-date').textContent = formatDateMexico(data.wedding.eventDate);
            document.getElementById('welcome-envelope').style.display = 'flex';
            document.getElementById('main-content').style.display = 'none';
            document.body.style.overflow = 'hidden'; // Desactiva scroll
            document.getElementById('open-envelope-btn').onclick = function () {
                document.getElementById('welcome-envelope').classList.add('opened');
                setTimeout(() => {
                    document.getElementById('welcome-envelope').style.display = 'none';
                    document.getElementById('main-content').style.display = '';
                    document.body.style.overflow = ''; // Reactiva scroll
                }, 1200);
            };

            // Console log para depurar que los datos existen
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
            // Cierra el modal sin mostrar popups
            if (adminModalInstance) adminModalInstance.hide();
            minimizedBar.style.display = '';
            // Deshabilita el botón de admin en navbar
            const btnAdmin = document.getElementById('btn-admin-mode');
            if (btnAdmin) btnAdmin.classList.add('disabled');
            if (btnAdmin) btnAdmin.setAttribute('aria-disabled', 'true');
            if (btnAdmin) btnAdmin.style.pointerEvents = 'none';
        });
        // Restaurar
        restoreBtn && restoreBtn.addEventListener('click', () => {
            if (adminModalInstance) adminModalInstance.show();
            minimizedBar.style.display = 'none';
            // Habilita el botón de admin en navbar
            const btnAdmin = document.getElementById('btn-admin-mode');
            if (btnAdmin) btnAdmin.classList.remove('disabled');
            if (btnAdmin) btnAdmin.removeAttribute('aria-disabled');
            if (btnAdmin) btnAdmin.style.pointerEvents = '';
        });
        // Confirmar cierre si hay cambios SOLO con botón cerrar
        const closeBtn = adminModal.querySelector('.modal-header .btn-close');
        if (closeBtn) {
            closeBtn.replaceWith(closeBtn.cloneNode(true));
            const newCloseBtn = adminModal.querySelector('.modal-header .btn-close');
            newCloseBtn.addEventListener('click', (e) => {
                // Comparar el JSON actual con el original
                const currentConfigJSON = JSON.stringify(currentData);
                if (originalConfigJSON && currentConfigJSON !== originalConfigJSON) {
                    e.preventDefault();
                    e.stopPropagation();
                    // Mostrar solo el modal de confirmación, sin cerrar el de edición
                    confirmCloseModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmCloseModal'));
                    confirmCloseModal.show();
                } // Si no hay cambios, cerrar el modal normalmente
                // (No hacemos nada aquí, Bootstrap se encarga de cerrar el modal)
            });
        }
        // Botón cancelar del modal de confirmación: solo cierra el modal de confirmación
        const cancelBtn = document.querySelector('#confirmCloseModal .btn-secondary');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                confirmCloseModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmCloseModal'));
                confirmCloseModal.hide();
            });
        }
        // Botón salir sin guardar: restaura el JSON original y cierra el panel de edición
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
            // Habilita el botón de admin en navbar
            const btnAdmin = document.getElementById('btn-admin-mode');
            if (btnAdmin) btnAdmin.classList.remove('disabled');
            if (btnAdmin) btnAdmin.removeAttribute('aria-disabled');
            if (btnAdmin) btnAdmin.style.pointerEvents = '';
        });
        // Salir sin guardar
        document.getElementById('confirm-close-admin').addEventListener('click', () => {
            hasUnsavedChanges = false;
            confirmCloseModal.hide();
            adminModalInstance.hide();
            minimizedBar.style.display = 'none';
            // Habilita el botón de admin en navbar
            const btnAdmin = document.getElementById('btn-admin-mode');
            if (btnAdmin) btnAdmin.disabled = false;
        });
        // Al guardar, limpiar flag
        document.querySelector('.btn-success[onclick="downloadConfig()"]')?.addEventListener('click', () => {
            hasUnsavedChanges = false;
        });
    }
    // Botón +Evento en el body
    const addItineraryBtn = document.getElementById('add-itinerary-btn');
    if (addItineraryBtn) {
        addItineraryBtn.addEventListener('click', () => {
            window.addItineraryItem();
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
function formatDateMexico(isoDateString) {
    if (!isoDateString) return "";
    const date = new Date(isoDateString);
    return new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Mexico_City',
        day: 'numeric', month: 'long', year: 'numeric'
    }).format(date);
}

// --- UTILIDADES DE FORMATO PARA INPUTS (Para el panel de admin) ---
// Corrige el problema de fechas vacías en el editor
function toInputDate(isoString) {
    if (!isoString) return "";
    // El input datetime-local solo acepta los primeros 16 caracteres: YYYY-MM-DDTHH:MM
    return isoString.substring(0, 16);
}

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

    // Colores
    const primaryColor = safeData.theme.primaryColor || '#6c757d';
    const secondaryColor = safeData.theme.secondaryColor || '#adb5bd';

    // Aplica color a textos y botón específicos
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
        const parentList = [
            { label: 'Padre del Novio', data: safeData.parents.groomFather },
            { label: 'Madre del Novio', data: safeData.parents.groomMother },
            { label: 'Padre de la Novia', data: safeData.parents.brideFather },
            { label: 'Madre de la Novia', data: safeData.parents.brideMother }
        ];
        parentList.forEach(parent => {
            if (!parent.data) return;
            const emoji = parent.data.deceased ? '🕊️ ' : '';
            parentsSection.innerHTML += `<div class='col-12 col-md-6 mb-2'><div class='p-3 border rounded bg-light'><span class='fw-bold'>${parent.label}:</span> ${emoji}${parent.data.name || ''}</div></div>`;
        });
    }

    // Botón Add to Calendar dinámico
    const calendarContainer = document.getElementById('calendar-btn-container');
    if (calendarContainer && safeData.wedding) {
        calendarContainer.innerHTML = '';
        const atcb = document.createElement('add-to-calendar-button');
        atcb.setAttribute('name', `Boda de ${safeData.wedding.groomName || ''} & ${safeData.wedding.brideName || ''}`);
        atcb.setAttribute('start-date', (safeData.wedding.eventDate || '').split('T')[0]);
        atcb.setAttribute('start-time', (safeData.wedding.eventDate || '').split('T')[1] || '16:00');
        atcb.setAttribute('end-date', (safeData.wedding.eventDate || '').split('T')[0]);
        atcb.setAttribute('end-time', '23:59');
        atcb.setAttribute('location', safeData.details.location || 'Ver invitación para dirección.');
        atcb.setAttribute('organizer', `${safeData.wedding.groomName || ''} & ${safeData.wedding.brideName || ''}`);
        atcb.setAttribute('organizer-email', 'novios@email.com');
        atcb.setAttribute('description', safeData.eventGuidelines || '¡Acompáñanos en este día tan especial!');
        atcb.setAttribute('options', 'Apple,Google,Outlook,Microsoft365,Outlook.com,ICS');
        atcb.setAttribute('time-zone', 'America/Mexico_City');
        atcb.setAttribute('hide-background', '');
        atcb.setAttribute('light-mode', 'system');
        calendarContainer.appendChild(atcb);
    }

    // Fechas Visuales
    setText('hero-date', formatDateMexico(safeData.wedding.eventDate));
    setText('rsvp-deadline', formatDateMexico(safeData.wedding.rsvpDeadline));

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
        musicBtn.style.display = 'flex';
        if (bgMusic.getAttribute('src') !== safeData.music.url) bgMusic.src = safeData.music.url;
    } else {
        musicBtn.style.display = 'none';
        bgMusic.pause();
    }

    // Itinerario Dinámico (24h a 12h, animación en cascada)
    const itinContainer = document.getElementById('itinerary-container');
    if (itinContainer) {
        itinContainer.innerHTML = '';
        safeData.itinerary.forEach((item, idx) => {
            const time12 = item.time ? new Date(`1970-01-01T${item.time}`).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
            const delayClass = `animated-fadein-text delay-${idx + 1}`;
            itinContainer.innerHTML += `
                <div class="timeline-item ${delayClass}">
                    <h5 class="fw-bold">${time12} - ${item.activity}</h5>
                    <p class="text-muted mb-0">${item.description || ''}</p>
                </div>`;
        });
    }

    // Mesa de regalos: solo si enabled
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

    // Formspree
    const form = document.getElementById('rsvp-form');
    if (form) {
        form.action = `https://formspree.io/f/${safeData.rsvp.formspreeId || ''}`;
        // Controlar el campo de teléfono según el flag phoneRequired
        const phoneInput = form.querySelector('input[name="telefono"]');
        if (phoneInput) {
            if (safeData.rsvp.phoneRequired) {
                phoneInput.required = true;
                phoneInput.parentElement.style.display = '';
            } else {
                phoneInput.required = false;
                phoneInput.parentElement.style.display = '';
            }
        }
    }
}

// Helper seguro para asignar texto
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
}

// --- ADMINISTRACIÓN Y SEGURIDAD ---
let adminModalInstance = null; // Instancia global
let originalConfigJSON = null; // Guardar el JSON original para comparar cambios

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
            // 2. Si es correcto, CONSTRUIMOS el form con los datos ACTUALES (currentData)
            console.log("Abriendo editor con datos:", currentData);
            buildAdminForm();
            if (!adminModalInstance) {
                adminModalInstance = bootstrap.Modal.getOrCreateInstance(document.getElementById('adminModal'));
            }
            // Guardar snapshot del JSON original para comparar cambios
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
    container.innerHTML = ''; // Limpiamos para redibujar desde cero

    // Aseguramos que todas las secciones existan en currentData
    if (!currentData.wedding) currentData.wedding = {};
    if (!currentData.hero) currentData.hero = {};
    if (!currentData.theme) currentData.theme = {};
    if (!currentData.music) currentData.music = {};
    if (!currentData.details) currentData.details = {};
    if (!currentData.giftRegistry) currentData.giftRegistry = { buttons: [] };
    if (!currentData.giftRegistry.buttons) currentData.giftRegistry.buttons = [];
    if (!currentData.itinerary) currentData.itinerary = [];
    if (!currentData.rsvp) currentData.rsvp = {};

    // --- HELPER DE INPUT ---
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

    // HELPER para agregar títulos sin perder los inputs previos
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

    // Fechas
    container.appendChild(createInput("Fecha Evento (Inicio)", currentData.wedding.eventDate, "datetime-local", v => { currentData.wedding.eventDate = v; renderSite(currentData); }, "col-6"));
    container.appendChild(createInput("Límite RSVP", currentData.wedding.rsvpDeadline, "date", v => { currentData.wedding.rsvpDeadline = v; renderSite(currentData); }, "col-6"));

    // 2. PORTADA (HERO)
    addSectionTitle("Portada");
    container.appendChild(createInput("Subtítulo", currentData.hero.preTitle, "text", v => { currentData.hero.preTitle = v; renderSite(currentData); }));
    container.appendChild(createInput("CTA Text", currentData.hero.ctaText, "text", v => { currentData.hero.ctaText = v; renderSite(currentData); }));
    container.appendChild(createInput("URL Imagen/Video", currentData.hero.url, "text", v => { currentData.hero.url = v; renderSite(currentData); }));

    // Select Tipo Fondo
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
    const musicDiv = document.createElement('div');
    musicDiv.className = "col-12 d-flex align-items-center";
    musicDiv.innerHTML = `
        <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" ${currentData.music.enabled ? 'checked' : ''}>
            <label class="form-check-label small fw-bold ms-2">Activar Música</label>
        </div>`;
    musicDiv.querySelector('input').addEventListener('change', (e) => { currentData.music.enabled = e.target.checked; renderSite(currentData); });
    container.appendChild(musicDiv);
    container.appendChild(createInput("URL Música (MP3)", currentData.music.url, "text", v => { currentData.music.url = v; renderSite(currentData); }));

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
    container.appendChild(createInput("Formspree ID", currentData.rsvp.formspreeId, "text", v => { currentData.rsvp.formspreeId = v; renderSite(currentData); }));
    // Checkbox para hacer obligatorio el teléfono
    const phoneReqDiv = document.createElement('div');
    phoneReqDiv.className = "col-12 d-flex align-items-center mb-2";
    phoneReqDiv.innerHTML = `
        <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="phone-required-switch" ${currentData.rsvp.phoneRequired ? 'checked' : ''}>
            <label class="form-check-label small fw-bold ms-2" for="phone-required-switch">Teléfono obligatorio</label>
        </div>`;
    phoneReqDiv.querySelector('input').addEventListener('change', (e) => { currentData.rsvp.phoneRequired = e.target.checked; renderSite(currentData); });
    container.appendChild(phoneReqDiv);

    // 7. ITINERARIO
    addSectionTitle("Itinerario");
    currentData.itinerary.forEach((item, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = "col-12 border rounded p-2 mb-2 bg-light";
        wrapper.innerHTML = `<div class="d-flex justify-content-between text-muted mb-2"><small>Evento ${index + 1}</small> <button type="button" class="btn-close btn-sm" onclick="removeItineraryItem(${index})"></button></div>`;
        const row = document.createElement('div');
        row.className = "row g-2";
        // Input hora en formato 12 hrs
        row.appendChild(createInput("Hora", item.time, "time", (v => {
            return v2 => { currentData.itinerary[v].time = v2; renderSite(currentData); };
        })(index), "col-3", false, true));
        row.appendChild(createInput("Actividad", item.activity, "text", (v => {
            return v2 => { currentData.itinerary[v].activity = v2; renderSite(currentData); };
        })(index), "col-9"));
        row.appendChild(createInput("Descripción", item.description, "text", (v => {
            return v2 => { currentData.itinerary[v].description = v2; renderSite(currentData); };
        })(index), "col-12"));
        wrapper.appendChild(row);
        container.appendChild(wrapper);
    });

    // 8. MESA REGALOS
    addSectionTitle("Regalos");
    // Checkbox para habilitar/deshabilitar mesa de regalos
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

    // El resto de los campos de mesa de regalos se deshabilitan si está deshabilitada
    const regDisabled = !currentData.giftRegistry.enabled;
    container.appendChild(createInput("Mensaje Regalos", currentData.giftRegistry.description, "text", v => { currentData.giftRegistry.description = v; renderSite(currentData); }, undefined, regDisabled));
    currentData.giftRegistry.buttons.forEach((btn, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = "col-12 border rounded p-2 mb-2 bg-light";
        wrapper.innerHTML = `<div class="d-flex justify-content-between text-muted mb-2"><small>Botón ${index + 1}</small> <button type="button" class="btn-close btn-sm" onclick="removeRegistryItem(${index})" ${regDisabled ? 'disabled' : ''}></button></div>`;
        const row = document.createElement('div');
        row.className = "row g-2";
        row.appendChild(createInput("Tienda", btn.provider, "text", (v => {
            return v2 => { currentData.giftRegistry.buttons[v].provider = v2; renderSite(currentData); };
        })(index), "col-4", regDisabled));
        row.appendChild(createInput("Link", btn.url, "text", (v => {
            return v2 => { currentData.giftRegistry.buttons[v].url = v2; renderSite(currentData); };
        })(index), "col-8", regDisabled));
        wrapper.appendChild(row);
        container.appendChild(wrapper);
    });
    // Botón +Regalo deshabilitado si regDisabled
    const addBtnDiv = document.createElement('div');
    addBtnDiv.className = "col-12 text-end mb-2";
    const addBtn = document.createElement('button');
    addBtn.type = "button";
    addBtn.className = "btn btn-info text-white";
    addBtn.textContent = "+ Regalo";
    if (regDisabled) addBtn.disabled = true;
    addBtn.onclick = window.addRegistryItem;
    addBtnDiv.appendChild(addBtn);
    container.appendChild(addBtnDiv);

    // 9. RECOMENDACIONES EVENTO
    addSectionTitle("Recomendaciones para los invitados");
    const guidelinesDiv = document.createElement('div');
    guidelinesDiv.className = "col-12";
    const guidelinesLabel = document.createElement('label');
    guidelinesLabel.className = 'form-label small fw-bold';
    guidelinesLabel.textContent = 'Recomendaciones (separadas por salto de línea)';
    const guidelinesTextarea = document.createElement('textarea');
    guidelinesTextarea.className = 'form-control';
    guidelinesTextarea.rows = 6;
    guidelinesTextarea.value = currentData.eventGuidelines || '';
    guidelinesTextarea.addEventListener('input', (e) => {
        currentData.eventGuidelines = e.target.value;
        renderSite(currentData);
    });
    guidelinesDiv.appendChild(guidelinesLabel);
    guidelinesDiv.appendChild(guidelinesTextarea);
    container.appendChild(guidelinesDiv);

    // 10. PADRES DE LOS NOVIOS
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
        // Nombre
        row.appendChild(createInput(parent.label, (parents[parent.key] && parents[parent.key].name) || '', 'text', v => {
            if (!parents[parent.key]) parents[parent.key] = { name: '', deceased: false };
            parents[parent.key].name = v;
            renderSite(currentData);
        }, 'col-8'));
        // Fallecido
        const deceasedDiv = document.createElement('div');
        deceasedDiv.className = 'col-4 d-flex align-items-center';
        const deceasedLabel = document.createElement('label');
        deceasedLabel.className = 'form-label small fw-bold ms-2';
        deceasedLabel.textContent = '¿Fallecido?';
        const deceasedInput = document.createElement('input');
        deceasedInput.type = 'checkbox';
        deceasedInput.className = 'form-check-input ms-2';
        deceasedInput.checked = !!(parents[parent.key] && parents[parent.key].deceased);
        deceasedInput.addEventListener('change', (e) => {
            if (!parents[parent.key]) parents[parent.key] = { name: '', deceased: false };
            parents[parent.key].deceased = e.target.checked;
            renderSite(currentData);
        });
        deceasedDiv.appendChild(deceasedInput);
        deceasedDiv.appendChild(deceasedLabel);
        row.appendChild(deceasedDiv);
        container.appendChild(row);
    });
}

// --- FUNCIONES GLOBALES (Para que el HTML pueda llamarlas) ---
window.addItineraryItem = function () {
    if (!currentData.itinerary) currentData.itinerary = [];
    currentData.itinerary.push({ time: "00:00", activity: "Nueva Actividad", description: "" });
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
    currentData.giftRegistry.buttons.push({ provider: "Tienda", url: "https://" });
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

    alert("✅ Archivo data.json generado. Súbelo a GitHub.");
};