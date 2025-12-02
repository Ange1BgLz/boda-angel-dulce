/* 
   backend-template.js
   Backend robusto que acepta JSON incluso en modo no-cors
*/

var SPREADSHEET_ID = "__SPREADSHEET_ID_PLACEHOLDER__";
var SHEET_NAME = "Respuestas";

function doGet(e) {
  return HtmlService.createHtmlOutput(
    "<h3>✅ El sistema de confirmación está ACTIVO y autorizado.</h3>" +
    "<p>Ya puedes cerrar esta pestaña y volver al panel de administración.</p>" +
    "<style>body { font-family: sans-serif; text-align: center; padding-top: 50px; color: green; }</style>"
  );
}

function doPost(e) {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    
    var data = {};
    
    try {
        // --- CORRECCIÓN CRÍTICA ---
        // En modo 'no-cors', el Content-Type llega como 'text/plain'.
        // Por eso ignoramos e.postData.type y tratamos de parsear contents directamente.
        
        if (e.postData && e.postData.contents) {
            try {
                // Intentamos parsear el cuerpo como JSON
                data = JSON.parse(e.postData.contents);
            } catch (jsonError) {
                // Si falla el parseo (no es JSON), asumimos que son parámetros de formulario estándar
                data = e.parameter;
            }
        } else if (e.parameter) {
            // Fallback por si no hay postData
            data = e.parameter;
        }

        // --- VALIDACIÓN DE CAMPOS ---
        // Nos aseguramos de que no sean undefined
        var nombre = data.nombre || '';
        var invitados = data.invitados || '1';
        var telefono = data.telefono || '';
        var asistencia = data.asistencia || '';
        var mensaje = data.mensaje || '';

        // Solo guardamos si al menos hay un nombre o asistencia (evitar filas vacías accidentales)
        if (nombre !== '' || asistencia !== '') {
            sheet.appendRow([
                new Date(), 
                nombre, 
                invitados,
                telefono, 
                asistencia, 
                mensaje
            ]);
        }
        
        return ContentService.createTextOutput(JSON.stringify({result: "success"}))
            .setMimeType(ContentService.MimeType.JSON);
            
    } catch(err) { 
        return ContentService.createTextOutput(JSON.stringify({
            result: "error", 
            error: err.toString()
        })).setMimeType(ContentService.MimeType.JSON); 
    }
}