import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import Swal from 'sweetalert2';
import { ContractsService } from '../../../contracts/shared/service/contracts.service';
import { AdministracionService } from '../../shared/service/administracion.service';
import {
  ConstructoraAdmin,
  DocumentoNumeroAdmin,
  ProyectoAdmin,
} from '../../shared/interfaces/administracion.interface';
import { TIPO_CONTRATO_DOCUMENTO_OPTIONS, labelTipoContratoDocumento } from '../../../contracts/shared/constants/tipo-contrato.constants';

@Component({
  selector: 'app-contratos-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DropdownModule,
    ButtonModule,
    InputTextModule,
    TableModule,
    DialogModule,
  ],
  templateUrl: './contratos-admin.component.html',
  styleUrls: ['./contratos-admin.component.scss'],
})
export class ContratosAdminComponent implements OnInit {
  /** Tipos que admiten amarre cotización → contrato */
  readonly tiposAmarreOptions = [
    { label: 'Actas de Medida', value: 'ACTAS DE MEDIDA' },
    { label: 'Remisiones', value: 'REMISIONES' },
    { label: 'Orden de Compra', value: 'ORDEN DE COMPRA' },
    { label: 'Actas de Pago', value: 'ACTAS DE PAGO' },
    { label: 'Liquidación de Cortes', value: 'LIQUIDACION' },
    { label: 'Actividades Adicionales', value: 'ADICIONALES' },
    { label: 'Orden de Trabajo', value: 'ORDEN DE TRABAJO' },
  ];

  /** Misma lista que campo tipo_contrato al crear CONTRATO */
  readonly tiposDocumentoConsecutivo = TIPO_CONTRATO_DOCUMENTO_OPTIONS;

  labelTipo(value: string | null | undefined): string {
    return labelTipoContratoDocumento(value);
  }

  constructorasOptions: { label: string; value: number }[] = [];
  proyectosOptions: { label: string; value: number }[] = [];

  selectedConstructoraId: number | null = null;
  selectedProyectoId: number | null = null;
  selectedTipoDocNumero: string | null = null;
  numeroDocumentoNuevo = '';

  documentosNumero: DocumentoNumeroAdmin[] = [];
  loadingConstructoras = false;
  loadingProyectos = false;
  loadingDocumentos = false;
  savingNumero = false;
  togglingEstadoId: number | null = null;
  deletingId: number | null = null;

  /** Edición de N° documento */
  editVisible = false;
  savingEdit = false;
  editRow: DocumentoNumeroAdmin | null = null;
  editConstructoraId: number | null = null;
  editProyectoId: number | null = null;
  editTipoDoc: string | null = null;
  editNumero = '';
  editEstado: 'ACTIVO' | 'INACTIVO' = 'ACTIVO';
  editProyectosOptions: { label: string; value: number }[] = [];
  loadingEditProyectos = false;

  contratosOptions: { label: string; value: string }[] = [];
  cotizacionesOptions: { label: string; value: string }[] = [];

  selectedContrato: string | null = null;
  selectedTipoDoc: string | null = null;
  selectedCotizacion: string | null = null;

  loadingContratos = false;
  loadingCotizaciones = false;
  saving = false;

  constructor(
    private router: Router,
    private contractsService: ContractsService,
    private administracionService: AdministracionService
  ) {}

  ngOnInit(): void {
    this.cargarConstructoras();
    this.cargarContratos();
    this.cargarDocumentosNumero();
  }

  volver(): void {
    this.router.navigate(['/dashboard/administracion']);
  }

  private cargarConstructoras(): void {
    this.loadingConstructoras = true;
    this.administracionService.listarConstructoras('ACTIVO').subscribe({
      next: (res) => {
        const list: ConstructoraAdmin[] = res.data || [];
        this.constructorasOptions = list.map((c) => ({
          label: c.nombre,
          value: c.id_constructora,
        }));
        this.loadingConstructoras = false;
      },
      error: () => {
        this.constructorasOptions = [];
        this.loadingConstructoras = false;
      },
    });
  }

  onConstructoraChange(): void {
    this.selectedProyectoId = null;
    this.proyectosOptions = [];
    this.numeroDocumentoNuevo = '';
    if (!this.selectedConstructoraId) {
      this.cargarDocumentosNumero();
      return;
    }
    this.cargarProyectos(this.selectedConstructoraId);
    this.cargarDocumentosNumero();
  }

  private cargarProyectos(idConstructora: number): void {
    this.loadingProyectos = true;
    this.administracionService
      .listarProyectos(idConstructora, 'ACTIVO')
      .subscribe({
        next: (res) => {
          const list: ProyectoAdmin[] = res.data || [];
          this.proyectosOptions = list.map((p) => ({
            label: p.nombre,
            value: p.id_proyecto,
          }));
          this.loadingProyectos = false;
        },
        error: () => {
          this.proyectosOptions = [];
          this.loadingProyectos = false;
          Swal.fire('Error', 'No se pudieron cargar los proyectos.', 'error');
        },
      });
  }

  onProyectoOrTipoChange(): void {
    this.cargarDocumentosNumero();
  }

  cargarDocumentosNumero(): void {
    this.loadingDocumentos = true;
    this.administracionService
      .listarDocumentosNumero({
        id_constructora: this.selectedConstructoraId,
        id_proyecto: this.selectedProyectoId,
        tipo_doc: this.selectedTipoDocNumero,
        estado: 'TODOS',
      })
      .subscribe({
        next: (res) => {
          this.documentosNumero = Array.isArray(res?.data) ? res.data : [];
          this.loadingDocumentos = false;
        },
        error: () => {
          this.documentosNumero = [];
          this.loadingDocumentos = false;
        },
      });
  }

  toggleEstadoDocumento(row: DocumentoNumeroAdmin): void {
    if (!row?.id_documento_numero || this.togglingEstadoId) return;
    const actual = String(row.estado || '').toUpperCase();
    const nuevo: 'ACTIVO' | 'INACTIVO' =
      actual === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const accion = nuevo === 'INACTIVO' ? 'inactivar' : 'activar';

    Swal.fire({
      title: `¿${nuevo === 'INACTIVO' ? 'Inactivar' : 'Activar'} N°?`,
      html: `<p>N° <strong>${row.numero_documento}</strong></p>
        <p style="margin-top:0.5rem;font-size:0.9rem;opacity:0.85">
          ${
            nuevo === 'INACTIVO'
              ? 'Si está inactivo no aparecerá en el select Tipo Documento de los formularios.'
              : 'Volverá a estar disponible en los formularios.'
          }
        </p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: nuevo === 'INACTIVO' ? 'Inactivar' : 'Activar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#20506A',
      cancelButtonColor: '#6c757d',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.togglingEstadoId = row.id_documento_numero;
      this.administracionService
        .cambiarEstadoDocumentoNumero(row.id_documento_numero, nuevo)
        .subscribe({
          next: (res) => {
            this.togglingEstadoId = null;
            if (Number(res?.Codigo) !== 1) {
              Swal.fire(
                'Atención',
                res?.Mensaje || `No se pudo ${accion} el N°.`,
                'warning'
              );
              return;
            }
            Swal.fire({
              icon: 'success',
              title: 'Actualizado',
              text: res?.Mensaje || `N° ${accion}do correctamente.`,
              confirmButtonColor: '#20506A',
            });
            this.cargarDocumentosNumero();
          },
          error: (err) => {
            this.togglingEstadoId = null;
            Swal.fire(
              'Error',
              err?.error?.Mensaje || `Error al ${accion} el N° documento.`,
              'error'
            );
          },
        });
    });
  }

  abrirEditarDocumento(row: DocumentoNumeroAdmin): void {
    this.editRow = row;
    this.editConstructoraId = row.id_constructora;
    this.editProyectoId = row.id_proyecto;
    this.editTipoDoc = row.tipo_doc;
    this.editNumero = row.numero_documento;
    this.editEstado =
      String(row.estado || '').toUpperCase() === 'INACTIVO'
        ? 'INACTIVO'
        : 'ACTIVO';
    this.editVisible = true;
    this.cargarProyectosEdit(row.id_constructora);
  }

  cerrarEditarDocumento(): void {
    this.editVisible = false;
    this.editRow = null;
    this.savingEdit = false;
  }

  private cargarProyectosEdit(idConstructora: number): void {
    this.loadingEditProyectos = true;
    this.editProyectosOptions = [];
    this.administracionService
      .listarProyectos(idConstructora, 'ACTIVO')
      .subscribe({
        next: (res) => {
          const list: ProyectoAdmin[] = res.data || [];
          this.editProyectosOptions = list.map((p) => ({
            label: p.nombre,
            value: p.id_proyecto,
          }));
          this.loadingEditProyectos = false;
        },
        error: () => {
          this.editProyectosOptions = [];
          this.loadingEditProyectos = false;
        },
      });
  }

  onEditConstructoraChange(): void {
    this.editProyectoId = null;
    this.editProyectosOptions = [];
    if (!this.editConstructoraId) return;
    this.cargarProyectosEdit(this.editConstructoraId);
  }

  get puedeGuardarEdit(): boolean {
    return !!(
      this.editRow?.id_documento_numero &&
      this.editConstructoraId &&
      this.editProyectoId &&
      this.editTipoDoc &&
      String(this.editNumero || '').trim() &&
      !this.savingEdit
    );
  }

  guardarEdicionDocumento(): void {
    if (!this.puedeGuardarEdit || !this.editRow) return;
    this.savingEdit = true;
    this.administracionService
      .actualizarDocumentoNumero(this.editRow.id_documento_numero, {
        id_constructora: this.editConstructoraId!,
        id_proyecto: this.editProyectoId!,
        tipo_doc: this.editTipoDoc!,
        numero_documento: String(this.editNumero).trim(),
        estado: this.editEstado,
      })
      .subscribe({
        next: (res) => {
          this.savingEdit = false;
          if (Number(res?.Codigo) !== 1) {
            Swal.fire(
              'Atención',
              res?.Mensaje || 'No se pudo actualizar el N°.',
              'warning'
            );
            return;
          }
          Swal.fire({
            icon: 'success',
            title: 'Actualizado',
            text: res?.Mensaje || 'N° documento actualizado.',
            confirmButtonColor: '#20506A',
          });
          this.cerrarEditarDocumento();
          this.cargarDocumentosNumero();
        },
        error: (err) => {
          this.savingEdit = false;
          Swal.fire(
            'Error',
            err?.error?.Mensaje || 'Error al actualizar N° documento.',
            'error'
          );
        },
      });
  }

  eliminarDocumento(row: DocumentoNumeroAdmin): void {
    if (!row?.id_documento_numero || this.deletingId) return;

    Swal.fire({
      title: '¿Eliminar N° documento?',
      html: `<p>N° <strong>${row.numero_documento}</strong></p>
        <p style="margin-top:0.5rem;font-size:0.9rem;opacity:0.85">
          Solo se puede eliminar si <strong>aún no se usó</strong> en remisiones, actas u OT.
          Si ya se usó, use <strong>Inactivar</strong>.
          Al eliminar, el número queda libre para crearlo otra vez.
        </p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c0392b',
      cancelButtonColor: '#6c757d',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.deletingId = row.id_documento_numero;
      this.administracionService
        .eliminarDocumentoNumero(row.id_documento_numero)
        .subscribe({
          next: (res) => {
            this.deletingId = null;
            if (Number(res?.Codigo) !== 1) {
              Swal.fire(
                'Atención',
                res?.Mensaje || 'No se pudo eliminar el N°.',
                'warning'
              );
              return;
            }
            Swal.fire({
              icon: 'success',
              title: 'Eliminado',
              text: res?.Mensaje || 'N° documento eliminado.',
              confirmButtonColor: '#20506A',
            });
            this.cargarDocumentosNumero();
          },
          error: (err) => {
            this.deletingId = null;
            const msg =
              err?.error?.Mensaje ||
              err?.error?.mensaje ||
              'Error al eliminar N° documento.';
            const enUso = !!err?.error?.en_uso || err?.status === 409;
            Swal.fire({
              icon: enUso ? 'warning' : 'error',
              title: enUso ? 'N° en uso' : 'Error',
              text: msg,
              confirmButtonColor: '#20506A',
            });
          },
        });
    });
  }

  get puedeGuardarNumero(): boolean {
    return !!(
      this.selectedConstructoraId &&
      this.selectedProyectoId &&
      this.selectedTipoDocNumero &&
      String(this.numeroDocumentoNuevo || '').trim() &&
      !this.savingNumero
    );
  }

  guardarNumeroDocumento(): void {
    if (!this.puedeGuardarNumero) return;
    const numero = String(this.numeroDocumentoNuevo).trim();

    this.savingNumero = true;
    this.administracionService
      .crearDocumentoNumero({
        id_constructora: this.selectedConstructoraId!,
        id_proyecto: this.selectedProyectoId!,
        tipo_doc: this.selectedTipoDocNumero!,
        numero_documento: numero,
      })
      .subscribe({
        next: (res) => {
          this.savingNumero = false;
          if (Number(res?.Codigo) !== 1) {
            Swal.fire(
              'Atención',
              res?.Mensaje || 'No se pudo guardar el N° documento.',
              'warning'
            );
            return;
          }
          Swal.fire({
            icon: 'success',
            title: 'Guardado',
            text: res?.Mensaje || 'N° documento registrado.',
            confirmButtonColor: '#20506A',
          });
          this.numeroDocumentoNuevo = '';
          this.cargarDocumentosNumero();
        },
        error: (err) => {
          this.savingNumero = false;
          Swal.fire(
            'Error',
            err?.error?.Mensaje || 'Error al guardar N° documento.',
            'error'
          );
        },
      });
  }

  private cargarContratos(): void {
    this.loadingContratos = true;
    this.contractsService.consultarContratos().subscribe({
      next: (res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.contratosOptions = list.map((c) => ({
          label: c.label || c.numero_contrato || c.value,
          value: c.value || c.numero_contrato,
        }));
        this.loadingContratos = false;
      },
      error: () => {
        this.contratosOptions = [];
        this.loadingContratos = false;
        Swal.fire('Error', 'No se pudieron cargar los contratos.', 'error');
      },
    });
  }

  onTipoDocChange(): void {
    this.selectedCotizacion = null;
    this.cotizacionesOptions = [];
    if (!this.selectedTipoDoc) return;
    this.cargarCotizaciones();
  }

  private cargarCotizaciones(): void {
    if (!this.selectedTipoDoc) return;
    this.loadingCotizaciones = true;
    this.administracionService
      .listarCotizacionesPendientes(this.selectedTipoDoc)
      .subscribe({
        next: (res) => {
          const list = Array.isArray(res?.data) ? res.data : [];
          this.cotizacionesOptions = list.map((c) => ({
            label: c.label || c.value,
            value: c.value,
          }));
          this.loadingCotizaciones = false;
          if (!list.length) {
            Swal.fire({
              icon: 'info',
              title: 'Sin pendientes',
              text: 'No hay cotizaciones pendientes para este tipo de documento.',
              confirmButtonColor: '#20506A',
            });
          }
        },
        error: (err) => {
          this.cotizacionesOptions = [];
          this.loadingCotizaciones = false;
          Swal.fire(
            'Error',
            err?.error?.Mensaje || 'No se pudieron cargar las cotizaciones.',
            'error'
          );
        },
      });
  }

  get puedeAmarrar(): boolean {
    return !!(
      this.selectedContrato &&
      this.selectedTipoDoc &&
      this.selectedCotizacion &&
      !this.saving
    );
  }

  amarrar(): void {
    if (!this.puedeAmarrar) return;

    Swal.fire({
      title: '¿Confirmar amarre?',
      html: `
        <p>Cotización <strong>${this.selectedCotizacion}</strong></p>
        <p>→ Contrato <strong>${this.selectedContrato}</strong></p>
        <p>Tipo: <strong>${this.selectedTipoDoc}</strong></p>
        <p style="margin-top:0.75rem;font-size:0.9rem;opacity:0.85">
          Se actualizarán los registros operativos. El N° cotización se conserva como historial.
        </p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Amarrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#20506A',
      cancelButtonColor: '#6c757d',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.saving = true;
      this.administracionService
        .amarrarContrato({
          numero_contrato: this.selectedContrato!,
          tipo_doc: this.selectedTipoDoc!,
          numero_cotizacion: this.selectedCotizacion!,
        })
        .subscribe({
          next: (res) => {
            this.saving = false;
            if (Number(res?.Codigo) !== 1) {
              Swal.fire(
                'Atención',
                res?.Mensaje || 'No se pudo completar el amarre.',
                'warning'
              );
              return;
            }
            Swal.fire({
              icon: 'success',
              title: 'Amarre realizado',
              text: res?.Mensaje || 'Cotización vinculada al contrato.',
              confirmButtonColor: '#20506A',
            });
            this.selectedCotizacion = null;
            this.cargarCotizaciones();
          },
          error: (err) => {
            this.saving = false;
            Swal.fire(
              'Error',
              err?.error?.Mensaje || 'Error al amarrar cotización.',
              'error'
            );
          },
        });
    });
  }
}
