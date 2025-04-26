# Especificação e Contexto Atualizado do Projeto: Meta-Tracking

**Última Atualização:** [Data da Execução da Atualização - Inserir Data Atual]

**Fonte da Verdade:** Este documento resume o estado atual, a arquitetura e as regras essenciais do projeto Meta-Tracking. Consulte-o para entender o contexto e o funcionamento do sistema.

---

## 🎯 Objetivo Central do Projeto

- **O quê:** Receber eventos de rastreamento de sites clientes (via script JS único), enriquecê-los no backend (GeoIP, normalização, hashing) e enviá-los para a API de Conversões do Meta (CAPI), complementando o rastreamento do Pixel no navegador.
- **Por quê:** Melhorar a qualidade da correspondência de eventos no Meta Ads, permitir rastreamento server-side robusto e superar limitações de rastreamento no navegador.
- **Como:** Aplicação Node.js/TypeScript (`meta-tracking`) hospedada no Render, servindo um script JS dinâmico (`meta-pixel-script.js`) e processando eventos via API REST (`/track`).

---

## 🏗️ Visão Geral da Arquitetura e Fluxo de Dados

1.  **Frontend (Site Cliente):**
    *   **Instalação:** Apenas uma linha de script é adicionada ao HTML do site cliente:
        ```html
        <script src="https://rastreamento-meta.onrender.com/meta-pixel-script.js"></script>
        ```
    *   **Script (`meta-pixel-script.js`):** Servido pelo backend. Contém toda a lógica de rastreamento no navegador.
        *   **Inicializa o Pixel:** Carrega `fbevents.js`, chama `fbq('init', PIXEL_ID, advancedMatchingParams)` usando dados PII e Geo (se disponíveis no `localStorage`) **sem hash**.
        *   **Envia PageView (Web):** Chama `fbq('track', 'PageView', customParams)` com um `eventID` único logo após o `init`.
        *   **Coleta Dados:** Obtém informações da página, navegador, IDs (`fbp`/`fbc`, `external_id` gerado/obtido, `visitorId` de cookie first-party) e dados PII/Geo do `localStorage`.
        *   **Envia Eventos (Web):** Dispara outros eventos (`ViewContent`, `AddToCart`, etc.) via `fbq('track', eventName, eventData)` ou `fbq('trackCustom', eventName, eventData)`.
        *   **Comunica com Backend:** Envia um payload JSON **bruto e não hasheado** para o endpoint `/track` do backend via `POST` para cada evento (incluindo PageView).
        *   **[NOVO] Logging Condicional (Debug):** Se o modo de debug estiver ativo (`?debug_meta=true` na URL ou `localStorage.setItem('meta_debug', 'true')`), o script logará no console:
            *   `[LOG_WEB_RAW]`: Dados brutos preparados para envio ao backend.
            *   `[LOG_WEB_FBQ]`: Dados enviados para `fbq('track'...)` ou `fbq('trackCustom'...)`.
            *   `[LOG_SERVER_CAPI]`: O payload CAPI completo (hasheado) recebido na resposta do backend (`/track`).

2.  **Backend (Servidor - `meta-tracking`):**
    *   **Stack:** Node.js / TypeScript, hospedado no Render.com.
    *   **Repositório:** [https://github.com/marcioabreuba/Rastreamento_Meta.git](https://github.com/marcioabreuba/Rastreamento_Meta.git)
    *   **URL Base:** `https://rastreamento-meta.onrender.com/`
    *   **Responsabilidades:**
        *   Servir o script dinâmico `/meta-pixel-script.js`.
        *   Receber dados brutos no endpoint `POST /track`.
        *   **Enriquecer:** Obter GeoIP do IP do requisitante (`GeoIPService`).
        *   **Normalizar e Hashear:** Processar os dados recebidos e enriquecidos (`NormalizationService`), aplicando regras específicas (PII, CEP BR, etc.) e hashing SHA-256 para criar o `capiEvent`.
        *   **Enviar para CAPI:** Enviar o `capiEvent` formatado e hasheado para a API de Conversões do Meta (`CapiService`).
        *   **[MODIFICADO] Responder ao Frontend:** Enviar resposta 200 OK. Se o modo debug estiver ativo no frontend (detectado implicitamente pela requisição), a resposta **incluirá** o objeto `capiPayload` completo, o status do envio CAPI (`capiSendStatus`), e o `traceId` (se houver).

3.  **Fluxo Simplificado:**
    `Cliente carrega HTML` -> `HTML carrega /meta-pixel-script.js` -> `Script JS faz fbq('init') + fbq('track', 'PageView')` -> `[Debug?] Script JS loga [LOG_WEB_RAW]` -> `[Debug?] Script JS loga [LOG_WEB_FBQ]` -> `Script JS envia dados BRUTOS para POST /track` -> `Backend /track recebe` -> `Backend obtém GeoIP` -> `Backend Normaliza/Hasheia (gera capiEvent)` -> `Backend envia capiEvent para CAPI (async)` -> `Backend responde 200 OK (com capiPayload se Debug?) para /track` -> `[Debug?] Script JS loga [LOG_SERVER_CAPI] da resposta`.

---

## 🧩 Componentes Principais e Responsabilidades (Backend)

*   **`src/index.ts`:** Ponto de entrada. Inicializa o servidor Express, carrega a base GeoIP e a injeta no `GeoIPService`.
*   **`src/config/index.ts`:** Centraliza configurações (portas, URLs, chaves de API, caminho do DB GeoIP, etc.), lidas de variáveis de ambiente.
*   **`src/App/Http/TrackController.ts`:**
    *   Recebe requisições `POST /track`.
    *   Extrai `eventName`, `userData`, `customData`, `eventId`, etc., do corpo da requisição.
    *   Extrai IP e User Agent da requisição.
    *   Chama `GeoIPService.getGeoData()` para obter dados de geolocalização.
    *   Chama um Handler de Evento específico (ex: `PurchaseHandler`) ou o `GenericEventHandler` para pré-processar dados, se necessário.
    *   Prepara o `RawEventInput` com todos os dados brutos (request, geo, frontend).
    *   Chama `NormalizationService.normalizeEventForCAPI()` para obter o `capiEvent`.
    *   Chama `CapiService.sendEvent(capiEvent)` **e aguarda o resultado** (`capiResult`).
    *   **[MODIFICADO] Monta a resposta JSON:** Inclui `success`, `serverEventId`, **`capiPayload`**, **`capiSendStatus`**, **`capiTraceId`**, etc.
    *   Envia a resposta JSON ao frontend.
    *   Loga erros e responde com 4xx/5xx apropriados (também com estrutura JSON padronizada).
*   **`src/App/Core/GeoIPService.ts`:**
    *   Encapsula a interação com a biblioteca `@maxmind/geoip2-node`.
    *   Recebe a instância do `Reader` na inicialização.
    *   `getGeoData(ip)`: Busca informações de cidade/região/país/CEP. Trata IPv4/IPv6 (incluindo fallback para IPv4 extraído de mapeados). **Normaliza CEPs brasileiros para 8 dígitos internamente** antes de retornar. Retorna `null` em caso de erro ou IP não encontrado/inválido.
    *   `convertToIPv6Format(ip)`: Converte IPs para o formato IPv6 (real ou mapeado).
*   **`src/App/Core/NormalizationService.ts`:**
    *   **`normalizeEventForCAPI(rawEvent: RawEventInput)`:** Orquestra a normalização.
        *   **`EVENT_NAME_MAPPING`:** Mapeia nomes de eventos internos/frontend para nomes padrão/customizados da CAPI (ex: `ViewHome` -> `PageView`, `Purchase_pix` -> `Purchase`).
        *   **`normalizeUserData(...)`:**
            *   **Mescla Dados Geo:** Prioriza dados PII/Geo vindos do `userData` do frontend (`localStorage`). Se ausentes, usa os dados do `geoData` (obtido pelo `GeoIPService`).
            *   **Normaliza PII:** Aplica regras (lowercase, remove acentos/diacríticos, apenas dígitos para telefone) aos campos PII (em, ph, fn, ln, ge, db, ct, st, country).
            *   **Normaliza CEP BR:** Garante formato de 8 dígitos (com padding de '0') para o CEP (`zp`), tanto vindo do frontend quanto do GeoIP, se o país for 'br'.
            *   **Hasheia PII:** Aplica SHA-256 aos dados PII **normalizados** (incluindo cidade, estado, país, CEP).
            *   **Inclui Não-Hasheados:** Adiciona `client_ip_address` (formato IPv6), `client_user_agent`, `fbp` (validado), `fbc`.
            *   **Gera Fallback `external_id`:** Hasheia o `external_id` recebido ou gera/hasheia um UUID como fallback.
        *   **`normalizeCustomData(...)`:**
            *   Converte chaves para `snake_case`.
            *   Define padrões (`currency: 'BRL'`).
            *   Garante tipos corretos (ex: `value` como número).
            *   **Trata `content_name` (Array):** Converte array de nomes (comum em `ViewCart`/`AddToCart`) para string (ex: "Produto A e mais X itens").
            *   **Define `language`:** Padroniza para `'pt-BR'`.
        *   **Gera `event_id`:** Usa o `eventId` vindo do frontend ou gera um UUID v4 se ausente.
    *   **`hashData(...)`:** Função auxiliar para aplicar SHA-256 após normalização específica do tipo.
*   **`src/App/Http/CapiService.ts`:**
    *   Responsável por fazer a requisição HTTP POST para a API de Conversões do Meta (`graph.facebook.com/vX.X/PIXEL_ID/events`) com o payload `ServerEvent` normalizado.
    *   **[MODIFICADO]** Retorna um objeto `CapiSendResult` com `{ status: 'success' | 'error' | 'skipped', traceId?: string, error?: string }`.
*   **`src/App/events/*Handler.ts`:** (Ex: `PurchaseHandler`, `GenericEventHandler`) Funções opcionais para extrair/formatar dados específicos de certos tipos de evento *antes* da normalização principal. O `GenericEventHandler` simplesmente repassa os dados.
*   **`src/scripts/download-geoip.ts`:** Script auxiliar para baixar/atualizar o banco de dados `GeoLite2-City.mmdb` da MaxMind. Verifica idade, usa backups, etc.

---

## 📊 Eventos e Parâmetros Chave

### Eventos Principais (Nomes Internos -> CAPI)

*   `PageView` -> `PageView`
*   `ViewHome` -> `PageView` (*Mapeado*)
*   `ViewContent` -> `ViewContent`
*   `ViewList` -> `ViewList`
*   `ViewCategory` -> `ViewCategory`
*   `Search` -> `Search`
*   `AddToCart` -> `AddToCart`
*   `ViewCart` -> `ViewCart`
*   `InitiateCheckout` -> `InitiateCheckout`
*   `AddPaymentInfo` -> `AddPaymentInfo`
*   `CompleteRegistration` -> `CompleteRegistration`
*   `AddToWishlist` -> `AddToWishlist`
*   `Purchase` (e variantes como `Purchase_pix`) -> `Purchase`
*   Eventos Customizados (`Timer_1min`, `Scroll_*`, `PlayVideo`, etc.) -> Mantêm o nome ou mapeiam para `CustomEvent`.

### Payload: Frontend (`meta-pixel-script.js`) -> Backend (`/track`)

*   **Método:** `POST`
*   **Content-Type:** `application/json`
*   **Estrutura (Dados BRUTOS, NÃO HASHED):**
    ```json
    {
      "eventName": "NomeDoEvento", // Ex: "ViewContent"
      "eventId": "uuid-gerado-no-frontend", // UUID v4
      "sourceUrl": "url-da-pagina-atual",
      "referrer": "url-de-referencia",
      "userData": { // Dados coletados do localStorage, etc.
        "external_id": "id-do-usuario-sem-hash",
        "visitorId": "id-do-cookie-first-party", // _mtVisitorId
        "fbp": "valor_fbp_validado_ou_null",
        "fbc": "valor_fbc_ou_null",
        "em": "email_sem_hash_ou_null",
        "ph": "telefone_sem_hash_ou_null",
        "fn": "primeiro_nome_sem_hash_ou_null",
        // ... outros PII (ln, ge, db)
        "ct": "cidade_sem_hash_ou_null",
        "st": "estado_sem_hash_ou_null", // Sigla?
        "zp": "cep_sem_hash_ou_null",    // Pode vir normalizado ou não
        "country": "pais_sem_hash_ou_null" // Sigla?
      },
      "customData": { // Dados específicos do evento
        "value": 123.45,
        "currency": "BRL",
        "order_id": "order123",
        "content_name": "Nome Produto" | ["Prod A", "Prod B"], // Pode ser string ou array
        "content_ids": ["sku1", "sku2"],
        "language": "pt-BR", // Vem do navigator.language
        "app": "meta-tracking",
        // ... outros
      }
      // dataProcessingOptions, etc. (opcional)
    }
    ```
    *Observação: A resposta do backend para esta requisição agora contém dados adicionais (`capiPayload`, etc.) quando o debug está ativo no frontend.*

### Payload: Backend (`NormalizationService`) -> Meta CAPI (`ServerEvent`)

*   **Estrutura (Dados NORMALIZADOS e HASHED):**
    ```json
    {
      "event_name": "NomeEventoMAPEADO", // Ex: "ViewContent"
      "event_time": timestamp_unix,
      "event_source_url": "url-da-pagina-original",
      "event_id": "uuid-vindo-do-frontend-ou-gerado",
      "action_source": "website",
      "user_data": {
        // --- HASHED (SHA-256) ---
        "em": "hash_email_normalizado_lower_sem_acentos",
        "ph": "hash_telefone_normalizado_so_digitos",
        "fn": "hash_nome_normalizado_lower_sem_acentos",
        "ln": "hash_sobrenome_normalizado_lower_sem_acentos",
        "ge": "hash_genero_normalizado_f_ou_m", // f ou m
        "db": "hash_data_nasc_normalizado_YYYYMMDD",
        "ct": "hash_cidade_normalizada_lower_sem_acentos",
        "st": "hash_estado_normalizado_lower_sem_acentos", // Sigla?
        "zp": "hash_cep_normalizado_BR_8_digitos",
        "country": "hash_pais_normalizado_lower_sem_acentos", // Sigla?
        "external_id": "hash_id_externo_ou_fallback",
        // --- NÃO HASHED ---
        "client_ip_address": "ip_cliente_formato_ipv6",
        "client_user_agent": "user_agent_cliente",
        "fbp": "valor_fbp_validado_ou_null",
        "fbc": "valor_fbc_ou_null",
        "subscription_id": null, // Ou valor se fornecido
        "fb_login_id": null,
        "lead_id": null
      },
      "custom_data": { // Chaves em snake_case, valores normalizados
        "value": 123.45, // Número
        "currency": "BRL", // Padrão
        "order_id": "order123",
        "content_name": "Nome Produto" | "Produto A e mais X itens", // STRING
        "content_ids": ["sku1", "sku2"],
        "language": "pt-BR", // Padronizado
        "app": "meta-tracking",
        // ... outros em snake_case
      },
      "data_processing_options": [], // Ou valores se fornecidos
      // ... outros campos CAPI (test_event_code)
    }
    ```

---

## ⚙️ Normalização e Hashing (Regras Essenciais Atuais)

*   **PII Geral (`em`, `ph`, `fn`, `ln`, `ge`, `db`, `ct`, `st`, `country`, `external_id`):** Normalizar (lowercase, sem acentos/diacríticos, apenas dígitos para `ph`, formato específico para `ge`/`db` se aplicável) **ANTES** de aplicar o hash SHA-256.
*   **CEP (`zp`):** Se o país for `br`, normalizar para 8 dígitos (completando com '0' à direita) **ANTES** de aplicar o hash SHA-256.
*   **Hashing:** Usar SHA-256 para todos os campos PII listados acima após a normalização.
*   **NÃO Hashear:** `client_ip_address`, `client_user_agent`, `fbp`, `fbc`.
*   **Validação `fbp`:** Garantir que o formato seja `fb.1.timestamp.random` antes de enviar (função `validateFbp`).
*   **Prioridade Geo:** Dados do `localStorage` (enviados pelo frontend) têm prioridade sobre dados do GeoIP (obtidos no backend) durante a normalização.
*   **Idioma (`language`):** Padronizar para `'pt-BR'` no `custom_data` enviado à CAPI.
*   **Moeda (`currency`):** Padronizar para `'BRL'` no `custom_data` enviado à CAPI, a menos que outro valor seja explicitamente fornecido.
*   **`content_name` (Array):** Converter arrays (comuns em Carrinho/Compra) para uma string única antes de enviar à CAPI (ex: "Produto A e mais X itens").
*   **Conversão de IP:** Converter `client_ip_address` para formato IPv6 (real ou mapeado) antes de enviar à CAPI.

---

## 🕵️ Depuração (Novo)

*   **Ativação:** Para ativar os logs detalhados no console do navegador, adicione `?debug_meta=true` à URL do site ou execute `localStorage.setItem('meta_debug', 'true')` no console.
*   **Logs Disponíveis (no Console do Navegador):**
    *   **`[LOG_WEB_RAW]`:** Mostra os dados (`eventName`, `rawUserData`, `specificCustomData`) *antes* de serem enviados do script frontend para o endpoint `/track` do backend. Útil para ver os dados brutos coletados no navegador.
    *   **`[LOG_WEB_FBQ]`:** Mostra os dados (`eventName`, `customData`, `options`) enviados diretamente para a função `fbq()` do Facebook Pixel (seja `track` ou `trackCustom`). Útil para verificar o que o Pixel está recebendo.
    *   **`[LOG_SERVER_CAPI]`:** Mostra o payload completo (`capiPayload`) que o *backend* preparou para enviar à API de Conversões, incluindo dados hasheados e enriquecidos (como GeoIP). Este log aparece após o frontend receber a resposta do endpoint `/track`. Útil para comparar com os logs web e verificar o processamento do servidor.
*   **Desativação:** Remova o parâmetro da URL ou execute `localStorage.removeItem('meta_debug')`. Nenhum dos logs `[LOG_...]` deve aparecer quando desativado.
*   **Nota:** A ativação do debug **NÃO** altera os dados enviados para o Facebook Pixel ou CAPI, apenas exibe logs adicionais no console e modifica a resposta do backend para incluir o `capiPayload`.

---

## ⚠️ Pontos Críticos & Normas Atuais (Atenção!)

*   **Frontend Único:** O script `meta-pixel-script.js`, servido pelo backend, é o **único** código a ser instalado no site cliente. Nenhuma outra lógica de rastreamento deve ser adicionada manualmente no cliente.
*   **Inicialização `fbq` Essencial:** O `meta-pixel-script.js` **DEVE** carregar `fbevents.js`, chamar `fbq('init', PIXEL_ID, advancedMatchingParams)` (com dados do `localStorage`, sem hash) e `fbq('track', 'PageView', customData, { eventID })` no carregamento de cada página.
*   **Comunicação Frontend -> Backend:** O script envia dados **brutos e não hasheados** para o endpoint `/track`. Toda normalização complexa, GeoIP e hashing ocorrem no backend.
*   **Normalização ANTES do Hashing:** É crucial aplicar todas as regras de normalização (acentos, caixa, formato CEP BR, etc.) aos dados PII *antes* de calcular o hash SHA-256.
*   **Formato CEP BR:** Garanta que CEPs brasileiros sejam enviados para a CAPI (hasheados) com **exatos 8 dígitos**.
*   **`fbp`/`fbc` Intocados:** **NÃO** aplicar hash aos cookies `_fbp` e `_fbc`. Validar o formato do `fbp`.
*   **Sincronia Web/Server:** Mantenha os parâmetros (especialmente `event_id` e dados `custom_data`) consistentes entre as chamadas `fbq('track', ...)` e os dados enviados para `/track` para garantir a desduplicação correta pelo Meta.
*   **Atualização GeoIP DB:** O banco de dados MaxMind (`GeoLite2-City.mmdb`) deve ser mantido atualizado (o script `download-geoip.ts` ajuda, mas pode requerer execução periódica ou automação no deploy).
*   **Idioma e Moeda:** Padronize `language` para `'pt-BR'` e `currency` para `'BRL'` nos dados enviados à CAPI, a menos que haja uma razão forte para usar outros valores.
*   **Múltiplos Pixels:** Esteja ciente de que o sistema é projetado para lidar com diferentes IDs de Pixel (embora a configuração atual possa ter um fixo), mas evite conflitos se outros sistemas de rastreamento estiverem presentes na mesma página.
*   **Debug em Produção:** Evite ativar o modo de debug (`?debug_meta=true`) em ambiente de produção desnecessariamente, pois expõe logs detalhados no console.

---
*Este documento reflete o estado atual do projeto Meta-Tracking.* 