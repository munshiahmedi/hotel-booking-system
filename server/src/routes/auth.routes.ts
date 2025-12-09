import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { register, login } from '../controllers/auth.controller';
import { validateRequest } from '../middlewares/validate-request';

const router = Router();

/**
 * Request Logger Middleware
 */
const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  console.log(`\n📨 [${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log('📝 Headers:', req.headers);
  console.log('📦 Body:', req.body);

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `\n✅ [${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)\n`
    );
  });

  next();
};

/**
 * AUTH ROUTES
 */

// REGISTER
router.post(
  '/register',
  requestLogger,
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),

    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail()
      .customSanitizer((email) => email.toLowerCase()),

    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
      .matches(/[0-9]/).withMessage('Password must contain at least one number')
      .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter'),

    body('phone')
      .optional()
      .trim()
      .matches(/^[0-9]{10,15}$/).withMessage('Please provide a valid phone number (10-15 digits)'),  

    body('role')
      .optional()
      .isIn(['admin', 'staff', 'customer'])
      .withMessage('Invalid role. Must be one of: admin, staff, customer'),
  ],
  validateRequest,
  register
);

// LOGIN
router.post(
  '/login',
  requestLogger,
  [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail()
      .customSanitizer((email) => email.toLowerCase()),

    body('password')
      .notEmpty().withMessage('Password is required'),
  ],
  validateRequest,
  login
);

export default router;
