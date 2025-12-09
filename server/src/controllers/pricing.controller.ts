import { Request, Response } from 'express';
import { pricingService, DailyPrice } from '../services/pricing.service';

export const calculateRoomPrice = async (req: Request, res: Response) => {
  try {
    const { roomTypeId, checkInDate, checkOutDate, guests } = req.body;

    // Validate input
    if (!roomTypeId || !checkInDate || !checkOutDate || guests === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: roomTypeId, checkInDate, checkOutDate, and guests are required',
      });
    }

    const result = await pricingService.calculateTotalPrice({
      roomTypeId: Number(roomTypeId),
      checkInDate: new Date(checkInDate),
      checkOutDate: new Date(checkOutDate),
      guests: Number(guests),
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error calculating room price:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error calculating room price',
    });
  }
};

export const getPriceBreakdown = (dailyPrices: DailyPrice[]) => {
  return {
    basePrice: dailyPrices.reduce((sum, day) => sum + day.basePrice, 0),
    weekendSurcharge: dailyPrices.reduce((sum, day) => sum + day.weekendSurcharge, 0),
    seasonalSurcharge: dailyPrices.reduce((sum, day) => sum + day.seasonalSurcharge, 0),
    occupancySurcharge: dailyPrices.reduce((sum, day) => sum + day.occupancySurcharge, 0),
  };
};
