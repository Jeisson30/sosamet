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
  ConstructoraAdmin,
  ProyectoAdmin,
} from '../../shared/interfaces/administracion.interface';

@Component({
  selector: 'app-proyectos-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
  ],
  templateUrl: './proyectos-admin.component.html',
  styleUrls: ['./proyectos-admin.component.scss'],
})
export class ProyectosAdminComponent implements OnInit {
  constructoras: ConstructoraAdmin[] = [];
  constructorasOptions: { label: string; value: number }[] = [];
  selectedConstructoraId: number | null = null;

  proyectosActivos: ProyectoAdmin[] = [];
  proyectosInactivos: ProyectoAdmin[] = [];
  loadingConstructoras = false;
  loadingProyectosActivos = false;
  loadingProyectosInactivos = false;
  saving = false;

  nombreProyecto = '';

  rowsPerPage = 10;
  rowsPerPageOptions = [10, 25, 50];

  constructor(
    private administracionService: AdministracionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarConstructoras();
  }

  volver(): void {
    this.router.navigate(['/dashboard/administracion']);
  }

  cargarConstructoras(): void {
    this.loadingConstructoras = true;
    this.administracionService.listarConstructoras('ACTIVO').subscribe({
      next: (res) => {
        this.constructoras = res.data || [];
        this.constructorasOptions = this.constructoras.map((c) => ({
          label: c.nombre,
          value: c.id_constructora,
        }));
        this.loadingConstructoras = false;

        if (
          this.selectedConstructoraId &&
          !this.constructorasOptions.some(
            (c) => c.value === this.selectedConstructoraId
          )
        ) {
          this.selectedConstructoraId = null;
          this.proyectosActivos = [];
          this.proyectosInactivos = [];
        }
      },
      error: (err) => {
        this.loadingConstructoras = false;
        this.constructoras = [];
        this.constructorasOptions = [];
        Swal.fire(
          'Error',
          err?.error?.mensaje || 'No se pudieron cargar las constructoras.',
          'error'
        );
      },
    });
  }

  onConstructoraChange(): void {
    if (!this.selectedConstructoraId) {
      this.proyectosActivos = [];
      this.proyectosInactivos = [];
      return;
    }
    this.cargarProyectos();
  }

  cargarProyectos(): void {
    if (!this.selectedConstructoraId) {
      Swal.fire('Atención', 'Seleccione una constructora activa.', 'warning');
      return;
    }

    this.cargarProyectosActivos();
    this.cargarProyectosInactivos();
  }

  cargarProyectosActivos(): void {
    if (!this.selectedConstructoraId) return;

    this.loadingProyectosActivos = true;
    this.administracionService
      .listarProyectos(this.selectedConstructoraId, 'ACTIVO')
      .subscribe({
        next: (res) => {
          this.proyectosActivos = res.data || [];
          this.loadingProyectosActivos = false;
        },
        error: (err) => {
          this.loadingProyectosActivos = false;
          this.proyectosActivos = [];
          Swal.fire(
            'Error',
            err?.error?.mensaje || 'No se pudieron cargar los proyectos activos.',
            'error'
          );
        },
      });
  }

  cargarProyectosInactivos(): void {
    if (!this.selectedConstructoraId) return;

    this.loadingProyectosInactivos = true;
    this.administracionService
      .listarProyectos(this.selectedConstructoraId, 'INACTIVO')
      .subscribe({
        next: (res) => {
          this.proyectosInactivos = res.data || [];
          this.loadingProyectosInactivos = false;
        },
        error: (err) => {
          this.loadingProyectosInactivos = false;
          this.proyectosInactivos = [];
          Swal.fire(
            'Error',
            err?.error?.mensaje || 'No se pudieron cargar los proyectos inactivos.',
            'error'
          );
        },
      });
  }

  crearProyecto(): void {
    const nombre = this.nombreProyecto.trim();

    if (!this.selectedConstructoraId) {
      Swal.fire('Atención', 'Seleccione una constructora activa.', 'warning');
      return;
    }

    if (!nombre) {
      Swal.fire('Atención', 'Ingrese el nombre del proyecto.', 'warning');
      return;
    }

    this.saving = true;
    this.administracionService
      .crearProyecto({
        id_constructora: this.selectedConstructoraId,
        nombre,
      })
      .subscribe({
        next: (res) => {
          this.saving = false;
          Swal.fire('Éxito', res.mensaje, 'success');
          this.nombreProyecto = '';
          this.cargarProyectos();
        },
        error: (err) => {
          this.saving = false;
          Swal.fire(
            'Error',
            err?.error?.mensaje || 'No se pudo crear el proyecto.',
            'error'
          );
        },
      });
  }

  cambiarEstadoProyecto(row: ProyectoAdmin, estado: 'ACTIVO' | 'INACTIVO'): void {
    const esInactivar = estado === 'INACTIVO';

    Swal.fire({
      title: esInactivar ? '¿Inactivar proyecto?' : '¿Reactivar proyecto?',
      text: esInactivar
        ? `Se inactivará "${row.nombre}" y dejará de aparecer en los selectores del sistema.`
        : `Se reactivará "${row.nombre}" y volverá a estar disponible en los selectores.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: esInactivar ? 'Sí, inactivar' : 'Sí, reactivar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.administracionService
        .cambiarEstadoProyecto(row.id_proyecto, estado)
        .subscribe({
          next: (res) => {
            Swal.fire('Actualizado', res.mensaje, 'success');
            this.cargarProyectos();
          },
          error: (err) => {
            Swal.fire(
              'Error',
              err?.error?.mensaje ||
                err?.error?.message ||
                err?.error?.errors?.[0]?.message ||
                'No se pudo actualizar el estado.',
              'error'
            );
          },
        });
    });
  }

  formatDate(value?: string): string {
    if (!value) return '';
    const d = new Date(value);
    return isNaN(d.getTime())
      ? String(value)
      : d.toLocaleDateString('es-CO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
  }

  getConstructoraNombre(idConstructora: number): string {
    return (
      this.constructoras.find((c) => c.id_constructora === idConstructora)
        ?.nombre || String(idConstructora)
    );
  }
}
