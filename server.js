const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Directorio de descargas dinámico
const descargasDir = path.join(__dirname, 'musica_app');

if (!fs.existsSync(descargasDir)) {
    fs.mkdirSync(descargasDir, { recursive: true });
    console.log(`📁 Carpeta de descargas lista en: ${descargasDir}`);
}

// Función base corregida para Railway usando el binario directo
function runYtDlp(args) {
    return new Promise((resolve, reject) => {
        // Probamos con la ruta donde pip instala los ejecutables en Railway
        // Si no está ahí, el sistema intentará usar el comando global
        const ytDlpPath = '/usr/local/bin/yt-dlp'; 
        const command = `${ytDlpPath} ${args} --js-runtime node --no-playlist`;
        
        console.log(`▶ Ejecutando: ${command}`);
        
        exec(command, { timeout: 180000 }, (error, stdout, stderr) => {
            if (error) {
                // Si falla la ruta absoluta, intentamos con el comando simple por si acaso
                console.log("Reintentando con comando simple...");
                exec(`yt-dlp ${args} --js-runtime node --no-playlist`, (error2, stdout2, stderr2) => {
                    if (error2) {
                        console.error('❌ Error final en yt-dlp:', stderr2 || error2.message);
                        reject(new Error(error2.message));
                    } else {
                        resolve(stdout2.trim());
                    }
                });
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

// Función para limpiar nombres (maneja eñes, acentos y quita caracteres prohibidos)
function limpiarNombreArchivo(texto) {
    return texto
        .normalize("NFD") // Descompone caracteres (ej: 'ñ' -> 'n' + '~')
        .replace(/[\u0300-\u036f]/g, "") // Quita los acentos/tildes
        .replace(/[<>:"/\\|?*]/g, '') // Quita caracteres prohibidos en archivos
        .replace(/\s+/g, '_') // Cambia espacios por guiones bajos
        .substring(0, 60); // Limita la longitud
}

// 1. ENDPOINT DE INICIO
app.get('/descargar-cancion/:videoId', async (req, res) => {
    const videoId = req.params.videoId;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    try {
        const title = await runYtDlp(`--get-title ${videoUrl}`);
        // Limpiamos el nombre de forma segura para el sistema de archivos
        const safeName = limpiarNombreArchivo(title);
        const nombreArchivo = `${safeName}.mp4`;
        const outputFile = path.join(descargasDir, nombreArchivo);
        
        res.json({
            success: true,
            titulo: title,
            archivo: nombreArchivo,
            urlDescarga: `https://${req.get('host')}/obtener-archivo/${encodeURIComponent(nombreArchivo)}`
        });
        
        // CAMBIO CLAVE: Comando de descarga usando 'yt-dlp' directamente
        const comandoDescarga = `yt-dlp --js-runtime node --extractor-args "youtube:player-client=android,web" -f "ba[ext=m4a]/best[height<=360]" -o "${outputFile}" ${videoUrl}`;
        
        console.log(`⬇ Iniciando descarga de: ${title}`);
        
        exec(comandoDescarga, (error) => {
            if (error) {
                console.error(`❌ Falló la descarga de ${title}:`, error.message);
            } else {
                console.log(`✅ Archivo listo: ${nombreArchivo}`);

                setTimeout(() => {
                    if (fs.existsSync(outputFile)) {
                        fs.unlink(outputFile, (err) => {
                            if (err) console.error(`Error al limpiar: ${err}`);
                            else console.log(`🗑️ Archivo temporal eliminado: ${nombreArchivo}`);
                        });
                    }
                }, 900000); // 15 min
            }
        });
        
    } catch (error) {
        console.error('❌ Error General:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. ENDPOINT DE VERIFICACIÓN
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

// 3. ENDPOINT DE ENTREGA
app.get('/obtener-archivo/:nombre', (req, res) => {
    const nombre = decodeURIComponent(req.params.nombre);
    const archivoPath = path.join(descargasDir, nombre);
    
    if (fs.existsSync(archivoPath)) {
        console.log(`📤 Enviando archivo: ${nombre}`);
        res.download(archivoPath);
    } else {
        res.status(404).json({ error: 'Archivo no encontrado' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 SERVIDOR ONLINE CORREGIDO`);
    console.log(`📍 Puerto: ${PORT}`);
});

