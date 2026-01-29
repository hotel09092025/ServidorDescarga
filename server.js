const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Ruta donde vive yt-dlp en Railway
const YT_DLP_PATH = '/usr/local/bin/yt-dlp';

/**
 * Endpoint principal: Obtiene la información necesaria para que el celular descargue.
 */
app.get('/obtener-link/:videoId', (req, res) => {
    const { videoId } = req.params;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // COMANDO CLAVE: 
    // --get-title: para el nombre de la canción.
    // --get-url: para el link directo de los servidores de Google.
    // -f "ba[ext=m4a]": para obtener solo el audio en mejor calidad.
    const command = `${YT_DLP_PATH} --js-runtime node -f "ba[ext=m4a]/bestaudio" --get-title --get-url "${videoUrl}"`;

    console.log(`🔗 Extrayendo link de audio para ID: ${videoId}`);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Error de extracción:', stderr || error.message);
            return res.status(500).json({ 
                success: false, 
                error: "YouTube detectó tráfico inusual. Reintenta en unos segundos." 
            });
        }

        // stdout devuelve el título en la primera línea y la URL en la segunda
        const lineas = stdout.trim().split('\n');
        const titulo = lineas[0];
        const urlDirecta = lineas[1];

        if (!urlDirecta) {
            return res.status(500).json({ success: false, error: "No se pudo obtener la URL" });
        }

        console.log(`✅ Link generado para: ${titulo}`);

        res.json({
            success: true,
            titulo: titulo,
            urlDirecta: urlDirecta, // Este link es el que usará tu App
            sugerenciaNombre: `${titulo.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_')}.m4a`
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 SERVIDOR ESTILO RYT-MUSIC ONLINE`);
    console.log(`📍 Puerto: ${PORT}`);
    console.log(`📡 Esperando peticiones de React Native...`);
});
