// --- CONFIGURACIÓN DEL DESARROLLADOR ---
// IMPORTANTE: Este Client ID debe tener autorizado el dominio actual en Google Cloud Console
const CLIENT_ID = '1000393223830-alld3gcf7oo5a7092kd68gkdi19egk1j.apps.googleusercontent.com'; 

// Permisos que solicitaremos al usuario (Crear archivos y scripts)
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/script.projects';

let tokenClient;
let gapiInited = false;
let gisInited = false;

// 1. Carga de API Client (Estructura de llamadas)
function gapiLoaded() {
    gapi.load('client', async () => {
        await gapi.client.init({
            // Cargamos los "mapas" de las APIs para saber cómo llamarlas
            discoveryDocs: [
                "https://sheets.googleapis.com/$discovery/rest?version=v4",
                "https://script.googleapis.com/$discovery/rest?version=v1",
                "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
            ],
        });
        gapiInited = true;
        enableSetupButton();
    });
}

// 2. Carga de Identity Services (Login y Tokens)
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // Se definirá al hacer clic
    });
    gisInited = true;
    enableSetupButton();
}

function enableSetupButton() {
    const btn = document.getElementById('btn-google-setup');
    if (gapiInited && gisInited && btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-google me-2"></i>Conectar y Crear Hoja';
    }
}

// 3. Función Principal: Disparada por el usuario
async function handleGoogleSetup() {
    // Definimos qué pasa cuando el usuario se loguea exitosamente
    tokenClient.callback = async (resp) => {
        if (resp.error) {
            console.error(resp);
            alert("Error de autenticación: " + resp.error);
            return;
        }
        // Si hay token, ejecutamos la creación
        await createWeddingBackend();
    };

    // Si no hay token o expiró, forzamos el popup de consentimiento
    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
}

// 4. Lógica de Creación de Recursos
async function createWeddingBackend() {
    const statusDiv = document.getElementById('google-setup-status');
    const resultInput = document.getElementById('google-script-url-input');
    
    if(statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.className = 'alert alert-info mt-2 p-2';
        statusDiv.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div> Creando hoja de cálculo...';
    }

    try {
        // A. CREAR HOJA
        const sheetTitle = `Boda RSVP - ${new Date().toLocaleDateString()}`;
        const spreadsheet = await gapi.client.sheets.spreadsheets.create({
            resource: {
                properties: { title: sheetTitle },
                sheets: [{ properties: { title: "Respuestas" } }]
            }
        });
        const spreadsheetId = spreadsheet.result.spreadsheetId;
        const spreadsheetUrl = spreadsheet.result.spreadsheetUrl;

        // B. PONER ENCABEZADOS
        if(statusDiv) statusDiv.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div> Configurando columnas...';
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: 'Respuestas!A1:E1',
            valueInputOption: 'RAW',
            resource: { values: [['Fecha', 'Nombre', 'Teléfono', 'Asistencia', 'Mensaje']] }
        });

        // C. CREAR SCRIPT
        if(statusDiv) statusDiv.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div> Creando backend...';
        const scriptProject = await gapi.client.script.projects.create({
            resource: { title: `Script Boda Backend`, parentId: null }
        });
        const scriptId = scriptProject.result.scriptId;

        // D. INYECTAR CÓDIGO CON ID VINCULADO
        if(statusDiv) statusDiv.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div> Inyectando código...';
        
        // Este es el código que vivirá en el Google Apps Script del usuario
        const backendCode = `
            const SPREADSHEET_ID = "${spreadsheetId}";
            const SHEET_NAME = "Respuestas";

            function doPost(e) {
                const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
                const sheet = ss.getSheetByName(SHEET_NAME);
                let data = {};
                
                try {
                    if (e.postData && e.postData.type === 'application/json') {
                        data = JSON.parse(e.postData.contents);
                    } else {
                        data = e.parameter;
                    }
                    
                    const row = [new Date(), data.nombre, data.telefono, data.asistencia, data.mensaje];
                    sheet.appendRow(row);
                    
                    return ContentService.createTextOutput(JSON.stringify({result: "success"}))
                        .setMimeType(ContentService.MimeType.JSON);
                } catch(err) {
                     return ContentService.createTextOutput(JSON.stringify({result: "error"}))
                        .setMimeType(ContentService.MimeType.JSON);
                }
            }
        `;

        await gapi.client.script.projects.updateContent({
            scriptId: scriptId,
            resource: {
                files: [
                    { name: 'Código', type: 'SERVER_JS', source: backendCode },
                    { name: 'appsscript', type: 'JSON', source: '{"timeZone":"America/Mexico_City","dependencies":{},"exceptionLogging":"STACKDRIVER","executionApi":{"access":"ANYONE"}}' }
                ]
            }
        });

        // E. ÉXITO E INSTRUCCIONES
        const scriptEditUrl = `https://script.google.com/d/${scriptId}/edit`;
        
        statusDiv.className = 'alert alert-success mt-2 p-3';
        statusDiv.innerHTML = `
            <strong>¡Creado con éxito!</strong><br>
            La hoja ya existe en tu Google Drive: <a href="${spreadsheetUrl}" target="_blank">Ver Hoja</a>.<br><br>
            <span class="text-danger fw-bold">⚠️ PASO FINAL OBLIGATORIO:</span><br>
            1. <a href="${scriptEditUrl}" target="_blank" class="fw-bold text-decoration-underline">Abre el Script aquí</a>.<br>
            2. Arriba derecha: <strong>Implementar > Nueva implementación</strong>.<br>
            3. Tipo: <strong>Aplicación web</strong>.<br>
            4. Quién tiene acceso: <strong>"Cualquier usuario"</strong> (¡Muy importante!).<br>
            5. Copia la URL que termina en <code>/exec</code> y pégala abajo.
        `;

        // Habilitar input
        if(resultInput) {
            resultInput.disabled = false;
            resultInput.focus();
            resultInput.placeholder = "https://script.google.com/.../exec";
        }

    } catch (err) {
        console.error(err);
        statusDiv.className = 'alert alert-danger mt-2';
        statusDiv.textContent = 'Error: ' + (err.result?.error?.message || err.message);
    }
}