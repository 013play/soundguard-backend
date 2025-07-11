require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mercadopago = require('mercadopago');

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar Mercado Pago
mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
});

app.use(cors());
app.use(express.json());

// Rota de teste
app.get('/', (req, res) => {
  res.json({ status: 'SoundGuard Backend funcionando!' });
});

// Criar pagamento PIX
app.post('/api/payments/pix', async (req, res) => {
  try {
    const { amount, description } = req.body;
    
    const payment_data = {
      transaction_amount: parseFloat(amount),
      description: description || 'Depósito SoundGuard',
      payment_method_id: 'pix',
      payer: {
        email: 'test_user_123456@testuser.com', // Email do pagador (pode ser qualquer um para o PIX)
      }
    };

    const data = await mercadopago.payment.create(payment_data);
    
    const responseData = {
      id: data.body.id,
      qr_code: data.body.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: data.body.point_of_interaction.transaction_data.qr_code_base64,
    };

    res.json(responseData);

  } catch (error) {
    console.error('Erro ao criar pagamento:', error.data ? error.data : error);
    res.status(500).json({ error: 'Erro ao criar pagamento' });
  }
});

// Webhook do Mercado Pago
app.post('/webhook/mercadopago', (req, res) => {
  console.log('Webhook recebido:', req.body);
  // Aqui você processaria a confirmação do pagamento
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
