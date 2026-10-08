import { Router } from 'express';
import * as C from '../controllers/auth.controller';
import { authLimiter } from '../middleware/rateLimit';

const r = Router();
/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       201:
 *         description: Created
 */
r.post('/register', authLimiter, C.register);
r.post('/login', authLimiter, C.login);
r.post('/logout', C.logout);
r.post('/refresh', C.refresh);
r.post('/forgot-password', authLimiter, C.forgotPassword);
r.post('/reset-password', authLimiter, C.resetPassword);
export default r;
