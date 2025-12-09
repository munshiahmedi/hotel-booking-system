import { Request, Response } from 'express';
import { registerUser, loginUser } from '../services/auth.service';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Extend Express Request to include `user`
declare global {
  namespace Express {
    interface Request {
      user?: Record<string, any>;
    }
  }
}

/**
 * REGISTER CONTROLLER
 */
export const register = async (req: Request, res: Response): Promise<any> => {
  try {
    console.log('\n🔵 [Auth Controller] Register endpoint hit');
    console.log('🔹 Request body:', JSON.stringify(req.body, null, 2));

    const { name, email, password, phone, role } = req.body;

    // Validate required fields
    const missing: string[] = [];
    if (!name) missing.push('name');
    if (!email) missing.push('email');
    if (!password) missing.push('password');

    if (missing.length > 0) {
      console.error(`❌ Missing fields: ${missing.join(', ')}`);
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`,
        code: 'MISSING_FIELDS',
        fields: missing,
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
        code: 'INVALID_EMAIL',
      });
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
        code: 'WEAK_PASSWORD',
      });
    }

    // Prepare Prisma user input
    const userData: Prisma.UserCreateInput = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role || 'customer',
      phone: phone ? phone.trim() : null,
    };

    console.log('🔹 Calling registerUser service...');
    const user = await registerUser(userData);

    console.log(`✅ User registered successfully => ID: ${user.id}`);

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET is missing');

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '1d' }
    );

    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
        },
        token,
      },
      message: 'User registered successfully',
    });
  } catch (error: any) {
    console.error('\n❌ Registration Error:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });

    let status = 500;
    let message = error.message || 'Registration failed';
    let code = error.code || 'REGISTRATION_ERROR';

    // Prisma Unique Error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        status = 409;
        message = 'A user with this email already exists';
        code = 'USER_EXISTS';
      }
    }

    return res.status(status).json({
      success: false,
      message,
      code,
      ...(process.env.NODE_ENV === 'development' && {
        debug: { stack: error.stack, meta: error.meta },
      }),
    });
  }
};

/**
 * LOGIN CONTROLLER
 */
export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });

    const { user, token } = await loginUser(email, password);

    // Send Cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
      message: 'Login successful',
    });
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Invalid email or password',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  }
};

/**
 * LOGOUT CONTROLLER
 */
export const logout = (_req: Request, res: Response): Response => {
  res.clearCookie('token');
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

/**
 * GET CURRENT USER
 */
export const getCurrentUser = (req: Request, res: Response): Response => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated',
    });
  }

  const { password, ...safeUser } = req.user;

  return res.status(200).json({
    success: true,
    data: safeUser,
  });
};
