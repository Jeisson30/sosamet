import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { Dock } from 'primeng/dock';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [CommonModule, Dock, TooltipModule, RouterModule],
})
export class DashboardComponent implements OnInit {
  items: MenuItem[] = [];

  position: 'left' = 'left';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.items = [
      {
        label: 'Usuarios',
        icon: 'https://primefaces.org/cdn/primeng/images/dock/finder.svg',
        command: () => {
          this.router.navigate(['/dashboard/users']);
        },
      },
    ];
  }
}
