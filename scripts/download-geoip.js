const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/**
 * Script para download automático do banco de dados GeoLite2
 * Executa durante o build process no Render.com
 */

// URLs alternativos para o banco GeoIP (mais confiáveis)
const GEOIP_URLS = [
    'https://raw.githubusercontent.com/wp-statistics/GeoLite2-City/master/GeoLite2-City.mmdb',
    'https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-City.mmdb',
    'https://github.com/wp-statistics/GeoLite2-City/raw/master/GeoLite2-City.mmdb'
];
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

        // Tentar cada URL até conseguir um download válido
        for (let i = 0; i < GEOIP_URLS.length; i++) {
            const url = GEOIP_URLS[i];
            console.log(`🔄 Tentando download do GeoIP (${i + 1}/${GEOIP_URLS.length}): ${url}`);
            
            try {
                await downloadFromUrl(url);
                
                // Validar arquivo baixado
                if (await validateGeoIPFile()) {
                    console.log('✅ Download e validação do GeoIP concluídos com sucesso!');
                    console.log(`📍 Arquivo salvo em: ${GEOIP_FILE}`);
                    return;
                } else {
                    console.log('❌ Arquivo inválido, tentando próxima URL...');
                    if (fs.existsSync(GEOIP_FILE)) {
                        fs.unlinkSync(GEOIP_FILE);
                    }
                }
            } catch (error) {
                console.log(`❌ Falha no download: ${error.message}`);
                if (fs.existsSync(GEOIP_FILE)) {
                    fs.unlinkSync(GEOIP_FILE);
                }
            }
        }
        
        throw new Error('Todos os URLs de GeoIP falharam');

    } catch (error) {
        console.warn('⚠️  Erro no download do GeoIP (não crítico):', error.message);
        console.log('📝 Sistema continuará funcionando sem GeoIP');
    }
}

// Função para fazer download de uma URL específica
function downloadFromUrl(url) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(GEOIP_FILE);
        
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Status ${response.statusCode}`));
                return;
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            if (fs.existsSync(GEOIP_FILE)) {
                fs.unlinkSync(GEOIP_FILE);
            }
            reject(err);
        });
    });
}

// Função para validar se o arquivo GeoIP é válido
async function validateGeoIPFile() {
    try {
        if (!fs.existsSync(GEOIP_FILE)) {
            return false;
        }
        
        const stats = fs.statSync(GEOIP_FILE);
        
        // Verificar se arquivo tem tamanho mínimo (arquivo muito pequeno é suspeito)
        if (stats.size < 1024 * 1024) { // Menor que 1MB
            console.log(`❌ Arquivo muito pequeno: ${stats.size} bytes`);
            return false;
        }
        
        // Verificar se arquivo começa com header MMDB válido
        const fd = fs.openSync(GEOIP_FILE, 'r');
        const buffer = Buffer.alloc(16);
        fs.readSync(fd, buffer, 0, 16, 0);
        fs.closeSync(fd);
        
        // Verificar magic number do arquivo MMDB
        const magic = buffer.slice(0, 4).toString('hex');
        if (magic === '00000000' || magic === 'ffffffff') {
            console.log(`❌ Magic number inválido: ${magic}`);
            return false;
        }
        
        console.log(`✅ Arquivo válido: ${stats.size} bytes, magic: ${magic}`);
        return true;
        
    } catch (error) {
        console.log(`❌ Erro na validação: ${error.message}`);
        return false;
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    downloadGeoIP()
        .then(() => process.exit(0))
        .catch(() => process.exit(0)); // Não falhar o build se GeoIP falhar
}

module.exports = { downloadGeoIP }; 