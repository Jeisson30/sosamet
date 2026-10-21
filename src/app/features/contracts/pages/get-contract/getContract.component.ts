import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ContractsService } from '../../shared/service/contracts.service';
import { ContractTypeResponse } from '../../shared/interfaces/Response.interface';
import {
  DOCUMENTS_BY_PROFILE,
  TIPOS_EN_PRODUCCION,
  puedeCrearDocumento,
  puedeVerInformes,
} from '../../../../core/auth/permissions';
import Swal from 'sweetalert2';

interface ContratoCard {
  tipo_doc: string;
  title: string;
  /** Ruta del icono en assets/images — colocar el archivo manualmente */
  icon: string;
  consultRoute: string | null;
  /** Si es false, solo se muestra Consultar (ej. Informes). */
  showNuevo?: boolean;
  /** Ruta propia de Nuevo; sin ella abre el formulario de documentos (contracts/nuevo). */
  nuevoRoute?: string;
}

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

/** Orden fijo en el hub de Contratos. */
const CARD_ORDER = ['CONTRATO', 'OTRO SI', 'REMISIONES', 'ACTAS DE PAGO', 'INFORMES'];

/** Otro Sí: mismos perfiles con CONTRATO; Nuevo solo quien puede crear/editar. */
const OTRO_SI_CARD: ContratoCard = {
  tipo_doc: 'OTRO SI',
  title: 'Otro Sí',
  icon: 'assets/images/documentos.png',
  consultRoute: '/dashboard/contracts/otro-si',
  nuevoRoute: '/dashboard/contracts/otro-si/nuevo',
  showNuevo: true,
};

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
              showNuevo: puedeCrearDocumento(t.tipo_doc, userProfile),
            } as ContratoCard;
          })
          .concat(
            allowed.includes('CONTRATO')
              ? [
                  {
                    ...OTRO_SI_CARD,
                    showNuevo: puedeCrearDocumento('OTRO SI', userProfile),
                  },
                ]
              : []
          )
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
    if (!puedeVerInformes()) {
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
    if (card.nuevoRoute) {
      this.router.navigate([card.nuevoRoute]);
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
