const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const ytSearch = require('yt-search'); // ¡Adiós límites!

const app = express();
app.use(cors());

const YT_DLP_PATH = '/usr/local/bin/yt-dlp'; 

// NUEVA RUTA: Búsqueda sin API Key de Google
app.get('/buscar', async (req, res) => {
    try {
        const query = req.query.q;
        console.log(`[LOG] 🔍 Buscando: ${query}`);
        const r = await ytSearch(query);
        const videos = r.videos.slice(0, 15);
        
        // Mantenemos el formato para no romper el frontend
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
        res.status(500).send("Error en búsqueda");
    }
});

app.get('/descargar/:videoId', (req, res) => {
    const { videoId } = req.params;
    res.setHeader('Content-Type', 'audio/mpeg');
    
    const comando = spawn(YT_DLP_PATH, [
        '--no-check-certificate',
        '--extractor-args', 'youtube:player_client=android,web',
        '-f', 'bestaudio',
        '-o', '-', 
        `https://www.youtube.com/watch?v=${videoId}`
    ]);

    comando.stdout.pipe(res);
    comando.on('close', () => res.end());
});

app.listen(process.env.PORT || 3000, '0.0.0.0');
