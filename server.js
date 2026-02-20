const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');

const expressApp = express();
const PORT = process.env.PORT || 3000;

// 1. MIDDLEWARES (Configuración de Express)
expressApp.use(express.json());
expressApp.use(express.urlencoded({ extended: true }));
// Esto sirve automáticamente todos tus archivos de la carpeta 'public'
expressApp.use(express.static(path.join(__dirname, 'public')));

// 2. BASE DE DATOS
const DB_PATH = path.join(__dirname, 'colegio.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// (Mantenemos tu bloque de db.exec para crear tablas igual que antes)
db.exec(`
  CREATE TABLE IF NOT EXISTS news (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT, author TEXT, featured BOOLEAN, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS board_members (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, position TEXT, active BOOLEAN DEFAULT 1);
  CREATE TABLE IF NOT EXISTS members (id INTEGER PRIMARY KEY AUTOINCREMENT, matricula TEXT UNIQUE, name TEXT, surname TEXT, active BOOLEAN DEFAULT 1);
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE IF NOT EXISTS autoridades (id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT, cargo TEXT, apellido TEXT, nombre TEXT, matricula TEXT, categoria TEXT, delegacion_zona TEXT, orden INTEGER, periodo TEXT, activo BOOLEAN DEFAULT 1);
`);

// ==================== RUTA DE CONTACTO (NODEMAILER) ====================
expressApp.post('/enviar-contacto', async (req, res) => {
    const { nombre, apellido, email, consulta, asunto, mensaje } = req.body;

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER, 
            pass: process.env.EMAIL_PASS  
        }
    });

    const mailOptions = {
        from: `"${nombre} ${apellido}" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER, 
        subject: `Consulta Web: ${asunto}`,
        html: `
            <div style="font-family: Arial; border: 1px solid #eee; padding: 20px;">
                <h2>Nueva Consulta Recibida</h2>
                <p><strong>De:</strong> ${nombre} ${apellido} (${email})</p>
                <p><strong>Tipo:</strong> ${consulta}</p>
                <p><strong>Mensaje:</strong></p>
                <div style="background: #f9f9f9; padding: 15px;">${mensaje}</div>
            </div>`
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: '¡Mensaje enviado con éxito!' });
    } catch (error) {
        console.error('Error en Nodemailer:', error);
        res.status(500).json({ success: false, message: 'Error al enviar el correo.' });
    }
});

// ==================== API ROUTES (Traducidas a Express) ====================
expressApp.get('/api/news', (req, res) => {
    const news = db.prepare('SELECT * FROM news ORDER BY created_at DESC').all();
    res.json(news);
});

expressApp.get('/api/autoridades/:tipo', (req, res) => {
    const tipo = req.params.tipo.replace('-', '_');
    const result = db.prepare('SELECT * FROM autoridades WHERE tipo = ? AND activo = 1 ORDER BY orden').all(tipo);
    res.json(result);
});

expressApp.get('/api/members/search', (req, res) => {
    const search = `%${req.query.q || ''}%`;
    const result = db.prepare('SELECT * FROM members WHERE active = 1 AND (name LIKE ? OR surname LIKE ? OR matricula LIKE ?)').all(search, search, search);
    res.json(result);
});

// 3. MANEJO DE RUTAS HTML (Si no están en /public directamente)
expressApp.get('/:page', (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, 'public', page.endsWith('.html') ? page : `${page}.html`);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Página no encontrada');
    }
});

// 4. INICIO DEL SERVIDOR
expressApp.listen(PORT, '0.0.0.0', () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🏛️  COLEGIO DE TURISMO - SERVIDOR EXPRESS`);
    console.log(`🌐 Puerto: ${PORT}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// Cerrar BD al terminar
process.on('SIGINT', () => {
    db.close();
    process.exit(0);
});