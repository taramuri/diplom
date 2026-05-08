import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getHistory } from '../controllers/historyController';

const router = Router();

router.get('/', authenticate, getHistory);

export default router;
