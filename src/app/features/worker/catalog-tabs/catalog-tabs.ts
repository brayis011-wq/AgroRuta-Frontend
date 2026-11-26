import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Cargos y Labores son dos listas cortas que se configuran una vez: van juntas, en una sola entrada del
 * menú ("Cargos y labores"), con estas dos pestañas arriba de cada una.
 */
@Component({
  selector: 'app-pestanas-catalogo',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="pestanas" [attr.aria-label]="'workers.catalog.label' | translate">
      <a
        routerLink="/worker/positions"
        routerLinkActive="on"
        #a="routerLinkActive"
        [attr.aria-current]="a.isActive ? 'page' : null"
      >
        <i class="ti ti-tags" aria-hidden="true"></i> {{ 'workers.posts.title' | translate }}
      </a>
      <a
        routerLink="/worker/labors"
        routerLinkActive="on"
        #b="routerLinkActive"
        [attr.aria-current]="b.isActive ? 'page' : null"
      >
        <i class="ti ti-list-check" aria-hidden="true"></i>
        {{ 'workers.activities.title' | translate }}
      </a>
    </nav>
  `,
  styles: [
    `
      :host {
        display: block;
        margin-bottom: 1rem;
      }
      .pestanas {
        display: inline-flex;
        gap: 4px;
        padding: 4px;
        border-radius: 13px;
        background: var(--ar-superficie-2);
        border: 1px solid var(--ar-borde);
        max-width: 100%;
      }
      a {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.55rem 1rem;
        border-radius: 10px;
        text-decoration: none;
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--ar-tinta-2);
        white-space: nowrap;
        transition:
          background 0.15s,
          color 0.15s;
      }
      a:hover {
        color: var(--ar-tinta);
      }
      a.on {
        background: var(--ar-superficie);
        color: var(--ar-verde-700);
        box-shadow: var(--ar-sombra-1);
      }
      a:focus-visible {
        outline: 2px solid var(--ar-verde-600);
        outline-offset: 2px;
      }
    `,
  ],
})
export class PestanasCatalogoComponent {}
