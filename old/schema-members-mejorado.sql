-- ==================== MEJORAS PARA MEMBERS ====================

-- Tabla de especialidades
CREATE TABLE IF NOT EXISTS especialidades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    activo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de relación many-to-many: members <-> especialidades
CREATE TABLE IF NOT EXISTS member_especialidades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    especialidad_id INTEGER NOT NULL,
    fecha_obtencion DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (especialidad_id) REFERENCES especialidades(id),
    UNIQUE(member_id, especialidad_id)
);

-- Agregar campo foto a members
ALTER TABLE members ADD COLUMN foto_url TEXT;

-- Índices
CREATE INDEX IF NOT EXISTS idx_member_especialidades_member ON member_especialidades(member_id);
CREATE INDEX IF NOT EXISTS idx_member_especialidades_esp ON member_especialidades(especialidad_id);

-- ==================== DATOS INICIALES ====================

-- Especialidades comunes en turismo
INSERT OR IGNORE INTO especialidades (nombre, descripcion) VALUES
('Guía de Turismo', 'Profesional habilitado para guiar excursiones'),
('Agente de Viajes', 'Profesional en venta y organización de viajes'),
('Técnico en Turismo', 'Técnico superior en turismo'),
('Licenciado en Turismo', 'Licenciatura universitaria en turismo'),
('Hotelería', 'Especialista en gestión hotelera'),
('Gastronomía Turística', 'Especialista en gastronomía aplicada al turismo'),
('Turismo Aventura', 'Especialista en actividades de turismo aventura'),
('Turismo Rural', 'Especialista en turismo rural y agroturismo'),
('Turismo Cultural', 'Especialista en patrimonio y turismo cultural'),
('Ecoturismo', 'Especialista en turismo sostenible y naturaleza'),
('Coordinador de Grupos', 'Coordinador de contingentes y grupos turísticos'),
('Wedding Planner', 'Organizador de eventos y bodas'),
('Sommelier', 'Especialista en vinos y maridajes'),
('Chef de Turismo', 'Chef especializado en gastronomía turística'),
('Consultor Turístico', 'Asesor en desarrollo y planificación turística');

-- Migrar especialidades existentes
-- (esto es opcional, para no perder datos actuales)
INSERT OR IGNORE INTO member_especialidades (member_id, especialidad_id)
SELECT m.id, e.id
FROM members m
JOIN especialidades e ON e.nombre = m.specialty
WHERE m.specialty IS NOT NULL AND m.specialty != '';

-- ==================== VISTAS ÚTILES ====================

-- Vista para obtener members con todas sus especialidades
CREATE VIEW IF NOT EXISTS v_members_completo AS
SELECT 
    m.id,
    m.matricula,
    m.name,
    m.surname,
    m.phone,
    m.email,
    m.city,
    m.foto_url,
    m.registration_date,
    m.active,
    GROUP_CONCAT(e.nombre, ', ') as especialidades,
    COUNT(DISTINCT me.especialidad_id) as cantidad_especialidades
FROM members m
LEFT JOIN member_especialidades me ON me.member_id = m.id
LEFT JOIN especialidades e ON e.id = me.especialidad_id AND e.activo = 1
WHERE m.active = 1
GROUP BY m.id
ORDER BY m.surname, m.name;

-- ==================== QUERIES PARA SERVER.JS ====================

-- Agregar estos queries preparados en server.js:

/*
// Especialidades
getAllEspecialidades: db.prepare('SELECT * FROM especialidades WHERE activo = 1 ORDER BY nombre'),
createEspecialidad: db.prepare('INSERT INTO especialidades (nombre, descripcion) VALUES (?, ?)'),

// Member-Especialidades
getEspecialidadesByMember: db.prepare(`
    SELECT e.* 
    FROM especialidades e
    JOIN member_especialidades me ON me.especialidad_id = e.id
    WHERE me.member_id = ? AND e.activo = 1
`),
addEspecialidadToMember: db.prepare('INSERT OR IGNORE INTO member_especialidades (member_id, especialidad_id) VALUES (?, ?)'),
removeEspecialidadFromMember: db.prepare('DELETE FROM member_especialidades WHERE member_id = ? AND especialidad_id = ?'),
clearMemberEspecialidades: db.prepare('DELETE FROM member_especialidades WHERE member_id = ?'),

// Members actualizado
updateMemberWithFoto: db.prepare('UPDATE members SET matricula = ?, name = ?, surname = ?, phone = ?, email = ?, city = ?, foto_url = ?, registration_date = ? WHERE id = ?'),
*/

-- ==================== NOTAS ====================
-- 1. El campo 'specialty' en members queda deprecated pero no se elimina por compatibilidad
-- 2. La foto se guardará como URL (podés usar un servicio como Cloudinary o guardar en /public/uploads/)
-- 3. Para la credencial, se usará foto_url del member
-- 4. Los colegiados podrán subir/cambiar su foto desde su panel
