import express, { Request, Response, NextFunction } from 'express';
import { User, PrismaClient, Prisma } from '@prisma/client';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import morgan from 'morgan';

// Extend Express Request type
declare module 'express-serve-static-core' {
  interface Request {
    user?: User | null;
    prisma: PrismaClient;
  }
}

// Prisma instance
export const prisma = new PrismaClient();

const app = express();

// Attach Prisma client to request object
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

/* -----------------------------------------------------
                    SECURITY MIDDLEWARE
------------------------------------------------------ */
app.use(helmet());

// Request logger (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

/* -----------------------------------------------------
                          CORS
------------------------------------------------------ */
const corsOptions: cors.CorsOptions = {
  origin:
    process.env.NODE_ENV === 'production'
      ? process.env.CLIENT_URL
      : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

/* -----------------------------------------------------
                          PARSERS
------------------------------------------------------ */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* -----------------------------------------------------
                 SANITIZATION + HPP PROTECTION
------------------------------------------------------ */
app.use(mongoSanitize());
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

/* -----------------------------------------------------
                        RATE LIMITER
------------------------------------------------------ */
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: 'Too many requests from this IP, please try again later.',
  })
);

/* -----------------------------------------------------
                       CUSTOM REQUEST LOGGER
------------------------------------------------------ */
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  console.log(`\n📨 [${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);

  if (Object.keys(req.body).length > 0) {
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  }

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `✅ Completed ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`
    );
  });

  next();
});

/* -----------------------------------------------------
                          ROUTES
------------------------------------------------------ */
import authRoutes from './routes/auth.routes';
import protectedRoutes from './routes/protected.routes';
import hotelRoutes from './routes/hotel.routes';
import { roomRouter as roomRoutes } from './routes/room.routes';
// Add this with other route imports
import { bookingRouter } from './routes/booking.routes';


// Public routes
app.use('/api/auth', authRoutes);

// API Routes
app.use('/api/hotels', hotelRoutes);
app.use('/api/rooms', roomRoutes);

// Protected routes (require authentication)
app.use('/api/protected', protectedRoutes);

// And add this with other route middleware
app.use('/api/bookings', bookingRouter);
/* -----------------------------------------------------
                        HEALTH CHECK
------------------------------------------------------ */
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is healthy',
  });
});

/* -----------------------------------------------------
                          404 HANDLER
------------------------------------------------------ */
app.all('*', (req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
    code: 'NOT_FOUND',
  });
});

/* -----------------------------------------------------
                   GLOBAL ERROR HANDLER
------------------------------------------------------ */
interface AppError extends Error {
  statusCode?: number;
  code?: string;
  errors?: any[];
}

app.use((err: AppError, _req: Request, res: Response, _next: NextFunction) => {
  console.error(
    '❌ Global Error:',
    process.env.NODE_ENV === 'development'
      ? { message: err.message, stack: err.stack, code: err.code }
      : err.message
  );

  // Prisma duplicate error
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field =
        err.meta && Array.isArray(err.meta.target)
          ? err.meta.target[0]
          : 'unknown';

      return res.status(409).json({
        status: 'error',
        message: `Duplicate field: ${field}`,
        code: 'DUPLICATE_ENTRY',
      });
    }
  }

  return res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    code: err.code || 'SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});

export default app;
