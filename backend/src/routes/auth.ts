import { Router } from 'express';
import Joi from 'joi';
import {
  register,
  login,
  getMe,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} from '../controllers/authController';
import {
  updateProfile,
  uploadAvatarHandler,
  getAvatar,
  deleteAvatar,
} from '../controllers/profileController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { uploadAvatar } from '../middleware/upload';

const router = Router();

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  name: Joi.string().max(100).optional().allow('', null),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const verifyEmailSchema = Joi.object({
  token: Joi.string().length(64).hex().required(),
});

const resendSchema = Joi.object({
  email: Joi.string().email().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().length(64).hex().required(),
  new_password: Joi.string().min(8).max(128).required(),
});

const updateProfileSchema = Joi.object({
  name: Joi.string().max(100).optional().allow('', null),
  email: Joi.string().email().optional(),
}).min(1);

// Auth flow
router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.get('/me', authenticate, getMe);

// Email verification
router.post('/verify-email', validateBody(verifyEmailSchema), verifyEmail);
router.post('/resend-verification', validateBody(resendSchema), resendVerification);

// Password reset
router.post('/forgot-password', validateBody(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), resetPassword);

// Profile
router.patch('/me', authenticate, validateBody(updateProfileSchema), updateProfile);
router.post('/me/avatar', authenticate, uploadAvatar.single('avatar'), uploadAvatarHandler);
router.get('/me/avatar', authenticate, getAvatar);
router.delete('/me/avatar', authenticate, deleteAvatar);

export default router;
