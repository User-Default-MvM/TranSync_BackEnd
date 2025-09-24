// scripts/hashPasswords.js
// Script ejecutable para hashear contraseñas existentes

require('dotenv').config();
const {
    hashExistingPasswords,
    verifyHashedPasswords,
    generateHashForPassword,
    updatePasswordByEmail
} = require('../src/utils/passwordHasher');

/**
 * Función principal del script
 */
const main = async () => {
    console.log('🚀 SCRIPT DE HASHEO DE CONTRASEÑAS - TRANSYNC');
    console.log('================================================');
    
    const args = process.argv.slice(2);
    const command = args[0];
    
    try {
        switch (command) {
            case 'hash-all':
                console.log('🔄 Hasheando todas las contraseñas existentes...');
                await hashExistingPasswords();
                break;
                
            case 'verify':
                console.log('🔍 Verificando contraseñas hasheadas...');
                await verifyHashedPasswords();
                break;
                
            case 'generate':
                const password = args[1];
                if (!password) {
                    console.log('❌ Uso: node scripts/hashPasswords.js generate <contraseña>');
                    return;
                }
                console.log('🔐 Generando hash para contraseña...');
                await generateHashForPassword(password);
                break;
                
            case 'update':
                const email = args[1];
                const newPassword = args[2];
                if (!email || !newPassword) {
                    console.log('❌ Uso: node scripts/hashPasswords.js update <email> <nueva_contraseña>');
                    return;
                }
                console.log(`🔄 Actualizando contraseña para ${email}...`);
                const result = await updatePasswordByEmail(email, newPassword);
                console.log(result.success ? '✅' : '❌', result.message);
                break;
                
            case 'fix-superadmin':
                console.log('🔧 Corrigiendo contraseña del SUPERADMIN...');
                const superadminResult = await updatePasswordByEmail('transsync1@gmail.com', 'admin123');
                console.log(superadminResult.success ? '✅' : '❌', superadminResult.message);
                
                if (superadminResult.success) {
                    console.log('🔍 Verificando...');
                    await verifyHashedPasswords();
                }
                break;
                
            default:
                console.log(`
📋 COMANDOS DISPONIBLES:

  hash-all          - Hashea todas las contraseñas existentes en la BD
  verify           - Verifica que las contraseñas estén correctamente hasheadas
  generate <pass>  - Genera hash para una contraseña específica
  update <email> <pass> - Actualiza la contraseña de un usuario específico
  fix-superadmin   - Corrige la contraseña del usuario SUPERADMIN

📌 EJEMPLOS:
  node scripts/hashPasswords.js hash-all
  node scripts/hashPasswords.js verify
  node scripts/hashPasswords.js generate admin123
  node scripts/hashPasswords.js update transsync1@gmail.com admin123
  node scripts/hashPasswords.js fix-superadmin

⚠️  IMPORTANTE: Asegúrate de tener configuradas las variables de entorno en tu archivo .env
                `);
        }
        
    } catch (error) {
        console.error('❌ Error ejecutando el script:', error.message);
        process.exit(1);
    }
    
    console.log('\n🏁 Script completado.');
    process.exit(0);
};

// Ejecutar solo si es llamado directamente
if (require.main === module) {
    main();
}