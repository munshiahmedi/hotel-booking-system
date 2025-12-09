import { Prisma, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../app';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('⚠️ WARNING: JWT_SECRET is missing! Using fallback only for development.');
}

/**
 * REGISTER USER
 */
export const registerUser = async (
  userData: Prisma.UserCreateInput
): Promise<Omit<User, 'password'>> => {
  try {
    console.log('🔹 [Auth Service] Searching for existing user:', userData.email);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      console.error('❌ User already exists:', userData.email);
      const err = new Error('A user with this email already exists');
      (err as any).statusCode = 409;
      (err as any).code = 'USER_EXISTS';
      throw err;
    }

    if (!userData.password) {
      const err = new Error('Password is required');
      (err as any).statusCode = 400;
      (err as any).code = 'MISSING_PASSWORD';
      throw err;
    }

    console.log('🔹 Hashing password...');
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    console.log('🔹 Creating new user in database...');
    const user = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
      },
    });

    console.log('✅ [Auth Service] User created successfully:', user.id);

    const { password, ...safeUser } = user;
    return safeUser;
  } catch (error: any) {
    console.error('❌ [Auth Service] registerUser error:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });

    // Prisma Unique Constraint Error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const e = new Error('A user with this email already exists');
        (e as any).statusCode = 409;
        (e as any).code = 'USER_EXISTS';
        throw e;
      }
    }

    // Bcrypt error ("data and salt required")
    if (String(error.message).includes('data and salt arguments required')) {
      const e = new Error('Password is required');
      (e as any).statusCode = 400;
      (e as any).code = 'MISSING_PASSWORD';
      throw e;
    }

    // Default error
    if (!error.statusCode) error.statusCode = 500;
    throw error;
  }
};

/**
 * LOGIN USER
 */
export const loginUser = async (
  email: string,
  password: string
): Promise<{ user: Omit<User, 'password'>; token: string }> => {
  try {
    console.log('🔹 [Auth Service] Logging in:', email);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      const err = new Error('Invalid credentials');
      (err as any).statusCode = 401;
      throw err;
    }

    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      const err = new Error('Invalid credentials');
      (err as any).statusCode = 401;
      throw err;
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET || 'dev-fallback-secret',
      { expiresIn: '1d' }
    );

    const { password: _, ...safeUser } = user;

    return {
      user: safeUser,
      token,
    };
  } catch (error: any) {
    console.error('❌ [Auth Service] loginUser error:', error);
    if (!error.statusCode) error.statusCode = 500;
    throw error;
  }
};
