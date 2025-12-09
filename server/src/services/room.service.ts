import { prisma } from '../app';
import { pricingService } from './pricing.service';

export const roomService = {
  async isRoomAvailable(roomId: number, checkIn: Date, checkOut: Date): Promise<boolean> {
    const overlappingBookings = await prisma.bookingItem.count({
      where: {
        roomId,
        booking: {
          OR: [
            {
              checkIn: { lte: checkOut },
              checkOut: { gte: checkIn }
            }
          ]
        }
      }
    });

    return overlappingBookings === 0;
  },

  async getAvailableRooms(hotelId: number, checkIn: Date, checkOut: Date, guests: number = 1) {
    const rooms = await prisma.room.findMany({
      where: {
        hotelId,
        roomType: {
          maxGuests: {
            gte: guests
          }
        },
        NOT: {
          bookingItems: {
            some: {
              booking: {
                OR: [
                  {
                    AND: [
                      { checkIn: { lte: checkOut } },
                      { checkOut: { gte: checkIn } }
                    ]
                  }
                ],
                status: { not: 'cancelled' } // Only consider non-cancelled bookings
              }
            }
          }
        }
      },
      include: {
        bookingItems: {
          include: {
            booking: true
          }
        }
      }
    });

    return rooms;
  }
};