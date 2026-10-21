import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  InventarioAccionId,
  puedeEditarInventarioAccion,
  puedeVerInventarioAccion,
} from '../../../../core/auth/permissions';

interface InventarioAction {
  label: string;
  icon: string;
  route: string;
  /** Clave de permiso Excel (si no hay, la acción siempre se muestra si la card existe). */
  permiso?: InventarioAccionId;
  /** Si true, exige nivel edit (botón Nuevo). */
  requiereEdit?: boolean;
}

interface InventarioCard {
  numero: number;
  title: string;
  description: string;
  icon: string;
  primarios: InventarioAction[];
  secondary: InventarioAction | null;
}

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventario.component.html',
  styleUrls: ['./inventario.component.scss'],
})
export class InventarioComponent implements OnInit {
  cards: InventarioCard[] = [];

  private readonly allCards: InventarioCard[] = [
    {
      numero: 1,
      title: 'Ingreso Material',
      description: 'Registra la entrada de materiales al inventario.',
      icon: 'assets/images/IngresoMaterial.png',
      primarios: [
        {
          label: 'Nuevo ingreso',
          icon: 'pi pi-plus',
          route: 'ingresos/nuevo',
          permiso: 'ingreso',
          requiereEdit: true,
        },
      ],
      secondary: {
        label: 'Consultar ingresos',
        icon: 'pi pi-search',
        route: 'ingresos',
        permiso: 'ingreso',
      },
    },
    {
      numero: 2,
      title: 'Entrega y Devolución',
      description: 'Registra la entrega y devolución de materiales y herramientas.',
      icon: 'assets/images/EntregaMaterial.png',
      primarios: [
        {
          label: 'Entrega',
          icon: 'pi pi-plus',
          route: 'despachos/nuevo',
          permiso: 'entrega',
          requiereEdit: true,
        },
        {
          label: 'Devolución',
          icon: 'pi pi-plus',
          route: 'devoluciones/nuevo',
          permiso: 'devolucion',
          requiereEdit: true,
        },
      ],
      secondary: {
        label: 'Consulta Movimientos',
        icon: 'pi pi-search',
        route: 'despachos',
        permiso: 'entrega',
      },
    },
    {
      numero: 3,
      title: 'Inventario Actual',
      description: 'Visualiza el inventario disponible en tiempo real.',
      icon: 'assets/images/InventarioActual.png',
      primarios: [
        {
          label: 'Ver inventario actual',
          icon: 'pi pi-search',
          route: 'actual',
          permiso: 'actual',
        },
      ],
      secondary: {
        label: 'Reporte de inventario',
        icon: 'pi pi-chart-pie',
        route: 'reporte',
        permiso: 'reporte',
      },
    },
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.cards = this.allCards
      .map((card, idx) => {
        const primarios = card.primarios.filter((a) => this.accionVisible(a));
        const secondary =
          card.secondary && this.accionVisible(card.secondary)
            ? card.secondary
            : null;
        if (!primarios.length && !secondary) {
          return null;
        }
        return {
          ...card,
          numero: idx + 1,
          primarios,
          secondary,
        };
      })
      .filter((c): c is InventarioCard => !!c)
      .map((c, i) => ({ ...c, numero: i + 1 }));
  }

  private accionVisible(action: InventarioAction): boolean {
    if (!action.permiso) return true;
    if (!puedeVerInventarioAccion(action.permiso)) return false;
    if (action.requiereEdit) {
      return puedeEditarInventarioAccion(action.permiso);
    }
    return true;
  }

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
