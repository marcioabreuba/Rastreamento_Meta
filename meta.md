Enviar eventos pela API
Quando tiver um token de acesso, escolha quais eventos você quer enviar do seu servidor, crie sua carga e faça solicitações. Sua carga incluirá informações sobre os eventos e parâmetros que deseja enviar.
Fazer uma solicitação POST
Para enviar novos eventos, faça uma solicitação POST para a borda /events dessa API por este caminho: https://graph.facebook.com/{API_VERSION}/{PIXEL_ID}/events?access_token={TOKEN}.
Quando você publica nessa borda, o Facebook cria novos eventos de servidor.
Saiba mais
Recursos
Lista de eventos padrão
Parâmetros do evento
Parâmetros de dados do usuário
Parâmetros de dados personalizados

---

Criar uma carga
Veja como sua carga deve ser estruturada e verifique se há erros estruturais usando o Payload Helper para criar uma carga de amostra para seus eventos.
{
    "data": [
        {
            "event_name": "Purchase",
            "event_time": 1746567891,
            "action_source": "website",
            "user_data": {
                "em": [
                    "7b17fb0bd173f625b58636fb796407c22b3d16fc78302d79f0fd30c2fc2fc068"
                ],
                "ph": [
                    null
                ]
            },
            "attribution_data": {
                "attribution_share": "0.3"
            },
            "custom_data": {
                "currency": "USD",
                "value": "142.52"
            },
            "original_event_data": {
                "event_name": "Purchase",
                "event_time": 1746567891
            }
        }
    ]
}

URL exemplo
https://developers.facebook.com/docs/marketing-api/conversions-api/payload-helper

---

Incluir eventos e parâmetros selecionados em sua carga
Seu colega definiu os eventos e parâmetros necessários para uma configuração completa da API de Conversões.
Configurar o evento RegisterDone
Fale com o seu parceiro de marketing para determinar quando esse evento deve ser enviado.
Parâmetros do evento
Identificação do evento
Tipo de conteúdo
Recusar
Fonte da ação
Opções de processamento de dados
Número de itens
Nome do evento
URL de origem do evento
Moeda
Valor
Hora do evento
IDs de conteúdo
Estado das opções de processamento de dados
Conteúdo
País das opções de processamento de dados
Parâmetros de informações do cliente
Email
Telefone
Gênero
Data de nascimento
Sobrenome
Nome
Cidade
Estado
Código postal
País
Identificação externa
Endereço IP do cliente — Não converter em hash
Agente de usuário do cliente — Não converter em hash
Cookie de ID de clique (fbc) — Não converter em hash
Cookie de ID do navegador (fbp) — Não converter em hash
Identificação da assinatura — Não converter em hash
Configurar o evento StartCheckout
Fale com o seu parceiro de marketing para determinar quando esse evento deve ser enviado.
Parâmetros do evento
Tipo de conteúdo
Conteúdo
Moeda
Valor
Hora do evento
Nome do evento
URL de origem do evento
Fonte da ação
Parâmetros de informações do cliente
Estado
Sobrenome
Agente de usuário do cliente — Não converter em hash
Email
Nome
Cidade
Código postal
Telefone
Configurar o evento ViewCart
Fale com o seu parceiro de marketing para determinar quando esse evento deve ser enviado.
Parâmetros do evento
Tipo de conteúdo
Fonte da ação
Número de itens
Nome do evento
URL de origem do evento
Moeda
Valor
Hora do evento
IDs de conteúdo
Conteúdo
Parâmetros de informações do cliente
Estado
Sobrenome
Agente de usuário do cliente — Não converter em hash
Email
Nome
Cidade
Código postal
Telefone
Configurar o evento PageView
Fale com o seu parceiro de marketing para determinar quando esse evento deve ser enviado.
Parâmetros do evento
Identificação do evento
Recusar
Fonte da ação
Opções de processamento de dados
Nome do evento
URL de origem do evento
Hora do evento
Estado das opções de processamento de dados
País das opções de processamento de dados
Parâmetros de informações do cliente
Email
Telefone
Gênero
Data de nascimento
Sobrenome
Nome
Cidade
Estado
Código postal
País
Identificação externa
Endereço IP do cliente — Não converter em hash
Agente de usuário do cliente — Não converter em hash
Cookie de ID de clique (fbc) — Não converter em hash
Cookie de ID do navegador (fbp) — Não converter em hash
Identificação da assinatura — Não converter em hash
Configurar o evento Scroll_25
Fale com o seu parceiro de marketing para determinar quando esse evento deve ser enviado.
Parâmetros do evento
Hora do evento
Nome do evento
URL de origem do evento
Fonte da ação
Parâmetros de informações do cliente
Estado
Sobrenome
Agente de usuário do cliente — Não converter em hash
Email
Nome
Cidade
Código postal
Telefone
Configurar o evento ViewHome
Fale com o seu parceiro de marketing para determinar quando esse evento deve ser enviado.
Parâmetros do evento
Hora do evento
Nome do evento
URL de origem do evento
Fonte da ação
Parâmetros de informações do cliente
Estado
Sobrenome
Agente de usuário do cliente — Não converter em hash
Email
Nome
Cidade
Código postal
Telefone
Configurar o evento Timer_1min
Fale com o seu parceiro de marketing para determinar quando esse evento deve ser enviado.
Parâmetros do evento
Hora do evento
Nome do evento
URL de origem do evento
Fonte da ação
Parâmetros de informações do cliente
Estado
Sobrenome
Agente de usuário do cliente — Não converter em hash
Email
Nome
Cidade
Código postal
Telefone
Configurar o evento Adicionar informações de pagamento
A adição das informações de pagamento do cliente durante um processo de finalização da compra.
Parâmetros do evento
Identificação do evento
Tipo de conteúdo
Recusar
Fonte da ação
Opções de processamento de dados
Número de itens
Nome do evento
URL de origem do evento
Moeda
Valor
Hora do evento
IDs de conteúdo
Estado das opções de processamento de dados
Conteúdo
País das opções de processamento de dados
Parâmetros de informações do cliente
Email
Telefone
Gênero
Data de nascimento
Sobrenome
Nome
Cidade
Estado
Código postal
País
Identificação externa
Endereço IP do cliente — Não converter em hash
Agente de usuário do cliente — Não converter em hash
Cookie de ID de clique (fbc) — Não converter em hash
Cookie de ID do navegador (fbp) — Não converter em hash
Identificação da assinatura — Não converter em hash
Configurar o evento ViewList
Fale com o seu parceiro de marketing para determinar quando esse evento deve ser enviado.
Parâmetros do evento
Hora do evento
Nome do evento
URL de origem do evento
Fonte da ação
Parâmetros de informações do cliente
Estado
Sobrenome
Agente de usuário do cliente — Não converter em hash
Email
Nome
Cidade
Código postal
Telefone
Configurar o evento Pesquisar
Uma pesquisa feita no seu site, aplicativo ou outra propriedade (por exemplo: pesquisa de produtos ou viagens).
Parâmetros do evento
Identificação do evento
Recusar
Fonte da ação
Opções de processamento de dados
Nome do evento
URL de origem do evento
Hora do evento
Estado das opções de processamento de dados
País das opções de processamento de dados
Parâmetros de informações do cliente
Email
Telefone
Gênero
Data de nascimento
Sobrenome
Nome
Cidade
Estado
Código postal
País
Identificação externa
Endereço IP do cliente — Não converter em hash
Agente de usuário do cliente — Não converter em hash
Cookie de ID de clique (fbc) — Não converter em hash
Cookie de ID do navegador (fbp) — Não converter em hash
Identificação da assinatura — Não converter em hash
Configurar o evento ShippingLoaded
Fale com o seu parceiro de marketing para determinar quando esse evento deve ser enviado.
Parâmetros do evento
Tipo de conteúdo
Fonte da ação
Número de itens
Nome do evento
URL de origem do evento
Moeda
Valor
Hora do evento
IDs de conteúdo
Conteúdo
Parâmetros de informações do cliente
Agente de usuário do cliente — Não converter em hash
Configurar o evento Adicionar ao carrinho
A adição de um item a um carrinho ou cesta de compras (por exemplo: clicar no botão "Adicionar ao carrinho" em um site).
Parâmetros do evento
Identificação do evento
Tipo de conteúdo
Recusar
Fonte da ação
Opções de processamento de dados
Número de itens
Nome do evento
URL de origem do evento
Moeda
Valor
Hora do evento
IDs de conteúdo
Estado das opções de processamento de dados
Conteúdo
País das opções de processamento de dados
Parâmetros de informações do cliente
Email
Telefone
Gênero
Data de nascimento
Sobrenome
Nome
Cidade
Estado
Código postal
País
Identificação externa
Endereço IP do cliente — Não converter em hash
Agente de usuário do cliente — Não converter em hash
Cookie de ID de clique (fbc) — Não converter em hash
Cookie de ID do navegador (fbp) — Não converter em hash
Identificação da assinatura — Não converter em hash
Configurar o evento AddCoupon
Fale com o seu parceiro de marketing para determinar quando esse evento deve ser enviado.
Parâmetros do evento
Identificação do evento
Tipo de conteúdo
Recusar
Fonte da ação
Opções de processamento de dados
Nome do evento
URL de origem do evento
Moeda
Valor
Hora do evento
Estado das opções de processamento de dados
Conteúdo
País das opções de processamento de dados
Parâmetros de informações do cliente
Email
Telefone
Gênero
Data de nascimento
Sobrenome
Nome
Cidade
Estado
Código postal
País
Identificação externa
Endereço IP do cliente — Não converter em hash
Agente de usuário do cliente — Não converter em hash
Cookie de ID de clique (fbc) — Não converter em hash
Cookie de ID do navegador (fbp) — Não converter em hash
Identificação da assinatura — Não converter em hash
Configurar o evento Purchase - pix
Fale com o seu parceiro de marketing para determinar quando esse evento deve ser enviado.
Parâmetros do evento
Identificação do evento
Tipo de conteúdo
Recusar
Fonte da ação
Opções de processamento de dados
Número de itens
Identificação do pedido
Nome do evento
URL de origem do evento
Moeda
Valor
Hora do evento
IDs de conteúdo
Estado das opções de processamento de dados
Conteúdo
País das opções de processamento de dados
Parâmetros de informações do cliente
Email
Telefone
Gênero
Data de nascimento
Sobrenome
Nome
Cidade
Estado
Código postal
País
Identificação externa
Endereço IP do cliente — Não converter em hash
Agente de usuário do cliente — Não converter em hash
Cookie de ID de clique (fbc) — Não converter em hash
Cookie de ID do navegador (fbp) — Não converter em hash
Identificação da assinatura — Não converter em hash
Configurar o evento Ver conteúdo
Uma visita a uma página de conteúdo importante para você, como uma página de produto, uma página de destino ou um artigo. As informações sobre a página visualizada podem ser passadas para o Facebook para uso em anúncios dinâmicos.
Parâmetros do evento
Identificação do evento
Tipo de conteúdo
Recusar
Fonte da ação
Opções de processamento de dados
Número de itens
Nome do evento
URL de origem do evento
Moeda
Valor
Hora do evento
IDs de conteúdo
Estado das opções de processamento de dados
Conteúdo
País das opções de processamento de dados
Parâmetros de informações do cliente
Email
Telefone
Gênero
Data de nascimento
Sobrenome
Nome
Cidade
Estado
Código postal
País
Identificação externa
Endereço IP do cliente — Não converter em hash
Agente de usuário do cliente — Não converter em hash
Cookie de ID de clique (fbc) — Não converter em hash
Cookie de ID do navegador (fbp) — Não converter em hash
Configurar o evento Purchase - high_ticket
Fale com o seu parceiro de marketing para determinar quando esse evento deve ser enviado.
Parâmetros do evento
Identificação do evento
Tipo de conteúdo
Recusar
Fonte da ação
Opções de processamento de dados
Identificação do pedido
Nome do evento
URL de origem do evento
Moeda
Valor
Hora do evento
Estado das opções de processamento de dados
Conteúdo
País das opções de processamento de dados
Parâmetros de informações do cliente
Email
Telefone
Gênero
Data de nascimento
Sobrenome
Nome
Cidade
Estado
País
Identificação externa
Endereço IP do cliente — Não converter em hash
Agente de usuário do cliente — Não converter em hash
Cookie de ID de clique (fbc) — Não converter em hash
Cookie de ID do navegador (fbp) — Não converter em hash
Identificação da assinatura — Não converter em hash
Configurar o evento Comprar
A conclusão de uma compra, normalmente indicada pelo recebimento do pedido, da confirmação de compra ou do recibo da transação.
Parâmetros do evento
Identificação do evento
Tipo de conteúdo
Recusar
Fonte da ação
Opções de processamento de dados
Número de itens
Identificação do pedido
Nome do evento
URL de origem do evento
Moeda
Valor
Hora do evento
IDs de conteúdo
Estado das opções de processamento de dados
Conteúdo
País das opções de processamento de dados
Parâmetros de informações do cliente
Email
Telefone
Gênero
Data de nascimento
Sobrenome
Nome
Cidade
Estado
Código postal
País
Identificação externa
Endereço IP do cliente — Não converter em hash
Agente de usuário do cliente — Não converter em hash
Cookie de ID de clique (fbc) — Não converter em hash
Cookie de ID do navegador (fbp) — Não converter em hash
Identificação da assinatura — Não converter em hash
Configurar o evento Iniciar finalização da compra
O início do processo de finalização da compra.
Parâmetros do evento
Identificação do evento
Tipo de conteúdo
Recusar
Fonte da ação
Opções de processamento de dados
Número de itens
Nome do evento
URL de origem do evento
Moeda
Valor
Hora do evento
IDs de conteúdo
Estado das opções de processamento de dados
Conteúdo
País das opções de processamento de dados
Parâmetros de informações do cliente
Email
Telefone
Gênero
Data de nascimento
Sobrenome
Nome
Cidade
Estado
Código postal
País
Identificação externa
Endereço IP do cliente — Não converter em hash
Agente de usuário do cliente — Não converter em hash
Cookie de ID de clique (fbc) — Não converter em hash
Cookie de ID do navegador (fbp) — Não converter em hash
Identificação da assinatura — Não converter em hash
Configurar o evento Purchase - credit_card
Fale com o seu parceiro de marketing para determinar quando esse evento deve ser enviado.
Parâmetros do evento
Identificação do evento
Tipo de conteúdo
Recusar
Fonte da ação
Opções de processamento de dados
Identificação do pedido
Nome do evento
URL de origem do evento
Moeda
Valor
Hora do evento
Estado das opções de processamento de dados
Conteúdo
País das opções de processamento de dados
Parâmetros de informações do cliente
Email
Telefone
Gênero
Data de nascimento
Sobrenome
Nome
Cidade
Estado
Código postal
País
Identificação externa
Endereço IP do cliente — Não converter em hash
Agente de usuário do cliente — Não converter em hash
Cookie de ID de clique (fbc) — Não converter em hash
Cookie de ID do navegador (fbp) — Não converter em hash
Identificação da assinatura — Não converter em hash
Configurar o evento Purchase - billet
Fale com o seu parceiro de marketing para determinar quando esse evento deve ser enviado.
Parâmetros do evento
Identificação do evento
Tipo de conteúdo
Recusar
Fonte da ação
Opções de processamento de dados
Identificação do pedido
Nome do evento
URL de origem do evento
Moeda
Valor
Hora do evento
Estado das opções de processamento de dados
Conteúdo
País das opções de processamento de dados
Parâmetros de informações do cliente
Email
Telefone
Gênero
Data de nascimento
Sobrenome
Nome
Cidade
Estado
Código postal
País
Identificação externa
Endereço IP do cliente — Não converter em hash
Agente de usuário do cliente — Não converter em hash
Cookie de ID de clique (fbc) — Não converter em hash
Cookie de ID do navegador (fbp) — Não converter em hash
Identificação da assinatura — Não converter em hash

---

Horário de transação do evento
O parâmetro event_time é o horário de transação do evento. O horário especificado pode ser anterior ao horário em que você enviou o evento para o Facebook. Se event_time for mais de 7 dias anterior ao horário atual, retornaremos um erro para toda a solicitação, e nenhum evento será processado. Saiba mais
Desduplicação de eventos de pixel e do servidor
O Facebook tenta desduplicar eventos idênticos enviados pelo pixel da Meta e a API de Conversões. Nós determinamos se os eventos são idênticos com base no nome e identificação do evento. Saiba mais
Envio de eventos em lote
Você pode enviar até 1.000 eventos como dados. Contudo, para ter o melhor desempenho possível, recomendamos que envie os eventos assim que eles ocorrerem. Se algum evento que você enviar em um lote for inválido, todo o lote será rejeitado. Saiba mais

---

Etapa 3: não se esqueça de monitorar as métricas do seu evento
Depois de enviar dados suficientes pela API de Conversões, você poderá monitorar 3 métricas que indicam a integridade dos seus eventos. A monitoração de cada métrica permite avaliar o desempenho e saber como você pode contribuir para melhorar os resultados com boas práticas, que podem levar a um melhor desempenho do anúncio e ajudar a reduzir o custo por resultado.
Qualidade da correspondência de eventos
Essa métrica avalia a eficácia das informações do cliente na correspondência de instâncias de eventos com uma conta do Facebook.
Taxa de desduplicação
Essa métrica mostra a porcentagem de eventos do pixel e da API de Conversões que foram desduplicados para obter a contagem precisa.
Atualidade dos dados
Essa métrica mostra a diferença entre a hora em que o evento ocorreu e quando o recebemos para avaliar a probabilidade de uma pessoa realizar a ação desejada após ver seu anúncio.
Cobertura de eventos da API de Conversões
O envio dos mesmos eventos tanto do navegador quanto do servidor fornece dados mais precisos. Dessa forma, você pode melhorar o direcionamento do público e ajudar a reduzir o custo por resultado.
Acesse a Central de Ajuda para saber mais sobre cada métrica e suas boas práticas. Veja cada métrica em sua respectiva aba na página de detalhes do evento.

---

