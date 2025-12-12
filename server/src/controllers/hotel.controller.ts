import { Request, Response } from 'express';
import { prisma } from '../app';
import { Prisma } from '@prisma/client';

export const createHotel = async (req: Request, res: Response) => {
  try {
    const { name, address, city, country, description, rating } = req.body;
    
    const hotel = await prisma.hotel.create({
      data: {
        name,
        address,
        city,
        country,
        description,
        rating: rating ? parseFloat(rating) : null,
      },
    });

    res.status(201).json({
      success: true,
      data: hotel,
      message: 'Hotel created successfully',
    });
  } catch (error: any) {
    console.error('Error creating hotel:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating hotel',
      error: error.message,
    });
  }
};

export const getHotels = async (req: Request, res: Response) => {
  try {
    const hotels = await prisma.hotel.findMany({
      include: {
        rooms: true,
        roomTypes: true,
      },
    });

    res.status(200).json({
      success: true,
      count: hotels.length,
      data: hotels,
    });
  } catch (error: any) {
    console.error('Error fetching hotels:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching hotels',
      error: error.message,
    });
  }
};

export const updateHotel = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, address, city, country, description, rating } = req.body;

    // Input validation
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hotel ID',
      });
    }

    // Check if hotel exists
    const existingHotel = await prisma.hotel.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingHotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found',
      });
    }

    // Prepare update data
    const updateData: {
      name?: string;
      address?: string;
      city?: string;
      country?: string;
      description?: string | null;
      rating?: number | null;
    } = {};

    // Only add fields that are provided in the request
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (country !== undefined) updateData.country = country;
    if (description !== undefined) updateData.description = description;
    if (rating !== undefined) {
      updateData.rating = rating === null ? null : parseFloat(rating as string);
    }

    // Update the hotel
    const hotel = await prisma.hotel.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      data: hotel,
      message: 'Hotel updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating hotel:', error);
    
    // Handle Prisma specific errors
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating hotel',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const deleteHotel = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // First delete all related rooms to avoid foreign key constraint
    await prisma.room.deleteMany({
      where: { hotelId: parseInt(id) },
    });

    await prisma.hotel.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({
      success: true,
      message: 'Hotel and associated rooms deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting hotel:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting hotel',
      error: error.message,
    });
  }
};
