// --- PEGA TU CLIENT ID AQUÍ ---
const CLIENT_ID = '1000393223830-alld3gcf7oo5a7092kd68gkdi19egk1j.apps.googleusercontent.com'; 
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/script.projects https://www.googleapis.com/auth/script.deployments';

let tokenClient;
let gapiInited = false;
let gisInited = false;
let loadingStarted = false; // Flag para asegurar carga única

// --- FUNCIÓN DE INICIALIZACIÓN (Llamada desde app.js) ---
window.initGoogleIntegration = function() {
    if (loadingStarted) return; 
    loadingStarted = true;
    console.log("🟢 [Lazy Load] Iniciando carga de librerías Google...");
    loadGoogleLibraries();
};

// --- INYECCIÓN DE LIBRERÍAS ---
function loadGoogleLibraries() {
    // 1. Cargar GAPI
    const scriptGapi = document.createElement('script');
    scriptGapi.src = "https://apis.google.com/js/api.js";
    scriptGapi.async = true;
    scriptGapi.defer = true;
    scriptGapi.onload = gapiLoaded;
    scriptGapi.onerror = () => console.error("🔴 Error cargando GAPI");
    document.body.appendChild(scriptGapi);

    // 2. Cargar GIS
    const scriptGis = document.createElement('script');
    scriptGis.src = "https://accounts.google.com/gsi/client";
    scriptGis.async = true;
    scriptGis.defer = true;
    scriptGis.onload = gisLoaded;
    scriptGis.onerror = () => console.error("🔴 Error cargando GIS");
    document.body.appendChild(scriptGis);
}

// --- CALLBACKS ---
function gapiLoaded() {
    console.log("🔵 Script GAPI descargado. Inicializando cliente...");
    gapi.load('client', async () => {
        try {
            await gapi.client.init({
                discoveryDocs: [
                    "https://sheets.googleapis.com/$discovery/rest?version=v4",
                    "https://script.googleapis.com/$discovery/rest?version=v1",
                    "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
                ],
            });
            gapiInited = true;
            checkAuthReady();
        } catch (error) {
            console.error("🔴 GAPI INIT ERROR:", error);
        }
    });
}

function gisLoaded() {
    try {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '', 
        });
        gisInited = true;
        checkAuthReady();
    } catch (error) {
        console.error("🔴 GIS INIT ERROR:", error);
    }
}

function checkAuthReady() {
    if (gapiInited && gisInited) {
        const interval = setInterval(() => {
            const btn = document.getElementById('btn-google-setup');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-google me-2"></i>Conectar y Crear Hoja';
                btn.onclick = handleGoogleSetup;
                clearInterval(interval);
            }
        }, 500);
    }
}

// --- LÓGICA PRINCIPAL ---
async function handleGoogleSetup() {
    tokenClient.callback = async (resp) => {
        if (resp.error) {
            alert("Error Auth: " + resp.error);
            return;
        }
        await createWeddingBackend();
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
}

async function createWeddingBackend() {
    const statusDiv = document.getElementById('google-setup-status');
    const resultInput = document.getElementById('google-script-url-input');
    
    if(statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.className = 'alert alert-info mt-2 p-2';
        statusDiv.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div> Iniciando proceso...';
    }

    try {
        // A. CREAR HOJA
        if(statusDiv) statusDiv.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div> Creando hoja de cálculo...';
        
        const sheetTitle = `Boda RSVP - ${new Date().toLocaleDateString()}`;
        const spreadsheet = await gapi.client.sheets.spreadsheets.create({
            resource: { properties: { title: sheetTitle }, sheets: [{ properties: { title: "Respuestas" } }] }
        });
        const spreadsheetId = spreadsheet.result.spreadsheetId;
        const spreadsheetUrl = spreadsheet.result.spreadsheetUrl;

        // B. HEADERS
        if(statusDiv) statusDiv.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div> Configurando columnas...';
        
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId, range: 'Respuestas!A1:F1', valueInputOption: 'RAW',
            resource: { values: [['Fecha', 'Nombre', 'Teléfono', 'N° de invitados', 'Asistencia', 'Mensaje']] }
        });

        // C. OBTENER PLANTILLAS (Backend y Manifiesto)
        if(statusDiv) statusDiv.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div> Leyendo archivos de configuración...';
        
        // 1. Fetch Backend JS
        const templateResponse = await fetch('backend-template.js');
        if (!templateResponse.ok) throw new Error("Falta el archivo 'backend-template.js'");
        const rawCode = await templateResponse.text();

        // 2. Fetch Manifiesto JSON
        const manifestResponse = await fetch('config/googleApp_manifest.json');
        if (!manifestResponse.ok) throw new Error("Falta el archivo 'googleApp_manifest.json'");
        const rawManifest = await manifestResponse.text();

        // 3. Validaciones
        if (!rawCode.trim()) throw new Error("El archivo backend-template.js está vacío.");
        if (!rawManifest.trim()) throw new Error("El archivo googleApp_manifest.json está vacío.");
        if (!spreadsheetId) throw new Error("Error interno: No ID de hoja.");

        // 4. Reemplazo del Placeholder en JS
        const finalBackendCode = rawCode.replace('__SPREADSHEET_ID_PLACEHOLDER__', spreadsheetId);


        // D. CREAR PROYECTO E INYECTAR CÓDIGO
        if(statusDiv) statusDiv.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div> Creando proyecto en la nube...';
        
        const scriptProject = await gapi.client.script.projects.create({
            resource: { title: `Script Boda Backend`, parentId: null }
        });
        const scriptId = scriptProject.result.scriptId;

        if(statusDiv) statusDiv.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div> Subiendo código y configuración...';
        
        await gapi.client.script.projects.updateContent({
            scriptId: scriptId,
            resource: {
                files: [
                    { 
                        name: 'Código', 
                        type: 'SERVER_JS', 
                        source: finalBackendCode 
                    },
                    { 
                        name: 'appsscript', 
                        type: 'JSON', 
                        source: rawManifest // Enviamos el contenido del archivo JSON tal cual
                    }
                ]
            }
        });

        // E. AUTOMATIZACIÓN DE DESPLIEGUE
        if(statusDiv) statusDiv.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div> Generando versión estable...';
        
        const version = await gapi.client.script.projects.versions.create({
            scriptId: scriptId, resource: { description: "V1 Automática" }
        });

        if(statusDiv) statusDiv.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div> Publicando Web App...';
        
        const deployment = await gapi.client.script.projects.deployments.create({
            scriptId: scriptId,
            resource: { versionNumber: version.result.versionNumber, manifestFileName: "appsscript" }
        });
        
        const finalScriptUrl = `https://script.google.com/macros/s/${deployment.result.deploymentId}/exec`;


        // F. ÉXITO FINAL
        statusDiv.className = 'alert alert-success mt-2 p-3';
        
        if(resultInput) {
            resultInput.disabled = false;
            resultInput.value = finalScriptUrl;
            resultInput.dispatchEvent(new Event('input'));
        }

        statusDiv.innerHTML = `
            <h6 class="fw-bold text-success"><i class="bi bi-check-circle-fill me-2"></i>¡Sistema Configurado!</h6>
            
            <div class="bg-light border rounded p-2 mb-3">
                <small class="text-muted d-block mb-1">Tu hoja de respuestas (Guarda este link):</small>
                <a href="${spreadsheetUrl}" target="_blank" class="fw-bold text-decoration-underline text-primary">
                    <i class="bi bi-file-earmark-spreadsheet me-1"></i>Abrir Hoja de Excel en Google Drive
                </a>
            </div>

            <hr>
            
            <div class="alert alert-warning border-warning mb-2">
                <strong>⚠️ ATENCIÓN: Último paso requerido</strong><br>
                <p class="small mb-1">Al activar, Google te mostrará una advertencia de <em>"Aplicación no verificada"</em>. Esto es normal en apps privadas.</p>
                <p class="small mb-0"><strong>Qué hacer:</strong> Clic en <em>Configuración Avanzada</em> &rarr; <em>Ir a Script Boda (no seguro)</em> &rarr; <em>Permitir</em>.</p>
            </div>

            <a href="${finalScriptUrl}" target="_blank" class="btn btn-warning w-100 fw-bold shadow-sm mb-2">
                <i class="bi bi-key-fill me-2"></i>ACTIVAR SISTEMA AHORA
            </a>
            
            <p class="small text-muted text-center fst-italic mb-0">
                Tus datos están protegidos por Google. Si tienes dudas, contacta al desarrollador de la plantilla.
            </p>
        `;

    } catch (err) {
        console.error(err);
        statusDiv.className = 'alert alert-danger mt-2';
        
        const msg = err.result?.error?.message || err.message || JSON.stringify(err);

        if (msg.includes("User has not enabled the Apps Script API")) {
             statusDiv.className = 'alert alert-warning mt-2 p-3 border-warning';
             statusDiv.innerHTML = `
                <h6 class="fw-bold"><i class="bi bi-exclamation-triangle me-2"></i>Requiere Permiso de Google</h6>
                <p class="small mb-2">Google requiere que actives una opción en tu cuenta:</p>
                <ol class="small mb-3 ps-3">
                    <li>Abre <a href="https://script.google.com/home/usersettings" target="_blank" class="fw-bold">Configuración de Google Scripts</a>.</li>
                    <li>Activa: <strong>"Google Apps Script API"</strong> (On).</li>
                    <li>Vuelve aquí e intenta de nuevo.</li>
                </ol>
            `;
        } else {
            statusDiv.textContent = 'Error: ' + msg;
        }
    }
}