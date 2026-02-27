import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// PrimeNG
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { RippleModule } from 'primeng/ripple';
import { FloatLabelModule } from 'primeng/floatlabel';

// Librerías
import Swal from 'sweetalert2';

//Service
import { AuthService } from '../shared/service/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    CheckboxModule,
    RippleModule,
    FloatLabelModule,
  ],
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  rememberMe: boolean = false;

  constructor(private router: Router, private authService: AuthService) {}

  mockUser = {
    username: 'Admin',
    password: '1234',
  };

  login() {
    if (!this.username || !this.password) {
      Swal.fire({
        title: 'Alerta',
        text: '¡Completa todos los campos!',
        icon: 'warning',
        confirmButtonColor: '#00517b',
        allowOutsideClick: false,
      });
      return;
    }
  
    const payload = {
      p_email: this.username,
      p_password: this.password,
    };
  
    this.authService.loginUser(payload).subscribe({
      next: (res) => {
        if (res.code === 1) {          
          localStorage.setItem('nombreUsuario', res.user.nombre);
          localStorage.setItem('id_usuario', res.user.id_usuario);
          localStorage.setItem('id_perfil', res.user.id_perfil);
          localStorage.setItem('nombre_perfil', res.user.nombre_perfil);
          localStorage.setItem('apellidoUsuario', res.user.apellido);
          // localStorage.setItem('token', res.token);  
          Swal.fire({
            title: 'Bienvenido',
            text: `Hola, ${res.user.nombre}!`,
            icon: 'success',
            confirmButtonColor: '#00517b',
            allowOutsideClick: false,
          }).then(() => {
            this.router.navigate(['dashboard']);
          });
        }
      },
      error: (err) => {
        Swal.fire({
          title: 'Error',
          text: err.error?.message || 'Error al iniciar sesión',
          icon: 'error',
          confirmButtonColor: '#00517b',
          allowOutsideClick: false,
        });
      },
    });
  }
}
