# Checklist de Implantação

Use este checklist para acompanhar seu progresso durante a implantação do sistema de rastreamento Meta.

## Preparação Inicial

- [ ] Verificar que todos os testes estão passando localmente
- [ ] Confirmar que todas as funcionalidades funcionam como esperado
- [ ] Atualizar documentação conforme necessário
- [ ] Garantir que o `.env.example` está atualizado

## Configuração de Contas

- [ ] Criar/acessar conta no GitHub
- [ ] Criar/acessar conta no Render
- [ ] Criar/acessar conta no Redis Cloud
- [ ] Criar/acessar conta no Neon.tech (PostgreSQL)
- [ ] Criar/acessar conta no MaxMind (GeoIP)
- [ ] Verificar acesso ao Facebook Business

## Configuração de Repositório

- [ ] Criar repositório no GitHub
- [ ] Inicializar Git no projeto local
- [ ] Adicionar `.env` no `.gitignore`
- [ ] Fazer commit inicial
- [ ] Conectar repositório local ao GitHub
- [ ] Enviar código para GitHub

## Configuração de Banco de Dados

- [ ] Criar banco de dados PostgreSQL no Neon.tech
- [ ] Anotar string de conexão
- [ ] Criar banco de dados Redis no Redis Cloud
- [ ] Anotar credenciais (host, porta, senha)

## Configuração de GeoIP

- [ ] Gerar chave de licença no MaxMind
- [ ] Anotar Account ID e License Key

## Implantação no Render

- [ ] Criar novo Web Service no Render
- [ ] Conectar ao repositório GitHub
- [ ] Configurar comando de build e inicialização
- [ ] Adicionar todas as variáveis de ambiente:
  - [ ] NODE_ENV
  - [ ] PORT
  - [ ] DATABASE_URL
  - [ ] REDIS_HOST
  - [ ] REDIS_PORT
  - [ ] REDIS_PASSWORD
  - [ ] REDIS_USERNAME
  - [ ] REDIS_DATABASE_NAME
  - [ ] FB_API_URL
  - [ ] FB_PIXEL_ID
  - [ ] FB_ACCESS_TOKEN
  - [ ] SHOPIFY_DOMAIN
  - [ ] GEOIP_DB_PATH
  - [ ] MAXMIND_ACCOUNT_ID
  - [ ] MAXMIND_LICENSE_KEY
- [ ] Implantar o serviço
- [ ] Executar migrações do banco de dados
- [ ] Verificar logs para garantir que o serviço está funcionando

## Integração com Shopify

- [ ] Acessar loja Shopify
- [ ] Editar o tema atual
- [ ] Adicionar código do Meta Pixel no theme.liquid
- [ ] Adicionar código de integração com o serviço de rastreamento
- [ ] Adicionar rastreamento de eventos específicos:
  - [ ] ViewContent (Página de produto)
  - [ ] AddToCart (Ações de adicionar ao carrinho)
  - [ ] InitiateCheckout (Página de checkout)
  - [ ] Purchase (Página de agradecimento)

## Testes de Verificação

- [ ] Verificar se o serviço está online (endpoint /status)
- [ ] Testar PageView na loja
- [ ] Testar visualização de produto
- [ ] Testar adição ao carrinho
- [ ] Testar início de checkout
- [ ] Testar compra completa
- [ ] Verificar no Facebook Business se os eventos estão sendo recebidos

## Monitoramento

- [ ] Configurar alertas no Render
- [ ] Verificar logs após alguns dias de uso
- [ ] Analisar métricas de desempenho

## Tarefas Periódicas

- [ ] Atualizar banco de dados GeoIP mensalmente
- [ ] Verificar uso de recursos no Redis Cloud
- [ ] Verificar uso de recursos no Neon.tech
- [ ] Verificar logs de erros periodicamente

---

**Lembre-se**: Mantenha este checklist atualizado durante todo o processo de implantação. Marque os itens conforme eles forem concluídos para garantir que nenhuma etapa importante seja esquecida. 