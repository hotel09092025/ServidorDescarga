const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const ytSearch = require('yt-search'); // Añadimos el buscador

// PARCHE PARA QUE NO EXPLOTE (Lo necesitamos para yt-search)
if (typeof File === 'undefined') { global.File = class extends Object {}; }

const app = express();
app.use(cors());

// Tu ruta absoluta verificada
const YT_DLP_PATH = '/usr/local/bin/yt-dlp'; 

// --- NUEVA RUTA DE BÚSQUEDA (Sin API Key de Google) ---
app.get('/buscar', async (req, res) => {
    try {
        const query = req.query.q;
        console.log(`[LOG] 🔍 Buscando: ${query}`);
        
        const r = await ytSearch(query);
        const videos = r.videos.slice(0, 15);
        
        // Mantenemos el formato de Google para que tu App no note el cambio
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
        res.status(500).send("Error");
    }
});

// --- TU RUTA DE DESCARGA QUE SÍ FUNCIONA (Sin cambios) ---
app.get('/descargar/:videoId', (req, res) => {
    const { videoId } = req.params;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    console.log(`[LOG] 🚀 Nueva petición: ID ${videoId}`);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${videoId}.mp3"`);

    const comando = spawn(YT_DLP_PATH, [
        '--js-runtime', 'node',
        '--no-check-certificate',
        '--extractor-args', 'youtube:player_client=android,web',
        '-f', 'bestaudio[ext=m4a]/best[height<=360]', // Tu configuración ganadora
        '-o', '-', 
        videoUrl
    ]);

    comando.stdout.pipe(res);

    comando.stderr.on('data', (data) => {
        const mensaje = data.toString();
        if (mensaje.includes('[download]')) {
            console.log(`[YT-DLP] ⏬ ${mensaje.trim()}`);
        }
    });

    comando.on('close', (code) => {
        if (code === 0) {
            console.log(`[LOG] ✅ ÉXITO: Stream enviado a ID ${videoId}`);
        } else {
            console.error(`[LOG] ❌ ERROR: Código ${code}`);
            if (!res.headersSent) res.status(500).send("Error");
        }
    });

    req.on('close', () => {
        console.log(`[LOG] 🛑 Conexión cerrada por el usuario.`);
        comando.kill();
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 SERVIDOR OK EN PUERTO ${PORT}`));
