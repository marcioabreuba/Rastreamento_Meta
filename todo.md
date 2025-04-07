# Projeto de Rastreamento para Meta (Facebook Pixel e Conversions API)

## Tarefas Concluídas

- [x] Confirmar requisitos com o usuário
- [x] Configurar estrutura do projeto
  - [x] Criar diretório do projeto
  - [x] Inicializar projeto Node.js
  - [x] Instalar dependências necessárias
  - [x] Configurar Prisma com Neon.tech
  - [x] Criar arquivo principal da aplicação
- [x] Implementar integração com Facebook Pixel
- [x] Implementar integração com Conversions API
- [x] Criar funções de rastreamento de eventos
- [x] Implementar integração com Shopify
- [x] Gerar cliente Prisma
- [x] Testar implementação
- [x] Preparar instruções de implantação no Render
- [x] Migrar para TypeScript
  - [x] Configurar TypeScript
  - [x] Criar definições de tipos
  - [x] Refatorar código JavaScript para TypeScript
- [x] Modularizar o código
  - [x] Criar estrutura de diretórios
  - [x] Separar responsabilidades
  - [x] Implementar controle centralizado de configurações
- [x] Implementar sistema de filas com Bull
  - [x] Configurar processamento assíncrono
  - [x] Implementar retry em caso de falhas
  - [x] Adicionar monitoramento de jobs
- [x] Adicionar logging estruturado com Winston
  - [x] Configurar níveis de log
  - [x] Implementar logging em arquivos
  - [x] Criar middleware para logging de requisições HTTP
- [x] Adicionar suporte a geolocalização com MaxMind GeoIP
  - [x] Criar script para download da base de dados
  - [x] Implementar função para obter dados de geolocalização
  - [x] Adicionar informações de geolocalização aos eventos
- [x] Otimizar para compatibilidade com Facebook
  - [x] Configurar sistema para usar apenas IPv4
  - [x] Implementar conversão automática de IPv6 para IPv4
  - [x] Adicionar tratamento de exceções para IPs inválidos
- [x] Implementar testes básicos
  - [x] Testes para validar geolocalização
  - [x] Testes para validar endpoints da API
  - [x] Testes para validar sistema de filas

## Tarefas Futuras

- [ ] Melhorar testes
  - [ ] Expandir testes unitários com Jest
  - [ ] Criar testes de integração mais abrangentes
  - [ ] Configurar CI/CD para testes automatizados
- [ ] Adicionar validação de dados com Zod ou Joi
- [ ] Implementar métricas com Prometheus
- [ ] Criar dashboard de monitoramento
- [ ] Adicionar documentação da API com Swagger
- [ ] Implementar cache para melhorar desempenho
- [ ] Adicionar suporte para mais eventos do Facebook
- [ ] Implementar sistema de análise de dados para métricas de eventos
- [ ] Criar interface administrativa para visualização de eventos
- [ ] Adicionar suporte para envio em batch para a API do Facebook
- [ ] Otimizar banco de dados para escala
