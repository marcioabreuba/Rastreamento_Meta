/**
 * PADRÃO CORRETO DE DESDUPLICAÇÃO
 * 
 * O eventID DEVE ser gerado no backend (single source of truth)
 * e retornado para o frontend usar no fbq()
 */

// ❌ ERRADO - Gerar eventID no frontend
async function sendEventWrong(eventName, customData) {
    const eventId = generateUUID(); // Frontend gera
    
    // Problema: fbq() executa imediatamente
    fbq('track', eventName, customData, { eventID: eventId });
    
    // Backend pode processar depois (race condition)
    setTimeout(() => {
        sendEventToBackend(eventName, userData, customData, eventId);
    }, 150); // Timing não garantido!
}

// ✅ CORRETO - Backend gera eventID
async function sendEventCorrect(eventName, customData) {
    try {
        // 1. Enviar dados para backend primeiro
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventName,
                userData: getUserData(),
                customData
                // NÃO envia eventID - backend vai gerar
            })
        });

        const responseData = await response.json();
        const serverEventID = responseData.eventID; // Backend gerou

        // 2. Só chamar fbq() DEPOIS de receber eventID
        if (serverEventID) {
            fbq('track', eventName, customData, { 
                eventID: serverEventID // Usa o ID do backend
            });
            console.log(`✅ Evento ${eventName} enviado com ID: ${serverEventID}`);
        } else {
            console.warn(`❌ Backend não retornou eventID para ${eventName}`);
        }

    } catch (error) {
        console.error(`❌ Erro ao enviar evento ${eventName}:`, error);
    }
}

/**
 * BACKEND DEVE FAZER:
 * 
 * 1. Receber dados do frontend
 * 2. Gerar eventID único
 * 3. Enviar para Facebook CAPI com eventID
 * 4. Retornar eventID para frontend
 * 5. Frontend usa mesmo eventID no fbq()
 * 
 * RESULTADO: Desduplicação perfeita!
 */ 