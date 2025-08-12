// frontend/src/services/reportesDownload.js
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

class ReportesDownloadService {
    
    // 📊 Generar reporte PDF
    generatePDF(tipoReporte, datos, filtros) {
        const doc = new jsPDF();
        const fecha = new Date().toLocaleDateString('es-ES');
        
        // Header del documento
        this.addPDFHeader(doc, tipoReporte, fecha, filtros);
        
        switch (tipoReporte) {
            case 'ventas':
                this.generateVentasPDF(doc, datos);
                break;
            case 'productos':
                this.generateProductosPDF(doc, datos);
                break;
            case 'mozos':
                this.generateMozosPDF(doc, datos);
                break;
            case 'mesas':
                this.generateMesasPDF(doc, datos);
                break;
            case 'completo':
                this.generateCompletoPDF(doc, datos);
                break;
            default:
                this.generateVentasPDF(doc, datos);
        }
        
        // Descargar archivo
        const filename = `SIRER_S/{tipoReporte}_S/{fecha.replace(/\//g, '-')}.pdf`;
        doc.save(filename);
        
        return filename;
    }
    
    // 📊 Generar reporte Excel
    generateExcel(tipoReporte, datos, filtros) {
        const workbook = XLSX.utils.book_new();
        const fecha = new Date().toLocaleDateString('es-ES');
        
        switch (tipoReporte) {
            case 'ventas':
                this.addVentasSheet(workbook, datos);
                break;
            case 'productos':
                this.addProductosSheet(workbook, datos);
                break;
            case 'mozos':
                this.addMozosSheet(workbook, datos);
                break;
            case 'mesas':
                this.addMesasSheet(workbook, datos);
                break;
            case 'completo':
                this.addVentasSheet(workbook, datos);
                this.addProductosSheet(workbook, datos);
                this.addMozosSheet(workbook, datos);
                this.addMesasSheet(workbook, datos);
                break;
            default:
                this.addVentasSheet(workbook, datos);
        }
        
        // Descargar archivo
        const filename = `SIRER_S/{tipoReporte}_S/{fecha.replace(/\//g, '-')}.xlsx`;
        XLSX.writeFile(workbook, filename);
        
        return filename;
    }
    
    // 🎨 Header para PDF
    addPDFHeader(doc, tipoReporte, fecha, filtros) {
        // Logo/Título
        doc.setFontSize(20);
        doc.setTextColor(40, 80, 120);
        doc.text('🍽️ SIRER - Sistema Integral para Restaurantes', 20, 20);
        
        // Línea separadora
        doc.setDrawColor(40, 80, 120);
        doc.setLineWidth(0.5);
        doc.line(20, 25, 190, 25);
        
        // Información del reporte
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(`Reporte de S/{this.getTipoReporteText(tipoReporte)}`, 20, 35);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generado el: S/{fecha}`, 20, 42);
        doc.text(`Período: S/{filtros.fechaInicio} al S/{filtros.fechaFin}`, 20, 47);
        
        return 55; // Posición Y donde continuar
    }
    
    // 📈 Reporte de Ventas PDF
    generateVentasPDF(doc, datos) {
        let yPosition = 60;
        
        // Resumen de ventas
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('📊 RESUMEN DE VENTAS', 20, yPosition);
        yPosition += 10;
        
        const resumenData = [
            ['Total Ventas', `S/S/{datos.resumen.total_ventas.toFixed(2)}`],
            ['Total Pedidos', datos.resumen.total_pedidos.toString()],
            ['Promedio por Pedido', `S/S/{datos.resumen.promedio_pedido.toFixed(2)}`],
            ['Crecimiento', `S/{datos.resumen.crecimiento >= 0 ? '+' : ''}S/{datos.resumen.crecimiento.toFixed(1)}%`]
        ];
        
        autoTable(doc, {
            head: [['Métrica', 'Valor']],
            body: resumenData,
            startY: yPosition,
            theme: 'grid',
            headStyles: { fillColor: [52, 152, 219] },
            styles: { fontSize: 10 }
        });
        
        yPosition = doc.lastAutoTable.finalY + 15;
        
        // Ventas diarias
        doc.text('📅 VENTAS DIARIAS', 20, yPosition);
        yPosition += 5;
        
        const ventasDiarias = datos.datos_diarios.map(dia => [
            new Date(dia.fecha).toLocaleDateString('es-ES'),
            `S/S/{dia.ventas.toFixed(2)}`,
            dia.pedidos.toString(),
            `S/S/{dia.promedio.toFixed(2)}`
        ]);
        
        autoTable(doc, {
            head: [['Fecha', 'Ventas', 'Pedidos', 'Promedio']],
            body: ventasDiarias,
            startY: yPosition,
            theme: 'striped',
            headStyles: { fillColor: [52, 152, 219] },
            styles: { fontSize: 9 }
        });
    }
    
    // 🍽️ Reporte de Productos PDF
    generateProductosPDF(doc, datos) {
        let yPosition = 60;
        
        // Productos más vendidos
        doc.setFontSize(12);
        doc.text('🔥 PRODUCTOS MÁS VENDIDOS', 20, yPosition);
        yPosition += 10;
        
        const productosData = datos.productos_individuales.slice(0, 10).map((producto, index) => [
            (index + 1).toString(),
            producto.nombre,
            producto.categoria,
            producto.cantidad_vendida.toString(),
            `S/S/{producto.ingresos_totales.toFixed(2)}`,
            `S/{producto.popularidad_score}%`
        ]);
        
        autoTable(doc, {
            head: [['#', 'Producto', 'Categoría', 'Vendidos', 'Ingresos', 'Popularidad']],
            body: productosData,
            startY: yPosition,
            theme: 'grid',
            headStyles: { fillColor: [46, 204, 113] },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 40 },
                2: { cellWidth: 30 },
                3: { cellWidth: 25 },
                4: { cellWidth: 30 },
                5: { cellWidth: 25 }
            }
        });
        
        yPosition = doc.lastAutoTable.finalY + 15;
        
        // Ventas por categoría
        doc.text('🏷️ VENTAS POR CATEGORÍA', 20, yPosition);
        yPosition += 5;
        
        const categoriasData = datos.por_categorias.map(categoria => [
            categoria.categoria,
            categoria.total_cantidad.toString(),
            `S/S/{categoria.total_ingresos.toFixed(2)}`
        ]);
        
        autoTable(doc, {
            head: [['Categoría', 'Cantidad Total', 'Ingresos Totales']],
            body: categoriasData,
            startY: yPosition,
            theme: 'striped',
            headStyles: { fillColor: [46, 204, 113] },
            styles: { fontSize: 10 }
        });
    }
    
    // 👨‍🍳 Reporte de Mozos PDF
    generateMozosPDF(doc, datos) {
        let yPosition = 60;
        
        doc.setFontSize(12);
        doc.text('👥 RENDIMIENTO DE MOZOS', 20, yPosition);
        yPosition += 10;
        
        const mozosData = datos.mozos_performance.map((mozo, index) => [
            (index + 1).toString(),
            mozo.nombre,
            mozo.turno,
            mozo.total_pedidos.toString(),
            `S/S/{mozo.total_ventas.toFixed(2)}`,
            `S/S/{mozo.promedio_pedido.toFixed(2)}`,
            `S/{mozo.satisfaccion_cliente.toFixed(1)}%`,
            `S/{mozo.eficiencia_servicio.toFixed(1)}%`
        ]);
        
        autoTable(doc, {
            head: [['#', 'Mozo', 'Turno', 'Pedidos', 'Ventas', 'Promedio', 'Satisfacción', 'Eficiencia']],
            body: mozosData,
            startY: yPosition,
            theme: 'grid',
            headStyles: { fillColor: [241, 196, 15] },
            styles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 12 },
                1: { cellWidth: 35 },
                2: { cellWidth: 25 },
                3: { cellWidth: 20 },
                4: { cellWidth: 25 },
                5: { cellWidth: 25 },
                6: { cellWidth: 25 },
                7: { cellWidth: 25 }
            }
        });
    }
    
    // 🏠 Reporte de Mesas PDF
    generateMesasPDF(doc, datos) {
        let yPosition = 60;
        
        doc.setFontSize(12);
        doc.text('🏠 RENDIMIENTO DE MESAS', 20, yPosition);
        yPosition += 10;
        
        const mesasData = datos.mesas_performance.map(mesa => [
            mesa.numero.toString(),
            `S/{mesa.capacidad} pers`,
            mesa.total_ocupaciones.toString(),
            `S/{mesa.horas_ocupada}h`,
            `S/S/{mesa.ingresos_generados.toFixed(2)}`,
            `S/{mesa.eficiencia_ocupacion.toFixed(1)}%`,
            `S/{mesa.rotacion_diaria}x`
        ]);
        
        autoTable(doc, {
            head: [['Mesa', 'Capacidad', 'Ocupaciones', 'Horas', 'Ingresos', 'Eficiencia', 'Rotación']],
            body: mesasData,
            startY: yPosition,
            theme: 'grid',
            headStyles: { fillColor: [155, 89, 182] },
            styles: { fontSize: 9 }
        });
    }
    
    // 📋 Reporte Completo PDF
    generateCompletoPDF(doc, datos) {
        // Página 1: Ventas
        this.generateVentasPDF(doc, datos);
        
        // Nueva página para productos
        doc.addPage();
        this.addPDFHeader(doc, 'productos', new Date().toLocaleDateString('es-ES'), {});
        this.generateProductosPDF(doc, datos);
        
        // Nueva página para mozos
        doc.addPage();
        this.addPDFHeader(doc, 'mozos', new Date().toLocaleDateString('es-ES'), {});
        this.generateMozosPDF(doc, datos);
        
        // Nueva página para mesas
        doc.addPage();
        this.addPDFHeader(doc, 'mesas', new Date().toLocaleDateString('es-ES'), {});
        this.generateMesasPDF(doc, datos);
    }
    
    // 📊 Sheets para Excel
    addVentasSheet(workbook, datos) {
        // Hoja de resumen
        const resumenWS = XLSX.utils.aoa_to_sheet([
            ['REPORTE DE VENTAS - SIRER'],
            ['Generado:', new Date().toLocaleString()],
            [],
            ['RESUMEN'],
            ['Total Ventas', datos.resumen.total_ventas],
            ['Total Pedidos', datos.resumen.total_pedidos],
            ['Promedio por Pedido', datos.resumen.promedio_pedido],
            ['Crecimiento %', datos.resumen.crecimiento],
            [],
            ['VENTAS DIARIAS'],
            ['Fecha', 'Ventas', 'Pedidos', 'Promedio'],
            ...datos.datos_diarios.map(dia => [
                dia.fecha,
                dia.ventas,
                dia.pedidos,
                dia.promedio
            ])
        ]);
        
        XLSX.utils.book_append_sheet(workbook, resumenWS, 'Ventas');
    }
    
    addProductosSheet(workbook, datos) {
        const productosWS = XLSX.utils.aoa_to_sheet([
            ['PRODUCTOS MÁS VENDIDOS'],
            ['Producto', 'Categoría', 'Cantidad', 'Ingresos', 'Popularidad %'],
            ...datos.productos_individuales.map(producto => [
                producto.nombre,
                producto.categoria,
                producto.cantidad_vendida,
                producto.ingresos_totales,
                producto.popularidad_score
            ])
        ]);
        
        XLSX.utils.book_append_sheet(workbook, productosWS, 'Productos');
    }
    
    addMozosSheet(workbook, datos) {
        const mozosWS = XLSX.utils.aoa_to_sheet([
            ['RENDIMIENTO DE MOZOS'],
            ['Mozo', 'Turno', 'Pedidos', 'Ventas', 'Promedio', 'Satisfacción %', 'Eficiencia %'],
            ...datos.mozos_performance.map(mozo => [
                mozo.nombre,
                mozo.turno,
                mozo.total_pedidos,
                mozo.total_ventas,
                mozo.promedio_pedido,
                mozo.satisfaccion_cliente,
                mozo.eficiencia_servicio
            ])
        ]);
        
        XLSX.utils.book_append_sheet(workbook, mozosWS, 'Mozos');
    }
    
    addMesasSheet(workbook, datos) {
        const mesasWS = XLSX.utils.aoa_to_sheet([
            ['RENDIMIENTO DE MESAS'],
            ['Mesa', 'Capacidad', 'Ocupaciones', 'Horas', 'Ingresos', 'Eficiencia %', 'Rotación'],
            ...datos.mesas_performance.map(mesa => [
                mesa.numero,
                mesa.capacidad,
                mesa.total_ocupaciones,
                mesa.horas_ocupada,
                mesa.ingresos_generados,
                mesa.eficiencia_ocupacion,
                mesa.rotacion_diaria
            ])
        ]);
        
        XLSX.utils.book_append_sheet(workbook, mesasWS, 'Mesas');
    }
    
    // 🏷️ Obtener texto del tipo de reporte
    getTipoReporteText(tipo) {
        const tipos = {
            ventas: 'Ventas',
            productos: 'Productos',
            mozos: 'Mozos',
            mesas: 'Mesas',
            completo: 'Completo'
        };
        return tipos[tipo] || 'General';
    }
    
    // 📱 Generar reporte para móvil (CSV simplificado)
    generateCSV(tipoReporte, datos) {
        let csvContent = '';
        const fecha = new Date().toLocaleDateString('es-ES');
        
        // Header
        csvContent += `SIRER - Reporte de S/{this.getTipoReporteText(tipoReporte)}\n`;
        csvContent += `Generado: S/{fecha}\n\n`;
        
        switch (tipoReporte) {
            case 'ventas':
                csvContent += 'Fecha,Ventas,Pedidos,Promedio\n';
                datos.datos_diarios.forEach(dia => {
                    csvContent += `S/{dia.fecha},S/{dia.ventas},S/{dia.pedidos},S/{dia.promedio}\n`;
                });
                break;
                
            case 'productos':
                csvContent += 'Producto,Categoría,Cantidad,Ingresos\n';
                datos.productos_individuales.forEach(producto => {
                    csvContent += `S/{producto.nombre},S/{producto.categoria},S/{producto.cantidad_vendida},S/{producto.ingresos_totales}\n`;
                });
                break;
                
            default:
                csvContent += 'Tipo de reporte no soportado\n';
                break;
        }
        
        // Crear blob y descargar
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `SIRER_S/{tipoReporte}_S/{fecha.replace(/\//g, '-')}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        return `SIRER_S/{tipoReporte}_S/{fecha.replace(/\//g, '-')}.csv`;
    }
}

const reportesDownloadService = new ReportesDownloadService();
export default reportesDownloadService;