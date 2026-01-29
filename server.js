const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Directorio de descargas dinámico (compatible con Windows y Linux)
const descargasDir = path.join(__dirname, 'musica_app');

// Crear la carpeta automáticamente al iniciar
if (!fs.existsSync(descargasDir)) {
    fs.mkdirSync(descargasDir, { recursive: true });
    console.log(`📁 Carpeta de descargas lista en: ${descargasDir}`);
}

// Función base para ejecutar yt-dlp
function runYtDlp(args) {
    return new Promise((resolve, reject) => {
        // Usamos python3 para Railway (en Windows también suele funcionar)
        const command = `python3 -m yt_dlp ${args} --js-runtime node --no-playlist`;
        
        console.log(`▶ Ejecutando: ${command}`);
        
        exec(command, { timeout: 180000 }, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Error en yt-dlp:', stderr || error.message);
                reject(new Error(error.message));
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

// 1. ENDPOINT DE INICIO: Comienza la descarga en el servidor
app.get('/descargar-cancion/:videoId', async (req, res) => {
    const videoId = req.params.videoId;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    try {
        const title = await runYtDlp(`--get-title ${videoUrl}`);
        const safeName = title
            .replace(/[<>:"/\\|?*]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 50);
        
        const nombreArchivo = `${safeName}.mp4`;
        const outputFile = path.join(descargasDir, nombreArchivo);
        
        // Respuesta rápida al frontend de React Native
        res.json({
            success: true,
            titulo: title,
            archivo: nombreArchivo,
            urlDescarga: `https://${req.get('host')}/obtener-archivo/${encodeURIComponent(nombreArchivo)}`
        });
        
        // Comando de descarga optimizado para evitar Bloqueos (403)
        const comandoDescarga = `python3 -m yt_dlp --js-runtime node --extractor-args "youtube:player-client=android,web" -f "ba[ext=m4a]/best[height<=360]" -o "${outputFile}" ${videoUrl}`;
        
        console.log(`⬇ Iniciando descarga de: ${title}`);
        
        exec(comandoDescarga, (error) => {
            if (error) {
                console.error(`❌ Falló la descarga de ${title}:`, error.message);
            } else {
                console.log(`✅ Archivo listo en servidor: ${nombreArchivo}`);

                // --- SISTEMA DE AUTOLIMPIEZA ---
                // Borra el archivo después de 15 minutos para que el disco no se llene
                setTimeout(() => {
                    if (fs.existsSync(outputFile)) {
                        fs.unlink(outputFile, (err) => {
                            if (err) console.error(`Error al limpiar: ${err}`);
                            else console.log(`🗑️ Archivo temporal eliminado: ${nombreArchivo}`);
                        });
                    }
                }, 900000); // 15 minutos (900,000 ms)
            }
        });
        
    } catch (error) {
        console.error('❌ Error General:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. ENDPOINT DE VERIFICACIÓN: Tu App llama aquí cada 3 segundos (Polling)
app.get('/verificar-archivo/:videoId', async (req, res) => {
    const videoId = req.params.videoId;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    try {
        const title = await runYtDlp(`--get-title ${videoUrl}`);
        const safeName = title.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_').substring(0, 50);
        const nombreArchivo = `${safeName}.mp4`;
        const archivoPath = path.join(descargasDir, nombreArchivo);

        const existe = fs.existsSync(archivoPath);
        
        res.json({
            success: true,
            existe: existe, // Si esto es true, la App de React Native descarga el archivo
            titulo: title,
            urlDescarga: existe ? `https://${req.get('host')}/obtener-archivo/${encodeURIComponent(nombreArchivo)}` : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. ENDPOINT DE ENTREGA: Envía el archivo al celular
app.get('/obtener-archivo/:nombre', (req, res) => {
    const nombre = decodeURIComponent(req.params.nombre);
    const archivoPath = path.join(descargasDir, nombre);
    
    if (fs.existsSync(archivoPath)) {
        console.log(`📤 Enviando archivo a dispositivo: ${nombre}`);
        res.download(archivoPath);
    } else {
        res.status(404).json({ error: 'El archivo ya no está disponible o se está procesando.' });
    }
});

// PUERTO PARA RAILWAY
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 SERVIDOR ONLINE`);
    console.log(`📍 Puerto: ${PORT}`);
    console.log(`🗑️ Autolimpieza configurada: 15 minutos`);
});