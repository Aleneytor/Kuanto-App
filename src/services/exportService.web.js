import { fetchHistoricalRates, fetchUsdtHistory } from './rateService';

/**
 * Fetches and prepares historical data for export within a date range.
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {Promise<Array>} List of formatted rows for Excel
 */
export const fetchAndPrepareExportData = async (startDate, endDate) => {
    try {
        console.log('[ExportService Web] Starting data fetch...');

        const [bcvData, usdtData] = await Promise.all([
            fetchHistoricalRates('all'),
            fetchUsdtHistory('all')
        ]);

        console.log(`[ExportService Web] Fetched ${bcvData.length} BCV records and ${usdtData.length} USDT records`);

        const bcvMap = new Map(bcvData.map(item => [item.date.split('T')[0], item]));
        const usdtMap = new Map(usdtData.map(item => [item.date, item]));

        const dataRows = [];
        let currentDate = new Date(startDate);
        const end = new Date(endDate);

        currentDate.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];

            const bcv = bcvMap.get(dateStr);
            const usdt = usdtMap.get(dateStr);

            // Check for weekend (0 = Sunday, 6 = Saturday)
            // User requested that BCV rates appear as "N/A" on weekends
            const dayOfWeek = currentDate.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            const bcvUsd = (bcv && !isWeekend) ? parseFloat(bcv.usd) : null;
            const bcvEur = (bcv && !isWeekend) ? parseFloat(bcv.eur) : null;
            const usdtPrice = usdt ? parseFloat(usdt.usdt) : null;

            let gap = null;
            if (bcvUsd && usdtPrice) {
                gap = ((usdtPrice - bcvUsd) / bcvUsd);
            }

            if (bcv || usdt) {
                dataRows.push({
                    date: dateStr,
                    bcvUsd: bcvUsd,
                    bcvEur: bcvEur,
                    usdt: usdtPrice,
                    gap: gap
                });
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return dataRows.sort((a, b) => new Date(b.date) - new Date(a.date));

    } catch (error) {
        console.error('[ExportService Web] Error preparing data:', error);
        throw error;
    }
};

/**
 * Generates an Excel file and prompts download/sharing.
 * @param {Array} data - Processed data from fetchAndPrepareExportData
 */
export const exportToExcel = async (data) => {
    try {
        console.log('[ExportService Web] Loading XLSX library dynamically...');
        const XLSX = await import('xlsx');

        const wsData = [
            ['Fecha', 'Tasa BCV (USD)', 'Tasa BCV (EUR)', 'Promedio USDT', 'Brecha (%)'],
            ...data.map(row => [
                row.date,
                row.bcvUsd || 'N/A',
                row.bcvEur || 'N/A',
                row.usdt || 'N/A',
                row.gap !== null ? (row.gap * 100).toFixed(2) + '%' : 'N/A'
            ])
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        ws['!cols'] = [
            { wch: 12 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 12 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Histórico Tasas");

        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const fileName = `Histórico_Tasas_${new Date().toISOString().split('T')[0]}.xlsx`;

        // Web implementation: Create Blob and download link
        // We use the base64 string to create a URI
        const uri = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${wbout}`;

        const link = document.createElement("a");
        link.href = uri;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return true;
    } catch (error) {
        console.error('[ExportService Web] Error generating Excel:', error);
        throw error;
    }
};
