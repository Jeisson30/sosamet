import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface InventarioAction {
  label: string;
  icon: string;
  route: string;
}

interface InventarioCard {
  numero: number;
  title: string;
  description: string;
  icon: string;
  /** Uno ocupa todo el ancho; dos se muestran lado a lado. */
  primarios: InventarioAction[];
  secondary: InventarioAction;
}

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventario.component.html',
  styleUrls: ['./inventario.component.scss'],
})
export class InventarioComponent {
  readonly cards: InventarioCard[] = [
    {
      numero: 1,
      title: 'Ingreso Material',
      description: 'Registra la entrada de materiales al inventario.',
      icon: 'assets/images/IngresoMaterial.png',
      primarios: [{ label: 'Nuevo ingreso', icon: 'pi pi-plus', route: 'ingresos/nuevo' }],
      secondary: { label: 'Consultar ingresos', icon: 'pi pi-search', route: 'ingresos' },
    },
    {
      numero: 2,
      title: 'Entrega y Devolución',
      description: 'Registra la entrega y devolución de materiales y herramientas.',
      icon: 'assets/images/EntregaMaterial.png',
      primarios: [
        { label: 'Entrega', icon: 'pi pi-plus', route: 'despachos/nuevo' },
        { label: 'Devolución', icon: 'pi pi-plus', route: 'devoluciones/nuevo' },
      ],
      secondary: { label: 'Consulta Movimientos', icon: 'pi pi-search', route: 'despachos' },
    },
    {
      numero: 3,
      title: 'Inventario Actual',
      description: 'Visualiza el inventario disponible en tiempo real.',
      icon: 'assets/images/InventarioActual.png',
      primarios: [{ label: 'Ver inventario actual', icon: 'pi pi-search', route: 'actual' }],
      secondary: { label: 'Reporte de inventario', icon: 'pi pi-chart-pie', route: 'reporte' },
    },
  ];

  constructor(private router: Router) {}

  ir(action: InventarioAction): void {
    this.router.navigate(['/dashboard/inventario', ...action.route.split('/')]);
  }

  volverAlInicio(): void {
    this.router.navigate(['/dashboard/contracts']);
  }

  onIconError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.opacity = '0.25';
  }
}
