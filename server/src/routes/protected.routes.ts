import { Router } from 'express';
import { authenticateJWT } from '../middlewares/jwt.middleware';
import { requireAdmin, requireManagerOrAdmin, requireCustomer, requireStaff } from '../middlewares/role.middleware';

const router = Router();

/**
 * @route   GET /api/protected/profile
 * @desc    Get current user's profile (protected route)
 * @access  Private (requires valid JWT)
 */
router.get('/profile', authenticateJWT, (req, res) => {
  // req.user is now available with user info
  res.json({
    success: true,
    data: {
      user: req.user,
      message: 'Profile data retrieved successfully'
    }
  });
});

/**
 * @route   GET /api/protected/admin
 * @desc    Admin dashboard (protected route, admin only)
 * @access  Private (requires admin role)
 */
// Admin only routes
router.get('/admin', 
  authenticateJWT, 
  requireAdmin, 
  (req, res) => {
    res.json({ 
      success: true,
      data: { 
        message: 'Welcome to the admin dashboard',
        user: req.user
      }
    });
  }
);

// Manager or Admin routes
router.get('/hotels', 
  authenticateJWT, 
  requireManagerOrAdmin,
  async (req, res) => {
    // Example: Get all hotels (only accessible by managers and admins)
    const hotels = await req.prisma.hotel.findMany();
    
    res.json({
      success: true,
      data: {
        message: 'List of all hotels',
        hotels
      }
    });
  }
);

// Staff routes (admin, manager, or staff)
router.get('/staff/dashboard', 
  authenticateJWT,
  requireStaff,
  (req, res) => {
    res.json({
      success: true,
      data: {
        message: 'Welcome to staff dashboard',
        user: req.user
      }
    });
  }
);

// Customer specific routes
router.get('/my-bookings',
  authenticateJWT,
  requireCustomer,
  async (req, res) => {
    // Example: Get bookings for the logged-in customer
    const bookings = await req.prisma.booking.findMany({
      where: { userId: req.user?.id },
      include: { 
        bookingItems: {
          include: {
            room: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        message: 'Your bookings',
        bookings
      }
    });
  }
);

export default router;
