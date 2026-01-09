import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { InputTextarea } from 'primeng/inputtextarea';
import { FloatLabelModule } from 'primeng/floatlabel';
import { GestionService } from '../../../shared/service/gestion.service';
import { Company, GestionUser } from '../../../shared/interfaces/Response.interface';

@Component({
  selector: 'app-create-order-work',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    CalendarModule,
    DropdownModule,
    ButtonModule,
    InputTextarea,
    FloatLabelModule,
  ],
  templateUrl: './create-order-work.component.html',
  styleUrls: ['./create-order-work.component.scss'],
})
export class CreateOrderWorkComponent implements OnInit{
  consecutivo!: string;
  fechaEntrega!: Date;
  observaciones!: string;
  companies: Company[] = [];
  workUsers: GestionUser[] = [];
  userSelected :  number | null = null;
  empresaSelectedId!: number | null;


  constructor(
    private gestionService: GestionService
  ) {}

  items: Array<{
    item: string;
    cantidad: number | null;
    um: string;
    ancho: number | null;
    alto: number | null;
    descripcion: string;
    observaciones: string;
  }> = [
    {
      item: '',
      cantidad: null,
      um: '',
      ancho: null,
      alto: null,
      descripcion: '',
      observaciones: '',
    },
  ];

  ngOnInit(): void {
    this.loadCompanies();
    this.getAllUsers();
  }
  addItemRow(): void {
    this.items.push({
      item: '',
      cantidad: null,
      um: '',
      ancho: null,
      alto: null,
      descripcion: '',
      observaciones: '',
    });
  }

  loadCompanies(): void {
    this.gestionService.getCompanies().subscribe({
      next: (res: Company[]) => {
        this.companies = res
      },
      error: (err) => {
        console.error('Error al obtener empresas:', err);
      },
    });
  }

  getAllUsers(): void {
    this.gestionService.getAllUsers().subscribe({
      next: (res) => {
        this.workUsers = res.data.map(user => ({
          ...user,
          displayName: `${user.nombre} ${user.apellido} - ${user.perfil}`
        }));
      },
      error: (err) => {
        console.error('Error al obtener usuarios:', err);
      },
    }); 
  }
  removeItemRow(index: number): void {
    this.items.splice(index, 1);
  }

  guardarOrden(): void {
    console.log('Guardar orden', this.items);
  }

  onAdjuntarActa(): void {
    console.log('Adjuntar Acta de Medida');
  }

  onAdjuntarPlano(): void {
    console.log('Adjuntar Plano');
  }
}
