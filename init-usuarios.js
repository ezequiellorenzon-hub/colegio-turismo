// Script para inicializar usuarios con bcrypt
// Ejecutar: node init-usuarios.js

const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'colegio.db'));

async function initUsuarios() {
    console.log('🔐 Inicializando usuarios...\n');
    
    try {
        // 1. Crear usuario admin
        const adminPassword = 'admin123';
        const adminHash = await bcrypt.hash(adminPassword, 10);
        
        // Eliminar admin si existe
        db.prepare('DELETE FROM usuarios WHERE username = ?').run('admin');
        
        // Crear admin
        db.prepare(`
            INSERT INTO usuarios (username, password_hash, rol, activo) 
            VALUES (?, ?, ?, 1)
        `).run('admin', adminHash, 'admin');
        
        console.log('✅ Usuario admin creado');
        console.log('   Usuario: admin');
        console.log('   Password: admin123');
        console.log('');
        
        // 2. Crear usuarios para los profesionales
        const members = db.prepare('SELECT id, matricula, name, surname FROM members WHERE active = 1 LIMIT 10').all();
        
        console.log(`📋 Creando usuarios para ${members.length} profesionales...\n`);
        
        for (const member of members) {
            // Password = matrícula
            const password = member.matricula;
            const hash = await bcrypt.hash(password, 10);
            
            // Eliminar si existe
            db.prepare('DELETE FROM usuarios WHERE username = ?').run(member.matricula);
            
            // Crear usuario
            try {
                db.prepare(`
                    INSERT INTO usuarios (username, password_hash, rol, member_id, activo) 
                    VALUES (?, ?, ?, ?, 1)
                `).run(member.matricula, hash, 'colegiado', member.id);
                
                console.log(`✅ ${member.surname}, ${member.name}`);
                console.log(`   Matrícula: ${member.matricula}`);
                console.log(`   Usuario: ${member.matricula}`);
                console.log(`   Password: ${member.matricula}`);
                console.log('');
            } catch (error) {
                console.error(`❌ Error con ${member.matricula}:`, error.message);
            }
        }
        
        // 3. Verificar
        const totalUsuarios = db.prepare('SELECT COUNT(*) as total FROM usuarios').get();
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`✅ Inicialización completada`);
        console.log(`📊 Total de usuarios: ${totalUsuarios.total}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log('🔐 Credenciales de prueba:');
        console.log('   Admin: admin / admin123');
        console.log('   Colegiado: [matrícula] / [matrícula]');
        console.log('');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        db.close();
    }
}

initUsuarios();
