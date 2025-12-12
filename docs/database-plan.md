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
1. User
2. Hotel
3. RoomType
4. Room
5. Booking
6. BookingItems
7. Payment
8. HousekeepingTask
9. Review
10. Notification
11. AdminLog
Table users {
  id int [pk, increment]
  name varchar
  email varchar
  phone varchar
  password varchar
  role varchar
  createdAt timestamp
  updatedAt timestamp
}

Table hotels {
  id int [pk, increment]
  name varchar
  address text
  city varchar
  country varchar
  description text
  rating float
  createdAt timestamp
  updatedAt timestamp
}

Table room_types {
  id int [pk, increment]
  hotelId int [ref: > hotels.id]
  name varchar
  description text
  maxGuests int
  basePrice decimal
  createdAt timestamp
  updatedAt timestamp
}

Table rooms {
  id int [pk, increment]
  hotelId int [ref: > hotels.id]
  roomTypeId int [ref: > room_types.id]
  roomNumber varchar
  floor int
  status varchar
  createdAt timestamp
  updatedAt timestamp
}

Table bookings {
  id int [pk, increment]
  userId int [ref: > users.id]
  hotelId int [ref: > hotels.id]
  checkIn date
  checkOut date
  totalAmount decimal
  status varchar
  createdAt timestamp
  updatedAt timestamp
}

Table booking_items {
  id int [pk, increment]
  bookingId int [ref: > bookings.id]
  roomId int [ref: > rooms.id]
  pricePerNight decimal
  nights int
  createdAt timestamp
  updatedAt timestamp
}

Table payments {
  id int [pk, increment]
  bookingId int [ref: > bookings.id, unique]
  amount decimal
  method varchar
  status varchar
  transactionId varchar
  createdAt timestamp
}

Table housekeeping_tasks {
  id int [pk, increment]
  roomId int [ref: > rooms.id]
  taskName varchar
  assignedTo int [ref: > users.id]
  status varchar
  createdAt timestamp
  updatedAt timestamp
}

Table reviews {
  id int [pk, increment]
  hotelId int [ref: > hotels.id]
  userId int [ref: > users.id]
  rating int
  comment text
  createdAt timestamp
}

Table notifications {
  id int [pk, increment]
  userId int [ref: > users.id]
  title varchar
  message text
  readStatus boolean
  createdAt timestamp
}

Table admin_logs {
  id int [pk, increment]
  adminId int [ref: > users.id]
  action varchar
  description text
  createdAt timestamp
}