-- Script para agregar tablas de autoridades al Colegio de Turismo
-- Ejecutar este script después de iniciar el servidor por primera vez

-- Tabla: Consejo Directivo
CREATE TABLE IF NOT EXISTS consejo_directivo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cargo TEXT NOT NULL,
  apellido TEXT NOT NULL,
  nombre TEXT NOT NULL,
  matricula TEXT NOT NULL,
  categoria TEXT NOT NULL,
  delegacion_zona TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  periodo TEXT DEFAULT '2024-2026',
  activo BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: Comisión Revisora de Cuentas
CREATE TABLE IF NOT EXISTS comision_revisora (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cargo TEXT NOT NULL,
  apellido TEXT NOT NULL,
  nombre TEXT NOT NULL,
  matricula TEXT NOT NULL,
  categoria TEXT NOT NULL,
  delegacion_zona TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  periodo TEXT DEFAULT '2024-2026',
  activo BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: Tribunal de Ética
CREATE TABLE IF NOT EXISTS tribunal_etica (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cargo TEXT NOT NULL,
  apellido TEXT NOT NULL,
  nombre TEXT NOT NULL,
  matricula TEXT NOT NULL,
  categoria TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  periodo TEXT DEFAULT '2024-2028',
  activo BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- INSERTS: Consejo Directivo 2024-2026
-- ========================================

INSERT INTO consejo_directivo (cargo, apellido, nombre, matricula, categoria, delegacion_zona, orden) VALUES
('Presidenta', 'Romero Trucco', 'Amancay', '512', 'Licenciada', 'Mar del Plata', 1),
('Vicepresidente', 'Zaballa', 'Esteban', '1', 'Licenciado', 'Mar del Plata', 2),
('Secretario', 'Gallardo Batista', 'Victoria', '529', 'Licenciado', 'Sudoeste', 3),
('Prosecretario', 'Castiglione', 'Marcos', '574', 'Técnico', 'Centro', 4),
('Tesorera', 'Villamarin', 'Betiana', '84', 'Técnica y Guía', 'La Plata', 5),
('Protesorera', 'Raffanelli', 'María Belén', '63', 'Licenciada y Técnica', 'La Plata', 6),
('1º Vocal', 'Centineo', 'Marta Susana', '127', 'Guía', 'Centro', 7),
('2º Vocal', 'Martinez', 'Sebastian', '593', 'Técnico y Guía', 'Norte', 8),
('3º Vocal', 'Abdala', 'Maricel', '96', 'Guía', 'Norte', 9),
('1º Vocal Suplente', 'Cotone Muro', 'Valeria', '236', 'Técnica y Guía', 'Centro', 10),
('2º Vocal Suplente', 'Amor', 'Bernardo', '635', 'Licenciado', 'Sudoeste', 11),
('3º Vocal Suplente', 'Ferrari', 'Leonardo', '343', 'Licenciado', 'Norte', 12);

-- ========================================
-- INSERTS: Comisión Revisora de Cuentas 2024-2026
-- ========================================

INSERT INTO comision_revisora (cargo, apellido, nombre, matricula, categoria, delegacion_zona, orden) VALUES
('1º Titular', 'Santia', 'Marcela', '278', 'Guía', 'Norte', 1),
('2º Titular', 'Alvarez', 'Facundo', '5', 'Licenciado', 'Mar del Plata', 2),
('3º Titular', 'Moreno', 'Gabriela', '125', 'Técnica', 'Mar del Plata', 3),
('4º Titular', 'Passo', 'Hernán Elbio', '50', 'Guía', 'Centro', 4),
('1º Suplente', 'Sagarna', 'Juan', '573', 'Guía', 'Centro', 5),
('2º Suplente', 'Barovero Maxit', 'Mariana', '18', 'Licenciada', 'Mar del Plata', 6);

-- ========================================
-- INSERTS: Tribunal de Ética 2024-2028
-- ========================================

INSERT INTO tribunal_etica (cargo, apellido, nombre, matricula, categoria, orden) VALUES
('1º Titular', 'Biasone', 'Ana María', '19', 'Licenciada', 1),
('2º Titular', 'Martin', 'Ana', '210', 'Licenciada', 2),
('3º Titular', 'Torre', 'Rodrigo Hernán', '640', 'Licenciado', 3),
('4º Titular', 'Ballesteros', 'Lucrecia', '22', 'Licenciada, Técnica y Guía', 4),
('5º Titular', 'Gazzanego', 'Victoria', '9', 'Guía', 5),
('1º Suplente', 'Felice', 'Emiliano', '637', 'Licenciado', 6),
('2º Suplente', 'Russo', 'Ximena', '567', 'Guía', 7),
('3º Suplente', 'Cromechek', 'Lucas Fernando', '529', 'Licenciado', 8),
('4º Suplente', 'Herlein', 'Diego', '31', 'Guía', 9);
