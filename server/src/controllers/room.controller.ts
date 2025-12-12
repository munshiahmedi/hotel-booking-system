import { Request, Response } from 'express';
import { prisma } from '../app';
import { Prisma } from '@prisma/client';
import { roomService } from '../services/room.service';
import { getPriceBreakdown } from './pricing.controller';
import { pricingService } from '../services/pricing.service';

interface RoomCreateInput {
  roomNumber: string | number;
  roomTypeId: number | string;
  hotelId: number | string;
  floor: number | string;
  status?: string;
}

interface RoomUpdateInput {
  roomNumber?: string | number;
  roomTypeId?: number | string;
  hotelId?: number | string;
  floor?: number | string;
  status?: string;
}

export const createRoom = async (req: Request, res: Response) => {
  try {
    const { roomNumber, roomTypeId, hotelId, floor, status } = req.body as RoomCreateInput;

    // Validate required fields
    if (!roomNumber || !roomTypeId || !hotelId || !floor) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: roomNumber, roomTypeId, hotelId, and floor are required',
      });
    }

    // Check if hotel exists
    const hotel = await prisma.hotel.findUnique({
      where: { id: Number(hotelId) }
    });

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found',
      });
    }

    // Check if room type exists
    const roomType = await prisma.roomType.findUnique({
      where: { id: Number(roomTypeId) }
    });

    if (!roomType) {
      return res.status(404).json({
        success: false,
        message: 'Room type not found',
      });
    }

    // Check if room number already exists in this hotel
    const existingRoom = await prisma.room.findFirst({
      where: {
        roomNumber: roomNumber.toString(),
        hotelId: Number(hotelId)
      }
    });

    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: 'A room with this number already exists in this hotel',
      });
    }

    const room = await prisma.room.create({
      data: {
        roomNumber: roomNumber.toString(),
        roomTypeId: Number(roomTypeId),
        hotelId: Number(hotelId),
        floor: Number(floor),
        status: status || 'available',
      },
      include: {
        roomType: true,
        hotel: true,
      },
    });

    res.status(201).json({
      success: true,
      data: room,
      message: 'Room created successfully',
    });
  } catch (error: any) {
    console.error('Error creating room:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating room',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const getRoomsByHotel = async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;
    
    if (!hotelId || isNaN(Number(hotelId))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hotel ID',
      });
    }

    const hotel = await prisma.hotel.findUnique({
      where: { id: Number(hotelId) },
    });

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found',
      });
    }

    const rooms = await prisma.room.findMany({
      where: { hotelId: Number(hotelId) },
      include: {
        roomType: true,
        hotel: true,
      },
      orderBy: {
        floor: 'asc',
      },
    });

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms,
    });
  } catch (error: any) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching rooms',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const updateRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: RoomUpdateInput = req.body;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid room ID',
      });
    }

    // Check if room exists
    const existingRoom = await prisma.room.findUnique({
      where: { id: Number(id) },
    });

    if (!existingRoom) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    // If updating hotel, check if the new hotel exists
    if (updateData.hotelId) {
      const hotel = await prisma.hotel.findUnique({
        where: { id: Number(updateData.hotelId) },
      });

      if (!hotel) {
        return res.status(404).json({
          success: false,
          message: 'Hotel not found',
        });
      }
    }

    // If updating room type, check if it exists
    if (updateData.roomTypeId) {
      const roomType = await prisma.roomType.findUnique({
        where: { id: Number(updateData.roomTypeId) },
      });

      if (!roomType) {
        return res.status(404).json({
          success: false,
          message: 'Room type not found',
        });
      }
    }

    // Check if room number already exists in the hotel
    if (updateData.roomNumber) {
      const existingRoomWithNumber = await prisma.room.findFirst({
        where: {
          roomNumber: updateData.roomNumber.toString(),
          hotelId: updateData.hotelId ? Number(updateData.hotelId) : existingRoom.hotelId,
          NOT: {
            id: Number(id),
          },
        },
      });

      if (existingRoomWithNumber) {
        return res.status(400).json({
          success: false,
          message: 'A room with this number already exists in the hotel',
        });
      }
    }

    const updatedRoom = await prisma.room.update({
      where: { id: Number(id) },
      data: {
        ...(updateData.roomNumber !== undefined && { roomNumber: updateData.roomNumber.toString() }),
        ...(updateData.roomTypeId !== undefined && { roomTypeId: Number(updateData.roomTypeId) }),
        ...(updateData.hotelId !== undefined && { hotelId: Number(updateData.hotelId) }),
        ...(updateData.floor !== undefined && { floor: Number(updateData.floor) }),
        ...(updateData.status !== undefined && { status: updateData.status }),
      },
      include: {
        roomType: true,
        hotel: true,
      },
    });

    res.status(200).json({
      success: true,
      data: updatedRoom,
      message: 'Room updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating room:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating room',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const getAvailableRooms = async (req: Request, res: Response) => {
  try {
    console.log('Raw query params:', req.query);
    console.log('Request URL:', req.originalUrl);
    
    const { hotelId, checkInDate, checkOutDate, guests } = req.query;
    
    console.log('Parsed query params:', { 
      hotelId, 
      checkInDate, 
      checkOutDate, 
      guests,
      hotelIdType: typeof hotelId,
      hotelIdValue: hotelId,
      isString: typeof hotelId === 'string',
      isEmpty: hotelId === ''
    });
    
    if (!hotelId) {
      console.error('Hotel ID is missing');
      return res.status(400).json({
        success: false,
        message: 'Hotel ID is required',
      });
    }
    
    const numericHotelId = Number(hotelId);
    if (isNaN(numericHotelId)) {
      console.error('Hotel ID is not a number:', hotelId);
      return res.status(400).json({
        success: false,
        message: 'Hotel ID must be a number',
      });
    }
    
    // Check if hotel exists
    const hotel = await prisma.hotel.findUnique({
      where: { id: numericHotelId },
    });
    
    if (!hotel) {
      console.error('Hotel not found with ID:', numericHotelId);
      return res.status(404).json({
        success: false,
        message: 'Hotel not found',
      });
    }

    // Validate dates
    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        message: 'Both checkInDate and checkOutDate are required',
      });
    }

    const checkIn = new Date(checkInDate as string);
    const checkOut = new Date(checkOutDate as string);
    const guestCount = guests ? parseInt(guests as string) : 1;

    const rooms = await roomService.getAvailableRooms(
      Number(hotelId),
      checkIn,
      checkOut,
      guestCount
    );

    // Get prices for available rooms
    const roomsWithPrices = await Promise.all(
      rooms.map(async (room) => {
        const priceResult = await pricingService.calculateTotalPrice({
          roomTypeId: room.roomTypeId,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          guests: guestCount,
        });

        return {
          ...room,
          priceBreakdown: {
            ...getPriceBreakdown(priceResult.dailyPrices),
            totalDiscount: priceResult.totalDiscount,
            totalPrice: priceResult.totalPrice,
          }
        };
      })
    );

    res.status(200).json({
      success: true,
      count: roomsWithPrices.length,
      data: roomsWithPrices,
    });
  } catch (error: any) {
    console.error('Error fetching available rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available rooms',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid room ID',
      });
    }

    // Check if room exists
    const existingRoom = await prisma.room.findUnique({
      where: { id: Number(id) },
    });

    if (!existingRoom) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    // Check if room has any bookings
    const hasBookings = await prisma.bookingItem.count({
      where: { roomId: Number(id) },
    }) > 0;

    if (hasBookings) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete room with existing bookings',
      });
    }

    await prisma.room.delete({
      where: { id: Number(id) },
    });

    res.status(200).json({
      success: true,
      message: 'Room deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting room:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error deleting room',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
