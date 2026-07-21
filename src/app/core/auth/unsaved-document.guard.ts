import { CanDeactivateFn } from '@angular/router';

/**
 * Componentes que pueden bloquear la navegación si hay cambios sin guardar.
 */
export interface CanComponentDeactivate {
  canDeactivate: () => boolean | Promise<boolean>;
}

/**
 * Pregunta antes de salir de la pantalla de creación de documentos.
 * Solo afecta la navegación del front; no modifica la lógica de guardado.
 */
export const unsavedDocumentGuard: CanDeactivateFn<CanComponentDeactivate> = (
  component
) => {
  if (!component?.canDeactivate) {
    return true;
  }
  return component.canDeactivate();
};
