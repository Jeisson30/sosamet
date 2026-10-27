import { Component, inject } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { PasswordModule } from 'primeng/password';
import Swal from 'sweetalert2';

import { AuthService } from '../shared/service/auth.service';
import {
  evaluatePassword,
  isPasswordPolicyOk,
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_REQUIREMENTS,
  PasswordChecks,
} from '../shared/password-policy';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    FloatLabelModule,
    PasswordModule,
    RouterLink,
  ],
  templateUrl: './changePassword.component.html',
  styleUrls: ['./changePassword.component.scss'],
})
export class ChangePasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  tokenFromUrl = '';
  newPassword = '';
  confirmPassword = '';
  submitting = false;

  readonly requirements = PASSWORD_REQUIREMENTS;

  constructor() {
    this.route.queryParams.subscribe((params) => {
      this.tokenFromUrl = params['token'] || '';
    });
  }

  get passwordChecks(): PasswordChecks {
    return evaluatePassword(this.newPassword);
  }

  get allRequirementsMet(): boolean {
    return isPasswordPolicyOk(this.newPassword);
  }

  onSubmit(): void {
    if (!this.tokenFromUrl) {
      Swal.fire({
        icon: 'error',
        title: 'Enlace inválido',
        text: 'El enlace no es válido o ha expirado.',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    if (!this.newPassword || !this.confirmPassword) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Completa todos los campos.',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    if (!isPasswordPolicyOk(this.newPassword)) {
      Swal.fire({
        icon: 'warning',
        title: 'Contraseña insegura',
        text: PASSWORD_POLICY_MESSAGE,
        confirmButtonColor: '#20506A',
      });
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Contraseñas no coinciden',
        text: 'La nueva contraseña y la confirmación no son iguales.',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    this.submitting = true;
    this.authService
      .changePassword({
        token: this.tokenFromUrl,
        p_clave_actual: this.newPassword,
        p_nueva_password: this.confirmPassword,
      })
      .subscribe({
        next: (response: { code?: number; message?: string }) => {
          this.submitting = false;
          if (response && response.code === 1) {
            Swal.fire({
              icon: 'success',
              title: 'Contraseña actualizada',
              text: 'La contraseña ha sido cambiada correctamente.',
              confirmButtonColor: '#20506A',
            }).then(() => {
              this.newPassword = '';
              this.confirmPassword = '';
              this.router.navigate(['/']);
            });
            return;
          }
          Swal.fire({
            title: 'Alerta',
            text: response.message || 'No se pudo realizar el cambio.',
            icon: 'warning',
            confirmButtonColor: '#20506A',
          });
        },
        error: (error) => {
          this.submitting = false;
          Swal.fire({
            title: 'Error',
            text: error.error?.message || 'No se pudo cambiar la contraseña.',
            icon: 'error',
            confirmButtonColor: '#20506A',
          });
        },
      });
  }
}
