const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/**
 * Script para download automático do banco de dados GeoLite2
 * Executa durante o build process no Render.com
 */

const GEOIP_URL = 'https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-City.mmdb';
const DATA_DIR = path.join(__dirname, '..', 'data');
const GEOIP_FILE = path.join(DATA_DIR, 'GeoLite2-City.mmdb');

async function downloadGeoIP() {
    try {
        console.log('🌍 Iniciando download do banco GeoIP...');
        
        // Criar diretório data se não existir
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
            console.log('📁 Diretório data/ criado');
        }

        // Verificar se arquivo já existe
        if (fs.existsSync(GEOIP_FILE)) {
            console.log('✅ Arquivo GeoIP já existe, pulando download');
            return;
        }

        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(GEOIP_FILE);
            
            https.get(GEOIP_URL, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Falha no download: ${response.statusCode}`));
                    return;
                }

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    console.log('✅ Download do GeoIP concluído com sucesso!');
                    console.log(`📍 Arquivo salvo em: ${GEOIP_FILE}`);
                    resolve();
                });
            }).on('error', (err) => {
                fs.unlink(GEOIP_FILE, () => {}); // Remover arquivo parcial
                reject(err);
            });
        });

    } catch (error) {
        console.warn('⚠️  Erro no download do GeoIP (não crítico):', error.message);
        console.log('📝 Sistema continuará funcionando sem GeoIP');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    downloadGeoIP()
        .then(() => process.exit(0))
        .catch(() => process.exit(0)); // Não falhar o build se GeoIP falhar
}

module.exports = { downloadGeoIP }; 