import { Router } from 'express';
import QRCode from 'qrcode';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: '缺少 url 参数' });
    const png = await QRCode.toBuffer(url, { width: 400, margin: 2 });
    res.set('Content-Type', 'image/png');
    res.send(png);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
