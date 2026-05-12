import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { uploadImage } from '../middleware/upload';
import {
  analyze,
  getAnalysis,
  updateAnalysis,
  deleteAnalysis,
  getImage,
  getHeatmap,
} from '../controllers/analyzeController';

const router = Router();

router.post('/', authenticate, uploadImage.single('image'), analyze);
router.get('/:id', authenticate, getAnalysis);
router.patch('/:id', authenticate, updateAnalysis);
router.delete('/:id', authenticate, deleteAnalysis);
router.get('/:id/image', authenticate, getImage);
router.get('/:id/heatmap', authenticate, getHeatmap);

export default router;
