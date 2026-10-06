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
  InvCategoriaAdmin,
  InvMaterialAdmin,
} from '../../shared/interfaces/administracion.interface';

type Estado = 'ACTIVO' | 'INACTIVO';

const PATRON_CUENTA = /^[0-9]{6,10}$/;

@Component({
  selector: 'app-inventarios-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
  ],
  templateUrl: './inventarios-admin.component.html',
  styleUrls: ['./inventarios-admin.component.scss'],
})
export class InventariosAdminComponent implements OnInit {
  categoriasActivas: InvCategoriaAdmin[] = [];
  categoriasInactivas: InvCategoriaAdmin[] = [];
  materialesActivos: InvMaterialAdmin[] = [];
  materialesInactivos: InvMaterialAdmin[] = [];

  loadingCategorias = false;
  loadingMateriales = false;
  savingCategoria = false;
  savingMaterial = false;

  nuevaCategoriaNombre = '';

  nuevoMaterialCategoriaId: number | null = null;
  nuevoMaterialCodigo = '';
  nuevoMaterialDescripcion = '';

  filtroCategoriaId: number | null = null;
  filtroTexto = '';

  editCategoriaId: number | null = null;
  editCategoriaNombre = '';

  editMaterialId: number | null = null;
  editMaterialCategoriaId: number | null = null;
  editMaterialDescripcion = '';

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
    return this.categoriasActivas.map((c) => ({ label: c.nombre, value: c.id_categoria }));
  }

  private filtrar(lista: InvMaterialAdmin[]): InvMaterialAdmin[] {
    const texto = this.filtroTexto.trim().toUpperCase();
    return lista.filter(
      (m) =>
        (!this.filtroCategoriaId || m.id_categoria === this.filtroCategoriaId) &&
        (!texto || m.codigo.includes(texto) || m.descripcion.toUpperCase().includes(texto))
    );
  }

  get materialesActivosFiltrados(): InvMaterialAdmin[] {
    return this.filtrar(this.materialesActivos);
  }

  get materialesInactivosFiltrados(): InvMaterialAdmin[] {
    return this.filtrar(this.materialesInactivos);
  }

  limpiarFiltros(): void {
    this.filtroCategoriaId = null;
    this.filtroTexto = '';
  }

  cargarTodo(): void {
    this.cargarCategorias();
    this.cargarMateriales();
  }

  cargarCategorias(): void {
    this.loadingCategorias = true;
    this.administracionService.listarInvCategorias('ACTIVO').subscribe({
      next: (res) => {
        this.categoriasActivas = res.data || [];
        this.loadingCategorias = false;
      },
      error: (err) => {
        this.loadingCategorias = false;
        this.categoriasActivas = [];
        Swal.fire('Error', err?.error?.mensaje || 'No se pudieron cargar las categorías.', 'error');
      },
    });

    this.administracionService.listarInvCategorias('INACTIVO').subscribe({
      next: (res) => (this.categoriasInactivas = res.data || []),
      error: () => (this.categoriasInactivas = []),
    });
  }

  cargarMateriales(): void {
    this.loadingMateriales = true;
    this.administracionService.listarInvMateriales({ estado: 'ACTIVO' }).subscribe({
      next: (res) => {
        this.materialesActivos = res.data || [];
        this.loadingMateriales = false;
      },
      error: (err) => {
        this.loadingMateriales = false;
        this.materialesActivos = [];
        Swal.fire('Error', err?.error?.mensaje || 'No se pudieron cargar los códigos.', 'error');
      },
    });

    this.administracionService.listarInvMateriales({ estado: 'INACTIVO' }).subscribe({
      next: (res) => (this.materialesInactivos = res.data || []),
      error: () => (this.materialesInactivos = []),
    });
  }

  /* ---------- Categorías ---------- */

  crearCategoria(): void {
    const nombre = this.nuevaCategoriaNombre.trim();
    if (!nombre) {
      Swal.fire('Atención', 'Ingrese el nombre de la categoría.', 'warning');
      return;
    }
    this.savingCategoria = true;
    this.administracionService.crearInvCategoria({ nombre }).subscribe({
      next: (res) => {
        this.savingCategoria = false;
        Swal.fire('Éxito', res.mensaje, 'success');
        this.nuevaCategoriaNombre = '';
        this.cargarCategorias();
      },
      error: (err) => {
        this.savingCategoria = false;
        Swal.fire('Error', err?.error?.mensaje || 'No se pudo crear la categoría.', 'error');
      },
    });
  }

  iniciarEdicionCategoria(row: InvCategoriaAdmin): void {
    this.editCategoriaId = row.id_categoria;
    this.editCategoriaNombre = row.nombre;
  }

  cancelarEdicionCategoria(): void {
    this.editCategoriaId = null;
    this.editCategoriaNombre = '';
  }

  guardarEdicionCategoria(): void {
    if (!this.editCategoriaId) return;
    const nombre = this.editCategoriaNombre.trim();
    if (!nombre) {
      Swal.fire('Atención', 'El nombre es obligatorio.', 'warning');
      return;
    }
    this.administracionService.actualizarInvCategoria(this.editCategoriaId, { nombre }).subscribe({
      next: (res) => {
        Swal.fire('Éxito', res.mensaje, 'success');
        this.cancelarEdicionCategoria();
        this.cargarTodo();
      },
      error: (err) => {
        Swal.fire('Error', err?.error?.mensaje || 'No se pudo actualizar la categoría.', 'error');
      },
    });
  }

  cambiarEstadoCategoria(row: InvCategoriaAdmin, estado: Estado): void {
    const esInactivar = estado === 'INACTIVO';
    Swal.fire({
      title: esInactivar ? '¿Inactivar categoría?' : '¿Reactivar categoría?',
      text: esInactivar
        ? `Se inactivará "${row.nombre}" y sus códigos dejarán de aparecer al ingresar material.`
        : `Se reactivará "${row.nombre}" con sus códigos activos.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: esInactivar ? 'Sí, inactivar' : 'Sí, reactivar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.administracionService.cambiarEstadoInvCategoria(row.id_categoria, estado).subscribe({
        next: (res) => {
          Swal.fire('Actualizado', res.mensaje, 'success');
          if (this.filtroCategoriaId === row.id_categoria && esInactivar) this.filtroCategoriaId = null;
          this.cargarTodo();
        },
        error: (err) => {
          Swal.fire('Error', err?.error?.mensaje || 'No se pudo cambiar el estado.', 'error');
        },
      });
    });
  }

  /* ---------- Códigos ---------- */

  soloDigitos(): void {
    this.nuevoMaterialCodigo = this.nuevoMaterialCodigo.replace(/\D/g, '').slice(0, 10);
  }

  crearMaterial(): void {
    if (!this.nuevoMaterialCategoriaId) {
      Swal.fire('Atención', 'Seleccione una categoría.', 'warning');
      return;
    }
    const codigo = this.nuevoMaterialCodigo.trim();
    if (!PATRON_CUENTA.test(codigo)) {
      Swal.fire('Atención', 'El número de cuenta debe tener solo dígitos (6 a 10).', 'warning');
      return;
    }
    const descripcion = this.nuevoMaterialDescripcion.trim();
    if (!descripcion) {
      Swal.fire('Atención', 'Ingrese la descripción.', 'warning');
      return;
    }
    this.savingMaterial = true;
    this.administracionService
      .crearInvMaterial({ id_categoria: this.nuevoMaterialCategoriaId, codigo, descripcion })
      .subscribe({
        next: (res) => {
          this.savingMaterial = false;
          Swal.fire('Éxito', res.mensaje, 'success');
          this.nuevoMaterialCodigo = '';
          this.nuevoMaterialDescripcion = '';
          this.cargarTodo();
        },
        error: (err) => {
          this.savingMaterial = false;
          Swal.fire('Error', err?.error?.mensaje || 'No se pudo crear el código.', 'error');
        },
      });
  }

  iniciarEdicionMaterial(row: InvMaterialAdmin): void {
    this.editMaterialId = row.id_material;
    this.editMaterialCategoriaId = row.id_categoria;
    this.editMaterialDescripcion = row.descripcion;
  }

  cancelarEdicionMaterial(): void {
    this.editMaterialId = null;
    this.editMaterialCategoriaId = null;
    this.editMaterialDescripcion = '';
  }

  guardarEdicionMaterial(): void {
    if (!this.editMaterialId) return;
    const descripcion = this.editMaterialDescripcion.trim();
    if (!this.editMaterialCategoriaId || !descripcion) {
      Swal.fire('Atención', 'Categoría y descripción son obligatorias.', 'warning');
      return;
    }
    this.administracionService
      .actualizarInvMaterial(this.editMaterialId, {
        id_categoria: this.editMaterialCategoriaId,
        descripcion,
      })
      .subscribe({
        next: (res) => {
          Swal.fire('Éxito', res.mensaje, 'success');
          this.cancelarEdicionMaterial();
          this.cargarTodo();
        },
        error: (err) => {
          Swal.fire('Error', err?.error?.mensaje || 'No se pudo actualizar el código.', 'error');
        },
      });
  }

  cambiarEstadoMaterial(row: InvMaterialAdmin, estado: Estado): void {
    const esInactivar = estado === 'INACTIVO';
    Swal.fire({
      title: esInactivar ? '¿Inactivar código?' : '¿Reactivar código?',
      text: `${row.codigo} — ${row.descripcion}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: esInactivar ? 'Sí, inactivar' : 'Sí, reactivar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.administracionService.cambiarEstadoInvMaterial(row.id_material, estado).subscribe({
        next: (res) => {
          Swal.fire('Actualizado', res.mensaje, 'success');
          this.cargarTodo();
        },
        error: (err) => {
          Swal.fire('Error', err?.error?.mensaje || 'No se pudo cambiar el estado.', 'error');
        },
      });
    });
  }
}
