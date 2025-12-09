import { Router } from 'express';
import { authenticateJWT } from '../middlewares/jwt.middleware';
import { requireAdmin } from '../middlewares/role.middleware';
import {
  createHotel,
  getHotels,
  updateHotel,
  deleteHotel,
} from '../controllers/hotel.controller';

const router = Router();

/**
 * @route   POST /api/hotels
 * @desc    Create a new hotel (Admin only)
 * @access  Private/Admin
 */
router.post('/', authenticateJWT, requireAdmin, createHotel);

/**
 * @route   GET /api/hotels
 * @desc    Get all hotels
 * @access  Public
 */
router.get('/', getHotels);

/**
 * @route   PUT /api/hotels/:id
 * @desc    Update a hotel (Admin only)
 * @access  Private/Admin
 */
router.put('/:id', authenticateJWT, requireAdmin, updateHotel);

/**
 * @route   DELETE /api/hotels/:id
 * @desc    Delete a hotel (Admin only)
 * @access  Private/Admin
 */
router.delete('/:id', authenticateJWT, requireAdmin, deleteHotel);

export default router;
