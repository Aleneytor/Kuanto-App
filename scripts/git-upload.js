const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Escribe el mensaje para el commit: ', (answer) => {
    const commitMsg = answer.trim() || 'Update: cambios en la app';

    try {
        console.log('\n📦 Agregando cambios...');
        execSync('git add .', { stdio: 'inherit' });

        console.log('💬 Haciendo commit...');
        // Usamos comillas dobles y escapamos las necesarias para el shell de Windows
        execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });

        console.log('🚀 Subiendo a GitHub...');
        execSync('git push', { stdio: 'inherit' });

        console.log('\n✅ ¡Todo listo! Los cambios se han subido.');
    } catch (error) {
        console.log('\n⚠️ No se pudieron subir cambios (tal vez no hay cambios para commit o error de red).');
    }

    rl.close();
});
