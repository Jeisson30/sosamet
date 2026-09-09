import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import Swal from 'sweetalert2';

import { AdministracionService } from '../../shared/service/administracion.service';
import {
  InsumoAdmin,
  InsumoCategoriaAdmin,
} from '../../shared/interfaces/administracion.interface';

@Component({
  selector: 'app-insumos-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
  ],
  templateUrl: './insumos-admin.component.html',
  styleUrls: ['./insumos-admin.component.scss'],
})
export class InsumosAdminComponent implements OnInit {
  categoriasActivas: InsumoCategoriaAdmin[] = [];
  categoriasInactivas: InsumoCategoriaAdmin[] = [];
  insumosActivos: InsumoAdmin[] = [];
  insumosInactivos: InsumoAdmin[] = [];

  loadingCategorias = false;
  loadingInsumos = false;
  savingCategoria = false;
  savingInsumo = false;

  nuevaCategoriaNombre = '';
  nuevaCategoriaPrefijo = '';

  nuevoInsumoCategoriaId: number | null = null;
  nuevoInsumoCodigo = '';
  nuevoInsumoNombre = '';

  filtroCategoriaId: number | null = null;

  editInsumoId: number | null = null;
  editInsumoCodigo = '';
  editInsumoNombre = '';

  rowsPerPage = 10;
  rowsPerPageOptions = [10, 25, 50];

  constructor(
    private administracionService: AdministracionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarTodo();
  }

  volver(): void {
    this.router.navigate(['/dashboard/administracion']);
  }

  get categoriaOptions() {
    return this.categoriasActivas.map((c) => ({
      label: this.formatCategoriaLabel(c),
      value: c.id_categoria,
    }));
  }

  private formatCategoriaLabel(c: InsumoCategoriaAdmin): string {
    const name = String(c.nombre ?? '').trim();
    if (String(c.prefijo).toUpperCase() === 'CP' || /^insumo\s+concepto$/i.test(name)) {
      return `${c.prefijo} — INSUMO`;
    }
    return `${c.prefijo} — ${name}`;
  }

  cargarTodo(): void {
    this.cargarCategorias();
    this.cargarInsumos();
  }

  cargarCategorias(): void {
    this.loadingCategorias = true;
    this.administracionService.listarInsumoCategorias('ACTIVO').subscribe({
      next: (res) => {
        this.categoriasActivas = res.data || [];
        this.loadingCategorias = false;
      },
      error: (err) => {
        this.loadingCategorias = false;
        this.categoriasActivas = [];
        Swal.fire(
          'Error',
          err?.error?.mensaje || 'No se pudieron cargar categorías activas.',
          'error'
        );
      },
    });

    this.administracionService.listarInsumoCategorias('INACTIVO').subscribe({
      next: (res) => {
        this.categoriasInactivas = res.data || [];
      },
      error: () => {
        this.categoriasInactivas = [];
      },
    });
  }

  cargarInsumos(): void {
    this.loadingInsumos = true;
    const filtro = this.filtroCategoriaId || null;

    this.administracionService
      .listarInsumosAdmin({ estado: 'ACTIVO', id_categoria: filtro })
      .subscribe({
        next: (res) => {
          this.insumosActivos = res.data || [];
          this.loadingInsumos = false;
        },
        error: (err) => {
          this.loadingInsumos = false;
          this.insumosActivos = [];
          Swal.fire(
            'Error',
            err?.error?.mensaje || 'No se pudieron cargar insumos activos.',
            'error'
          );
        },
      });

    this.administracionService
      .listarInsumosAdmin({ estado: 'INACTIVO', id_categoria: filtro })
      .subscribe({
        next: (res) => {
          this.insumosInactivos = res.data || [];
        },
        error: () => {
          this.insumosInactivos = [];
        },
      });
  }

  onFiltroCategoriaChange(): void {
    this.cargarInsumos();
  }

  crearCategoria(): void {
    const nombre = this.nuevaCategoriaNombre.trim();
    const prefijo = this.nuevaCategoriaPrefijo.trim().toUpperCase();
    if (!nombre || !prefijo) {
      Swal.fire('Atención', 'Complete nombre y prefijo (2 letras).', 'warning');
      return;
    }
    this.savingCategoria = true;
    this.administracionService
      .crearInsumoCategoria({ nombre, prefijo })
      .subscribe({
        next: (res) => {
          this.savingCategoria = false;
          Swal.fire('Éxito', res.mensaje, 'success');
          this.nuevaCategoriaNombre = '';
          this.nuevaCategoriaPrefijo = '';
          this.cargarCategorias();
        },
        error: (err) => {
          this.savingCategoria = false;
          Swal.fire(
            'Error',
            err?.error?.mensaje || 'No se pudo crear la categoría.',
            'error'
          );
        },
      });
  }

  onCategoriaInsumoChange(): void {
    if (!this.nuevoInsumoCategoriaId) {
      this.nuevoInsumoCodigo = '';
      return;
    }
    this.administracionService
      .siguienteCodigoInsumo(this.nuevoInsumoCategoriaId)
      .subscribe({
        next: (res) => {
          this.nuevoInsumoCodigo = res.data?.siguiente_codigo || '';
        },
        error: () => {
          this.nuevoInsumoCodigo = '';
        },
      });
  }

  crearInsumo(): void {
    if (!this.nuevoInsumoCategoriaId) {
      Swal.fire('Atención', 'Seleccione una categoría.', 'warning');
      return;
    }
    const nombre = this.nuevoInsumoNombre.trim();
    if (!nombre) {
      Swal.fire('Atención', 'Ingrese el nombre del insumo.', 'warning');
      return;
    }
    this.savingInsumo = true;
    this.administracionService
      .crearInsumoAdmin({
        id_categoria: this.nuevoInsumoCategoriaId,
        nombre,
        codigo: this.nuevoInsumoCodigo.trim() || null,
      })
      .subscribe({
        next: (res) => {
          this.savingInsumo = false;
          Swal.fire('Éxito', res.mensaje, 'success');
          this.nuevoInsumoNombre = '';
          this.onCategoriaInsumoChange();
          this.cargarInsumos();
        },
        error: (err) => {
          this.savingInsumo = false;
          Swal.fire(
            'Error',
            err?.error?.mensaje || 'No se pudo crear el insumo.',
            'error'
          );
        },
      });
  }

  iniciarEdicionInsumo(row: InsumoAdmin): void {
    this.editInsumoId = row.id_insumo;
    this.editInsumoCodigo = row.codigo;
    this.editInsumoNombre = row.nombre;
  }

  cancelarEdicionInsumo(): void {
    this.editInsumoId = null;
    this.editInsumoCodigo = '';
    this.editInsumoNombre = '';
  }

  guardarEdicionInsumo(): void {
    if (!this.editInsumoId) return;
    const nombre = this.editInsumoNombre.trim();
    const codigo = this.editInsumoCodigo.trim().toUpperCase();
    if (!nombre || !codigo) {
      Swal.fire('Atención', 'Código y nombre son obligatorios.', 'warning');
      return;
    }
    this.administracionService
      .actualizarInsumoAdmin(this.editInsumoId, { nombre, codigo })
      .subscribe({
        next: (res) => {
          Swal.fire('Éxito', res.mensaje, 'success');
          this.cancelarEdicionInsumo();
          this.cargarInsumos();
        },
        error: (err) => {
          Swal.fire(
            'Error',
            err?.error?.mensaje || 'No se pudo actualizar el insumo.',
            'error'
          );
        },
      });
  }

  cambiarEstadoCategoria(
    row: InsumoCategoriaAdmin,
    estado: 'ACTIVO' | 'INACTIVO'
  ): void {
    const esInactivar = estado === 'INACTIVO';
    Swal.fire({
      title: esInactivar ? '¿Inactivar categoría?' : '¿Reactivar categoría?',
      text: esInactivar
        ? `Se inactivará "${row.nombre}" y sus insumos dejarán de aparecer en los selects.`
        : `Se reactivará "${row.nombre}". Los insumos deben reactivarse uno a uno si aplica.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: esInactivar ? 'Sí, inactivar' : 'Sí, reactivar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.administracionService
        .cambiarEstadoInsumoCategoria(row.id_categoria, estado)
        .subscribe({
          next: (res) => {
            Swal.fire('Actualizado', res.mensaje, 'success');
            this.cargarTodo();
          },
          error: (err) => {
            Swal.fire(
              'Error',
              err?.error?.mensaje || 'No se pudo cambiar el estado.',
              'error'
            );
          },
        });
    });
  }

  cambiarEstadoInsumo(row: InsumoAdmin, estado: 'ACTIVO' | 'INACTIVO'): void {
    const esInactivar = estado === 'INACTIVO';
    Swal.fire({
      title: esInactivar ? '¿Inactivar insumo?' : '¿Reactivar insumo?',
      text: `${row.codigo} — ${row.nombre}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: esInactivar ? 'Sí, inactivar' : 'Sí, reactivar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.administracionService
        .cambiarEstadoInsumoAdmin(row.id_insumo, estado)
        .subscribe({
          next: (res) => {
            Swal.fire('Actualizado', res.mensaje, 'success');
            this.cargarInsumos();
          },
          error: (err) => {
            Swal.fire(
              'Error',
              err?.error?.mensaje || 'No se pudo cambiar el estado.',
              'error'
            );
          },
        });
    });
  }

  formatDate(value?: string | null): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('es-CO');
  }
}
