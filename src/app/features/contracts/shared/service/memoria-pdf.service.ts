import { Injectable } from '@angular/core';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface MemoriaPdfControlRow {
  item: string;
  detalle: string;
  um: string;
  cantidad_contratada: number;
  valor_unitario: number;
  vr_total?: number;
  acumulado_anterior_cant: number;
  acumulado_anterior_valor: number;
  cant_acta: number;
  vr_parcial: number;
  acumulado_total_cant: number;
  acumulado_total_valor: number;
}

export interface MemoriaPdfRemisionRow {
  item: string;
  detalle: string;
  locacion: string;
  cantidad_a_facturar: number;
  um: string;
  observaciones: string;
}

export interface MemoriaPdfEvidencia {
  item: string;
  detalle: string;
  observaciones: string;
  /** URL o data-URL de foto (opcional; si no hay, se muestra placeholder). */
  fotoUrl?: string;
}

export interface MemoriaPdfPayload {
  consecutivo: string;
  fechaActa: Date | string | null;
  fechaCorte: Date | string | null;
  constructora: string;
  proyecto: string;
  numeroContrato: string;
  detalleObra: string;
  tipoContrato: string;
  contratista: string;
  empresaAsociadaId?: string | number | null;
  vrContrato: number;
  vrAcumulado: number;
  saldo: number;
  vrAnticipo: number;
  control: MemoriaPdfControlRow[];
  remisionesActa: MemoriaPdfRemisionRow[];
  evidencias: MemoriaPdfEvidencia[];
  porcentajes: {
    porc_adm: number;
    porc_imp: number;
    porc_ut: number;
    porc_iva: number;
    porc_amort_anticipo: number;
    porc_rete_garantia: number;
  };
  conceptosExtra?: { nombre: string; porc: number }[];
  observaciones: string;
  elaboradoPor: string;
  canViewValues: boolean;
}

const BLUE = '#1a3a6b';
const BLUE_SOFT = '#2a5a9a';
const GRAY = '#666666';
const BORDER = '#555555';
const HIGHLIGHT = '#e8e8e8';
const RADIUS = '8px';
/** Contenedor con radio; sin borde propio si envuelve tabla (evita líneas dobles). */
const BOX = `border-radius:${RADIUS};overflow:hidden;background:#fff;`;
/** Contenedor con borde único (textos/observaciones/encabezado sin grilla interna). */
const BOX_FRAMED = `border:1px solid ${BORDER};border-radius:${RADIUS};overflow:hidden;background:#fff;`;
/** Grilla: solo bordes de celdas (collapse) — el perímetro no se duplica con BOX. */
const TABLE_INNER = 'width:100%;border-collapse:collapse;border-spacing:0;margin:0;';
const CELL_H = 'min-height:36px;';

@Injectable({ providedIn: 'root' })
export class MemoriaPdfService {
  async generateAnexo(data: MemoriaPdfPayload): Promise<void> {
    const html = this.buildAnexoHtml(data);
    await this.exportPdf(html, `Anexo_Fotografico_${safeName(data.consecutivo)}.pdf`, 'landscape');
  }

  async generateMemoriaCalculo(data: MemoriaPdfPayload): Promise<void> {
    const html = this.buildMemoriaCalculoHtml(data);
    await this.exportPdf(html, `Memoria_Calculo_${safeName(data.consecutivo)}.pdf`, 'landscape');
  }

  async generateActaParcial(data: MemoriaPdfPayload): Promise<void> {
    const html = this.buildActaParcialHtml(data);
    await this.exportPdf(html, `Acta_Parcial_${safeName(data.consecutivo)}.pdf`, 'landscape');
  }

  private async exportPdf(
    html: string,
    filename: string,
    orientation: 'portrait' | 'landscape'
  ): Promise<void> {
    // Importante: el nodo debe estar en el viewport (no off-screen / opacity:0).
    // Se usa html2canvas + jsPDF directo; html2pdf 0.14 + DOMPurify dejaba PDF en blanco
    // al clonar HTML inyectado dinámicamente.
    const widthPx = orientation === 'landscape' ? 1100 : 816;
    const prevHost = document.getElementById('memoria-pdf-export-host');
    prevHost?.remove();

    const host = document.createElement('div');
    host.id = 'memoria-pdf-export-host';
    host.setAttribute(
      'style',
      [
        'position:fixed',
        'left:0',
        'top:0',
        `width:${widthPx}px`,
        'min-height:200px',
        'background:#ffffff',
        'color:#111111',
        'z-index:2147483646',
        'pointer-events:none',
        'box-sizing:border-box',
        'padding:12px',
        'overflow:visible',
      ].join(';')
    );
    host.innerHTML = html;
    document.body.appendChild(host);

    await delay(80);
    await nextFrame();
    await nextFrame();
    await waitForImages(host);

    const target = (host.firstElementChild as HTMLElement) || host;
    if (!target.offsetWidth || !target.offsetHeight) {
      host.remove();
      throw new Error('El contenido del PDF no tiene dimensiones renderizables.');
    }

    try {
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: widthPx,
        scrollX: 0,
        scrollY: -window.scrollY,
        foreignObjectRendering: false,
      });

      if (!canvas.width || !canvas.height) {
        throw new Error('html2canvas devolvió un canvas vacío.');
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'letter',
      });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 6;
      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2;
      const imgW = usableW;
      const imgH = (canvas.height * imgW) / canvas.width;

      let y = margin;
      let remaining = imgH;

      pdf.addImage(imgData, 'JPEG', margin, y, imgW, imgH);
      remaining -= usableH;

      while (remaining > 1) {
        y = margin - (imgH - remaining);
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, y, imgW, imgH);
        remaining -= usableH;
      }

      pdf.save(filename);
    } finally {
      host.remove();
    }
  }

  // ─── shared bits ─────────────────────────────────────────────

  private logoBlock(data: MemoriaPdfPayload): string {
    const src = resolveLogoUrl(data.empresaAsociadaId, data.contratista);
    if (src) {
      return `<img src="${esc(src)}" alt="Logo" style="max-height:64px;max-width:180px;object-fit:contain;" />`;
    }
    const name = esc(data.contratista || 'EMPRESA ASOCIADA');
    return `<div style="font-size:12px;font-weight:700;color:#888;text-align:center;line-height:1.25;">${name}</div>`;
  }

  private metaRight(
    actaNo: string,
    fechaCorte: string,
    opts: { fechaActa?: string; omitFechaCorte?: boolean } = {}
  ): string {
    const cellL = `border:1px solid ${BORDER};padding:6px 8px;font-weight:700;font-size:11px;white-space:nowrap;color:${BLUE};${CELL_H}`;
    const cellR = `border:1px solid ${BORDER};padding:6px 8px;font-size:11px;text-align:center;${CELL_H}`;
    const fechaActaRow = opts.fechaActa
      ? `<tr>
          <td style="${cellL}">FECHA ACTA</td>
          <td style="${cellR}">${esc(opts.fechaActa)}</td>
        </tr>`
      : '';
    const fechaCorteRow = opts.omitFechaCorte
      ? ''
      : `<tr>
          <td style="${cellL}">FECHA CORTE</td>
          <td style="${cellR}">${esc(fechaCorte)}</td>
        </tr>`;
    return `
      <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;">
        <tr>
          <td style="${cellL}">ACTA No.</td>
          <td style="${cellR}font-weight:700;color:${BLUE};">${esc(actaNo)}</td>
        </tr>
        ${fechaActaRow}
        ${fechaCorteRow}
      </table>`;
  }

  private headerRow(
    title: string,
    data: MemoriaPdfPayload,
    opts: {
      withFechaActa?: boolean;
      omitFechaCorte?: boolean;
      /** Acta parcial: etiqueta FECHA CORTE con valor de fecha acta actual. */
      fechaCorteAsActaActual?: boolean;
    } = {}
  ): string {
    const fechaActa = formatDateSlash(data.fechaActa);
    const fechaCorte = opts.fechaCorteAsActaActual
      ? fechaActa
      : formatDateSlash(data.fechaCorte || data.fechaActa);
    return `
      <div style="${BOX_FRAMED}margin-bottom:10px;">
        <table style="${TABLE_INNER}font-family:Arial,sans-serif;table-layout:fixed;">
          <tr>
            <td style="width:22%;padding:12px;vertical-align:middle;text-align:center;background:#fff;">
              ${this.logoBlock(data)}
            </td>
            <td style="width:50%;padding:14px 10px;vertical-align:middle;text-align:center;background:#fff;">
              <div style="font-size:16px;font-weight:800;color:${BLUE};letter-spacing:0.3px;line-height:1.3;">${esc(title)}</div>
            </td>
            <td style="width:28%;padding:6px;vertical-align:middle;background:#fff;">
              ${this.metaRight(data.consecutivo || '—', fechaCorte, {
                fechaActa: opts.withFechaActa ? fechaActa : undefined,
                omitFechaCorte: opts.omitFechaCorte,
              })}
            </td>
          </tr>
        </table>
      </div>`;
  }

  private field(label: string, value: string, width?: string): string {
    return `
      <td style="border:1px solid ${BORDER};padding:8px 10px;font-size:11px;vertical-align:middle;${CELL_H}${width ? `width:${width};` : ''}background:#fff;">
        <span style="font-weight:700;color:${GRAY};">${esc(label)}:</span>
        <span style="margin-left:6px;color:#111;">${esc(value || '—')}</span>
      </td>`;
  }

  private fieldCellFull(label: string, value: string, colspan = 1): string {
    return `
      <td colspan="${colspan}" style="border:1px solid ${BORDER};padding:8px 10px;font-size:11px;vertical-align:middle;${CELL_H}background:#fff;">
        <span style="font-weight:700;color:${GRAY};">${esc(label)}:</span>
        <span style="margin-left:6px;color:#111;">${esc(value || '—')}</span>
      </td>`;
  }

  private metaTable(rowsHtml: string, fixed = true): string {
    return `
      <div style="${BOX}margin-bottom:10px;">
        <table style="${TABLE_INNER}${fixed ? 'table-layout:fixed;' : ''}">
          ${rowsHtml}
        </table>
      </div>`;
  }

  private elaborado(data: MemoriaPdfPayload): string {
    return `
      <div style="text-align:right;margin-top:10px;font-size:10px;color:${BLUE_SOFT};font-family:Arial,sans-serif;">
        Elaborado Por: <strong>${esc(data.elaboradoPor || 'Usuario')}</strong>
      </div>`;
  }

  // ─── 1. Anexo fotográfico ────────────────────────────────────

  private buildAnexoHtml(data: MemoriaPdfPayload): string {
    // 1 fila por ítem con imagen; sin imagen no se muestra fila vacía.
    const evidencias = (data.evidencias || []).filter((e) => !!e.fotoUrl?.trim());

    const photoCell = (ev: MemoriaPdfEvidencia) =>
      `<img src="${esc(ev.fotoUrl)}" style="width:100%;height:130px;object-fit:cover;display:block;border-radius:6px;" />`;

    const rows =
      evidencias.length > 0
        ? evidencias
            .map(
              (ev, idx) => `
      <tr>
        <td style="border:1px solid ${BORDER};padding:8px;width:40%;background:#fff;${CELL_H}">
          ${photoCell(ev)}
        </td>
        <td style="border:1px solid ${BORDER};padding:10px;text-align:center;font-size:12px;vertical-align:middle;width:10%;${CELL_H}">${esc(ev.item || String(idx + 1))}</td>
        <td style="border:1px solid ${BORDER};padding:10px;font-size:11px;vertical-align:middle;width:25%;${CELL_H}">${esc(ev.detalle)}</td>
        <td style="border:1px solid ${BORDER};padding:10px;font-size:11px;vertical-align:middle;width:25%;${CELL_H}">${esc(ev.observaciones)}</td>
      </tr>`
            )
            .join('')
        : `<tr><td colspan="4" style="border:1px solid ${BORDER};padding:14px;text-align:center;font-size:11px;color:#888;">Sin evidencias fotográficas adjuntas</td></tr>`;

    return `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;padding:6px;">
        ${this.headerRow('ANEXO 1. REGISTRO FOTOGRÁFICO', data)}
        ${this.metaTable(`
          <tr>
            ${this.field('CONSTRUCTORA', data.constructora, '34%')}
            ${this.field('PROYECTO', data.proyecto, '33%')}
            ${this.field('CONTRATO No.', data.numeroContrato, '33%')}
          </tr>
          <tr>
            ${this.fieldCellFull('DETALLE', data.detalleObra || data.proyecto, 3)}
          </tr>
          <tr>
            ${this.field('TIPO DE CONTRATO', data.tipoContrato, '50%')}
            ${this.field('CONTRATISTA', data.contratista, '50%')}
          </tr>
        `)}
        <div style="${BOX}">
          <table style="${TABLE_INNER}">
            <thead>
              <tr style="background:#f0f0f0;">
                <th style="border:1px solid ${BORDER};padding:10px;font-size:11px;color:${BLUE};">EVIDENCIA</th>
                <th style="border:1px solid ${BORDER};padding:10px;font-size:11px;color:${BLUE};">ITEM</th>
                <th style="border:1px solid ${BORDER};padding:10px;font-size:11px;color:${BLUE};">DETALLE</th>
                <th style="border:1px solid ${BORDER};padding:10px;font-size:11px;color:${BLUE};">OBSERVACIONES</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        ${this.elaborado(data)}
      </div>`;
  }

  // ─── 2. Memoria de cálculo (acta actual) ─────────────────────

  private buildMemoriaCalculoHtml(data: MemoriaPdfPayload): string {
    const lines = data.remisionesActa?.length
      ? data.remisionesActa
      : data.control
          .filter((c) => toN(c.cant_acta) > 0)
          .map((c) => ({
            item: c.item,
            detalle: c.detalle,
            locacion: '',
            cantidad_a_facturar: c.cant_acta,
            um: c.um,
            observaciones: '',
          }));

    const body =
      lines.length > 0
        ? lines
            .map(
              (r) => `
          <tr>
            <td style="border:1px solid ${BORDER};padding:8px;font-size:11px;text-align:center;">${esc(r.item)}</td>
            <td style="border:1px solid ${BORDER};padding:8px;font-size:11px;">${esc(r.detalle)}</td>
            <td style="border:1px solid ${BORDER};padding:8px;font-size:11px;">${esc(r.locacion)}</td>
            <td style="border:1px solid ${BORDER};padding:8px;font-size:11px;text-align:right;">${fmtQty(r.cantidad_a_facturar)}</td>
            <td style="border:1px solid ${BORDER};padding:8px;font-size:11px;text-align:center;">${esc(r.um)}</td>
            <td style="border:1px solid ${BORDER};padding:8px;font-size:11px;">${esc(r.observaciones)}</td>
          </tr>`
            )
            .join('')
        : `<tr><td colspan="6" style="border:1px solid ${BORDER};padding:14px;text-align:center;font-size:11px;color:#888;">Sin cantidades en el presente corte</td></tr>`;

    return `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;padding:6px;">
        ${this.headerRow('MEMORIA DE CÁLCULO DE CANTIDADES DE OBRA', data)}
        ${this.metaTable(`
          <tr>
            ${this.field('CONSTRUCTORA', data.constructora, '33.33%')}
            ${this.field('PROYECTO', data.proyecto, '33.33%')}
            ${this.field('CONTRATO No.', data.numeroContrato, '33.34%')}
          </tr>
          <tr>
            ${this.fieldCellFull('DETALLE', data.detalleObra || data.proyecto, 3)}
          </tr>
          <tr>
            ${this.field('TIPO DE CONTRATO', data.tipoContrato, '50%')}
            ${this.field('CONTRATISTA', data.contratista, '50%')}
          </tr>
        `)}
        <div style="font-size:12px;font-weight:700;color:${BLUE};margin:8px 0 6px;">DETALLE CANTIDADES DE OBRA</div>
        <div style="${BOX}">
          <table style="${TABLE_INNER}table-layout:fixed;">
            <thead>
              <tr style="background:#eef3f8;">
                <th style="border:1px solid ${BORDER};padding:10px;font-size:11px;color:${BLUE};width:8%;">ITEM</th>
                <th style="border:1px solid ${BORDER};padding:10px;font-size:11px;color:${BLUE};width:32%;">DETALLE</th>
                <th style="border:1px solid ${BORDER};padding:10px;font-size:11px;color:${BLUE};width:18%;">LOCALIZACIÓN</th>
                <th style="border:1px solid ${BORDER};padding:10px;font-size:11px;color:${BLUE};width:10%;">CANT</th>
                <th style="border:1px solid ${BORDER};padding:10px;font-size:11px;color:${BLUE};width:8%;">U.M.</th>
                <th style="border:1px solid ${BORDER};padding:10px;font-size:11px;color:${BLUE};width:24%;">OBSERVACIONES</th>
              </tr>
            </thead>
            <tbody>${body}</tbody>
          </table>
        </div>
        <div style="${BOX_FRAMED}min-height:64px;margin-top:10px;padding:10px;font-size:11px;">
          <strong style="color:${GRAY};">OBSERVACIONES:</strong>
          <div style="margin-top:6px;white-space:pre-wrap;">${esc(data.observaciones || '')}</div>
        </div>
        <div style="${BOX}margin-top:10px;">
          <table style="${TABLE_INNER}">
            <tr>
              ${sigBlock('ELABORÓ')}
              ${sigBlock('REVISÓ Y APROBÓ')}
              ${sigBlock('ACEPTÓ')}
            </tr>
          </table>
        </div>
        ${this.elaborado(data)}
      </div>`;
  }

  // ─── 3. Acta parcial (acumulado) ─────────────────────────────

  private buildActaParcialHtml(data: MemoriaPdfPayload): string {
    const show$ = data.canViewValues;
    const money = (n: number) => (show$ ? fmtMoney(n) : '—');

    const items = data.control || [];
    const td = (content: string, extra = '') =>
      `<td style="border:1px solid ${BORDER};padding:6px 4px;font-size:10px;vertical-align:middle;${extra}">${content}</td>`;

    const itemRows = items
      .map((c) => {
        const vrTotal =
          toN(c.vr_total) ||
          Number((toN(c.cantidad_contratada) * toN(c.valor_unitario)).toFixed(2));
        return `
        <tr>
          ${td(esc(c.item), 'text-align:center;')}
          ${td(esc(c.detalle))}
          ${td(esc(c.um), 'text-align:center;')}
          ${td(fmtQty(c.cantidad_contratada), 'text-align:right;')}
          ${td(money(c.valor_unitario), 'text-align:right;')}
          ${td(money(vrTotal), 'text-align:right;')}
          ${td(fmtQty(c.acumulado_anterior_cant), 'text-align:right;')}
          ${td(money(c.acumulado_anterior_valor), 'text-align:right;')}
          ${td(fmtQty(c.cant_acta), `text-align:right;background:${HIGHLIGHT};`)}
          ${td(money(c.vr_parcial), `text-align:right;background:${HIGHLIGHT};`)}
          ${td(fmtQty(c.acumulado_total_cant), 'text-align:right;')}
          ${td(money(c.acumulado_total_valor), 'text-align:right;')}
        </tr>`;
      })
      .join('');

    const ant = items.reduce((s, c) => s + toN(c.acumulado_anterior_valor), 0);
    const pre = items.reduce((s, c) => s + toN(c.vr_parcial), 0);
    const tot = ant + pre;
    const p = data.porcentajes;

    const adm = (base: number) => base * (toN(p.porc_adm) / 100);
    const imp = (base: number) => base * (toN(p.porc_imp) / 100);
    const ut = (base: number) => base * (toN(p.porc_ut) / 100);
    const iva = (base: number) => ut(base) * (toN(p.porc_iva) / 100);
    const totalActa = (base: number) =>
      base + adm(base) + imp(base) + ut(base) + iva(base);
    const amort = (base: number) =>
      totalActa(base) * (toN(p.porc_amort_anticipo) / 100);
    const rete = (base: number) =>
      totalActa(base) * (toN(p.porc_rete_garantia) / 100);

    let extraAnt = 0;
    let extraPre = 0;
    const extraFinRows = (data.conceptosExtra || [])
      .map((c) => {
        const a = totalActa(ant) * (toN(c.porc) / 100);
        const pr = totalActa(pre) * (toN(c.porc) / 100);
        extraAnt += a;
        extraPre += pr;
        return finRow(c.nombre || 'Concepto', c.porc, a, pr, a + pr, money, false);
      })
      .join('');

    const netoAnt = totalActa(ant) - amort(ant) - rete(ant) - extraAnt;
    const netoPre = totalActa(pre) - amort(pre) - rete(pre) - extraPre;

    const finBody = [
      finRow('A. SUB - TOTAL COSTOS DIRECTOS', null, ant, pre, tot, money, true),
      finRow('B. ADMINISTRACIÓN', p.porc_adm, adm(ant), adm(pre), adm(tot), money, false),
      finRow('C. IMPREVISTOS', p.porc_imp, imp(ant), imp(pre), imp(tot), money, false),
      finRow('D. UTILIDAD', p.porc_ut, ut(ant), ut(pre), ut(tot), money, false),
      finRow('E. IVA SOBRE UTILIDAD', p.porc_iva, iva(ant), iva(pre), iva(tot), money, false),
      finRow(
        'F. TOTAL ACTA (A+B+C+D+E)',
        null,
        totalActa(ant),
        totalActa(pre),
        totalActa(tot),
        money,
        true,
        true
      ),
      finRow(
        'G. AMORTIZACIÓN ANTICIPO',
        p.porc_amort_anticipo,
        amort(ant),
        amort(pre),
        amort(tot),
        money,
        false
      ),
      finRow(
        'H. RETEGARANTÍA',
        p.porc_rete_garantia,
        rete(ant),
        rete(pre),
        rete(tot),
        money,
        false
      ),
      extraFinRows,
      finRow(
        'VALOR NETO A PAGAR',
        null,
        netoAnt,
        netoPre,
        netoAnt + netoPre,
        money,
        true,
        false,
        true
      ),
    ].join('');

    // Sin rowspan: html2canvas recorta el texto de celdas con rowspan.
    const thGroup = (t: string, colspan: number, extra = '') =>
      `<th colspan="${colspan}" style="border:1px solid ${BORDER};padding:8px 4px;font-size:9px;color:${BLUE};line-height:1.25;vertical-align:middle;text-align:center;background:#f3f6fa;${extra}">${t}</th>`;
    const thSub = (t: string, extra = '') =>
      `<th style="border:1px solid ${BORDER};padding:7px 3px;font-size:9px;color:${BLUE};line-height:1.25;vertical-align:middle;text-align:center;background:#f3f6fa;${extra}">${t}</th>`;

    // Dos cuadros separados (diseño cliente): izquierda datos; derecha VR/saldo.
    // Tabla envolvente (no flex) para que html2canvas capture bien.
    const rowH = '42px';
    const cellBase = `border:1px solid ${BORDER};padding:7px 10px;font-size:11px;vertical-align:middle;height:${rowH};background:#fff;`;
    const lv = (label: string, value: string, width: string) => `
      <td style="${cellBase}width:${width};">
        <span style="font-weight:700;color:#222;">${esc(label)}:</span>
        <span style="margin-left:6px;color:#111;">${esc(value || '—')}</span>
      </td>`;
    const vrRow = (label: string, value: string, last = false) => `
      <tr>
        <td style="border${last ? ':none' : `-bottom:1px solid ${BORDER}`};padding:7px 10px;font-size:11px;vertical-align:middle;height:${rowH};background:#fff;">
          <span style="font-weight:700;color:#222;">${esc(label)} :</span>
          <span style="margin-left:6px;color:#111;">${value}</span>
        </td>
      </tr>`;

    const infoBlock = `
      <table style="width:100%;border-collapse:separate;border-spacing:10px 0;margin:0 0 10px 0;table-layout:fixed;">
        <tr>
          <td style="width:74%;padding:0;vertical-align:stretch;">
            <div style="${BOX}">
              <table style="${TABLE_INNER}table-layout:fixed;">
                <tr>
                  ${lv('CONSTRUCTORA', data.constructora, '33.33%')}
                  ${lv('PROYECTO', data.proyecto, '33.33%')}
                  ${lv('CONTRATO No.', data.numeroContrato, '33.34%')}
                </tr>
                <tr>
                  <td colspan="3" style="${cellBase}">
                    <span style="font-weight:700;color:#222;">DETALLE:</span>
                    <span style="margin-left:6px;color:#111;">${esc(data.detalleObra || data.proyecto || '—')}</span>
                  </td>
                </tr>
                <tr>
                  ${lv('TIPO DE CONTRATO', data.tipoContrato, '33.33%')}
                  ${lv('VR ANTICIPO', show$ ? fmtMoney(data.vrAnticipo) : '—', '33.33%')}
                  ${lv('CONTRATISTA', data.contratista, '33.34%')}
                </tr>
              </table>
            </div>
          </td>
          <td style="width:26%;padding:0;vertical-align:stretch;">
            <div style="${BOX_FRAMED}">
              <table style="${TABLE_INNER}">
                ${vrRow('VR CONTRATO', money(data.vrContrato))}
                ${vrRow('VR ACUMULADO', money(data.vrAcumulado))}
                ${vrRow('SALDO', money(data.saldo), true)}
              </table>
            </div>
          </td>
        </tr>
      </table>`;

    return `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;padding:4px;">
        ${this.headerRow('ACTA PARCIAL DE EJECUCIÓN DE OBRA', data, {
          withFechaActa: true,
          omitFechaCorte: true,
        })}
        ${infoBlock}

        <div style="${BOX}">
          <table style="${TABLE_INNER}">
            <thead>
              <tr>
                ${thGroup('', 3)}
                ${thGroup('CANTIDAD CONTRATADA', 3)}
                ${thGroup('CANTIDAD ACUMULADA ANTERIOR', 2)}
                ${thGroup('CANTIDAD DEL PRESENTE CORTE', 2, `background:${HIGHLIGHT};`)}
                ${thGroup('CANTIDAD ACUMULADA A LA FECHA', 2)}
              </tr>
              <tr>
                ${thSub('ITEM')}
                ${thSub('DETALLE')}
                ${thSub('U.M.')}
                ${thSub('CANT')}
                ${thSub('VR UNITARIO')}
                ${thSub('VR TOTAL')}
                ${thSub('CANT')}
                ${thSub('Vr. PARCIAL')}
                ${thSub('CANT', `background:${HIGHLIGHT};`)}
                ${thSub('Vr. PARCIAL', `background:${HIGHLIGHT};`)}
                ${thSub('CANT')}
                ${thSub('Vr. PARCIAL')}
              </tr>
            </thead>
            <tbody>
              ${itemRows || `<tr><td colspan="12" style="border:1px solid ${BORDER};padding:12px;text-align:center;font-size:11px;color:#888;">Sin ítems de control</td></tr>`}
              ${finBody}
            </tbody>
          </table>
        </div>

        <div style="${BOX_FRAMED}min-height:48px;margin-top:10px;padding:10px;font-size:11px;">
          <strong style="color:${GRAY};">OBSERVACIONES:</strong>
          <div style="margin-top:6px;white-space:pre-wrap;">${esc(data.observaciones || '')}</div>
        </div>

        <div style="${BOX}margin-top:10px;">
          <table style="${TABLE_INNER}">
            <tr>
              ${firmaActa('CONTRATISTA')}
              ${firmaActa('RESIDENTE DE OBRA')}
              ${firmaActa('RESIDENTE INTERVENTORÍA')}
              ${firmaActa('DIRECTOR DE CONSTRUCCIONES')}
              ${firmaActa('DIRECTOR DE INTERVENTORIA')}
            </tr>
          </table>
        </div>
        ${this.elaborado(data)}
      </div>`;
  }
}

// ─── helpers ───────────────────────────────────────────────────

function sigBlock(title: string): string {
  return `
    <td style="border:1px solid ${BORDER};padding:12px;width:33.33%;vertical-align:top;font-size:11px;">
      <div style="font-weight:700;color:${BLUE};margin-bottom:32px;">${title}</div>
      <div style="border-top:1px solid #999;padding-top:4px;margin-bottom:12px;">FIRMA</div>
      <div style="border-top:1px solid #999;padding-top:4px;margin-bottom:12px;">NOMBRE</div>
      <div style="border-top:1px solid #999;padding-top:4px;">CARGO</div>
    </td>`;
}

function firmaActa(title: string): string {
  return `
    <td style="border:1px solid ${BORDER};padding:10px;width:20%;height:84px;vertical-align:bottom;text-align:center;font-size:10px;font-weight:700;">
      ${title}
    </td>`;
}

function finRow(
  label: string,
  porc: number | null,
  ant: number,
  pre: number,
  tot: number,
  money: (n: number) => string,
  bold = false,
  highlight = false,
  neto = false
): string {
  const bg = highlight ? HIGHLIGHT : neto ? '#eef4fb' : '#fff';
  const color = neto ? BLUE : '#111';
  const fw = bold || neto ? '700' : '400';
  const porcTxt =
    porc == null || Number.isNaN(Number(porc))
      ? ''
      : ` (${Number(porc).toLocaleString('es-CO', { maximumFractionDigits: 2 })}%)`;
  const cell = (content: string, extra = '') =>
    `<td style="border:1px solid ${BORDER};padding:6px 4px;font-size:10px;text-align:right;font-weight:${fw};color:${color};${extra}">${content}</td>`;
  return `
    <tr style="background:${bg};">
      <td colspan="6" style="border:1px solid ${BORDER};padding:6px 8px;font-size:10px;font-weight:${fw};color:${color};text-align:left;">${esc(label)}${porcTxt}</td>
      <td style="border:1px solid ${BORDER};padding:6px 4px;font-size:10px;"></td>
      ${cell(money(ant))}
      <td style="border:1px solid ${BORDER};padding:6px 4px;font-size:10px;background:${HIGHLIGHT};"></td>
      ${cell(money(pre), `color:${neto ? BLUE : color};background:${HIGHLIGHT};`)}
      <td style="border:1px solid ${BORDER};padding:6px 4px;font-size:10px;"></td>
      ${cell(money(tot))}
    </tr>`;
}

function resolveLogoUrl(
  empresaId: string | number | null | undefined,
  contratista: string
): string {
  const id = String(empresaId ?? '').trim();
  const name = String(contratista || '').toUpperCase();
  if (id === '1' || name.includes('SOSAMET')) {
    return 'assets/images/logo_principal.png';
  }
  if (id === '2' || name.includes('HIERRO') || name.includes('HS')) {
    return 'assets/images/LOGO_HS.png';
  }
  if (id === '3' || name.includes('DMS')) {
    return 'assets/images/LOGO_DMS.png';
  }
  return '';
}

function formatDateSlash(v: Date | string | null | undefined): string {
  if (!v) return '— / — / —';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '— / — / —';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd} / ${mm} / ${yyyy}`;
}

function fmtMoney(n: number): string {
  const v = Number(n) || 0;
  return (
    '$' +
    v.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  );
}

function fmtQty(n: number): string {
  const v = Number(n) || 0;
  return v.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function toN(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeName(s: string): string {
  return String(s || 'MEM')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 60);
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'));
  if (!imgs.length) return Promise.resolve();
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  ).then(() => undefined);
}
