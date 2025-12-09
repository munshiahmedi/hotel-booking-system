import { PrismaClient, RoomType } from '@prisma/client';

const prisma = new PrismaClient();

interface PriceCalculationParams {
  roomTypeId: number;
  checkInDate: Date;
  checkOutDate: Date;
  guests: number;
}

export interface DailyPrice {
  date: Date;
  basePrice: number;
  weekendSurcharge: number;
  seasonalSurcharge: number;
  occupancySurcharge: number;
  totalPrice: number;
}

export class PricingService {
  // Weekend surcharge rate (e.g., 15% more on weekends)
  private readonly WEEKEND_SURCHARGE_RATE = 0.15;
  
  // Seasonal surcharge rates (example: high season is 20% more)
  private readonly SEASONAL_SURCHARGE_RATE = 0.20;
  
  // Occupancy surcharge (per additional guest beyond base occupancy)
  private readonly OCCUPANCY_SURCHARGE_RATE = 0.10;
  
  // Long stay discount (applied for stays of 7+ days)
  private readonly LONG_STAY_DISCOUNT_DAYS = 7;
  private readonly LONG_STAY_DISCOUNT_RATE = 0.10;

  async calculateTotalPrice(params: PriceCalculationParams): Promise<{
    dailyPrices: DailyPrice[];
    subtotal: number;
    totalDiscount: number;
    totalSurcharge: number;
    totalPrice: number;
  }> {
    const { roomTypeId, checkInDate, checkOutDate, guests } = params;
    
    // Get room type details
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
    });

    if (!roomType) {
      throw new Error('Room type not found');
    }

    // Calculate number of nights
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate daily prices
    const dailyPrices: DailyPrice[] = [];
    
    for (let i = 0; i < nights; i++) {
      const date = new Date(checkInDate);
      date.setDate(date.getDate() + i);
      
      // Get base price (could be overridden by specific date pricing)
      const dailyBasePrice = await this.getDailyBasePrice(roomType, date);
      
      // Calculate surcharges
      const isWeekend = this.isWeekend(date);
      const weekendSurcharge = isWeekend ? dailyBasePrice * this.WEEKEND_SURCHARGE_RATE : 0;
      
      const isHighSeason = this.isHighSeason(date);
      const seasonalSurcharge = isHighSeason ? dailyBasePrice * this.SEASONAL_SURCHARGE_RATE : 0;
      
      const occupancySurcharge = this.calculateOccupancySurcharge(roomType, guests, dailyBasePrice);
      
      const dailyTotal = dailyBasePrice + weekendSurcharge + seasonalSurcharge + occupancySurcharge;
      
      dailyPrices.push({
        date,
        basePrice: dailyBasePrice,
        weekendSurcharge,
        seasonalSurcharge,
        occupancySurcharge,
        totalPrice: dailyTotal,
      });
    }
    
    // Calculate subtotal (sum of all daily totals)
    const subtotal = dailyPrices.reduce((sum, day) => sum + day.totalPrice, 0);
    
    // Apply long stay discount if applicable
    let totalDiscount = 0;
    if (nights >= this.LONG_STAY_DISCOUNT_DAYS) {
      totalDiscount = subtotal * this.LONG_STAY_DISCOUNT_RATE;
    }
    
    const totalSurcharge = dailyPrices.reduce(
      (sum, day) => sum + day.weekendSurcharge + day.seasonalSurcharge + day.occupancySurcharge, 
      0
    );
    
    const totalPrice = subtotal - totalDiscount;
    
    return {
      dailyPrices,
      subtotal,
      totalDiscount,
      totalSurcharge,
      totalPrice,
    };
  }

  private async getDailyBasePrice(roomType: RoomType, date: Date): Promise<number> {
    // Check for specific pricing for this date
    const specificPricing = await prisma.roomPrice.findFirst({
      where: {
        roomTypeId: roomType.id,
        startDate: { lte: date },
        endDate: { gte: date },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return specificPricing?.price ?? roomType.basePrice;
  }

  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
  }

  private isHighSeason(date: Date): boolean {
    // Example: High season is December 15 to January 15 and July 1 to August 31
    const month = date.getMonth() + 1; // getMonth() is 0-indexed
    const day = date.getDate();
    
    // Winter high season
    if (month === 12 && day >= 15) return true;
    if (month === 1 && day <= 15) return true;
    
    // Summer high season
    if (month >= 7 && month <= 8) return true;
    
    return false;
  }

  private calculateOccupancySurcharge(
    roomType: RoomType,
    guests: number,
    basePrice: number
  ): number {
    const extraGuests = Math.max(0, guests - roomType.maxGuests);
    if (extraGuests <= 0) return 0;
    
    // Charge 10% of base price per extra guest
    return basePrice * this.OCCUPANCY_SURCHARGE_RATE * extraGuests;
  }
}

export const pricingService = new PricingService();
