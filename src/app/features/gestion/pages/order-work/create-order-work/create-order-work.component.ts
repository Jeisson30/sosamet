  import { Component, OnDestroy, OnInit } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { FormsModule } from '@angular/forms';
  import { InputTextModule } from 'primeng/inputtext';
  import { CalendarModule } from 'primeng/calendar';
  import { DropdownModule } from 'primeng/dropdown';
  import { ButtonModule } from 'primeng/button';
  import { InputTextarea } from 'primeng/inputtextarea';
  import { FloatLabelModule } from 'primeng/floatlabel';
  import { GestionService } from '../../../shared/service/gestion.service';
  import { Company, GestionUser, OrderWorkItem, OrderWorkPayload } from '../../../shared/interfaces/Response.interface';
  import * as XLSX from 'xlsx';
  import Swal from 'sweetalert2';
  import { Subscription } from 'rxjs';

  @Component({
    selector: 'app-create-order-work',
    standalone: true,
    imports: [
      CommonModule,
      FormsModule,
      InputTextModule,
      CalendarModule,
      DropdownModule,
      ButtonModule,
      InputTextarea,
      FloatLabelModule,
    ],
    templateUrl: './create-order-work.component.html',
    styleUrls: ['./create-order-work.component.scss'],
  })
  export class CreateOrderWorkComponent implements OnInit, OnDestroy {
    consecutivo: string = '';
    fechaEntrega: Date | null = null;
    observaciones: string = '';

    companies: Company[] = [];
    workUsers: GestionUser[] = [];
    userSelected: number | null = null;
    empresaSelectedId: number | null = null;

    items: OrderWorkItem[] = [];

    loading: boolean = false;
    loadingCompanies: boolean = false;
    loadingUsers: boolean = false;

    private subscriptions: Subscription = new Subscription();

    constructor(
      private gestionService: GestionService
    ) {}

    ngOnInit(): void {
      this.addItemRow();
      this.loadCompanies();
      this.getAllUsers();
    }

    ngOnDestroy(): void {
      this.subscriptions.unsubscribe();
    }

    addItemRow(): void {
      const newItem: OrderWorkItem = {
        ref: '',
        no_contrato: '',
        obra: '',
        item: '',
        descripcion: '',
        cantidad: 0,
        um: '',
        ancho: 0,
        alto: 0,
        observaciones: '',
      };
      this.items.push(newItem);
    }

    removeItemRow(index: number): void {
      if (index >= 0 && index < this.items.length) {
        this.items.splice(index, 1);
      }
    }

    trackByIndex(index: number): number {
      return index;
    }

    loadCompanies(): void {
      this.loadingCompanies = true;
      const sub = this.gestionService.getCompanies().subscribe({
        next: (res: Company[]) => {
          this.companies = res;
          this.loadingCompanies = false;
        },
        error: (err) => {
          console.error('Error al obtener empresas:', err);
          this.loadingCompanies = false;
          Swal.fire({
            title: 'Error',
            text: 'Error al obtener las empresas. Por favor, intente nuevamente.',
            icon: 'error',
            confirmButtonColor: '#00517b',
            allowOutsideClick: false,
          });
        },
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
          console.error('Error al obtener usuarios:', err);
          this.loadingUsers = false;
          Swal.fire({
            title: 'Error',
            text: 'Error al obtener los usuarios. Por favor, intente nuevamente.',
            icon: 'error',
            confirmButtonColor: '#00517b',
            allowOutsideClick: false,
          });
        },
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
          'NO. CONTRATO',
          'OBRA',
          'ITEM',
          'DESCRIPCION',
          'CANT',
          'UM',
          'ANCHO',
          'ALTO',
          'OBSERVACIONES',
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

        const data = rows.map((row: any[]) => {
          const obj: any = {};
          headers.forEach((header: string, index: number) => {
            obj[header] = row[index];
          });
          return obj;
        });

        // Filtrar filas sin datos significativos
        const dataWithContent = data.filter((row: any) => {
          const criticalFields = ['REF', 'ITEM', 'DESCRIPCION', 'CANT'];

          const hasCriticalData = criticalFields.some((col: string) => {
            const value = row[col];
            if (value === null || value === undefined) return false;
            if (typeof value === 'string') {
              return value.trim().length > 0;
            }
            if (typeof value === 'number') {
              return value > 0;
            }
            return true;
          });

          if (hasCriticalData) return true;

          return expectedColumns.some((col: string) => {
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

        this.items = dataWithContent.map((row: any): OrderWorkItem => ({
          ref: row['REF'] || '',
          no_contrato: row['NO. CONTRATO'] || '',
          obra: row['OBRA'] || '',
          item: row['ITEM'] || '',
          descripcion: row['DESCRIPCION'] || '',
          cantidad: +row['CANT'] || 0,
          um: row['UM'] || '',
          ancho: +row['ANCHO'] || 0,
          alto: +row['ALTO'] || 0,
          observaciones: row['OBSERVACIONES'] || '',
        }));

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

    private isStringNotEmpty(value: any): boolean {
      if (value === null || value === undefined) return false;
      const str = String(value).trim();
      return str.length > 0;
    }

    private isValidItem(item: OrderWorkItem): boolean {
      return !!(
        this.isStringNotEmpty(item.ref) &&
        this.isStringNotEmpty(item.no_contrato) &&
        this.isStringNotEmpty(item.obra) &&
        this.isStringNotEmpty(item.item) &&
        this.isStringNotEmpty(item.descripcion) &&
        item.cantidad > 0 &&
        this.isStringNotEmpty(item.um)
      );
    }

    private getValidItems(): OrderWorkItem[] {
      return this.items.filter(item => this.isValidItem(item));
    }

    guardarOrden(): void {
      if (!this.isStringNotEmpty(this.consecutivo)) {
        Swal.fire({
          title: 'Validación',
          text: 'El campo Consecutivo es obligatorio',
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

      if (!this.fechaEntrega) {
        Swal.fire({
          title: 'Validación',
          text: 'Debe seleccionar una fecha de entrega',
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

      const validItems = this.getValidItems();
      const invalidItemsCount = this.items.length - validItems.length;

      if (validItems.length === 0) {
        Swal.fire({
          title: 'Validación',
          text: 'Debe agregar al menos un item con todos los campos requeridos (Ref, No. Contrato, Obra, Item, Descripción, Cantidad > 0, UM)',
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
            this.saveOrderWork(validItems);
          }
        });
        return;
      }

      this.saveOrderWork(validItems);
    }

    private saveOrderWork(validItems: OrderWorkItem[]): void {
      const payload: OrderWorkPayload = {
        consecutivo: this.consecutivo.trim(),
        empresa_asociada_id: this.empresaSelectedId,
        encargado_id: this.userSelected,
        fecha_entrega: this.fechaEntrega,
        observaciones: this.observaciones?.trim() || '',
        items: validItems,
      };

      this.loading = true;
      const sub = this.gestionService.createOrderWork(payload).subscribe({
        next: () => {
          this.loading = false;
          Swal.fire({
            title: 'Éxito',
            text: '¡Orden de trabajo creada correctamente!',
            icon: 'success',
            confirmButtonColor: '#00517b',
            allowOutsideClick: false,
          });
          console.log('Orden de trabajo creada correctamente', JSON.stringify(payload))
          
          this.resetForm();
        },
        error: (err) => {
          this.loading = false;
          const errorMessage = err?.error?.message || err?.message || 'Error al crear la orden de trabajo';
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

    resetForm(): void {
      this.consecutivo = '';
      this.fechaEntrega = null; 
      this.observaciones = '';
      this.empresaSelectedId = null;
      this.userSelected = null;
      this.items = [];
      this.addItemRow();
    }

    onAdjuntarActa(): void {
      console.log('Adjuntar Acta de Medida');
    }

    onAdjuntarPlano(): void {
      console.log('Adjuntar Plano');
    }
  }
