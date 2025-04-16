# Especificação do Script Frontend (`meta-pixel-script.js`)

**Última Atualização:** [Data Atual]

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

    **Backend (Servidor - `meta-tracking`):**
    *   **Linguagem/Stack:** Node.js / TypeScript
    *   **Repositório:** [https://github.com/marcioabreuba/Rastreamento_Meta.git](https://github.com/marcioabreuba/Rastreamento_Meta.git)
    *   **Hospedagem:** Render.com (deploy automático do branch `master`)
    *   **URL Base:** `https://rastreamento-meta.onrender.com/`

## 🎯 Objetivo e Papel no Sistema

Este documento descreve a funcionalidade e estrutura esperada para o script `src/public/meta-pixel-script.js`. Este script é o único componente instalado diretamente nos sites dos clientes e atua como a ponte entre o navegador do usuário, o Pixel do Facebook e o nosso backend (`/track`).

Seu objetivo principal é coletar dados brutos relevantes no navegador e enviá-los para dois destinos:

1.  **Pixel do Facebook (`fbq`):** Para rastreamento no lado do cliente, correspondência inicial e Advanced Matching (o próprio `fbq` lida com o hashing necessário para isso).
2.  **Backend (`POST /track`):** Para processamento server-side, enriquecimento (GeoIP), normalização, hashing PII e envio final para a Meta CAPI.

Este script **NÃO** deve realizar chamadas externas de GeoIP, hashing de PII ou normalização complexa de dados, pois essas tarefas são de responsabilidade do backend.

## 🏗️ Estrutura e Funcionalidades Essenciais

O script deve implementar as seguintes funcionalidades:

### 1. Coleta de Dados Brutos

*   **Informações da Página:** Obter `window.location.href`, `document.title`, `document.referrer`.
*   **Informações do Navegador:** Obter `navigator.userAgent`, `navigator.language`.
*   **Dados do Usuário (Storage):** Ler dados persistidos no `localStorage` ou cookies first-party, como e-mail, telefone, nome, endereço (se disponíveis e consentidos) e identificadores (`external_id`, `_mtVisitorId`).
*   **Dados de Eventos Específicos:** Extrair dados do DOM ou de variáveis JavaScript presentes na página, relevantes para eventos específicos (ex: detalhes de produto em `ViewContent`, dados do carrinho em `ViewCart`/`AddToCart`, `order_id` e valores em `Purchase`, `search_string` em `Search`).

### 2. Gerenciamento de IDs

*   **Obter Cookies do Facebook:** Ler os cookies `_fbp` e `_fbc`.
*   **Validar/Formatar FBP:** Aplicar a lógica de validação para garantir que o `fbp` esteja no formato correto (`fb.1.timestamp.random`) antes de usá-lo.
*   **Gerar/Obter `external_id`:** Priorizar a leitura de um ID de usuário do `localStorage` (`meta_tracking_external_id`). Se não existir, gerar um ID único e persisti-lo no `localStorage`.
*   **Gerar/Obter `visitorId` (Opcional, mas recomendado):** Usar um cookie first-party (ex: `_mtVisitorId`) para rastrear visitantes únicos de forma mais robusta. Gerar um UUID se o cookie não existir.
*   **Gerar `eventId`:** Criar um UUID v4 único para cada evento enviado ao backend (`/track`) para fins de desduplicação.

### 3. Interação com o Pixel Facebook (`fbq`)

*   **Carregamento:** Incluir o código padrão para carregar assincronamente o `fbevents.js`.
*   **Inicialização (`fbq('init')`):**
    *   Chamar `fbq('init', PIXEL_ID, advancedMatchingParams)` **uma vez** no carregamento da página.
    *   O objeto `advancedMatchingParams` deve conter os dados PII e identificadores coletados **sem hash** (ex: `{ em: 'user@example.com', ph: '123456789', fn: 'john', ..., fbp: 'fb.1...', fbc: 'fb.1...', external_id: 'ext123' }`). O `fbq` fará o hashing necessário internamente.
*   **Rastreamento (`fbq('track')`):**
    *   Chamar `fbq('track', 'PageView', pageViewCustomData)` logo após o `init`.
    *   Para outros eventos (ex: `ViewContent`, `AddToCart`, `Purchase`), chamar `fbq('track', eventName, eventCustomData)`.
    *   Os dados em `eventCustomData` (ex: `value`, `currency`, `content_name`, `content_ids`) devem ser passados **sem hash**.

### 4. Comunicação com o Backend (`POST /track`)

*   **Função de Envio (`sendEvent`):** Implementar uma função assíncrona (`sendEvent`) responsável por enviar os dados para o endpoint `POST /track` do backend.
*   **Payload JSON Bruto:** Esta função deve montar um objeto JSON contendo os dados **brutos e não hasheados** coletados, conforme a estrutura esperada pelo `TrackController` no backend.
*   **Estrutura do Payload:**
    ```json
    {
      "eventName": "NomeDoEvento",
      "eventId": "uuid-gerado-no-frontend",
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
        "zp": "cep_sem_hash_ou_normalizado", // Normalização de CEP pode ocorrer aqui ou no backend
        "country": "pais_sem_hash"
        // NÃO incluir client_ip_address ou client_user_agent aqui (backend obtém da requisição)
      },
      "customData": {
        "value": 123.45, // Exemplo
        "currency": "BRL",
        "order_id": "order123", // Exemplo
        "content_name": "Nome do Produto", // Exemplo
        "content_ids": ["sku1", "sku2"],
        "language": "pt-BR", // Exemplo (navigator.language)
        "app": "meta-tracking",
        // ... outros dados específicos do evento
      }
      // Pode incluir dataProcessingOptions se aplicável
    }
    ```
*   **Requisição:** Usar `fetch` para enviar este payload JSON via `POST` para a `API_URL` (`.../track`).

## ❌ Funcionalidades Excluídas

O script **NÃO DEVE**:

*   Fazer chamadas a APIs externas de GeoIP.
*   Implementar ou chamar funções de hashing SHA-256 para PII.
*   Realizar normalização complexa de dados (ex: remoção de acentos, conversão de caixa) que seja responsabilidade do backend.

## ✨ Exemplo da Função de Envio para Backend

```javascript
// URL do endpoint backend (deve vir de uma constante no topo do script)
const API_URL = 'https://rastreamento-meta.onrender.com/track';

async function sendEventToBackend(eventName, specificCustomData = {}) {
  console.log(`[Frontend Script] Preparando envio para backend: ${eventName}`);

  // 1. Coletar Dados Gerais e IDs (funções auxiliares como getCookie, getExternalId, etc.)
  const visitorId = getOrCreateVisitorId();
  const externalId = getExternalId();
  const fbp = validateFbp(getCookie('_fbp'));
  const fbc = getCookie('_fbc') || getUrlParameter('fbclid');
  const eventId = generateUUID();

  // 2. Coletar Dados do Usuário (sem hash)
  const rawUserData = {
      external_id: externalId,
      visitorId: visitorId,
      fbp: fbp,
      fbc: fbc,
      em: localStorage.getItem('meta_tracking_email'),
      ph: localStorage.getItem('meta_tracking_phone'),
      fn: localStorage.getItem('meta_tracking_first_name'),
      ln: localStorage.getItem('meta_tracking_last_name'),
      ge: localStorage.getItem('meta_tracking_gender'),
      db: localStorage.getItem('meta_tracking_dob'),
      // Geo (opcional enviar o que tiver localmente, sem hash)
      ct: localStorage.getItem('meta_tracking_city'),
      st: localStorage.getItem('meta_tracking_state'),
      zp: normalizeBrazilianZipCode(localStorage.getItem('meta_tracking_zip'), localStorage.getItem('meta_tracking_country')), // Exemplo de normalização local OPCIONAL
      country: localStorage.getItem('meta_tracking_country')
  };

  // 3. Montar Payload Bruto
  const payload = {
    eventName: eventName,
    eventId: eventId,
    sourceUrl: window.location.href,
    referrer: document.referrer || '',
    userData: rawUserData,
    customData: {
      ...specificCustomData,
      language: navigator.language || 'pt-BR',
      app: 'meta-tracking'
    }
  };

  // Remover chaves nulas/undefined do payload para limpeza
  Object.keys(payload.userData).forEach(key => payload.userData[key] == null && delete payload.userData[key]);
  Object.keys(payload.customData).forEach(key => payload.customData[key] == null && delete payload.customData[key]);

  // 4. Enviar para /track
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
```

## 🚦 Implementação e Testes

1.  Implementar o `src/public/meta-pixel-script.js` seguindo esta especificação.
2.  Testar o fluxo completo:
    *   Verificar as chamadas `fbq('init')` e `fbq('track')` no console do navegador (usando extensões como Meta Pixel Helper).
    *   Verificar o payload enviado para `/track` na aba Network do navegador.
    *   Verificar os logs do backend para confirmar o recebimento, processamento (GeoIP, Hashing) e envio para a CAPI.
    *   Monitorar o Gerenciador de Eventos do Facebook para verificar a correta recepção e desduplicação dos eventos. 