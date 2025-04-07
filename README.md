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
- **Conformidade com LGPD/CCPA/GDPR** através das opções de processamento de dados
- **Segmentação de clientes** para melhor otimização de campanhas
- **Suporte para eventos de aplicativo móvel** com parâmetros específicos
- **Rastreamento de engajamento** com eventos de rolagem e tempo na página

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
- `src/public/`: Scripts de cliente e exemplos
- `prisma/schema.prisma`: Schema do banco de dados
- `data/GeoLite2-City.mmdb`: Banco de dados de geolocalização (baixado pelo script)

## Eventos Suportados

- **Standard Events**:
  - PageView
  - ViewHome
  - ViewContent
  - AddToCart
  - ViewCart
  - StartCheckout
  - AddPaymentInfo
  - Purchase
  - Search
  - ViewCategory
  - CompleteRegistration
  
- **Custom Events**:
  - ViewList
  - RegisterDone
  - ShippingLoaded
  - AddCoupon
  - Purchase - credit_card
  - Purchase - pix
  - Purchase - billet
  - Purchase - paid_pix
  - Purchase - high_ticket

- **Novos Eventos**:
  - Lead
  - Subscribe
  - Contact
  - Schedule
  - Timer_1min
  - Scroll_25
  - Scroll_50
  - Scroll_75
  - Scroll_100

## Parâmetros de Advanced Matching Suportados

- Email (em)
- Telefone (ph)
- Nome (fn)
- Sobrenome (ln)
- Gênero (ge)
- Data de Nascimento (db)
- Cidade (ct)
- Estado (st)
- CEP (zp)
- País (country)
- ID Externo (external_id)
- Endereço IP (client_ip_address)
- User Agent (client_user_agent)
- Facebook Click ID (fbc)
- Facebook Browser ID (fbp)
- Subscription ID (subscription_id)
- Facebook Login ID (fb_login_id)
- Lead ID (lead_id)
- Click ID WhatsApp (ctwa_clid)
- ID da conta Instagram (ig_account_id)
- ID de sessão Instagram (ig_sid)
- ID de instalação para aplicativo (anon_id)
- ID de anunciante móvel (madid)
- Vendor ID para iOS (vendor_id)

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

### Rastreamento de Eventos Básicos

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

### Rastreamento de Eventos Avançados

Para rastrear um evento com todos os recursos avançados:

```json
{
  "eventName": "Lead",
  "userData": {
    "email": "cliente@exemplo.com",
    "phone": "5511999999999",
    "firstName": "Maria",
    "lastName": "Silva",
    "city": "São Paulo",
    "state": "SP",
    "zip": "01001000",
    "country": "BR"
  },
  "customData": {
    "value": 100,
    "currency": "BRL",
    "contentName": "Formulário de Contato",
    "contentCategory": "Leads",
    "status": "submitted"
  },
  "dataProcessingOptions": ["LDU"],
  "dataProcessingOptionsCountry": 1,
  "dataProcessingOptionsState": 1000,
  "customerSegmentation": {
    "priority_segment": "high_value",
    "lifecycle_stage": "lead",
    "predicted_ltv_range": "high"
  }
}
```

### Rastreamento de Eventos de App

Para rastrear eventos de aplicativos móveis:

```json
{
  "eventName": "Purchase",
  "userData": {
    "email": "cliente@exemplo.com",
    "anonId": "d3b07384d113edec49eaa6238ad5ff00",
    "madid": "5e9a11b1-5cae-4754-8920-57cf5a56b3f1"
  },
  "customData": {
    "value": 159.99,
    "currency": "BRL",
    "order_id": "O-12345",
    "advertiserTrackingEnabled": true,
    "applicationTrackingEnabled": true
  },
  "isAppEvent": true
}
```

### Uso do Script Cliente Avançado

Para integrar o rastreamento avançado em seu site, inclua o script `meta-tracking-advanced.js` e use as funções fornecidas:

```html
<script src="https://rastreamento-meta.onrender.com/meta-tracking-advanced.js"></script>
<script>
  // Rastrear um lead
  MetaTracking.trackLead({
    email: 'cliente@exemplo.com',
    phone: '5511999999999',
    name: 'Maria Silva',
    formName: 'Formulário de Contato',
    customerType: 'high_value',
    ltv: 'high',
    fullConsent: true
  });
  
  // Rastrear uma compra
  MetaTracking.trackPurchase({
    id: 'O-12345',
    total: 159.99,
    customer: {
      email: 'cliente@exemplo.com',
      phone: '5511999999999',
      firstName: 'Maria',
      lastName: 'Silva',
      type: 'repeat_customer',
      ltv: 'high'
    },
    items: [
      { id: 'P-001', name: 'Produto 1', price: 99.99, quantity: 1 },
      { id: 'P-002', name: 'Produto 2', price: 59.99, quantity: 1 }
    ],
    paymentMethod: 'credit_card'
  });
</script>
```

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

8. **Novas Funcionalidades (v1.5)**:
   - **Conformidade com Regulamentações**: Implementação de opções de processamento de dados (LDU) para LGPD/CCPA/GDPR
   - **Segmentação de Clientes**: Adição de parâmetros de segmentação para otimização de campanhas
   - **Suporte a Eventos de App**: Implementação de parâmetros específicos para eventos de aplicativo móvel
   - **Eventos de Engajamento**: Adição de eventos de rolagem e tempo na página
   - **Eventos Adicionais**: Implementação de eventos Lead, Subscribe, Contact e Schedule
   - **Script Cliente Avançado**: Criação de script cliente com rastreamento avançado e auxiliares para eventos complexos

## Licença

Este projeto é licenciado sob a licença MIT.
