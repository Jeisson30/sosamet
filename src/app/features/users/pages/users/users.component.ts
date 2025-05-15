import { Component, OnInit } from '@angular/core';
import { User } from '../../shared/interfaces/Response.interface';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-usuarios',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  imports: [
    ButtonModule, TableModule, DialogModule, InputTextModule, FormsModule
  ]
})
export class UsersComponent implements OnInit {
  ngOnInit(){}
}
