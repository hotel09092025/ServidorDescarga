const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();
app.use(cors());

// Mantenemos tu ruta absoluta que ya funciona
const YT_DLP_PATH = '/usr/local/bin/yt-dlp'; 

app.get('/descargar/:videoId', (req, res) => {
    const { videoId } = req.params;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    console.log(`[LOG] 🚀 Nueva petición: ID ${videoId}`);

    // Configuramos cabeceras para flujo de audio
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${videoId}.mp3"`);

    console.log(`[LOG] 🛠️  Iniciando extracción de audio...`);

    // Usamos SPAWN en lugar de EXEC para que los datos fluyan (Streaming)
    // El parámetro "-o -" le dice a yt-dlp que no cree un archivo, sino que lo mande al "pipe"
    const comando = spawn(YT_DLP_PATH, [
        '--js-runtime', 'node',
        '--no-check-certificate',
        '--extractor-args', 'youtube:player_client=android,web',
        '-f', 'bestaudio[ext=m4a]/best[height<=360]',
        '-o', '-', 
        videoUrl
    ]);

    // 1. Logs de errores de yt-dlp
    comando.stderr.on('data', (data) => {
        const mensaje = data.toString();
        if (mensaje.includes('[download]')) {
            // Log de progreso para ver que Railway está trabajando
            console.log(`[YT-DLP] ⏬ ${mensaje.trim()}`);
        } else {
            console.log(`[YT-DLP INFO] ${mensaje.trim()}`);
        }
    });

    // 2. TÚNEL DE DATOS: YouTube -> Railway -> Celular
    comando.stdout.pipe(res);

    // 3. Log de finalización
    comando.on('close', (code) => {
        if (code === 0) {
            console.log(`[LOG] ✅ ÉXITO: Audio enviado al celular (${videoId})`);
        } else {
            console.error(`[LOG] ❌ ERROR: yt-dlp falló con código ${code}`);
            if (!res.headersSent) res.status(500).send("Error en la descarga");
        }
    });

    // 4. Manejo de desconexión (si el usuario cierra la app o cancela)
    req.on('close', () => {
        console.log(`[LOG] 🛑 Conexión cerrada por el usuario. Cancelando proceso.`);
        comando.kill();
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    =========================================
    🚀 SERVIDOR DE CAPTURA ACTIVO
    📡 Puerto: ${PORT}
    🛠️  YT-DLP: ${YT_DLP_PATH}
    💡 Modo: Streaming Directo (Sin archivos temporales)
    =========================================
    `);
});
