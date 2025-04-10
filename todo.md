# Projeto de Rastreamento para Meta (Facebook Pixel e API de Conversões)

_Status Atual: Implementação robusta com melhores práticas para CAPI e identificação de usuários._

## Tarefas Concluídas

- [x] Confirmar requisitos iniciais com o usuário
- [x] Configurar estrutura do projeto Node.js/TypeScript
- [x] Configurar Prisma com Neon.tech (PostgreSQL)
- [x] Implementar script frontend (`meta-pixel-script.js`)
  - [x] Carregamento do `fbevents.js`
  - [x] Geração e gerenciamento de **ID de Visitante First-Party** (cookie `_mtVisitorId`)
  - [x] Coleta de dados (`fbp`, `fbc`, UA, geo, etc.)
  - [x] Envio de dados para o backend (`/track`)
  - [x] Envio manual de eventos do Pixel (via imagem `facebook.com/tr/...`)
  - [x] Uso do `eventId` do backend para **deduplicação Pixel/CAPI**
- [x] Implementar backend
  - [x] Servidor Express com rotas (`/track`, `/meta-pixel-script.js`)
  - [x] Sistema de filas assíncrono (BullMQ/Redis)
  - [x] Logging estruturado (Winston)
  - [x] Integração GeoIP (MaxMind GeoLite2)
  - [x] Persistência de eventos e dados de usuário (Prisma/PostgreSQL)
  - [x] Serviço CAPI (`metaService.ts`)
    - [x] Normalização de dados (`eventUtils.ts`)
    - [x] **Hashing correto de `user_data`** (PII e Geo) conforme documentação Meta
    - [x] Uso correto de **`external_id`** (prioriza hash(userId), depois hash(visitorId))
    - [x] Envio para API de Conversões (v19.0)
- [x] Migrar para TypeScript
- [x] Modularizar código
- [x] Tratar IPs (conversão IPv6, extração correta)
- [x] Implementar testes básicos
- [x] Preparar instruções de implantação no Render
- [x] Atualizar README.md com novas funcionalidades

## Tarefas Futuras Prioritárias

- [ ] **Consentimento de Cookies/Privacidade:** Implementar banner/mecanismo de consentimento no frontend (`meta-pixel-script.js` ou via CMP) para conformidade com LGPD/GDPR. A criação de cookies e o rastreamento devem respeitar a escolha do usuário.
- [ ] **Melhorar Testes:**
  - [ ] Expandir testes unitários (Jest) para cobrir mais funções utilitárias e serviços.
  - [ ] Criar testes de integração (ex: Supertest) para validar o fluxo completo (API -> Fila -> CAPI).
- [ ] **Validação de Dados:** Adicionar validação robusta para os payloads recebidos em `/track` (ex: usando Zod).

## Tarefas Futuras (Melhorias e Novas Funcionalidades)

- [ ] **Otimização CAPI:**
  - [ ] Adicionar suporte para envio em batch de eventos para a CAPI.
  - [ ] Implementar lógica de retry mais sofisticada na fila para erros específicos da API.
- [ ] **Enriquecimento de Dados:**
  - [ ] Integrar com dados de e-commerce do Shopify para enriquecer `custom_data` (contents, value, order_id, etc.) nos eventos relevantes.
  - [ ] Coletar e enviar PII adicional (nome, email, etc.) quando disponível e com consentimento.
- [ ] **Monitoramento e Métricas:**
  - [ ] Implementar métricas de desempenho e saúde do serviço (ex: Prometheus/Grafana).
  - [ ] Criar dashboard para visualizar status das filas, taxas de erro, etc.
- [ ] **Documentação:** Adicionar documentação da API (ex: Swagger/OpenAPI) para o endpoint `/track`.
- [ ] **Desempenho:**
  - [ ] Avaliar e implementar estratégias de cache (ex: Redis para dados de usuário ou GeoIP).
  - [ ] Otimizar consultas ao banco de dados se necessário.
- [ ] **Administração:** Criar interface administrativa simples para visualização/gerenciamento básico de eventos ou configurações.
- [ ] **CI/CD:** Configurar pipeline de Integração Contínua e Deploy Contínuo para testes e deploys automatizados.
- [ ] **Escalabilidade:** Otimizar configurações do banco de dados e da fila para maior volume.
