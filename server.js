const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const ytSearch = require('yt-search'); 

const app = express();
app.use(cors());

// Mantenemos tu ruta porque ya comprobaste que ahí es donde vive el ejecutable
const YT_DLP_PATH = '/usr/local/bin/yt-dlp'; 

// RUTA DE BÚSQUEDA: Sin API Key, usando yt-search
app.get('/buscar', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.status(400).send("Falta el parámetro q");
        
        console.log(`[LOG] 🔍 Buscando en YouTube: ${query}`);
        const r = await ytSearch(query);
        
        // Formateamos para que tu App de React Native no note el cambio
        const videos = r.videos.slice(0, 15);
        const results = videos.map(v => ({
            id: { videoId: v.videoId },
            snippet: {
                title: v.title,
                thumbnails: { high: { url: v.thumbnail } },
                channelTitle: v.author.name
            }
        }));
        
        res.json({ items: results });
    } catch (e) {
        console.error("Error en búsqueda:", e);
        res.status(500).send("Error en el servidor de búsqueda");
    }
});

// RUTA DE DESCARGA: Tu método que ya funciona
app.get('/descargar/:videoId', (req, res) => {
    const { videoId } = req.params;
    console.log(`[LOG] ⏬ Transfiriendo audio: ${videoId}`);
    
    res.setHeader('Content-Type', 'audio/mpeg');
    
    const comando = spawn(YT_DLP_PATH, [
        '--no-check-certificate',
        '--extractor-args', 'youtube:player_client=android,web',
        '-f', 'bestaudio',
        '-o', '-', 
        `https://www.youtube.com/watch?v=${videoId}`
    ]);

    comando.stdout.pipe(res);

    comando.on('close', (code) => {
        console.log(`[LOG] 🏁 Stream finalizado código: ${code}`);
        res.end();
    });
    
    // Captura de errores por si el binario falla
    comando.stderr.on('data', (data) => {
        console.log(`[yt-dlp error]: ${data}`);
    });
});

// Escuchar en el puerto dinámico de Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] 🚀 Sistema listo en puerto ${PORT}`);
});
