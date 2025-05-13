import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { DashboardComponent } from '../dashboard/dashboard.component';

@Component({
  selector: 'app-layout-principal',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    FooterComponent,
    DashboardComponent,
  ],
  templateUrl: './layout-principal.component.html',
})
export class LayoutPrincipalComponent {}
