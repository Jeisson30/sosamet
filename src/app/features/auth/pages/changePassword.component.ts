import { Component, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

//PrimeNG
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { PasswordModule } from 'primeng/password';

//Library
import Swal from 'sweetalert2';

//Service
import { AuthService } from '../shared/service/auth.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, 
    InputTextModule,
    ButtonModule,
    FloatLabelModule,
		PasswordModule
  ],
  templateUrl: './changePassword.component.html',
  styleUrls: ['./changePassword.component.scss'],
})
export class ChangePasswordComponent {
  private authService = inject(AuthService)
  private route = inject(ActivatedRoute);

  //identification: number | undefined;
  tokenFromUrl: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
	
	constructor(private router: Router) {
    this.route.queryParams.subscribe(params => {
      this.tokenFromUrl = params['token'];
    });
  }

  onSubmit() {  
    if (!this.tokenFromUrl) {
      Swal.fire({
        icon: 'error',
        title: 'Token inválido',
        text: 'El enlace no es válido o ha expirado.',
      });
      return;
    }
    if (!this.newPassword || !this.confirmPassword) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor complete todos los campos.',
      });
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Contraseñas no coinciden',
        text: 'La nueva contraseña y la confirmación no son iguales.',
      });
      return;
    }

    const payload = {
      token: this.tokenFromUrl,
      p_clave_actual : this.newPassword,
      p_nueva_password : this.confirmPassword
    }

    console.log('payload: ', JSON.stringify(payload));
    

    this.authService.changePassword(payload).subscribe({
      next: (response: any) => {
        if (response && response.code === 1) {
          console.log('resp contraseña: ', JSON.stringify(response));
          Swal.fire({
            icon: 'success',
            title: 'Contraseña actualizada',
            text: 'La contraseña ha sido cambiada correctamente.',
          }); 
          this.newPassword = '';
          this.confirmPassword = '';
          this.router.navigate(['/']);
          return;
        } else {
          Swal.fire({
            title: 'Alerta',
            text: response.message || 'No se pudo realizar el cambio, valide campos',
            icon: 'success',
            confirmButtonColor: '#d33',
          });
        }
      },
      error: (error) => {
        console.log('error:', error);
        Swal.fire({
          title: 'Error',
          text: error.error?.message || 'Error en el servicio, pudo cambiar la contraseña',
          icon: 'error',
          confirmButtonColor: '#d33',
        });
      },  
    })
  }
}
