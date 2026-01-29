const express = require('express');
const { spawn, exec } = require('child_process');
const cors = require('cors');

const app = express();
app.use(cors());

// En Railway no usamos powershell, usamos la ruta directa de Linux
const YT_DLP_PATH = '/usr/local/bin/yt-dlp'; 

app.get('/descargar/:videoId', (req, res) => {
    const { videoId } = req.params;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    console.log(`🎬 Iniciando túnel MP4 para: ${videoId}`);

    // Cabeceras para que el celular lo reconozca como video/audio MP4
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');

    // USAMOS TU LÓGICA: Buscar el mejor audio o un video pequeño (MP4)
    // Esto es mucho más compatible que el formato 140 solo.
    const proceso = spawn(YT_DLP_PATH, [
        '--cookies', './cookies.txt',
        '--js-runtime', 'node',
        // Tu lógica de formato: mejor audio m4a o video de 360p (MP4)
        '-f', 'bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best',
        '-o', '-', // Mandar a la salida estándar para el túnel
        '--no-playlist',
        '--no-check-certificate',
        videoUrl
    ]);

    // El flujo de datos va directo al celular
    proceso.stdout.pipe(res);

    proceso.stderr.on('data', (data) => {
        const line = data.toString();
        if (line.includes('ERROR')) console.error(`❌ Error YT: ${line}`);
    });

    proceso.on('close', (code) => {
        console.log(`🏁 Proceso finalizado con código: ${code}`);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🎵 SERVIDOR MP4 HÍBRIDO ONLINE`);
    console.log(`📍 Puerto: ${PORT}`);
    console.log(`🎬 Usando formato compatible (MP4/M4A)`);
});
