// server.ts
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import app from './app';
import { Request, Response, NextFunction } from 'express';
import http from 'http';

// Load environment variables
dotenv.config();

// Initialize Prisma with logging
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error']
});

// Global error handlers
process.on('uncaughtException', (error: Error) => {
  console.error('\n❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('\n❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
const shutdown = async (server: http.Server) => {
  console.log('\n🛑 Shutting down server...');
  
  // Close the HTTP server
  server.close(async () => {
    console.log('✅ HTTP server closed');
    
    // Close Prisma connection
    await prisma.$disconnect();
    console.log('✅ Database connection closed');
    
    process.exit(0);
  });

  // Force close server after 5 seconds
  setTimeout(() => {
    console.error('❌ Forcing server shutdown');
    process.exit(1);
  }, 5000);
};

const startServer = async (): Promise<void> => {
  try {
    console.log('🔄 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Add request logging middleware
    app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      const { method, originalUrl, ip } = req;
      
      console.log(`\n📨 [${new Date().toISOString()}] ${method} ${originalUrl} from ${ip}`);
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`✅ [${new Date().toISOString()}] ${method} ${originalUrl} - ${res.statusCode} (${duration}ms)`);
      });
      
      next();
    });

    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5002;
    const HOST = process.env.HOST || '0.0.0.0';
    
    const server = app.listen(PORT, HOST, () => {
      console.log(`\n🚀 Server running in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`🌐 Access the server at http://${HOST}:${PORT}`);
      console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.syscall !== 'listen') throw error;

      switch (error.code) {
        case 'EACCES':
          console.error(`Port ${PORT} requires elevated privileges`);
          process.exit(1);
        case 'EADDRINUSE':
          console.error(`Port ${PORT} is already in use`);
          process.exit(1);
        default:
          throw error;
      }
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();