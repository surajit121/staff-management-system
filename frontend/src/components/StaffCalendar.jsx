import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

export default function StaffCalendar({ staff, attendanceRecords = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Map dates to status securely
  const attendanceMap = useMemo(() => {
    const map = {};
    attendanceRecords.forEach(record => {
      if (record && record.date) {
        map[record.date] = record.status;
      }
    });
    return map;
  }, [attendanceRecords]);

  let presentCount = 0;
  let absentCount = 0;

  // Generate grid arrays
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push({ empty: true, key: `empty-${i}` });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const status = attendanceMap[dateStr];

    if (status) {
      if (status === 'Present' || status === 'Work From Home' || status === 'Half Day') {
        presentCount++;
      } else if (status === 'Absent') {
        absentCount++;
      }
    }

    days.push({
      date: d,
      dateStr,
      status: status || null,
      key: dateStr,
      isToday: dateStr === todayStr
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center bg-surface2/50 p-4 rounded-xl border border-border">
        <div>
          <div className="text-[17px] font-bold text-text">{staff?.name || 'Staff Member'}</div>
          <div className="text-[13px] text-text2 uppercase font-semibold tracking-wider">Attendance Calendar</div>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex gap-4 mr-4 text-xs font-bold text-text2 uppercase cursor-default">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green block"></span> Present ({presentCount})</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red block"></span> Absent ({absentCount})</div>
          </div>
          <div className="flex items-center gap-2 border border-border2 bg-surface rounded-lg p-1">
            <button onClick={prevMonth} className="p-1 rounded-md hover:bg-surface2 text-text2 hover:text-text transition-all"><ChevronLeft size={16} /></button>
            <div className="text-[14px] font-bold min-w-[120px] text-center">{monthName}</div>
            <button onClick={nextMonth} className="p-1 rounded-md hover:bg-surface2 text-text2 hover:text-text transition-all"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border p-5">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-[12px] font-bold text-text3 uppercase uppercase pb-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map(day => {
            if (day.empty) {
              return <div key={day.key} className="h-12 bg-transparent"></div>;
            }

            const isPresent = day.status === 'Present' || day.status === 'Work From Home' || day.status === 'Half Day';
            const isAbsent = day.status === 'Absent';

            return (
              <div
                key={day.key}
                className={cn(
                  "h-12 border rounded-lg flex items-center justify-center text-[14px] font-medium transition-all relative overflow-hidden group",
                  isPresent ? "bg-green-light border-green text-green" :
                    isAbsent ? "bg-red-light border-red text-red" :
                      "bg-surface2/30 border-border text-text2"
                )}
                title={day.status ? `${day.dateStr}: ${day.status}` : day.dateStr}
              >
                {day.isToday && <span className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-accent"></span>}
                {day.date}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
