import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { DialogModule } from 'primeng/dialog';

//Library
import Swal from 'sweetalert2';

//Service
import { UserService } from '../../shared/service/user.service';

// Interfaces
import {
  UserResponse,
  StateUSer,
  getRoles,
} from '../../shared/interfaces/Response.interface';

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
    FloatLabelModule,
    DialogModule,
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit {
  private userService = inject(UserService);

  nombre = '';
  correo = '';
  apellidos = '';
  identificacion = '';
  rolSeleccionado: any;
  usuarioEditando: any | null = null;
  mostrarDialogoEdicion: boolean = false;
  usuarios: UserResponse[] = [];
  roles: getRoles[] = [];
  globalFilterValue: string = '';


  ngOnInit() {
    this.getRoles();
  }

  // TODO: Petición servicios

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
    this.userService.getDataUsers().subscribe({
      next: (data: UserResponse[]) => {
        this.usuarios = data;
        console.log(' response usuarios: ', this.usuarios);
      },
      error: () => {
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
        text: '¡Completa todos los campos para crear el usuario!',
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
        if (response && response.message) {
          console.log(' response create: ', JSON.stringify(response));
          Swal.fire({
            title: 'Exito',
            text: `${response.message}`,
            icon: 'success',
            confirmButtonColor: '#d33',
          });
          this.clearFields();
          return;
        } else {
          Swal.fire({
            title: 'Alerta',
            text: response.message || 'Usuario creado exitosamente',
            icon: 'success',
            confirmButtonColor: '#d33',
          });
        }
      },
      error: (error) => {
        console.log('error:', error);
        Swal.fire({
          title: 'Error',
          text: error.error?.message || 'No se pudo crear el usuario.',
          icon: 'error',
          confirmButtonColor: '#d33',
        });
      },
    });
  }

  editarUsuario(usuario: any): void {
    // MOdal
    this.usuarioEditando = { ...usuario };
    this.mostrarDialogoEdicion = true;
  }

  actualizarUsuario(): void {
    if (this.usuarioEditando) {
      const payload = {
        p_nit: this.usuarioEditando.identificacion,
        p_nombre: this.usuarioEditando.nombre,
        p_apellido: this.usuarioEditando.apellido,
        p_email: this.usuarioEditando.email,
        p_rol: this.usuarioEditando.id_rol
      };
      this.userService.updateUser(payload).subscribe({
        next: (response: any) => {
          if (response && response.message)
            Swal.fire({
              title: 'Éxito',
              text: 'Usuario actualizado correctamente',
              icon: 'success',
              confirmButtonColor: '#28a745',
            });
          this.getDataUsers();
          this.mostrarDialogoEdicion = false;
          this.usuarioEditando = null;
        },
        error: (error) => {
          console.error('Error actualizando usuario:', error);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo actualizar el usuario.',
            icon: 'error',
            confirmButtonColor: '#d33',
          });
          this.mostrarDialogoEdicion = false;
        },
      });
    }
  }

  cambiarEstadoUsuario(usuario: any): void {
    console.log('elimina usuario: ', usuario);

    let nuevoEstado = '';
    if (usuario.estado === 'ACTIVO') {
      nuevoEstado = 'INACTIVO';
    } else if (usuario.estado === 'INACTIVO') {
      nuevoEstado = 'ACTIVO';
    } else {
      nuevoEstado = 'ELIMINADO'; 
    }

    Swal.fire({
      title: `¿Desea cambiar el estado para  el usuario "${usuario.nombre}"?`,
      text: 'Aplicar acción',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    }).then((result) => {
      if (result.isConfirmed) {
        const payload = {
          p_id_usuario: usuario.id_usuario,
          p_nuevo_estado: nuevoEstado,
        };
        this.userService.stateUser(payload).subscribe({
          next: (response: StateUSer) => {
            if (response && response.code === 1) {
              Swal.fire({
                title: 'Éxito',
                text: `${response.message}`,
                icon: 'success',
                confirmButtonColor: '#28a745',
              });
              this.getDataUsers();
            }
          },
          error: (error) => {
            console.error('Error cambiado estado usuario:', error);
            Swal.fire({
              title: 'Error',
              text: 'No se pudo cambiar el estado del usuario.',
              icon: 'error',
              confirmButtonColor: '#d33',
            });
          },
        });
      }
    });
  }

  getLabelEstado(usuario: any): string {
    if (usuario.estado === 'ACTIVO') {
      return 'Inactivar';
    } else if (usuario.estado === 'INACTIVO') {
      return 'Activar';
    } else if (usuario.estado === 'BLOQUEADO') {
      return 'Desbloquear';
    } else {
      return 'Activar'; 
    }
  }
  

  clearFields() {
    this.nombre = '';
    this.apellidos = '';
    this.identificacion = '';
    this.correo = '';
    this.rolSeleccionado = null;
  }
}
