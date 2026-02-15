import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoUrl from '@/assets/images/logo.png';

// --- Store Config ---
const STORE_NAME = 'NEXURE';

// --- Logo loader (cached) ---
const LOGO_ASPECT = 1851 / 364;
let _logoDataUrl: string | null = null;

async function getLogoDataUrl(): Promise<string> {
  if (_logoDataUrl) return _logoDataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      _logoDataUrl = canvas.toDataURL('image/png');
      resolve(_logoDataUrl);
    };
    img.onerror = () => resolve('');
    img.src = logoUrl;
  });
}

// --- Colors (RGB tuples) ---
const C = {
  primary: [26, 26, 26] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  lightGray: [249, 250, 251] as [number, number, number],
  border: [229, 231, 235] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  totalsBg: [243, 244, 246] as [number, number, number],
  bodyText: [55, 65, 81] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
};

function fmt(value: number): string {
  return `Rs. ${value.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function nowFormatted(): string {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// --- Shared PDF building blocks ---

function createDoc(): jsPDF {
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
}

function addHeader(doc: jsPDF, title: string, subtitle: string, logoDataUrl: string): number {
  const pw = doc.internal.pageSize.getWidth();

  // Brand logo
  if (logoDataUrl) {
    const logoH = 7;
    const logoW = logoH * LOGO_ASPECT;
    doc.addImage(logoDataUrl, 'PNG', 15, 10, logoW, logoH);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...C.primary);
    doc.text(STORE_NAME, 15, 18);
  }

  // Divider
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.line(15, 23, pw - 15, 23);

  // Report title
  doc.setFontSize(15);
  doc.text(title, 15, 33);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.gray);
  doc.text(subtitle, 15, 39);

  // Generated timestamp
  doc.text(`Generated: ${nowFormatted()}`, pw - 15, 39, { align: 'right' });

  return 46;
}

function addSummaryBoxes(
  doc: jsPDF,
  y: number,
  items: { label: string; value: string }[],
): number {
  const pw = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pw - margin * 2;
  const n = items.length;
  const gap = 3;
  const boxW = (contentW - gap * (n - 1)) / n;
  const boxH = 20;

  items.forEach((item, i) => {
    const x = margin + i * (boxW + gap);

    doc.setFillColor(...C.lightGray);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, boxW, boxH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.gray);
    doc.text(item.label, x + 4, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...C.primary);
    doc.text(item.value, x + 4, y + 16);
  });

  return y + boxH + 8;
}

function addFooters(doc: jsPDF): void {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    const pw = doc.internal.pageSize.getWidth();

    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(15, ph - 14, pw - 15, ph - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.gray);
    doc.text(STORE_NAME, 15, ph - 9);
    doc.text(`Page ${i} of ${pages}`, pw - 15, ph - 9, { align: 'right' });
  }
}

// autoTable common styles
const TABLE_STYLES = {
  headStyles: {
    fillColor: C.primary,
    textColor: C.white,
    fontStyle: 'bold' as const,
    fontSize: 9,
    cellPadding: 4,
  },
  bodyStyles: {
    fontSize: 8.5,
    cellPadding: 3.5,
    textColor: C.bodyText,
  },
  alternateRowStyles: {
    fillColor: C.lightGray,
  },
  styles: {
    lineColor: C.border,
    lineWidth: 0.2,
    overflow: 'linebreak' as const,
  },
  theme: 'grid' as const,
  margin: { left: 15, right: 15 },
};

// --- Report Generators ---

export async function generateSalesReport(
  salesOverTime: { date: string; sales: number; orders: number }[],
  metrics: {
    total_sales: number;
    total_orders: number;
    avg_order_value: number;
  },
  netSales: number,
  periodLabel: string,
): Promise<void> {
  const doc = createDoc();
  const logo = await getLogoDataUrl();
  let y = addHeader(doc, 'Sales Report', periodLabel, logo);

  y = addSummaryBoxes(doc, y, [
    { label: 'Total Sales', value: fmt(metrics.total_sales) },
    { label: 'Orders', value: String(metrics.total_orders) },
    { label: 'Avg. Order Value', value: fmt(metrics.avg_order_value) },
    { label: 'Net Sales', value: fmt(netSales) },
  ]);

  // Data rows
  const body = salesOverTime.map((row) => [
    row.date,
    fmt(row.sales),
    String(row.orders),
    row.orders > 0 ? fmt(Math.round(row.sales / row.orders)) : 'Rs. 0',
  ]);

  // Totals
  const totSales = salesOverTime.reduce((s, r) => s + r.sales, 0);
  const totOrders = salesOverTime.reduce((s, r) => s + r.orders, 0);

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Sales', 'Orders', 'Avg. Order']],
    body,
    foot: [[
      'TOTAL',
      fmt(totSales),
      String(totOrders),
      totOrders > 0 ? fmt(Math.round(totSales / totOrders)) : 'Rs. 0',
    ]],
    ...TABLE_STYLES,
    footStyles: {
      fillColor: C.totalsBg,
      textColor: C.primary,
      fontStyle: 'bold' as const,
      fontSize: 9,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
  });

  addFooters(doc);
  doc.save(`Sales_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function generateProductReport(
  products: { name: string; units_sold: number; revenue: number }[],
  periodLabel: string,
): Promise<void> {
  const doc = createDoc();
  const logo = await getLogoDataUrl();
  let y = addHeader(doc, 'Product Performance Report', periodLabel, logo);

  const totalUnits = products.reduce((s, p) => s + p.units_sold, 0);
  const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);

  y = addSummaryBoxes(doc, y, [
    { label: 'Products', value: String(products.length) },
    { label: 'Total Units Sold', value: totalUnits.toLocaleString() },
    { label: 'Total Revenue', value: fmt(totalRevenue) },
  ]);

  const body = products.map((p, i) => [
    String(i + 1),
    p.name,
    String(p.units_sold),
    fmt(p.revenue),
    totalRevenue > 0 ? `${((p.revenue / totalRevenue) * 100).toFixed(1)}%` : '0%',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Product', 'Units Sold', 'Revenue', '% of Total']],
    body,
    foot: [['', 'TOTAL', String(totalUnits), fmt(totalRevenue), '100%']],
    ...TABLE_STYLES,
    footStyles: {
      fillColor: C.totalsBg,
      textColor: C.primary,
      fontStyle: 'bold' as const,
      fontSize: 9,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 70 },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
  });

  addFooters(doc);
  doc.save(`Product_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function generateFinancialReport(
  breakdown: {
    gross_sales: number;
    discounts: number;
    returns: number;
    net_sales: number;
    shipping: number;
    tax: number;
    total_sales: number;
  },
  revenue: { total_revenue: number; month_revenue: number; today_revenue: number },
  periodLabel: string,
): Promise<void> {
  const doc = createDoc();
  const logo = await getLogoDataUrl();
  let y = addHeader(doc, 'Financial Summary', periodLabel, logo);

  y = addSummaryBoxes(doc, y, [
    { label: 'Gross Sales', value: fmt(breakdown.gross_sales) },
    { label: 'Net Sales', value: fmt(breakdown.net_sales) },
    { label: 'Total Sales', value: fmt(breakdown.total_sales) },
  ]);

  // Financial breakdown table
  const body: string[][] = [
    ['Gross Sales', fmt(breakdown.gross_sales)],
    ['Less: Discounts', breakdown.discounts > 0 ? `-${fmt(breakdown.discounts)}` : fmt(0)],
    ['Less: Returns', breakdown.returns > 0 ? `-${fmt(breakdown.returns)}` : fmt(0)],
    ['Net Sales', fmt(breakdown.net_sales)],
    ['Shipping Charges', fmt(breakdown.shipping)],
    ['Tax Collected', fmt(breakdown.tax)],
    ['Total Sales', fmt(breakdown.total_sales)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Category', 'Amount']],
    body,
    ...TABLE_STYLES,
    columnStyles: {
      0: { cellWidth: 100 },
      1: { halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        // Bold Net Sales and Total Sales rows
        if (data.row.index === 3 || data.row.index === 6) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = C.totalsBg;
          data.cell.styles.textColor = C.primary;
        }
        // Red for deductions
        if ((data.row.index === 1 || data.row.index === 2) && data.column.index === 1) {
          data.cell.styles.textColor = C.red;
        }
      }
    },
  });

  // Revenue summary section
  const tableEndY = (doc as any).lastAutoTable?.finalY ?? y + 80;
  const revY = tableEndY + 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...C.primary);
  doc.text('Revenue Overview', 15, revY);

  autoTable(doc, {
    startY: revY + 4,
    head: [['Period', 'Revenue']],
    body: [
      ['All-Time', fmt(revenue.total_revenue)],
      ['This Month', fmt(revenue.month_revenue)],
      ['Today', fmt(revenue.today_revenue)],
    ],
    ...TABLE_STYLES,
    columnStyles: {
      0: { cellWidth: 100 },
      1: { halign: 'right', fontStyle: 'bold' },
    },
  });

  addFooters(doc);
  doc.save(`Financial_Summary_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function generateCustomerReport(
  customers: { total_customers: number; new_this_month: number; new_today: number },
  monthlyOrders: { label: string; orders: number; revenue: number }[],
): Promise<void> {
  const doc = createDoc();
  const logo = await getLogoDataUrl();
  let y = addHeader(doc, 'Customer & Growth Report', 'All time overview', logo);

  y = addSummaryBoxes(doc, y, [
    { label: 'Total Customers', value: customers.total_customers.toLocaleString() },
    { label: 'New This Month', value: customers.new_this_month.toLocaleString() },
    { label: 'New Today', value: customers.new_today.toLocaleString() },
  ]);

  if (monthlyOrders.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...C.primary);
    doc.text('Monthly Order Trend', 15, y);
    y += 4;

    const totalOrders = monthlyOrders.reduce((s, m) => s + m.orders, 0);
    const totalRevenue = monthlyOrders.reduce((s, m) => s + m.revenue, 0);

    autoTable(doc, {
      startY: y,
      head: [['Month', 'Orders', 'Revenue']],
      body: monthlyOrders.map((m) => [m.label, String(m.orders), fmt(m.revenue)]),
      foot: [['TOTAL', String(totalOrders), fmt(totalRevenue)]],
      ...TABLE_STYLES,
      footStyles: {
        fillColor: C.totalsBg,
        textColor: C.primary,
        fontStyle: 'bold' as const,
        fontSize: 9,
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { halign: 'right' },
        2: { halign: 'right' },
      },
    });
  }

  addFooters(doc);
  doc.save(`Customer_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}
