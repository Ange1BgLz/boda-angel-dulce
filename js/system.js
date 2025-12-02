// system.js

// --- ADMINISTRACIÓN Y SEGURIDAD ---
let adminModalInstance = null;
let originalConfigJSON = null;

async function openAdminMode() {
    // 1. Pedir contraseña
    const password = prompt("🔒 Acceso Novios: Introduce la contraseña");
    if (!password) return;

    const inputHash = CryptoJS.SHA256(password).toString();

    try {
        const response = await fetch('config/secret.bin');
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
            fetch('config/data.json?ts=' + Date.now())
                .then(r => r.json())
                .then(json => { originalConfigJSON = JSON.stringify(json, null, 2); });
            
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
    container.appendChild(createInput("Subtítulo (para redes sociales)", currentData.details.subtitle, "text", v => { currentData.details.subtitle = v; renderSite(currentData); }));

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

    if (googleSetupNode) {
        container.appendChild(googleSetupNode);
        const urlInput = container.querySelector('#google-script-url-input');
        if (urlInput) {
            urlInput.value = currentData.rsvp.scriptUrl || '';
            urlInput.addEventListener('input', (e) => {
                if(!currentData.rsvp) currentData.rsvp = {}; 
                currentData.rsvp.scriptUrl = e.target.value; 
            });
        }
    }


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

document.addEventListener('DOMContentLoaded', () => {
    let googleSetupNode = null;
    let isGoogleSetupInstantiated = false;

    function loadGoogleSetupTemplate() {
        if (isGoogleSetupInstantiated) return;
        const template = document.getElementById('google-setup-template');
        if (template) {
            googleSetupNode = template.content.cloneNode(true);
            isGoogleSetupInstantiated = true;
        }
    }

    // Cargar la plantilla tan pronto como el DOM esté listo.
    loadGoogleSetupTemplate();

    const adminModeBtn = document.getElementById('btn-admin-mode');
    if(adminModeBtn) {
        adminModeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openAdminMode();
        });
    }

    // Lógica para minimizar/restaurar el modal de admin
    const adminModalEl = document.getElementById('adminModal');
    
    adminModalEl.addEventListener('shown.bs.modal', function() {
        // La plantilla ya está cargada, solo necesitamos inicializar la integración.
        if (window.initGoogleIntegration) {
            window.initGoogleIntegration();
        }
    });

    const minimizeBtn = document.getElementById('minimize-admin-modal');
    const minimizedContainer = document.getElementById('admin-modal-minimized');
    const restoreBtn = document.getElementById('restore-admin-modal');
    let isMinimizing = false;

    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            isMinimizing = true;
            if (adminModalInstance) adminModalInstance.hide();
            minimizedContainer.style.display = 'block';
        });
    }

    if (restoreBtn) {
        restoreBtn.addEventListener('click', () => {
            minimizedContainer.style.display = 'none';
            if (adminModalInstance) adminModalInstance.show();
        });
    }

    // Lógica para confirmar cierre si hay cambios
    const confirmCloseModalEl = document.getElementById('confirmCloseModal');
    const confirmCloseModal = bootstrap.Modal.getOrCreateInstance(confirmCloseModalEl);
    const confirmCloseBtn = document.getElementById('confirm-close-admin');
    
    let isClosingConfirmed = false;

    adminModalEl.addEventListener('hide.bs.modal', function (event) {
        if (isMinimizing) {
            isMinimizing = false;
            return;
        }
        if (isClosingConfirmed) {
            isClosingConfirmed = false; // Reset for next time
            return;
        }
        
        const currentConfigJSON = JSON.stringify(currentData, null, 2);
        if (originalConfigJSON && originalConfigJSON !== currentConfigJSON) {
            event.preventDefault();
            confirmCloseModal.show();
        }
    });

    confirmCloseBtn.addEventListener('click', function () {
        isClosingConfirmed = true;
        confirmCloseModal.hide();
        if (adminModalInstance) adminModalInstance.hide();
    });

    // Inyectar el nodo de Google al construir el formulario
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
        container.appendChild(createInput("Subtítulo (para redes sociales)", currentData.details.subtitle, "text", v => { currentData.details.subtitle = v; renderSite(currentData); }));
    
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
    
        if (googleSetupNode) {
            container.appendChild(googleSetupNode);
            const urlInput = container.querySelector('#google-script-url-input');
            if (urlInput) {
                urlInput.value = currentData.rsvp.scriptUrl || '';
                urlInput.addEventListener('input', (e) => {
                    if(!currentData.rsvp) currentData.rsvp = {}; 
                    currentData.rsvp.scriptUrl = e.target.value; 
                });
            }
        }
    
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

    // Sobrescribir la función global
    window.buildAdminForm = buildAdminForm;
});
