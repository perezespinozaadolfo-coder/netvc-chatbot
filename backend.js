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
const SUPPORT_TEAM = ['Carlos', 'María', 'Miguel', 'Andrea'];
const CONVERSATIONS_FILE = path.join(__dirname, 'conversations.json');
const CLIENTS_FILE = path.join(__dirname, 'clients.json');

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
        
        const systemPrompt = `Eres ${assignedPerson}, miembro del equipo de soporte de NetVC. REGLAS:
- Habla como persona real, NO como bot
- NO menciones que eres IA
- Responde de forma natural y conversacional
- Máximo 70 palabras
- NO te presentes en cada mensaje (solo la primera vez)
- Sé amable y profesional`;

        const messages = [];
        if (lastExchange) {
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
            content: message
        });

        const response = await client.messages.create({
            model: 'claude-sonnet-5',
            max_tokens: 200,
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
