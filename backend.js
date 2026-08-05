const express = require('express');
const Anthropic = require('@anthropic-ai/sdk').default;
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
    console.log('🔑 API Key: ERROR ✗');
    process.exit(1);
}

const client = new Anthropic({ apiKey: API_KEY });
const SUPPORT_TEAM = ['Sharon', 'Abigail', 'Angel', 'Juan', 'Estefania', 'Francisco', 'Adolfo', 'Alessandra', 'Francia'];
const CONVERSATIONS_FILE = path.join(__dirname, 'conversations.json');
const PROJECTS_FILE = path.join(__dirname, 'projects.json');
const ADMIN_PASSWORD = 'NetVC2024';

const NETVC_INFO = {
    phone: '+52 686 392 0262',
    email: 'Contacto@netvc.mx',
    schedule: 'Lunes-Viernes 10:30am-6:30pm',
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

// GET: Conversaciones de un cliente (HISTORIAL COMPLETO)
app.get('/api/client-conversations/:clientName', (req, res) => {
    try {
        const { clientName } = req.params;
        const conversations = loadConversations();
        const clientConvs = conversations.filter(c => c.clientName === clientName);
        res.json(clientConvs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST: Chat con MEMORIA COMPLETA
app.post('/api/chat', async (req, res) => {
    try {
        const { message, clientName, clientPhone, clientEmail, personName } = req.body;

        if (!message || !clientName) {
            return res.status(400).json({ error: 'Faltan campos' });
        }

        // Cargar TODO el historial anterior del cliente
        const allConversations = loadConversations();
        const clientHistory = allConversations.filter(c => c.clientName === clientName);
        
        const assignedPerson = personName || SUPPORT_TEAM[Math.floor(Math.random() * SUPPORT_TEAM.length)];

        // Construir contexto con TODO el historial
        let historyContext = '';
        if (clientHistory.length > 0) {
            historyContext = '\n\nHISTORIAL PREVIO CON ESTE CLIENTE:\n';
            historyContext += '================================\n';
            clientHistory.slice(-10).forEach((msg, idx) => {
                historyContext += `\n${idx + 1}. Cliente: ${msg.userMessage}\n   NetVC: ${msg.botResponse}\n`;
            });
            historyContext += '\n================================\n';
        }

        const systemPrompt = `Eres ${assignedPerson}, Ingeniero/a Senior de NetVC especialista en recopilación de datos.

INFORMACIÓN:
- Teléfono: ${NETVC_INFO.phone} | Email: ${NETVC_INFO.email}
- Horario: ${NETVC_INFO.schedule}
- Cliente: ${clientName} | ${clientPhone} | ${clientEmail}

${historyContext}

ESTRATEGIA CON MEMORIA:
1. NUNCA repitas preguntas que el cliente ya contestó (revisa historial)
2. Avanza lógicamente en el diagnóstico
3. Una pregunta por mensaje, máximo 80 palabras
4. Si cliente dice "luego", "ahora no", "me voy" → cierra con:
   "Perfecto ${clientName}, nuestros ingenieros analizarán tu info y se contactarán pronto. ${NETVC_INFO.phone} | ${NETVC_INFO.email}"
5. Después de 8-10 preguntas útiles → cierra de la misma forma
6. Tono: CEO a CEO, profesional

INFORMACIÓN A RECOPILAR (solo lo que NO tiene):
- Problema exacto/necesidad
- Escala (usuarios, dispositivos, etc)
- Presupuesto
- Timeline
- Requisitos técnicos
- Soporte/mantenimiento`;

        // Construir messages para Claude CON TODO el historial
        const messages = [];
        
        // Agregar historial completo
        clientHistory.slice(-10).forEach(msg => {
            messages.push({ role: 'user', content: msg.userMessage });
            messages.push({ role: 'assistant', content: msg.botResponse });
        });
        
        // Agregar nuevo mensaje
        messages.push({ role: 'user', content: message });

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
            id: Date.now(),
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
            personName: assignedPerson
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST: Generar Reporte Profesional
app.post('/api/generate-project-report', async (req, res) => {
    try {
        const { clientName, clientEmail, clientPhone, password } = req.body;

        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'No autorizado' });
        }

        // Obtener TODO el historial del cliente
        const conversations = loadConversations();
        const clientHistory = conversations.filter(c => c.clientName === clientName);

        if (clientHistory.length === 0) {
            return res.status(400).json({ error: 'Sin conversaciones del cliente' });
        }

        // Formato para Claude
        let historyText = '';
        clientHistory.forEach(msg => {
            historyText += `Cliente: ${msg.userMessage}\nNetVC: ${msg.botResponse}\n\n`;
        });

        const reportPrompt = `ERES ANALISTA SENIOR DE PROYECTOS NETVC.

CLIENTE: ${clientName} | ${clientEmail} | ${clientPhone}

CONVERSACIÓN COMPLETA:
${historyText}

GENERA UN REPORTE JSON PROFESIONAL INTERNO PARA INGENIEROS:

{
  "clientInfo": {
    "nombre": "${clientName}",
    "email": "${clientEmail}",
    "telefono": "${clientPhone}"
  },
  "datosRecopilados": {
    "tipoProyecto": "DESCRIPCIÓN DEL TIPO DE PROYECTO",
    "escala": "CANTIDAD DE USUARIOS/DISPOSITIVOS",
    "ubicacion": "UBICACIÓN GEOGRÁFICA",
    "infraestructura": "INFRAESTRUCTURA ACTUAL"
  },
  "datosPendientes": ["DATO1", "DATO2"],
  "propuestaDesarrollo": {
    "titulo": "TÍTULO DE LA SOLUCIÓN",
    "analisisTecnico": "ANÁLISIS TÉCNICO DETALLADO",
    "solucionPropuesta": "SOLUCIÓN ESPECÍFICA",
    "fases": "FASES CON TIMELINE",
    "recomendaciones": "RECOMENDACIONES PROFESIONALES",
    "costoEstimado": "RANGO ESTIMADO"
  },
  "presupuestoDetallado": {
    "componentes": [
      {"nombre": "COMPONENTE1", "descripcion": "DESC", "costoMensual": 500, "costoInstalacion": 1000}
    ],
    "totalMensual": 500,
    "totalInstalacion": 1000,
    "totalAnual": 7000,
    "notas": "PROVISIONAL"
  },
  "proximosPasos": ["PASO1", "PASO2"]
}

IMPORTANTE: JSON VÁLIDO, números reales, basado en lo que el cliente dijo.`;

        const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 3000,
            system: 'Eres experto en propuestas TI. Genera JSON válido, profesional, basado en datos reales.',
            messages: [{ role: 'user', content: reportPrompt }]
        });

        const reportText = response.content[0].text;
        let reportData;
        try {
            const jsonMatch = reportText.match(/\{[\s\S]*\}/);
            reportData = JSON.parse(jsonMatch ? jsonMatch[0] : reportText);
        } catch (e) {
            reportData = { error: 'Parse failed', raw: reportText };
        }

        // Guardar proyecto
        const projects = loadProjects();
        const newProject = {
            id: Date.now(),
            clientName: clientName,
            clientEmail: clientEmail,
            clientPhone: clientPhone,
            timestamp: new Date().toISOString(),
            report: reportData
        };

        projects.push(newProject);
        saveProjects(projects);

        res.json({ success: true, report: reportData, projectId: newProject.id });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET: Descargar Reporte
app.get('/api/download-report/:projectId', (req, res) => {
    try {
        const { projectId } = req.params;
        const password = req.query.pwd;

        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'No autorizado' });
        }

        const projects = loadProjects();
        const project = projects.find(p => p.id === parseInt(projectId));

        if (!project) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }

        const r = project.report;
        let content = `REPORTE DE PROYECTO - NETVC\n${'='.repeat(80)}\n\n`;
        content += `CLIENTE: ${r.clientInfo.nombre}\nEMAIL: ${r.clientInfo.email}\nTELÉFONO: ${r.clientInfo.telefono}\n`;
        content += `FECHA: ${new Date(project.timestamp).toLocaleString('es-MX')}\n\n`;

        content += `DATOS RECOPILADOS\n${'-'.repeat(80)}\n`;
        content += `Tipo: ${r.datosRecopilados.tipoProyecto}\n`;
        content += `Escala: ${r.datosRecopilados.escala}\n`;
        content += `Ubicación: ${r.datosRecopilados.ubicacion}\n`;
        content += `Infraestructura: ${r.datosRecopilados.infraestructura}\n\n`;

        if (r.datosPendientes && r.datosPendientes.length) {
            content += `DATOS PENDIENTES\n${'-'.repeat(80)}\n`;
            r.datosPendientes.forEach(d => content += `⚠️ ${d}\n`);
            content += `\nEnviar a: ${NETVC_INFO.email}\n\n`;
        }

        content += `PROPUESTA DE DESARROLLO\n${'-'.repeat(80)}\n`;
        content += `${r.propuestaDesarrollo.titulo}\n\n`;
        content += `Análisis Técnico:\n${r.propuestaDesarrollo.analisisTecnico}\n\n`;
        content += `Solución:\n${r.propuestaDesarrollo.solucionPropuesta}\n\n`;
        content += `Fases:\n${r.propuestaDesarrollo.fases}\n\n`;
        content += `Recomendaciones:\n${r.propuestaDesarrollo.recomendaciones}\n\n`;

        content += `PRESUPUESTO DETALLADO\n${'-'.repeat(80)}\n`;
        r.presupuestoDetallado.componentes.forEach(c => {
            content += `\n${c.nombre}\n${c.descripcion}\n`;
            content += `Mensual: $${c.costoMensual} | Instalación: $${c.costoInstalacion}\n`;
        });
        content += `\nTOTAL MENSUAL: $${r.presupuestoDetallado.totalMensual}\n`;
        content += `TOTAL INSTALACIÓN: $${r.presupuestoDetallado.totalInstalacion}\n`;
        content += `TOTAL ANUAL: $${r.presupuestoDetallado.totalAnual}\n`;
        content += `\nNotas: ${r.presupuestoDetallado.notas}\n\n`;

        content += `PRÓXIMOS PASOS\n${'-'.repeat(80)}\n`;
        r.proximosPasos.forEach((p, i) => content += `${i + 1}. ${p}\n`);
        content += `\n${'='.repeat(80)}\nGenerado por NetVC - ${new Date().toLocaleString('es-MX')}\n`;

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="Reporte_${r.clientInfo.nombre}_${Date.now()}.txt"`);
        res.send(content);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET: Panel Admin
app.get('/admin', (req, res) => {
    const password = req.query.pwd;
    
    if (!password || password !== ADMIN_PASSWORD) {
        return res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>NetVC Admin</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;background:#f5f5f5;display:flex;justify-content:center;align-items:center;height:100vh}
.login{background:white;padding:2rem;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);max-width:350px;width:100%}h1{color:#FF8C00;margin-bottom:1.5rem;text-align:center}
input{width:100%;padding:0.75rem;border:1px solid #ddd;border-radius:4px;margin-bottom:1rem;font-size:1rem}
button{width:100%;padding:0.75rem;background:#FF8C00;color:white;border:0;border-radius:4px;font-weight:600;cursor:pointer}
button:hover{background:#E67E00}</style></head><body>
<div class="login"><h1>🔐 NetVC Admin</h1>
<form method="GET"><input type="password" name="pwd" placeholder="Contraseña" required>
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
        clientsMap[conv.clientName].messages.push(conv);
    });

    const clients = Object.values(clientsMap);

    let clientsHtml = '';
    clients.forEach((client, idx) => {
        const clientProj = projects.find(p => p.clientName === client.name);
        
        let msgsHtml = '';
        client.messages.forEach((msg, midx) => {
            msgsHtml += `<div class="msg-item"><div class="msg-user"><strong>Cliente:</strong> ${msg.userMessage}</div><div class="msg-timestamp">${new Date(msg.timestamp).toLocaleString('es-MX')}</div><div class="msg-bot"><strong>NetVC:</strong> ${msg.botResponse}</div></div>`;
        });
        
        let projBtn = '';
        if (clientProj) {
            projBtn = `<button class="btn-view" onclick="viewReport(${clientProj.id}, '${password}')">📄 Ver Reporte</button><button class="btn-download" onclick="downloadReport(${clientProj.id}, '${password}')">📥 Descargar</button>`;
        } else {
            projBtn = `<button class="btn-gen" onclick="genReport('${client.name}', '${client.email}', '${client.phone}', '${password}')">📄 Generar</button>`;
        }
        
        clientsHtml += `<div class="client"><div class="header"><div><strong>${client.name}</strong><br><small>${client.phone} | ${client.email}</small></div><div class="buttons"><button onclick="toggle(${idx})">💬 Chat (${client.messages.length})</button>${projBtn}</div></div><div class="messages" id="msgs-${idx}">${msgsHtml}</div></div>`;
    });

    res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NetVC Admin v9</title><style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;background:#f5f5f5}
.container{max-width:1400px;margin:0 auto;padding:2rem}header{background:#FF8C00;color:white;padding:1.5rem;border-radius:8px;margin-bottom:2rem;display:flex;justify-content:space-between;align-items:center}
h1{font-size:2rem}.logout{background:white;color:#FF8C00;padding:0.5rem 1rem;border-radius:4px;text-decoration:none;font-weight:600}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:2rem}
.stat{background:white;padding:1.5rem;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);text-align:center}
.stat h3{color:#FF8C00;font-size:2rem}.stat p{color:#666;margin-top:0.5rem}
.clients{background:white;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}
.client{border-bottom:1px solid #eee;padding:1.5rem}.client:last-child{border-bottom:0}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem}
.buttons{display:flex;gap:0.5rem}button{padding:0.5rem 1rem;border:0;border-radius:4px;cursor:pointer;font-weight:600}
.btn-view,.btn-gen{background:#FF8C00;color:white}.btn-download{background:#4CAF50;color:white}
button:hover{opacity:0.9}
.messages{display:none;max-height:500px;overflow-y:auto;padding:1rem;background:#f9f9f9;border-radius:4px;margin-top:1rem}
.messages.open{display:block}
.msg-item{margin-bottom:1.5rem;padding:1rem;background:white;border-left:4px solid #FF8C00;border-radius:4px}
.msg-user{background:#f0f0f0;padding:0.75rem;border-radius:4px;margin-bottom:0.5rem}
.msg-bot{background:#FFF3E0;padding:0.75rem;border-radius:4px;margin-top:0.5rem}
.msg-timestamp{font-size:0.8rem;color:#999;margin:0.5rem 0}
.modal{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);align-items:center;justify-content:center;z-index:1000;overflow-y:auto}
.modal.open{display:flex}
.modal-content{background:white;padding:2rem;border-radius:8px;max-width:900px;margin:2rem;position:relative;max-height:90vh;overflow-y:auto}
.close{position:absolute;top:1rem;right:1rem;background:#FF8C00;color:white;border:0;padding:0.5rem 1rem;border-radius:4px;cursor:pointer}
</style></head><body><div class="container"><header><h1>📊 NetVC Admin v9</h1><a class="logout" href="/">Cerrar sesión</a></header>
<div class="stats"><div class="stat"><h3>${clients.length}</h3><p>Clientes</p></div><div class="stat"><h3>${conversations.length}</h3><p>Mensajes</p></div><div class="stat"><h3>${projects.length}</h3><p>Reportes</p></div></div>
<div class="clients">${clients.length === 0 ? '<div style="padding:2rem;text-align:center;color:#999">Sin clientes</div>' : clientsHtml}</div></div>

<div id="modal" class="modal"><div class="modal-content"><button class="close" onclick="closeModal()">✕</button><div id="modal-body"></div></div></div>

<script>
const pwd = '${password}';

function toggle(idx){
  const el = document.getElementById('msgs-'+idx);
  if(el) el.classList.toggle('open');
}

function closeModal(){
  document.getElementById('modal').classList.remove('open');
}

function genReport(name, email, phone){
  console.log('Generando reporte para:', name);
  fetch('/api/generate-project-report', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({clientName:name, clientEmail:email, clientPhone:phone, password:pwd})
  })
  .then(r=>r.json())
  .then(d=>{
    console.log('Respuesta:', d);
    if(d.success){
      showReport(d.report);
    } else {
      alert('Error: '+(d.error || 'Unknown error'));
    }
  })
  .catch(e=>{console.error(e); alert('Error: '+e.message)});
}

function showReport(report){
  const r = report;
  let html = '<h2>📊 REPORTE: '+r.clientInfo.nombre+'</h2>';
  html += '<p><strong>Email:</strong> '+r.clientInfo.email+' | <strong>Teléfono:</strong> '+r.clientInfo.telefono+'</p>';
  html += '<hr><h3>DATOS RECOPILADOS</h3>';
  html += '<p><strong>Tipo de Proyecto:</strong> '+r.datosRecopilados.tipoProyecto+'</p>';
  html += '<p><strong>Escala:</strong> '+r.datosRecopilados.escala+'</p>';
  html += '<p><strong>Ubicación:</strong> '+r.datosRecopilados.ubicacion+'</p>';
  html += '<p><strong>Infraestructura:</strong> '+r.datosRecopilados.infraestructura+'</p>';
  
  if(r.datosPendientes && r.datosPendientes.length){
    html += '<hr><h3>⚠️ DATOS PENDIENTES</h3><ul>';
    r.datosPendientes.forEach(d=>{html+='<li>'+d+'</li>'});
    html+='</ul><p><em>Solicitados a: '+r.clientInfo.email+'</em></p>';
  }
  
  html += '<hr><h3>PROPUESTA DE DESARROLLO</h3>';
  html += '<p><strong>'+r.propuestaDesarrollo.titulo+'</strong></p>';
  html += '<p><strong>Análisis Técnico:</strong></p><p>'+r.propuestaDesarrollo.analisisTecnico+'</p>';
  html += '<p><strong>Solución Propuesta:</strong></p><p>'+r.propuestaDesarrollo.solucionPropuesta+'</p>';
  html += '<p><strong>Fases:</strong></p><p>'+r.propuestaDesarrollo.fases+'</p>';
  html += '<p><strong>Recomendaciones:</strong></p><p>'+r.propuestaDesarrollo.recomendaciones+'</p>';
  
  html += '<hr><h3>💰 PRESUPUESTO DETALLADO</h3>';
  r.presupuestoDetallado.componentes.forEach(c=>{
    html+='<div style="background:#f9f9f9;padding:1rem;margin:1rem 0;border-radius:4px;border-left:4px solid #FF8C00">';
    html+='<strong>'+c.nombre+'</strong><br>';
    html+='<em>'+c.descripcion+'</em><br>';
    html+='Costo Mensual: <strong>$'+c.costoMensual.toLocaleString()+'</strong> | ';
    html+='Instalación: <strong>$'+c.costoInstalacion.toLocaleString()+'</strong>';
    html+='</div>';
  });
  
  html += '<div style="background:#FFF3E0;padding:1.5rem;margin-top:2rem;border-radius:4px;border-left:4px solid #FF8C00">';
  html += '<h4>TOTALES</h4>';
  html += '<p>Mensual: <strong>$'+r.presupuestoDetallado.totalMensual.toLocaleString()+'</strong></p>';
  html += '<p>Instalación: <strong>$'+r.presupuestoDetallado.totalInstalacion.toLocaleString()+'</strong></p>';
  html += '<p>Anual: <strong>$'+r.presupuestoDetallado.totalAnual.toLocaleString()+'</strong></p>';
  html += '<p><em>'+r.presupuestoDetallado.notas+'</em></p>';
  html += '</div>';
  
  html += '<hr><h3>PRÓXIMOS PASOS</h3><ol>';
  r.proximosPasos.forEach(p=>{html+='<li>'+p+'</li>'});
  html += '</ol>';
  
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal').classList.add('open');
}
</script></body></html>`);
});

// GET: Conversaciones para admin
app.get('/api/admin/conversations', (req, res) => {
    const pwd = req.query.pwd;
    if (pwd !== ADMIN_PASSWORD) return res.status(401).json({ error: 'No auth' });
    const conversations = loadConversations();
    const clientsMap = {};
    conversations.forEach(conv => {
        if (!clientsMap[conv.clientName]) {
            clientsMap[conv.clientName] = { name: conv.clientName, messages: [] };
        }
        clientsMap[conv.clientName].messages.push(conv);
    });
    res.json(Object.values(clientsMap));
});

// GET: Proyectos para admin
app.get('/api/admin/projects', (req, res) => {
    const pwd = req.query.pwd;
    if (pwd !== ADMIN_PASSWORD) return res.status(401).json({ error: 'No auth' });
    const projects = loadProjects();
    res.json(projects);
});

// Iniciar
app.listen(PORT, () => {
    console.log(`✅ Backend v9 - MEMORIA COMPLETA + PANEL FUNCIONAL en puerto ${PORT}`);
    console.log(`📞 ${NETVC_INFO.phone} | ${NETVC_INFO.schedule}`);
});
