// Script para diagnosticar problemas de login
// Ejecutar: node diagnostico-login.js

const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'colegio.db'));

async function diagnosticar() {
    console.log('🔍 DIAGNÓSTICO DEL SISTEMA DE LOGIN\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 1. Verificar tabla usuarios
    try {
        const usuarios = db.prepare('SELECT * FROM usuarios').all();
        console.log(`✅ Tabla usuarios existe`);
        console.log(`📊 Total de usuarios: ${usuarios.length}\n`);
        
        if (usuarios.length === 0) {
            console.log('⚠️  NO HAY USUARIOS CREADOS');
            console.log('   Ejecuta: node init-usuarios.js\n');
            return;
        }
        
        // 2. Ver usuarios
        console.log('👥 USUARIOS EN LA BASE DE DATOS:\n');
        usuarios.forEach(u => {
            console.log(`   Username: ${u.username}`);
            console.log(`   Rol: ${u.rol}`);
            console.log(`   Activo: ${u.activo ? 'Sí' : 'No'}`);
            console.log(`   Hash length: ${u.password_hash.length}`);
            console.log('');
        });
        
        // 3. Probar login del admin
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🧪 PROBANDO CREDENCIALES:\n');
        
        const admin = db.prepare('SELECT * FROM usuarios WHERE username = ?').get('admin');
        
        if (!admin) {
            console.log('❌ Usuario admin NO EXISTE');
            console.log('   Ejecuta: node init-usuarios.js\n');
            return;
        }
        
        console.log('Probando: admin / admin123');
        const match = await bcrypt.compare('admin123', admin.password_hash);
        
        if (match) {
            console.log('✅ Password correcta - Login debería funcionar\n');
        } else {
            console.log('❌ Password incorrecta - El hash está mal generado');
            console.log('   Ejecuta: node init-usuarios.js\n');
        }
        
        // 4. Probar un colegiado
        const colegiado = db.prepare(`
            SELECT u.*, m.matricula, m.name, m.surname 
            FROM usuarios u 
            JOIN members m ON u.member_id = m.id 
            WHERE u.rol = 'colegiado' 
            LIMIT 1
        `).get();
        
        if (colegiado) {
            console.log(`Probando: ${colegiado.matricula} / ${colegiado.matricula}`);
            const matchColegiado = await bcrypt.compare(colegiado.matricula, colegiado.password_hash);
            
            if (matchColegiado) {
                console.log('✅ Password correcta - Login debería funcionar\n');
            } else {
                console.log('❌ Password incorrecta - El hash está mal generado');
                console.log('   Ejecuta: node init-usuarios.js\n');
            }
        }
        
        // 5. Verificar express-session
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📦 VERIFICANDO DEPENDENCIAS:\n');
        
        try {
            require('express-session');
            console.log('✅ express-session instalado');
        } catch (e) {
            console.log('❌ express-session NO instalado');
            console.log('   Ejecuta: npm install express-session');
        }
        
        try {
            require('bcrypt');
            console.log('✅ bcrypt instalado');
        } catch (e) {
            console.log('❌ bcrypt NO instalado');
            console.log('   Ejecuta: npm install bcrypt');
        }
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.message.includes('no such table')) {
            console.log('\n⚠️  La tabla usuarios NO EXISTE');
            console.log('   Ejecuta: sqlite3 colegio.db < auth-schema.sql');
        }
    } finally {
        db.close();
    }
}

diagnosticar();
