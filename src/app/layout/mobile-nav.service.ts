import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/** Estado del menú lateral en viewport móvil (hamburguesa ↔ drawer). */
@Injectable({ providedIn: 'root' })
export class MobileNavService {
  private readonly openSubject = new BehaviorSubject<boolean>(false);
  readonly open$ = this.openSubject.asObservable();

  get isOpen(): boolean {
    return this.openSubject.value;
  }

  toggle(): void {
    this.openSubject.next(!this.openSubject.value);
  }

  open(): void {
    this.openSubject.next(true);
  }

  close(): void {
    this.openSubject.next(false);
  }
}
