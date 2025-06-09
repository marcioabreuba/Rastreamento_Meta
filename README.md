# 🎯 Meta Tracking - Sistema de Rastreamento Avançado

Sistema profissional de rastreamento para Meta (Facebook Pixel e Conversions API) com geolocalização, validação avançada e middleware de segurança.

## 🚀 Características Principais

### ✅ Funcionalidades Implementadas
- **Facebook Pixel & Conversions API** - Rastreamento duplo para máxima precisão
- **GeoIP Avançado** - Localização precisa com MaxMind GeoLite2
- **Validação Robusta** - Middleware de validação centralizada
- **Rate Limiting** - Proteção contra abuso de API
- **Sanitização de Dados** - Limpeza automática de dados de entrada
- **Logs Estruturados** - Sistema de logging profissional com Winston
- **Testes Unitários** - Cobertura de testes para funções críticas
- **TypeScript Strict** - Tipagem rigorosa para máxima segurança
- **Arquitetura Modular** - Código organizado e escalável

### 🔧 Melhorias de Qualidade
- **Zero Console.logs** em produção
- **Configuração Centralizada** - Todos os valores configuráveis
- **Validadores Reutilizáveis** - Funções de validação consolidadas
- **Middleware de Segurança** - Proteção em múltiplas camadas
- **Build Otimizado** - Scripts de build e linting automatizados

## 📁 Estrutura do Projeto

```
src/
├── App/
│   ├── Core/
│   │   ├── GeoIPService.ts      # Serviço de geolocalização
│   │   └── NormalizationService.ts # Normalização de dados
│   └── Http/
│       └── TrackController.ts    # Controller principal
├── config/
│   └── index.ts                 # Configurações centralizadas
├── middleware/
│   └── validationMiddleware.ts  # Middlewares de validação e segurança
├── routes/
│   └── index.ts                 # Rotas da aplicação
├── tests/
│   └── validators.test.ts       # Testes unitários
├── types/
│   └── index.ts                 # Definições de tipos
└── utils/
    ├── logger.ts                # Sistema de logging
    └── validators.ts            # Funções de validação
```

## 🛠️ Instalação e Configuração

### 1. Instalação de Dependências
```bash
npm install
```

### 2. Configuração do Ambiente
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Configure suas credenciais
# IMPORTANTE: Nunca commite o arquivo .env real!
```

### 3. Configuração do Banco de Dados
```bash
# Gerar cliente Prisma
npm run db:generate

# Executar migrações
npm run migrate:deploy
```

### 4. Download da Base GeoIP
```bash
npm run download-geoip
```

## 🚀 Scripts Disponíveis

### Desenvolvimento
```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run start        # Iniciar servidor de produção
npm run lint         # Verificação de tipos TypeScript
```

### Testes
```bash
npm run test:validators    # Testes de validadores
npm run test:geoip        # Testes de GeoIP
npm run test:api          # Testes de API
npm run test:all          # Todos os testes
```

### Utilitários
```bash
npm run clean             # Limpar pasta dist
npm run health-check      # Verificar saúde da aplicação
npm run db:studio         # Interface do banco de dados
```

## 🔒 Segurança Implementada

### Rate Limiting
- **100 requests/minuto** por IP
- Headers informativos de limite
- Bloqueio automático de IPs abusivos

### Validação de Dados
- **Validação de email** com regex robusto
- **Validação de telefone brasileiro** com múltiplos formatos
- **Sanitização automática** de dados de entrada
- **Validação de tipos** TypeScript em runtime

### Proteções Adicionais
- **IPs privados** detectados e tratados
- **Eventos antigos/futuros** normalizados
- **Dados sensíveis** mascarados nos logs
- **Headers de segurança** configurados

## 📊 Monitoramento e Logs

### Sistema de Logging
- **Níveis configuráveis** (debug, info, warn, error)
- **Logs estruturados** em JSON
- **Rotação automática** de arquivos
- **Mascaramento** de dados sensíveis

### Métricas Disponíveis
- Rate limiting por IP
- Eventos processados
- Erros de validação
- Performance de GeoIP

## 🔧 Configurações Avançadas

### Validação de Eventos
```typescript
// Configurável em src/config/index.ts
validation: {
  maxEventAgeInDays: 7,        // Idade máxima de eventos
  maxFutureEventHours: 2,      // Eventos futuros permitidos
  userAgentLogLength: 50,      // Tamanho do UA nos logs
  debugLogLength: 70,          // Tamanho de debug logs
}
```

### Rate Limiting
```typescript
// Configurável em src/config/index.ts
rateLimit: {
  windowMs: 60 * 1000,         // Janela de tempo (1 minuto)
  maxRequestsPerWindow: 100,   // Máximo de requests
}
```

## 🧪 Testes e Qualidade

### Cobertura de Testes
- ✅ Validadores de email e telefone
- ✅ Normalização de CEP brasileiro
- ✅ Detecção de IPs privados
- ✅ Funções de GeoIP
- ✅ APIs de rastreamento

### Qualidade de Código
- **TypeScript Strict Mode** habilitado
- **ESLint** configurado
- **Prettier** para formatação
- **Build verification** automática

## 🚨 Avisos Importantes

### Segurança
- **NUNCA** commite arquivos `.env` com credenciais reais
- **SEMPRE** use `.env.example` como template
- **REVOGUE** credenciais expostas imediatamente

### Produção
- Configure logs para nível `info` ou superior
- Use HTTPS em produção
- Configure rate limiting adequado para seu uso
- Monitore métricas de performance

## 📈 Performance

### Otimizações Implementadas
- **Cache de GeoIP** para IPs repetidos
- **Validação prévia** de IPs privados
- **Sanitização eficiente** de dados
- **Logs assíncronos** para não bloquear requests

### Recomendações
- Use Redis para cache em produção
- Configure CDN para assets estáticos
- Monitore uso de memória
- Implemente health checks

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Execute os testes: `npm run test:all`
4. Faça commit das mudanças
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença ISC.

---

**Desenvolvido com ❤️ para máxima performance e segurança**
