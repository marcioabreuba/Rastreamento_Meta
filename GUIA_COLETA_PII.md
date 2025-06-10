# Guia de Coleta de Dados PII para Melhorar Qualidade de Correspondência Meta

## 🎯 **Objetivo**
Este guia mostra como coletar e configurar dados PII (Personally Identifiable Information) para melhorar significativamente a qualidade de correspondência dos eventos Meta (6.7-7.7/10 → 8.5-9.5/10).

## 📊 **Situação Atual Identificada**
Baseado nos logs analisados em **10/06/2025**, os eventos estão sendo enviados **APENAS com dados GeoIP**, sem dados PII críticos:

### ❌ **Dados Ausentes (Crítico para Correspondência):**
- ✖️ **Email** (`em`) - AUSENTE
- ✖️ **Telefone** (`ph`) - AUSENTE  
- ✖️ **Nome** (`fn`) - AUSENTE
- ✖️ **Sobrenome** (`ln`) - AUSENTE

### ✅ **Dados Presentes:**
- ✅ **Cidade** (`ct`) - Via GeoIP
- ✅ **Estado** (`st`) - Via GeoIP
- ✅ **CEP** (`zp`) - Via GeoIP
- ✅ **País** (`country`) - Via GeoIP
- ✅ **FBP** (`fbp`) - Funcionando
- ✅ **FBC** (`fbc`) - Funcionando

## 🚀 **Implementação de Coleta PII**

### **1. Coleta via JavaScript (Cliente)**

#### **Método A: Formulários Existentes**
```javascript
// Adicionar ao seu site onde há formulários
function coletarDadosPII() {
  // Email (mais importante)
  const email = document.querySelector('#email')?.value || 
                document.querySelector('[name="email"]')?.value ||
                document.querySelector('[type="email"]')?.value;
  
  // Telefone
  const telefone = document.querySelector('#phone')?.value || 
                   document.querySelector('[name="phone"]')?.value ||
                   document.querySelector('[type="tel"]')?.value;
  
  // Nome
  const nome = document.querySelector('#first_name')?.value || 
               document.querySelector('[name="first_name"]')?.value;
  
  // Sobrenome  
  const sobrenome = document.querySelector('#last_name')?.value || 
                    document.querySelector('[name="last_name"]')?.value;

  // Salvar no localStorage para o script Meta usar
  if (email) localStorage.setItem('meta_tracking_email', email);
  if (telefone) localStorage.setItem('meta_tracking_phone', telefone);
  if (nome) localStorage.setItem('meta_tracking_first_name', nome);
  if (sobrenome) localStorage.setItem('meta_tracking_last_name', sobrenome);
  
  console.log('✅ Dados PII coletados para Meta Tracking:', { email, telefone, nome, sobrenome });
}

// Executar quando formulário for preenchido
document.addEventListener('input', coletarDadosPII);
document.addEventListener('change', coletarDadosPII);
```

#### **Método B: Integração com Plataforma (Shopify)**
```javascript
// Para Shopify - adicionar no theme.liquid
{% if customer %}
<script>
  // Cliente logado - dados disponíveis
  localStorage.setItem('meta_tracking_email', '{{ customer.email }}');
  localStorage.setItem('meta_tracking_first_name', '{{ customer.first_name }}');
  localStorage.setItem('meta_tracking_last_name', '{{ customer.last_name }}');
  {% if customer.phone %}
  localStorage.setItem('meta_tracking_phone', '{{ customer.phone }}');
  {% endif %}
  
  console.log('✅ Dados do cliente Shopify salvos para Meta Tracking');
</script>
{% endif %}
```

### **2. Coleta no Checkout/Carrinho**
```javascript
// Para páginas de checkout
function coletarDadosCheckout() {
  // Monitorar quando campos são preenchidos
  const emailField = document.querySelector('#email, [name="email"], [type="email"]');
  const phoneField = document.querySelector('#phone, [name="phone"], [type="tel"]');
  
  if (emailField) {
    emailField.addEventListener('blur', function() {
      if (this.value && this.value.includes('@')) {
        localStorage.setItem('meta_tracking_email', this.value);
        console.log('📧 Email coletado:', this.value);
      }
    });
  }
  
  if (phoneField) {
    phoneField.addEventListener('blur', function() {
      if (this.value && this.value.length >= 10) {
        localStorage.setItem('meta_tracking_phone', this.value);
        console.log('📱 Telefone coletado:', this.value);
      }
    });
  }
}

// Executar na página de checkout
if (window.location.pathname.includes('checkout') || 
    window.location.pathname.includes('cart')) {
  coletarDadosCheckout();
}
```

### **3. Implementação para WordPress/WooCommerce**
```javascript
// Adicionar ao seu tema WordPress
jQuery(document).ready(function($) {
  // WooCommerce checkout
  $('body').on('blur', '#billing_email', function() {
    if ($(this).val() && $(this).val().includes('@')) {
      localStorage.setItem('meta_tracking_email', $(this).val());
    }
  });
  
  $('body').on('blur', '#billing_phone', function() {
    if ($(this).val() && $(this).val().length >= 10) {
      localStorage.setItem('meta_tracking_phone', $(this).val());
    }
  });
  
  $('body').on('blur', '#billing_first_name', function() {
    if ($(this).val()) {
      localStorage.setItem('meta_tracking_first_name', $(this).val());
    }
  });
  
  $('body').on('blur', '#billing_last_name', function() {
    if ($(this).val()) {
      localStorage.setItem('meta_tracking_last_name', $(this).val());
    }
  });
});
```

## 🔧 **Verificação e Debug**

### **1. Verificar dados coletados**
```javascript
// Executar no console do navegador
console.log('📊 Dados PII Meta Tracking:', {
  email: localStorage.getItem('meta_tracking_email'),
  phone: localStorage.getItem('meta_tracking_phone'),
  first_name: localStorage.getItem('meta_tracking_first_name'),
  last_name: localStorage.getItem('meta_tracking_last_name')
});
```

### **2. Ativar debug do Meta Tracking**
```javascript
// Ativar logs detalhados
localStorage.setItem('meta_debug', 'true');
// Ou adicionar na URL: ?debug_meta=true
```

### **3. Monitorar qualidade nos logs**
Após implementar, você verá nos logs:
```
📊 Qualidade de Correspondência para ViewContent: 8/11 campos PII (73%)
```

## 📈 **Impacto Esperado**

### **Antes (Situação Atual):**
- Qualidade: **6.7-7.7/10**
- Dados PII: **4/11 campos** (apenas GeoIP + FBP/FBC)

### **Depois (Com Email + Telefone):**
- Qualidade: **8.5-9.5/10**
- Dados PII: **8-10/11 campos**

## ⚠️ **Importante: Privacidade e LGPD**

### **1. Consentimento**
```html
<!-- Exemplo de aviso de privacidade -->
<div class="privacy-notice">
  ✅ Coletamos dados para melhorar sua experiência e personalizar anúncios.
  <a href="/politica-privacidade">Ver política de privacidade</a>
</div>
```

### **2. Opt-out**
```javascript
// Permitir que usuário desative
if (localStorage.getItem('meta_tracking_opt_out') === 'true') {
  // Não coletar dados PII
  console.log('❌ Usuário optou por não compartilhar dados PII');
}
```

## 🎯 **Prioridades de Implementação**

### **Alta Prioridade:**
1. ✅ **Email** - Maior impacto na correspondência
2. ✅ **Telefone** - Segundo maior impacto

### **Média Prioridade:**
3. ✅ **Nome/Sobrenome** - Complementa a correspondência
4. ✅ **Integração com checkout** - Captura automática

### **Baixa Prioridade:**
5. ✅ **Dados demográficos** (gênero, data nascimento)
6. ✅ **Endereço completo**

---

**📞 Suporte:** Para dúvidas sobre implementação, consulte os logs detalhados ativando `?debug_meta=true` na URL. 