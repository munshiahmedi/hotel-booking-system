# Hotel Booking System — Database Plan

## Entities (Tables)
1. User (Customer, Admin, Hotel Staff)
2. Hotel
3. RoomType
4. Room
5. Booking
6. Payment
7. Housekeeping / Maintenance
8. Notifications

## Relationships
- User → Booking (One-to-Many)
- Hotel → Room (One-to-Many)
- Room → RoomType (Many-to-One)
- Booking → Payment (One-to-One)
- Room → Booking (Many-to-Many via BookingItems)
