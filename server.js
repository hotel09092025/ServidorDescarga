const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());

// Ruta de Linux en Railway
const YT_DLP_PATH = '/usr/local/bin/yt-dlp'; 
const descargasDir = path.join(__dirname, 'temp_music');

if (!fs.existsSync(descargasDir)) fs.mkdirSync(descargasDir);

app.get('/descargar/:videoId', async (req, res) => {
    const { videoId } = req.params;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // 1. Obtener título para el archivo
    exec(`${YT_DLP_PATH} --get-title ${videoUrl}`, (err, stdout) => {
        if (err) return res.status(500).json({ error: "Error de YouTube" });

        const titulo = stdout.trim();
        const safeName = titulo.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50) + ".mp4";
        const filePath = path.join(descargasDir, safeName);

        console.log(`⬇ Descargando: ${titulo}`);

        // 2. Comando con bypass de JS y Headers de Android
        const comando = `${YT_DLP_PATH} --js-runtime node --no-check-certificate --extractor-args "youtube:player_client=android,web" -f "bestaudio[ext=m4a]/best[height<=360]" -o "${filePath}" ${videoUrl}`;
        
        exec(comando, (error) => {
            if (error) {
                console.error("❌ Error YT:", error);
                return res.status(500).send("Error en la descarga");
            }

            // 3. ENVIAR AL CELULAR
            console.log(`📤 Enviando: ${safeName}`);
            res.download(filePath, safeName, (err) => {
                if (!err) {
                    // ESPERAR 1 MINUTO ANTES DE BORRAR (Para asegurar que el cel lo reciba)
                    setTimeout(() => {
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                            console.log(`🗑️ Limpieza: ${safeName} borrado.`);
                        }
                    }, 60000); 
                }
            });
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 SERVIDOR OK EN PUERTO ${PORT}`));
