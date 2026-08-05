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
const ADMIN_PASSWORD = 'netvc1111';

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

// POST: Chat con MEMORIA COMPLETA
app.post('/api/chat', async (req, res) => {
    try {
        const { message, clientName, clientPhone, clientEmail, personName } = req.body;

        if (!message || !clientName) {
            return res.status(400).json({ error: 'Faltan campos' });
        }

        const allConversations = loadConversations();
        const clientHistory = allConversations.filter(c => c.clientName === clientName);
        
        const assignedPerson = personName || SUPPORT_TEAM[Math.floor(Math.random() * SUPPORT_TEAM.length)];

        let historyContext = '';
        if (clientHistory.length > 0) {
            historyContext = '\n\nHISTORIAL PREVIO CON ESTE CLIENTE:\n';
            historyContext += '================================\n';
            clientHistory.slice(-10).forEach((msg, idx) => {
                historyContext += `\n${idx + 1}. Cliente: ${msg.userMessage}\n   NetVC: ${msg.botResponse}\n`;
            });
            historyContext += '\n================================\n';
        }

        const systemPrompt = `Eres ${assignedPerson}, Ingeniero/a Senior especialista en TI de NetVC. EXPERTO EN RECOPILACIÓN PROFUNDA.

INFORMACIÓN DE NETVC:
- Teléfono: ${NETVC_INFO.phone} | Email: ${NETVC_INFO.email}
- Horario: ${NETVC_INFO.schedule}
- Servicios: Consultoría TI, Implementación, Seguridad, Nube, Soporte 24/7, Proyectos TI

CLIENTE: ${clientName} | ${clientPhone} | ${clientEmail}

${historyContext}

ESTRATEGIA - MEMORIA INTELIGENTE:

**IMPORTANTE:** Si el cliente YA respondió algo, NO lo preguntes de nuevo.
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
        if (clientHistory.length > 0) {
            clientHistory.slice(-10).forEach(msg => {
                messages.push({ role: 'user', content: msg.userMessage });
                messages.push({ role: 'assistant', content: msg.botResponse });
            });
        }
        
        messages.push({ role: 'user', content: message });

        const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 400,
            system: systemPrompt,
            messages: messages
        });

        const botResponse = response.content[0].text;

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

// POST: Generar Reporte
app.post('/api/generate-project-report', async (req, res) => {
    try {
        const { clientName, clientEmail, clientPhone, password } = req.body;

        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'No autorizado' });
        }

        const conversations = loadConversations();
        const clientHistory = conversations.filter(c => c.clientName === clientName);

        if (clientHistory.length === 0) {
            return res.status(400).json({ error: 'Sin conversaciones del cliente' });
        }

        let historyText = '';
        clientHistory.forEach(msg => {
            historyText += `Cliente: ${msg.userMessage}\nNetVC: ${msg.botResponse}\n\n`;
        });

        const reportPrompt = `ERES ANALISTA SENIOR DE PROYECTOS NETVC. Genera SOLO JSON válido.

CLIENTE: ${clientName} | ${clientEmail} | ${clientPhone}

CONVERSACIÓN COMPLETA:
${historyText}

RESPONDE SOLO CON ESTE JSON (sin explicaciones):
{
  "clientInfo": {
    "nombre": "${clientName}",
    "email": "${clientEmail}",
    "telefono": "${clientPhone}"
  },
  "datosRecopilados": {
    "tipoProyecto": "TIPO DE PROYECTO",
    "escala": "CANTIDAD USUARIOS/DISPOSITIVOS",
    "ubicacion": "UBICACIÓN",
    "infraestructura": "INFRAESTRUCTURA ACTUAL"
  },
  "datosPendientes": [],
  "propuestaDesarrollo": {
    "titulo": "SOLUCIÓN PROPUESTA",
    "analisisTecnico": "ANÁLISIS TÉCNICO",
    "solucionPropuesta": "SOLUCIÓN",
    "fases": "FASES Y TIMELINE",
    "recomendaciones": "RECOMENDACIONES",
    "costoEstimado": "COSTO ESTIMADO"
  },
  "presupuestoDetallado": {
    "componentes": [
      {"nombre": "COMPONENTE", "descripcion": "DESC", "costoMensual": 500, "costoInstalacion": 1000}
    ],
    "totalMensual": 500,
    "totalInstalacion": 1000,
    "totalAnual": 7000,
    "notas": "PROVISIONAL"
  },
  "proximosPasos": ["PASO 1", "PASO 2"]
}`;

        const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 3000,
            system: 'Eres experto. Responde SOLO con JSON válido, sin markdown ni explicaciones.',
            messages: [{ role: 'user', content: reportPrompt }]
        });

        const reportText = response.content[0].text;
        console.log('Report raw text:', reportText.substring(0, 200));
        
        let reportData;
        try {
            const jsonMatch = reportText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            reportData = JSON.parse(jsonMatch[0]);
            
            // Validar estructura
            if (!reportData.clientInfo || !reportData.clientInfo.nombre) {
                throw new Error('Invalid report structure');
            }
        } catch (e) {
            console.error('Parse error:', e.message);
            console.error('Raw response:', reportText);
            // Generar reporte por defecto si falla el parsing
            reportData = {
                clientInfo: { nombre: clientName, email: clientEmail, telefono: clientPhone },
                datosRecopilados: { tipoProyecto: 'Proyecto TI', escala: 'A definir', ubicacion: 'A definir', infraestructura: 'A definir' },
                datosPendientes: ['Información técnica detallada'],
                propuestaDesarrollo: { titulo: 'Propuesta de Solución TI', analisisTecnico: 'Por revisar con cliente', solucionPropuesta: 'Solución personalizada', fases: 'A definir con cliente', recomendaciones: 'Contactar al cliente para detalles', costoEstimado: 'A cotizar' },
                presupuestoDetallado: { componentes: [{ nombre: 'Consultoría', descripcion: 'Análisis inicial', costoMensual: 0, costoInstalacion: 1000 }], totalMensual: 0, totalInstalacion: 1000, totalAnual: 1000, notas: 'Presupuesto provisional a confirmar' },
                proximosPasos: ['Revisar detalles del proyecto', 'Confirmar requisitos con cliente']
            };
        }

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
        console.error('Error completo:', error);
        res.status(500).json({ error: error.message, details: 'Ver logs del servidor' });
    }
});

// GET: Descargar Reporte
app.get('/api/download-report/:projectId', (req, res) => {
    try {
        const pwd = req.query.pwd;
        if (pwd !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'No autorizado' });
        }

        const projects = loadProjects();
        const project = projects.find(p => p.id === parseInt(req.params.projectId));

        if (!project) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }

        const r = project.report;
        let txt = `REPORTE DE PROYECTO - NETVC\n`;
        txt += `${'='.repeat(80)}\n\n`;
        txt += `CLIENTE: ${r.clientInfo.nombre}\n`;
        txt += `EMAIL: ${r.clientInfo.email}\n`;
        txt += `TELÉFONO: ${r.clientInfo.telefono}\n`;
        txt += `FECHA: ${new Date(project.timestamp).toLocaleString('es-MX')}\n\n`;
        
        txt += `DATOS RECOPILADOS\n`;
        txt += `${'-'.repeat(80)}\n`;
        txt += `Tipo de Proyecto: ${r.datosRecopilados.tipoProyecto}\n`;
        txt += `Escala: ${r.datosRecopilados.escala}\n`;
        txt += `Ubicación: ${r.datosRecopilados.ubicacion}\n`;
        txt += `Infraestructura Actual: ${r.datosRecopilados.infraestructura}\n\n`;
        
        if (r.datosPendientes && r.datosPendientes.length) {
            txt += `⚠️ DATOS PENDIENTES\n`;
            txt += `${'-'.repeat(80)}\n`;
            r.datosPendientes.forEach(d => { txt += `• ${d}\n`; });
            txt += `\n`;
        }
        
        txt += `PROPUESTA DE DESARROLLO\n`;
        txt += `${'-'.repeat(80)}\n`;
        txt += `${r.propuestaDesarrollo.titulo}\n\n`;
        txt += `ANÁLISIS TÉCNICO:\n${r.propuestaDesarrollo.analisisTecnico}\n\n`;
        txt += `SOLUCIÓN PROPUESTA:\n${r.propuestaDesarrollo.solucionPropuesta}\n\n`;
        txt += `FASES Y TIMELINE:\n${r.propuestaDesarrollo.fases}\n\n`;
        txt += `RECOMENDACIONES:\n${r.propuestaDesarrollo.recomendaciones}\n\n`;
        txt += `COSTO ESTIMADO: ${r.propuestaDesarrollo.costoEstimado}\n\n`;
        
        txt += `PRESUPUESTO DETALLADO\n`;
        txt += `${'-'.repeat(80)}\n`;
        r.presupuestoDetallado.componentes.forEach(c => {
            txt += `• ${c.nombre}\n`;
            txt += `  Descripción: ${c.descripcion}\n`;
            txt += `  Costo Mensual: $${c.costoMensual}\n`;
            txt += `  Costo Instalación: $${c.costoInstalacion}\n\n`;
        });
        txt += `TOTAL MENSUAL: $${r.presupuestoDetallado.totalMensual}\n`;
        txt += `TOTAL INSTALACIÓN: $${r.presupuestoDetallado.totalInstalacion}\n`;
        txt += `TOTAL ANUAL: $${r.presupuestoDetallado.totalAnual}\n`;
        txt += `Notas: ${r.presupuestoDetallado.notas}\n\n`;
        
        txt += `PRÓXIMOS PASOS\n`;
        txt += `${'-'.repeat(80)}\n`;
        r.proximosPasos.forEach((p, idx) => { txt += `${idx + 1}. ${p}\n`; });
        txt += `\n\nContacto NetVC:\n`;
        txt += `Teléfono: ${NETVC_INFO.phone}\n`;
        txt += `Email: ${NETVC_INFO.email}\n`;
        txt += `Horario: ${NETVC_INFO.schedule}\n`;

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="Reporte_${r.clientInfo.nombre}_${Date.now()}.txt"`);
        res.send(txt);

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
            const date = new Date(msg.timestamp);
            date.setHours(date.getHours() - 1); // Restar 1 hora
            const timeStr = date.toLocaleString('es-MX');
            msgsHtml += `<div class="msg-item"><div class="msg-user"><strong>Cliente:</strong> ${msg.userMessage}</div><div class="msg-timestamp">${timeStr}</div><div class="msg-bot"><strong>NetVC:</strong> ${msg.botResponse}</div></div>`;
        });
        
        let projBtn = '';
        if (clientProj) {
            projBtn = `<button class="btn-view" onclick="viewReport(${clientProj.id})">📄 Ver Reporte</button>`;
        } else {
            projBtn = `<button class="btn-gen" onclick="genReport('${client.name}', '${client.email}', '${client.phone}')">📄 Generar</button>`;
        }
        
        clientsHtml += `<div class="client"><div class="header"><div><strong>${client.name}</strong><br><small>${client.phone} | ${client.email}</small></div><div class="buttons"><button onclick="toggleChat(${idx})">💬 Chat (${client.messages.length})</button>${projBtn}</div></div><div class="messages" id="msgs-${idx}">${msgsHtml}</div></div>`;
    });

    res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NetVC Admin v10</title><style>
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
.btn-view,.btn-gen{background:#FF8C00;color:white}
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
</style></head><body><div class="container"><header><h1>📊 NetVC Admin v10</h1><a class="logout" href="/">Cerrar sesión</a></header>
<div class="stats"><div class="stat"><h3>${clients.length}</h3><p>Clientes</p></div><div class="stat"><h3>${conversations.length}</h3><p>Mensajes</p></div><div class="stat"><h3>${projects.length}</h3><p>Reportes</p></div></div>
<div class="clients">${clients.length === 0 ? '<div style="padding:2rem;text-align:center;color:#999">Sin clientes</div>' : clientsHtml}</div></div>

<div id="modal" class="modal"><div class="modal-content"><button class="close" onclick="closeModal()">✕</button><div id="modal-body"></div></div></div>

<script>
function toggleChat(idx){
  const el = document.getElementById('msgs-'+idx);
  if(el) el.classList.toggle('open');
}

function closeModal(){
  document.getElementById('modal').classList.remove('open');
}

function genReport(name, email, phone){
  fetch('/api/generate-project-report', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({clientName:name, clientEmail:email, clientPhone:phone, password:'${password}'})
  })
  .then(r=>r.json())
  .then(d=>{
    if(d.success){
      viewReport(d.projectId);
    } else {
      alert('Error: '+(d.error || 'Unknown error'));
    }
  })
  .catch(e=>{console.error(e); alert('Error: '+e.message)});
}

function viewReport(id){
  fetch('/api/admin/projects?pwd=${password}')
    .then(r=>r.json())
    .then(projs=>{
      const p = projs.find(x=>x.id===id);
      if(!p){alert('No encontrado');return}
      const r = p.report;
      let html = '<h2>📊 REPORTE: '+r.clientInfo.nombre+'</h2>';
      html += '<p><strong>Email:</strong> '+r.clientInfo.email+' | <strong>Teléfono:</strong> '+r.clientInfo.telefono+'</p><hr>';
      html += '<h3>DATOS RECOPILADOS</h3>';
      html += '<p><strong>Tipo:</strong> '+r.datosRecopilados.tipoProyecto+'</p>';
      html += '<p><strong>Escala:</strong> '+r.datosRecopilados.escala+'</p>';
      html += '<p><strong>Ubicación:</strong> '+r.datosRecopilados.ubicacion+'</p>';
      if(r.datosPendientes && r.datosPendientes.length){html += '<hr><h3>⚠️ PENDIENTES</h3><ul>';r.datosPendientes.forEach(d=>{html+='<li>'+d+'</li>'});html+='</ul>'}
      html += '<hr><h3>PROPUESTA DE DESARROLLO</h3>';
      html += '<p><strong>'+r.propuestaDesarrollo.titulo+'</strong></p>';
      html += '<p>'+r.propuestaDesarrollo.analisisTecnico+'</p>';
      html += '<hr><h3>💰 PRESUPUESTO</h3>';
      r.presupuestoDetallado.componentes.forEach(c=>{html+='<div style="background:#f9f9f9;padding:1rem;margin:1rem 0;border-radius:4px"><strong>'+c.nombre+'</strong><br>'+c.descripcion+'<br>Mensual: $'+c.costoMensual+' | Instalación: $'+c.costoInstalacion+'</div>'});
      html += '<div style="background:#FFF3E0;padding:1rem;border-radius:4px;border-left:4px solid #FF8C00"><h4>TOTAL</h4><p>Mensual: $'+r.presupuestoDetallado.totalMensual+'</p><p>Instalación: $'+r.presupuestoDetallado.totalInstalacion+'</p><p>Anual: $'+r.presupuestoDetallado.totalAnual+'</p></div>';
      html += '<div style="margin-top:2rem;text-align:center"><button onclick="downloadReport('+id+')" style="background:#FF8C00;color:white;padding:0.75rem 1.5rem;border:0;border-radius:4px;cursor:pointer;font-weight:600;font-size:1rem">📥 Descargar Reporte</button></div>';
      document.getElementById('modal-body').innerHTML = html;
      document.getElementById('modal').classList.add('open');
    });
}

function downloadReport(projectId){
  window.location.href = '/api/download-report/'+projectId+'?pwd=${password}';
}
</script></body></html>`);
});

app.listen(PORT, () => {
    console.log(`✅ Backend v10 - Panel Admin FUNCIONAL en puerto ${PORT}`);
    console.log(`📞 ${NETVC_INFO.phone} | ${NETVC_INFO.schedule}`);
});
