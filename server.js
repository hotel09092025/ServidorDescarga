const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();
app.use(cors());

const YT_DLP_PATH = '/usr/local/bin/yt-dlp'; 

app.get('/descargar/:videoId', (req, res) => {
    const { videoId } = req.params;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    console.log(`🚀 Iniciando descarga blindada: ${videoId}`);

    res.setHeader('Content-Type', 'audio/mp4');
    // Forzamos el nombre en la cabecera
    res.setHeader('Content-Disposition', 'attachment; filename="musica.m4a"');

    const proceso = spawn(YT_DLP_PATH, [
        // 1. Engañamos a YT diciendo que somos una App de iOS (pide menos cookies)
        '--extractor-args', 'youtube:player_client=ios,android',
        // 2. Usamos el motor de Node de Railway para resolver firmas
        '--js-runtime', 'node',
        // 3. Forzamos el formato de audio estándar de Apple (M4A)
        '-f', '140',
        '-o', '-',
        '--no-check-certificate',
        '--quiet',
        videoUrl
    ]);

    // Pasamos los datos directamente al móvil
    proceso.stdout.pipe(res);

    proceso.stderr.on('data', (data) => {
        const msg = data.toString();
        // Solo logueamos errores reales, no advertencias
        if (msg.includes('ERROR')) console.error(`[Error YT]: ${msg}`);
    });

    proceso.on('close', (code) => {
        console.log(`🏁 Proceso terminado (Código ${code})`);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ SERVIDOR BLINDADO CORRIENDO`);
});
