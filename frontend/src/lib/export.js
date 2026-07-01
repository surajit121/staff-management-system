import * as XLSX from 'xlsx';

export function downloadCSV(data, filename) {
  if (!data || !data.length) return;

  // Extract headers
  const headers = Object.keys(data[0]);
  
  // Format rows
  const csvRows = [];
  csvRows.push(headers.join(',')); // Add header row

  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header] ?? '';
      // Escape commas and quotes
      const escaped = ('' + val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  // Create blob and download link
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function downloadMonthlyAttendanceExcel(staffList, attendanceRecords, year, month) {
  // month is 1-indexed: 1 = Jan, 12 = Dec
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[month - 1];

  const prefix = `${year}-${String(month).padStart(2, '0')}`;

  const titleRow = [`Monthly Attendance Report - ${monthName} ${year}`];
  const generatedRow = [`Generated on: ${new Date().toLocaleDateString('en-IN')}`];
  const blankRow = [];
  const headerRow = [
    'Staff Name', 'Role', 'Department', 'Email', 'Phone',
    ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1)),
    'Present (P)', 'Absent (A)', 'Half Day (HD)', 'WFH', 'N/A', 'Unmarked'
  ];

  const dataRows = staffList.map(staff => {
    let presentCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;
    let wfhCount = 0;
    let naCount = 0;
    let unmarkedCount = 0;

    const dayStatusList = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${prefix}-${String(day).padStart(2, '0')}`;
      const record = attendanceRecords.find(r => {
        const staffIdStr = r.staffId?._id || r.staffId;
        const recordDateStr = r.date?.split('T')[0];
        return staffIdStr === staff._id && recordDateStr === dateStr;
      });

      if (record) {
        const status = record.status;
        if (status === 'Present') {
          presentCount++;
          dayStatusList.push('P');
        } else if (status === 'Absent') {
          absentCount++;
          dayStatusList.push('A');
        } else if (status === 'Half Day') {
          halfDayCount++;
          dayStatusList.push('HD');
        } else if (status === 'Work From Home') {
          wfhCount++;
          dayStatusList.push('WFH');
        } else if (status === 'N/A') {
          naCount++;
          dayStatusList.push('N/A');
        } else {
          unmarkedCount++;
          dayStatusList.push('-');
        }
      } else {
        unmarkedCount++;
        dayStatusList.push('-');
      }
    }

    return [
      staff.name,
      staff.role,
      staff.dept,
      staff.email,
      staff.phone,
      ...dayStatusList,
      presentCount,
      absentCount,
      halfDayCount,
      wfhCount,
      naCount,
      unmarkedCount
    ];
  });

  const allRows = [
    titleRow,
    generatedRow,
    blankRow,
    headerRow,
    ...dataRows
  ];

  const ws = XLSX.utils.aoa_to_sheet(allRows);

  // Set column widths
  const colWidths = [
    { wch: 22 }, // Staff Name
    { wch: 18 }, // Role
    { wch: 18 }, // Department
    { wch: 25 }, // Email
    { wch: 15 }, // Phone
    ...Array.from({ length: daysInMonth }, () => ({ wch: 5 })), // Day columns
    { wch: 12 }, // Present
    { wch: 12 }, // Absent
    { wch: 12 }, // Half Day
    { wch: 8 },  // WFH
    { wch: 8 },  // N/A
    { wch: 10 }  // Unmarked
  ];
  ws['!cols'] = colWidths;

  // Merge title row cells (A1 to E1)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Attendance_${monthName}_${year}`);
  XLSX.writeFile(wb, `Monthly_Attendance_Report_${year}_${String(month).padStart(2, '0')}.xlsx`);
}

