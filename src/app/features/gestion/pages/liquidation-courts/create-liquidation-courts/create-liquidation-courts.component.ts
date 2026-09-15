  import { Component, OnInit, OnDestroy } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { FormsModule } from '@angular/forms';
  import { InputTextModule } from 'primeng/inputtext';
  import { InputNumberModule } from 'primeng/inputnumber';
  import { DropdownModule } from 'primeng/dropdown';
  import { ButtonModule } from 'primeng/button';
  import { InputTextarea } from 'primeng/inputtextarea';
  import { FloatLabelModule } from 'primeng/floatlabel';
  import { TableModule } from 'primeng/table';
  import { ProgressSpinnerModule } from 'primeng/progressspinner';
  import { GestionService } from '../../../shared/service/gestion.service';
  import { 
    Company, 
    GestionUser, 
    LiquidationItem, 
    LiquidationResumen, 
    LiquidationPayload 
  } from '../../../shared/interfaces/Response.interface';

  import * as XLSX from 'xlsx';
  import Swal from 'sweetalert2';
  import { Subscription } from 'rxjs';

  @Component({
    selector: 'app-create-liquidation',
    standalone: true,
    imports: [
      CommonModule,
      FormsModule,
      InputTextModule,
      InputNumberModule,
      DropdownModule,
      ButtonModule,
      InputTextarea,
      FloatLabelModule,
      TableModule,
      ProgressSpinnerModule
    ],
    templateUrl: './create-liquidation-courts.component.html',
    styleUrls: ['./create-liquidation-courts.component.scss'],
  })
  export class CreateLiquidationComponent implements OnInit, OnDestroy {

    consecutivo: string = '';
    nombreCorte: string = '';
    tipoCorte: string = '';
    observaciones: string = '';
    sinContrato = false;

    readonly tipoCorteOptions = [
      { label: 'FABRICACIÓN', value: 'FABRICACIÓN' },
      { label: 'INSTALACIÓN', value: 'INSTALACIÓN' },
      { label: 'PINTURA', value: 'PINTURA' },
    ];

    /** Nombre del archivo Excel seleccionado (se muestra al lado del botón) */
    selectedExcelFileName: string = '';

    companies: Company[] = [];
    workUsers: GestionUser[] = [];

    empresaSelectedId: number | null = null;
    userSelected: number | null = null;

    resumen: LiquidationResumen = {
      subtotal: 0,
      seguridad_social: 0,
      maquinaria_aseo: 0,
      casino: 0,
      retegarantia: 0,
      prestamos: 0,
      otros: 0,
      total: 0
    };

    items: LiquidationItem[] = [];

    /** % del plano: no recalcular si vinieron del Excel o el usuario los editó. */
    private lockPctMaquinaria = false;
    private lockPctRetegarantia = false;

    /** Porcentajes del archivo plano oficial. */
    private static readonly PCT_MAQUINARIA_ASEO = 0.1;
    private static readonly PCT_RETEGARANTIA = 0.05;
    
    loading: boolean = false;
    loadingCompanies: boolean = false;
    loadingUsers: boolean = false;
    
    private subscriptions: Subscription = new Subscription();

    /**
     * Encabezados opcionales en el plano (mayúsculas) → campo de resumen.
     * Cualquiera de los sinónimos si coincide con una columna del Excel.
     */
    private static readonly RESUMEN_HEADER_ALIASES: {
      key: keyof Pick<
        LiquidationResumen,
        | 'seguridad_social'
        | 'maquinaria_aseo'
        | 'casino'
        | 'retegarantia'
        | 'prestamos'
        | 'otros'
      >;
      aliases: string[];
    }[] = [
      {
        key: 'seguridad_social',
        aliases: [
          'SEGURIDAD SOCIAL',
          'SEGURIDAD_SOCIAL',
          'SEG. SOCIAL',
          'SEGSOC',
          'APORTES SEGURIDAD SOCIAL',
          'DTO SEGURIDAD SOCIAL',
          'DCTO SEGURIDAD SOCIAL',
          'DESC SEGURIDAD SOCIAL',
          'DESCUENTO SEGURIDAD SOCIAL',
        ],
      },
      {
        key: 'maquinaria_aseo',
        aliases: [
          'MAQUINARIA Y ASEO',
          'MAQUINARIA ASEO',
          'MAQUINARIA_ASEO',
          'MAQUIN Y ASEO',
          'MAQ Y ASEO',
          'MAQ. Y ASEO',
          'DTO MAQUINARIA Y ASEO',
        ],
      },
      { key: 'casino', aliases: ['CASINO', 'DTO CASINO', 'DESC CASINO'] },
      {
        key: 'retegarantia',
        aliases: [
          'RETEGARANTIA',
          'RETEGARANTÍA',
          'RETE GARANTIA',
          'RETE GARANTÍA',
          'RETE_GARANTIA',
          'DTO RETEGARANTIA',
        ],
      },
      {
        key: 'prestamos',
        aliases: ['PRESTAMOS', 'PRÉSTAMOS', 'PRESTAMO', 'DTO PRESTAMOS'],
      },
      {
        key: 'otros',
        aliases: [
          'OTROS',
          'OTRO',
          'OTROS DESCUENTOS',
          'DESCUENTOS OTROS',
          'OTROS DCTOS',
        ],
      },
    ];

    constructor(private gestionService: GestionService) {}

    ngOnInit(): void {
      this.loadCompanies();
      this.getAllUsers();
    }

    ngOnDestroy(): void {
      this.subscriptions.unsubscribe();
    }

    loadCompanies(): void {
      this.loadingCompanies = true;
      const sub = this.gestionService.getCompanies().subscribe({
        next: (res) => {
          this.companies = res;
          this.loadingCompanies = false;
        },
        error: (err) => {
          console.error('Error al cargar empresas:', err);
          this.loadingCompanies = false;
          Swal.fire({
            title: 'Error',
            text: 'Error al cargar las empresas. Por favor, intente nuevamente.',
            icon: 'error',
            confirmButtonColor: '#00517b',
            allowOutsideClick: false,
          });
        }
      });
      this.subscriptions.add(sub);
    }

    getAllUsers(): void {
      this.loadingUsers = true;
      const sub = this.gestionService.getAllUsers().subscribe({
        next: (res) => {
          this.workUsers = res.data.map(user => ({
            ...user,
            displayName: `${user.nombre} ${user.apellido} - ${user.perfil}`
          }));
          this.loadingUsers = false;
        },
        error: (err) => {
          console.error('Error al cargar usuarios:', err);
          this.loadingUsers = false;
          Swal.fire({
            title: 'Error',
            text: 'Error al cargar los usuarios. Por favor, intente nuevamente.',
            icon: 'error',
            confirmButtonColor: '#00517b',
            allowOutsideClick: false,
          });
        }
      });
      this.subscriptions.add(sub);
    }

    onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.selectedExcelFileName = file.name;
    const reader = new FileReader();

    reader.onload = (e: any) => {

      const workbook = XLSX.read(e.target.result, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (!rawData.length) return;

      const expectedColumnsNew = [
        'REF',
        'INSUMO',
        'PROYECTO',
        'CONTRATO NO.',
        'O.T.',
        'ITEM',
        'TIPO DE ACTIVIDAD',
        'DETALLE',
        'UBICACIÓN',
        'CANT',
        'UM',
        'ANCHO',
        'ALTO',
        'FONDO',
        'OBSERVACIONES',
        'VR UNITARIO',
        'VR TOTAL',
      ];
      // Compatibilidad con plantilla anterior
      const expectedColumnsOld = [
        'REF',
        'NO. ORDEN',
        'NO. CONTRATO',
        'OBRA',
        'ITEM',
        'DESCRIPCION',
        'CANT',
        'UM',
        'ANCHO',
        'ALTO',
        'OBSERVACIONES',
        'VR UNITARIO',
      ];

      const headerMatch =
        this.findPlanoHeaderRow(rawData, expectedColumnsNew) ||
        this.findPlanoHeaderRow(rawData, [
          'REF',
          'ITEM',
          'DETALLE',
          'CANT',
          'VR UNITARIO',
        ]) ||
        this.findPlanoHeaderRow(rawData, expectedColumnsOld);
      if (!headerMatch) {
        this.selectedExcelFileName = '';
        Swal.fire({
          title: 'Encabezados no encontrados',
          text:
            'No se encontró la fila de encabezados del plano (REF, INSUMO, PROYECTO, CONTRATO No., O.T., ITEM, DETALLE, CANT, VR UNITARIO, etc.).',
          icon: 'warning',
          confirmButtonColor: '#00517b',
          allowOutsideClick: false,
        });
        return;
      }

      const { headerRowIdx, headers } = headerMatch;

      const rows = rawData.slice(headerRowIdx + 1);

      // Mapear filas a objetos
      const data: Record<string, unknown>[] = rows.map((row: any[]) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((header: string, index: number) => {
          obj[header] = row[index];
        });
        return obj;
      });

      // Cortar en la zona de descuentos (SUBTOTAL / SEGURIDAD SOCIAL / …)
      const summaryStartIdx = data.findIndex((row) =>
        this.isSummaryOrDiscountRow(row, headers)
      );
      const dataItems =
        summaryStartIdx >= 0 ? data.slice(0, summaryStartIdx) : data;
      const dataResumen =
        summaryStartIdx >= 0 ? data.slice(summaryStartIdx) : data;

      let resumenPlano = this.extractResumenFromPlano(dataResumen, headers);
      resumenPlano = this.mergeDiscountRowsIntoResumen(
        dataResumen,
        headers,
        resumenPlano
      );

      // Solo filas de detalle reales (ignora plantilla vacía con bordes)
      const dataWithContent = dataItems.filter((row) =>
        this.isMeaningfulItemRow(row, headers)
      );

      if (!dataWithContent.length) {
        this.selectedExcelFileName = '';
        Swal.fire({
          title: 'Alerta',
          text: '¡El archivo no contiene datos válidos! Todas las filas están vacías.',
          icon: 'warning',
          confirmButtonColor: '#00517b',
          allowOutsideClick: false,
        });
        return;
      }

      this.lockPctMaquinaria = false;
      this.lockPctRetegarantia = false;

      this.items = dataWithContent.map((row: any): LiquidationItem => {
        const cant = this.parseNumericCell(this.cellByAliases(row, ['CANT']));
        const vru = this.parseNumericCell(
          this.cellByAliases(row, ['VR UNITARIO'])
        );
        const vrtExcel = this.parseNumericCell(
          this.cellByAliases(row, ['VR TOTAL'])
        );
        return {
          ref: this.strCell(this.cellByAliases(row, ['REF'])),
          insumo: this.strCell(this.cellByAliases(row, ['INSUMO'])),
          no_orden: this.strCell(
            this.cellByAliases(row, ['O.T.', 'OT', 'NO. ORDEN', 'NO ORDEN'])
          ),
          no_contrato: this.strCell(
            this.cellByAliases(row, [
              'CONTRATO NO.',
              'CONTRATO No.',
              'CONTRATO NO',
              'NO. CONTRATO',
              'NO CONTRATO',
              'CONTRATO',
            ])
          ),
          obra: this.strCell(
            this.cellByAliases(row, ['PROYECTO', 'OBRA'])
          ),
          item: this.strCell(this.cellByAliases(row, ['ITEM'])),
          tipo_actividad: this.strCell(
            this.cellByAliases(row, ['TIPO DE ACTIVIDAD', 'TIPO ACTIVIDAD'])
          ),
          descripcion: this.strCell(
            this.cellByAliases(row, [
              'DETALLE',
              'DESCRIPCION',
              'DESCRIPCIÓN',
            ])
          ),
          ubicacion: this.strCell(
            this.cellByAliases(row, ['UBICACIÓN', 'UBICACION'])
          ),
          cantidad: cant,
          um: this.strCell(this.cellByAliases(row, ['UM'])),
          ancho: this.parseNumericCell(this.cellByAliases(row, ['ANCHO'])),
          alto: this.parseNumericCell(this.cellByAliases(row, ['ALTO'])),
          fondo: this.parseNumericCell(this.cellByAliases(row, ['FONDO'])),
          observaciones: this.strCell(
            this.cellByAliases(row, ['OBSERVACIONES'])
          ),
          vr_unitario: vru,
          vr_total: vrtExcel > 0 ? vrtExcel : cant * vru,
        };
      });

      // Seguridad: no dejar filas fantasma sin cantidad/valor
      this.items = this.items.filter(
        (it) =>
          (it.cantidad || 0) > 0 &&
          ((it.vr_unitario || 0) > 0 || (it.vr_total || 0) > 0)
      );

      if (!this.items.length) {
        this.selectedExcelFileName = '';
        Swal.fire({
          title: 'Alerta',
          text: 'No se encontraron ítems con cantidad y valor. Revise el archivo plano.',
          icon: 'warning',
          confirmButtonColor: '#00517b',
          allowOutsideClick: false,
        });
        return;
      }
      this.resumen = {
        subtotal: 0,
        seguridad_social: resumenPlano.seguridad_social ?? 0,
        maquinaria_aseo: resumenPlano.maquinaria_aseo ?? 0,
        casino: resumenPlano.casino ?? 0,
        retegarantia: resumenPlano.retegarantia ?? 0,
        prestamos: resumenPlano.prestamos ?? 0,
        otros: resumenPlano.otros ?? 0,
        total: 0,
      };
      if ((resumenPlano.maquinaria_aseo ?? 0) > 1) {
        this.lockPctMaquinaria = true;
      }
      if ((resumenPlano.retegarantia ?? 0) > 1) {
        this.lockPctRetegarantia = true;
      }
      // Si Excel trajo 0.1 / 0.05 (celda %), se normaliza al calcular subtotal
      if (
        (resumenPlano.maquinaria_aseo ?? 0) > 0 &&
        (resumenPlano.maquinaria_aseo ?? 0) <= 1
      ) {
        this.resumen.maquinaria_aseo = resumenPlano.maquinaria_aseo ?? 0;
        this.lockPctMaquinaria = true;
      }
      if (
        (resumenPlano.retegarantia ?? 0) > 0 &&
        (resumenPlano.retegarantia ?? 0) <= 1
      ) {
        this.resumen.retegarantia = resumenPlano.retegarantia ?? 0;
        this.lockPctRetegarantia = true;
      }
      this.calculateSubtotal();
      Swal.fire({
        title: 'Archivo cargado',
        text: `Se cargaron ${this.items.length} registros correctamente`,
        icon: 'success',
        confirmButtonColor: '#00517b',
        allowOutsideClick: false,
      });
    };

    reader.readAsBinaryString(file);
  }
    addItemRow(): void {
      const newItem: LiquidationItem = {
        ref: '',
        insumo: '',
        no_orden: '',
        no_contrato: '',
        obra: '',
        item: '',
        tipo_actividad: '',
        descripcion: '',
        ubicacion: '',
        cantidad: 0,
        um: '',
        ancho: 0,
        alto: 0,
        fondo: 0,
        observaciones: '',
        vr_unitario: 0,
        vr_total: 0
      };
      this.items.push(newItem);
    }

    removeItemRow(index: number): void {
      if (index >= 0 && index < this.items.length) {
        this.items.splice(index, 1);
        this.calculateSubtotal();
      }
    }

    calculateRowTotal(row: LiquidationItem): void {
      const cant = Number(row.cantidad) || 0;
      const vru = Number(row.vr_unitario) || 0;
      row.cantidad = cant;
      row.vr_unitario = vru;
      row.vr_total = +(cant * vru).toFixed(2);
      this.calculateSubtotal();
    }
    
    trackByIndex(index: number): number {
      return index;
    }

    private normalizeHeaderKey(h: string): string {
      return this.stripAccents(String(h ?? ''))
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
    }

    private strCell(value: unknown): string {
      return value != null ? String(value).trim() : '';
    }

    /** Lee celda por alias de encabezado (soporta plantilla nueva y antigua). */
    private cellByAliases(
      row: Record<string, unknown>,
      aliases: string[]
    ): unknown {
      const keys = Object.keys(row || {});
      for (const alias of aliases) {
        const want = this.normalizeHeaderKey(alias);
        const hit = keys.find((k) => this.normalizeHeaderKey(k) === want);
        if (hit !== undefined) {
          const v = row[hit];
          if (v !== null && v !== undefined && String(v).trim() !== '') {
            return v;
          }
        }
      }
      // Segunda pasada: devolver aunque esté vacío (para parse numérico)
      for (const alias of aliases) {
        const want = this.normalizeHeaderKey(alias);
        const hit = keys.find((k) => this.normalizeHeaderKey(k) === want);
        if (hit !== undefined) return row[hit];
      }
      return undefined;
    }

    /** Encabezado del plano puede estar en fila 2+ (títulos, logos). */
    private findPlanoHeaderRow(
      rawData: any[][],
      expectedColumns: string[]
    ): { headerRowIdx: number; headers: string[] } | null {
      const maxScan = Math.min(30, rawData.length);
      for (let i = 0; i < maxScan; i++) {
        const row = rawData[i];
        if (!row || !row.length) continue;
        const normalized = row.map((cell: any) =>
          this.normalizeHeaderKey(String(cell ?? ''))
        );
        const ok = expectedColumns.every((col) =>
          normalized.includes(this.normalizeHeaderKey(col))
        );
        if (ok) {
          return { headerRowIdx: i, headers: normalized };
        }
      }
      return null;
    }

    private stripAccents(s: string): string {
      return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    /** Coincide encabezado real del Excel (con sufijos, %) con alias de descuentos. */
    private headerMatchesResumenAlias(headerNorm: string, aliasNorm: string): boolean {
      if (!headerNorm || !aliasNorm) return false;
      if (headerNorm === aliasNorm) return true;
      if (
        headerNorm.startsWith(aliasNorm + ' ') ||
        headerNorm.startsWith(aliasNorm + '(') ||
        headerNorm.startsWith(aliasNorm + '.')
      ) {
        return true;
      }
      if (aliasNorm.length >= 10 && headerNorm.includes(aliasNorm)) {
        return true;
      }
      return false;
    }

    /** Números desde Excel (strings con coma o punto). */
    private parseNumericCell(value: unknown): number {
      if (value === null || value === undefined) {
        return 0;
      }
      if (typeof value === 'number' && !Number.isNaN(value)) {
        return value;
      }
      let s = String(value).trim();
      if (!s) {
        return 0;
      }
      s = s.replace(/\s/g, '');
      if (s.includes(',') && s.includes('.')) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else if (s.includes(',')) {
        s = s.replace(',', '.');
      }
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : 0;
    }

    /** Devuelve, para cada campo de resumen, el nombre exacto de columna en `headers`. */
    private mapResumenColumnKeys(headers: string[]): Record<
      | 'seguridad_social'
      | 'maquinaria_aseo'
      | 'casino'
      | 'retegarantia'
      | 'prestamos'
      | 'otros',
      string | null
    > {
      const out: Record<string, string | null> = {
        seguridad_social: null,
        maquinaria_aseo: null,
        casino: null,
        retegarantia: null,
        prestamos: null,
        otros: null,
      };
      for (const { key, aliases } of CreateLiquidationComponent.RESUMEN_HEADER_ALIASES) {
        for (const h of headers) {
          const hn = this.normalizeHeaderKey(h);
          if (
            aliases.some((a) =>
              this.headerMatchesResumenAlias(hn, this.normalizeHeaderKey(a))
            )
          ) {
            out[key] = h;
            break;
          }
        }
      }
      return out as Record<
        | 'seguridad_social'
        | 'maquinaria_aseo'
        | 'casino'
        | 'retegarantia'
        | 'prestamos'
        | 'otros',
        string | null
      >;
    }

    private rowHasResumenValues(
      row: Record<string, unknown>,
      colMap: {
        seguridad_social: string | null;
        maquinaria_aseo: string | null;
        casino: string | null;
        retegarantia: string | null;
        prestamos: string | null;
        otros: string | null;
      }
    ): boolean {
      const keys = Object.keys(colMap) as (keyof typeof colMap)[];
      return keys.some((k) => {
        const col = colMap[k];
        if (!col) {
          return false;
        }
        return this.parseNumericCell(row[col]) !== 0;
      });
    }

    /**
     * Fila de detalle real del plano (no plantilla vacía ni zona de descuentos).
     */
    private isMeaningfulItemRow(
      row: Record<string, unknown>,
      headers: string[]
    ): boolean {
      if (this.isSummaryOrDiscountRow(row, headers)) return false;

      const ref = this.strCell(this.cellByAliases(row, ['REF']));
      const item = this.strCell(this.cellByAliases(row, ['ITEM']));
      const detalle = this.strCell(
        this.cellByAliases(row, ['DETALLE', 'DESCRIPCION', 'DESCRIPCIÓN'])
      );
      const insumo = this.strCell(this.cellByAliases(row, ['INSUMO']));
      const cant = this.parseNumericCell(this.cellByAliases(row, ['CANT']));
      const vru = this.parseNumericCell(
        this.cellByAliases(row, ['VR UNITARIO'])
      );
      const vrt = this.parseNumericCell(
        this.cellByAliases(row, ['VR TOTAL'])
      );

      // Repetición de encabezados / placeholders
      const identity = `${ref} ${item} ${detalle}`.toUpperCase();
      if (
        /^(REF|ITEM|DETALLE|DESCRIPCION|INSUMO)(\s|$)/.test(identity.trim()) ||
        ['REF', 'ITEM', 'INSUMO', 'DETALLE'].includes(ref.toUpperCase())
      ) {
        return false;
      }

      const hasIdentity = !!(ref || item || detalle || insumo);
      const hasMeasure = cant > 0 && (vru > 0 || vrt > 0);
      return hasIdentity && hasMeasure;
    }

    private rowDiscountLabelBlob(row: Record<string, unknown>): string {
      // Revisar TODAS las celdas: en el plano los rótulos pueden estar en VR UNITARIO / OBSERVACIONES
      return Object.values(row || {})
        .map((x) => String(x ?? '').trim())
        .filter(Boolean)
        .join(' ');
    }

    private isSummaryOrDiscountRow(
      row: Record<string, unknown>,
      headers: string[]
    ): boolean {
      const blob = this.stripAccents(this.rowDiscountLabelBlob(row))
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim();
      if (!blob) return false;

      if (/\bSUB\s*TOTAL\b/.test(blob) || /\bRESUMEN\b/.test(blob)) {
        return true;
      }
      // "TOTAL" / "DESCUENTOS" de la zona inferior (no filas de obra)
      if (/\bDESCUENTOS?\b/.test(blob) || /(^|\s)TOTAL(\s|$)/.test(blob)) {
        const cant = this.parseNumericCell(this.cellByAliases(row, ['CANT']));
        const item = this.strCell(this.cellByAliases(row, ['ITEM']));
        const detalle = this.strCell(
          this.cellByAliases(row, ['DETALLE', 'DESCRIPCION', 'DESCRIPCIÓN'])
        );
        const ref = this.strCell(this.cellByAliases(row, ['REF']));
        if (!ref && !item && !detalle && cant <= 0) return true;
      }

      const discountKey = this.classifyDiscountLabel(blob);
      if (discountKey) {
        const cant = this.parseNumericCell(this.cellByAliases(row, ['CANT']));
        const item = this.strCell(this.cellByAliases(row, ['ITEM']));
        const ref = this.strCell(this.cellByAliases(row, ['REF']));
        // Zona de descuentos: sin REF/ITEM de obra o sin cantidad
        if (!item || !ref || cant <= 0) return true;
      }

      const colMap = this.mapResumenColumnKeys(headers);
      const cant = this.parseNumericCell(this.cellByAliases(row, ['CANT']));
      const vru = this.parseNumericCell(
        this.cellByAliases(row, ['VR UNITARIO'])
      );
      const ref = this.strCell(this.cellByAliases(row, ['REF']));
      if (!ref && cant === 0 && vru === 0 && this.rowHasResumenValues(row, colMap)) {
        return true;
      }
      return false;
    }

    private extractResumenFromPlano(
      data: Record<string, unknown>[],
      headers: string[]
    ): Partial<Pick<
      LiquidationResumen,
      | 'seguridad_social'
      | 'maquinaria_aseo'
      | 'casino'
      | 'retegarantia'
      | 'prestamos'
      | 'otros'
    >> {
      const colMap = this.mapResumenColumnKeys(headers);
      const hasAnyHeader = Object.values(colMap).some((c) => c);
      if (!hasAnyHeader || data.length === 0) {
        return {};
      }

      const out: Partial<
        Pick<
          LiquidationResumen,
          | 'seguridad_social'
          | 'maquinaria_aseo'
          | 'casino'
          | 'retegarantia'
          | 'prestamos'
          | 'otros'
        >
      > = {};

      const readRow = (row: Record<string, unknown>) => {
        (
          [
            'seguridad_social',
            'maquinaria_aseo',
            'casino',
            'retegarantia',
            'prestamos',
            'otros',
          ] as const
        ).forEach((k) => {
            const col = colMap[k];
            if (col) {
              out[k] = this.parseNumericCell(row[col]);
            }
          }
        );
      };

      const summaryIdx = data.findIndex((row) => this.isSummaryOrDiscountRow(row, headers));
      if (summaryIdx >= 0) {
        readRow(data[summaryIdx]);
        return out;
      }

      for (let i = data.length - 1; i >= 0; i--) {
        if (this.rowHasResumenValues(data[i], colMap)) {
          readRow(data[i]);
          return out;
        }
      }

      return out;
    }

    /**
     * Descuentos en filas “etiqueta + VR UNITARIO” (zona de descuentos sin columnas dedicadas).
     * No pisa valores ya leídos por columnas ni filas de resumen con columnas mapeadas.
     */
    private mergeDiscountRowsIntoResumen(
      data: Record<string, unknown>[],
      _headers: string[],
      base: Partial<
        Pick<
          LiquidationResumen,
          | 'seguridad_social'
          | 'maquinaria_aseo'
          | 'casino'
          | 'retegarantia'
          | 'prestamos'
          | 'otros'
        >
      >
    ): Partial<
      Pick<
        LiquidationResumen,
        | 'seguridad_social'
        | 'maquinaria_aseo'
        | 'casino'
        | 'retegarantia'
        | 'prestamos'
        | 'otros'
      >
    > {
      type RK =
        | 'seguridad_social'
        | 'maquinaria_aseo'
        | 'casino'
        | 'retegarantia'
        | 'prestamos'
        | 'otros';
      const out: Partial<Pick<LiquidationResumen, RK>> = { ...base };
      const getNum = (k: RK) => Number(out[k] ?? 0);

      for (const row of data) {
        const blob = this.rowDiscountLabelBlob(row);
        const key = this.classifyDiscountLabel(blob);
        if (!key) continue;
        if (getNum(key) > 0) continue;

        // En el plano: etiqueta + (opcional %) + valor en VR TOTAL
        const vrt = this.parseNumericCell(
          this.cellByAliases(row, ['VR TOTAL'])
        );
        const vruRaw = this.cellByAliases(row, ['VR UNITARIO']);
        const vru = this.parseNumericCell(vruRaw);
        const cant = this.parseNumericCell(this.cellByAliases(row, ['CANT']));

        let amount = 0;
        if (vrt > 0) {
          amount = vrt;
        } else if (vru > 0 && vru <= 1) {
          // fracción tipo 0.1 (10%) — se normaliza luego con subtotal
          amount = vru;
        } else if (typeof vruRaw === 'string' && /%/.test(vruRaw)) {
          const pct = this.parseNumericCell(String(vruRaw).replace('%', ''));
          amount = pct > 1 ? pct / 100 : pct;
        } else if (vru > 0) {
          amount = cant > 0 ? cant * vru : vru;
        }

        if (amount <= 0) continue;
        out[key] = amount;
      }

      return out;
    }

    private classifyDiscountLabel(
      blobRaw: string
    ):
      | 'seguridad_social'
      | 'maquinaria_aseo'
      | 'casino'
      | 'retegarantia'
      | 'prestamos'
      | 'otros'
      | null {
      const u = this.stripAccents(blobRaw)
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim();
      if (!u) return null;
      if (/(SEGURIDAD\s*SOCIAL|SEGSOC|APORTES?\s+SEG)/.test(u)) {
        return 'seguridad_social';
      }
      if (/(MAQUINARIA(\s+Y\s+ASEO)?|MAQ\.?\s*Y\s*ASEO)/.test(u)) {
        return 'maquinaria_aseo';
      }
      if (/\bCASINO\b/.test(u)) {
        return 'casino';
      }
      if (/RETE\s*GARANT/.test(u)) {
        return 'retegarantia';
      }
      if (/PRESTAMOS?/.test(u)) {
        return 'prestamos';
      }
      if (/(^OTROS(\s|$)|OTROS\s+DESC|DESC\.?\s*OTROS|OTROS\s+DCT)/.test(u)) {
        return 'otros';
      }
      return null;
    }

    /**
     * Helper para verificar si un valor de string está lleno
     */
    private isStringNotEmpty(value: any): boolean {
      if (value === null || value === undefined) return false;
      const str = String(value).trim();
      return str.length > 0;
    }

    /**
     * Valida si un item tiene todos los campos requeridos llenos
     */
    private isValidItem(item: LiquidationItem): boolean {
      const contratoOk = this.isStringNotEmpty(item.no_contrato);
      return !!(
        this.isStringNotEmpty(item.ref) &&
        this.isStringNotEmpty(item.no_orden) &&
        contratoOk &&
        this.isStringNotEmpty(item.obra) &&
        this.isStringNotEmpty(item.item) &&
        this.isStringNotEmpty(item.descripcion) &&
        item.cantidad > 0 &&
        this.isStringNotEmpty(item.um) &&
        item.vr_unitario > 0
      );
    }

    /**
     * Obtiene los items válidos (con todos los campos requeridos)
     */
    private getValidItems(): LiquidationItem[] {
      return this.items.filter(item => this.isValidItem(item));
    }

    /**
     * Resetea el formulario a su estado inicial
     */
    resetForm(): void {
      this.consecutivo = '';
      this.nombreCorte = '';
      this.tipoCorte = '';
      this.observaciones = '';
      this.sinContrato = false;
      this.empresaSelectedId = null;
      this.userSelected = null;
      this.selectedExcelFileName = '';
      this.items = [];
      this.lockPctMaquinaria = false;
      this.lockPctRetegarantia = false;
      this.resumen = {
        subtotal: 0,
        seguridad_social: 0,
        maquinaria_aseo: 0,
        casino: 0,
        retegarantia: 0,
        prestamos: 0,
        otros: 0,
        total: 0
      };
    }

    calculateSubtotal(): void {
      this.resumen.subtotal = this.items.reduce(
        (acc, item) => acc + (item.vr_total || 0), 0
      );
      this.applyPctDescuentos();
      this.calculateTotal();
    }

    /** Aplica % del plano si no fueron fijados por Excel/usuario. */
    private applyPctDescuentos(): void {
      if (!this.lockPctMaquinaria) {
        this.resumen.maquinaria_aseo = +(
          this.resumen.subtotal *
          CreateLiquidationComponent.PCT_MAQUINARIA_ASEO
        ).toFixed(2);
      } else {
        this.resumen.maquinaria_aseo = this.normalizePctToMonto(
          this.resumen.maquinaria_aseo,
          CreateLiquidationComponent.PCT_MAQUINARIA_ASEO
        );
      }
      if (!this.lockPctRetegarantia) {
        this.resumen.retegarantia = +(
          this.resumen.subtotal *
          CreateLiquidationComponent.PCT_RETEGARANTIA
        ).toFixed(2);
      } else {
        this.resumen.retegarantia = this.normalizePctToMonto(
          this.resumen.retegarantia,
          CreateLiquidationComponent.PCT_RETEGARANTIA
        );
      }
    }

    /**
     * Excel a veces entrega 0.1 / 0.05 (celdas %) en vez del valor en pesos.
     * Si el número está entre 0 y 1, se interpreta como fracción del subtotal.
     */
    private normalizePctToMonto(raw: number, pctDefault: number): number {
      const v = Number(raw) || 0;
      if (v > 0 && v <= 1) {
        return +(this.resumen.subtotal * v).toFixed(2);
      }
      if (v <= 0 && this.resumen.subtotal > 0) {
        return +(this.resumen.subtotal * pctDefault).toFixed(2);
      }
      return v;
    }

    onDescuentoManual(field: 'maquinaria_aseo' | 'retegarantia'): void {
      if (field === 'maquinaria_aseo') {
        this.lockPctMaquinaria = true;
        this.resumen.maquinaria_aseo = this.normalizePctToMonto(
          this.resumen.maquinaria_aseo,
          CreateLiquidationComponent.PCT_MAQUINARIA_ASEO
        );
      }
      if (field === 'retegarantia') {
        this.lockPctRetegarantia = true;
        this.resumen.retegarantia = this.normalizePctToMonto(
          this.resumen.retegarantia,
          CreateLiquidationComponent.PCT_RETEGARANTIA
        );
      }
      this.calculateTotal();
    }

    calculateTotal(): void {
      const maq = this.normalizePctToMonto(
        this.resumen.maquinaria_aseo,
        CreateLiquidationComponent.PCT_MAQUINARIA_ASEO
      );
      const rete = this.normalizePctToMonto(
        this.resumen.retegarantia,
        CreateLiquidationComponent.PCT_RETEGARANTIA
      );
      // Mantener UI sincronizada si llegaron fracciones
      if (maq !== Number(this.resumen.maquinaria_aseo)) {
        this.resumen.maquinaria_aseo = maq;
      }
      if (rete !== Number(this.resumen.retegarantia)) {
        this.resumen.retegarantia = rete;
      }
      this.resumen.total = +(
        this.resumen.subtotal -
        (+this.resumen.seguridad_social || 0) -
        maq -
        (+this.resumen.casino || 0) -
        rete -
        (+this.resumen.prestamos || 0) -
        (+this.resumen.otros || 0)
      ).toFixed(2);
    }

    guardarLiquidacion(): void {
      // Validación de campos requeridos
      if (!this.consecutivo || !this.consecutivo.trim()) {
        Swal.fire({
          title: 'Validación',
          text: 'El campo Consecutivo es obligatorio',
          icon: 'warning',
          confirmButtonColor: '#00517b',
          allowOutsideClick: false,
        });
        return;
      }

      if (!this.nombreCorte || !this.nombreCorte.trim()) {
        Swal.fire({
          title: 'Validación',
          text: 'El campo Nombre Corte es obligatorio',
          icon: 'warning',
          confirmButtonColor: '#00517b',
          allowOutsideClick: false,
        });
        return;
      }

    if (!this.tipoCorte || !this.tipoCorte.trim()) {
      Swal.fire({
        title: 'Validación',
        text: 'Debe seleccionar el Tipo de corte',
        icon: 'warning',
        confirmButtonColor: '#00517b',
        allowOutsideClick: false,
      });
      return;
    }

      if (!this.empresaSelectedId) {
        Swal.fire({
          title: 'Validación',
          text: 'Debe seleccionar una empresa',
          icon: 'warning',
          confirmButtonColor: '#00517b',
          allowOutsideClick: false,
        });
        return;
      }

      if (!this.userSelected) {
        Swal.fire({
          title: 'Validación',
          text: 'Debe seleccionar un encargado',
          icon: 'warning',
          confirmButtonColor: '#00517b',
          allowOutsideClick: false,
        });
        return;
      }

      if (!this.items || this.items.length === 0) {
        Swal.fire({
          title: 'Validación',
          text: 'Debe agregar al menos un item',
          icon: 'warning',
          confirmButtonColor: '#00517b',
          allowOutsideClick: false,
        });
        return;
      }

      // Validar que todos los items tengan los campos requeridos
      const validItems = this.getValidItems();
      const invalidItemsCount = this.items.length - validItems.length;

      if (validItems.length === 0) {
        Swal.fire({
          title: 'Validación',
          text: 'Debe agregar al menos un item con todos los campos requeridos llenos (Ref, No. Orden, No. Contrato, Obra, Item, Descripción, Cantidad > 0, UM, Vr. Unitario > 0)',
          icon: 'warning',
          confirmButtonColor: '#00517b',
          allowOutsideClick: false,
        });
        return;
      }

      if (invalidItemsCount > 0) {
        Swal.fire({
          title: 'Validación',
          text: `Hay ${invalidItemsCount} item(s) incompletos. Solo se guardarán los ${validItems.length} item(s) válidos. ¿Desea continuar?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, continuar',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#00517b',
          cancelButtonColor: '#6c757d',
          allowOutsideClick: false,
        }).then((result) => {
          if (result.isConfirmed) {
            this.saveLiquidationWithValidItems(validItems);
          }
        });
        return;
      }

      // Si todos los items son válidos, guardar directamente
      this.saveLiquidationWithValidItems(validItems);
    }

    /**
     * Guarda la liquidación con los items válidos
     */
    private saveLiquidationWithValidItems(validItems: LiquidationItem[]): void {
      const items = validItems.map((it) => {
        const noContrato = String(it.no_contrato || '').trim();
        return {
          ...it,
          no_contrato: noContrato,
          tipo_vinculo: (this.sinContrato
            ? 'COTIZACION'
            : 'CONTRATO') as 'CONTRATO' | 'COTIZACION',
        };
      });

      const sinClave = items.some((it) => !String(it.no_contrato || '').trim());
      if (sinClave) {
        Swal.fire({
          title: 'Validación',
          text: this.sinContrato
            ? 'Cada ítem debe tener N° Cotización.'
            : 'Cada ítem debe tener No. Contrato.',
          icon: 'warning',
          confirmButtonColor: '#00517b',
        });
        return;
      }

      const payload: LiquidationPayload = {
        consecutivo: this.consecutivo.trim(),
        nombre_corte: this.nombreCorte.trim(),
      tipo_corte: this.tipoCorte.trim(),
        empresa_asociada_id: this.empresaSelectedId,
        encargado_id: this.userSelected,
        observaciones: this.observaciones?.trim() || '',
        resumen: this.resumen,
        sin_contrato: this.sinContrato,
        items
      };

      this.loading = true;
      const sub = this.gestionService.createLiquidation(payload).subscribe({
        next: (res) => {
          this.loading = false;
          Swal.fire({
            title: 'Éxito',
            text: '¡Liquidación creada correctamente!',
            icon: 'success',
            confirmButtonColor: '#00517b',
            allowOutsideClick: false,
          });
          // Opcional: resetear formulario después de guardar
          this.resetForm();
        },
        error: (err) => {
          this.loading = false;
          const errorMessage =
            err?.error?.mensaje ||
            err?.error?.message ||
            err?.message ||
            'Error al crear la liquidación';
          Swal.fire({
            title: 'Error',
            text: errorMessage,
            icon: 'error',
            confirmButtonColor: '#00517b',
            allowOutsideClick: false,
          });
        }
      });
      this.subscriptions.add(sub);
    }
  }