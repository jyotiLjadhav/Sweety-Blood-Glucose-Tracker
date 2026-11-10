const PdfPrinter = require('pdfmake');

const fonts = {
  Roboto: {
    normal: require.resolve('pdfmake/fonts/Roboto/Roboto-Regular.ttf'),
    bold: require.resolve('pdfmake/fonts/Roboto/Roboto-Medium.ttf'),
    italics: require.resolve('pdfmake/fonts/Roboto/Roboto-Italic.ttf'),
    bolditalics: require.resolve('pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf'),
  },
};

const SLOT_LABELS = {
  morning: 'Morning',
  after_breakfast: 'After breakfast',
  after_lunch: 'After lunch',
  else: 'Else',
};

function label(slot) {
  return SLOT_LABELS[slot] || SLOT_LABELS.else;
}

function statusKey(value) {
  if (value < 70) return 'low';
  if (value > 180) return 'high';
  return 'normal';
}
const STATUS_LABEL = { low: 'Low', normal: 'In range', high: 'High' };
const STATUS_COLOR = { low: '#c0392b', normal: '#27ae60', high: '#e67e22' };

function buildTableBody(report) {
  const rows = [['Date', 'Time slot', 'Value', 'Status']];
  report.readings.forEach((r) => {
    rows.push([
      r.reading_date,
      label(r.slot),
      `${r.value} mg/dL`,
      STATUS_LABEL[statusKey(r.value)],
    ]);
  });
  return {
    body: rows,
    widths: ['auto', '*', 'auto', 'auto'],
  };
}

function buildChartSummary(report) {
  const counts = { low: 0, normal: 0, high: 0 };
  report.readings.forEach((r) => { counts[statusKey(r.value)] += 1; });
  const total = report.readings.length || 1;
  return ['low', 'normal', 'high'].map((k) => ({
    label: STATUS_LABEL[k],
    count: counts[k],
    pct: Math.round((counts[k] / total) * 100),
    color: STATUS_COLOR[k],
  }));
}

function buildReportPdf(reportType, report) {
  const printer = new PdfPrinter(fonts);
  const summary = buildChartSummary(report);

  const docDefinition = {
    content: [
      { text: 'Sweety', style: 'title' },
      { text: `${reportType} blood glucose report`, style: 'subtitle' },
      { text: `Period: ${report.from} → ${report.to}`, style: 'meta' },
      { text: `Generated ${new Date().toISOString().slice(0, 10)}`, style: 'meta', margin: [0, 0, 0, 12] },

      report.empty
        ? { text: 'No readings were logged for this period.', style: 'empty' }
        : [
          {
            columns: [
              { stack: statColumn('Highest', report.stats.highest, 'mg/dL', '#e67e22') },
              { stack: statColumn('Lowest', report.stats.lowest, 'mg/dL', '#8e44ad') },
              { stack: statColumn('Average', report.stats.average, 'mg/dL', '#2980b9') },
              { stack: statColumn('Readings', report.stats.count, '', '#27ae60') },
            ],
            margin: [0, 0, 0, 16],
          },
          { text: 'Time in range', style: 'section' },
          {
            stack: summary.map((s) => ({
              margin: [0, 0, 0, 4],
              text: `${s.label}: ${s.count} reading(s) — ${s.pct}%`,
              color: s.color,
            })),
            margin: [0, 0, 0, 16],
          },
          { text: 'Readings', style: 'section' },
          {
            table: buildTableBody(report),
            margin: [0, 0, 0, 16],
          },
        ],
    ],
    styles: {
      title: { fontSize: 24, bold: true, color: '#ff2d55' },
      subtitle: { fontSize: 14, color: '#555', margin: [0, 0, 0, 4] },
      meta: { fontSize: 11, color: '#888' },
      section: { fontSize: 14, bold: true, margin: [0, 0, 0, 6] },
      empty: { fontSize: 13, color: '#888', italics: true },
    },
    defaultStyle: { font: 'Roboto' },
  };

  return printer.createPdfKitDocument(docDefinition);
}

function statColumn(label, value, unit, color) {
  return [
    { text: label, fontSize: 11, color: '#888' },
    { text: `${value ?? '—'}${unit ? ' ' + unit : ''}`, fontSize: 20, bold: true, color },
  ];
}

module.exports = { buildReportPdf };