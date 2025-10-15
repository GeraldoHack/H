const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Dados em memória
let bots = [];
let logs = [];

// Rota de saúde
app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    message: '🚀 BotHost Server Rodando!',
    bots: bots.length
  });
});

// Deploy de bot
app.post('/api/deploy', async (req, res) => {
  try {
    const { token, name, type } = req.body;

    // Validar token
    const test = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
    
    if (!test.data.ok) {
      return res.status(400).json({ error: 'Token inválido' });
    }

    const botInfo = test.data.result;
    const botId = `bot_${Date.now()}`;
    
    const newBot = {
      id: botId,
      token: token,
      name: name || botInfo.first_name,
      username: botInfo.username,
      type: type || 'echo',
      status: 'online',
      created: new Date().toISOString()
    };

    bots.push(newBot);

    // Configurar webhook
    const webhookUrl = `https://${req.get('host')}/api/webhook/${botId}`;
    await axios.get(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);

    // Log
    logs.push(`[${new Date().toLocaleString()}] NOVO BOT: ${newBot.name}`);

    res.json({
      message: `✅ Bot ${newBot.name} criado!`,
      botId: botId
    });

  } catch (error) {
    res.status(500).json({ error: 'Erro: ' + error.message });
  }
});

// Webhook do Telegram
app.post('/api/webhook/:botId', async (req, res) => {
  try {
    const botId = req.params.botId;
    const update = req.body;
    
    const bot = bots.find(b => b.id === botId);
    if (!bot) return res.status(404).json({ error: 'Bot não existe' });

    // Processar mensagem
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const user = update.message.from.first_name;

      let resposta = '';

      if (bot.type === 'echo') {
        resposta = `🔊 Você disse: "${text}"`;
      } 
      else if (bot.type === 'welcome') {
        if (text === '/start') {
          resposta = `👋 Olá ${user}! Bem-vindo!`;
        } else {
          resposta = `💬 Mensagem recebida: ${text}`;
        }
      }
      else {
        resposta = `🤖 ${bot.name} responde: Oi!`;
      }

      // Enviar resposta
      await axios.post(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
        chat_id: chatId,
        text: resposta
      });

      logs.push(`[${new Date().toLocaleString()}] BOT: ${bot.name} -> "${text}"`);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ error: 'Erro no webhook' });
  }
});

// Listar bots
app.get('/api/bots', (req, res) => {
  res.json(bots.map(bot => ({
    id: bot.id,
    name: bot.name,
    username: bot.username,
    type: bot.type,
    status: 'online',
    created: bot.created
  })));
});

// Deletar bot
app.delete('/api/bots/:botId', async (req, res) => {
  const botId = req.params.botId;
  const botIndex = bots.findIndex(b => b.id === botId);
  
  if (botIndex === -1) {
    return res.status(404).json({ error: 'Bot não encontrado' });
  }

  const bot = bots[botIndex];
  
  // Remover webhook
  await axios.get(`https://api.telegram.org/bot${bot.token}/deleteWebhook`);
  
  // Remover bot
  bots.splice(botIndex, 1);
  logs.push(`[${new Date().toLocaleString()}] BOT REMOVIDO: ${bot.name}`);

  res.json({ message: 'Bot removido!' });
});

// Logs
app.get('/api/logs', (req, res) => {
  res.json(logs.slice(-20));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});