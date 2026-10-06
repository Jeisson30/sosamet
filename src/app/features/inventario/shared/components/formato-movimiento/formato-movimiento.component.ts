import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EmpresaImpresion } from '../../entrega-material.model';

export interface FormatoElemento {
  codigo: string;
  descripcion: string | null;
  cantidad: number | string | null;
  um: string;
  ancho: number | string | null;
  alto: number | string | null;
  estado: string | null;
  observaciones: string | null;
}

/** Hasta este número de elementos el formato sale en dos copias por hoja (como Remisiones). */
const MAX_ITEMS_DOS_COPIAS = 8;

/**
 * Formato imprimible de Entrega / Devolución de material (hoja carta, logo según empresa).
 * El PDF se genera desde el padre con html2pdf sobre el elemento con id = elementoId.
 */
@Component({
  selector: 'app-formato-movimiento',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './formato-movimiento.component.html',
  styleUrls: ['./formato-movimiento.component.scss'],
})
export class FormatoMovimientoComponent {
  @Input({ required: true }) elementoId!: string;
  @Input() titulo = 'ENTREGA MATERIAL';
  @Input() empresa: EmpresaImpresion | null = null;
  @Input() consecutivo = '';
  @Input() fecha: Date | null = null;
  @Input() personaLabel = 'ENTREGADO A:';
  @Input() persona = '';
  @Input() concepto = '';
  @Input() area = '';
  @Input() proyecto = '';
  @Input() tipoDoc = '';
  @Input() numeroDoc: string | null = '';
  @Input() elementos: FormatoElemento[] = [];
  @Input() observaciones = '';
  @Input() autoriza: string | null = '';
  @Input() transporte: string | null = '';

  get copias(): number[] {
    return this.elementos.length <= MAX_ITEMS_DOS_COPIAS ? [1, 2] : [1];
  }

  /** Renglones en blanco para que la tabla llegue al pie (líneas verticales y punteadas, como el talonario). */
  get filasVacias(): number[] {
    return Array.from({ length: Math.max(0, MAX_ITEMS_DOS_COPIAS - this.elementos.length) }, (_, i) => i);
  }

  num(v: number | string | null | undefined): number | null {
    return v === null || v === undefined || v === '' ? null : Number(v);
  }
}
