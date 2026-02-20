#!/bin/bash
# Script para verificar la configuración del archivo .env

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 VERIFICADOR DE ARCHIVO .env"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar que estamos en la carpeta correcta
if [ ! -f "package.json" ]; then
    echo "❌ Error: No estás en la carpeta del proyecto"
    echo "   Ejecuta: cd /home/ezequiel/Progr/NodeJs/colegio-turismo"
    exit 1
fi

# Verificar si existe el archivo .env
if [ ! -f ".env" ]; then
    echo "❌ El archivo .env NO existe"
    echo ""
    echo "Para crearlo:"
    echo "  nano .env"
    echo ""
    echo "Y pega este contenido:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "EMAIL_USER=tucorreo@gmail.com"
    echo "EMAIL_PASS=xxxx xxxx xxxx xxxx"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
fi

echo "✅ El archivo .env existe"
echo ""

# Leer y verificar las variables
echo "📋 Contenido del archivo .env:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Buscar EMAIL_USER
email_user=$(grep "^EMAIL_USER=" .env | cut -d'=' -f2)
if [ -z "$email_user" ]; then
    echo "❌ EMAIL_USER no está configurado"
else
    if [[ "$email_user" == *"tucorreo@gmail.com"* ]] || [[ "$email_user" == *"ejemplo"* ]]; then
        echo "⚠️  EMAIL_USER: $email_user (⚠️ Parece un ejemplo, cambialo por tu email real)"
    else
        echo "✅ EMAIL_USER: $email_user"
    fi
fi

# Buscar EMAIL_PASS
email_pass=$(grep "^EMAIL_PASS=" .env | cut -d'=' -f2)
if [ -z "$email_pass" ]; then
    echo "❌ EMAIL_PASS no está configurado"
else
    pass_length=${#email_pass}
    # Remover espacios para contar solo caracteres
    pass_no_spaces=$(echo "$email_pass" | tr -d ' ')
    pass_real_length=${#pass_no_spaces}
    
    if [[ "$email_pass" == *"xxxx"* ]] || [ "$pass_real_length" -lt 16 ]; then
        echo "⚠️  EMAIL_PASS: [${pass_length} caracteres] (⚠️ Parece un ejemplo o muy corta)"
        echo "   Las contraseñas de aplicación de Gmail tienen 16 caracteres"
    else
        echo "✅ EMAIL_PASS: [${pass_length} caracteres] (Configurada - No se muestra por seguridad)"
    fi
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar si dotenv está instalado
if [ ! -d "node_modules/dotenv" ]; then
    echo "⚠️  El paquete 'dotenv' NO está instalado"
    echo "   Instálalo con: npm install dotenv"
    echo ""
else
    echo "✅ El paquete 'dotenv' está instalado"
fi

# Verificar si el servidor tiene require('dotenv').config()
if grep -q "require('dotenv').config()" server.js; then
    echo "✅ El server.js tiene require('dotenv').config()"
else
    echo "❌ El server.js NO tiene require('dotenv').config() al inicio"
    echo "   Agregalo en la primera línea del archivo"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 RESUMEN:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -z "$email_user" ] && [ ! -z "$email_pass" ] && [[ "$email_user" != *"tucorreo"* ]] && [[ "$email_pass" != *"xxxx"* ]] && [ -d "node_modules/dotenv" ]; then
    echo "✅ ¡Todo parece estar configurado correctamente!"
    echo ""
    echo "Ahora ejecutá:"
    echo "  npm start"
    echo ""
    echo "Y verificá que el servidor muestre:"
    echo "  📧 Email configurado: $email_user"
else
    echo "⚠️  Hay configuraciones pendientes (ver arriba)"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
