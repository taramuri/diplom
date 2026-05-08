import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { uploadImage } from '../middleware/upload';
import {
  analyze,
  getAnalysis,
  getHeatmap,
} from '../controllers/analyzeController';

const router = Router();

router.post('/', authenticate, uploadImage.single('image'), analyze);
router.get('/:id', authenticate, getAnalysis);
router.get('/:id/heatmap', authenticate, getHeatmap);

export default router;
