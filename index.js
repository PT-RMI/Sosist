const express = require('express');
const scraper = require('./scraper');

const app = express();
const port = 3000;

app.use(express.json());

app.post('/check-comment', async (req, res) => {
  const { postUrl, username } = req.body;

  if (!postUrl || !username) {
    return res.status(400).json({ error: 'postUrl and username are required' });
  }

  try {
    const result = await scraper.checkComment(postUrl, username);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
