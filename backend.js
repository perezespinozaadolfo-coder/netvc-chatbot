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
const PROJECTS_FILE = path.join(__dirname, 'projects.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'NetVC2024';

// Información de NetVC
const NETVC_INFO = {
    phone: '+52 686 392 0262',
    email: 'Contacto@netvc.mx',
    schedule: 'Lunes-Viernes 10:30am-6:30pm',
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

function loadProjects() {
    if (fs.existsSync(PROJECTS_FILE)) {
        return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'));
    }
    return [];
}

function saveProjects(data) {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(data, null, 2));
}

// Endpoint: Chat EXPERTO EN RECOPILACIÓN DE DATOS
app.post('/api/chat', async (req, res) => {
    try {
        const { message, clientName, personName, lastExchange, clientPhone, clientEmail, messageCount } = req.body;

        if (!message || !clientName) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const assignedPerson = personName || SUPPORT_TEAM[Math.floor(Math.random() * SUPPORT_TEAM.length)];
        
        const systemPrompt = `Eres ${assignedPerson}, Ingeniero/a Senior especialista en TI de NetVC. Eres EXPERTO en recopilación de datos técnicos y comerciales.

INFORMACIÓN DE NETVC:
- Teléfono: ${NETVC_INFO.phone} | Email: ${NETVC_INFO.email}
- Horario: ${NETVC_INFO.schedule} | Ubicación: ${NETVC_INFO.location}
- Servicios: Consultoría TI, Implementación, Seguridad, Nube, Soporte 24/7, Proyectos TI
- Inversión: Desde $1,000/mes, consultorías desde $4,000

CLIENTE: ${clientName} | ${clientPhone} | ${clientEmail}

HISTORIAL DE CONVERSACIÓN (para contexto):
${lastExchange && lastExchange.lastQuestion ? `Última pregunta: ${lastExchange.lastQuestion}\nÚltima respuesta del cliente: ${lastExchange.lastResponse}` : 'Primera interacción'}

ESTRATEGIA - RECOPILACIÓN PROFUNDA DE DATOS CON MEMORIA:

**IMPORTANTE:** Revisa TODO lo que el cliente YA respondió en el historial de arriba. NO repitas preguntas que ya contestó.

FASE 1 - ESCUCHA INICIAL (mensaje 1-2):
- Presentación breve (solo primera vez)
- Dejar que cliente explique necesidad
- Una pregunta de seguimiento natural

FASE 2 - PREGUNTAS DIAGNÓSTICAS PROFUNDAS (mensaje 3-10):
Haz 1 pregunta por mensaje, MUY específica. PERO:
✅ Si cliente ya respondió algo en el historial, NO lo preguntes de nuevo
✅ Si mencionó algo parcialmente, profundiza en ESO, no en lo ya dicho
✅ Avanza lógicamente sin saltos
✅ Muestra que LEÍSTE y ENTENDISTE lo anterior

INFORMACIÓN A RECOPILAR (solo lo que NO contestó):
- Problema/necesidad exacta
- Tamaño/escala (usuarios, dispositivos, etc)
- Presupuesto disponible
- Timeline/urgencia
- Requisitos técnicos específicos
- Soporte/mantenimiento
- Integración con sistemas actuales

EJEMPLO DE MEMORIA CORRECTA:
- Cliente dijo: "Quiero una página web para escuela de karate"
- Tu próxima pregunta NO es: "¿qué tipo de negocio tienes?"
- Tu pregunta CORRECTA es: "¿Cuántos estudiantes tiene la escuela?"

IMPORTANTE:
- Máximo 1 pregunta por mensaje
- SÉ EMPÁTICO pero DIRECTO
- Respuestas breves (60-80 palabras máximo)
- NO repitas preguntas
- Eres EXPERTO: muestra que escuchaste
- Tono: CEO a CEO`;

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

// Endpoint: Generar Reporte y Presupuesto (solo admin)
app.post('/api/generate-project-report', async (req, res) => {
    try {
        const { clientName, clientEmail, clientPhone, conversationHistory, password } = req.body;

        if (!password || password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'No autorizado' });
        }

        if (!clientName || !conversationHistory) {
            return res.status(400).json({ error: 'Faltan datos' });
        }

        // Crear prompt para analizar y generar reporte
        const reportPrompt = `Analiza esta conversación con un cliente de NetVC y genera un REPORTE DE PROYECTO DETALLADO.

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
- Contatos: ${NETVC_INFO.phone} | ${NETVC_INFO.email}

GENERA UN REPORTE CON ESTE FORMATO (JSON):

{
  "clientInfo": {
    "nombre": "${clientName}",
    "email": "${clientEmail}",
    "telefono": "${clientPhone}",
    "timestamp": "${new Date().toISOString()}"
  },
  
  "datosRecopilados": {
    "tipoProyecto": "Describe el tipo de proyecto identificado",
    "infraestructuraActual": "Equipos, sistemas, ubicaciones",
    "alcanceProyecto": "Qué se incluye en el proyecto",
    "usuarios": "Cantidad de usuarios/dispositivos",
    "ubicaciones": "Ubicaciones geográficas involucradas"
  },
  
  "datosPendientes": [
    "Dato pendiente 1",
    "Dato pendiente 2"
  ],
  
  "requisitosTecnicos": {
    "velocidad": "Ancho de banda requerido",
    "disponibilidad": "SLA/Disponibilidad requerida",
    "redundancia": "Si es necesaria redundancia",
    "soporteTecnico": "Tipo de soporte requerido",
    "notas": "Notas técnicas relevantes"
  },
  
  "presupuestoProvisional": {
    "componente1": {
      "descripcion": "Descripción del servicio/equipo",
      "costoMensual": 500,
      "costoInstalacion": 2000,
      "notas": "Detalles relevantes"
    },
    "componente2": {
      "descripcion": "Descripción del servicio/equipo",
      "costoMensual": 300,
      "costoInstalacion": 0,
      "notas": "Detalles relevantes"
    }
  },
  
  "totalPresupuesto": {
    "costoMensual": 800,
    "costoInstalacionInicial": 2000,
    "costoAnual": 9600,
    "notas": "Estos costos son PROVISIONALES. Pueden variar según datos pendientes."
  },
  
  "timeline": {
    "fase1": "Descripción (estimado X semanas)",
    "fase2": "Descripción (estimado X semanas)",
    "fase3": "Descripción (estimado X semanas)"
  },
  
  "proximosPasos": [
    "Cliente debe enviar datos pendientes a ${NETVC_INFO.email}",
    "NetVC revisa y genera propuesta final",
    "Llamada con cliente para aclarar dudas",
    "Firma de contrato y kick-off del proyecto"
  ],
  
  "recomendaciones": "Recomendaciones de NetVC basadas en el proyecto"
}

IMPORTANTE: 
- Los datos pendientes deben ser ESPECÍFICOS (no genéricos)
- El presupuesto debe ser REALISTA basado en lo que se recopiló
- Si falta información crítica, lo anotás como pendiente
- Sé profesional y detallado`;

        const messages = [
            {
                role: 'user',
                content: reportPrompt
            }
        ];

        const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 3000,
            system: 'Eres analista de proyectos TI senior de NetVC. Generas reportes técnicos y comerciales profesionales en formato JSON.',
            messages: messages
        });

        const reportText = response.content[0].text;
        
        // Parsear JSON del reporte
        let reportData;
        try {
            // Extraer JSON del texto si está envuelto
            const jsonMatch = reportText.match(/\{[\s\S]*\}/);
            reportData = JSON.parse(jsonMatch ? jsonMatch[0] : reportText);
        } catch (e) {
            console.error('Error parseando JSON:', e);
            reportData = { rawReport: reportText, error: 'No se pudo parsear JSON' };
        }

        // Guardar proyecto
        const projects = loadProjects();
        const newProject = {
            id: Date.now(),
            clientName: clientName,
            clientEmail: clientEmail,
            clientPhone: clientPhone,
            timestamp: new Date().toISOString(),
            report: reportData,
            status: 'pending_review' // pending_review, ready_to_send, sent, approved
        };

        projects.push(newProject);
        saveProjects(projects);

        res.json({
            success: true,
            report: reportData,
            projectId: newProject.id
        });

    } catch (error) {
        console.error('Error generando reporte:', error);
        res.status(500).json({ error: 'Error generando reporte', details: error.message });
    }
});

// Endpoint: Panel Admin
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
    const projects = loadProjects();
    
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

    const clientsHtml = clients.map((client, idx) => {
        const clientConversations = conversations.filter(c => c.clientName === client.name);
        const clientProject = projects.find(p => p.clientName === client.name);
        
        let messagesHtml = '';
        clientConversations.forEach(msg => {
            messagesHtml += '<div class="message user"><div class="bubble">' + msg.userMessage + '</div><div class="timestamp">' + new Date(msg.timestamp).toLocaleString('es-MX') + '</div></div>';
            messagesHtml += '<div class="message bot"><div class="bubble">' + msg.botResponse + '</div></div>';
        });
        
        let projectHtml = '';
        if (clientProject) {
            const reportStr = JSON.stringify(clientProject.report).replace(/'/g, '&apos;');
            projectHtml = '<div style="background: #f0f0f0; padding: 1rem; border-radius: 4px; margin-top: 1rem;"><h4 style="color: #FF8C00; margin-bottom: 0.5rem;">📊 Reporte Generado</h4><button class="toggle-btn" onclick="viewReport(\'' + reportStr + '\')">Ver Reporte Completo</button></div>';
        }
        
        return '<div class="client-item"><div class="client-header"><div><div class="client-name">' + client.name + '</div><div class="client-contact">' + client.phone + '</div></div><div class="client-contact">' + client.email + '</div><div class="client-contact"><strong>' + client.person + '</strong></div><div class="btn-group"><button class="toggle-btn" onclick="toggleMessages(' + idx + ')">💬 Chat</button><button class="toggle-btn generate" onclick="generateReport(\'' + client.name + '\', \'' + client.email + '\', \'' + client.phone + '\', ' + idx + ')">📄 Reporte</button></div></div><div class="client-messages" id="messages-' + idx + '">' + messagesHtml + '</div>' + projectHtml + '</div>';
    }).join('');

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
        .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
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
        .client-messages { display: none; padding: 1rem; background: #f9f9f9; border-top: 1px solid #eee; max-height: 400px; overflow-y: auto; margin-bottom: 1rem; }
        .client-messages.open { display: block; }
        .message { margin-bottom: 1rem; }
        .message.user { text-align: right; }
        .message.bot { text-align: left; }
        .bubble { display: inline-block; padding: 0.75rem 1rem; border-radius: 8px; max-width: 70%; }
        .message.user .bubble { background: #FF8C00; color: white; }
        .message.bot .bubble { background: #e0e0e0; color: #333; }
        .timestamp { font-size: 0.8rem; color: #999; margin-top: 0.25rem; }
        .btn-group { display: flex; gap: 0.5rem; }
        .toggle-btn { background: #FF8C00; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
        .toggle-btn.generate { background: #4CAF50; }
        .toggle-btn:hover { opacity: 0.9; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📊 NetVC Admin Panel v7</h1>
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
            <div class="stat-box">
                <h3>${projects.length}</h3>
                <p>Reportes Generados</p>
            </div>
        </div>

        <div class="clients-list">
            ${clients.length === 0 ? '<div style="padding: 2rem; text-align: center; color: #999;">Sin clientes aún</div>' : clientsHtml}
        </div>
    </div>

    <script>
        const pwd = '${password}';

        function toggleMessages(idx) {
            const el = document.getElementById('messages-' + idx);
            el.classList.toggle('open');
        }

        async function generateReport(clientName, clientEmail, clientPhone, idx) {
            try {
                // Obtener conversaciones del cliente
                const response = await fetch('/api/admin/conversations?pwd=' + pwd);
                const conversations = await response.json();
                const clientConversations = conversations.filter(c => c.clientName === clientName);

                if (clientConversations.length === 0) {
                    alert('No hay conversaciones para este cliente');
                    return;
                }

                // Generar reporte
                const reportResponse = await fetch('/api/generate-project-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clientName: clientName,
                        clientEmail: clientEmail,
                        clientPhone: clientPhone,
                        conversationHistory: clientConversations,
                        password: pwd
                    })
                });

                const data = await reportResponse.json();

                if (data.success) {
                    viewReport(JSON.stringify(data.report, null, 2));
                } else {
                    alert('Error: ' + data.error);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error generando reporte');
            }
        }

        function viewReport(reportJson) {
            try {
                const report = typeof reportJson === 'string' ? JSON.parse(reportJson) : reportJson;
                
                const modal = document.createElement('div');
                modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;';
                
                const content = \`
                    <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 1200px; max-height: 90vh; overflow-y: auto; position: relative;">
                        <button onclick="this.closest('div').parentElement.remove()" style="position: absolute; top: 1rem; right: 1rem; background: #FF8C00; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">✕</button>
                        
                        <h2 style="color: #FF8C00; margin-bottom: 1.5rem;">📊 REPORTE DE PROYECTO</h2>
                        
                        <h3 style="color: #333; margin-top: 1.5rem; border-bottom: 2px solid #FF8C00; padding-bottom: 0.5rem;">📋 Información del Cliente</h3>
                        <p><strong>Nombre:</strong> \${report.clientInfo?.nombre}</p>
                        <p><strong>Email:</strong> \${report.clientInfo?.email}</p>
                        <p><strong>Teléfono:</strong> \${report.clientInfo?.telefono}</p>
                        
                        <h3 style="color: #333; margin-top: 1.5rem; border-bottom: 2px solid #FF8C00; padding-bottom: 0.5rem;">✅ Datos Recopilados</h3>
                        <p><strong>Tipo de Proyecto:</strong> \${report.datosRecopilados?.tipoProyecto}</p>
                        <p><strong>Infraestructura Actual:</strong> \${report.datosRecopilados?.infraestructuraActual}</p>
                        <p><strong>Alcance:</strong> \${report.datosRecopilados?.alcanceProyecto}</p>
                        <p><strong>Usuarios/Dispositivos:</strong> \${report.datosRecopilados?.usuarios}</p>
                        
                        <h3 style="color: #FF6B35; margin-top: 1.5rem; border-bottom: 2px solid #FF6B35; padding-bottom: 0.5rem;">⚠️ Datos Pendientes (ENVIAR POR EMAIL)</h3>
                        <ul style="margin-left: 1.5rem;">
                            \${(report.datosPendientes || []).map(d => \`<li>\${d}</li>\`).join('')}
                        </ul>
                        <p style="margin-top: 0.5rem; font-size: 0.9rem; color: #666;"><strong>👉 Cliente debe enviar estos datos a: Contacto@netvc.mx</strong></p>
                        
                        <h3 style="color: #333; margin-top: 1.5rem; border-bottom: 2px solid #FF8C00; padding-bottom: 0.5rem;">🔧 Requisitos Técnicos</h3>
                        <p><strong>Velocidad:</strong> \${report.requisitosTecnicos?.velocidad}</p>
                        <p><strong>Disponibilidad:</strong> \${report.requisitosTecnicos?.disponibilidad}</p>
                        <p><strong>Soporte Técnico:</strong> \${report.requisitosTecnicos?.soporteTecnico}</p>
                        
                        <h3 style="color: #4CAF50; margin-top: 1.5rem; border-bottom: 2px solid #4CAF50; padding-bottom: 0.5rem;">💰 PRESUPUESTO PROVISIONAL</h3>
                        <div style="background: #f9f9f9; padding: 1rem; border-radius: 4px; margin-bottom: 1rem;">
                            \${Object.keys(report.presupuestoProvisional || {}).map(key => {
                                if (key === 'totalPresupuesto') return '';
                                const comp = report.presupuestoProvisional[key];
                                return \`
                                    <div style="margin-bottom: 1rem; border-left: 3px solid #FF8C00; padding-left: 1rem;">
                                        <strong>\${comp.descripcion}</strong>
                                        <p>💵 Mensual: \$\${comp.costoMensual.toLocaleString('es-MX')} | 💵 Instalación: \$\${comp.costoInstalacion.toLocaleString('es-MX')}</p>
                                    </div>
                                \`;
                            }).join('')}
                        </div>
                        
                        <div style="background: #FFF3E0; padding: 1.5rem; border-radius: 4px; border-left: 4px solid #FF8C00;">
                            <h4 style="color: #FF8C00; margin-bottom: 0.5rem;">TOTAL PRESUPUESTO (PROVISIONAL)</h4>
                            <p><strong>Costo Mensual:</strong> \$\${report.totalPresupuesto?.costoMensual?.toLocaleString('es-MX')}</p>
                            <p><strong>Instalación Inicial:</strong> \$\${report.totalPresupuesto?.costoInstalacionInicial?.toLocaleString('es-MX')}</p>
                            <p><strong>Costo Anual:</strong> \$\${report.totalPresupuesto?.costoAnual?.toLocaleString('es-MX')}</p>
                            <p style="font-size: 0.9rem; color: #666; margin-top: 0.5rem; font-style: italic;">\${report.totalPresupuesto?.notas}</p>
                        </div>
                        
                        <h3 style="color: #333; margin-top: 1.5rem; border-bottom: 2px solid #FF8C00; padding-bottom: 0.5rem;">📅 Timeline</h3>
                        \${Object.keys(report.timeline || {}).map(phase => \`
                            <p><strong>\${phase.toUpperCase()}:</strong> \${report.timeline[phase]}</p>
                        \`).join('')}
                        
                        <h3 style="color: #333; margin-top: 1.5rem; border-bottom: 2px solid #FF8C00; padding-bottom: 0.5rem;">🎯 Próximos Pasos</h3>
                        <ol style="margin-left: 1.5rem;">
                            \${(report.proximosPasos || []).map(paso => \`<li>\${paso}</li>\`).join('')}
                        </ol>
                        
                        <h3 style="color: #333; margin-top: 1.5rem; border-bottom: 2px solid #FF8C00; padding-bottom: 0.5rem;">💡 Recomendaciones</h3>
                        <p>\${report.recomendaciones}</p>
                        
                        <div style="margin-top: 2rem; display: flex; gap: 1rem;">
                            <button onclick="copyToClipboard(\\\`\${JSON.stringify(report, null, 2)}\\\`);" style="flex: 1; padding: 0.75rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">📋 Copiar JSON</button>
                            <button onclick="this.closest('div').parentElement.remove()" style="flex: 1; padding: 0.75rem; background: #FF8C00; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Cerrar</button>
                        </div>
                    </div>
                \`;
                
                modal.innerHTML = content;
                document.body.appendChild(modal);
            } catch (e) {
                console.error('Error:', e);
                alert('Error mostrando reporte');
            }
        }

        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('✅ Reporte copiado al portapapeles');
            });
        }
    </script>
</body>
</html>
    `);
});

// API: Obtener conversaciones
app.get('/api/admin/conversations', (req, res) => {
    const password = req.query.pwd;
    if (!password || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    res.json(loadConversations());
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`✅ Backend v7 - Chatbot Experto en Recopilación Profunda en puerto ${PORT}`);
    console.log(`🔑 API Key: Configurada ✓`);
    console.log(`📞 Teléfono: ${NETVC_INFO.phone} | Horario: ${NETVC_INFO.schedule}`);
    console.log(`🔐 Admin Panel: /admin (contraseña: ${ADMIN_PASSWORD})`);
});
