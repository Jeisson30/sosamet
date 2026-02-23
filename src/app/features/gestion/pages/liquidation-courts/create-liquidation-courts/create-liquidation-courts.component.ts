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
    observaciones: string = '';

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

    const reader = new FileReader();

    reader.onload = (e: any) => {

      const workbook = XLSX.read(e.target.result, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (!rawData.length) return;

      const headers = rawData[0].map((h: any) =>
        String(h).trim().toUpperCase()
      );

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

      const missingColumns = expectedColumns.filter(
        col => !headers.includes(col)
      );

      if (missingColumns.length > 0) {
        Swal.fire({
          title: 'Columnas faltantes',
          text: `Faltan las columnas: ${missingColumns.join(', ')}`,
          icon: 'warning',
          confirmButtonColor: '#00517b',
          allowOutsideClick: false,
        });
        return;
      }

      const rows = rawData.slice(1);

      // Mapear filas a objetos
      const data = rows.map((row: any[]) => {
        const obj: any = {};
        headers.forEach((header: string, index: number) => {
          obj[header] = row[index];
        });
        return obj;
      });

      // Filtrar filas vacías (que no tengan datos significativos)
      // Una fila se considera vacía si todos los campos importantes están vacíos
      const dataWithContent = data.filter((row: any) => {
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
      this.items = dataWithContent.map((row: any): LiquidationItem => ({
        ref: row['REF'] || '',
        no_orden: row['NO. ORDEN'] || '',
        no_contrato: row['NO. CONTRATO'] || '',
        obra: row['OBRA'] || '',
        item: row['ITEM'] || '',
        descripcion: row['DESCRIPCION'] || '',
        cantidad: +row['CANT'] || 0,
        um: row['UM'] || '',
        ancho: +row['ANCHO'] || 0,
        alto: +row['ALTO'] || 0,
        observaciones: row['OBSERVACIONES'] || '',
        vr_unitario: +row['VR UNITARIO'] || 0,
        vr_total: (+row['CANT'] || 0) * (+row['VR UNITARIO'] || 0)
      }));

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
      this.observaciones = '';
      this.empresaSelectedId = null;
      this.userSelected = null;
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