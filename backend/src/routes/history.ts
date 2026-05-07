import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// TODO: реалізуємо разом з analyze
router.get('/', authenticate, (_req, res) => {
  res.status(501).json({ error: 'Not implemented yet' });
});

export default router;
