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
    fetch('config/data.json?ts=' + Date.now())
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

    // Meta tags
    const ogImage = document.getElementById('og-image');
    if (ogImage && safeData.hero.type === 'image' && safeData.hero.url) {
        ogImage.setAttribute('content', safeData.hero.url);
    }
    const ogDescription = document.getElementById('og-description');
    if (ogDescription && safeData.details.subtitle) {
        ogDescription.setAttribute('content', safeData.details.subtitle);
    }
    const pageTitle = document.getElementById('page-title');
    if (pageTitle && safeData.details.subtitle) {
        pageTitle.textContent = safeData.details.subtitle;
    }
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && safeData.details.subtitle) {
        ogTitle.setAttribute('content', safeData.details.subtitle);
    }


    const navNames = document.getElementById('nav-names');

    // Tema
    root.style.setProperty('--color-primary', safeData.theme.primaryColor || '#6c757d');
    root.style.setProperty('--color-secondary', safeData.theme.secondaryColor || '#adb5bd');
    root.style.setProperty('--color-bg', safeData.theme.backgroundColor || '#f8f9fa');
    root.style.setProperty('--color-primary-rgb', hexToRgb(safeData.theme.primaryColor || '#6c757d'));

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
    const regSection = document.getElementById('registry');
    const urlParams = new URLSearchParams(window.location.search);
    const regalosParam = urlParams.get('regalos');

    // La sección solo se muestra si está habilitada Y el parámetro 'regalos' es 'true'
    if (safeData.giftRegistry && safeData.giftRegistry.enabled && regalosParam === 'true') {
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
        // Se oculta si no está habilitada o si el parámetro no es correcto
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

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
}