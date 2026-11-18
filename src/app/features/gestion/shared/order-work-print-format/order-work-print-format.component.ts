import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  OrderWorkPrintHeader,
  OrderWorkPrintItem,
} from './order-work-print-format.model';

@Component({
  selector: 'app-order-work-print-format',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-work-print-format.component.html',
  styleUrls: ['./order-work-print-format.component.scss'],
})
export class OrderWorkPrintFormatComponent implements OnChanges {
  @Input() header: OrderWorkPrintHeader | null = null;
  @Input() items: OrderWorkPrintItem[] = [];

  @ViewChild('printPage') printPageRef!: ElementRef<HTMLDivElement>;

  readonly logoEmpresa = 'assets/images/logo_principal.png';
  readonly nitEmpresa = '900.111.135 - 7';
  readonly webEmpresa = 'WWW.SOSAMET.COM';
  readonly colorWebEmpresa = '#1f4fa3';

  fechaDia = '';
  fechaMes = '';
  fechaAnio = '';
  fechaEntregaTexto = '';

  ngOnChanges(_changes: SimpleChanges): void {
    this.applyFechaEntrega();
  }

  /** Filas visibles; el resto se rellena con vacías para el talonario doble. */
  private static readonly MAX_ITEMS_DOS_COPIAS = 6;

  get itemsPrint(): OrderWorkPrintItem[] {
    return (this.items || []).filter((row) => {
      const hasItem = !!row.item && String(row.item).trim().length > 0;
      const hasDetalle = !!row.detalle && String(row.detalle).trim().length > 0;
      const hasCantidad = !!row.cantidad && Number(row.cantidad) > 0;
      const hasUm = !!row.um && String(row.um).trim().length > 0;
      const hasPlano = !!row.plano_no && String(row.plano_no).trim().length > 0;
      const hasObs =
        !!row.observaciones && String(row.observaciones).trim().length > 0;
      return hasItem || hasDetalle || hasCantidad || hasUm || hasPlano || hasObs;
    });
  }

  get filasVacias(): number[] {
    const n = Math.max(
      0,
      OrderWorkPrintFormatComponent.MAX_ITEMS_DOS_COPIAS - this.itemsPrint.length
    );
    return Array.from({ length: n }, (_, i) => i);
  }

  getContratoDisplay(): string {
    const tipo = String(this.header?.tipo_documento ?? '').trim();
    const contrato = String(this.header?.contrato ?? '').trim();
    if (!tipo) return contrato;
    if (!contrato) return tipo;
    // Evita "Contrato — CUMAR-003 CUMAR-003" si el tipo ya trae el N°
    const tipoNorm = tipo.toLowerCase();
    const contratoNorm = contrato.toLowerCase();
    if (tipoNorm === contratoNorm || tipoNorm.includes(contratoNorm)) {
      return tipo;
    }
    return `${tipo} — ${contrato}`;
  }

  /**
   * Captura el formato y lo escala al área útil de carta (sin html2pdf,
   * que con offscreen/márgenes cortaba el borde derecho).
   */
  async generatePdf(filename: string): Promise<void> {
    const element = this.printPageRef?.nativeElement;
    if (!element) {
      throw new Error('No se encontró el contenido para generar el PDF.');
    }

    const widthPx = Math.max(1, Math.round(element.offsetWidth || element.scrollWidth));
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: widthPx,
      scrollX: 0,
      scrollY: -window.scrollY,
      foreignObjectRendering: false,
      imageTimeout: 15000,
    });

    if (!canvas.width || !canvas.height) {
      throw new Error('html2canvas devolvió un canvas vacío.');
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    // Márgenes asimétricos: más aire a la derecha para que no corte
    const marginLeft = 5;
    const marginRight = 7;
    const marginTop = 5;
    const marginBottom = 5;
    const usableW = pageW - marginLeft - marginRight;
    const usableH = pageH - marginTop - marginBottom;

    // Encajar por ancho; si sobra alto, se deja margen inferior
    let renderW = usableW;
    let renderH = (canvas.height * renderW) / canvas.width;
    if (renderH > usableH) {
      renderH = usableH;
      renderW = (canvas.width * renderH) / canvas.height;
    }

    // Alineado a la izquierda del área útil
    const x = marginLeft;
    const y = marginTop;
    pdf.addImage(imgData, 'JPEG', x, y, renderW, renderH);
    pdf.save(filename);
  }

  private applyFechaEntrega(): void {
    const fecha = this.header?.fecha_entrega;
    if (!fecha) {
      this.fechaDia = '';
      this.fechaMes = '';
      this.fechaAnio = '';
      this.fechaEntregaTexto = '';
      return;
    }

    const date = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(date.getTime())) {
      this.fechaDia = '';
      this.fechaMes = '';
      this.fechaAnio = '';
      this.fechaEntregaTexto = '';
      return;
    }

    this.fechaDia = date.getDate().toString().padStart(2, '0');
    this.fechaMes = (date.getMonth() + 1).toString().padStart(2, '0');
    this.fechaAnio = date.getFullYear().toString();
    this.fechaEntregaTexto = `${this.fechaDia}/${this.fechaMes}/${this.fechaAnio}`;
  }
}
