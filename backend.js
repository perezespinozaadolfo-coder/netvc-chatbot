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
const SUPPORT_TEAM = ['Sharon', 'Abigail', 'Angel', 'Juan', 'Estefania', 'Francisco', 'Adolfo', 'Alessandra'];
const CONVERSATIONS_FILE = path.join(__dirname, 'conversations.json');
const CLIENTS_FILE = path.join(__dirname, 'clients.json');

// Información de NetVC
const NETVC_INFO = {
    phone: '+52 686 392 0262',
    email: 'Contacto@netvc.mx',
    schedule: 'Lunes-Viernes 10am-6pm',
    location: 'Mexicali, Baja California',
    services: ['Consultoría Tecnológica', 'Diseño e Implementación', 'Seguridad y Backup', 'Soluciones en la Nube', 'Soporte Técnico 24/7', 'Administración de Proyectos'],
    advantages: 'Nos adaptamos a cualquier proyecto TI, respuesta rápida, expertos certificados, equipo de ingenieros, precios competitivos, alcance en casi toda México',
    pricing: 'Desde $1000/mes, consultorías desde $4000'
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

// Endpoint: Chat
app.post('/api/chat', async (req, res) => {
    try {
        const { message, clientName, personName, lastExchange } = req.body;

        if (!message || !clientName) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const assignedPerson = personName || SUPPORT_TEAM[Math.floor(Math.random() * SUPPORT_TEAM.length)];
        
        const systemPrompt = `Eres ${assignedPerson}, Ingeniero/a especialista en TI de NetVC. Tu misión es CAPTAR CLIENTES identificando sus necesidades y proponiendo soluciones.

SOBRE NETVC:
- Teléfono: ${NETVC_INFO.phone}
- Email: ${NETVC_INFO.email}
- Horario: ${NETVC_INFO.schedule}
- Ubicación: ${NETVC_INFO.location}
- Servicios: ${NETVC_INFO.services.join(', ')}
- Ventajas: ${NETVC_INFO.advantages}
- Inversión: ${NETVC_INFO.pricing}

ESTILO DE COMUNICACIÓN:
✅ Sé consultor, no vendedor (haz preguntas diagnósticas)
✅ Entiende el negocio del cliente primero
✅ Propón soluciones específicas (no genéricas)
✅ Menciona casos de éxito/referentes si es relevante
✅ Siempre ofrece contacto directo: teléfono o email
✅ Eres ingeniero experto, comunica con autoridad técnica
✅ Máximo 100 palabras (claro y directo)
✅ Habla natural, sin parecer bot
✅ NUNCA te presentes en cada mensaje (solo primera vez)

CIERRE DE VENTAS:
- Cualifica al cliente: ¿Cuál es su dolor/necesidad?
- Propone solución NetVC específica
- Ofrece llamada/demo: "Podría ayudarte mejor en una llamada rápida, ¿te va bien a las [horario]?"
- Siempre incluye contacto: +52 686 392 0262 o Contacto@netvc.mx`;

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
        messages.push({
            role: 'user',
            content: message || 'Hola'
        });

        const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 300,
            system: systemPrompt,
            messages: messages
        });

        const botResponse = response.content[0].text;

        // Guardar conversación
        const conversations = loadConversations();
        conversations.push({
            timestamp: new Date().toISOString(),
            clientName: clientName,
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
        const { clientName, personName, email, phone } = req.body;

        if (!clientName || !email || !phone) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const clients = loadClients();
        clients.push({
            timestamp: new Date().toISOString(),
            clientName: clientName,
            personName: personName,
            email: email,
            phone: phone
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
    console.log(`✅ Backend corriendo en puerto ${PORT}`);
    console.log(`🔑 API Key: Configurada ✓`);
});
