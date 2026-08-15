import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import html2pdf from 'html2pdf.js';
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

  getContratoDisplay(): string {
    const tipo = String(this.header?.tipo_documento ?? '').trim();
    const contrato = String(this.header?.contrato ?? '').trim();
    if (tipo && contrato) return `${tipo} ${contrato}`;
    return tipo || contrato;
  }

  async generatePdf(filename: string): Promise<void> {
    const element = this.printPageRef?.nativeElement;
    if (!element) {
      throw new Error('No se encontró el contenido para generar el PDF.');
    }

    const options = {
      margin: [8, 8, 8, 8] as [number, number, number, number],
      filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        logging: false,
      },
      jsPDF: {
        unit: 'mm' as const,
        format: 'letter' as const,
        orientation: 'portrait' as const,
      },
      pagebreak: { mode: ['css', 'legacy'] },
    };

    await html2pdf().set(options).from(element).save();
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
