const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();
app.use(cors());

// Ruta absoluta de yt-dlp en Railway
const YT_DLP_PATH = '/usr/local/bin/yt-dlp'; 

app.get('/descargar/:videoId', (req, res) => {
    const { videoId } = req.params;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    console.log(`🚀 Iniciando túnel de descarga para: ${videoId}`);

    // Configuramos las cabeceras para que el celular sepa que es un archivo de audio
    res.setHeader('Content-Type', 'audio/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="audio.m4a"');

    // Ejecutamos yt-dlp y mandamos el resultado directamente a la respuesta (pipe)
    const proceso = spawn(YT_DLP_PATH, [
        '--cookies', './cookies.txt',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        '-f', '140', // Audio m4a de alta calidad
        '-o', '-',   // Esto es clave: manda el archivo a la salida estándar
        videoUrl
    ]);

    proceso.stdout.pipe(res);

    proceso.stderr.on('data', (data) => {
        console.log(`[yt-dlp log]: ${data}`);
    });

    proceso.on('close', (code) => {
        console.log(`✅ Descarga terminada con código: ${code}`);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVIDOR MODO TÚNEL ONLINE EN PUERTO ${PORT}`);
});
