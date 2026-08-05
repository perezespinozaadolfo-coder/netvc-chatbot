const express = require('express');
const Anthropic = require('@anthropic-ai/sdk').default;
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

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
const PROPOSALS_FILE = path.join(__dirname, 'proposals.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'NetVC2024'; // Cambiar en producción

// Información de NetVC
const NETVC_INFO = {
    phone: '+52 686 392 0262',
    email: 'Contacto@netvc.mx',
    schedule: 'Lunes-Viernes 10am-6pm',
    location: 'Mexicali, Baja California',
};

function loadProposals() {
    if (fs.existsSync(PROPOSALS_FILE)) {
        return JSON.parse(fs.readFileSync(PROPOSALS_FILE, 'utf8'));
    }
    return [];
}

function saveProposals(data) {
    fs.writeFileSync(PROPOSALS_FILE, JSON.stringify(data, null, 2));
}

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

// Endpoint: Generar Propuesta Profesional (solo admin)
app.post('/api/generate-proposal', async (req, res) => {
    try {
        const { clientName, clientEmail, clientPhone, conversationHistory, password } = req.body;

        if (!password || password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'No autorizado' });
        }

        if (!clientName || !conversationHistory) {
            return res.status(400).json({ error: 'Faltan datos' });
        }

        // Crear prompt para generar propuesta
        const proposalPrompt = `Basándote en la siguiente conversación con un cliente potencial de NetVC, genera una PROPUESTA PROFESIONAL Y DETALLADA.

CLIENTE:
- Nombre: ${clientName}
- Email: ${clientEmail}
- Teléfono: ${clientPhone}

CONVERSACIÓN:
${conversationHistory.map(msg => `Cliente: ${msg.userMessage}\nNetVC: ${msg.botResponse}`).join('\n\n')}

INFORMACIÓN DE NETVC:
- Servicios: Consultoría TI, Implementación, Seguridad, Nube, Soporte 24/7, Proyectos TI
- Ubicación: Mexicali, Baja California
- Inversión típica: Desde $1,000/mes, consultorías desde $4,000

GENERA UNA PROPUESTA CON ESTOS APARTADOS (formato markdown):

## 📋 PROPUESTA DE PROYECTO - ${clientName}

### 1. RESUMEN EJECUTIVO
Breve resumen del problema, solución y beneficios (3-4 líneas máximo)

### 2. ANÁLISIS DE LA SITUACIÓN ACTUAL
- Estado actual de infraestructura/sistemas
- Problemas identificados
- Riesgos actuales

### 3. SOLUCIÓN PROPUESTA
- Servicios específicos que aplican
- Tecnologías/herramientas a usar
- Fases de implementación

### 4. TIMELINE
- Fase 1: [descripción] (X semanas)
- Fase 2: [descripción] (X semanas)
- Fase 3: [descripción] (X semanas)
- Tiempo total estimado

### 5. BENEFICIOS ESPERADOS
- Beneficio 1
- Beneficio 2
- Beneficio 3
- Beneficio 4

### 6. PROPUESTA DE PRESUPUESTO

**Desglose de Costos:**
- Servicio 1: $X/mes
- Servicio 2: $X/mes
- Implementación inicial: $X (único pago)
- Total Mensual: $X
- Total Primer Año: $X

**Términos:**
- Contrato: 12 meses (renovable)
- Soporte incluido: 24/7
- Pago: Mensual/Inicial
- SLA: 99.5% de uptime

### 7. PRÓXIMOS PASOS
1. Revisión y aprobación de la propuesta
2. Firma del contrato
3. Kick-off del proyecto
4. Implementación según timeline

---
**Nota para NetVC:** Esta es una propuesta BASE. Ajusta precios según complejidad y presupuesto del cliente.`;

        const messages = [
            {
                role: 'user',
                content: proposalPrompt
            }
        ];

        const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2000,
            system: 'Eres especialista en redacción de propuestas técnicas y comerciales. Genera propuestas profesionales, detalladas y convincentes.',
            messages: messages
        });

        const proposalText = response.content[0].text;

        // Guardar propuesta
        const proposals = loadProposals();
        const newProposal = {
            id: Date.now(),
            clientName: clientName,
            clientEmail: clientEmail,
            clientPhone: clientPhone,
            timestamp: new Date().toISOString(),
            proposal: proposalText,
            status: 'pending' // pending, sent, approved, rejected
        };

        proposals.push(newProposal);
        saveProposals(proposals);

        res.json({
            success: true,
            proposal: proposalText,
            proposalId: newProposal.id
        });

    } catch (error) {
        console.error('Error generando propuesta:', error);
        res.status(500).json({ error: 'Error generando propuesta', details: error.message });
    }
});

// Endpoint: Panel Admin (protegido)
app.get('/admin', (req, res) => {
    const password = req.query.pwd;
    
    if (!password || password !== ADMIN_PASSWORD) {
        return res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>NetVC Admin - Login</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: center; height: 100vh; }
        .login-box { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); width: 100%; max-width: 350px; }
        h1 { color: #FF8C00; margin-bottom: 1.5rem; text-align: center; font-size: 1.5rem; }
        label { display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500; }
        input { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 1rem; font-size: 1rem; }
        input:focus { outline: none; border-color: #FF8C00; box-shadow: 0 0 5px rgba(255, 140, 0, 0.3); }
        button { width: 100%; padding: 0.75rem; background: #FF8C00; color: white; border: none; border-radius: 4px; font-size: 1rem; font-weight: 600; cursor: pointer; }
        button:hover { background: #E67E00; }
    </style>
</head>
<body>
    <div class="login-box">
        <h1>🔐 NetVC Admin</h1>
        <form method="GET">
            <label for="pwd">Contraseña:</label>
            <input type="password" id="pwd" name="pwd" placeholder="Ingresa contraseña" required>
            <button type="submit">Acceder</button>
        </form>
    </div>
</body>
</html>
        `);
    }

    // Si la contraseña es correcta, mostrar dashboard
    const conversations = loadConversations();
    
    // Agrupar conversaciones por cliente
    const clientsMap = {};
    conversations.forEach(conv => {
        if (!clientsMap[conv.clientName]) {
            clientsMap[conv.clientName] = {
                name: conv.clientName,
                phone: conv.clientPhone,
                email: conv.clientEmail,
                person: conv.personName,
                messages: []
            };
        }
        clientsMap[conv.clientName].messages.push({
            timestamp: conv.timestamp,
            user: conv.userMessage,
            bot: conv.botResponse
        });
    });

    const clients = Object.values(clientsMap);

    res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NetVC Admin - Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        header { background: #FF8C00; color: white; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; }
        h1 { font-size: 2rem; }
        .logout { background: white; color: #FF8C00; padding: 0.5rem 1rem; border-radius: 4px; text-decoration: none; font-weight: 600; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .stat-box { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
        .stat-box h3 { color: #FF8C00; font-size: 2rem; }
        .stat-box p { color: #666; margin-top: 0.5rem; }
        .clients-list { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
        .client-item { border-bottom: 1px solid #eee; padding: 1.5rem; cursor: pointer; transition: background 0.2s; }
        .client-item:hover { background: #f9f9f9; }
        .client-item:last-child { border-bottom: none; }
        .client-header { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 1rem; align-items: center; margin-bottom: 1rem; }
        .client-name { font-weight: 600; color: #333; }
        .client-contact { color: #666; font-size: 0.9rem; }
        .client-messages { display: none; padding: 1rem; background: #f9f9f9; border-top: 1px solid #eee; max-height: 400px; overflow-y: auto; }
        .client-messages.open { display: block; }
        .message { margin-bottom: 1rem; }
        .message.user { text-align: right; }
        .message.bot { text-align: left; }
        .bubble { display: inline-block; padding: 0.75rem 1rem; border-radius: 8px; max-width: 70%; }
        .message.user .bubble { background: #FF8C00; color: white; }
        .message.bot .bubble { background: #e0e0e0; color: #333; }
        .timestamp { font-size: 0.8rem; color: #999; margin-top: 0.25rem; }
        .toggle-btn { background: #FF8C00; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
        .toggle-btn:hover { background: #E67E00; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📊 NetVC Admin Panel</h1>
            <a class="logout" href="/">Cerrar sesión</a>
        </header>

        <div class="stats">
            <div class="stat-box">
                <h3>${clients.length}</h3>
                <p>Clientes Contactados</p>
            </div>
            <div class="stat-box">
                <h3>${conversations.length}</h3>
                <p>Mensajes Totales</p>
            </div>
        </div>

        <div class="clients-list">
            ${clients.length === 0 ? '<div style="padding: 2rem; text-align: center; color: #999;">Sin clientes aún</div>' : clients.map((client, idx) => {
                const clientConversations = conversations.filter(c => c.clientName === client.name);
                return `
                <div class="client-item">
                    <div class="client-header">
                        <div>
                            <div class="client-name">${client.name}</div>
                            <div class="client-contact">${client.phone}</div>
                        </div>
                        <div class="client-contact">${client.email}</div>
                        <div class="client-contact"><strong>${client.person}</strong></div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="toggle-btn" onclick="toggleMessages(${idx})">Ver Chat</button>
                            <button class="toggle-btn" style="background: #4CAF50;" onclick="generateProposal('${client.name}', '${client.email}', '${client.phone}', ${idx})">📄 Propuesta</button>
                        </div>
                    </div>
                    <div class="client-messages" id="messages-${idx}">
                        ${clientConversations.map(msg => `
                            <div class="message user">
                                <div class="bubble">${msg.userMessage}</div>
                                <div class="timestamp">${new Date(msg.timestamp).toLocaleString('es-MX')}</div>
                            </div>
                            <div class="message bot">
                                <div class="bubble">${msg.botResponse}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    </div>

    <script>
        function toggleMessages(idx) {
            const el = document.getElementById('messages-' + idx);
            el.classList.toggle('open');
        }

        async function generateProposal(clientName, clientEmail, clientPhone, idx) {
            try {
                // Obtener conversaciones del cliente
                const response = await fetch('/api/admin/conversations?pwd=${password}');
                const conversations = await response.json();
                const clientConversations = conversations.filter(c => c.clientName === clientName);

                if (clientConversations.length === 0) {
                    alert('No hay conversaciones para este cliente');
                    return;
                }

                // Generar propuesta
                const proposalResponse = await fetch('/api/generate-proposal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clientName: clientName,
                        clientEmail: clientEmail,
                        clientPhone: clientPhone,
                        conversationHistory: clientConversations,
                        password: '${password}'
                    })
                });

                const data = await proposalResponse.json();

                if (data.success) {
                    // Mostrar propuesta en modal
                    const modal = document.createElement('div');
                    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';
                    modal.innerHTML = \`
                        <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 900px; max-height: 90vh; overflow-y: auto; position: relative;">
                            <button onclick="this.closest('div').parentElement.remove()" style="position: absolute; top: 1rem; right: 1rem; background: #FF8C00; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">✕ Cerrar</button>
                            <div style="margin-top: 2rem;">
                                \${data.proposal.replace(/\\n/g, '<br>').replace(/##/g, '<h2 style="color: #FF8C00; margin-top: 1.5rem;">').replace(/###/g, '<h3 style="color: #666; margin-top: 1rem;")}
                            </div>
                            <div style="margin-top: 2rem; display: flex; gap: 1rem;">
                                <button onclick="copyToClipboard(\`\${data.proposal}\`)" style="flex: 1; padding: 0.75rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">📋 Copiar Propuesta</button>
                                <button onclick="this.closest('div').parentElement.remove()" style="flex: 1; padding: 0.75rem; background: #FF8C00; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Cerrar</button>
                            </div>
                        </div>
                    \`;
                    document.body.appendChild(modal);
                } else {
                    alert('Error generando propuesta: ' + data.error);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error generando propuesta');
            }
        }

        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('✅ Propuesta copiada al portapapeles');
            });
        }
    </script>
</body>
</html>
    `);
});

// API: Obtener conversaciones (protegido)
app.get('/api/admin/conversations', (req, res) => {
    const password = req.query.pwd;
    if (!password || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    res.json(loadConversations());
});

// API: Obtener clientes (protegido)
app.get('/api/admin/clients', (req, res) => {
    const password = req.query.pwd;
    if (!password || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    res.json(loadClients());
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

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`✅ Backend v6 - Chatbot Ultra Profesional con Admin en puerto ${PORT}`);
    console.log(`🔑 API Key: Configurada ✓`);
    console.log(`📞 Teléfono: ${NETVC_INFO.phone} | Email: ${NETVC_INFO.email}`);
    console.log(`🔐 Admin Panel: /admin (contraseña: ${ADMIN_PASSWORD})`);
});
