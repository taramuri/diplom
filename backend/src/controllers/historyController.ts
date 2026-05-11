import { Request, Response, NextFunction } from 'express';
import { Analysis } from '../models';

/**
 * GET /api/history?page=1&limit=20
 * Пагінований список аналізів поточного користувача.
 */
export async function getHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.user_id;

    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt((req.query.limit as string) || '20', 10))
    );
    const offset = (page - 1) * limit;

    const { count, rows } = await Analysis.findAndCountAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const items = rows.map((a) => ({
      id: a.id,
      filename: a.filename,
      status: a.status,
      verdict: a.verdict,
      probability_synthetic: a.probability_synthetic,
      processing_time_ms: a.processing_time_ms,
      image_url: `${baseUrl}/api/analyze/${a.id}/image`,
      heatmap_url: a.heatmap_path
        ? `${baseUrl}/api/analyze/${a.id}/heatmap`
        : null,
      created_at: a.created_at,
    }));

    res.json({
      items,
      pagination: {
        total: count,
        page,
        limit,
        total_pages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}
