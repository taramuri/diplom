import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// TODO: реалізуємо коли буде готовий ML-сервіс
router.post('/', authenticate, (_req, res) => {
  res.status(501).json({ error: 'Not implemented yet — waiting for ML service' });
});

router.get('/:id', authenticate, (_req, res) => {
  res.status(501).json({ error: 'Not implemented yet' });
});

export default router;
