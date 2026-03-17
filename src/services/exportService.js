import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import * as XLSX from 'xlsx';
import { fetchHistoricalRates, fetchUsdtHistory } from './rateService';

/**
 * Fetches and prepares historical data for export within a date range.
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {Promise<Array>} List of formatted rows for Excel
 */
export const fetchAndPrepareExportData = async (startDate, endDate) => {
    try {
        console.log('[ExportService] Starting data fetch...');

        // Fetch all available history to ensure we cover the range
        // We fetch 'all' (since 2020) and filter locally
        const [bcvData, usdtData] = await Promise.all([
            fetchHistoricalRates('all'),
            fetchUsdtHistory('all')
        ]);

        console.log(`[ExportService] Fetched ${bcvData.length} BCV records and ${usdtData.length} USDT records`);

        // Create a map for fast lookup
        // BCV Data format: { date: "YYYY-MM-DD", usd: 35.5, eur: 36.2 }
        // USDT Data format: { date: "YYYY-MM-DD", usdt: 38.0 }

        const bcvMap = new Map(bcvData.map(item => [item.date.split('T')[0], item]));
        const usdtMap = new Map(usdtData.map(item => [item.date, item]));

        // Generate array of dates in range
        const dataRows = [];
        let currentDate = new Date(startDate);
        const end = new Date(endDate);

        // Normalize time components to comparisons work correctly
        currentDate.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        // Loop day by day
        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];

            // Get data for this day
            const bcv = bcvMap.get(dateStr);
            const usdt = usdtMap.get(dateStr);

            // Check for weekend (0 = Sunday, 6 = Saturday)
            // User requested that BCV rates appear as "N/A" on weekends
            const dayOfWeek = currentDate.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            const bcvUsd = (bcv && !isWeekend) ? parseFloat(bcv.usd) : null;
            const bcvEur = (bcv && !isWeekend) ? parseFloat(bcv.eur) : null;
            const usdtPrice = usdt ? parseFloat(usdt.usdt) : null;

            // Calculate Gap (Brecha) if both BCV USD and USDT exist
            let gap = null;
            if (bcvUsd && usdtPrice) {
                gap = ((usdtPrice - bcvUsd) / bcvUsd);
            }

            // Only add if there is at least some data
            if (bcv || usdt) {
                dataRows.push({
                    date: dateStr,
                    bcvUsd: bcvUsd,
                    bcvEur: bcvEur,
                    usdt: usdtPrice,
                    gap: gap
                });
            }

            // Next day
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Sort descending (newest first)
        return dataRows.sort((a, b) => new Date(b.date) - new Date(a.date));

    } catch (error) {
        console.error('[ExportService] Error preparing data:', error);
        throw error;
    }
};

/**
 * Generates an Excel file and prompts download/sharing.
 * @param {Array} data - Processed data from fetchAndPrepareExportData
 */
export const exportToExcel = async (data) => {
    try {
        // Format data for Excel headers
        const wsData = [
            ['Fecha', 'Tasa BCV (USD)', 'Tasa BCV (EUR)', 'Promedio USDT', 'Brecha (%)'], // Headers
            ...data.map(row => [
                row.date,
                row.bcvUsd || 'N/A',
                row.bcvEur || 'N/A',
                row.usdt || 'N/A',
                row.gap !== null ? (row.gap * 100).toFixed(2) + '%' : 'N/A'
            ])
        ];

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Set column widths
        ws['!cols'] = [
            { wch: 12 }, // Date
            { wch: 15 }, // BCV USD
            { wch: 15 }, // BCV EUR
            { wch: 15 }, // USDT
            { wch: 12 }  // Gap
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Histórico Tasas");

        // Generate base64
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const fileName = `Histórico_Tasas_${new Date().toISOString().split('T')[0]}.xlsx`;

        if (Platform.OS === 'web') {
            // Web implementation: Create Blob and download link
            // XLSX.write with type 'binary' or 'array' is better for Blob manually, 
            // but we can convert base64 to byte array easily.

            // Using a simpler approach for web with data URI for broad compatibility
            const uri = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${wbout}`;

            const link = document.createElement("a");
            link.href = uri;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // Mobile implementation: FileSystem + Sharing
            const fileUri = FileSystem.documentDirectory + fileName;
            await FileSystem.writeAsStringAsync(fileUri, wbout, {
                encoding: FileSystem.EncodingType.Base64
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    dialogTitle: 'Descargar Histórico de Tasas',
                    UTI: 'com.microsoft.excel.xlsx' // iOS specific
                });
            } else {
                alert('No se puede compartir el archivo en este dispositivo');
            }
        }

        return true;
    } catch (error) {
        console.error('[ExportService] Error generating Excel:', error);
        throw error;
    }
};
