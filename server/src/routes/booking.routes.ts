import { Router } from 'express';
import { authenticateJWT } from '../middlewares/jwt.middleware';
import { requireCustomer, requireAdmin, requireManagerOrAdmin } from '../middlewares/role.middleware';
import { 
  createBooking, 
  getBooking, 
  updateBooking,
  cancelBooking,
  getUserBookings,
  getAllBookings
} from '../controllers/booking.controller';

const router = Router();

// Create a new booking
router.post('/', authenticateJWT, requireCustomer, createBooking);

// Get all bookings for the logged-in user
router.get('/user', authenticateJWT, requireCustomer, getUserBookings);

// Get all bookings (Admin/Manager only)
router.get('/', authenticateJWT, requireManagerOrAdmin, getAllBookings);

// Get booking details
router.get('/:id', authenticateJWT, getBooking);

// Update booking
router.put('/:id', authenticateJWT, updateBooking);

// Cancel booking
router.delete('/:id', authenticateJWT, cancelBooking);

export { router as bookingRouter };
