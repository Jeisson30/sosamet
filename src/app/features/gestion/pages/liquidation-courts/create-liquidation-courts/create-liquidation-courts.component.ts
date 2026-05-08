  import { Component, OnInit, OnDestroy } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { FormsModule } from '@angular/forms';
  import { InputTextModule } from 'primeng/inputtext';
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
      prestamos: 0,
      otros: 0,
      total: 0
    };

    items: LiquidationItem[] = [];
    
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

      const expectedColumns = [
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
        'VR UNITARIO'
      ];

      const headerMatch = this.findPlanoHeaderRow(rawData, expectedColumns);
      if (!headerMatch) {
        this.selectedExcelFileName = '';
        Swal.fire({
          title: 'Encabezados no encontrados',
          text:
            'No se encontró una fila con todas las columnas obligatorias (REF, NO. ORDEN, NO. CONTRATO, etc.). Si el Excel tiene filas de título encima de la tabla, el encabezado real debe incluir esos nombres de columna.',
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

      let resumenPlano = this.extractResumenFromPlano(data, headers);
      resumenPlano = this.mergeDiscountRowsIntoResumen(
        data,
        headers,
        resumenPlano
      );
      const dataSinFilaResumen = data.filter(
        (row) => !this.isSummaryOrDiscountRow(row, headers)
      );

      // Filtrar filas vacías (que no tengan datos significativos)
      // Una fila se considera vacía si todos los campos importantes están vacíos
      const dataWithContent = dataSinFilaResumen.filter((row: any) => {
        // Campos críticos que deben tener datos para considerar la fila válida
        const criticalFields = ['REF', 'ITEM', 'DESCRIPCION', 'CANT', 'VR UNITARIO'];
        
        // Verificar si al menos uno de los campos críticos tiene datos
        const hasCriticalData = criticalFields.some((col: string) => {
          const value = row[col];
          if (value === null || value === undefined) return false;
          
          // Si es string, verificar que no esté vacío después de trim
          if (typeof value === 'string') {
            return value.trim().length > 0;
          }
          
          // Si es número, verificar que sea mayor a 0
          if (typeof value === 'number') {
            return value > 0;
          }
          
          return true;
        });
        
        // Si tiene datos críticos, la fila es válida
        if (hasCriticalData) return true;
        
        // Si no tiene datos críticos, verificar si tiene al menos algún otro campo con datos
        // (para casos donde los campos críticos puedan estar vacíos pero otros campos tengan info)
        return expectedColumns.some((col: string) => {
          // Saltar campos críticos ya verificados
          if (criticalFields.includes(col)) return false;
          
          const value = row[col];
          if (value === null || value === undefined) return false;
          
          if (typeof value === 'string') {
            return value.trim().length > 0;
          }
          
          if (typeof value === 'number') {
            return value !== 0;
          }
          
          return true;
        });
      });

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

      // Mapear solo las filas con contenido a items
      this.items = [];
      this.items = dataWithContent.map((row: any): LiquidationItem => {
        const cant = this.parseNumericCell(row['CANT']);
        const vru = this.parseNumericCell(row['VR UNITARIO']);
        return {
          ref: row['REF'] != null ? String(row['REF']) : '',
          no_orden: row['NO. ORDEN'] != null ? String(row['NO. ORDEN']) : '',
          no_contrato: row['NO. CONTRATO'] != null ? String(row['NO. CONTRATO']) : '',
          obra: row['OBRA'] != null ? String(row['OBRA']) : '',
          item: row['ITEM'] != null ? String(row['ITEM']) : '',
          descripcion: row['DESCRIPCION'] != null ? String(row['DESCRIPCION']) : '',
          cantidad: cant,
          um: row['UM'] != null ? String(row['UM']) : '',
          ancho: this.parseNumericCell(row['ANCHO']),
          alto: this.parseNumericCell(row['ALTO']),
          observaciones: row['OBSERVACIONES'] != null ? String(row['OBSERVACIONES']) : '',
          vr_unitario: vru,
          vr_total: cant * vru,
        };
      });

      this.resumen = {
        subtotal: 0,
        seguridad_social: resumenPlano.seguridad_social ?? 0,
        maquinaria_aseo: resumenPlano.maquinaria_aseo ?? 0,
        casino: resumenPlano.casino ?? 0,
        prestamos: resumenPlano.prestamos ?? 0,
        otros: resumenPlano.otros ?? 0,
        total: 0,
      };
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
        no_orden: '',
        no_contrato: '',
        obra: '',
        item: '',
        descripcion: '',
        cantidad: 0,
        um: '',
        ancho: 0,
        alto: 0,
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
      row.vr_total = (row.cantidad || 0) * (row.vr_unitario || 0);
      this.calculateSubtotal();
    }
    
    trackByIndex(index: number): number {
      return index;
    }

    private normalizeHeaderKey(h: string): string {
      return h.replace(/\s+/g, ' ').trim().toUpperCase();
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
          String(cell ?? '').trim().toUpperCase()
        );
        if (expectedColumns.every((col) => normalized.includes(col))) {
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
      'seguridad_social' | 'maquinaria_aseo' | 'casino' | 'prestamos' | 'otros',
      string | null
    > {
      const out: Record<string, string | null> = {
        seguridad_social: null,
        maquinaria_aseo: null,
        casino: null,
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
        'seguridad_social' | 'maquinaria_aseo' | 'casino' | 'prestamos' | 'otros',
        string | null
      >;
    }

    private rowHasResumenValues(
      row: Record<string, unknown>,
      colMap: {
        seguridad_social: string | null;
        maquinaria_aseo: string | null;
        casino: string | null;
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
     * Fila de totales/descuentos (no es detalle de ítem). Se excluye de `items`.
     */
    private isSummaryOrDiscountRow(
      row: Record<string, unknown>,
      headers: string[]
    ): boolean {
      const ref = String(row['REF'] ?? '')
        .trim()
        .toUpperCase();
      const colMap = this.mapResumenColumnKeys(headers);
      const markers = [
        'RESUMEN',
        'TOTAL',
        'TOTALES',
        'DESCUENTO',
        'DESCUENTOS',
        'TOT',
        'NETO',
        'DCTOS',
        'DCTO',
        'DTO',
      ];
      if (markers.some((m) => ref === m || ref.startsWith(m + ' ') || ref.startsWith(m + '.'))) {
        return true;
      }
      if (/ZONA\s+DE\s+DESC|ZONA\s+DESC|DESCUENTOS?\s+VARIOS/i.test(ref)) {
        return true;
      }
      const cant = this.parseNumericCell(row['CANT']);
      const vru = this.parseNumericCell(row['VR UNITARIO']);
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
      'seguridad_social' | 'maquinaria_aseo' | 'casino' | 'prestamos' | 'otros'
    >> {
      const colMap = this.mapResumenColumnKeys(headers);
      const hasAnyHeader = Object.values(colMap).some((c) => c);
      if (!hasAnyHeader || data.length === 0) {
        return {};
      }

      const out: Partial<
        Pick<
          LiquidationResumen,
          'seguridad_social' | 'maquinaria_aseo' | 'casino' | 'prestamos' | 'otros'
        >
      > = {};

      const readRow = (row: Record<string, unknown>) => {
        (['seguridad_social', 'maquinaria_aseo', 'casino', 'prestamos', 'otros'] as const).forEach(
          (k) => {
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
      headers: string[],
      base: Partial<
        Pick<
          LiquidationResumen,
          | 'seguridad_social'
          | 'maquinaria_aseo'
          | 'casino'
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
        | 'prestamos'
        | 'otros'
      >
    > {
      type RK =
        | 'seguridad_social'
        | 'maquinaria_aseo'
        | 'casino'
        | 'prestamos'
        | 'otros';
      const out: Partial<Pick<LiquidationResumen, RK>> = { ...base };
      const colMap = this.mapResumenColumnKeys(headers);
      const getNum = (k: RK) => Number(out[k] ?? 0);

      for (const row of data) {
        if (
          this.isSummaryOrDiscountRow(row, headers) &&
          this.rowHasResumenValues(row, colMap)
        ) {
          continue;
        }

        const cant = this.parseNumericCell(row['CANT']);
        const vru = this.parseNumericCell(row['VR UNITARIO']);
        if (vru <= 0) continue;

        const ref = String(row['REF'] ?? '').trim();
        const blob = [ref, row['ITEM'], row['DESCRIPCION'], row['OBSERVACIONES']]
          .map((x) => String(x ?? '').trim())
          .filter(Boolean)
          .join(' ');

        const key = this.classifyDiscountLabel(blob);
        if (!key) continue;

        const refU = this.stripAccents(ref).toUpperCase();
        const blobU = this.stripAccents(blob).toUpperCase();
        const discountContext =
          !this.isStringNotEmpty(ref) ||
          /DESCUENT|ZONA\s+DE\s+DESC|ZONA\s+DESC|DCTO|DTO|TOTAL\s+DESC|RESUMEN|\bNETO\b/i.test(
            `${refU} ${blobU}`
          );

        const fullItem =
          this.isStringNotEmpty(row['REF']) &&
          this.isStringNotEmpty(row['ITEM']) &&
          this.isStringNotEmpty(row['DESCRIPCION']) &&
          cant > 0;

        if (fullItem && !discountContext) {
          continue;
        }

        if (getNum(key) > 0) continue;

        out[key] = cant > 0 ? cant * vru : vru;
      }

      return out;
    }

    private classifyDiscountLabel(
      blobRaw: string
    ):
      | 'seguridad_social'
      | 'maquinaria_aseo'
      | 'casino'
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
      return !!(
        this.isStringNotEmpty(item.ref) &&
        this.isStringNotEmpty(item.no_orden) &&
        this.isStringNotEmpty(item.no_contrato) &&
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
      this.empresaSelectedId = null;
      this.userSelected = null;
      this.selectedExcelFileName = '';
      this.items = [];
      this.resumen = {
        subtotal: 0,
        seguridad_social: 0,
        maquinaria_aseo: 0,
        casino: 0,
        prestamos: 0,
        otros: 0,
        total: 0
      };
    }

    calculateSubtotal(): void {
      this.resumen.subtotal = this.items.reduce(
        (acc, item) => acc + (item.vr_total || 0), 0
      );
      this.calculateTotal();
    }

    calculateTotal(): void {
      this.resumen.total =
        this.resumen.subtotal -
        (+this.resumen.seguridad_social || 0) -
        (+this.resumen.maquinaria_aseo || 0) -
        (+this.resumen.casino || 0) -
        (+this.resumen.prestamos || 0) -
        (+this.resumen.otros || 0);
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
      const payload: LiquidationPayload = {
        consecutivo: this.consecutivo.trim(),
        nombre_corte: this.nombreCorte.trim(),
      tipo_corte: this.tipoCorte.trim(),
        empresa_asociada_id: this.empresaSelectedId,
        encargado_id: this.userSelected,
        observaciones: this.observaciones?.trim() || '',
        resumen: this.resumen,
        items: validItems
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
          const errorMessage = err?.error?.message || err?.message || 'Error al crear la liquidación';
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