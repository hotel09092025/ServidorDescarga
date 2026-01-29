const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Ruta del ejecutable en Railway
const YT_DLP_PATH = '/usr/local/bin/yt-dlp';

// Función para limpiar nombres de archivos
function limpiarNombre(texto) {
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 60);
}

// ENDPOINT ESTILO RYT-MUSIC (Link Directo)
app.get('/obtener-link/:videoId', (req, res) => {
    const { videoId } = req.params;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Comando para obtener Título y URL de audio (m4a)
// En server.js de Railway
const command = `${YT_DLP_PATH} --js-runtime node -f "ba[ext=m4a]/bestaudio" --extractor-args "youtube:player-client=tv;player-skip=web,mweb,android,ios" --get-title --get-url "${videoUrl}"`;
    console.log(`🔗 Generando link para: ${videoId}`);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Error:', stderr || error.message);
            return res.status(500).json({ 
                success: false, 
                error: "YouTube bloqueó la petición al servidor. Reintenta." 
            });
        }

        const lineas = stdout.trim().split('\n');
        const titulo = lineas[0];
        const urlDirecta = lineas[1];

        if (!urlDirecta) {
            return res.status(500).json({ success: false, error: "No se encontró el link de audio" });
        }

        console.log(`✅ Link generado: ${titulo}`);

        res.json({
            success: true,
            titulo: titulo,
            urlDirecta: urlDirecta,
            sugerenciaNombre: `${limpiarNombre(titulo)}.m4a`
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 SERVIDOR MODO LINK-DIRECTO ONLINE`);
    console.log(`📍 Puerto: ${PORT}`);
});

