const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

app.get('/api/ping', (req, res) => res.json({ ok: true, msg: 'proxy alive' }));

app.get('/api/list', async (req, res) => {
  const { bucket, prefix } = req.query;
  if (!bucket || !prefix) return res.status(400).json({ ok: false, error: 'bucket and prefix query params required' });

  try {
    const url = `https://${bucket}.s3.amazonaws.com/?list-type=2&prefix=${encodeURIComponent(prefix)}`;
    const resp = await axios.get(url, { timeout: 15000, responseType: 'text' });
    const xml = resp.data;

    const parsed = await xml2js.parseStringPromise(xml, { explicitArray: false });
    const contents = parsed.ListBucketResult && parsed.ListBucketResult.Contents ? parsed.ListBucketResult.Contents : [];

    const out = [];
    if (Array.isArray(contents)) {
      contents.forEach(item => {
        out.push({ Key: item.Key, Size: parseInt(item.Size, 10) || 0, LastModified: item.LastModified });
      });
    } else if (typeof contents === 'object' && contents.Key) {
      out.push({ Key: contents.Key, Size: parseInt(contents.Size, 10) || 0, LastModified: contents.LastModified });
    }

    return res.json({ ok: true, contents: out });
  } catch (err) {
    console.error('proxy /api/list error:', err.message || err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.listen(PORT, () => console.log(`GOES proxy listening on http://localhost:${PORT}`));
