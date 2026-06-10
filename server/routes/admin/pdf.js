import { Router } from 'express';
import { generatePdf } from '../../pdf/generator.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const pdf = await generatePdf();
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', 'attachment; filename="classmates.pdf"');
    res.send(Buffer.from(pdf));
  } catch (e) {
    console.error('PDF generation failed:', e);
    res.status(500).json({ error: 'PDF 生成失败: ' + e.message });
  }
});

export default router;
