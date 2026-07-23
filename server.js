const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;
const ALLOWED_BUCKETS = new Set([
  'noaa-goes16',
  'noaa-goes17',
  'noaa-goes18',
  'noaa-goes19',
  'noaa-snpp',
  'noaa-j1',
  'noaa-j2'
]);

app.get('/api/ping', (req, res) => res.json({ ok: true, msg: 'proxy alive' }));

app.get('/api/list', async (req, res) => {
  const { bucket, prefix } = req.query;
  if (!bucket || !prefix) return res.status(400).json({ ok: false, error: 'bucket and prefix query params required' });
  if (!ALLOWED_BUCKETS.has(bucket)) {
    return res.status(400).json({ ok: false, error: 'unsupported NOAA bucket' });
  }

  try {
    const params = new URLSearchParams({ 'list-type': '2', prefix });
    const url = `https://${bucket}.s3.amazonaws.com/?${params}`;
    const resp = await axios.get(url, {
      timeout: 15000,
      responseType: 'text',
      maxContentLength: 10 * 1024 * 1024
    });
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
