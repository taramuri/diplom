import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';

export function validateBody(schema: ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details.map((d) => d.message),
      });
      return;
    }
    req.body = value;
    next();
  };
}
