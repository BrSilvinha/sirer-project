// frontend/src/hooks/useReportes.js
import { useState, useCallback } from 'react';
import reportesDownloadService from '../services/reportesDownload';
import toast from 'react-hot-toast';

export const useReportes = () => {
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [currentExport, setCurrentExport] = useState(null);

    // 📊 Generar reporte con seguimiento de progreso
    const generateReport = useCallback(async (tipo, datos, filtros, formato = 'pdf') => {
        setIsExporting(true);
        setExportProgress(0);
        setCurrentExport({ tipo, formato });

        return new Promise((resolve, reject) => {
            try {
                // Simular progreso realista
                const progressSteps = [
                    { progress: 20, message: 'Validando datos...' },
                    { progress: 40, message: 'Procesando información...' },
                    { progress: 60, message: 'Generando estructura...' },
                    { progress: 80, message: `Creando archivo ${formato.toUpperCase()}...` },
                    { progress: 95, message: 'Finalizando...' }
                ];

                let stepIndex = 0;
                const progressInterval = setInterval(() => {
                    if (stepIndex < progressSteps.length) {
                        setExportProgress(progressSteps[stepIndex].progress);
                        stepIndex++;
                    } else {
                        clearInterval(progressInterval);
                        
                        // Generar archivo real
                        try {
                            let filename;
                            
                            switch (formato.toLowerCase()) {
                                case 'pdf':
                                    filename = reportesDownloadService.generatePDF(tipo, datos, filtros);
                                    break;
                                case 'excel':
                                case 'xlsx':
                                    filename = reportesDownloadService.generateExcel(tipo, datos, filtros);
                                    break;
                                case 'csv':
                                    filename = reportesDownloadService.generateCSV(tipo, datos);
                                    break;
                                default:
                                    throw new Error(`Formato ${formato} no soportado`);
                            }

                            setExportProgress(100);
                            
                            setTimeout(() => {
                                setIsExporting(false);
                                setExportProgress(0);
                                setCurrentExport(null);
                                
                                toast.success(`📁 ${filename} descargado exitosamente`, {
                                    duration: 5000,
                                    icon: '✅'
                                });
                                
                                resolve({ success: true, filename });
                            }, 500);

                        } catch (error) {
                            console.error('Error generando reporte:', error);
                            setIsExporting(false);
                            setExportProgress(0);
                            setCurrentExport(null);
                            
                            toast.error(`❌ Error: ${error.message}`);
                            reject(error);
                        }
                    }
                }, 300);

            } catch (error) {
                setIsExporting(false);
                setExportProgress(0);
                setCurrentExport(null);
                reject(error);
            }
        });
    }, []);

    // 🚀 Descarga rápida (sin modal)
    const quickDownload = useCallback(async (tipo, datos, filtros, formato) => {
        const loadingToast = toast.loading(`Generando ${formato.toUpperCase()}...`);
        
        try {
            let filename;
            
            switch (formato.toLowerCase()) {
                case 'pdf':
                    filename = reportesDownloadService.generatePDF(tipo, datos, filtros);
                    break;
                case 'excel':
                case 'xlsx':
                    filename = reportesDownloadService.generateExcel(tipo, datos, filtros);
                    break;
                case 'csv':
                    filename = reportesDownloadService.generateCSV(tipo, datos);
                    break;
                default:
                    throw new Error(`Formato ${formato} no soportado`);
            }

            toast.dismiss(loadingToast);
            toast.success(`📁 ${filename} descargado`, {
                duration: 4000,
                icon: '✅'
            });
            
            return { success: true, filename };

        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error(`❌ Error: ${error.message}`);
            throw error;
        }
    }, []);

    // 📊 Descargar múltiples formatos
    const downloadMultiple = useCallback(async (tipo, datos, filtros, formatos = ['pdf', 'excel']) => {
        const promises = formatos.map((formato, index) => 
            new Promise(resolve => {
                setTimeout(() => {
                    quickDownload(tipo, datos, filtros, formato)
                        .then(resolve)
                        .catch(resolve);
                }, index * 1000); // Delay de 1 segundo entre descargas
            })
        );

        try {
            const results = await Promise.all(promises);
            const successful = results.filter(r => r.success).length;
            
            toast.success(`✅ ${successful}/${formatos.length} archivos descargados`, {
                duration: 6000
            });
            
            return results;
        } catch (error) {
            toast.error('❌ Error en descarga múltiple');
            throw error;
        }
    }, [quickDownload]);

    // 📈 Validar datos antes de exportar
    const validateReportData = useCallback((datos, tipo) => {
        if (!datos) {
            throw new Error('No hay datos para exportar');
        }

        switch (tipo) {
            case 'ventas':
                if (!datos.resumen || !datos.datos_diarios) {
                    throw new Error('Datos de ventas incompletos');
                }
                break;
            case 'productos':
                if (!datos.productos_individuales || !datos.por_categorias) {
                    throw new Error('Datos de productos incompletos');
                }
                break;
            case 'mozos':
                if (!datos.mozos_performance) {
                    throw new Error('Datos de mozos incompletos');
                }
                break;
            case 'mesas':
                if (!datos.mesas_performance) {
                    throw new Error('Datos de mesas incompletos');
                }
                break;
            default:
                break;
        }

        return true;
    }, []);

    // 🎯 Obtener información del progreso actual
    const getProgressInfo = useCallback(() => {
        if (!isExporting) return null;

        const messages = {
            0: 'Iniciando exportación...',
            20: 'Validando datos...',
            40: 'Procesando información...',
            60: 'Generando estructura...',
            80: `Creando archivo ${currentExport?.formato?.toUpperCase() || ''}...`,
            95: 'Finalizando...',
            100: '¡Completado!'
        };

        const currentMessage = Object.keys(messages)
            .reverse()
            .find(progress => exportProgress >= parseInt(progress));

        return {
            progress: exportProgress,
            message: messages[currentMessage] || 'Procesando...',
            tipo: currentExport?.tipo,
            formato: currentExport?.formato
        };
    }, [isExporting, exportProgress, currentExport]);

    // 🔄 Cancelar exportación
    const cancelExport = useCallback(() => {
        setIsExporting(false);
        setExportProgress(0);
        setCurrentExport(null);
        toast.error('Exportación cancelada');
    }, []);

    // 📋 Obtener formatos disponibles
    const getAvailableFormats = useCallback(() => {
        return [
            {
                key: 'pdf',
                name: 'PDF',
                description: 'Reporte completo con gráficos',
                icon: 'fas fa-file-pdf',
                color: 'danger',
                recommended: true
            },
            {
                key: 'excel',
                name: 'Excel',
                description: 'Datos en hojas de cálculo',
                icon: 'fas fa-file-excel',
                color: 'success',
                recommended: true
            },
            {
                key: 'csv',
                name: 'CSV',
                description: 'Datos básicos separados por comas',
                icon: 'fas fa-file-csv',
                color: 'info',
                recommended: false
            }
        ];
    }, []);

    // 📊 Estimar tamaño del archivo
    const estimateFileSize = useCallback((tipo, datos, formato) => {
        if (!datos) return '0 KB';

        let estimatedSize = 0;

        switch (tipo) {
            case 'ventas':
                estimatedSize = datos.datos_diarios?.length * 0.1 || 1; // ~0.1 KB por día
                break;
            case 'productos':
                estimatedSize = datos.productos_individuales?.length * 0.2 || 1; // ~0.2 KB por producto
                break;
            case 'mozos':
                estimatedSize = datos.mozos_performance?.length * 0.3 || 1; // ~0.3 KB por mozo
                break;
            case 'mesas':
                estimatedSize = datos.mesas_performance?.length * 0.2 || 1; // ~0.2 KB por mesa
                break;
            case 'completo':
                estimatedSize = 10; // ~10 KB para reporte completo
                break;
            default:
                estimatedSize = 1;
        }

        // Multiplicadores por formato
        const formatMultipliers = {
            pdf: 3,    // PDFs son más pesados
            excel: 2,  // Excel con formato
            csv: 1     // CSV es el más ligero
        };

        const finalSize = estimatedSize * (formatMultipliers[formato] || 1);

        if (finalSize < 1) return `${Math.round(finalSize * 1000)} B`;
        if (finalSize < 1000) return `${Math.round(finalSize)} KB`;
        return `${Math.round(finalSize / 1000 * 10) / 10} MB`;
    }, []);

    return {
        // Estados
        isExporting,
        exportProgress,
        currentExport,

        // Funciones principales
        generateReport,
        quickDownload,
        downloadMultiple,

        // Utilidades
        validateReportData,
        getProgressInfo,
        cancelExport,
        getAvailableFormats,
        estimateFileSize
    };
};

export default useReportes;