# 📚 Histórico e Contexto do Projeto Meta-Tracking

## 🎯 Propósito deste Documento

Este documento serve como um diário técnico e registro histórico do projeto Meta-Tracking. Seu propósito é:

1. **Preservar o contexto técnico** do projeto para evitar repetição de erros
2. **Documentar decisões técnicas** importantes e suas justificativas
3. **Registrar problemas encontrados** e suas soluções
4. **Fornecer referência rápida** para aspectos críticos do projeto

## 🤖 Instruções para a IA

Antes de analisar qualquer alteração ou responder a qualquer pergunta sobre o projeto Meta-Tracking:

1. **Consulte este documento** para entender o contexto histórico do projeto
2. **Identifique limitações conhecidas** e peculiaridades do ambiente
3. **Verifique soluções anteriores** para problemas similares
4. **Atualize este documento** após cada interação significativa que acrescente novo contexto

> **IMPORTANTE**: Este documento deve ser tratado como fonte primária de verdade sobre o contexto do projeto. Informações aqui têm precedência sobre suposições gerais baseadas em práticas comuns de mercado.

## 🏗️ Estrutura do Projeto

### Arquitetura Geral

O projeto Meta-Tracking é dividido em duas partes principais:

1. **Frontend**: Implementação extremamente simples que consiste em apenas UMA linha de código no site do cliente:
   ```html
   <script src="https://rastreamento-meta.onrender.com/meta-pixel-script.js"></script>
   ```
   > ⚠️ **IMPORTANTE**: O frontend não contém nenhuma outra implementação além desta linha! Qualquer correção no comportamento do pixel deve ser feita no arquivo hospedado no servidor, não no site cliente.

2. **Backend**: Aplicação Node.js/TypeScript que:
   - Fornece o script `meta-pixel-script.js` para o browser
   - Processa eventos via API REST (`/track`)
   - Envia eventos para a API de Conversões do Meta (CAPI)
   - Faz enriquecimento de dados (GeoIP)

### Repositórios e Hospedagem

- **GitHub**: [https://github.com/marcioabreuba/Rastreamento_Meta.git](https://github.com/marcioabreuba/Rastreamento_Meta.git)
- **Hospedagem**: Render.com (deploy automático a partir do branch `master`)
- **URL do Serviço**: [https://rastreamento-meta.onrender.com/](https://rastreamento-meta.onrender.com/)

### Características Especiais

- O projeto gerencia **múltiplos pixels** do Meta em diferentes sites/domínios
- Existe um **projeto de referência** em PHP/Laravel na pasta `referencia/` que tem alta performance e serve como benchmark

## 📝 Histórico de Problemas e Soluções

### 2023-11-14: Problema de Qualidade de Correspondência no Meta

**Problema**: Baixa pontuação de qualidade de correspondência (6.7/10) no Gerenciador de Eventos Meta.

**Causas Identificadas**:
1. **Crítico**: O Meta Pixel (ID: 1163339595278098) não estava disparando o evento PageView
2. Falta de normalização adequada (remoção de acentos, etc.) para dados geográficos antes do hashing
3. Parâmetro `fn` (nome) identificado como vazio pelo Meta
4. Baixa taxa de deduplicação via `fbp` (82.25% vs 100% via event_id)

**Soluções Implementadas**:

1. **Correção Frontend (meta-pixel-script.js)**:
   - Adicionamos `fbq('init', PIXEL_ID)` e `fbq('track', 'PageView')` que faltavam
   - Modificamos `sendEvent()` para chamar `fbq('track', ...)` antes de enviar para a API
   - Corrigimos duplicação de eventos removendo chamada redundante de `fbq('track', ...)`

2. **Melhorias Backend (eventUtils.ts)**:
   - Implementamos normalização aprimorada para dados geográficos antes do hashing (remoção de acentos, etc.)
   - Criamos funções auxiliares específicas (`normalizeGeoString()`, `hashGeo()`, etc.)
   - Garantimos que `fbp` e `fbc` não sejam hasheados, conforme documentação Meta

**Resultados**:
- O Meta Pixel Helper agora mostra o evento PageView para o pixel correto
- O aviso de "Pixel activated 2 times" foi corrigido
- Esperamos melhoria significativa na qualidade de correspondência após 24-48h

**Lições Aprendidas**:
1. O Meta Pixel **deve ser inicializado corretamente** no browser com `fbq('init', ID)` e `fbq('track', 'PageView')`
2. O envio via CAPI **não substitui** a necessidade do pixel no browser para eventos base
3. Dados PII devem ser normalizados (lowercase, sem acentos) **antes** do hashing SHA-256
4. `fbp` e `fbc` **não devem ser hasheados**

### 2023-11-14: Detalhes Técnicos sobre o Projeto

**Características Específicas**:

1. **Dois Pixels Diferentes**:
   - O projeto gerencia dois pixels Meta diferentes:
     - ID: 1163339595278098 (principal, usado para a maioria dos sites)
     - ID: Segundo pixel para outros propósitos (gerenciado por outro projeto)
   - Ambos são esperados e não devem interferir entre si

2. **Tratamento de IP e Geolocalização**:
   - Usa `@maxmind/geoip2-node` para detecção de localização
   - Implementação específica para lidar com IPv6 e IPv4-mapped

3. **Processamento de Eventos**:
   - Eventos são enviados para a API backend (`/track`)
   - Enriquecidos com GeoIP e outros dados
   - Normalizados e hasheados conforme necessário
   - Enviados para a API de Conversões do Meta

## 🚫 Limitações Conhecidas

1. **Frontend Simples**:
   - O frontend é apenas uma linha de código que carrega o script do servidor
   - Qualquer modificação visual ou de UX deve ser feita no site cliente, não neste projeto

2. **Coleta de PII**:
   - A coleta de dados como `fn` (nome) depende de formulários/login no site cliente
   - Este projeto pode processar esses dados, mas não é responsável por coletá-los

3. **Múltiplos Projetos**:
   - Existe mais de um projeto gerenciando pixels diferentes
   - Alterações devem ser cuidadosas para não interferir com outros projetos

## 🚀 Futuros Aprimoramentos

1. **Banner de Consentimento LGPD/GDPR**:
   - Ainda não implementado, item pendente na lista de tarefas

2. **Melhorias de Monitoramento**:
   - Adicionar mais logs para diagnóstico de problemas na correspondência
   - Implementar ferramentas de diagnóstico como no projeto de referência

---

## 📋 Log de Atualizações deste Documento

- **2023-11-14**: Criação inicial do documento com histórico de problemas, soluções e contexto do projeto.

---

*"Este documento é um trabalho em andamento e deve ser atualizado sempre que novas informações relevantes sobre o projeto forem descobertas ou mudanças significativas forem implementadas."* 