# 🚀 Briefing Rápido: Projeto Meta-Tracking para IA 🤖

**Última Atualização:** [2025-04-11] <!-- Atualize esta data ao modificar! -->

**Leia Isto Primeiro!** Este documento resume o essencial sobre o projeto Meta-Tracking. Consulte-o *antes* de qualquer análise ou modificação para entender o contexto crítico e evitar erros passados. Use-o como fonte primária de verdade sobre o contexto do projeto.

---

## 🎯 Objetivo Central do Projeto

- **O quê:** Receber eventos de rastreamento de sites clientes (via script JS simples), enriquecê-los (GeoIP, normalização) e enviá-los para a API de Conversões do Meta (CAPI).
- **Por quê:** Melhorar a qualidade da correspondência de eventos no Meta Ads e permitir rastreamento server-side, superando limitações de rastreamento no navegador.
- **Como:** Aplicação Node.js/TypeScript (`meta-tracking`) hospedada no Render, servindo um script JS (`meta-pixel-script.js`) e processando eventos via API REST (`/track`).

---

## 🏗️ Visão Geral da Arquitetura

1.  **Frontend (Cliente):** **APENAS UMA LINHA!**
    ```html
    <script src="https://rastreamento-meta.onrender.com/meta-pixel-script.js"></script>
    ```
    *   **Ponto Chave:** Nenhuma lógica adicional no cliente. Toda a inteligência de rastreamento no navegador está no script `meta-pixel-script.js` servido pelo backend.
    *   **Funcionalidade Atual:** O script agora inicializa corretamente o pixel (`fbq('init', PIXEL_ID)`) e dispara o evento `PageView` (`fbq('track', 'PageView')`) no carregamento, além de rastrear eventos personalizados.

2.  **Backend (Servidor - `meta-tracking`):**
    *   **Linguagem/Stack:** Node.js / TypeScript
    *   **Repositório:** [https://github.com/marcioabreuba/Rastreamento_Meta.git](https://github.com/marcioabreuba/Rastreamento_Meta.git)
    *   **Hospedagem:** Render.com (deploy automático do branch `master`)
    *   **URL Base:** `https://rastreamento-meta.onrender.com/`
    *   **Responsabilidades:**
        *   Servir o script dinâmico `meta-pixel-script.js`.
        *   Receber dados de eventos via endpoint API REST `/track`.
        *   Enriquecer dados: Geolocalização via IP (`@maxmind/geoip2-node`), tratamento de IPv6/IPv4-mapped.
        *   Normalizar e Hashear dados PII (conforme regras do Meta - ver `eventUtils.ts` ou similar).
        *   Enviar eventos processados para a API de Conversões do Meta (CAPI).
    *   **Gerencia Múltiplos Pixels:** O sistema é projetado para lidar com diferentes IDs de Pixel Meta para diferentes clientes/domínios.

---

## 📊 Eventos e Parâmetros Obrigatórios

### Eventos Obrigatórios de Rastreamento:

Os seguintes eventos são considerados **obrigatórios** para a funcionalidade do sistema e jamais devem ser removidos:

1. **PageView** - Visualização de página (fundamental para inicialização do rastreamento)
2. **ViewHome** - Visualização da página inicial
3. **ViewContent** - Visualização de conteúdo (produto/página)
4. **ViewList** - Visualização de lista (mapeado para ViewContent)
5. **AddToCart** - Adição ao carrinho
6. **ViewCart** - Visualização do carrinho
7. **InitiateCheckout** - Início do checkout
8. **CompleteRegistration** - Registro completo
9. **AddPaymentInfo** - Adição de informações de pagamento
10. **Purchase** - Compra (incluindo variantes por método de pagamento)
11. **ViewCategory** - Visualização de categoria
12. **Search** - Pesquisa
13. **Timer_1min** - Tempo de permanência de 1 minuto
14. **Scroll_25/50/75/90/100** - Profundidade de rolagem
15. **Lead** - Captura de leads
16. **AddToWishlist** - Adição à lista de desejos
17. **PlayVideo** e **ViewVideo_25/50/75/90** - Interações com vídeos

### Parâmetros Obrigatórios:

#### Dados de Usuário (userData):

1. **Identificação** (nunca remover):
   - `external_id`: ID do usuário/visitante hasheado
   - `client_ip_address`: Endereço IP (convertido para IPv6)
   - `client_user_agent`: User-Agent do navegador
   - `fbp`: Facebook Browser ID (não hashear)
   - `fbc`: Facebook Click ID (não hashear)

2. **Dados Pessoais** (sempre normalizar e hashear):
   - `em`: Email
   - `ph`: Telefone
   - `fn`: Primeiro nome
   - `ln`: Sobrenome
   - `ge`: Gênero
   - `db`: Data de nascimento

3. **Localização** (sempre normalizar e hashear):
   - `country`: País
   - `state`: Estado
   - `city`: Cidade
   - `zip`: CEP

#### Dados Personalizados (customData):

1. **Parâmetros de Compra**:
   - `currency`: Moeda (padrão 'BRL')
   - `value`: Valor da compra/produto
   - `order_id`: ID do pedido
   - `num_items`: Número de itens

2. **Conteúdo**:
   - `content_name`: Nome do produto/conteúdo
   - `content_category`: Categoria do produto
   - `content_ids`: IDs dos produtos
   - `content_type`: Tipo de conteúdo
   - `contents`: Detalhes dos itens (valor, ID, etc.)

**IMPORTANTE:** A remoção ou modificação incorreta destes eventos e parâmetros pode comprometer significativamente a qualidade do rastreamento, a correspondência de eventos no Meta Ads e o funcionamento da integração entre o frontend e a API de Conversões do Meta.

---

## ⚠️ Pontos Críticos & Limitações (Atenção!)

*   **NÃO Modifique o Site Cliente:** Qualquer correção ou alteração no comportamento do rastreamento do *navegador* deve ser feita no código que gera o `meta-pixel-script.js` no *backend*, não no site do cliente.
*   **Inicialização do Pixel no Browser é ESSENCIAL:** O script `meta-pixel-script.js` *deve* chamar `fbq('init', PIXEL_ID)` e `fbq('track', 'PageView')`. O envio via CAPI complementa, mas não substitui totalmente a necessidade do pixel no browser para deduplicação e eventos base.
*   **Normalização ANTES do Hashing:** Dados PII (ex: email, telefone, nome, geo) devem ser normalizados (lowercase, sem acentos/diacríticos, formato específico) *antes* de aplicar o hash SHA-256.
*   **NÃO Hashear `fbp` e `fbc`:** Esses identificadores do Meta devem ser enviados como estão, sem hashing.
*   **Coleta de PII:** Este backend *processa* PII (ex: `fn`, `em`), mas a *coleta* desses dados depende da implementação no site cliente (formulários, áreas logadas, etc.). O backend não coleta PII diretamente do usuário.
*   **Múltiplos Projetos/Pixels:** Tenha cuidado, pois pode haver outros sistemas ou pixels (ex: um segundo pixel mencionado no histórico) operando nos mesmos sites. Evite interferências.
*   **Projeto de Referência:** Existe um projeto PHP/Laravel na pasta `referencia/`. Ele possui alta performance e pode servir como benchmark ou fonte de inspiração para boas práticas (ex: tratamento de erros, logging, otimizações).

---

## 📜 Histórico de Problemas Relevantes (Resumo)

*   **[2023-11-14] - Baixa Qualidade de Correspondência no Meta (Score 6.7/10):**
    *   **Causas Raiz:**
        1.  Script `meta-pixel-script.js` não chamava `fbq('init', ...)` nem `fbq('track', 'PageView')`.
        2.  Falta de normalização adequada de dados geográficos antes do hashing.
        3.  Envio de `fn` (nome) vazio.
    *   **Solução:**
        1.  Corrigido `meta-pixel-script.js` para incluir chamadas `fbq` faltantes e evitar duplicação.
        2.  Implementada normalização aprimorada (sem acentos, etc.) em `eventUtils.ts` antes do hashing.
        3.  Garantido que `fbp`/`fbc` não são hasheados.
    *   **Lição Principal:** A correta inicialização do pixel no browser e a normalização *pré-hashing* dos dados PII são absolutamente cruciais para a qualidade da correspondência e deduplicação.

*   **[2025-04-11] - Problema de Eventos PageView Ausentes:**
    *   **Causas Raiz:**
        1.  O script `meta-pixel-script.js` não continha as chamadas `fbq('init', ...)` e `fbq('track', 'PageView')`, apenas a lógica para outros eventos como ViewHome.
        2.  As chamadas de inicialização e PageView estavam implementadas na rota `/pixel-code`, mas o site cliente estava usando `/meta-pixel-script.js`.
    *   **Solução:**
        1.  Modificado diretamente o arquivo `src/public/meta-pixel-script.js` para incluir `fbq('init', PIXEL_ID, pixelParams)` e `fbq('track', 'PageView')` dentro da função `initFacebookPixel()`.
        2.  Ajustada a função `init()` para evitar duplicação de eventos PageView.
    *   **Lição Principal:** O arquivo servido diretamente ao cliente deve conter toda a lógica necessária para a inicialização correta do pixel, incluindo as chamadas obrigatórias `fbq('init', ...)` e `fbq('track', 'PageView')`, mesmo se houver rotas alternativas implementadas no backend.

*   **[Adicionar outros problemas relevantes aqui resumidamente - Data, Problema, Causa Raiz, Solução, Lição]**

---

## 🛠️ Como Trabalhar Neste Projeto (Guia para IA)

1.  **Entenda o Fluxo:** Cliente carrega HTML -> HTML carrega `meta-pixel-script.js` do nosso backend -> Script JS inicializa Pixel (`fbq('init',...)`, `fbq('track','PageView')`) -> Ação do usuário dispara evento -> Script JS envia dados para `/track` (backend) -> Backend recebe em `/track`, enriquece com GeoIP, normaliza PII, hasheia PII -> Backend envia dados formatados para a Meta CAPI.
2.  **Localize o Código Relevante:**
    *   **Lógica do Browser:** Código TypeScript/JavaScript que gera/serve `meta-pixel-script.js`.
    *   **Processamento Backend:** Controller/Handler da rota `/track`, módulos/funções de utilitários de eventos (como `eventUtils.ts`), serviço de GeoIP, serviço de envio para CAPI.
3.  **Verifique os "Pontos Críticos" e o "Histórico":** Antes de propor soluções, revise as seções acima para garantir que sua sugestão não viola uma regra estabelecida ou repete um erro passado.
4.  **Peça Contexto Adicional:** Se precisar ver o conteúdo exato de arquivos como `eventUtils.ts`, a implementação da rota `/track`, ou a configuração do GeoIP, solicite a leitura desses arquivos (`read_file`).
5.  **Considere a Referência:** Se estiver buscando otimizações ou melhores práticas, pode ser útil pedir para analisar partes específicas do projeto em `referencia/`.
6.  **Atualize Este Guia:** Se descobrirmos novas informações críticas, resolvermos novos problemas significativos ou fizermos mudanças arquiteturais, lembre-se de propor uma atualização para este documento.

---

## 🚀 Próximos Passos / Melhorias Pendentes

*   Monitorar a qualidade de correspondência no Meta Ads após as correções do evento PageView (adicionado em 2025-04-11).
*   Implementar Banner de Consentimento LGPD/GDPR (tarefa pendente).
*   Melhorar o monitoramento e adicionar mais logs detalhados para diagnóstico de problemas de correspondência.
*   Implementar ferramentas de diagnóstico/debug (inspirado no projeto de referência).
*   [Adicionar outros itens do backlog aqui]

---
*Este documento é a fonte da verdade contextual para o projeto Meta-Tracking.*