# Meta Tracking Server

Sistema de rastreamento e integração com Meta Pixel e Conversions API.

## Visão Geral

Este serviço atua como intermediário entre seus sites/aplicativos e as APIs do Meta (Facebook), permitindo:
- Rastreamento de eventos para o Meta Pixel
- Envio de eventos para a Conversions API
- Armazenamento e processamento assíncrono de eventos
- Enriquecimento de dados com informações geográficas (GeoIP)

## Recursos Principais

- 🔄 Processamento assíncrono de eventos com filas
- 🌍 Integração com MaxMind GeoIP para dados geográficos
- 📊 Mapeamento automático de eventos personalizados para eventos padrão do Meta
- 💾 Persistência de eventos em banco de dados PostgreSQL
- 🔍 Logs detalhados para depuração e monitoramento

## Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Servidor
PORT=3001
NODE_ENV=development

# Banco de Dados
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Meta (Facebook)
FB_PIXEL_ID=seu_pixel_id
FB_ACCESS_TOKEN=seu_access_token
FB_TEST_EVENT_CODE=seu_test_event_code
FB_API_URL=https://graph.facebook.com/v16.0

# GeoIP
MAXMIND_ACCOUNT_ID=seu_maxmind_id
MAXMIND_LICENSE_KEY=sua_licença_maxmind

# Redis (para filas)
REDIS_HOST=seu_redis_host
REDIS_PORT=seu_redis_port
REDIS_PASSWORD=sua_senha_redis
REDIS_USERNAME=seu_usuario_redis
```

### Instalação

```bash
# Instalar dependências
npm install

# Gerar cliente Prisma
npx prisma generate

# Fazer migrações do banco
npx prisma migrate dev

# Baixar banco de dados GeoIP
node dist/scripts/download-geoip.js

# Construir o projeto
npm run build
```

### Execução

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

### Deploy no Render

Para fazer deploy deste serviço no [Render](https://render.com), siga estas etapas:

1. **Crie uma conta** no Render e configure um novo Web Service
2. **Conecte seu repositório** GitHub ao Render
3. **Configure as variáveis de ambiente** no dashboard do Render:
   - Todas as variáveis do arquivo `.env` devem ser adicionadas
   - Adicione `PORT=10000` ou use a porta fornecida pelo Render
4. **Configure o comando de build**:
   ```
   npm install && npm run build && npx prisma generate --schema=./prisma/schema.prisma && node dist/scripts/download-geoip.js
   ```
5. **Configure o comando de inicialização**:
   ```
   npm start
   ```

#### Resolvendo Problemas com Prisma e Neon PostgreSQL

Se você estiver usando o [Neon](https://neon.tech) como banco de dados PostgreSQL, pode enfrentar problemas com o Prisma tentando adquirir advisory locks durante migrações. Para resolver:

1. **Desabilite advisory locks** adicionando a variável de ambiente:
   ```
   PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true
   ```

2. **Modifique a URL de conexão** do banco de dados para usar o pooler do Neon:
   ```
   DATABASE_URL=postgresql://user:password@endpoint-pooler.neon.tech:5432/neondb?pgbouncer=true
   ```

3. **Desative o comando pre-deploy** que executa migrações no Render
   - Remova `npm run migrate:deploy` do campo "pre-deploy command"
   - Execute manualmente a migração quando necessário

Se continuar tendo problemas com timeout na conexão, aumente o tempo limite no Prisma:
```
DATABASE_URL=postgresql://user:password@endpoint.neon.tech:5432/neondb?connect_timeout=30
```

## Solução de Problemas

### Erros 400 Bad Request na API de Conversões

Se você estiver recebendo erros 400 Bad Request ao enviar eventos para a API de Conversões do Meta, verifique:

1. **Token de Acesso**: 
   - O token deve ter permissões para usar a Conversions API
   - Gere um novo token no Business Manager > Configurações de Negócios > Tokens de Sistema

2. **Payload Mínimo**: 
   - Tente simplificar o payload para conter apenas campos essenciais:
     - event_name (nome do evento)
     - event_id (ID único do evento)
     - event_time (timestamp em segundos)
     - action_source (geralmente "website")
     - user_data (pelo menos client_ip_address, client_user_agent e external_id)
     - custom_data (pelo menos currency e value)

3. **Test Event Code**:
   - Use o código de teste do Meta Pixel para depuração
   - Ele aparece no Business Manager > Eventos > Teste de Eventos > Configure Testes

### Falta de Eventos no Business Manager

Se os eventos não aparecerem no Business Manager:

1. **Navegue até**: Business Manager > Pixel > Eventos de Teste
2. **Verifique se** o modo de teste está ativado
3. **Confirme que** o ID do pixel está correto em suas configurações
4. **Certifique-se** de que os eventos enviados são suportados pelo Meta

## Arquitetura

```
src/
  ├── config/       - Configurações da aplicação
  ├── controllers/  - Controladores de requisições
  ├── middleware/   - Middlewares Express
  ├── public/       - Arquivos estáticos (scripts para clientes)
  ├── routes/       - Rotas da API
  ├── scripts/      - Scripts utilitários
  ├── services/     - Serviços principais da aplicação
  ├── types/        - Definições de tipos TypeScript
  ├── utils/        - Funções utilitárias
  ├── app.ts        - Configuração do servidor Express
  └── index.ts      - Ponto de entrada da aplicação
```

## Eventos Suportados

### Eventos Padrão do Meta
- PageView
- ViewContent
- AddToCart
- InitiateCheckout
- Purchase
- Lead
- Search
- AddToWishlist

### Eventos Personalizados
- Scroll_25, Scroll_50, Scroll_75, Scroll_90
- Timer_1min
- ViewVideo_25, ViewVideo_50, ViewVideo_75, ViewVideo_90
- PlayVideo

## Contribuindo

1. Clone o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/amazing-feature`)
3. Faça commit das suas mudanças (`git commit -m 'Add some amazing feature'`)
4. Faça push para a branch (`git push origin feature/amazing-feature`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo LICENSE para detalhes.
