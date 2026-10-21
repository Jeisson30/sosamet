import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-users-hub',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users-hub.component.html',
  styleUrls: ['./users-hub.component.scss'],
})
export class UsersHubComponent {
  constructor(private router: Router) {}

  goToSystemUsers(): void {
    this.router.navigate(['/dashboard/users/system']);
  }

  goToCatalogUsers(): void {
    this.router.navigate(['/dashboard/users/catalog']);
  }
}
