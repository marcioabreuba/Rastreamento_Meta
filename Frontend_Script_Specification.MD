# Especificação do Script Frontend (`meta-pixel-script.js`)

**Última Atualização:** [Inserir Data Atual da Modificação]

## 🎯 Objetivo e Papel no Sistema

Este documento descreve a funcionalidade e estrutura esperada para o script `src/public/meta-pixel-script.js`. Este script é o único componente instalado diretamente nos sites dos clientes e atua como a ponte entre o navegador do usuário, o Pixel do Facebook e o nosso backend (`/track`).

Seu objetivo principal é coletar dados brutos relevantes no navegador e enviá-los para dois destinos:

1.  **Pixel do Facebook (`fbq`):** Para rastreamento no lado do cliente, correspondência inicial e Advanced Matching (o próprio `fbq` lida com o hashing necessário para isso). Utiliza nomes de eventos padrão do Facebook (e.g., `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`).
2.  **Backend (`POST /track`):** Para processamento server-side, enriquecimento (GeoIP), normalização, hashing PII e envio final para a Meta CAPI. Usa os mesmos nomes de eventos e `eventId` do Pixel para desduplicação.

Este script **NÃO** deve realizar chamadas externas de GeoIP, hashing de PII ou normalização complexa de dados, pois essas tarefas são de responsabilidade do backend.

## 🏗️ Estrutura e Funcionalidades Essenciais

O script deve implementar as seguintes funcionalidades:

### 1. Coleta de Dados Brutos

*   **Informações da Página:** Obter `window.location.href`, `document.title`, `document.referrer`.
*   **Informações do Navegador:** Obter `navigator.userAgent`, `navigator.language`.
*   **Dados do Usuário (Storage):** Ler dados persistidos no `localStorage` ou cookies first-party, como e-mail, telefone, nome, endereço (se disponíveis e consentidos) e identificadores (`external_id`, `_mtVisitorId`).
*   **Dados de Eventos Específicos:** Extrair dados do DOM, `dataLayer` (se disponível) ou de variáveis JavaScript presentes na página, relevantes para eventos **padrão** do Facebook (ex: detalhes de produto em `ViewContent`, dados do carrinho em `InitiateCheckout`/`AddToCart`, `order_id` e valores em `Purchase`, `search_string` em `Search`). A extração deve popular os parâmetros padrão do FB (`content_ids`, `contents`, `value`, `currency`, `num_items`, etc.).

### 2. Gerenciamento de IDs

*   **Obter Cookies do Facebook:** Ler os cookies `_fbp` e `_fbc`.
*   **Validar/Formatar FBP:** Aplicar a lógica de validação para garantir que o `fbp` esteja no formato correto (`fb.1.timestamp.random`) antes de usá-lo. Gerar um se inválido ou ausente.
*   **Gerar/Obter `external_id`:** Priorizar a leitura de um ID de usuário do `localStorage` (`meta_tracking_external_id`). Se não existir, gerar um ID único e persisti-lo no `localStorage`.
*   **Gerar/Obter `visitorId` (Opcional, mas recomendado):** Usar um cookie first-party (ex: `_mtVisitorId`) para rastrear visitantes únicos de forma mais robusta. Gerar um UUID se o cookie não existir.
*   **Gerar `eventId`:** Criar um UUID v4 único para cada evento enviado ao `fbq` (exceto `PageView` automático do `init`) e ao backend (`/track`) para fins de desduplicação.

### 3. Interação com o Pixel Facebook (`fbq`)

*   **Carregamento:** Incluir o código padrão para carregar assincronamente o `fbevents.js`.
*   **Inicialização (`fbq('init')`):**
    *   Chamar `fbq('init', PIXEL_ID, advancedMatchingParams)` **uma vez** no carregamento da página. Esta chamada dispara automaticamente um evento `PageView`.
    *   O objeto `advancedMatchingParams` deve conter os dados PII e identificadores coletados **sem hash** (ex: `{ em: 'user@example.com', ph: '123456789', fn: 'john', ..., fbp: 'fb.1...', fbc: 'fb.1...', external_id: 'ext123' }`). O `fbq` fará o hashing necessário internamente.
*   **Rastreamento (`fbq('track')`):**
    *   **Não** chamar `fbq('track', 'PageView')` explicitamente, pois o `init` já o faz.
    *   Para outros eventos padrão (ex: `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`), chamar `fbq('track', eventName, eventParams, { eventID: eventId })`.
    *   Os dados em `eventParams` (ex: `value`, `currency`, `content_name`, `content_ids`, `contents`, `num_items`) devem ser passados **sem hash** e usando os nomes de parâmetros padrão do Facebook.

### 4. Comunicação com o Backend (`POST /track`)

*   **Função de Envio (`sendEventToBackend`):** Implementar uma função assíncrona (`sendEventToBackend`) responsável por enviar os dados para o endpoint `POST /track` do backend. Esta função é chamada pela `sendEvent` principal.
*   **Payload JSON Bruto:** Esta função deve montar um objeto JSON contendo os dados **brutos e não hasheados** coletados, conforme a estrutura esperada pelo `TrackController` no backend, utilizando o mesmo `eventId` enviado ao `fbq`.
*   **Estrutura do Payload (Exemplo `InitiateCheckout`):**
    ```json
    {
      "eventName": "InitiateCheckout", // Nome do evento padrão FB
      "eventId": "uuid-gerado-no-frontend-igual-ao-do-fbq",
      "sourceUrl": "url-da-pagina-atual",
      "referrer": "url-de-referencia",
      "userData": {
        "external_id": "id-do-usuario-sem-hash",
        "visitorId": "id-do-cookie-first-party",
        "fbp": "valor_fbp_validado",
        "fbc": "valor_fbc",
        "em": "email_sem_hash",
        "ph": "telefone_sem_hash",
        "fn": "primeiro_nome_sem_hash",
        "ln": "sobrenome_sem_hash",
        "ge": "genero_sem_hash",
        "db": "data_nasc_sem_hash",
        "ct": "cidade_sem_hash",
        "st": "estado_sem_hash",
        "zp": "cep_sem_hash_ou_normalizado",
        "country": "pais_sem_hash"
        // NÃO incluir client_ip_address ou client_user_agent aqui
      },
      "customData": {
        // Parâmetros padrão do FB para o evento específico
        "content_ids": ["sku1", "sku2"], // Array de IDs dos produtos
        "contents": [ // Array de objetos detalhando os itens
          { "id": "sku1", "quantity": 1, "item_price": 59.90 },
          { "id": "sku2", "quantity": 2, "item_price": 30.00 }
        ],
        "value": 119.90, // Valor total do carrinho/checkout
        "currency": "BRL",
        "num_items": 3, // Número total de itens
        "content_name": "View Cart", // Nome descritivo da ação/página
        "content_type": "cart", // Tipo de conteúdo associado
        "language": "pt-BR",
        "app": "meta-tracking"
        // ... outros parâmetros padrão relevantes (ex: search_string para Search)
      }
      // Pode incluir dataProcessingOptions se aplicável
    }
    ```
*   **Requisição:** Usar `fetch` com `keepalive: true` para enviar este payload JSON via `POST` para a `API_URL` (`.../track`).

## ❌ Funcionalidades Excluídas

O script **NÃO DEVE** (sem alterações nesta seção):

*   Fazer chamadas a APIs externas de GeoIP.
*   Implementar ou chamar funções de hashing SHA-256 para PII.
*   Realizar normalização complexa de dados (ex: remoção de acentos, conversão de caixa) que seja responsabilidade do backend.

## ✨ Exemplo da Função de Envio para Backend (Refatorada)

```javascript
// URL do endpoint backend
const API_URL = 'https://rastreamento-meta.onrender.com/track';

// Função auxiliar para enviar dados brutos para o backend /track
// Recebe dados já coletados e o eventId gerado pela função sendEvent principal
async function sendEventToBackend(eventName, rawUserData = {}, specificCustomData = {}, eventId) {
  console.log(`[Frontend Script] Preparando envio para backend: ${eventName} (ID: ${eventId})`);

  // rawUserData já contém PII, external_id, fbp, fbc, visitorId, etc.
  // specificCustomData contém os parâmetros específicos do evento (value, content_ids, etc.)

  const payload = {
      eventName: eventName, // Nome do evento padrão (ex: InitiateCheckout)
      eventId: eventId,     // Mesmo ID usado no fbq('track')
      sourceUrl: window.location.href,
      referrer: document.referrer || '',
      userData: rawUserData, // Dados do usuário não hasheados
      customData: {
          ...specificCustomData, // Parâmetros padrão do evento
          language: navigator.language || 'pt-BR', // Adiciona idioma
          app: 'meta-tracking' // Identifica a origem
      }
  };

  // Remover chaves nulas/undefined do payload para limpeza
  Object.keys(payload.userData).forEach(key => payload.userData[key] == null && delete payload.userData[key]);
  Object.keys(payload.customData).forEach(key => payload.customData[key] == null && delete payload.customData[key]);

  // Enviar para /track
  try {
      console.log('[Frontend Script] Enviando payload bruto para /track:', JSON.stringify(payload).substring(0, 500) + '...'); // Log truncado
      const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          keepalive: true // Importante para enviar em unload/pagehide
      });
      if (!response.ok) {
          console.error(`[Frontend Script] Erro ao enviar evento ${eventName} para backend: ${response.status} ${response.statusText}`);
      }
  } catch (error) {
      console.error(`[Frontend Script] Falha na requisição fetch para ${eventName}:`, error);
  }
}

// Exemplo de como a função sendEvent principal chamaria sendEventToBackend
async function sendEvent(eventName, customData = {}) {
  try {
    console.log(`[Frontend Script] Disparando evento: ${eventName}`);
    const eventId = generateUUID(); // Gera ID único

    // Coleta IDs e Dados do Usuário (funções auxiliares omitidas por brevidade)
    const allRawUserData = { /* ... coletar fbp, fbc, PII, externalId, visitorId ... */ };

    // Envia para FBQ (função fbq omitida por brevidade)
    if (typeof fbq === 'function') {
        fbq('track', eventName, customData, { eventID: eventId });
        console.log(`[Frontend Script] fbq('track', '${eventName}') chamado com eventID: ${eventId}`, customData);
    }

    // Envia para Backend com os mesmos dados e eventId
    await sendEventToBackend(eventName, allRawUserData, customData, eventId);

  } catch (error) {
    console.error(`[Frontend Script] Erro geral na função sendEvent para ${eventName}:`, error);
  }
}
```

## 🚦 Implementação e Testes

1.  Implementar o `src/public/meta-pixel-script.js` seguindo esta especificação. **(Concluído, requer ajustes nos seletores DOM)**.
2.  Testar o fluxo completo **no site do cliente**:
    *   Verificar a chamada `fbq('init')` (com Advanced Matching) e as chamadas `fbq('track', eventName, params, {eventId})` para outros eventos padrão no console/Pixel Helper.
    *   Validar que os **parâmetros** em `fbq('track')` (`content_ids`, `contents`, `value`, `currency`, `num_items`, etc.) estão corretos e usam a nomenclatura padrão.
    *   Verificar o payload enviado para `/track` na aba Network, garantindo que `eventName`, `eventId`, `userData` e `customData` (com parâmetros padrão) estão corretos e não hasheados.
    *   Verificar os logs do backend para confirmar o recebimento, processamento (GeoIP, Hashing) e envio para a CAPI.
    *   Monitorar o Gerenciador de Eventos do Facebook para verificar a correta recepção e desduplicação dos eventos (usando o `eventId`).
3.  **Ajustar Seletores DOM:** Modificar os seletores marcados com `// AJUSTAR...` no script para corresponderem à estrutura HTML real do site do cliente. 