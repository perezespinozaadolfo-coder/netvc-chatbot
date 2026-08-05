const express = require('express');
const Anthropic = require('@anthropic-ai/sdk').default;
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// Verificar API Key
const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
    console.log('🔑 API Key: ERROR ✗');
    process.exit(1);
}

const client = new Anthropic({ apiKey: API_KEY });
const SUPPORT_TEAM = ['Sharon', 'Abigail', 'Angel', 'Juan', 'Estefania', 'Francisco', 'Adolfo', 'Alessandra', 'Francia'];
const CONVERSATIONS_FILE = path.join(__dirname, 'conversations.json');
const CLIENTS_FILE = path.join(__dirname, 'clients.json');

// Información de NetVC
const NETVC_INFO = {
    phone: '+52 686 392 0262',
    email: 'Contacto@netvc.mx',
    schedule: 'Lunes-Viernes 10am-6pm',
    location: 'Mexicali, Baja California',
};

function loadConversations() {
    if (fs.existsSync(CONVERSATIONS_FILE)) {
        return JSON.parse(fs.readFileSync(CONVERSATIONS_FILE, 'utf8'));
    }
    return [];
}

function saveConversations(data) {
    fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(data, null, 2));
}

function loadClients() {
    if (fs.existsSync(CLIENTS_FILE)) {
        return JSON.parse(fs.readFileSync(CLIENTS_FILE, 'utf8'));
    }
    return [];
}

function saveClients(data) {
    fs.writeFileSync(CLIENTS_FILE, JSON.stringify(data, null, 2));
}

// Endpoint: Chat ULTRA-PROFESIONAL
app.post('/api/chat', async (req, res) => {
    try {
        const { message, clientName, personName, lastExchange, clientPhone, clientEmail, messageCount } = req.body;

        if (!message || !clientName) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const assignedPerson = personName || SUPPORT_TEAM[Math.floor(Math.random() * SUPPORT_TEAM.length)];
        
        const systemPrompt = `Eres ${assignedPerson}, Ingeniero/a Senior especialista en TI de NetVC. Eres UN PROFESIONAL DE ÉLITE: experto técnico + recepcionista de lujo + secretaria eficiente.

INFORMACIÓN DE NETVC:
- Teléfono: ${NETVC_INFO.phone} | Email: ${NETVC_INFO.email}
- Horario: ${NETVC_INFO.schedule} | Ubicación: ${NETVC_INFO.location}
- Servicios: Consultoría TI, Implementación, Seguridad, Nube, Soporte 24/7, Proyectos TI
- Inversión: Desde $1,000/mes, consultorías desde $4,000

CLIENTE ACTUAL: ${clientName} | Tel: ${clientPhone || 'No proporcionado'} | Email: ${clientEmail || 'No proporcionado'}

ESTILO DE COMUNICACIÓN - PROFESIONAL DE ÉLITE:

1. PRESENTACIÓN (solo mensaje 1):
   - Te presentas UNA sola vez de forma breve y profesional
   - "Soy [tu nombre], especialista en TI de NetVC. ¿Cuéntame tu situación?"

2. ESCUCHA ACTIVA (mensajes 2-3):
   - Dejas que el cliente EXPLIQUE su necesidad
   - Haces MÁXIMO UNA pregunta de seguimiento (puntual, sin opciones)
   - Eres empático pero directo
   - NO hagas listas ni opciones múltiples
   - Máximo 70 palabras por respuesta

3. DIAGNÓSTICO EFICIENTE (mensajes 4-5):
   - MÁXIMO 2-3 preguntas claves muy específicas
   - Pregunta datos que REALMENTE importan para presupuestar:
     * Estado actual exacto
     * Urgencia/timeline
     * Tamaño de operación (empleados, equipos, inversión aprox)
     * Mayor problema/pain point
     * Si hay presupuesto definido

4. DETECCIÓN DE CIERRE:
   - Si cliente dice "me tengo que ir", "ya me voy", "luego", "ahora no", TERMINA
   - Inmediatamente genera RESUMEN y propón email

5. GENERACIÓN DE RESUMEN EJECUTIVO (cuando tengas suficiente info):
   "Perfecto, aquí tengo lo que necesito para hacerte presupuesto:

   📋 RESUMEN DE TU PROYECTO:
   - Empresa: [info empresa]
   - Problema/Necesidad: [resumen claro]
   - Urgencia: [alta/media/baja]
   - Equipos/Usuarios: [cantidad]
   - Budget aproximado: [si lo mencionó]
   - Próxima acción: [lo que recomiendas hacer]

   Para hacerte un presupuesto exacto, necesito que me envíes un email a ${NETVC_INFO.email} con este resumen y cualquier detalle adicional.

   📞 Si prefieres hablar directo: ${NETVC_INFO.phone} (${NETVC_INFO.schedule})
   ¡Te esperamos!"

6. CARACTERÍSTICAS:
   ✅ Máximo 3 preguntas TOTALES en toda la conversación
   ✅ Preguntas muy puntuales (SIN opciones, SIN listas)
   ✅ Detecta urgencia y adapta tono
   ✅ NO repite preguntas
   ✅ NO pide lo que ya dijo el cliente
   ✅ Respuestas concisas (60-80 palabras máximo)
   ✅ Cierra profesionalmente cuando detecta que debe terminar
   ✅ Genera RESUMEN cuando tiene suficiente info (4-5 mensajes)
   ✅ Eres SECRETARIA EFICIENTE: anotas todo, organizas info, resumes
   ✅ Eres EXPERTO EN TI: comprendes problemas técnicos a fondo
   ✅ Eres RECEPCIONISTA: amable, profesional, respetas el tiempo del cliente

TONE: Profesional, directo, eficiente, empático, SIN frivolidad. Como hablando con el CEO de una empresa.

IMPORTANTE:
- Si el cliente menciona que se va, CIERRA INMEDIATAMENTE
- No hagas más de 3 preguntas en TODA la sesión
- Cada pregunta debe ser MUY ESPECÍFICA y breve
- Genera resumen cuando sientas que tienes suficiente información
- Siempre termina con teléfono y email`;

        const messages = [];
        if (lastExchange && lastExchange.lastQuestion && lastExchange.lastResponse) {
            messages.push({
                role: 'user',
                content: lastExchange.lastQuestion
            });
            messages.push({
                role: 'assistant',
                content: lastExchange.lastResponse
            });
        }
        
        let contextMessage = `[Cliente: ${clientName}`;
        if (clientPhone) contextMessage += ` | Tel: ${clientPhone}`;
        if (clientEmail) contextMessage += ` | Email: ${clientEmail}`;
        contextMessage += `]\n\nMensaje: ${message}`;
        
        messages.push({
            role: 'user',
            content: contextMessage
        });

        const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 400,
            system: systemPrompt,
            messages: messages
        });

        const botResponse = response.content[0].text;

        // Guardar conversación
        const conversations = loadConversations();
        conversations.push({
            timestamp: new Date().toISOString(),
            clientName: clientName,
            clientPhone: clientPhone || 'No proporcionado',
            clientEmail: clientEmail || 'No proporcionado',
            personName: assignedPerson,
            userMessage: message,
            botResponse: botResponse
        });
        saveConversations(conversations);

        res.json({
            success: true,
            response: botResponse,
            personName: assignedPerson,
            lastQuestion: message,
            lastResponse: botResponse
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error procesando mensaje', details: error.message });
    }
});

// Endpoint: Guardar datos del cliente
app.post('/api/save-client', (req, res) => {
    try {
        const { clientName, personName, email, phone, summary } = req.body;

        if (!clientName || !email) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const clients = loadClients();
        clients.push({
            timestamp: new Date().toISOString(),
            clientName: clientName,
            personName: personName,
            email: email,
            phone: phone,
            summary: summary
        });
        saveClients(clients);

        res.json({
            success: true,
            message: 'Datos guardados correctamente'
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error guardando datos' });
    }
});

// Endpoint: Ver conversaciones
app.get('/api/conversations', (req, res) => {
    try {
        const conversations = loadConversations();
        res.json(conversations);
    } catch (error) {
        res.status(500).json({ error: 'Error cargando conversaciones' });
    }
});

// Endpoint: Ver clientes
app.get('/api/clients', (req, res) => {
    try {
        const clients = loadClients();
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: 'Error cargando clientes' });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`✅ Backend v5 - Chatbot Ultra Profesional en puerto ${PORT}`);
    console.log(`🔑 API Key: Configurada ✓`);
    console.log(`📞 Teléfono: ${NETVC_INFO.phone} | Email: ${NETVC_INFO.email}`);
});
