import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import Swal from 'sweetalert2';
import { UserService } from '../../shared/service/user.service';
import {
  UserResponse,
  getRoles,
} from '../../shared/interfaces/Response.interface';

interface CatalogActionTarget {
  id: number;
  nombre: string;
  apellido: string;
  identificacion: string;
  estado: string;
  perfil: string;
}

@Component({
  selector: 'app-catalog-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    DropdownModule,
    ButtonModule,
    TableModule,
    DialogModule,
    TooltipModule,
    MenuModule,
  ],
  templateUrl: './catalog-users.component.html',
  styleUrls: ['../users/users.component.scss', './catalog-users.component.scss'],
})
export class CatalogUsersComponent implements OnInit {
  @ViewChild('rowMenu') rowMenu?: Menu;

  private userService = inject(UserService);
  private router = inject(Router);

  nombre = '';
  apellidos = '';
  identificacion = '';
  rolSeleccionado: string | number | null = null;
  usuarios: UserResponse[] = [];
  roles: getRoles[] = [];
  loading = false;
  actionBusy = false;
  rowsPerPage = 10;
  rowsPerPageOptions = [5, 10, 20, 50];

  menuTarget: CatalogActionTarget | null = null;
  rowMenuItems: MenuItem[] = [];

  mostrarDialogoAcceso = false;
  usuarioPromoviendo: UserResponse | null = null;
  promoteTargetId: number | null = null;
  emailAcceso = '';

  ngOnInit(): void {
    this.getRoles();
  }

  goBack(): void {
    this.router.navigate(['/dashboard/users']);
  }

  getRoles(): void {
    this.userService.getRoles().subscribe({
      next: (data: getRoles[]) => {
        this.roles = data;
      },
      error: () => {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo consultar los roles.',
          icon: 'error',
          confirmButtonColor: '#d33',
        });
      },
    });
  }

  getDataUsers(): void {
    this.loading = true;
    this.userService.getDataUsersByMode('DIRECTORY').subscribe({
      next: (data: UserResponse[]) => {
        this.usuarios = data || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        Swal.fire({
          title: 'Error',
          text: 'No se pudo consultar los usuarios de catálogo.',
          icon: 'error',
          confirmButtonColor: '#d33',
        });
      },
    });
  }

  createUser(): void {
    if (
      !this.nombre ||
      !this.apellidos ||
      !this.identificacion ||
      !this.rolSeleccionado
    ) {
      Swal.fire({
        title: 'Alerta',
        text: 'Complete nombre, apellidos, identificación y perfil.',
        icon: 'warning',
        confirmButtonColor: '#00517b',
        allowOutsideClick: false,
      });
      return;
    }

    const payload = {
      p_identificacion: this.identificacion,
      p_nombre: this.nombre,
      p_apellido: this.apellidos,
      p_idperfil: this.rolSeleccionado.toString(),
      p_idrol: this.rolSeleccionado.toString(),
    };

    this.userService.createCatalogUser(payload).subscribe({
      next: (response: any) => {
        Swal.fire({
          title: 'Éxito',
          text: response?.message || 'Usuario de catálogo creado.',
          icon: 'success',
          confirmButtonColor: '#28a745',
        });
        this.clearFields();
        this.getDataUsers();
      },
      error: (error) => {
        Swal.fire({
          title: 'Error',
          text: error.error?.message || 'No se pudo crear el usuario de catálogo.',
          icon: 'error',
          confirmButtonColor: '#d33',
        });
      },
    });
  }

  openRowMenu(event: Event, usuario: UserResponse): void {
    event.preventDefault();
    event.stopPropagation();

    const target = this.toActionTarget(usuario);
    if (!target) {
      Swal.fire({
        title: 'Error',
        text: 'Este registro no tiene un identificador válido. No se puede continuar.',
        icon: 'error',
        confirmButtonColor: '#d33',
      });
      return;
    }

    this.menuTarget = target;
    const lockedId = target.id;

    this.rowMenuItems = [
      {
        label: 'Habilitar acceso',
        icon: 'pi pi-key',
        command: () => this.onMenuHabilitarAcceso(lockedId),
      },
      { separator: true },
      {
        label: 'Eliminar',
        icon: 'pi pi-trash',
        command: () => this.onMenuEliminar(lockedId),
      },
    ];
    this.rowMenu?.toggle(event);
  }

  private toActionTarget(usuario: UserResponse): CatalogActionTarget | null {
    const id = Number(usuario?.id_usuario);
    if (!Number.isFinite(id) || id <= 0) {
      return null;
    }
    return {
      id,
      nombre: String(usuario.nombre ?? '').trim(),
      apellido: String(usuario.apellido ?? '').trim(),
      identificacion: String(usuario.identificacion ?? '').trim(),
      estado: String(usuario.estado ?? '').trim(),
      perfil: String(usuario.perfil ?? '').trim(),
    };
  }

  private resolveLockedTarget(lockedId: number): CatalogActionTarget | null {
    if (!Number.isFinite(lockedId) || lockedId <= 0) {
      return null;
    }
    if (!this.menuTarget || this.menuTarget.id !== lockedId) {
      Swal.fire({
        title: 'Acción cancelada',
        text: 'La fila seleccionada ya no coincide. Abra de nuevo el menú e intente otra vez.',
        icon: 'warning',
        confirmButtonColor: '#00517b',
      });
      return null;
    }
    return { ...this.menuTarget };
  }

  private onMenuHabilitarAcceso(lockedId: number): void {
    const target = this.resolveLockedTarget(lockedId);
    if (!target) return;

    this.promoteTargetId = target.id;
    this.usuarioPromoviendo = {
      id_usuario: String(target.id),
      identificacion: target.identificacion,
      nombre: target.nombre,
      apellido: target.apellido,
      email: '',
      estado: target.estado,
      id_perfil: '',
      perfil: target.perfil,
    };
    this.emailAcceso = '';
    this.mostrarDialogoAcceso = true;
  }

  confirmEnableAccess(): void {
    if (!this.usuarioPromoviendo || this.promoteTargetId == null) return;
    if (this.actionBusy) return;

    const lockedId = this.promoteTargetId;
    const formId = Number(this.usuarioPromoviendo.id_usuario);
    if (formId !== lockedId) {
      Swal.fire({
        title: 'Acción cancelada',
        text: 'El usuario seleccionado no coincide. Intente de nuevo.',
        icon: 'warning',
        confirmButtonColor: '#00517b',
      });
      return;
    }

    if (!this.emailAcceso?.trim()) {
      Swal.fire({
        title: 'Alerta',
        text: 'Ingrese un correo electrónico válido.',
        icon: 'warning',
        confirmButtonColor: '#00517b',
      });
      return;
    }

    this.actionBusy = true;
    this.userService
      .enableCatalogAccess({
        p_id_usuario: lockedId,
        p_email: this.emailAcceso.trim(),
      })
      .subscribe({
        next: (response: any) => {
          this.actionBusy = false;
          Swal.fire({
            title: 'Éxito',
            text:
              response?.message ||
              'Acceso habilitado. El usuario pasará a Usuarios del sistema.',
            icon: 'success',
            confirmButtonColor: '#28a745',
          });
          this.mostrarDialogoAcceso = false;
          this.usuarioPromoviendo = null;
          this.promoteTargetId = null;
          this.emailAcceso = '';
          this.getDataUsers();
        },
        error: (error) => {
          this.actionBusy = false;
          Swal.fire({
            title: 'Error',
            text:
              error.error?.message ||
              'No se pudo habilitar el acceso al sistema.',
            icon: 'error',
            confirmButtonColor: '#d33',
          });
        },
      });
  }

  private onMenuEliminar(lockedId: number): void {
    const target = this.resolveLockedTarget(lockedId);
    if (!target) return;

    const userId = target.id;
    const label = `${target.nombre} ${target.apellido}`.trim();

    Swal.fire({
      title: '¿Eliminar usuario de catálogo?',
      html: `Se eliminará a <strong>${label}</strong>.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
    }).then((result) => {
      if (!result.isConfirmed) return;
      if (this.actionBusy) return;

      if (!this.menuTarget || this.menuTarget.id !== userId) {
        Swal.fire({
          title: 'Acción cancelada',
          text: 'La fila seleccionada cambió. Intente de nuevo.',
          icon: 'warning',
          confirmButtonColor: '#00517b',
        });
        return;
      }

      this.actionBusy = true;
      this.userService.deleteUser({ p_id_usuario: userId }).subscribe({
        next: (response: { code: number; message: string }) => {
          this.actionBusy = false;
          if (response?.code === 1) {
            this.usuarios = this.usuarios.filter(
              (u) => Number(u.id_usuario) !== userId
            );
            Swal.fire({
              title: 'Éxito',
              text: response.message || 'Usuario eliminado.',
              icon: 'success',
              confirmButtonColor: '#28a745',
            });
            this.getDataUsers();
            return;
          }
          Swal.fire({
            title: 'No se pudo eliminar',
            text: response?.message || 'El usuario no puede eliminarse.',
            icon: 'warning',
            confirmButtonColor: '#00517b',
          });
        },
        error: (error) => {
          this.actionBusy = false;
          Swal.fire({
            title: 'Error',
            text: error?.error?.message || 'No se pudo eliminar el usuario.',
            icon: 'error',
            confirmButtonColor: '#d33',
          });
        },
      });
    });
  }

  clearFields(): void {
    this.nombre = '';
    this.apellidos = '';
    this.identificacion = '';
    this.rolSeleccionado = null;
  }
}
