const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let bots = [];

app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    message: '🤖 BotHost Server ONLINE!',
    timestamp: new Date().toISOString(),
    bots: bots.length
  });
});

app.post('/api/deploy', async (req, res) => {
  try {
    const { token, name } = req.body;
    
    const test = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
    
    if (test.data.ok) {
      const botId = 'bot_' + Date.now();
      const newBot = {
        id: botId,
        token: token,
        name: name || test.data.result.first_name,
        username: test.data.result.username,
        status: 'online',
        created: new Date().toISOString()
      };
      
      bots.push(newBot);
      
      res.json({ 
        success: true,
        message: `✅ Bot ${newBot.name} implantado!`,
        botId: botId
      });
    } else {
      res.status(400).json({ error: 'Token inválido' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.get('/api/bots', (req, res) => {
  res.json({
    success: true,
    bots: bots
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
