# Meta Tracking Server

Sistema robusto de rastreamento e integração com Meta Pixel e API de Conversões (CAPI).

## Visão Geral

Este serviço atua como intermediário entre seus sites/aplicativos e as APIs do Meta (Facebook), implementando melhores práticas para maximizar a qualidade dos dados e a correspondência de eventos:

- **Rastreamento Híbrido:** Combina o Meta Pixel (frontend) e a API de Conversões (backend).
- **Identificação Avançada:** Utiliza um **ID de Visitante First-Party** persistente (via cookie primário) para identificar usuários anônimos de forma estável e duradoura.
- **Deduplicação Robusta:** Garante que eventos do Pixel e da CAPI sejam corretamente deduplicados usando um **`event_id` consistente** entre ambos os canais.
- **Processamento Confiável:** Armazena e processa eventos de forma assíncrona usando filas, garantindo que nenhum evento seja perdido.
- **Enriquecimento de Dados:** Integra-se com MaxMind GeoIP para adicionar dados geográficos aos eventos.
- **Conformidade:** Implementa hashing SHA256 correto para todos os parâmetros de identificação do usuário (PII e geográficos) enviados via CAPI, conforme a documentação oficial da Meta.

## Recursos Principais

- 🆔 **ID de Visitante First-Party:** Melhor identificação e rastreamento de longo prazo de usuários anônimos.
- ✨ **Deduplicação Precisa:** Uso de `event_id` consistente entre Pixel e CAPI.
- 🔐 **Hashing CAPI Correto:** Conformidade com os requisitos de hashing da Meta para `user_data`, incluindo PII e dados geográficos.
- 🔄 Processamento assíncrono de eventos com filas (BullMQ).
- 🌍 Integração com MaxMind GeoIP para dados geográficos (via download local do DB).
- 📊 Mapeamento automático de eventos personalizados para eventos padrão do Meta.
- 💾 Persistência de eventos em banco de dados PostgreSQL (via Prisma).
- 🔍 Logs detalhados para depuração e monitoramento (Winston).
- ⚙️ Configuração flexível via variáveis de ambiente.

## Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Servidor
PORT=3001 # Porta local; no Render, geralmente 10000
NODE_ENV=development # ou production

# Banco de Dados (Exemplo PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Meta (Facebook)
FB_PIXEL_ID=seu_pixel_id
FB_ACCESS_TOKEN=seu_access_token_da_capi # Gerado no Gerenciador de Negócios
FB_TEST_EVENT_CODE=seu_test_event_code # Opcional, para testes
# FB_API_URL=https://graph.facebook.com/v19.0 # Opcional, padrão é v19.0 no código

# GeoIP (MaxMind - necessário para download automático)
MAXMIND_ACCOUNT_ID=seu_maxmind_account_id
MAXMIND_LICENSE_KEY=sua_licença_maxmind_key

# Redis (para filas - BullMQ)
REDIS_HOST=seu_redis_host
REDIS_PORT=6379 # Porta padrão Redis
REDIS_PASSWORD=sua_senha_redis # Opcional
REDIS_USERNAME=seu_usuario_redis # Opcional
```

### Instalação e Build

```bash
# Instalar dependências
npm install

# Gerar cliente Prisma
npx prisma generate

# (Opcional local) Fazer migrações do banco de dados
npx prisma migrate dev

# Construir o projeto (Compilar TypeScript para JavaScript)
npm run build

# Baixar banco de dados GeoIP (Executar após o build)
# Certifique-se que as variáveis MAXMIND estão no .env ou ambiente
node dist/scripts/download-geoip.js
```

### Execução

```bash
# Desenvolvimento (usa ts-node, compilação não necessária)
npm run dev

# Produção (executa a partir do build em /dist)
npm start
```

## Integração com o Site (Frontend)

Este serviço fornece um script JavaScript para ser incluído nas páginas do seu site (ex: Shopify).

1.  **Inclua o Script:** Adicione a seguinte linha ao `<head>` do seu tema ou site:
    ```html
    <script src="URL_DO_SEU_SERVICO/meta-pixel-script.js" async defer></script>
    ```
    Substitua `URL_DO_SEU_SERVICO` pela URL onde seu backend está hospedado (ex: `https://meu-tracking.onrender.com`).

2.  **Funcionamento do Script (`meta-pixel-script.js`):**
    *   **Carrega `fbevents.js`:** A biblioteca base do Pixel da Meta.
    *   **Cria/Gerencia Cookie First-Party (`_mtVisitorId`):** Gera um UUID único para identificar o navegador do visitante anonimamente, com duração de 2 anos.
    *   **Coleta Dados:** Reúne `fbp`, `fbc` (se disponíveis), dados do navegador (UA, idioma), referrer e o `_mtVisitorId`.
    *   **Envia para Backend (`/track`):** Envia os dados coletados e informações do evento (nome, dados customizados) para o endpoint `/track` do seu serviço backend.
    *   **Recebe `eventId`:** Obtém o `eventId` único gerado pelo backend na resposta do `/track`.
    *   **Dispara Pixel Manualmente:** Constrói a URL do Pixel (`facebook.com/tr/...`) incluindo:
        *   Parâmetros básicos do evento (`id`, `ev`, `dl`, etc.).
        *   O `eventId` recebido do backend (parâmetro `eid`) para deduplicação.
        *   Dados `user_data` hasheados (`ud[...]`), usando o hash do `_mtVisitorId` como `external_id`.
        *   Dados `custom_data` (`cd[...]`).
    *   Envia o evento do Pixel carregando uma imagem com essa URL. *(Nota: Não usa `fbq('track', ...)` diretamente)*.

## Deploy no Render

Para fazer deploy deste serviço no [Render](https://render.com), siga estas etapas:

1.  **Crie uma conta** no Render e configure um novo Web Service.
2.  **Conecte seu repositório** GitHub ao Render.
3.  **Configure as variáveis de ambiente** no dashboard do Render (todas as do `.env`). Defina `NODE_ENV=production`.
4.  **Configure o comando de build**:
    ```
    npm install && npm run build && npx prisma generate --schema=./prisma/schema.prisma && node dist/scripts/download-geoip.js
    ```
5.  **Configure o comando de inicialização**:
    ```
    npm start
    ```
6.  **(Opcional - Banco de Dados Render/Neon):** Se usar DB do Render ou Neon:
    *   Certifique-se que a `DATABASE_URL` está correta.
    *   Pode ser necessário configurar o comando **Pre-deploy** para migrações:
      ```
      npm run migrate:deploy
      ```
    *   Consulte a documentação do Render/Neon/Prisma para configurações específicas de pooler ou advisory locks se encontrar problemas de conexão/migração.

## Solução de Problemas

- **Logs:** Verifique os logs do serviço no Render (ou localmente) para erros detalhados.
- **Variáveis de Ambiente:** Confirme que todas as variáveis (`FB_PIXEL_ID`, `FB_ACCESS_TOKEN`, `DATABASE_URL`, etc.) estão corretamente configuradas no ambiente de deploy.
- **Build:** Verifique se o comando de build está sendo executado completamente, incluindo a geração do Prisma e o download do GeoIP.
- **Permissões do Token CAPI:** Garanta que o `FB_ACCESS_TOKEN` tem as permissões necessárias para a API de Conversões.
- **Teste de Eventos:** Use a ferramenta de Teste de Eventos no Gerenciador de Eventos do Facebook para verificar se os eventos CAPI estão chegando e sendo processados (pode levar alguns minutos). Use o código de teste (`FB_TEST_EVENT_CODE`) se necessário.

## Arquitetura

```
src/
  ├── config/       - Configurações da aplicação (lê .env)
  ├── controllers/  - Controladores de requisições HTTP (rotas)
  ├── middleware/   - Middlewares Express (ex: logger)
  ├── public/       - Arquivos estáticos servidos ao cliente (ex: meta-pixel-script.js)
  ├── routes/       - Definição das rotas da API
  ├── scripts/      - Scripts utilitários (ex: download GeoIP)
  ├── services/     - Lógica de negócio principal (eventos, CAPI, filas, DB)
  ├── types/        - Definições de tipos TypeScript
  ├── utils/        - Funções utilitárias (hash, geoip, normalização)
  ├── app.ts        - Configuração do servidor Express
  └── index.ts      - Ponto de entrada da aplicação (inicia servidor, filas)
prisma/
  ├── migrations/   - Migrações do banco de dados
  └── schema.prisma - Schema do banco de dados Prisma
```

## Eventos Suportados (Exemplos)

O sistema mapeia nomes de eventos recebidos para eventos padrão do Meta ou os envia como eventos personalizados. Veja `src/utils/eventUtils.ts` para o mapeamento atual.

- **Padrão:** PageView, ViewContent, AddToCart, InitiateCheckout, Purchase, Lead, Search, AddToWishlist.
- **Customizados (Frontend):** Scroll_%, Timer_%, ViewVideo_%, PlayVideo.

## Contribuindo

Pull requests são bem-vindos. Para mudanças maiores, por favor abra uma issue primeiro para discutir o que você gostaria de mudar.

## Licença

MIT
