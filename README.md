# Sistema de Rastreamento Meta (Facebook Pixel e Conversions API)

Este projeto implementa um sistema completo de rastreamento para o Meta, utilizando tanto o Facebook Pixel quanto a Conversions API para garantir a máxima qualidade dos eventos rastreados.

## Características

- **Implementação em TypeScript** para maior segurança e manutenibilidade
- Suporte para Facebook Pixel e Conversions API
- **Sistema de filas assíncrono** usando Bull para processamento confiável de eventos
- **Logging estruturado** com Winston para monitoramento e depuração
- Armazenamento de eventos em banco de dados para garantir que nenhum evento seja perdido
- Normalização e validação de dados para garantir a qualidade dos eventos
- Integração fácil com lojas Shopify
- Suporte para todos os eventos padrão do Facebook
- **Otimizado para IPv4** para máxima compatibilidade com Facebook
- Rastreamento de parâmetros avançados para maximizar a qualidade dos eventos
- **Geolocalização com MaxMind GeoIP** para enriquecer os eventos com dados de localização (país, estado, cidade, CEP)

## Estrutura do Projeto

- `src/app.ts`: Arquivo principal da aplicação
- `src/index.ts`: Ponto de entrada da aplicação
- `src/config/index.ts`: Configurações da aplicação
- `src/controllers/`: Controladores para rotas da API
- `src/services/`: Serviços de negócio
- `src/middleware/`: Middlewares Express
- `src/models/`: Modelos de dados
- `src/routes/`: Definições de rotas
- `src/types/`: Definições de tipos TypeScript
- `src/utils/`: Funções utilitárias
- `src/scripts/`: Scripts auxiliares
- `src/tests/`: Testes automatizados
- `prisma/schema.prisma`: Schema do banco de dados
- `data/GeoLite2-City.mmdb`: Banco de dados de geolocalização (baixado pelo script)

## Eventos Suportados

- PageView
- ViewHome
- ViewList
- ViewContent
- AddToCart
- ViewCart
- StartCheckout
- RegisterDone
- ShippingLoaded
- AddPaymentInfo
- Purchase (vários tipos)
- ViewCategory
- AddCoupon
- Search
- E outros eventos personalizados

## Requisitos

- Node.js 16+
- Redis (para o sistema de filas Bull)
- Banco de dados (SQLite para desenvolvimento, PostgreSQL para produção)
- Credenciais do Facebook Pixel e Conversions API
- Conta MaxMind para geolocalização (gratuita para GeoLite2)

## Instalação

1. Clone o repositório
2. Execute `npm install` para instalar as dependências
3. Configure o arquivo `.env` com suas credenciais (Facebook e MaxMind)
4. Execute `npm run download-geoip:ts` para baixar o banco de dados de geolocalização
5. Execute `npx prisma migrate dev` para criar o banco de dados
6. Execute `npm run build` para compilar o código TypeScript
7. Execute `npm start` para iniciar o servidor em produção ou `npm run dev` para desenvolvimento

## Uso

### Rastreamento de Eventos

Para rastrear um evento, envie uma requisição POST para `/track` com os seguintes dados:

```json
{
  "eventName": "PageView",
  "userData": {
    "email": "cliente@exemplo.com",
    "phone": "5511999999999",
    "userId": "123"
  },
  "customData": {
    "contentName": "Página Inicial",
    "sourceUrl": "https://soleterra.com.br/"
  }
}
```

### Obtenção do Código do Pixel

Para obter o código do pixel para inclusão no site, acesse `/pixel-code`.

### Verificação de Status

Para verificar o status do servidor, acesse `/status`.

## Scripts Disponíveis

- `npm run build`: Compila o código TypeScript
- `npm start`: Inicia o servidor em produção
- `npm run dev`: Inicia o servidor em modo de desenvolvimento com hot-reload
- `npm test`: Executa os testes
- `npm run test:api`: Executa apenas os testes de API
- `npm run test:geoip`: Executa apenas os testes de geolocalização
- `npm run download-geoip:ts`: Baixa e extrai o banco de dados GeoIP do MaxMind

## Melhorias Implementadas

1. **Migração para TypeScript**:
   - Adição de tipagem estática para maior segurança e melhor documentação
   - Interfaces e tipos definidos para o domínio do problema

2. **Arquitetura Modular**:
   - Separação de responsabilidades em diretórios específicos
   - Padrão MVC para melhor organização do código

3. **Sistema de Filas**:
   - Implementação do Bull para processamento assíncrono
   - Retry automático para eventos que falham
   - Monitoramento de falhas

4. **Logging Estruturado**:
   - Implementação do Winston para logs consistentes
   - Formato padronizado para facilitar análise
   - Níveis de log para diferentes ambientes

5. **Configuração Centralizada**:
   - Variáveis de ambiente organizadas em um único lugar
   - Valores padrão sensatos para configurações

6. **Compatibilidade com Facebook**:
   - Uso exclusivo de IPv4 para melhor compatibilidade com Facebook
   - Tratamento automático para converter IPv6 para IPv4 quando possível
   - Validação de dados para garantir conformidade com as APIs do Facebook

7. **Testes Automatizados**:
   - Testes para validar o funcionamento da geolocalização
   - Testes das APIs principais do sistema
   - Possibilidade de executar testes específicos

## Licença

Este projeto é licenciado sob a licença MIT.
