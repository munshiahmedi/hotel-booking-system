import { Request, Response, NextFunction } from 'express';

type Role = 'ADMIN' | 'MANAGER' | 'CUSTOMER' | 'STAFF';

/**
 * Role-Based Access Control Middleware
 * @param allowedRoles Array of roles that are allowed to access the route
 */
export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'UNAUTHENTICATED'
      });
    }

    // Check if user has one of the allowed roles
    if (!allowedRoles.includes(req.user.role as Role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'FORBIDDEN',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has admin role
 */
export const requireAdmin = requireRole(['ADMIN']);

/**
 * Middleware to check if user has manager or admin role
 */
export const requireManagerOrAdmin = requireRole(['ADMIN', 'MANAGER']);

/**
 * Middleware to check if user has customer role
 */
export const requireCustomer = requireRole(['CUSTOMER']);

/**
 * Middleware to check if user is staff (manager or admin)
 */
export const requireStaff = requireRole(['ADMIN', 'MANAGER', 'STAFF']);
