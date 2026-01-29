const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Volvemos a la ruta que SI te funcionaba
const YT_DLP_PATH = '/usr/local/bin/yt-dlp'; 

function limpiarNombre(texto) {
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 60);
}

app.get('/obtener-link/:videoId', (req, res) => {
    const { videoId } = req.params;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // COMANDO UNIFICADO CON RUTA ABSOLUTA Y COOKIES
const command = `${YT_DLP_PATH} --js-runtime node ` +
    `--cookies "./cookies.txt" ` +
    `--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36" ` +
    `-f "bestaudio[ext=m4a]/bestaudio/best" ` + // Buscamos m4a, si no, cualquier audio
    `--no-check-certificate --get-title --get-url "${videoUrl}"`;
    console.log(`🔗 Generando link para: ${videoId}`);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Error de yt-dlp:', stderr || error.message);
            return res.status(500).json({ 
                success: false, 
                error: "YouTube detectó un bot o las cookies expiraron." 
            });
        }

        const lineas = stdout.trim().split('\n');
        
        if (lineas.length < 2) {
            return res.status(500).json({ success: false, error: "Respuesta incompleta de YouTube" });
        }

        const titulo = lineas[0];
        const urlDirecta = lineas[1];

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
    console.log(`\n🚀 SERVIDOR ONLINE CON RUTA FIJA`);
    console.log(`📍 Puerto: ${PORT}`);
});

