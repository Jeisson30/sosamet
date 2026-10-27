import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import Swal from 'sweetalert2';

import { AuthService } from '../shared/service/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    FloatLabelModule,
    RouterLink,
  ],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  sending = false;

  submit(): void {
    const email = this.email.trim();
    if (!email || !email.includes('@')) {
      Swal.fire({
        icon: 'warning',
        title: 'Correo requerido',
        text: 'Ingresa el correo asociado a tu cuenta.',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    this.sending = true;
    this.authService.forgotPassword({ email }).subscribe({
      next: (response: { code?: number; message?: string }) => {
        this.sending = false;
        Swal.fire({
          icon: 'success',
          title: 'Revisa tu correo',
          text:
            response?.message ||
            'Si el correo está registrado, enviamos un enlace para restablecer la contraseña.',
          confirmButtonColor: '#20506A',
        }).then(() => this.router.navigate(['/']));
      },
      error: (err) => {
        this.sending = false;
        Swal.fire({
          icon: 'error',
          title: 'No se pudo enviar',
          text: err?.error?.message || 'Intenta de nuevo más tarde.',
          confirmButtonColor: '#20506A',
        });
      },
    });
  }
}
