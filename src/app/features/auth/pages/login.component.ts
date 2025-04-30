import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [
    FormsModule,
    InputTextModule,
    ButtonModule,
    FloatLabelModule
  ]
})
export class LoginComponent {
  username: string = '';
  password: string = '';

  login() {
    console.log('Usuario:', this.username);
    console.log('Contraseña:', this.password);
  }
}
