import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data in the correct order to respect foreign key constraints
  await prisma.bookingItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.cancellation.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.review.deleteMany();
  await prisma.housekeepingTask.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.availabilitySlot.deleteMany();
  await prisma.room.deleteMany();
  await prisma.roomPrice.deleteMany();
  await prisma.roomType.deleteMany();
  await prisma.hotelBranch.deleteMany();
  await prisma.hotel.deleteMany();
  await prisma.user.deleteMany();
  await prisma.promoCode.deleteMany();
  await prisma.tax.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.analyticsBookingDaily.deleteMany();
  await prisma.adminLog.deleteMany();
  await prisma.notification.deleteMany();

  // USERS
  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@example.com",
      password: "admin123",
      role: "admin",
      phone: "+1234567890",
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "Hotel Manager",
      email: "manager@example.com",
      password: "manager123",
      role: "staff",
      phone: "+1234567891",
    },
  });

  const customer = await prisma.user.create({
    data: {
      name: "John Customer",
      email: "customer@example.com",
      password: "customer123",
      role: "customer",
      phone: "+1234567892",
    },
  });

  // HOTEL
  const hotel = await prisma.hotel.create({
    data: {
      name: "Royal Grand Hotel",
      description: "5-star luxury hotel",
      address: "Main Street, City Center",
      city: "Metropolis",
      country: "USA",
      rating: 4.8,
    },
  });

  // BRANCHES
  const branch1 = await prisma.hotelBranch.create({
    data: {
      name: "Royal Grand - Downtown",
      address: "123 Downtown Area",
      city: "Metropolis",
      country: "USA",
      hotelId: hotel.id,
    },
  });

  const branch2 = await prisma.hotelBranch.create({
    data: {
      name: "Royal Grand - Airport",
      address: "456 Airport Road",
      city: "Metropolis",
      country: "USA",
      hotelId: hotel.id,
    },
  });

  // ROOM TYPES
  const deluxe = await prisma.roomType.create({
    data: {
      name: "Deluxe Room",
      description: "Spacious room with king-size bed",
      maxGuests: 2,
      basePrice: 120,
      hotelId: hotel.id,
    },
  });

  const suite = await prisma.roomType.create({
    data: {
      name: "Executive Suite",
      description: "Luxury suite with living area",
      maxGuests: 4,
      basePrice: 250,
      hotelId: hotel.id,
    },
  });

  const standard = await prisma.roomType.create({
    data: {
      name: "Standard Room",
      description: "Basic room for budget travelers",
      maxGuests: 2,
      basePrice: 80,
      hotelId: hotel.id,
    },
  });

  // ROOMS
  const rooms = await prisma.room.createMany({
    data: [
      { roomNumber: "101", floor: 1, hotelId: hotel.id, hotelBranchId: branch1.id, roomTypeId: deluxe.id, status: "available" },
      { roomNumber: "102", floor: 1, hotelId: hotel.id, hotelBranchId: branch1.id, roomTypeId: deluxe.id, status: "available" },
      { roomNumber: "201", floor: 2, hotelId: hotel.id, hotelBranchId: branch1.id, roomTypeId: suite.id, status: "booked" },
      { roomNumber: "202", floor: 2, hotelId: hotel.id, hotelBranchId: branch2.id, roomTypeId: suite.id, status: "maintenance" },
      { roomNumber: "301", floor: 3, hotelId: hotel.id, hotelBranchId: branch2.id, roomTypeId: standard.id, status: "available" },
      { roomNumber: "302", floor: 3, hotelId: hotel.id, hotelBranchId: branch2.id, roomTypeId: standard.id, status: "available" },
    ],
  });

  // ROOM PRICES
  await prisma.roomPrice.createMany({
    data: [
      { roomTypeId: deluxe.id, startDate: new Date(), endDate: new Date("2026-01-01"), price: 150 },
      { roomTypeId: suite.id, startDate: new Date(), endDate: new Date("2026-01-01"), price: 300 },
      { roomTypeId: standard.id, startDate: new Date(), endDate: new Date("2026-01-01"), price: 100 },
    ],
  });

  // Get the created rooms to reference their IDs
  const createdRooms = await prisma.room.findMany();
  
  // AVAILABILITY
  await prisma.availabilitySlot.createMany({
    data: [
      { roomId: createdRooms[0].id, date: new Date("2025-12-08"), isAvailable: true },
      { roomId: createdRooms[1].id, date: new Date("2025-12-08"), isAvailable: true },
      { roomId: createdRooms[2].id, date: new Date("2025-12-08"), isAvailable: false },
    ],
  });

  // TAXES
  await prisma.tax.createMany({
    data: [
      { name: "Service Tax", percentage: 12 },
      { name: "Luxury Tax", percentage: 18 },
    ],
  });

  // PROMO CODES
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  
  await prisma.promoCode.createMany({
    data: [
      { 
        code: "WELCOME10", 
        discount: 10, 
        validFrom: new Date(), 
        validTo: nextMonth,
        usageLimit: 100
      },
      { 
        code: "NEWYEAR25", 
        discount: 25, 
        validFrom: new Date(),
        validTo: new Date("2026-01-15"),
        usageLimit: 50
      },
    ],
  });

  // HOUSEKEEPING TASKS
  await prisma.housekeepingTask.createMany({
    data: [
      {
        roomId: createdRooms[0].id,
        assignedToId: manager.id,
        status: "pending",
        taskName: "Room Cleaning"
      },
      {
        roomId: createdRooms[1].id,
        assignedToId: manager.id,
        status: "done",
        taskName: "Laundry"
      },
    ],
  });

  // MAINTENANCE REQUESTS
  await prisma.maintenanceRequest.createMany({
    data: [
      { 
        roomId: createdRooms[2].id,
        issue: "AC not working",
        status: "pending"
      },
      { 
        roomId: createdRooms[4].id,
        issue: "Light flickering",
        status: "done"
      },
    ],
  });

  // Create a sample booking
  const booking = await prisma.booking.create({
    data: {
      userId: customer.id,
      hotelId: hotel.id,
      checkIn: new Date("2025-12-10"),
      checkOut: new Date("2025-12-15"),
      totalAmount: 600,
      status: "confirmed",
      bookingItems: {
        create: [
          {
            roomId: createdRooms[0].id,
            pricePerNight: 150,
            nights: 5
          }
        ]
      },
      payment: {
        create: {
          amount: 600,
          method: "card",
          status: "paid",
          transactionId: "TXN" + Math.floor(Math.random() * 1000000)
        }
      }
    },
    include: {
      bookingItems: true,
      payment: true
    }
  });

  console.log("🌱 Seeding complete!");
  return {
    admin,
    manager,
    customer,
    hotel,
    booking
  };
}

main()
  .then(async (result) => {
    console.log("✅ Database has been seeded successfully!");
    console.log("🔑 Admin credentials:", {
      email: result.admin.email,
      password: "admin123"
    });
    console.log("🔑 Manager credentials:", {
      email: result.manager.email,
      password: "manager123"
    });
    console.log("🔑 Customer credentials:", {
      email: result.customer.email,
      password: "customer123"
    });
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error seeding database:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
