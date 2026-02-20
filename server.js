const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');

const expressApp = express();
const PORT = process.env.PORT || 3000;

// 1. CONFIGURACIÓN INICIAL
expressApp.use(express.json());
expressApp.use(express.urlencoded({ extended: true }));

// 2. BASE DE DATOS Y QUERIES (Tu lógica original completa)
const db = new Database(path.join(__dirname, 'colegio.db'));
db.pragma('journal_mode = WAL');

const queries = {
  // News
  getAllNews: db.prepare('SELECT * FROM news ORDER BY created_at DESC'),
  getFeaturedNews: db.prepare('SELECT * FROM news WHERE featured = 1 ORDER BY created_at DESC LIMIT 3'),
  getNewsById: db.prepare('SELECT * FROM news WHERE id = ?'),
  createNews: db.prepare('INSERT INTO news (title, content, excerpt, author, image_url, featured) VALUES (?, ?, ?, ?, ?, ?)'),
  updateNews: db.prepare('UPDATE news SET title = ?, content = ?, excerpt = ?, author = ?, image_url = ?, featured = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
  deleteNews: db.prepare('DELETE FROM news WHERE id = ?'),
  
  // Board Members
  getAllBoard: db.prepare('SELECT * FROM board_members WHERE active = 1 ORDER BY order_position'),
  getBoardById: db.prepare('SELECT * FROM board_members WHERE id = ?'),
  createBoard: db.prepare('INSERT INTO board_members (name, position, bio, photo_url, email, order_position) VALUES (?, ?, ?, ?, ?, ?)'),
  updateBoard: db.prepare('UPDATE board_members SET name = ?, position = ?, bio = ?, photo_url = ?, email = ?, order_position = ? WHERE id = ?'),
  deleteBoard: db.prepare('DELETE FROM board_members WHERE id = ?'),
  
  // Members
  getAllMembers: db.prepare('SELECT * FROM members WHERE active = 1 ORDER BY surname, name'),
  searchMembers: db.prepare('SELECT * FROM members WHERE active = 1 AND (name LIKE ? OR surname LIKE ? OR matricula LIKE ?) ORDER BY surname, name'),
  getMemberById: db.prepare('SELECT * FROM members WHERE id = ?'),
  createMember: db.prepare('INSERT INTO members (matricula, name, surname, specialty, phone, email, city, registration_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
  updateMember: db.prepare('UPDATE members SET matricula = ?, name = ?, surname = ?, specialty = ?, phone = ?, email = ?, city = ?, registration_date = ? WHERE id = ?'),
  deleteMember: db.prepare('DELETE FROM members WHERE id = ?'),
  
  // Settings
  getSetting: db.prepare('SELECT value FROM settings WHERE key = ?'),
  getAllSettings: db.prepare('SELECT * FROM settings'),
  updateSetting: db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'),
  
  // Autoridades
  getAutoridadesByTipo: db.prepare('SELECT * FROM autoridades WHERE tipo = ? AND activo = 1 ORDER BY orden'),
  createAutoridad: db.prepare('INSERT INTO autoridades (tipo, cargo, apellido, nombre, matricula, categoria, delegacion_zona, orden, periodo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
  deleteAutoridad: db.prepare('DELETE FROM autoridades WHERE id = ?')
};

// ==================== RUTAS DE LA API (IMPORTANTE EL ORDEN) ====================

// --- NOTICIAS ---
expressApp.get('/api/news/featured', (req, res) => res.json(queries.getFeaturedNews.all()));
expressApp.get('/api/news', (req, res) => res.json(queries.getAllNews.all()));
expressApp.get('/api/news/:id', (req, res) => {
    const news = queries.getNewsById.get(req.params.id);
    if (news) res.json(news);
    else res.status(404).json({ error: 'Noticia no encontrada' });
});

// --- MIEMBROS Y BUSCADOR ---
expressApp.get('/api/members/search', (req, res) => {
    const s = `%${req.query.q || ''}%`;
    res.json(queries.searchMembers.all(s, s, s));
});
expressApp.get('/api/members', (req, res) => res.json(queries.getAllMembers.all()));
expressApp.put('/api/members/:id', (req, res) => {
    const { matricula, name, surname, specialty, phone, email, city, registration_date } = req.body;
    queries.updateMember.run(matricula, name, surname, specialty, phone, email, city, registration_date, req.params.id);
    res.json({ success: true });
});

// --- AUTORIDADES ---
expressApp.get('/api/autoridades/consejo-directivo', (req, res) => res.json(queries.getAutoridadesByTipo.all('consejo_directivo')));
expressApp.get('/api/autoridades/comision-revisora', (req, res) => res.json(queries.getAutoridadesByTipo.all('comision_revisora')));
expressApp.get('/api/autoridades/tribunal-etica', (req, res) => res.json(queries.getAutoridadesByTipo.all('tribunal_etica')));
expressApp.delete('/api/autoridades/:id', (req, res) => {
    queries.deleteAutoridad.run(req.params.id);
    res.json({ success: true });
});

// --- SETTINGS ---
expressApp.get('/api/settings', (req, res) => res.json(queries.getAllSettings.all()));

// --- NODEMAILER (Opcional, pero no rompe nada) ---
expressApp.post('/enviar-contacto', async (req, res) => {
    const { nombre, apellido, email, asunto, mensaje } = req.body;
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: `Consulta: ${asunto}`,
            text: `De: ${nombre} ${apellido} (${email})\n\nMensaje: ${mensaje}`
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// --- SERVIR ARCHIVOS ESTÁTICOS ---
// Primero servimos la carpeta public
expressApp.use(express.static(path.join(__dirname, 'public')));

// Fallback para rutas HTML (contacto, noticias, etc)
expressApp.get('/:page', (req, res, next) => {
    const page = req.params.page;
    if (page.includes('.')) return next();
    const filePath = path.join(__dirname, 'public', `${page}.html`);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        next();
    }
});

// 3. INICIO
expressApp.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Express funcionando en http://localhost:${PORT}`);
});