// server/src/controllers/booking.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../app';
import { pricingService } from '../services/pricing.service';
import { getPriceBreakdown } from './pricing.controller';
import { roomService } from '../services/room.service';

interface CreateBookingInput {
  roomId: number;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  guestName: string;
  guestEmail: string;
  specialRequests?: string;
}

// Create Booking
export const createBooking = async (req: Request, res: Response) => {
  try {
    // Ensure user is authenticated
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to create a booking',
      });
    }

    const {
      roomId,
      checkInDate,
      checkOutDate,
      guests,
      guestName,
      guestEmail,
      specialRequests,
    } = req.body as CreateBookingInput;

    // Validate input
    if (!roomId || !checkInDate || !checkOutDate || !guests || !guestName || !guestEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Check if room exists and is available
    const room = await prisma.room.findUnique({
      where: { id: Number(roomId) },
      include: { roomType: true },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    if (room.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Room is not available for booking',
      });
    }

    // Check if room is already booked for the given dates
    const existingBooking = await prisma.booking.findFirst({
      where: {
        bookingItems: {
          some: {
            roomId: Number(roomId),
            booking: {
              checkIn: { lte: new Date(checkOutDate) },
              checkOut: { gte: new Date(checkInDate) },
            },
          },
        },
      },
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'Room is already booked for the selected dates',
      });
    }

    // Calculate price
    const priceResult = await pricingService.calculateTotalPrice({
      roomTypeId: room.roomTypeId,
      checkInDate: new Date(checkInDate),
      checkOutDate: new Date(checkOutDate),
      guests: Number(guests),
    });

    // Create booking
    const bookingData = {
      userId: req.user.id, // Now guaranteed to be a number
      hotelId: room.hotelId,
      checkIn: new Date(checkInDate),
      checkOut: new Date(checkOutDate),
      totalAmount: priceResult.totalPrice,
      status: 'confirmed',
      guestName,
      guestEmail,
      specialRequests,
      bookingItems: {
        create: {
          roomId: room.id,
          pricePerNight: priceResult.dailyPrices[0]?.totalPrice || room.roomType.basePrice,
          nights: priceResult.dailyPrices.length,
        },
      },
    };

    const booking = await prisma.booking.create({
      data: bookingData,
      include: {
        bookingItems: {
          include: {
            room: {
              include: {
                roomType: true,
              },
            },
          },
        },
      },
    });

    // Update room status to booked
    await prisma.room.update({
      where: { id: room.id },
      data: { status: 'booked' },
    });

    res.status(201).json({
      success: true,
      data: {
        booking,
        priceBreakdown: {
          ...getPriceBreakdown(priceResult.dailyPrices),
          totalDiscount: priceResult.totalDiscount,
          totalPrice: priceResult.totalPrice,
        },
      },
      message: 'Booking created successfully',
    });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Get User's Bookings
export const getUserBookings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const bookings = await prisma.booking.findMany({
      where: { userId: Number(userId) },
      include: {
        bookingItems: {
          include: {
            room: {
              include: {
                roomType: true,
              },
            },
          },
        },
        hotel: true,
      },
      orderBy: {
        checkIn: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error: any) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Get All Bookings (Admin/Manager)
export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const { status, startDate, endDate } = req.query;
    
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (startDate || endDate) {
      where.AND = [];
      if (startDate) {
        where.AND.push({ checkIn: { gte: new Date(startDate as string) } });
      }
      if (endDate) {
        where.AND.push({ checkOut: { lte: new Date(endDate as string) } });
      }
    }
    

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        bookingItems: {
          include: {
            room: {
              include: {
                roomType: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        hotel: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error: any) {
    console.error('Error fetching all bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Get Booking by ID
export const getBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id: Number(id) },
      include: {
        bookingItems: {
          include: {
            room: {
              include: {
                roomType: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Only allow the booking owner or admin/manager to view the booking
    if (req.user?.id !== booking.userId && req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking',
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error: any) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Update Booking
export const updateBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { specialRequests, status } = req.body;

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: Number(id) },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if user is authorized (owner or admin/manager)
    if (req.user?.id !== booking.userId && req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking',
      });
    }

    // Only allow status updates for admin/manager
    if (status && req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can update booking status',
      });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: Number(id) },
      data: {
        ...(specialRequests && { specialRequests }),
        ...(status && { status }),
      },
      include: {
        bookingItems: {
          include: {
            room: {
              include: {
                roomType: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: updatedBooking,
      message: 'Booking updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Cancel Booking
export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: Number(id) },
      include: {
        bookingItems: true,
      },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if user is authorized (owner or admin/manager)
    if (req.user?.id !== booking.userId && req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking',
      });
    }

    // Update booking status to cancelled
    const cancelledBooking = await prisma.booking.update({
      where: { id: Number(id) },
      data: { status: 'cancelled' },
    });

    // Update room status back to available
    await Promise.all(
      booking.bookingItems.map(item =>
        prisma.room.update({
          where: { id: item.roomId },
          data: { status: 'available' },
        })
      )
    );

    res.status(200).json({
      success: true,
      data: cancelledBooking,
      message: 'Booking cancelled successfully',
    });
  } catch (error: any) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};