import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

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
  StateUSer,
  getRoles,
} from '../../shared/interfaces/Response.interface';

/** Snapshot inmutable de la fila sobre la que se actúa (evita aplicar la acción a otro usuario). */
interface UserActionTarget {
  id: number;
  nombre: string;
  apellido: string;
  identificacion: string;
  email: string;
  estado: string;
  id_perfil: number | null;
  perfil: string;
}

@Component({
  selector: 'app-users',
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
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit {
  @ViewChild('rowMenu') rowMenu?: Menu;

  private userService = inject(UserService);
  private router = inject(Router);

  nombre = '';
  correo = '';
  apellidos = '';
  identificacion = '';
  rolSeleccionado: string | number | null = null;

  usuarioEditando: (Omit<UserResponse, 'id_perfil'> & { id_perfil: number | null }) | null =
    null;
  /** id congelado al abrir el diálogo de edición */
  editTargetId: number | null = null;
  mostrarDialogoEdicion = false;

  /** Fila fijada al abrir el menú de 3 puntos */
  menuTarget: UserActionTarget | null = null;

  usuarios: UserResponse[] = [];
  roles: getRoles[] = [];
  loading = false;
  actionBusy = false;
  rowsPerPage = 10;
  rowsPerPageOptions = [5, 10, 20, 50];

  rowMenuItems: MenuItem[] = [];

  estadoFilterOptions = [
    { label: 'ACTIVO', value: 'ACTIVO' },
    { label: 'INACTIVO', value: 'INACTIVO' },
    { label: 'BLOQUEADO', value: 'BLOQUEADO' },
  ];

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
    this.userService.getDataUsersByMode('FULL').subscribe({
      next: (data: UserResponse[]) => {
        this.usuarios = data || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        Swal.fire({
          title: 'Error',
          text: 'No se pudo consultar los usuarios.',
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
      !this.correo ||
      !this.rolSeleccionado
    ) {
      Swal.fire({
        title: 'Alerta',
        text: 'Complete todos los campos para crear el usuario.',
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
      p_email: this.correo,
      p_idrol: this.rolSeleccionado.toString(),
      p_idperfil: this.rolSeleccionado.toString(),
    };

    this.userService.createUsers(payload).subscribe({
      next: (response: any) => {
        Swal.fire({
          title: 'Éxito',
          text: response?.message || 'Usuario creado exitosamente',
          icon: 'success',
          confirmButtonColor: '#28a745',
        });
        this.clearFields();
        this.getDataUsers();
      },
      error: (error) => {
        Swal.fire({
          title: 'Error',
          text: error.error?.message || 'No se pudo crear el usuario.',
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
        text: 'Este registro no tiene un id de usuario válido. No se puede continuar.',
        icon: 'error',
        confirmButtonColor: '#d33',
      });
      return;
    }

    // Congelar snapshot + id primitivo para que el command no use otra fila.
    this.menuTarget = target;
    const lockedId = target.id;
    const activo = target.estado.toUpperCase() === 'ACTIVO';

    this.rowMenuItems = [
      {
        label: 'Actualizar',
        icon: 'pi pi-pencil',
        command: () => this.onMenuActualizar(lockedId),
      },
      {
        label: activo ? 'Inactivar' : 'Activar',
        icon: activo ? 'pi pi-ban' : 'pi pi-check',
        command: () => this.onMenuCambiarEstado(lockedId),
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

  private toActionTarget(usuario: UserResponse): UserActionTarget | null {
    const id = Number(usuario?.id_usuario);
    if (!Number.isFinite(id) || id <= 0) {
      return null;
    }
    return {
      id,
      nombre: String(usuario.nombre ?? '').trim(),
      apellido: String(usuario.apellido ?? '').trim(),
      identificacion: String(usuario.identificacion ?? '').trim(),
      email: String(usuario.email ?? '').trim(),
      estado: String(usuario.estado ?? '').trim(),
      id_perfil:
        usuario.id_perfil != null && usuario.id_perfil !== ''
          ? Number(usuario.id_perfil)
          : null,
      perfil: String(usuario.perfil ?? '').trim(),
    };
  }

  /** Solo continúa si el menú sigue apuntando al mismo id congelado. */
  private resolveLockedTarget(lockedId: number): UserActionTarget | null {
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

  private onMenuActualizar(lockedId: number): void {
    const target = this.resolveLockedTarget(lockedId);
    if (!target) return;

    this.editTargetId = target.id;
    this.usuarioEditando = {
      id_usuario: String(target.id),
      identificacion: target.identificacion,
      nombre: target.nombre,
      apellido: target.apellido,
      email: target.email,
      estado: target.estado,
      id_perfil: target.id_perfil,
      perfil: target.perfil,
    };
    this.mostrarDialogoEdicion = true;
  }

  actualizarUsuario(): void {
    if (!this.usuarioEditando || this.editTargetId == null) return;
    if (this.actionBusy) return;

    const lockedId = this.editTargetId;
    const formId = Number(this.usuarioEditando.id_usuario);
    if (formId !== lockedId) {
      Swal.fire({
        title: 'Acción cancelada',
        text: 'El usuario en edición no coincide con el seleccionado.',
        icon: 'warning',
        confirmButtonColor: '#00517b',
      });
      return;
    }

    const nombre = String(this.usuarioEditando.nombre || '').trim();
    const apellido = String(this.usuarioEditando.apellido || '').trim();
    const email = String(this.usuarioEditando.email || '').trim();
    const nit = String(this.usuarioEditando.identificacion || '').trim();
    const rol = this.usuarioEditando.id_perfil;

    if (!nit || !nombre || !apellido || !email || rol == null || Number.isNaN(Number(rol))) {
      Swal.fire({
        title: 'Alerta',
        text: 'Complete nombre, apellidos, correo y rol para actualizar.',
        icon: 'warning',
        confirmButtonColor: '#00517b',
      });
      return;
    }

    this.actionBusy = true;
    this.userService
      .updateUser({
        p_nit: nit,
        p_nombre: nombre,
        p_apellido: apellido,
        p_email: email,
        p_rol: String(rol),
      })
      .subscribe({
        next: (response: any) => {
          this.actionBusy = false;
          Swal.fire({
            title: 'Éxito',
            text: response?.message || 'Usuario actualizado correctamente',
            icon: 'success',
            confirmButtonColor: '#28a745',
          });
          this.getDataUsers();
          this.mostrarDialogoEdicion = false;
          this.usuarioEditando = null;
          this.editTargetId = null;
        },
        error: (error) => {
          this.actionBusy = false;
          Swal.fire({
            title: 'Error',
            text: error?.error?.message || 'No se pudo actualizar el usuario.',
            icon: 'error',
            confirmButtonColor: '#d33',
          });
        },
      });
  }

  private onMenuCambiarEstado(lockedId: number): void {
    const target = this.resolveLockedTarget(lockedId);
    if (!target) return;

    const estadoActual = target.estado.toUpperCase();
    const nuevoEstado = estadoActual === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const accion = nuevoEstado === 'ACTIVO' ? 'Activar' : 'Inactivar';
    const userId = target.id;
    const label = `${target.nombre} ${target.apellido}`.trim();

    Swal.fire({
      title: `¿${accion} usuario?`,
      html: `<strong>${label}</strong><br>Estado nuevo: <strong>${nuevoEstado}</strong>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Sí, ${accion.toLowerCase()}`,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#20506A',
      cancelButtonColor: '#6c757d',
    }).then((result) => {
      if (!result.isConfirmed) return;
      if (this.actionBusy) return;

      // Revalidar que el menú no haya cambiado de fila mientras estaba el diálogo.
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
      this.userService
        .stateUser({
          p_id_usuario: userId,
          p_nuevo_estado: nuevoEstado,
        })
        .subscribe({
          next: (response: StateUSer) => {
            this.actionBusy = false;
            if (response && response.code === 1) {
              // Actualizar solo esa fila en memoria; luego refrescar lista.
              const row = this.usuarios.find((u) => Number(u.id_usuario) === userId);
              if (row) {
                row.estado = nuevoEstado;
              }
              Swal.fire({
                title: 'Éxito',
                text: response.message || `Usuario actualizado a ${nuevoEstado}.`,
                icon: 'success',
                confirmButtonColor: '#28a745',
              });
              this.getDataUsers();
              return;
            }
            Swal.fire({
              title: 'No se aplicó el cambio',
              text: response?.message || 'El estado no se modificó.',
              icon: 'warning',
              confirmButtonColor: '#00517b',
            });
          },
          error: (error) => {
            this.actionBusy = false;
            Swal.fire({
              title: 'Error',
              text:
                error?.error?.message ||
                'No se pudo cambiar el estado del usuario.',
              icon: 'error',
              confirmButtonColor: '#d33',
            });
          },
        });
    });
  }

  private onMenuEliminar(lockedId: number): void {
    const target = this.resolveLockedTarget(lockedId);
    if (!target) return;

    const userId = target.id;
    const label = `${target.nombre} ${target.apellido}`.trim();

    Swal.fire({
      title: '¿Eliminar usuario?',
      html: `Se eliminará permanentemente a <strong>${label}</strong>.<br>Esta acción no se puede revertir.`,
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
              text: response.message || 'Usuario eliminado correctamente.',
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
    this.correo = '';
    this.rolSeleccionado = null;
  }
}
