const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Ruta absoluta que ya confirmamos que funciona en tu Railway
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

    // MODIFICACIÓN FINAL: Usamos "-f 140" para obtener el archivo M4A directo
    // Esto evita que te mande el link .m3u8 que daba error en la descarga
    const command = `${YT_DLP_PATH} --js-runtime node ` +
        `--cookies "./cookies.txt" ` +
        `--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36" ` +
        `-f 140 ` + 
        `--no-check-certificate --get-title --get-url "${videoUrl}"`;

    console.log(`🔗 Generando link directo (m4a) para: ${videoId}`);

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

        console.log(`✅ Link generado correctamente: ${titulo}`);

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
    console.log(`\n🚀 SERVIDOR MODO M4A-DIRECTO ONLINE`);
    console.log(`📍 Puerto: ${PORT}`);
});
