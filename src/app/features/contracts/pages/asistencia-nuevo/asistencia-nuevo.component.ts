import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import Swal from 'sweetalert2';
import { buildFileUrl } from '../../../../core/file-url';
import {
  puedeSeleccionarTrabajadorAsistencia,
} from '../../../../core/auth/permissions';
import { ContractsService } from '../../shared/service/contracts.service';
import { AsistenciaVisita } from '../../shared/interfaces/Response.interface';
import {
  CatalogService,
  ConstructoraDto,
  ProyectoDto,
} from '../../../../shared/services/catalog.service';
import { GestionService } from '../../../gestion/shared/service/gestion.service';
import { GestionUser } from '../../../gestion/shared/interfaces/Response.interface';

@Component({
  selector: 'app-asistencia-nuevo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DropdownModule,
    InputTextModule,
    InputTextarea,
  ],
  templateUrl: './asistencia-nuevo.component.html',
  styleUrls: ['./asistencia-nuevo.component.scss'],
})
export class AsistenciaNuevoComponent implements OnInit, OnDestroy {
  @ViewChild('videoEl') videoEl?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasEl?: ElementRef<HTMLCanvasElement>;

  phase: 'loading' | 'start' | 'form' = 'loading';
  visita: AsistenciaVisita | null = null;
  saving = false;

  canSelectWorker = false;
  trabajadorNombre = '';
  cargo = '';
  idTrabajador: string | number | null = null;
  consecutivo = '';
  horaInicio = '';

  constructoraId: string | null = null;
  proyectoId: string | null = null;
  constructoraLabel = '';
  proyectoLabel = '';
  ubicacion = '';
  detalleVisita = '';

  constructoras: { label: string; value: string }[] = [];
  proyectos: { label: string; value: string }[] = [];
  trabajadores: { label: string; value: string; cargo: string; id: number }[] =
    [];

  cameraOn = false;
  cameraError = '';
  photoPreview: string | null = null;
  photoBlob: Blob | null = null;
  private mediaStream: MediaStream | null = null;

  constructor(
    private contractsService: ContractsService,
    private catalogService: CatalogService,
    private gestionService: GestionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.canSelectWorker = puedeSeleccionarTrabajadorAsistencia();
    this.applyLoggedUserIdentity();
    if (this.canSelectWorker) {
      // SISO elige trabajador; no precargar el propio id como selección.
      this.idTrabajador = null;
      this.trabajadorNombre = '';
      this.cargo = '';
    }
    this.loadConstructoras();
    this.loadTrabajadores();
    this.bootstrap();
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  goBack(): void {
    this.stopCamera();
    this.router.navigate(['/dashboard/gestion']);
  }

  private applyLoggedUserIdentity(): void {
    const nombre = localStorage.getItem('nombreUsuario') || '';
    const apellido = localStorage.getItem('apellidoUsuario') || '';
    this.trabajadorNombre = `${nombre} ${apellido}`.trim();
    this.cargo = localStorage.getItem('nombre_perfil') || '';
    this.idTrabajador = localStorage.getItem('id_usuario');
  }

  private bootstrap(): void {
    this.phase = 'loading';
    this.contractsService.getOpenAsistenciaVisit().subscribe({
      next: (res) => {
        if (res?.open && res.visita) {
          this.applyOpenVisit(res.visita);
          this.phase = 'form';
          return;
        }
        this.phase = 'start';
        this.prefetchConsecutivo();
      },
      error: () => {
        this.phase = 'start';
        this.prefetchConsecutivo();
      },
    });
  }

  private prefetchConsecutivo(): void {
    this.contractsService
      .siguienteConsecutivo({ tipo: 'ASISTENCIA' })
      .subscribe({
        next: (res) => {
          if (!this.consecutivo) {
            this.consecutivo = String(res?.consecutivo || '').trim();
          }
        },
        error: () => undefined,
      });
  }

  private applyOpenVisit(v: AsistenciaVisita): void {
    this.visita = v;
    this.consecutivo = String(v.consecutivo || v.numerodoc || '').trim();
    this.horaInicio = String(v.hora_inicio || '').trim();
    this.trabajadorNombre = String(v.trabajador || this.trabajadorNombre).trim();
    this.cargo = String(v.cargo || this.cargo).trim();
    this.idTrabajador = v.id_trabajador || this.idTrabajador;
    this.ubicacion = String(v.ubicacion || '').trim();
    this.detalleVisita = String(v.detalle_visita || '').trim();
    if (v.foto1) {
      this.photoPreview = this.resolveUploadUrl(v.foto1);
    }
  }

  confirmStartVisit(): void {
    Swal.fire({
      title: '¿Iniciar visita?',
      html: 'Se registrará la <strong>fecha y hora de inicio</strong> (Bogotá). No podrá iniciar otra hasta finalizar esta.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, iniciar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#20506A',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.startVisit();
    });
  }

  private startVisit(): void {
    if (this.canSelectWorker && !this.idTrabajador) {
      Swal.fire({
        icon: 'warning',
        title: 'Trabajador',
        text: 'Seleccione el trabajador de la visita.',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    this.saving = true;
    this.contractsService
      .startAsistenciaVisit({
        trabajador: this.trabajadorNombre,
        cargo: this.cargo,
        id_trabajador: this.idTrabajador ?? undefined,
        consecutivo: this.consecutivo || undefined,
      })
      .subscribe({
        next: (res) => {
          this.saving = false;
          if (res?.visita) {
            this.applyOpenVisit(res.visita);
          }
          this.phase = 'form';
          Swal.fire({
            icon: 'success',
            title: 'Visita iniciada',
            text: `Inicio: ${this.horaInicio}`,
            confirmButtonColor: '#20506A',
          });
        },
        error: (err) => {
          this.saving = false;
          const visita = err?.error?.visita;
          if (err?.status === 409 && visita) {
            this.applyOpenVisit(visita);
            this.phase = 'form';
            Swal.fire({
              icon: 'info',
              title: 'Visita abierta',
              text: err?.error?.message || 'Continúe la visita pendiente.',
              confirmButtonColor: '#20506A',
            });
            return;
          }
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || 'No se pudo iniciar la visita.',
            confirmButtonColor: '#d33',
          });
        },
      });
  }

  onTrabajadorChange(id: string | number | null): void {
    this.idTrabajador = id;
    const found = this.trabajadores.find((t) => String(t.id) === String(id));
    if (found) {
      this.trabajadorNombre = found.value;
      this.cargo = found.cargo;
    }
  }

  onConstructoraChange(id: string | null): void {
    this.constructoraId = id;
    this.proyectoId = null;
    this.proyectos = [];
    this.proyectoLabel = '';
    const c = this.constructoras.find((x) => x.value === id);
    this.constructoraLabel = c?.label || '';
    if (!id) return;
    this.catalogService.getProyectosByConstructora(id).subscribe({
      next: (list: ProyectoDto[]) => {
        this.proyectos = list.map((p) => ({
          label: p.nombre,
          value: String(p.id),
        }));
      },
      error: () => {
        this.proyectos = [];
      },
    });
  }

  onProyectoChange(id: string | null): void {
    this.proyectoId = id;
    const p = this.proyectos.find((x) => x.value === id);
    this.proyectoLabel = p?.label || '';
  }

  private loadConstructoras(): void {
    this.catalogService.getConstructoras().subscribe({
      next: (list: ConstructoraDto[]) => {
        this.constructoras = list.map((c) => ({
          label: c.nombre,
          value: String(c.id),
        }));
      },
      error: () => {
        this.constructoras = [];
      },
    });
  }

  private loadTrabajadores(): void {
    this.gestionService.getAllUsers().subscribe({
      next: (res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.trabajadores = list
          .filter((u: GestionUser) => String(u.estado).toUpperCase() === 'ACTIVO')
          .map((u: GestionUser) => {
            const nombre = `${u.nombre ?? ''} ${u.apellido ?? ''}`.trim();
            return {
              label: `${nombre} — ${u.perfil}`,
              value: nombre,
              cargo: String(u.perfil || ''),
              id: Number(u.id_usuario),
            };
          });
      },
      error: () => {
        this.trabajadores = [];
      },
    });
  }

  async toggleCamera(): Promise<void> {
    if (this.cameraOn) {
      this.stopCamera();
      return;
    }
    this.cameraError = '';
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      this.cameraOn = true;
      setTimeout(() => {
        const video = this.videoEl?.nativeElement;
        if (video && this.mediaStream) {
          video.srcObject = this.mediaStream;
          void video.play();
        }
      }, 50);
    } catch (err: any) {
      this.cameraError =
        err?.message ||
        'No se pudo acceder a la cámara. Use HTTPS o permita el permiso.';
      this.cameraOn = false;
    }
  }

  capturePhoto(): void {
    const video = this.videoEl?.nativeElement;
    const canvas = this.canvasEl?.nativeElement;
    if (!video || !canvas || !this.cameraOn) return;

    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        this.photoBlob = blob;
        this.photoPreview = URL.createObjectURL(blob);
        this.stopCamera();
      },
      'image/jpeg',
      0.85
    );
  }

  clearPhoto(): void {
    this.photoBlob = null;
    this.photoPreview = null;
  }

  private stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    this.cameraOn = false;
    const video = this.videoEl?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
  }

  finishVisit(): void {
    if (!this.visita?.numerodoc) {
      Swal.fire({
        icon: 'warning',
        title: 'Visita',
        text: 'No hay visita abierta para finalizar.',
        confirmButtonColor: '#20506A',
      });
      return;
    }
    if (!this.photoBlob && !this.visita.foto1) {
      Swal.fire({
        icon: 'warning',
        title: 'Foto de ingreso',
        text: 'Capture la foto de ingreso con la cámara antes de guardar.',
        confirmButtonColor: '#20506A',
      });
      return;
    }
    if (!this.constructoraLabel || !this.proyectoLabel) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Seleccione constructora y proyecto.',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    Swal.fire({
      title: '¿Finalizar visita?',
      text: 'Se registrará la hora de cierre (Bogotá) y no podrá editar el inicio.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Guardar y cerrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#20506A',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.submitFinish();
    });
  }

  private submitFinish(): void {
    const fd = new FormData();
    fd.append('numerodoc', this.visita!.numerodoc);
    fd.append('consecutivo', this.consecutivo || this.visita!.numerodoc);
    fd.append('constructora', this.constructoraLabel);
    fd.append('proyecto', this.proyectoLabel);
    fd.append('ubicacion', this.ubicacion || '');
    fd.append('detalle_visita', this.detalleVisita || '');
    fd.append('trabajador', this.trabajadorNombre);
    fd.append('cargo', this.cargo);
    fd.append('id_trabajador', String(this.idTrabajador ?? ''));
    if (this.photoBlob) {
      fd.append('foto1', this.photoBlob, `asistencia-${Date.now()}.jpg`);
    }

    this.saving = true;
    this.contractsService.finishAsistenciaVisit(fd).subscribe({
      next: (res) => {
        this.saving = false;
        this.stopCamera();
        Swal.fire({
          icon: 'success',
          title: 'Visita finalizada',
          text: res?.message || 'Registro guardado.',
          confirmButtonColor: '#20506A',
        }).then(() => {
          this.router.navigate(['/dashboard/contracts/consult-asistencia']);
        });
      },
      error: (err) => {
        this.saving = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || 'No se pudo finalizar la visita.',
          confirmButtonColor: '#d33',
        });
      },
    });
  }

  resolveUploadUrl(path: string): string {
    return buildFileUrl(path) || '';
  }
}
