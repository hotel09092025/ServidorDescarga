const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());

const YT_DLP_PATH = '/usr/local/bin/yt-dlp'; 
const descargasDir = path.join(__dirname, 'temp_music');

if (!fs.existsSync(descargasDir)) fs.mkdirSync(descargasDir);

app.get('/descargar/:videoId', async (req, res) => {
    const { videoId } = req.params;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // 1. Obtener el título primero para el nombre del archivo
    exec(`${YT_DLP_PATH} --get-title ${videoUrl}`, (err, stdout) => {
        if (err) return res.status(500).json({ error: "Error obteniendo título" });

        const titulo = stdout.trim();
        const safeName = titulo.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_') + ".mp4";
        const filePath = path.join(descargasDir, safeName);

        console.log(`⬇ Descargando temporalmente: ${titulo}`);

        // 2. Descargar al disco de Railway (con tus cookies y formato MP4)
        // MODIFICACIÓN EN EL COMANDO DE DESCARGA
const comando = `${YT_DLP_PATH} ` + 
    `--no-check-certificate ` +
    `--js-runtime node ` +
    `--extractor-args "youtube:player_client=android,web;player_skip=web_safari,configs" ` +
    `--user-agent "Mozilla/5.0 (Android 14; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0" ` +
    `-f "bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best" ` +
    `-o "${filePath}" ` +
    `${videoUrl}`;
        exec(comando, (error) => {
            if (error) {
                console.error("❌ Error YT:", error);
                return res.status(500).send("Error en YouTube");
            }

            // 3. ENVIAR AL CELULAR
            console.log(`📤 Enviando al celular: ${safeName}`);
            res.download(filePath, safeName, (err) => {
                if (!err) {
                    // 4. BORRAR DEL SERVIDOR (Auto-limpieza)
                    fs.unlinkSync(filePath); 
                    console.log(`🗑️ Limpieza: Archivo borrado del servidor.`);
                }
            });
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Servidor de Transferencia Directa OK`));

