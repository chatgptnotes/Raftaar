import React from 'react';

const BookingTable = () => {
  const bookings = [
    {
      id: 'BKT7020598',
      driver: 'Not Assigned',
      hospital: 'Not Assigned',
      timing: '2025-10-10 16:30:13',
      status: 'Select Driver',
      selectCharge: 'Select Charge',
      hospitalName: 'Select Hospital',
      totalAmount: '8.25 km',
      distance: '142.00 Rs',
      bookingSource: 'Booth Gandhinagar',
      remarks: 'Pending',
      equipment: 'Only',
      actionStatus: 'Booking',
    },
    {
      id: 'BKT7020597',
      driver: 'Not Assigned',
      hospital: 'Not Assigned',
      timing: '2025-10-10 15:07:11',
      status: 'Select Driver',
      selectCharge: 'Select Charge',
      hospitalName: 'Select Hospital',
      totalAmount: '9.87 km',
      distance: '152.89 Rs',
      bookingSource: 'Booth Gandhinagar',
      remarks: 'Pending',
      equipment: 'Only',
      actionStatus: 'Booking',
    },
    {
      id: 'BKT7020596',
      driver: 'Not Assigned',
      hospital: 'Not Assigned',
      timing: '2025-10-10 13:57:27',
      status: 'Select Driver',
      selectCharge: 'Select Charge',
      hospitalName: 'Select Hospital',
      totalAmount: '6.67 km',
      distance: '89.23 Rs',
      bookingSource: 'Only',
      remarks: 'Pending',
      equipment: 'Only',
      actionStatus: 'Booking',
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Real-Time Bookings</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          View All
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Booking ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Driver</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Hospital</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Timing</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Distance</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking, index) => (
              <tr
                key={booking.id}
                className={`border-b border-gray-100 hover:bg-gray-50 transition ${
                  index % 2 === 0 ? 'bg-green-50' : 'bg-white'
                }`}
              >
                <td className="px-4 py-4">
                  <span className="text-blue-600 font-semibold">{booking.id}</span>
                </td>
                <td className="px-4 py-4 text-gray-600 text-sm">{booking.driver}</td>
                <td className="px-4 py-4 text-gray-600 text-sm">{booking.hospital}</td>
                <td className="px-4 py-4 text-gray-600 text-sm">{booking.timing}</td>
                <td className="px-4 py-4 text-gray-600 text-sm">{booking.totalAmount}</td>
                <td className="px-4 py-4 text-gray-600 text-sm font-semibold">{booking.distance}</td>
                <td className="px-4 py-4">
                  <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold">
                    {booking.remarks}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <button className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-blue-700 transition">
                    Assign
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BookingTable;
