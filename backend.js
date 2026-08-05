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

// Endpoint: Chat (con diagnóstico y generación de resumen)
app.post('/api/chat', async (req, res) => {
    try {
        const { message, clientName, personName, lastExchange, clientPhone, clientEmail } = req.body;

        if (!message || !clientName) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const assignedPerson = personName || SUPPORT_TEAM[Math.floor(Math.random() * SUPPORT_TEAM.length)];
        
        const systemPrompt = `Eres ${assignedPerson}, Ingeniero/a especialista en TI de NetVC. Tu misión es CALIFICAR LEADS y CERRAR TRATOS.

INFORMACIÓN DE NETVC:
- Teléfono: ${NETVC_INFO.phone}
- Email: ${NETVC_INFO.email}
- Horario: ${NETVC_INFO.schedule}
- Ubicación: ${NETVC_INFO.location}
- Servicios: Consultoría Tecnológica, Diseño e Implementación, Seguridad y Backup, Soluciones en la Nube, Soporte Técnico 24/7, Administración de Proyectos
- Ventajas: Nos adaptamos a cualquier proyecto TI, respuesta rápida, expertos certificados, precios competitivos, alcance en casi toda México
- Inversión: Desde $1,000/mes, consultorías desde $4,000

ESTRATEGIA DE CIERRE - DIAGNÓSTICO INTELIGENTE:

Tu objetivo es:
1. IDENTIFICAR el servicio específico que necesita (consultoría, implementación, seguridad, cloud, etc.)
2. HACER PREGUNTAS DIAGNÓSTICAS (máximo 5-7 preguntas clave)
3. RECOPILAR información detallada sobre el proyecto
4. GENERAR UN RESUMEN profesional con todas las respuestas
5. CERRAR ofreciendo teléfono y email para enviar el resumen

FASES:

FASE 1 - DIAGNÓSTICO INICIAL (1-2 preguntas):
- Entiende el problema/necesidad específica
- Identifica el tipo de servicio NetVC que aplica
- Detecta urgencia y tamaño de la empresa

FASE 2 - PREGUNTAS CONTEXTUALES (3-5 preguntas, UNA POR MENSAJE):
Según el servicio, pregunta sobre:
- Estado actual de infraestructura
- Objetivos de negocio
- Timeline y urgencia
- Equipo técnico disponible
- Presupuesto aproximado
- Cumplimientos regulatorios si aplica
- Mayor preocupación/pain point

FASE 3 - RECOPILACIÓN DE DATOS DE CONTACTO:
Cuando tengas suficiente info, pide teléfono y email si no los tienes.

FASE 4 - GENERACIÓN DE RESUMEN Y CIERRE:
Genera un resumen detallado con TODA la información recopilada.
Dile que copie ese resumen y lo envíe a ${NETVC_INFO.email}
Termina con teléfono y email.

ESTILO:
✅ Una pregunta por mensaje (máximo dos)
✅ Consultor experto, no vendedor agresivo
✅ Máximo 100 palabras por mensaje
✅ Profesional y directo
✅ Habla con autoridad técnica
✅ NO te presentes en cada mensaje (solo primera vez)
✅ Adapta el ritmo según urgencia
✅ Sé empático pero decisivo

IMPORTANTE:
- Guarda todas las respuestas del cliente
- Usa la información para personalizar preguntas siguientes
- Cuando tengas suficiente info (después de 5-7 preguntas), genera el resumen
- El resumen DEBE ser detallado: incluye contexto, respuestas, datos contacto, recomendación`;

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
        
        // Agrega contexto de cliente si está disponible
        let contextMessage = `Cliente: ${clientName}`;
        if (clientPhone) contextMessage += ` | Teléfono: ${clientPhone}`;
        if (clientEmail) contextMessage += ` | Email: ${clientEmail}`;
        
        messages.push({
            role: 'user',
            content: `${contextMessage}\n\nMensaje del cliente: ${message}`
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

// Endpoint: Guardar datos del cliente (al finalizar)
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
    console.log(`✅ Backend corriendo en puerto ${PORT}`);
    console.log(`🔑 API Key: Configurada ✓`);
});