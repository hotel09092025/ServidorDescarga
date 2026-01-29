const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURACIÓN DE RUTAS ---
// Definimos la ruta de yt-dlp una sola vez para evitar errores de "not found"
const YT_DLP_PATH = '/usr/local/bin/yt-dlp';
const descargasDir = path.join(__dirname, 'musica_app');

if (!fs.existsSync(descargasDir)) {
    fs.mkdirSync(descargasDir, { recursive: true });
    console.log(`📁 Carpeta de descargas lista en: ${descargasDir}`);
}

/**
 * Función para limpiar nombres de archivos.
 * Maneja tildes, eñes y quita caracteres especiales para que Linux no falle.
 */
function limpiarNombreArchivo(texto) {
    return texto
        .normalize("NFD")               // Descompone acentos y eñes
        .replace(/[\u0300-\u036f]/g, "") // Elimina los acentos
        .replace(/[<>:"/\\|?*]/g, '')    // Quita caracteres prohibidos en sistemas de archivos
        .replace(/\s+/g, '_')            // Cambia espacios por guiones bajos
        .substring(0, 60);               // Limita longitud para evitar errores de ruta
}

/**
 * Función base para ejecutar comandos de yt-dlp
 */
function runYtDlp(args) {
    return new Promise((resolve, reject) => {
        const command = `${YT_DLP_PATH} ${args} --js-runtime node --no-playlist`;
        
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

// 1. ENDPOINT DE INICIO: Inicia el proceso de descarga
app.get('/descargar-cancion/:videoId', async (req, res) => {
    const videoId = req.params.videoId;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    try {
        // Obtenemos el título real del video
        const title = await runYtDlp(`--get-title ${videoUrl}`);
        const safeName = limpiarNombreArchivo(title);
        const nombreArchivo = `${safeName}.mp4`;
        const outputFile = path.join(descargasDir, nombreArchivo);
        
        // Respondemos de inmediato al celular con el nombre que tendrá el archivo
        res.json({
            success: true,
            titulo: title,
            archivo: nombreArchivo,
            urlDescarga: `https://${req.get('host')}/obtener-archivo/${encodeURIComponent(nombreArchivo)}`
        });
        
        // COMANDO DE DESCARGA: Ahora usa la ruta completa YT_DLP_PATH
        const comandoDescarga = `${YT_DLP_PATH} --js-runtime node --extractor-args "youtube:player-client=ios,web,tv" -f "ba[ext=m4a]/bestaudio/best" --no-check-certificate --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36" -o "${outputFile}" ${videoUrl}`;
        console.log(`⬇ Iniciando descarga de: ${title}`);
        
        exec(comandoDescarga, (error) => {
            if (error) {
                console.error(`❌ Falló la descarga de ${title}:`, error.message);
            } else {
                console.log(`✅ Archivo listo en servidor: ${nombreArchivo}`);

                // Autolimpieza: Borra el archivo en 15 minutos
                setTimeout(() => {
                    if (fs.existsSync(outputFile)) {
                        fs.unlink(outputFile, (err) => {
                            if (err) console.error(`Error al limpiar: ${err}`);
                            else console.log(`🗑️ Archivo temporal eliminado: ${nombreArchivo}`);
                        });
                    }
                }, 900000); 
            }
        });
        
    } catch (error) {
        console.error('❌ Error General:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. ENDPOINT DE VERIFICACIÓN: El celular pregunta si el archivo ya bajó
app.get('/verificar-archivo/:videoId', async (req, res) => {
    const videoId = req.params.videoId;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    try {
        const title = await runYtDlp(`--get-title ${videoUrl}`);
        const safeName = limpiarNombreArchivo(title);
        const nombreArchivo = `${safeName}.mp4`;
        const archivoPath = path.join(descargasDir, nombreArchivo);

        const existe = fs.existsSync(archivoPath);
        
        res.json({
            success: true,
            existe: existe,
            titulo: title,
            urlDescarga: existe ? `https://${req.get('host')}/obtener-archivo/${encodeURIComponent(nombreArchivo)}` : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. ENDPOINT DE ENTREGA: Descarga real del archivo al celular
app.get('/obtener-archivo/:nombre', (req, res) => {
    const nombre = decodeURIComponent(req.params.nombre);
    const archivoPath = path.join(descargasDir, nombre);
    
    if (fs.existsSync(archivoPath)) {
        console.log(`📤 Enviando archivo a dispositivo: ${nombre}`);
        res.download(archivoPath);
    } else {
        res.status(404).json({ error: 'El archivo ya no está disponible.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 SERVIDOR ONLINE CORREGIDO`);
    console.log(`📍 Puerto: ${PORT}`);
    console.log(`📂 Ruta yt-dlp: ${YT_DLP_PATH}`);
});

