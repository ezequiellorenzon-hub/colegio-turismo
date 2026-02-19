const http = require('http');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const querystring = require('querystring');

// Configuración
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'colegio.db');

// Inicializar base de datos SQLite
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Crear todas las tablas
db.exec(`
  -- Tabla de noticias
  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    author TEXT NOT NULL,
    image_url TEXT,
    featured BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Tabla de comisión directiva
  CREATE TABLE IF NOT EXISTS board_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    bio TEXT,
    photo_url TEXT,
    email TEXT,
    order_position INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Tabla de profesionales matriculados
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricula TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    surname TEXT NOT NULL,
    specialty TEXT,
    phone TEXT,
    email TEXT,
    city TEXT,
    active BOOLEAN DEFAULT 1,
    registration_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Tabla de configuración
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Insertar configuración inicial
const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get();
if (settingsCount.count === 0) {
  const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('site_name', 'Colegio de Profesionales en Turismo');
  insertSetting.run('site_slogan', 'Promoviendo la excelencia en el turismo argentino');
  insertSetting.run('contact_email', 'info@colegioturismo.org.ar');
  insertSetting.run('contact_phone', '+54 11 4567-8900');
  insertSetting.run('contact_address', 'Av. Corrientes 1234, CABA, Argentina');
  console.log('✅ Configuración inicial creada');
}

// Insertar datos de ejemplo si las tablas están vacías
const newsCount = db.prepare('SELECT COUNT(*) as count FROM news').get();
if (newsCount.count === 0) {
  const insertNews = db.prepare(`
    INSERT INTO news (title, content, excerpt, author, featured) 
    VALUES (?, ?, ?, ?, ?)
  `);
  
  insertNews.run(
    'Bienvenidos al Nuevo Portal',
    'Nos complace presentar el nuevo sitio web del Colegio de Profesionales en Turismo. Aquí encontrarán todas las novedades, información sobre trámites y el directorio de profesionales matriculados.',
    'Presentamos nuestro nuevo sitio web institucional',
    'Comisión Directiva',
    1
  );
  
  insertNews.run(
    'Renovación de Matrículas 2026',
    'Recordamos a todos los colegiados que el proceso de renovación anual de matrículas estará abierto desde el 1 de marzo. Pueden realizar el trámite de forma presencial o a través de nuestro sistema online.',
    'Información sobre el proceso de renovación',
    'Secretaría',
    1
  );
  
  console.log('✅ Noticias de ejemplo creadas');
}

const boardCount = db.prepare('SELECT COUNT(*) as count FROM board_members').get();
if (boardCount.count === 0) {
  const insertBoard = db.prepare(`
    INSERT INTO board_members (name, position, bio, order_position) 
    VALUES (?, ?, ?, ?)
  `);
  
  insertBoard.run('María González', 'Presidenta', 'Licenciada en Turismo con 20 años de experiencia en gestión de destinos.', 1);
  insertBoard.run('Carlos Rodríguez', 'Vicepresidente', 'Especialista en turismo sustentable y desarrollo regional.', 2);
  insertBoard.run('Ana Martínez', 'Secretaria', 'Experta en gestión administrativa y organización de eventos.', 3);
  insertBoard.run('Juan Pérez', 'Tesorero', 'Contador Público con especialización en finanzas del sector turístico.', 4);
  
  console.log('✅ Comisión directiva de ejemplo creada');
}

const membersCount = db.prepare('SELECT COUNT(*) as count FROM members').get();
if (membersCount.count === 0) {
  const insertMember = db.prepare(`
    INSERT INTO members (matricula, name, surname, specialty, city, registration_date) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  insertMember.run('TUR-001', 'Laura', 'Fernández', 'Guía de Turismo', 'Buenos Aires', '2020-03-15');
  insertMember.run('TUR-002', 'Roberto', 'Silva', 'Agente de Viajes', 'Córdoba', '2019-07-22');
  insertMember.run('TUR-003', 'Patricia', 'López', 'Hotelería', 'Mendoza', '2021-01-10');
  insertMember.run('TUR-004', 'Diego', 'Ramírez', 'Turismo Aventura', 'Bariloche', '2018-11-05');
  insertMember.run('TUR-005', 'Cecilia', 'Torres', 'Gestión de Destinos', 'Salta', '2020-09-18');
  
  console.log('✅ Profesionales de ejemplo creados');
}

// ==================== QUERIES PREPARADAS ====================

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
  updateSetting: db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
};

// ==================== HELPERS ====================

function parseBody(req, callback) {
  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', () => {
    try {
      callback(null, body ? JSON.parse(body) : {});
    } catch (e) {
      callback(e);
    }
  });
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('404 - No encontrado');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
}

// ==================== SERVIDOR HTTP ====================

const server = http.createServer((req, res) => {
  const { method, url } = req;
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // ==================== API ROUTES ====================
  
  // NEWS
  if (url === '/api/news' && method === 'GET') {
    sendJSON(res, 200, queries.getAllNews.all());
  }
  else if (url === '/api/news/featured' && method === 'GET') {
    sendJSON(res, 200, queries.getFeaturedNews.all());
  }
  else if (url.match(/^\/api\/news\/\d+$/) && method === 'GET') {
    const id = url.split('/')[3];
    const news = queries.getNewsById.get(id);
    sendJSON(res, news ? 200 : 404, news || { error: 'No encontrado' });
  }
  else if (url === '/api/news' && method === 'POST') {
    parseBody(req, (err, data) => {
      if (err) return sendJSON(res, 400, { error: 'JSON inválido' });
      const { title, content, excerpt, author, image_url, featured } = data;
      const result = queries.createNews.run(title, content, excerpt, author, image_url, featured ? 1 : 0);
      sendJSON(res, 201, { id: result.lastInsertRowid, message: 'Noticia creada' });
    });
  }
  else if (url.match(/^\/api\/news\/\d+$/) && method === 'PUT') {
    const id = url.split('/')[3];
    parseBody(req, (err, data) => {
      if (err) return sendJSON(res, 400, { error: 'JSON inválido' });
      const { title, content, excerpt, author, image_url, featured } = data;
      queries.updateNews.run(title, content, excerpt, author, image_url, featured ? 1 : 0, id);
      sendJSON(res, 200, { message: 'Noticia actualizada' });
    });
  }
  else if (url.match(/^\/api\/news\/\d+$/) && method === 'DELETE') {
    const id = url.split('/')[3];
    queries.deleteNews.run(id);
    sendJSON(res, 200, { message: 'Noticia eliminada' });
  }
  
  // BOARD MEMBERS
  else if (url === '/api/board' && method === 'GET') {
    sendJSON(res, 200, queries.getAllBoard.all());
  }
  else if (url.match(/^\/api\/board\/\d+$/) && method === 'GET') {
    const id = url.split('/')[3];
    const member = queries.getBoardById.get(id);
    sendJSON(res, member ? 200 : 404, member || { error: 'No encontrado' });
  }
  else if (url === '/api/board' && method === 'POST') {
    parseBody(req, (err, data) => {
      if (err) return sendJSON(res, 400, { error: 'JSON inválido' });
      const { name, position, bio, photo_url, email, order_position } = data;
      const result = queries.createBoard.run(name, position, bio, photo_url, email, order_position || 0);
      sendJSON(res, 201, { id: result.lastInsertRowid, message: 'Miembro creado' });
    });
  }
  else if (url.match(/^\/api\/board\/\d+$/) && method === 'PUT') {
    const id = url.split('/')[3];
    parseBody(req, (err, data) => {
      if (err) return sendJSON(res, 400, { error: 'JSON inválido' });
      const { name, position, bio, photo_url, email, order_position } = data;
      queries.updateBoard.run(name, position, bio, photo_url, email, order_position, id);
      sendJSON(res, 200, { message: 'Miembro actualizado' });
    });
  }
  else if (url.match(/^\/api\/board\/\d+$/) && method === 'DELETE') {
    const id = url.split('/')[3];
    queries.deleteBoard.run(id);
    sendJSON(res, 200, { message: 'Miembro eliminado' });
  }
  
  // MEMBERS
  else if (url === '/api/members' && method === 'GET') {
    sendJSON(res, 200, queries.getAllMembers.all());
  }
  else if (url.startsWith('/api/members/search?') && method === 'GET') {
    const query = url.split('?')[1];
    const params = querystring.parse(query);
    const search = `%${params.q || ''}%`;
    sendJSON(res, 200, queries.searchMembers.all(search, search, search));
  }
  else if (url.match(/^\/api\/members\/\d+$/) && method === 'GET') {
    const id = url.split('/')[3];
    const member = queries.getMemberById.get(id);
    sendJSON(res, member ? 200 : 404, member || { error: 'No encontrado' });
  }
  else if (url === '/api/members' && method === 'POST') {
    parseBody(req, (err, data) => {
      if (err) return sendJSON(res, 400, { error: 'JSON inválido' });
      const { matricula, name, surname, specialty, phone, email, city, registration_date } = data;
      const result = queries.createMember.run(matricula, name, surname, specialty, phone, email, city, registration_date);
      sendJSON(res, 201, { id: result.lastInsertRowid, message: 'Profesional creado' });
    });
  }
  else if (url.match(/^\/api\/members\/\d+$/) && method === 'PUT') {
    const id = url.split('/')[3];
    parseBody(req, (err, data) => {
      if (err) return sendJSON(res, 400, { error: 'JSON inválido' });
      const { matricula, name, surname, specialty, phone, email, city, registration_date } = data;
      queries.updateMember.run(matricula, name, surname, specialty, phone, email, city, registration_date, id);
      sendJSON(res, 200, { message: 'Profesional actualizado' });
    });
  }
  else if (url.match(/^\/api\/members\/\d+$/) && method === 'DELETE') {
    const id = url.split('/')[3];
    queries.deleteMember.run(id);
    sendJSON(res, 200, { message: 'Profesional eliminado' });
  }
  
  // SETTINGS
  else if (url === '/api/settings' && method === 'GET') {
    sendJSON(res, 200, queries.getAllSettings.all());
  }
  
  // ==================== STATIC FILES ====================
  
  else if (url === '/' || url === '/index.html') {
    serveFile(res, path.join(__dirname, 'public', 'index.html'), 'text/html');
  }
  else if (url.endsWith('.html')) {
    serveFile(res, path.join(__dirname, 'public', url), 'text/html');
  }
  else if (url.endsWith('.css')) {
    serveFile(res, path.join(__dirname, 'public', url), 'text/css');
  }
  else if (url.endsWith('.js')) {
    serveFile(res, path.join(__dirname, 'public', url), 'application/javascript');
  }
  else if (url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
    serveFile(res, path.join(__dirname, 'public', url), 'image/' + url.split('.').pop());
  }
  else {
    res.writeHead(404);
    res.end('404 - Página no encontrada');
  }
});

// Cerrar BD al terminar
process.on('SIGINT', () => {
  console.log('\n👋 Cerrando servidor...');
  db.close();
  process.exit(0);
});

server.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏛️  COLEGIO DE PROFESIONALES EN TURISMO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🌐 Sitio Web: http://localhost:${PORT}`);
  console.log(`⚙️  Admin: http://localhost:${PORT}/admin.html`);
  console.log(`💾 Base de datos: ${DB_PATH}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Presiona Ctrl+C para detener\n');
});
