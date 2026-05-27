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
  RemisionPrintHeader,
  RemisionPrintItem,
} from './remision-print-format.model';

@Component({
  selector: 'app-remision-print-format',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './remision-print-format.component.html',
  styleUrls: ['./remision-print-format.component.scss'],
})
export class RemisionPrintFormatComponent implements OnChanges {
  @Input() header: RemisionPrintHeader | null = null;
  @Input() items: RemisionPrintItem[] = [];

  @ViewChild('printPage') printPageRef!: ElementRef<HTMLDivElement>;

  logoEmpresa = '';
  nitEmpresa = '';
  webEmpresa = '';
  colorWebEmpresa = '';
  fechaDia = '';
  fechaMes = '';
  fechaAnio = '';

  ngOnChanges(_changes: SimpleChanges): void {
    this.applyEmpresaBranding();
    this.applyFechaRemision();
  }

  get itemsPrint(): RemisionPrintItem[] {
    return (this.items || []).filter((row) => {
      const hasItem = row.item && String(row.item).trim().length > 0;
      const hasCantidad = !!row.cantidad && row.cantidad > 0;
      const hasUm = row.um && String(row.um).trim().length > 0;
      const hasDetalle = row.detalle && String(row.detalle).trim().length > 0;
      const hasObs =
        row.observaciones && String(row.observaciones).trim().length > 0;
      return hasItem || hasCantidad || hasUm || hasDetalle || hasObs;
    });
  }

  getRemisionNumberDisplay(): string {
    const raw = this.header?.remision_material;
    const empresa = this.header?.empresa_asociada;

    let prefix = 'SM';
    if (empresa == 2 || empresa === '2') {
      prefix = 'HS';
    }

    if (raw === null || raw === undefined) {
      return prefix;
    }

    const str = String(raw).trim();
    if (!str) {
      return prefix;
    }

    return str.startsWith(prefix) ? str : `${prefix}${str}`;
  }

  getOrdenCompraDisplay(): string {
    const h = this.header;
    if (!h) return '';

    const ordenCompra = String(h.orden_de_compra ?? '').trim();
    if (ordenCompra) {
      return ordenCompra;
    }

    const tipoDoc = String(h.tipo_doc_rem ?? '').trim();
    const numeroContrato = String(h.numero_contrato ?? '').trim();
    if (tipoDoc && numeroContrato) {
      return `${tipoDoc} ${numeroContrato}`;
    }
    return tipoDoc || numeroContrato;
  }

  async generatePdf(filename: string): Promise<void> {
    const element = this.printPageRef?.nativeElement;
    if (!element) {
      throw new Error('No se encontró el contenido para generar el PDF.');
    }

    const options = {
      margin: 5,
      filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: {
        unit: 'mm' as const,
        format: 'letter' as const,
        orientation: 'portrait' as const,
      },
    };

    await html2pdf().set(options).from(element).save();
  }

  private applyEmpresaBranding(): void {
    const empresa = this.header?.empresa_asociada;

    if (empresa == 1 || empresa === '1') {
      this.logoEmpresa = 'assets/images/logo_principal.png';
      this.nitEmpresa = '900.111.135 - 7';
      this.webEmpresa = 'WWW.SOSAMET.COM';
      this.colorWebEmpresa = '#1f4fa3';
      return;
    }

    if (empresa == 2 || empresa === '2') {
      this.logoEmpresa = 'assets/images/LOGO_HS.png';
      this.nitEmpresa = '901.236.735-7';
      this.webEmpresa = 'WWW.HIERROSYSERVICIOS.COM';
      this.colorWebEmpresa = '#8a6d3b';
      return;
    }

    this.logoEmpresa = '';
    this.nitEmpresa = '';
    this.webEmpresa = '';
    this.colorWebEmpresa = '';
  }

  private applyFechaRemision(): void {
    const fecha = this.header?.fecha_remision;
    if (!fecha) {
      this.fechaDia = '';
      this.fechaMes = '';
      this.fechaAnio = '';
      return;
    }

    const date = new Date(fecha);
    if (isNaN(date.getTime())) {
      this.fechaDia = '';
      this.fechaMes = '';
      this.fechaAnio = '';
      return;
    }

    this.fechaDia = date.getDate().toString().padStart(2, '0');
    this.fechaMes = (date.getMonth() + 1).toString().padStart(2, '0');
    this.fechaAnio = date.getFullYear().toString();
  }
}
