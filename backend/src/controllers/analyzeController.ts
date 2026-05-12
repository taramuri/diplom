import { Request, Response, NextFunction } from 'express';
import { Analysis } from '../models';
import { sha256 } from '../utils/hash';
import { saveImage, saveHeatmap, readFileBuffer, deleteFileIfExists } from '../utils/storage';
import { classifyImage } from '../services/mlClient';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

function buildResponse(analysis: Analysis, req: Request) {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return {
    id: analysis.id,
    filename: analysis.filename,
    status: analysis.status,
    verdict: analysis.verdict,
    probability_synthetic: analysis.probability_synthetic,
    model_version: analysis.model_version,
    processing_time_ms: analysis.processing_time_ms,
    image_url: `${baseUrl}/api/analyze/${analysis.id}/image`,
    heatmap_url: analysis.heatmap_path
      ? `${baseUrl}/api/analyze/${analysis.id}/heatmap`
      : null,
    created_at: analysis.created_at,
  };
}

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

    const cached = await Analysis.findOne({
      where: { user_id: userId, image_hash: imageHash, status: 'completed' },
      order: [['created_at', 'DESC']],
    });

    if (cached) {
      logger.info(`Cache HIT for hash ${imageHash.substring(0, 8)}... (user ${userId})`);
      res.json({ ...buildResponse(cached, req), cached: true });
      return;
    }

    const imagePath = await saveImage(
      req.file.buffer,
      userId,
      imageHash,
      req.file.mimetype
    );

    const analysisRecord = await Analysis.create({
      user_id: userId,
      image_hash: imageHash,
      image_path: imagePath,
      filename: req.file.originalname,
      status: 'pending',
    });

    try {
      const result = await classifyImage(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      const heatmapPath = await saveHeatmap(
        result.heatmap_png_base64,
        userId,
        analysisRecord.id
      );

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
      await analysisRecord.update({ status: 'failed' });
      throw mlErr;
    }
  } catch (err) {
    next(err);
  }
}

export async function getAnalysis(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.user_id;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new ApiError(400, 'Invalid analysis ID');

    const analysis = await Analysis.findByPk(id);
    if (!analysis) throw new ApiError(404, 'Analysis not found');
    if (analysis.user_id !== userId && req.user!.role !== 'admin') {
      throw new ApiError(403, 'Forbidden');
    }

    res.json(buildResponse(analysis, req));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/analyze/:id
 * Body: { filename: string }
 * Дозволяє користувачу переназвати запис в історії.
 */
export async function updateAnalysis(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.user_id;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new ApiError(400, 'Invalid analysis ID');

    const analysis = await Analysis.findByPk(id);
    if (!analysis) throw new ApiError(404, 'Analysis not found');
    if (analysis.user_id !== userId && req.user!.role !== 'admin') {
      throw new ApiError(403, 'Forbidden');
    }

    const { filename } = req.body;
    if (typeof filename !== 'string') {
      throw new ApiError(400, 'filename має бути рядком');
    }
    const trimmed = filename.trim();
    if (trimmed.length === 0) {
      throw new ApiError(400, 'Назва не може бути порожньою');
    }
    if (trimmed.length > 200) {
      throw new ApiError(400, 'Назва занадто довга (максимум 200 символів)');
    }

    await analysis.update({ filename: trimmed });
    logger.info(`Analysis ${id} renamed by user ${userId}: "${trimmed}"`);

    res.json(buildResponse(analysis, req));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/analyze/:id
 * Видаляє запис аналізу + асоційовані файли (оригінал + теплокарту).
 */
export async function deleteAnalysis(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.user_id;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new ApiError(400, 'Invalid analysis ID');

    const analysis = await Analysis.findByPk(id);
    if (!analysis) throw new ApiError(404, 'Analysis not found');
    if (analysis.user_id !== userId && req.user!.role !== 'admin') {
      throw new ApiError(403, 'Forbidden');
    }

    // ВАЖЛИВО: перевіряємо чи файл-оригінал ще використовується іншими аналізами
    // (cache by hash дає одному файлу декілька записів). Якщо так — не видаляємо файл,
    // тільки запис.
    const otherWithSameImage = await Analysis.count({
      where: { user_id: userId, image_path: analysis.image_path, id: { [require('sequelize').Op.ne]: id } },
    });

    const imagePath = analysis.image_path;
    const heatmapPath = analysis.heatmap_path;

    await analysis.destroy();

    if (otherWithSameImage === 0) {
      await deleteFileIfExists(imagePath);
    }
    // Heatmap унікальна на кожен аналіз — видаляємо завжди
    await deleteFileIfExists(heatmapPath);

    logger.info(`Analysis ${id} deleted by user ${userId}`);
    res.json({ message: 'Аналіз видалено', id });
  } catch (err) {
    next(err);
  }
}

async function serveAnalysisFile(
  req: Request,
  res: Response,
  field: 'image_path' | 'heatmap_path',
  errorMsg: string
): Promise<void> {
  const userId = req.user!.user_id;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) throw new ApiError(400, 'Invalid analysis ID');

  const analysis = await Analysis.findByPk(id);
  if (!analysis) throw new ApiError(404, 'Analysis not found');
  if (analysis.user_id !== userId && req.user!.role !== 'admin') {
    throw new ApiError(403, 'Forbidden');
  }

  const filepath = analysis[field];
  if (!filepath) throw new ApiError(404, errorMsg);

  const buffer = await readFileBuffer(filepath);
  const ext = filepath.split('.').pop()?.toLowerCase();
  const contentType =
    ext === 'png' ? 'image/png' :
    ext === 'webp' ? 'image/webp' :
    'image/jpeg';

  res.set('Content-Type', contentType);
  res.set('Cache-Control', 'private, max-age=3600');
  res.send(buffer);
}

export async function getImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await serveAnalysisFile(req, res, 'image_path', 'Image not available');
  } catch (err) {
    next(err);
  }
}

export async function getHeatmap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await serveAnalysisFile(req, res, 'heatmap_path', 'Heatmap not available');
  } catch (err) {
    next(err);
  }
}
