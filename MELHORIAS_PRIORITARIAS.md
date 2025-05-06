# Lista de Prioridades para Melhorias no Sistema de Tracking Meta

Este documento descreve as áreas prioritárias para correção e melhoria no sistema de rastreamento da API de Conversões do Meta, com base na análise comparativa com as diretrizes oficiais (`meta.md`).

## Prioridade Alta

### 1. Precisão do `event_time`
    - **Problema Identificado:** Atualmente, o `event_time` é definido no backend (`NormalizationService.ts`) usando `Math.floor(Date.now() / 1000)`, o que reflete o tempo de processamento no servidor, e não o momento exato da ocorrência do evento no cliente.
    - **Requisito `meta.md`:** "O parâmetro `event_time` é o horário de transação do evento. O horário especificado pode ser anterior ao horário em que você enviou o evento para o Facebook." A não conformidade pode afetar a atribuição e a análise de dados, além do risco de rejeição se houver grandes atrasos no processamento (regra dos 7 dias, embora improvável com `Date.now()`).
    - **Ação Recomendada:**
        - Modificar os scripts do frontend (`src/public/meta-pixel-script.js` e, se aplicável, `src/public/meta-tracking-advanced.js`) para capturar o timestamp (Unix em segundos) no momento em que o evento ocorre no navegador.
        - Enviar este timestamp (ex: como `client_event_time`) no payload para o endpoint `/track`.
        - Modificar o `TrackController.ts` para receber este `client_event_time`.
        - Modificar o `NormalizationService.ts` (dentro de `normalizeEventForCAPI`) para usar o `client_event_time` recebido como o valor principal para o campo `event_time` da CAPI. Manter `Math.floor(Date.now() / 1000)` como um fallback apenas se o timestamp do cliente não estiver disponível ou for inválido.
    - **Impacto Esperado:** Maior precisão nos dados de eventos, melhor alinhamento com as diretrizes do Facebook, e dados de atribuição mais confiáveis.

### 2. Consistência e Robustez do `event_id` para Desduplicação
    - **Problema Identificado:** O `NormalizationService.ts` define `event_id: rawEvent.eventId || null`. Embora os scripts de frontend pareçam gerar um `eventId`, se ele falhar em chegar ao backend ou for nulo por algum motivo, um `null` será enviado para a CAPI.
    - **Requisito `meta.md`:** A desduplicação entre o Pixel e a CAPI depende criticamente da consistência do `event_name` e do `event_id`. Um `event_id` nulo impede essa desduplicação.
    - **Ação Recomendada:**
        - **Frontend:** Reforçar nos scripts (`src/public/meta-pixel-script.js` e `src/public/meta-tracking-advanced.js`) a geração **obrigatória** de um `eventId` (UUID v4) para cada evento enviado ao backend.
        - **Backend (`NormalizationService.ts`):** Modificar a lógica para:
            ```typescript
            event_id: rawEvent.eventId || generateEventId(), // Onde generateEventId() é a função já existente que cria um UUID
            ```
            Isso garante que, mesmo se o frontend falhar em enviar um `eventId`, o backend gerará um, assegurando que `event_id` nunca seja `null` na chamada CAPI. Logar um aviso se um `eventId` do backend teve que ser gerado.
    - **Impacto Esperado:** Melhoria significativa na capacidade de desduplicação do Facebook, levando a relatórios mais precisos e evitando a contagem dupla de eventos.

## Prioridade Média

### 3. Revisão dos Handlers de Eventos Específicos
    - **Contexto:** O `TrackController.ts` utiliza handlers de evento específicos (ex: `PurchaseHandler.ts`, `ViewContentHandler.ts`). A estrutura é boa.
    - **Requisito `meta.md`:** Cada evento padrão (Purchase, ViewContent, AddToCart, etc.) possui um conjunto específico de parâmetros recomendados/obrigatórios (ex: `value`, `currency`, `content_ids`, `num_items`).
    - **Ação Recomendada:**
        - Revisar cada arquivo de handler de evento em `src/App/events/`.
        - Para cada handler, comparar os `customData` e `userData` que ele prepara com os parâmetros listados para o evento correspondente no arquivo `meta.md`.
        - Garantir que todos os parâmetros relevantes e disponíveis estejam sendo coletados e formatados corretamente (ex: `contents` para `AddToCart` e `Purchase`, `order_id` para `Purchase`).
        - Verificar se os nomes dos campos em `customData` estão alinhados com o que `NormalizationService.normalizeCustomData` espera (ele já converte para snake_case, mas a origem deve ser consistente).
    - **Impacto Esperado:** Garantia de que todos os dados relevantes para cada tipo de evento estão sendo enviados, maximizando a qualidade dos dados para otimização de anúncios e relatórios.

### 4. Verificação do Token de Acesso no Deploy
    - **Contexto:** O `src/config/index.ts` define `fbAccessToken: process.env.FB_ACCESS_TOKEN || ''`.
    - **Risco:** Se a variável de ambiente `FB_ACCESS_TOKEN` não for configurada no ambiente de produção, as chamadas para a CAPI serão puladas silenciosamente (o `CapiService` loga um erro e retorna `skipped`).
    - **Ação Recomendada:**
        - Implementar uma verificação no início da aplicação (ex: no `src/index.ts` ou no momento de inicialização do servidor) que garanta que `config.fbAccessToken` não seja uma string vazia em ambientes de produção.
        - Se estiver vazio em produção, a aplicação deve logar um erro crítico e, idealmente, falhar ao iniciar ou emitir um alerta muito visível. Isso evita que o sistema rode sem enviar dados para a CAPI.
        - Manter a checagem atual no `CapiService.ts` como uma segunda barreira.
    - **Impacto Esperado:** Maior robustez e prevenção de falhas silenciosas de integração em produção devido à ausência do token de acesso.

## Prioridade Baixa (Otimizações e Refinamentos)

### 5. Expansão do `action_source` (se necessário)
    - **Contexto:** Atualmente, `action_source` é `'website'` ou `'app'`.
    - **Requisito `meta.md`:** Menciona outras fontes como "physical_store", "chat".
    - **Ação Recomendada:**
        - Avaliar se existem ou existirão no futuro eventos originados de outras fontes além de "website" ou "app".
        - Se sim, planejar como o frontend (ou outra origem de dados) indicaria essa `action_source` e como o `NormalizationService.ts` a utilizaria. Isso pode envolver adicionar um campo ao payload enviado para `/track`.
    - **Impacto Esperado:** Flexibilidade para suportar futuras fontes de eventos, mantendo a conformidade.

### 6. Considerar Envio em Lote para CAPI (Opcional, Baixa Prioridade)
    - **Contexto:** Atualmente, os eventos são enviados individualmente para a CAPI.
    - **Requisito `meta.md`:** Permite o envio de até 1.000 eventos em lote.
    - **Ação Recomendada:**
        - Apenas considerar se o volume de eventos for extremamente alto e houver gargalos de performance ou limites de taxa de API.
        - A implementação atual de envio individual é geralmente preferível para atualidade dos dados.
        - Se implementado, requer cuidado para não ter o lote inteiro rejeitado por um único evento inválido, conforme `meta.md`.
    - **Impacto Esperado:** Potencial otimização de chamadas de rede em cenários de altíssimo volume.

## Já Conforme / Boas Práticas Implementadas (Não Requer Ação)

*   **Endpoint e Método HTTP para CAPI:** Correto.
*   **Estrutura Geral do Payload CAPI (`data: [event]`):** Correto.
*   **Hashing SHA256 de Campos PII:** Correto e com boa normalização prévia.
*   **Campos Não Hasheados (`client_ip_address`, `client_user_agent`, `fbp`, `fbc`):** Corretos.
*   **Modularidade do Código (Serviços, Controladores, Config):** Excelente.
*   **Uso de TypeScript:** Excelente.
*   **Configuração via Variáveis de Ambiente:** Correto.
*   **Tratamento de IP (Formato IPv6):** Correto.
*   **Geolocalização (MaxMind):** Implementado.
*   **Normalização de `custom_data` (snake_case, tipos):** Boas práticas.

Este documento deve servir como um guia para as próximas etapas de desenvolvimento e refinamento do sistema de tracking. 