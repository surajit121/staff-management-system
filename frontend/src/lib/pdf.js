import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatDate } from './utils';

export const generateChallanPDF = (transfer) => {
  const doc = new jsPDF();
  const primaryColor = [79, 70, 229]; // Indigo-600

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('STOCK TRANSFER CHALLAN', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 28, { align: 'center' });

  // Transfer Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Transfer Details', 20, 50);
  
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 52, 190, 52);

  const infoRows = [
    ['Project Ref:', transfer.project, 'Date:', formatDate(transfer.date)],
    ['Source Site:', transfer.from, 'Destination:', transfer.to],
    ['Status:', transfer.status, 'Transfer ID:', transfer._id.substring(transfer._id.length - 8).toUpperCase()],
  ];

  doc.autoTable({
    startY: 55,
    body: infoRows,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', width: 30 }, 2: { fontStyle: 'bold', width: 30 } }
  });

  // Items Table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Items List', 20, doc.lastAutoTable.finalY + 15);
  
  const itemHeaders = [['#', 'Item Description', 'Quantity', 'Unit']];
  const itemRows = (transfer.items || []).map((item, index) => [
    index + 1,
    item.name,
    item.qty,
    'Units'
  ]);

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 20,
    head: itemHeaders,
    body: itemRows,
    headStyles: { fillStyle: 'F', fillColor: primaryColor, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    styles: { cellPadding: 5, fontSize: 11 },
  });

  // Signature Section
  const finalY = doc.lastAutoTable.finalY + 40;
  
  doc.line(20, finalY, 70, finalY);
  doc.text('Sender Signature', 20, finalY + 5);
  
  doc.line(140, finalY, 190, finalY);
  doc.text('Receiver Signature', 140, finalY + 5);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('This is a computer-generated document. No signature is required if sent digitally.', 105, 285, { align: 'center' });

  doc.save(`Challan_${transfer.project}_${transfer._id.substring(transfer._id.length - 4)}.pdf`);
};
