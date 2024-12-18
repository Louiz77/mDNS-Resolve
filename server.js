const cors = require('cors');
const express = require('express');
const axios = require('axios');
const mdns = require('multicast-dns')();

const app = express();

app.use(cors());

app.get('/resolve-mdns', async (req, res) => {
  const { hostname } = req.query;

  if (!hostname) {
    return res.status(400).send({ error: "Hostname is required" });
  }

  let responseSent = false;

  mdns.query({ questions: [{ name: hostname, type: 'A' }] });

  let allAnswers = []; // armazenar todas as respostas

  mdns.on('response', (response) => {
    const answers = response.answers.filter((answer) => answer.type === 'A');
    allAnswers.push(...answers.map((answer) => ({
      name: answer.name,
      ip: answer.data,
      ttl: answer.ttl,
    })));
  });
  
  // envie todas as respostas acumuladas:
  const timeout = setTimeout(async () => {
    if (!responseSent) {
      responseSent = true;
  
      try {
        await axios.post('http://localhost:5000/store-mdns', { answers: allAnswers });
        console.log('All data sent to Python backend:', allAnswers);
      } catch (error) {
        console.error('Error sending data to Python backend:', error);
      }
  
      res.send({ message: "All data processed and sent to backend", answers: allAnswers });
      mdns.removeAllListeners('response');
    }
  }, 5000);
});

app.listen(3001, () => {
  console.log('mDNS resolver running on http://localhost:3001');
});
