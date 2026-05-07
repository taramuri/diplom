import { Request, Response, NextFunction } from 'express';
import { User } from '../models';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      throw new ApiError(409, 'Email already registered');
    }

    const password_hash = await hashPassword(password);
    const user = await User.create({ email, password_hash });

    const token = signToken({
      user_id: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info(`New user registered: ${email}`);
    res.status(201).json({ user: user.toSafeJSON(), token });
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const token = signToken({
      user_id: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info(`User logged in: ${email}`);
    res.json({ user: user.toSafeJSON(), token });
  } catch (err) {
    next(err);
  }
}

export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await User.findByPk(req.user!.user_id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}
