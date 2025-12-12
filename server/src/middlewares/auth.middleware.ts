import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser } from '../services/auth.service';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { prisma } from '../app';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const register = async (req: Request, res: Response) => {
  try {
    console.log('\n🔵 [Auth Controller] Register endpoint hit');
    console.log('🔹 Request body:', req.body);

    // Validate required fields
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, password, and name are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
        code: 'INVALID_EMAIL'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
        code: 'WEAK_PASSWORD'
      });
    }

    console.log('🔹 Preparing user data...');
    const userData: Prisma.UserCreateInput = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      role: 'CUSTOMER', // Default role
      phone: req.body.phone ? req.body.phone.trim() : null
    };

    console.log('🔹 Calling registerUser service...');
    const user = await registerUser(userData);
    
    console.log(`✅ User registered successfully - ID: ${user.id}, Email: ${user.email}`);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Return success response
    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone
        },
        token
      },
      message: 'User registered successfully'
    });
    
  } catch (error: any) {
    console.error('\n❌ [Auth Controller] Registration error:', error);
    
    // Handle specific error cases
    if (error.code === 'P2002') { // Prisma unique constraint violation
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists',
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }
    
    // Default error response
    return res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      code: 'REGISTRATION_ERROR',
      ...(process.env.NODE_ENV === 'development' && {
        error: error.message
      })
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    const { user, token } = await loginUser(email, password);

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token
      },
      message: 'Login successful'
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(401).json({
      success: false,
      message: error.message || 'Invalid credentials',
      code: 'AUTHENTICATION_FAILED'
    });
  }
};

export const logout = (_req: Request, res: Response) => {
  res.clearCookie('token');
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
        code: 'UNAUTHENTICATED'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user data',
      code: 'FETCH_USER_ERROR'
    });
  }
};