# 🤖 NetVC AI Chatbot

## 🚀 Instalación (5 minutos)

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar API Key
Crear archivo `.env`:
```
ANTHROPIC_API_KEY=sk-ant-v0-TU_API_KEY_AQUI
PORT=3000
```

Obtener API Key en: https://console.anthropic.com

### 3. Iniciar backend
```bash
npm start
```

Deberías ver:
```
✅ Backend corriendo en puerto 3000
🔑 API Key: Configurada ✓
```

### 4. Iniciar servidor web
En otra ventana CMD:
```bash
npx http-server
```

### 5. Abrir en navegador
```
http://localhost:8080/index.html
```

---

## 📁 Archivos

- `backend.js` - API Node.js
- `index.html` - Página web CON chatbot integrado
- `package.json` - Dependencias
- `.env` - Configuración (crear desde .env.example)

---

## ✅ Funcionalidades

✅ Chatbot flotante (botón 💬 esquina derecha)
✅ Pide nombre del cliente
✅ Equipo rotativo: Carlos, María, Miguel, Andrea
✅ Conversación fluida
✅ Guarda todas las conversaciones
✅ Respuestas naturales y lógicas

---

## 🐛 Troubleshooting

**Error 500?** → Verifica API Key en `.env`
**No funciona?** → ¿Están los 2 CMD corriendo? (backend + http-server)
**No ve chatbot?** → Abre DevTools (F12) → Console → busca errores

---

**¡Listo! Disfruta tu chatbot 🎉**
