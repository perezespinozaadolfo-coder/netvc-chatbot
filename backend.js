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

// Endpoint: Chat
app.post('/api/chat', async (req, res) => {
    try {
        const { message, clientName, personName, lastExchange, clientPhone, clientEmail } = req.body;

        if (!message || !clientName) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const assignedPerson = personName || SUPPORT_TEAM[Math.floor(Math.random() * SUPPORT_TEAM.length)];
        
        const systemPrompt = `Eres ${assignedPerson}, Ingeniero/a Senior especialista en TI de NetVC. EXPERTO EN RECOPILACIÓN PROFUNDA.

INFORMACIÓN DE NETVC:
- Teléfono: ${NETVC_INFO.phone} | Email: ${NETVC_INFO.email}
- Horario: ${NETVC_INFO.schedule}
- Servicios: Consultoría TI, Implementación, Seguridad, Nube, Soporte 24/7, Proyectos TI

CLIENTE: ${clientName} | ${clientPhone} | ${clientEmail}

HISTORIAL ANTERIOR (para contexto):
${lastExchange && lastExchange.lastQuestion ? `Última pregunta: ${lastExchange.lastQuestion}` : 'Primera interacción'}

ESTRATEGIA - MEMORIA INTELIGENTE:

**IMPORTANTE:** Si el cliente YA respondió algo en el historial, NO lo preguntes de nuevo.
Avanza lógicamente sin saltos. Profundiza en lo que falta.

FASE 1 - ESCUCHA INICIAL: Presentación breve, dejar que explique su necesidad

FASE 2 - PREGUNTAS DIAGNÓSTICAS PROFUNDAS:
Haz 1 pregunta por mensaje, MUY específica. Información a recopilar:
- Problema/necesidad exacta
- Tamaño/escala (usuarios, dispositivos, etc)
- Presupuesto disponible
- Timeline/urgencia
- Requisitos técnicos
- Soporte/mantenimiento

FASE 3 - CIERRE:
Cuando tengas suficiente info (8-10 preguntas), cierra:
"Perfecto ${clientName}, tengo claro tu proyecto. 📋
NUESTROS INGENIEROS EXPERTOS analizarán toda la información y se pondrán en contacto lo antes posible.
Si tienes dudas: ${NETVC_INFO.phone} (${NETVC_INFO.schedule})
¡Gracias por confiar en NetVC! 🚀"

IMPORTANTE:
- Máximo 1 pregunta por mensaje
- Respuestas breves (60-80 palabras)
- NO repitas preguntas
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
        
        messages.push({
            role: 'user',
            content: message
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

// Endpoint: Generar Reporte Profesional
app.post('/api/generate-project-report', async (req, res) => {
    try {
        const { clientName, clientEmail, clientPhone, conversationHistory, password } = req.body;

        if (!password || password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'No autorizado' });
        }

        if (!clientName || !conversationHistory) {
            return res.status(400).json({ error: 'Faltan datos' });
        }

        const reportPrompt = `ERES ANALISTA SENIOR DE PROYECTOS DE NETVC.

Basándote en esta conversación con un cliente, genera un REPORTE PROFESIONAL INTERNO para ingenieros de NetVC.

CLIENTE:
- Nombre: ${clientName}
- Email: ${clientEmail}
- Teléfono: ${clientPhone}

CONVERSACIÓN:
${conversationHistory.map(msg => `Cliente: ${msg.userMessage}\nNetVC: ${msg.botResponse}`).join('\n\n')}

GENERA UN REPORTE JSON CON ESTE FORMATO EXACTO:

{
  "clientInfo": {
    "nombre": "${clientName}",
    "email": "${clientEmail}",
    "telefono": "${clientPhone}"
  },
  "datosRecopilados": {
    "tipoProyecto": "Descripción del tipo de proyecto",
    "escala": "Tamaño/usuarios/dispositivos",
    "ubicacion": "Ubicaciones geográficas",
    "infraestructura": "Estado actual de infraestructura"
  },
  "datosPendientes": ["Dato 1", "Dato 2"],
  "propuestaDesarrollo": {
    "titulo": "Título de la propuesta",
    "analisisTecnico": "Análisis técnico detallado",
    "solucionPropuesta": "Solución específica que NetVC propone",
    "fases": "Fases de implementación con timeline",
    "recomendaciones": "Recomendaciones profesionales para el cliente",
    "costoEstimado": "Rango estimado del costo total"
  },
  "presupuestoDetallado": {
    "componentes": [
      {"nombre": "Componente 1", "descripcion": "Descripción", "costoMensual": 500, "costoInstalacion": 2000},
      {"nombre": "Componente 2", "descripcion": "Descripción", "costoMensual": 300, "costoInstalacion": 0}
    ],
    "totalMensual": 800,
    "totalInstalacion": 2000,
    "totalAnual": 9600,
    "notas": "Presupuesto provisional sujeto a datos confirmados"
  },
  "proximosPasos": ["Paso 1", "Paso 2", "Paso 3"]
}

IMPORTANTE: Genera JSON VÁLIDO, números reales, recomendaciones profesionales.`;

        const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2500,
            system: 'Eres especialista en análisis y propuestas de proyectos TI. Genera reportes profesionales en JSON válido.',
            messages: [{ role: 'user', content: reportPrompt }]
        });

        const reportText = response.content[0].text;
        
        let reportData;
        try {
            const jsonMatch = reportText.match(/\{[\s\S]*\}/);
            reportData = JSON.parse(jsonMatch ? jsonMatch[0] : reportText);
        } catch (e) {
            reportData = { error: 'No se pudo parsear', rawReport: reportText };
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
            status: 'pending_review'
        };

        projects.push(newProject);
        saveProjects(projects);

        res.json({
            success: true,
            report: reportData,
            projectId: newProject.id
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error generando reporte', details: error.message });
    }
});

// Endpoint: Descargar Reporte como TXT
app.get('/api/download-report/:projectId', (req, res) => {
    try {
        const { projectId } = req.params;
        const password = req.query.pwd;

        if (!password || password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'No autorizado' });
        }

        const projects = loadProjects();
        const project = projects.find(p => p.id === parseInt(projectId));

        if (!project) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }

        // Generar contenido TXT formateado
        const report = project.report;
        let content = `REPORTE DE PROYECTO - NETVC\n`;
        content += `${'='.repeat(80)}\n\n`;
        content += `CLIENTE: ${report.clientInfo.nombre}\n`;
        content += `EMAIL: ${report.clientInfo.email}\n`;
        content += `TELÉFONO: ${report.clientInfo.telefono}\n`;
        content += `FECHA: ${new Date(project.timestamp).toLocaleString('es-MX')}\n\n`;

        content += `DATOS RECOPILADOS\n`;
        content += `${'-'.repeat(80)}\n`;
        content += `Tipo Proyecto: ${report.datosRecopilados.tipoProyecto}\n`;
        content += `Escala: ${report.datosRecopilados.escala}\n`;
        content += `Ubicación: ${report.datosRecopilados.ubicacion}\n`;
        content += `Infraestructura: ${report.datosRecopilados.infraestructura}\n\n`;

        if (report.datosPendientes && report.datosPendientes.length > 0) {
            content += `DATOS PENDIENTES (SOLICITADOS POR EMAIL)\n`;
            content += `${'-'.repeat(80)}\n`;
            report.datosPendientes.forEach(dato => {
                content += `⚠️  ${dato}\n`;
            });
            content += `\n👉 Cliente debe enviar estos datos a: Contacto@netvc.mx\n\n`;
        }

        content += `PROPUESTA DE DESARROLLO\n`;
        content += `${'-'.repeat(80)}\n`;
        content += `${report.propuestaDesarrollo.titulo}\n\n`;
        content += `Análisis Técnico:\n${report.propuestaDesarrollo.analisisTecnico}\n\n`;
        content += `Solución Propuesta:\n${report.propuestaDesarrollo.solucionPropuesta}\n\n`;
        content += `Fases:\n${report.propuestaDesarrollo.fases}\n\n`;
        content += `Recomendaciones:\n${report.propuestaDesarrollo.recomendaciones}\n\n`;
        content += `Costo Estimado: ${report.propuestaDesarrollo.costoEstimado}\n\n`;

        content += `PRESUPUESTO DETALLADO\n`;
        content += `${'-'.repeat(80)}\n`;
        report.presupuestoDetallado.componentes.forEach(comp => {
            content += `\n${comp.nombre}\n`;
            content += `  Descripción: ${comp.descripcion}\n`;
            content += `  Costo Mensual: $${comp.costoMensual.toLocaleString('es-MX')}\n`;
            content += `  Instalación: $${comp.costoInstalacion.toLocaleString('es-MX')}\n`;
        });
        content += `\nTOTAL MENSUAL: $${report.presupuestoDetallado.totalMensual.toLocaleString('es-MX')}\n`;
        content += `TOTAL INSTALACIÓN: $${report.presupuestoDetallado.totalInstalacion.toLocaleString('es-MX')}\n`;
        content += `TOTAL ANUAL: $${report.presupuestoDetallado.totalAnual.toLocaleString('es-MX')}\n`;
        content += `\nNotas: ${report.presupuestoDetallado.notas}\n\n`;

        content += `PRÓXIMOS PASOS\n`;
        content += `${'-'.repeat(80)}\n`;
        report.proximosPasos.forEach((paso, idx) => {
            content += `${idx + 1}. ${paso}\n`;
        });

        content += `\n${'='.repeat(80)}\n`;
        content += `Reporte generado por NetVC - ${new Date().toLocaleString('es-MX')}\n`;

        // Enviar como descarga
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="Reporte_${report.clientInfo.nombre}_${Date.now()}.txt"`);
        res.send(content);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error descargando reporte' });
    }
});

// Endpoint: Panel Admin
app.get('/admin', (req, res) => {
    const password = req.query.pwd;
    
    if (!password || password !== ADMIN_PASSWORD) {
        return res.send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>NetVC Admin - Login</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto;background:#f5f5f5;display:flex;justify-content:center;align-items:center;height:100vh}
.login-box{background:white;padding:2rem;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);max-width:350px;width:100%}h1{color:#FF8C00;margin-bottom:1.5rem;text-align:center}
label{display:block;margin-bottom:0.5rem;color:#333;font-weight:500}input{width:100%;padding:0.75rem;border:1px solid #ddd;border-radius:4px;margin-bottom:1rem}
input:focus{outline:0;border-color:#FF8C00;box-shadow:0 0 5px rgba(255,140,0,0.3)}button{width:100%;padding:0.75rem;background:#FF8C00;color:white;border:0;border-radius:4px;font-weight:600;cursor:pointer}
button:hover{background:#E67E00}</style></head><body><div class="login-box"><h1>🔐 NetVC Admin</h1>
<form method="GET"><label>Contraseña:</label><input type="password" name="pwd" placeholder="Ingresa contraseña" required>
<button type="submit">Acceder</button></form></div></body></html>`);
    }

    const conversations = loadConversations();
    const projects = loadProjects();
    
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
        const clientMsgs = conversations.filter(c => c.clientName === client.name);
        const clientProj = projects.find(p => p.clientName === client.name);
        
        let msgsHtml = '';
        clientMsgs.forEach(msg => {
            msgsHtml += '<div class="msg-user"><strong>' + msg.userMessage + '</strong><br><small>' + new Date(msg.timestamp).toLocaleString('es-MX') + '</small></div>';
            msgsHtml += '<div class="msg-bot">' + msg.botResponse + '</div>';
        });
        
        let projBtn = '';
        if (clientProj) {
            projBtn = '<button class="btn-report" onclick="viewReport(' + clientProj.id + ', \'' + password + '\')">📄 Ver Reporte</button><button class="btn-download" onclick="downloadReport(' + clientProj.id + ', \'' + password + '\')">📥 Descargar</button>';
        } else {
            projBtn = '<button class="btn-generate" onclick="generateReport(\'' + client.name + '\', \'' + client.email + '\', \'' + client.phone + '\', \'' + password + '\')">📄 Generar Reporte</button>';
        }
        
        return '<div class="client"><div class="header"><div><strong>' + client.name + '</strong><br><small>' + client.phone + ' | ' + client.email + ' | ' + client.person + '</small></div><div class="btns"><button onclick="toggleChat(' + idx + ')">💬 Chat</button>' + projBtn + '</div></div><div class="msgs" id="chat-' + idx + '">' + msgsHtml + '</div></div>';
    }).join('');

    res.send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NetVC Admin - Dashboard</title><style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto;background:#f5f5f5}
.container{max-width:1400px;margin:0 auto;padding:2rem}header{background:#FF8C00;color:white;padding:1.5rem;border-radius:8px;margin-bottom:2rem;display:flex;justify-content:space-between;align-items:center}
h1{font-size:2rem}.logout{background:white;color:#FF8C00;padding:0.5rem 1rem;border-radius:4px;text-decoration:none;font-weight:600}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:2rem}
.stat{background:white;padding:1.5rem;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);text-align:center}
.stat h3{color:#FF8C00;font-size:2rem}.stat p{color:#666;margin-top:0.5rem}
.clients{background:white;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}
.client{border-bottom:1px solid #eee;padding:1.5rem}.client:last-child{border-bottom:0}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem}
.btns{display:flex;gap:0.5rem}button{padding:0.5rem 1rem;border:0;border-radius:4px;cursor:pointer;font-weight:600}
.btn-report,.btn-generate{background:#FF8C00;color:white}.btn-download{background:#4CAF50;color:white}
button:hover{opacity:0.9}
.msgs{display:none;max-height:400px;overflow-y:auto;padding:1rem;background:#f9f9f9;border-radius:4px;margin-top:1rem}
.msgs.open{display:block}
.msg-user,.msg-bot{margin-bottom:1rem;padding:0.75rem;border-radius:4px}
.msg-user{background:#FF8C00;color:white;text-align:right}.msg-bot{background:#e0e0e0;color:#333}
.modal{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);align-items:center;justify-content:center;z-index:1000}
.modal.open{display:flex}
.modal-content{background:white;padding:2rem;border-radius:8px;max-width:900px;max-height:90vh;overflow-y:auto;position:relative}
.close{position:absolute;top:1rem;right:1rem;background:#FF8C00;color:white;border:0;padding:0.5rem 1rem;border-radius:4px;cursor:pointer}
</style></head><body><div class="container"><header><h1>📊 NetVC Admin Panel v8</h1><a class="logout" href="/">Cerrar sesión</a></header>
<div class="stats"><div class="stat"><h3>${clients.length}</h3><p>Clientes</p></div><div class="stat"><h3>${conversations.length}</h3><p>Mensajes</p></div><div class="stat"><h3>${projects.length}</h3><p>Reportes</p></div></div>
<div class="clients">${clients.length === 0 ? '<div style="padding:2rem;text-align:center;color:#999">Sin clientes aún</div>' : clientsHtml}</div></div>

<div id="modal" class="modal"><div class="modal-content"><button class="close" onclick="closeModal()">✕</button><div id="modal-body"></div></div></div>

<script>
const pwd = '${password}';

function toggleChat(idx){document.getElementById('chat-'+idx).classList.toggle('open')}

function generateReport(name,email,phone,pwd){
  fetch('/api/admin/conversations?pwd='+pwd)
    .then(r=>r.json())
    .then(convs=>{
      const clientConvs = convs.filter(c=>c.clientName===name);
      if(!clientConvs.length){alert('Sin conversaciones');return}
      fetch('/api/generate-project-report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientName:name,clientEmail:email,clientPhone:phone,conversationHistory:clientConvs,password:pwd})})
        .then(r=>r.json())
        .then(data=>{
          if(data.success)viewReport(data.projectId, pwd);
          else alert('Error: '+data.error);
        })
        .catch(e=>{console.error(e);alert('Error generando reporte')});
    });
}

function viewReport(projectId,pwd){
  fetch('/api/admin/projects?pwd='+pwd)
    .then(r=>r.json())
    .then(projects=>{
      const proj = projects.find(p=>p.id===projectId);
      if(!proj){alert('Proyecto no encontrado');return}
      const r = proj.report;
      let html = '<h2>📊 REPORTE DE PROYECTO</h2>';
      html += '<h3>Cliente: '+r.clientInfo.nombre+'</h3>';
      html += '<p><strong>Email:</strong> '+r.clientInfo.email+'</p>';
      html += '<p><strong>Teléfono:</strong> '+r.clientInfo.telefono+'</p>';
      html += '<hr><h3>DATOS RECOPILADOS</h3>';
      html += '<p><strong>Tipo Proyecto:</strong> '+r.datosRecopilados.tipoProyecto+'</p>';
      html += '<p><strong>Escala:</strong> '+r.datosRecopilados.escala+'</p>';
      if(r.datosPendientes && r.datosPendientes.length){
        html += '<hr><h3>⚠️ DATOS PENDIENTES</h3><ul>';
        r.datosPendientes.forEach(d=>{html += '<li>'+d+'</li>'});
        html += '</ul><p><em>👉 Solicitados por: '+r.clientInfo.email+'</em></p>';
      }
      html += '<hr><h3>PROPUESTA DE DESARROLLO</h3>';
      html += '<p><strong>'+r.propuestaDesarrollo.titulo+'</strong></p>';
      html += '<p>'+r.propuestaDesarrollo.analisisTecnico+'</p>';
      html += '<p><strong>Solución:</strong> '+r.propuestaDesarrollo.solucionPropuesta+'</p>';
      html += '<p><strong>Fases:</strong> '+r.propuestaDesarrollo.fases+'</p>';
      html += '<hr><h3>💰 PRESUPUESTO DETALLADO</h3>';
      r.presupuestoDetallado.componentes.forEach(c=>{
        html += '<div style="background:#f9f9f9;padding:1rem;margin-bottom:1rem;border-radius:4px"><strong>'+c.nombre+'</strong><br>'+c.descripcion+'<br>Mensual: $'+c.costoMensual.toLocaleString('es-MX')+' | Instalación: $'+c.costoInstalacion.toLocaleString('es-MX')+'</div>';
      });
      html += '<div style="background:#FFF3E0;padding:1.5rem;border-radius:4px;border-left:4px solid #FF8C00"><h4>TOTAL</h4><p>Mensual: <strong>$'+r.presupuestoDetallado.totalMensual.toLocaleString('es-MX')+'</strong></p><p>Instalación: <strong>$'+r.presupuestoDetallado.totalInstalacion.toLocaleString('es-MX')+'</strong></p><p>Anual: <strong>$'+r.presupuestoDetallado.totalAnual.toLocaleString('es-MX')+'</strong></p></div>';
      html += '<hr><button onclick="downloadReport('+projectId+',\''+pwd+'\')" style="background:#4CAF50;color:white;padding:0.75rem 1.5rem;border:0;border-radius:4px;cursor:pointer;font-weight:600">📥 Descargar Reporte</button>';
      document.getElementById('modal-body').innerHTML = html;
      document.getElementById('modal').classList.add('open');
    });
}

function downloadReport(projectId,pwd){
  window.location.href = '/api/download-report/'+projectId+'?pwd='+pwd;
}

function closeModal(){
  document.getElementById('modal').classList.remove('open');
}
</script></body></html>`);
});

// API: Obtener conversaciones
app.get('/api/admin/conversations', (req, res) => {
    const password = req.query.pwd;
    if (!password || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    res.json(loadConversations());
});

// API: Obtener proyectos
app.get('/api/admin/projects', (req, res) => {
    const password = req.query.pwd;
    if (!password || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    res.json(loadProjects());
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`✅ Backend v8 - Panel Admin Funcional en puerto ${PORT}`);
    console.log(`🔑 API Key: Configurada ✓`);
    console.log(`📞 Teléfono: ${NETVC_INFO.phone} | Horario: ${NETVC_INFO.schedule}`);
    console.log(`🔐 Admin Panel: /admin (contraseña: ${ADMIN_PASSWORD})`);
});
