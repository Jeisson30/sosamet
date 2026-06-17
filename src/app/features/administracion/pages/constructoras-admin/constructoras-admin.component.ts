import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import Swal from 'sweetalert2';

import { AdministracionService } from '../../shared/service/administracion.service';
import { ConstructoraAdmin } from '../../shared/interfaces/administracion.interface';

@Component({
  selector: 'app-constructoras-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
  ],
  templateUrl: './constructoras-admin.component.html',
  styleUrls: ['./constructoras-admin.component.scss'],
})
export class ConstructorasAdminComponent implements OnInit {
  constructorasActivas: ConstructoraAdmin[] = [];
  constructorasInactivas: ConstructoraAdmin[] = [];
  loadingActivas = false;
  loadingInactivas = false;
  saving = false;

  nombre = '';
  nit = '';

  rowsPerPage = 10;
  rowsPerPageOptions = [10, 25, 50];

  constructor(
    private administracionService: AdministracionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarListas();
  }

  volver(): void {
    this.router.navigate(['/dashboard/administracion']);
  }

  cargarListas(): void {
    this.cargarConstructorasActivas();
    this.cargarConstructorasInactivas();
  }

  cargarConstructorasActivas(): void {
    this.loadingActivas = true;
    this.administracionService.listarConstructoras('ACTIVO').subscribe({
      next: (res) => {
        this.constructorasActivas = res.data || [];
        this.loadingActivas = false;
      },
      error: (err) => {
        this.loadingActivas = false;
        this.constructorasActivas = [];
        Swal.fire(
          'Error',
          err?.error?.mensaje || 'No se pudieron cargar las constructoras activas.',
          'error'
        );
      },
    });
  }

  cargarConstructorasInactivas(): void {
    this.loadingInactivas = true;
    this.administracionService.listarConstructoras('INACTIVO').subscribe({
      next: (res) => {
        this.constructorasInactivas = res.data || [];
        this.loadingInactivas = false;
      },
      error: (err) => {
        this.loadingInactivas = false;
        this.constructorasInactivas = [];
        Swal.fire(
          'Error',
          err?.error?.mensaje || 'No se pudieron cargar las constructoras inactivas.',
          'error'
        );
      },
    });
  }

  crearConstructora(): void {
    const nombre = this.nombre.trim();
    const nit = this.nit.trim();

    if (!nombre || !nit) {
      Swal.fire('Atención', 'Complete nombre y NIT.', 'warning');
      return;
    }

    this.saving = true;
    this.administracionService.crearConstructora({ nombre, nit }).subscribe({
      next: (res) => {
        this.saving = false;
        Swal.fire('Éxito', res.mensaje, 'success');
        this.nombre = '';
        this.nit = '';
        this.cargarListas();
      },
      error: (err) => {
        this.saving = false;
        Swal.fire(
          'Error',
          err?.error?.mensaje || 'No se pudo crear la constructora.',
          'error'
        );
      },
    });
  }

  cambiarEstadoConstructora(
    row: ConstructoraAdmin,
    estado: 'ACTIVO' | 'INACTIVO'
  ): void {
    const esInactivar = estado === 'INACTIVO';

    Swal.fire({
      title: esInactivar ? '¿Inactivar constructora?' : '¿Reactivar constructora?',
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
        .cambiarEstadoConstructora(row.id_constructora, estado)
        .subscribe({
          next: (res) => {
            Swal.fire('Actualizado', res.mensaje, 'success');
            this.cargarListas();
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
}
