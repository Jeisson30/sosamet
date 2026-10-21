import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import Swal from 'sweetalert2';
import { UserService } from '../../shared/service/user.service';
import {
  UserResponse,
  getRoles,
} from '../../shared/interfaces/Response.interface';

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
    FloatLabelModule,
    DialogModule,
    TooltipModule,
  ],
  templateUrl: './catalog-users.component.html',
  styleUrls: ['../users/users.component.scss', './catalog-users.component.scss'],
})
export class CatalogUsersComponent implements OnInit {
  private userService = inject(UserService);
  private router = inject(Router);

  nombre = '';
  apellidos = '';
  identificacion = '';
  rolSeleccionado: any;
  usuarios: UserResponse[] = [];
  roles: getRoles[] = [];

  mostrarDialogoAcceso = false;
  usuarioPromoviendo: UserResponse | null = null;
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
    this.userService.getDataUsersByMode('DIRECTORY').subscribe({
      next: (data: UserResponse[]) => {
        this.usuarios = data;
      },
      error: () => {
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
        text: 'Completa nombre, apellidos, identificación y perfil.',
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

  openEnableAccess(usuario: UserResponse): void {
    this.usuarioPromoviendo = usuario;
    this.emailAcceso = '';
    this.mostrarDialogoAcceso = true;
  }

  confirmEnableAccess(): void {
    if (!this.usuarioPromoviendo || !this.emailAcceso?.trim()) {
      Swal.fire({
        title: 'Alerta',
        text: 'Ingresa un correo electrónico válido.',
        icon: 'warning',
        confirmButtonColor: '#00517b',
      });
      return;
    }

    this.userService
      .enableCatalogAccess({
        p_id_usuario: this.usuarioPromoviendo.id_usuario,
        p_email: this.emailAcceso.trim(),
      })
      .subscribe({
        next: (response: any) => {
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
          this.emailAcceso = '';
          this.getDataUsers();
        },
        error: (error) => {
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

  eliminarUsuario(usuario: UserResponse): void {
    Swal.fire({
      title: '¿Eliminar usuario de catálogo?',
      html: `Se eliminará a <strong>${usuario.nombre} ${usuario.apellido}</strong>.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.userService
        .deleteUser({ p_id_usuario: Number(usuario.id_usuario) })
        .subscribe({
          next: (response: { code: number; message: string }) => {
            if (response?.code === 1) {
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
