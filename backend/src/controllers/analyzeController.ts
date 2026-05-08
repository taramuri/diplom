import { Request, Response, NextFunction } from 'express';
import { Analysis } from '../models';
import { sha256 } from '../utils/hash';
import { saveImage, saveHeatmap, readHeatmap } from '../utils/storage';
import { classifyImage } from '../services/mlClient';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * Будує JSON-відповідь з моделі Analysis для клієнта.
 * Не повертає image_path і heatmap_path (це деталі реалізації).
 */
function buildResponse(analysis: Analysis, req: Request) {
  return {
    id: analysis.id,
    filename: analysis.filename,
    status: analysis.status,
    verdict: analysis.verdict,
    probability_synthetic: analysis.probability_synthetic,
    model_version: analysis.model_version,
    processing_time_ms: analysis.processing_time_ms,
    heatmap_url: analysis.heatmap_path
      ? `${req.protocol}://${req.get('host')}/api/analyze/${analysis.id}/heatmap`
      : null,
    created_at: analysis.created_at,
  };
}

/**
 * POST /api/analyze
 * Завантаження зображення → класифікація → збереження результату.
 *
 * Workflow:
 *   1. Перевірка файлу
 *   2. SHA-256 хеш для кешу
 *   3. Якщо вже аналізував це зображення — повертаємо кеш
 *   4. Зберігаємо файл на диск
 *   5. Створюємо запис у БД зі статусом pending
 *   6. Викликаємо ML-сервіс
 *   7. Зберігаємо heatmap, оновлюємо запис до completed
 *   8. Повертаємо відповідь
 */
export async function analyze(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No file uploaded. Use field name "image".');
    }

    const userId = req.user!.user_id;
    const imageHash = sha256(req.file.buffer);

    // Кеш: те саме зображення, той самий користувач, успішний результат
    const cached = await Analysis.findOne({
      where: {
        user_id: userId,
        image_hash: imageHash,
        status: 'completed',
      },
      order: [['created_at', 'DESC']],
    });

    if (cached) {
      logger.info(
        `Cache HIT for hash ${imageHash.substring(0, 8)}... (user ${userId})`
      );
      res.json({ ...buildResponse(cached, req), cached: true });
      return;
    }

    // Зберегти файл на диск
    const imagePath = await saveImage(
      req.file.buffer,
      userId,
      imageHash,
      req.file.mimetype
    );

    // Запис у БД зі статусом pending
    const analysisRecord = await Analysis.create({
      user_id: userId,
      image_hash: imageHash,
      image_path: imagePath,
      filename: req.file.originalname,
      status: 'pending',
    });

    // Виклик ML-сервісу
    try {
      const result = await classifyImage(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      // Зберегти heatmap на диск
      const heatmapPath = await saveHeatmap(
        result.heatmap_png_base64,
        userId,
        analysisRecord.id
      );

      // Оновити запис у БД
      await analysisRecord.update({
        status: 'completed',
        verdict: result.verdict,
        probability_synthetic: result.probability_synthetic,
        heatmap_path: heatmapPath,
        model_version: result.model_version,
        processing_time_ms: result.processing_time_ms,
      });

      logger.info(
        `Analysis ${analysisRecord.id} done: ${result.verdict} ` +
          `p_synth=${result.probability_synthetic.toFixed(3)} ` +
          `(${result.processing_time_ms}ms)`
      );

      res.status(201).json({
        ...buildResponse(analysisRecord, req),
        cached: false,
      });
    } catch (mlErr) {
      // ML впав — позначаємо запис як failed і кидаємо помилку далі
      await analysisRecord.update({ status: 'failed' });
      throw mlErr;
    }
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analyze/:id
 * Отримати результат конкретного аналізу.
 */
export async function getAnalysis(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.user_id;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw new ApiError(400, 'Invalid analysis ID');
    }

    const analysis = await Analysis.findByPk(id);
    if (!analysis) {
      throw new ApiError(404, 'Analysis not found');
    }

    // Власник або admin
    if (analysis.user_id !== userId && req.user!.role !== 'admin') {
      throw new ApiError(403, 'Forbidden');
    }

    res.json(buildResponse(analysis, req));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analyze/:id/heatmap
 * Віддає PNG теплокарти з перевіркою прав доступу.
 */
export async function getHeatmap(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.user_id;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw new ApiError(400, 'Invalid analysis ID');
    }

    const analysis = await Analysis.findByPk(id);
    if (!analysis) {
      throw new ApiError(404, 'Analysis not found');
    }

    if (analysis.user_id !== userId && req.user!.role !== 'admin') {
      throw new ApiError(403, 'Forbidden');
    }

    if (!analysis.heatmap_path) {
      throw new ApiError(404, 'Heatmap not available');
    }

    const buffer = await readHeatmap(analysis.heatmap_path);
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'private, max-age=3600');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}
