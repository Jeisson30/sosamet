import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ContractsService } from '../../shared/service/contracts.service';
import { ContractTypeResponse } from '../../shared/interfaces/Response.interface';
import Swal from 'sweetalert2';

interface ContratoCard {
  tipo_doc: string;
  title: string;
  /** Ruta del icono en assets/images — colocar el archivo manualmente */
  icon: string;
  consultRoute: string | null;
  /** Si es false, solo se muestra Consultar (ej. Informes). */
  showNuevo?: boolean;
}

/** Misma regla de perfiles que select-document (no cambia la lógica de creación). */
const DOCUMENTS_BY_PROFILE: Record<string, string[]> = {
  ADMINISTRADOR: [
    'CONTRATO',
    'ASISTENCIA',
    'ACTAS DE MEDIDA',
    'ORDEN DE COMPRA',
    'REMISIONES',
    'ACTAS DE PAGO',
  ],
  AUXILIAR: [
    'CONTRATO',
    'ASISTENCIA',
    'ACTAS DE MEDIDA',
    'ORDEN DE COMPRA',
    'REMISIONES',
    'ACTAS DE PAGO',
  ],
  'SUPERVISOR DE PROYECTOS': [
    'CONTRATO',
    'ASISTENCIA',
    'ACTAS DE MEDIDA',
    'ORDEN DE COMPRA',
    'REMISIONES',
    'ACTAS DE PAGO',
  ],
  'RESIDENTE DE OBRA': ['ASISTENCIA', 'ACTAS DE MEDIDA', 'ACTAS DE PAGO'],
  'DELINEANTE DE ARQUITECTURA': ['ASISTENCIA'],
  'COORDINADOR DE PRODUCCION': [
    'ASISTENCIA',
    'ACTAS DE MEDIDA',
    'ORDEN DE COMPRA',
    'REMISIONES',
  ],
  CONTRATISTA: ['ASISTENCIA', 'ACTAS DE MEDIDA'],
  'COORDINADOR DE COMPRAS': ['ASISTENCIA', 'ORDEN DE COMPRA'],
  ALMACENISTA: ['ASISTENCIA', 'REMISIONES'],
  CONTABILIDAD: ['CONTRATO', 'ASISTENCIA', 'ACTAS DE PAGO'],
  OFICINA: ['ASISTENCIA'],
  OBRA: ['ASISTENCIA'],
  ARMADOR: ['ASISTENCIA', 'ACTAS DE MEDIDA'],
  PINTOR: ['ASISTENCIA'],
  INSTALADOR: ['ASISTENCIA'],
  TRANSPORTE: ['ASISTENCIA'],
};

const CARD_META: Record<
  string,
  { title: string; icon: string; consultRoute: string | null }
> = {
  CONTRATO: {
    title: 'Contratos',
    icon: 'assets/images/CONTRATOS.png',
    consultRoute: '/dashboard/contracts/consult-contracts',
  },
  REMISIONES: {
    title: 'Remisiones',
    icon: 'assets/images/REMISIONES.png',
    consultRoute: '/dashboard/contracts/remissions',
  },
  'ACTAS DE PAGO': {
    title: 'Actas de Pago',
    icon: 'assets/images/ACTAS DE PAGO.png',
    consultRoute: null,
  },
};

/** Tipos que ahora viven en el hub de Producción. */
const TIPOS_EN_PRODUCCION = new Set([
  'ASISTENCIA',
  'ACTAS DE MEDIDA',
  'ORDEN DE COMPRA',
]);

/** Orden fijo en el hub de Contratos. */
const CARD_ORDER = ['CONTRATO', 'REMISIONES', 'ACTAS DE PAGO', 'INFORMES'];

@Component({
  selector: 'app-contract-consult',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'getContract.component.html',
  styleUrls: ['getContract.component.scss'],
})
export class ContractConsultComponent implements OnInit {
  nombreUsuario = 'Usuario';
  cards: ContratoCard[] = [];
  loading = false;

  constructor(
    private router: Router,
    private contractsService: ContractsService
  ) {}

  ngOnInit(): void {
    this.nombreUsuario = localStorage.getItem('nombreUsuario') || 'Usuario';
    this.loadCards();
  }

  private loadCards(): void {
    this.loading = true;
    const userProfile = localStorage.getItem('nombre_perfil') || '';
    const allowed = DOCUMENTS_BY_PROFILE[userProfile] || [];

    this.contractsService.getTypeContract().subscribe({
      next: (types: ContractTypeResponse[]) => {
        const normalized = types.map((t) => ({
          ...t,
          tipo_doc: t.tipo_doc ? t.tipo_doc.toUpperCase() : t.tipo_doc,
        }));

        this.cards = normalized
          .filter(
            (t) =>
              allowed.includes(t.tipo_doc) &&
              !TIPOS_EN_PRODUCCION.has(t.tipo_doc)
          )
          .map((t) => {
            const meta = CARD_META[t.tipo_doc] || {
              title: t.tipo_doc,
              icon: 'assets/images/card-documento.png',
              consultRoute: null,
            };
            return {
              tipo_doc: t.tipo_doc,
              title: meta.title,
              icon: meta.icon,
              consultRoute: meta.consultRoute,
              showNuevo: true,
            };
          })
          .sort(
            (a, b) =>
              CARD_ORDER.indexOf(a.tipo_doc) - CARD_ORDER.indexOf(b.tipo_doc)
          );

        this.appendInformesCardIfAllowed();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.cards = [];
        Swal.fire('Error', 'No se pudieron cargar los tipos de documento.', 'error');
      },
    });
  }

  /** Misma visibilidad que tenía el ítem Informes en el menú lateral. */
  private appendInformesCardIfAllowed(): void {
    const idPerfil = Number(localStorage.getItem('id_perfil'));
    if (idPerfil !== 1 && idPerfil !== 10) {
      return;
    }

    this.cards.push({
      tipo_doc: 'INFORMES',
      title: 'Informes',
      icon: 'assets/images/RESUMEN.png',
      consultRoute: '/dashboard/informes',
      showNuevo: false,
    });
  }

  onNuevo(card: ContratoCard): void {
    if (card.showNuevo === false) {
      return;
    }
    this.router.navigate(['/dashboard/contracts/nuevo'], {
      queryParams: { tipo: card.tipo_doc },
    });
  }

  onConsultar(card: ContratoCard): void {
    if (!card.consultRoute) {
      Swal.fire({
        icon: 'info',
        title: 'Consulta no disponible',
        text: `La consulta de ${card.title} aún no está habilitada.`,
        confirmButtonColor: '#20506A',
      });
      return;
    }
    this.router.navigate([card.consultRoute]);
  }

  onIconError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.opacity = '0.25';
  }
}
