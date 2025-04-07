# Guia de Implantação Passo a Passo

Este documento fornece instruções detalhadas para implantar o sistema de rastreamento Meta em produção, desde o repositório Git até a integração com sua loja Shopify.

## Índice

1. [Preparação Inicial](#1-preparação-inicial)
2. [Configuração do GitHub](#2-configuração-do-github)
3. [Implantação no Render](#3-implantação-no-render)
4. [Configuração do Redis Cloud](#4-configuração-do-redis-cloud)
5. [Configuração do Neon.tech (PostgreSQL)](#5-configuração-do-neontech-postgresql)
6. [Configuração do MaxMind GeoIP](#6-configuração-do-maxmind-geoip)
7. [Integração com Shopify](#7-integração-com-shopify)
8. [Verificação e Testes](#8-verificação-e-testes)
9. [Solução de Problemas](#9-solução-de-problemas)

## 1. Preparação Inicial

### 1.1 Requisitos

Certifique-se de que você tem:

- Uma conta no GitHub
- Uma conta no Render.com
- Uma conta no Neon.tech
- Uma conta no Redis Cloud
- Uma conta no MaxMind (para o banco de dados GeoIP)
- Credenciais do Facebook Business (Pixel ID e Access Token)

### 1.2 Preparar o Projeto Localmente

Antes de implantar, teste o projeto localmente:

```bash
# Clonar o repositório (se ainda não tiver feito isso)
git clone https://github.com/seu-usuario/meta-tracking.git
cd meta-tracking

# Instalar dependências
npm install

# Criar arquivo .env com suas configurações
cp .env.example .env
# Edite o arquivo .env com suas credenciais

# Baixar o banco de dados GeoIP
npm run download-geoip:ts

# Executar migrações do banco de dados
npx prisma migrate dev

# Iniciar o servidor em modo de desenvolvimento
npm run dev

# Executar testes para garantir que tudo está funcionando
npm test
```

## 2. Configuração do GitHub

### 2.1 Criar Repositório no GitHub

1. Acesse [GitHub](https://github.com) e faça login
2. Clique em "New" para criar um novo repositório
3. Dê um nome ao repositório (ex: "meta-tracking")
4. Configure como público ou privado conforme sua preferência
5. Clique em "Create repository"

### 2.2 Enviar o Código para o GitHub

```bash
# No diretório do projeto
git init
git add .
git commit -m "Versão inicial do sistema de rastreamento Meta"

# Adicionar o repositório remoto
git remote add origin https://github.com/seu-usuario/meta-tracking.git

# Enviar o código
git push -u origin main
```

### 2.3 Proteger Informações Sensíveis

Certifique-se de que o arquivo `.env` está no `.gitignore` para não expor suas credenciais. Você também pode criar um arquivo `.env.example` com variáveis sem valores sensíveis como modelo.

## 3. Implantação no Render

### 3.1 Criar uma Conta no Render

1. Acesse [Render](https://render.com) e crie uma conta ou faça login

### 3.2 Criar um Novo Web Service

1. No dashboard do Render, clique em "New" > "Web Service"
2. Conecte sua conta GitHub e selecione o repositório meta-tracking
3. Configure o serviço:
   - **Nome**: meta-tracking
   - **Ambiente**: Node
   - **Região**: Selecione a região mais próxima dos seus usuários
   - **Branch**: main (ou a branch que você deseja implantar)
   - **Comando de Build**: `npm install && npm run build && npx prisma generate && node dist/scripts/download-geoip.js`
   - **Comando de Inicialização**: `npm start`
   - **Plano**: Free (para começar) ou um plano pago para produção
4. Clique em "Advanced" e configure as variáveis de ambiente (será preenchido nos próximos passos)
5. Clique em "Create Web Service"

## 4. Configuração do Redis Cloud

### 4.1 Criar uma Conta no Redis Cloud

1. Acesse [Redis Cloud](https://redis.com/try-free/) e crie uma conta

### 4.2 Criar um Banco de Dados Redis

1. No dashboard do Redis Cloud, clique em "Create Database"
2. Selecione a assinatura "Free" (ou um plano pago para produção)
3. Configure o banco de dados:
   - **Nome**: meta-tracking
   - **Tipo**: Redis Stack
   - **Região**: Selecione a mesma região do Render ou a mais próxima
4. Clique em "Create"
5. Após a criação, vá para "Configuration" > "Databases" e clique no seu banco de dados
6. Anote as seguintes informações:
   - **Endpoint** (exemplo: redis-12345.c123.us-east-1-4.ec2.redns.redis-cloud.com)
   - **Porta** (exemplo: 12345)
   - **Nome de usuário** (geralmente "default")
   - **Senha** (gerada automaticamente)

## 5. Configuração do Neon.tech (PostgreSQL)

### 5.1 Criar uma Conta no Neon.tech

1. Acesse [Neon.tech](https://neon.tech) e crie uma conta

### 5.2 Criar um Projeto e Banco de Dados

1. No dashboard do Neon.tech, clique em "Create Project"
2. Configure o projeto:
   - **Nome**: meta-tracking
   - **Região**: Selecione a mesma região do Render ou a mais próxima
3. Clique em "Create Project"
4. Após a criação, vá para "Connection Details"
5. Anote a string de conexão PostgreSQL (exemplo: `postgres://user:password@endpoint:5432/dbname`)

## 6. Configuração do MaxMind GeoIP

### 6.1 Criar uma Conta no MaxMind

1. Acesse [MaxMind](https://www.maxmind.com/en/geolite2/signup) e crie uma conta gratuita

### 6.2 Obter Credenciais de Acesso

1. Após criar a conta, faça login no [portal de desenvolvedores](https://www.maxmind.com/en/account/login)
2. Vá para "Services" > "My License Key"
3. Clique em "Generate new license key"
4. Dê um nome à chave (ex: "meta-tracking")
5. Anote:
   - **Account ID** (número da conta)
   - **License Key** (chave de licença gerada)

## 7. Configuração das Variáveis de Ambiente no Render

Agora que você tem todas as credenciais necessárias, volte ao seu Web Service no Render e configure as variáveis de ambiente:

1. No painel do seu Web Service no Render, vá para "Environment"
2. Adicione as seguintes variáveis:
   - `NODE_ENV`: production
   - `PORT`: 10000
   - `DATABASE_URL`: [String de conexão do Neon.tech]
   - `REDIS_HOST`: [Endpoint do Redis Cloud]
   - `REDIS_PORT`: [Porta do Redis Cloud]
   - `REDIS_PASSWORD`: [Senha do Redis Cloud]
   - `REDIS_USERNAME`: default
   - `REDIS_DATABASE_NAME`: meta-tracking
   - `FB_API_URL`: https://graph.facebook.com/v18.0
   - `FB_PIXEL_ID`: [Seu ID do Pixel]
   - `FB_ACCESS_TOKEN`: [Seu token de acesso do Facebook]
   - `SHOPIFY_DOMAIN`: [Seu domínio Shopify]
   - `GEOIP_DB_PATH`: data/GeoLite2-City.mmdb
   - `MAXMIND_ACCOUNT_ID`: [Seu ID de conta MaxMind]
   - `MAXMIND_LICENSE_KEY`: [Sua chave de licença MaxMind]
3. Clique em "Save Changes"
4. Vá para "Triggers" e clique em "Manual Deploy" > "Deploy latest commit"

## 8. Configuração do Banco de Dados

Após a implantação inicial, você precisa executar a migração do banco de dados:

1. No painel do Web Service no Render, vá para "Shell"
2. Execute o comando:
   ```bash
   npx prisma migrate deploy
   ```

## 9. Integração com Shopify

### 9.1 Acessar Sua Loja Shopify

1. Faça login no painel administrativo da sua loja Shopify
2. Vá para "Temas" > encontre seu tema atual > "Ações" > "Editar código"

### 9.2 Adicionar o Código de Integração

1. Abra o arquivo `theme.liquid`
2. Adicione o seguinte código antes da tag `</head>`:

```html
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '{{ SEU_ID_DO_PIXEL }}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id={{ SEU_ID_DO_PIXEL }}&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->

<!-- Meta Tracking Integration -->
<script>
// Função para enviar eventos para o servidor de rastreamento
function trackEvent(eventName, userData = {}, customData = {}) {
  // Adicionar dados do navegador
  userData.userAgent = navigator.userAgent;
  userData.fbp = getCookie('_fbp');
  userData.fbc = getCookie('_fbc') || getURLParameter('fbclid');
  
  // Enviar para o servidor
  fetch('{{ URL_DO_SEU_SERVICO_NO_RENDER }}/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      eventName,
      userData,
      customData,
    }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('Evento rastreado com sucesso:', eventName, data.eventId);
    } else {
      console.error('Erro ao rastrear evento:', data.error);
    }
  })
  .catch(error => {
    console.error('Erro ao enviar evento:', error);
  });
}

// Função auxiliar para obter cookies
function getCookie(name) {
  const value = "; " + document.cookie;
  const parts = value.split("; " + name + "=");
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

// Função auxiliar para obter parâmetros da URL
function getURLParameter(name) {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get(name);
}

// Rastrear PageView automaticamente
document.addEventListener('DOMContentLoaded', function() {
  trackEvent('PageView', {}, {
    contentName: document.title,
    sourceUrl: window.location.href
  });
});
</script>
<!-- End Meta Tracking Integration -->
```

3. Substitua:
   - `{{ SEU_ID_DO_PIXEL }}` pelo seu ID do Facebook Pixel
   - `{{ URL_DO_SEU_SERVICO_NO_RENDER }}` pela URL do seu serviço no Render (ex: https://meta-tracking.onrender.com)

### 9.3 Adicionar Rastreamento de Eventos Específicos

Adicione código para rastrear eventos específicos nas páginas relevantes:

#### Página de Produto (product.liquid)

```html
<script>
document.addEventListener('DOMContentLoaded', function() {
  const product = {
    id: "{{ product.id }}",
    title: "{{ product.title }}",
    price: {{ product.price | money_without_currency }},
    variant: "{{ product.selected_variant.title }}"
  };
  
  trackEvent('ViewContent', 
    { 
      {% if customer %}
      email: "{{ customer.email }}",
      userId: "{{ customer.id }}",
      {% endif %}
    }, 
    { 
      contentType: 'product', 
      contentIds: ['{{ product.id }}'], 
      value: {{ product.price | money_without_currency }}, 
      currency: 'BRL',
      contentName: "{{ product.title }}",
      contentCategory: "{{ product.type }}"
    }
  );
  
  // Rastrear adição ao carrinho
  document.querySelector('form[action="/cart/add"]').addEventListener('submit', function(e) {
    const quantity = parseInt(document.querySelector('input[name="quantity"]').value || 1);
    
    trackEvent('AddToCart', 
      { 
        {% if customer %}
        email: "{{ customer.email }}",
        userId: "{{ customer.id }}",
        {% endif %}
      }, 
      { 
        contentType: 'product', 
        contentIds: ['{{ product.id }}'], 
        value: {{ product.price | money_without_currency }} * quantity, 
        currency: 'BRL',
        contentName: "{{ product.title }}",
        numItems: quantity
      }
    );
  });
});
</script>
```

#### Página de Checkout (checkout.liquid)

```html
<script>
document.addEventListener('DOMContentLoaded', function() {
  trackEvent('InitiateCheckout', 
    { 
      {% if customer %}
      email: "{{ customer.email }}",
      userId: "{{ customer.id }}",
      {% endif %}
    }, 
    { 
      value: {{ checkout.total_price | money_without_currency }},
      currency: 'BRL',
      numItems: {{ checkout.line_items.size }},
      contentIds: [{% for item in checkout.line_items %}"{{ item.product_id }}"{% unless forloop.last %},{% endunless %}{% endfor %}]
    }
  );
});
</script>
```

## 10. Verificação e Testes

### 10.1 Verificar o Status do Servidor

1. Acesse a URL do seu serviço no Render (ex: https://meta-tracking.onrender.com/status)
2. Você deve ver uma resposta JSON com o status "online"

### 10.2 Testar a Integração

1. Acesse sua loja Shopify
2. Abra o console do navegador (F12 > Console)
3. Verifique se não há erros relacionados ao código de rastreamento
4. Navegue pelo site e verifique se os eventos estão sendo rastreados corretamente

### 10.3 Verificar no Facebook Business

1. Acesse o [Facebook Business Manager](https://business.facebook.com/)
2. Vá para "Events Manager" > Seu Pixel
3. Verifique se os eventos estão sendo recebidos

## 11. Solução de Problemas

### 11.1 Verificar Logs no Render

1. No painel do seu Web Service no Render, vá para "Logs"
2. Procure por erros ou mensagens de aviso

### 11.2 Problemas Comuns

#### Problema de Conexão com Redis
```
Erro: Redis connection to XXXX.redns.redis-cloud.com:12345 failed
```
**Solução**: Verifique se as credenciais do Redis estão corretas nas variáveis de ambiente.

#### Problema com o Banco de Dados
```
Error: P1001: Can't reach database server
```
**Solução**: Verifique se a string de conexão do banco de dados está correta e se o banco de dados está acessível.

#### Problema com GeoIP
```
Erro ao inicializar o leitor GeoIP: Error: ENOENT: no such file or directory
```
**Solução**: Verifique se o arquivo GeoIP foi baixado corretamente durante a implantação.

## 12. Manutenção Contínua

### 12.1 Atualizações Regulares

1. Mantenha seu código atualizado com as últimas melhorias
2. Atualize regularmente o banco de dados GeoIP (download-geoip)
3. Monitore o uso de recursos no Render, Redis Cloud e Neon.tech

### 12.2 Monitoramento

1. Configure alertas no Render para ser notificado sobre problemas
2. Verifique os logs regularmente
3. Monitore o consumo de recursos para evitar limitações dos planos gratuitos

---

Parabéns! Seu sistema de rastreamento Meta agora está em produção e integrado com sua loja Shopify. Para quaisquer problemas ou dúvidas adicionais, consulte a documentação ou abra uma issue no repositório do GitHub. 