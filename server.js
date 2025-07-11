require('dotenv').config();
const express = require('express');
const cors = require('cors');
// Importa as classes necessárias do SDK v2+
const { MercadoPagoConfig, Payment } = require('mercadopago');

const app = express();
const PORT = process.env.PORT || 3000;

// Nova forma de configurar o cliente
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: {
    timeout: 5000,
  }
});

// Middlewares
app.use(cors());
app.use(express.json());

// Rota de teste para saber se o servidor está online
app.get('/', (req, res) => {
  res.json({ 
    status: 'SoundGuard Webhook Server Online - SDK v2', 
    timestamp: new Date().toISOString() 
  });
});

// Endpoint que vai receber as notificações do MercadoPago
app.post('/webhook/mercadopago', async (req, res) => {
  try {
    console.log('Webhook recebido:', req.body);
    
    const topic = req.query.topic || req.body.type;
    const paymentId = req.body.data?.id;

    if (topic === 'payment' && paymentId) {
      
      // Nova forma de buscar o pagamento usando o cliente
      const payment = new Payment(client);
      const paymentDetails = await payment.get({ id: paymentId });

      console.log(`Detalhes do Pagamento ${paymentId}:`, {
        status: paymentDetails.status,
        amount: paymentDetails.transaction_amount,
        email: paymentDetails.payer.email,
        external_reference: paymentDetails.external_reference // Muito útil para identificar o pedido!
      });
      
      if (paymentDetails.status === 'approved') {
        // Chame sua função para processar o pagamento aprovado
        await processApprovedPayment(paymentDetails);
      }
    }
    
    // Responda SEMPRE com 200 OK para o MercadoPago
    res.status(200).send('OK');

  } catch (error) {
    console.error('Erro no webhook:', error.message);
    res.status(200).send('OK'); // Importante: mesmo com erro, responda 200
  }
});

app.post('/create-payment', async (req, res) => {
  try {
    const { amount, description, user_email } = req.body;

    const payment_data = {
      transaction_amount: amount,
      description: description,
      payment_method_id: 'pix', // ESSA LINHA É CRUCIAL!
      payer: {
        email: user_email,
        first_name: 'Usuario', // Opcional, mas recomendado
        last_name: 'SoundGuard', // Opcional, mas recomendado
      },
    };
    

    const result = await payment.create({ body: payment_data });

    console.log(result)
    
    // O 'result' aqui deve conter o objeto 'point_of_interaction'
    res.json(result); 

  } catch (error) {
    // Isso ajuda a ver o erro exato nos logs da Railway
    console.error('Erro ao criar pagamento no MercadoPago:', error);
    res.status(500).json({ 
        error: 'Falha ao criar pagamento',
        details: error.message 
    });
  }
});
// Rota para verificar status do pagamento
app.get('/payment-status/:id', async (req, res) => {
  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${req.params.id}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      }
    });

    const paymentData = await response.json();
    res.json(paymentData);
  } catch (error) {
    console.error('Erro ao verificar pagamento:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

async function processApprovedPayment(paymentDetails) {
  console.log('✅ Pagamento APROVADO! Processando lógica de negócio para:', paymentDetails.id);
  
  // AQUI VAI A SUA LÓGICA:
  // 1. Busque o usuário/pedido no seu banco de dados usando o `paymentDetails.external_reference` ou `paymentDetails.payer.email`.
  // 2. Verifique se o pagamento já não foi processado para evitar duplicidade.
  // 3. Atualize o status do pedido para "Pago".
  // 4. Libere o acesso ao serviço/produto para o usuário.
  // 5. Envie um email de confirmação.
}

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT} com SDK v2 do MercadoPago`);
});
