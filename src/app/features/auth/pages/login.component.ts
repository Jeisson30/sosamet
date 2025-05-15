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

  constructor(private router: Router) {}

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

    if (
      this.username === this.mockUser.username &&
      this.password === this.mockUser.password
    ) {
      localStorage.setItem('nombreUsuario', this.username);
      Swal.fire({
        title: 'Bienvenido',
        text: `Hola, ${this.username}!`,
        icon: 'success',
        confirmButtonColor: '#00517b',
        allowOutsideClick: false,
      })
      .then(() => {
        this.router.navigate(['dashboard']);
      });
      console.log('Usuario autenticado con éxito');

    } else {
      Swal.fire({
        title: 'Error',
        text: 'Usuario o contraseña incorrectos.',
        icon: 'error',
        confirmButtonColor: '#00517b',
        allowOutsideClick: false,
      });
    }
  }
}
