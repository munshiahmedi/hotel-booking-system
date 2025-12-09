import { Router } from 'express';
import { authenticateJWT } from '../middlewares/jwt.middleware';
import { requireAdmin, requireManagerOrAdmin } from '../middlewares/role.middleware';
import {
  createRoom,
  getRoomsByHotel,
  updateRoom,
  deleteRoom,
  getAvailableRooms,
} from '../controllers/room.controller';
import { calculateRoomPrice } from '../controllers/pricing.controller';

const router = Router();

/**
 * @route   POST /api/rooms
 * @desc    Create a new room (Admin/Manager only)
 * @access  Private/Admin/Manager
 */
router.post('/', authenticateJWT, requireManagerOrAdmin, createRoom);

/**
 * @route   GET /api/rooms/available
 * @desc    Get available rooms with pricing
 * @access  Public
 * @query   {string} hotelId - ID of the hotel
 * @query   {string} checkInDate - Check-in date (YYYY-MM-DD)
 * @query   {string} checkOutDate - Check-out date (YYYY-MM-DD)
 * @query   {number} [guests=1] - Number of guests
 */
router.get('/available', getAvailableRooms);

/**
 * @route   GET /api/rooms/:hotelId
 * @desc    Get all rooms for a specific hotel
 * @access  Public
 */
router.get('/:hotelId', getRoomsByHotel);

/**
 * @route   PUT /api/rooms/:id
 * @desc    Update a room (Admin/Manager only)
 * @access  Private/Admin/Manager
 */
router.put('/:id', authenticateJWT, requireManagerOrAdmin, updateRoom);

/**
 * @route   DELETE /api/rooms/:id
 * @desc    Delete a room (Admin only)
 * @access  Private/Admin
 */
router.delete('/:id', authenticateJWT, requireAdmin, deleteRoom);

/**
 * @route   POST /api/rooms/calculate-price
 * @desc    Calculate room price with all applicable charges and discounts
 * @access  Public
 */
router.post('/calculate-price', calculateRoomPrice);

export { router as roomRouter };
